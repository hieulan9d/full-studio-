"""Person matte for an A-roll clip, for "text behind the subject" in After Effects.

    python tools/talking-head/matte.py <input.mp4> <matte.mp4> [--cutout person.mov] [--ratio auto]

Runs RobustVideoMatting (models/rvm_mobilenetv3_fp32.onnx) frame by frame, keeping its
recurrent state so the edge does not flicker. Writes:
  <matte.mp4>        white person on black, same size/fps/length as the input. In AE put the
                     A-roll on top of the text, set its Track Matte to this layer, Luma.
  --cutout <x.mov>   optional ProRes 4444 with alpha: the person only, ready to stack.
--ratio is RVM's downsample ratio: auto picks ~270 px on the short side (0.25 for 1080p).
"""
import argparse, json, os, subprocess, sys, time

sys.path.insert(0, os.path.dirname(__file__))
from _cuda import add_cuda_dlls

add_cuda_dlls()
import numpy as np
import onnxruntime as ort

MODEL = os.path.join(os.path.dirname(__file__), "models", "rvm_mobilenetv3_fp32.onnx")


def probe(path):
    r = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-count_packets", "-show_entries",
                        "stream=width,height,r_frame_rate,nb_read_packets", "-of", "json", path],
                       stdout=subprocess.PIPE, check=True, text=True)
    s = json.loads(r.stdout)["streams"][0]
    return s["width"], s["height"], s["r_frame_rate"], int(s.get("nb_read_packets") or 0)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("input")
    ap.add_argument("out")
    ap.add_argument("--cutout")
    ap.add_argument("--ratio", default="auto")
    ap.add_argument("--crf", type=int, default=12)
    a = ap.parse_args()

    if not os.path.exists(MODEL):
        sys.exit(f"missing {MODEL} — download rvm_mobilenetv3_fp32.onnx from "
                 "github.com/PeterL1n/RobustVideoMatting/releases/tag/v1.0.0")
    w, h, fps, n = probe(a.input)
    ratio = min(1.0, 270 / min(w, h)) if a.ratio == "auto" else float(a.ratio)
    prov = [p for p in ("CUDAExecutionProvider", "CPUExecutionProvider") if p in ort.get_available_providers()]
    sess = ort.InferenceSession(MODEL, providers=prov)

    dec = subprocess.Popen(["ffmpeg", "-v", "error", "-i", a.input, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
                           stdout=subprocess.PIPE)
    enc = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "gray", "-s", f"{w}x{h}",
                            "-r", fps, "-i", "-", "-c:v", "libx264", "-crf", str(a.crf), "-pix_fmt", "yuv420p",
                            "-color_range", "pc", a.out], stdin=subprocess.PIPE)
    cut = None
    if a.cutout:
        cut = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgba", "-s", f"{w}x{h}",
                                "-r", fps, "-i", "-", "-c:v", "prores_ks", "-profile:v", "4444",
                                "-pix_fmt", "yuva444p10le", a.cutout], stdin=subprocess.PIPE)

    rec = [np.zeros((1, 1, 1, 1), np.float32)] * 4
    dr = np.array([ratio], np.float32)
    fsize, i, t0 = w * h * 3, 0, time.time()
    while True:
        buf = dec.stdout.read(fsize)
        if len(buf) < fsize:
            break
        rgb = np.frombuffer(buf, np.uint8).reshape(h, w, 3)
        src = (rgb.astype(np.float32) / 255.0).transpose(2, 0, 1)[None]
        fgr, pha, *rec = sess.run(None, {"src": src, "r1i": rec[0], "r2i": rec[1], "r3i": rec[2],
                                         "r4i": rec[3], "downsample_ratio": dr})
        alpha = (np.clip(pha[0, 0], 0, 1) * 255 + 0.5).astype(np.uint8)
        enc.stdin.write(alpha.tobytes())
        if cut:
            cut.stdin.write(np.dstack([rgb, alpha]).tobytes())
        i += 1
        if i % 150 == 0:
            el = time.time() - t0
            print(f"  {i}/{n or '?'} frames, {i / el:.1f} fps", flush=True)
    for p in (enc, cut):
        if p:
            p.stdin.close()
            p.wait()
    dec.wait()
    print(f"{prov[0]}: {i} frames in {time.time() - t0:.1f}s (ratio {ratio:.3f}) -> {a.out}"
          + (f" + {a.cutout}" if cut else ""))


if __name__ == "__main__":
    main()
