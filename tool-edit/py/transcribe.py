"""Nhan dang giong noi TUNG TU bang faster-whisper (GPU neu co).

    python transcribe.py <input> <out.json> [--lang vi|auto] [--model large-v3-turbo] [--prompt "ten rieng"] [--cpu]

- KHONG tu tai mo hinh: chi dung mo hinh da co trong may (local_files_only). Thieu thi thoat voi ma 3 va thong bao ro.
- Ghi tien do ra stdout: dong "PROGRESS 0.37"; xong in "DONE". Loi in "ERROR ..." ra stderr.
- Out: {"lang", "model", "device", "duration", "words": [{"w","s","e","p"}], "segments": [{"s","e","text"}]}. Thoi gian la giay trong file dau vao.
"""
import argparse
import glob
import json
import os
import subprocess
import sys
import time


def add_cuda_dlls():
    """Cho Windows thay DLL NVIDIA cai bang pip (nvidia-cublas-cu12, nvidia-cudnn-cu12)."""
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


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("input")
    ap.add_argument("out")
    ap.add_argument("--lang", default="vi")
    ap.add_argument("--model", default="large-v3-turbo")
    ap.add_argument("--prompt", default=None)
    ap.add_argument("--cpu", action="store_true")
    ap.add_argument("--no-vad", action="store_true")
    a = ap.parse_args()

    add_cuda_dlls()
    try:
        import numpy as np
        from faster_whisper import WhisperModel
    except Exception as e:  # noqa: BLE001
        print("ERROR thieu thu vien: " + str(e), file=sys.stderr, flush=True)
        sys.exit(2)

    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", a.input, "-vn", "-ac", "1", "-ar", "16000", "-f", "s16le", "-"],
        stdout=subprocess.PIPE,
    )
    if raw.returncode != 0 or not raw.stdout:
        print("ERROR khong doc duoc am thanh tu file", file=sys.stderr, flush=True)
        sys.exit(2)
    audio = np.frombuffer(raw.stdout, np.int16).astype(np.float32) / 32768.0
    duration = len(audio) / 16000.0
    log("INFO", f"audio {duration:.2f}s")

    device, model = "cpu", None
    if not a.cpu:
        try:
            model = WhisperModel(a.model, device="cuda", compute_type="float16", local_files_only=True)
            model.transcribe(np.zeros(16000, np.float32))  # ep nap thu vien CUDA ngay
            device = "cuda"
        except Exception as e:  # noqa: BLE001
            msg = str(e)
            if "local" in msg.lower() or "snapshot" in msg.lower() or "cache" in msg.lower() or "not find" in msg.lower():
                print(f"ERROR MODEL_MISSING mo hinh '{a.model}' chua co trong may (khong tu tai). Can nguoi dung dong y tai.", file=sys.stderr, flush=True)
                sys.exit(3)
            log("INFO", "CUDA khong dung duoc, chuyen sang CPU: " + msg[:120])
            model = None
    if model is None:
        try:
            model = WhisperModel(a.model, device="cpu", compute_type="int8", cpu_threads=os.cpu_count() or 4, local_files_only=True)
        except Exception as e:  # noqa: BLE001
            print(f"ERROR MODEL_MISSING mo hinh '{a.model}' chua co trong may: {str(e)[:160]}", file=sys.stderr, flush=True)
            sys.exit(3)
    log("INFO", f"device {device} model {a.model}")

    t0 = time.time()
    segs, info = model.transcribe(
        audio,
        language=None if a.lang == "auto" else a.lang,
        word_timestamps=True,
        vad_filter=not a.no_vad,
        vad_parameters={"min_silence_duration_ms": 300},
        initial_prompt=a.prompt,
        condition_on_previous_text=False,
    )
    words, segments = [], []
    for s in segs:
        segments.append({"s": round(s.start, 3), "e": round(s.end, 3), "text": s.text.strip()})
        for w in s.words or []:
            t = w.word.strip()
            if not t:
                continue
            words.append({"w": t, "s": round(w.start, 3), "e": round(w.end, 3), "p": round(float(w.probability), 3)})
        log("PROGRESS", f"{min(0.99, s.end / max(duration, 1e-6)):.3f}")
    out = {"lang": info.language, "model": a.model, "device": device, "duration": round(duration, 3), "seconds": round(time.time() - t0, 2), "words": words, "segments": segments}
    with open(a.out, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False)
    log("DONE", f"{len(words)} tu, {out['seconds']}s")


if __name__ == "__main__":
    main()
