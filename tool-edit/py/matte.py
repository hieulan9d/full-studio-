"""Tach nen video (matte alpha) bang Robust Video Matting (RVM, ONNX) tren GPU neu co.

    python matte.py <input.mp4> <out_matte.mkv> [--model models/rvm_mobilenetv3_fp32.onnx] [--ratio 0.25] [--cpu] [--max-edge 1920]

- KHONG tu tai mo hinh: thieu file .onnx thi thoat ma 3 kem thong bao.
- Ket qua: video xam (alpha: 0 = nen, 255 = nguoi) cung so khung, cung fps voi file vao, ma hoa FFV1 (khong mat). Tien trinh: dong "PROGRESS 0.37"; xong in "DONE {json}".
- RVM co bo nho theo thoi gian (r1..r4) nen mep it nhap nhay hon tach tung khung rieng le.
"""
import argparse
import glob
import json
import os
import subprocess
import sys
import time


def add_cuda_dlls():
    if sys.platform != "win32":
        return
    for sp in sys.path:
        for d in glob.glob(os.path.join(sp, "nvidia", "*", "bin")):
            try:
                os.add_dll_directory(d)
            except OSError:
                pass
            os.environ["PATH"] = d + os.pathsep + os.environ.get("PATH", "")


def log(kind, msg=""):
    print(f"{kind} {msg}".strip(), flush=True)


def probe(path):
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height,avg_frame_rate,nb_frames,duration:stream_side_data=rotation", "-of", "json", path],
        capture_output=True, text=True, check=True,
    ).stdout
    s = json.loads(out)["streams"][0]
    w, h = int(s["width"]), int(s["height"])
    for sd in s.get("side_data_list", []):
        if abs(int(sd.get("rotation", 0))) % 180 == 90:
            w, h = h, w
    n, d = (s.get("avg_frame_rate") or "30/1").split("/")
    fps = float(n) / float(d or 1)
    dur = float(s.get("duration") or 0)
    return w, h, fps, dur


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("input")
    ap.add_argument("out")
    ap.add_argument("--model", default=os.path.join(os.path.dirname(__file__), "..", "models", "rvm_mobilenetv3_fp32.onnx"))
    ap.add_argument("--ratio", type=float, default=0.25, help="downsample_ratio cua RVM (0.25 cho ~1080p, 0.125 cho 4K)")
    ap.add_argument("--max-edge", type=int, default=1920)
    ap.add_argument("--cpu", action="store_true")
    a = ap.parse_args()

    if not os.path.exists(a.model):
        print(f"MODEL_MISSING: chua co mo hinh tach nen {os.path.abspath(a.model)} (can nguoi dung dong y tai)", file=sys.stderr)
        return 3
    add_cuda_dlls()
    import numpy as np
    import onnxruntime as ort

    prov = ["CPUExecutionProvider"] if a.cpu else ["CUDAExecutionProvider", "CPUExecutionProvider"]
    sess = ort.InferenceSession(a.model, providers=prov)
    device = "cuda" if "CUDAExecutionProvider" in sess.get_providers() else "cpu"

    w0, h0, fps, dur = probe(a.input)
    k = min(1.0, a.max_edge / max(w0, h0))
    w, h = max(2, round(w0 * k / 2) * 2), max(2, round(h0 * k / 2) * 2)
    total = max(1, int(round(dur * fps))) if dur else 0

    dec = subprocess.Popen(
        ["ffmpeg", "-hide_banner", "-loglevel", "error", "-i", a.input, "-an", "-vf", f"scale={w}:{h}:flags=bicubic", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
        stdout=subprocess.PIPE, stderr=subprocess.PIPE,
    )
    tmp = a.out + ".part.mkv"
    enc = subprocess.Popen(
        ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-f", "rawvideo", "-pix_fmt", "gray", "-s", f"{w}x{h}", "-r", f"{fps:.6f}", "-i", "-", "-c:v", "ffv1", "-pix_fmt", "gray", tmp],
        stdin=subprocess.PIPE, stderr=subprocess.PIPE,
    )

    # trang thai nho theo thoi gian: khoi dau 0
    rec = [np.zeros((1, 1, 1, 1), dtype=np.float32) for _ in range(4)]
    ratio = np.array([a.ratio], dtype=np.float32)
    fsz = w * h * 3
    n = 0
    t0 = time.time()
    last = 0.0
    while True:
        buf = dec.stdout.read(fsz)
        if len(buf) < fsz:
            break
        frame = np.frombuffer(buf, dtype=np.uint8).reshape(h, w, 3)
        src = (frame.astype(np.float32) / 255.0).transpose(2, 0, 1)[None]
        fgr, pha, r1, r2, r3, r4 = sess.run(None, {"src": src, "r1i": rec[0], "r2i": rec[1], "r3i": rec[2], "r4i": rec[3], "downsample_ratio": ratio})
        rec = [r1, r2, r3, r4]
        alpha = np.clip(pha[0, 0] * 255.0 + 0.5, 0, 255).astype(np.uint8)
        enc.stdin.write(alpha.tobytes())
        n += 1
        if total and time.time() - last > 0.5:
            last = time.time()
            log("PROGRESS", f"{min(0.99, n / total):.3f}")
    enc.stdin.close()
    erc = enc.wait()
    dec.stdout.close()
    drc = dec.wait()
    if n == 0 or erc != 0:
        print(f"ERROR giai ma/ma hoa loi (dec {drc}, enc {erc}): {enc.stderr.read().decode(errors='ignore')[-300:]}", file=sys.stderr)
        return 1
    os.replace(tmp, a.out)
    log("DONE", json.dumps({"frames": n, "width": w, "height": h, "fps": fps, "device": device, "seconds": round(time.time() - t0, 2), "model": os.path.basename(a.model)}))
    return 0


if __name__ == "__main__":
    sys.exit(main())
