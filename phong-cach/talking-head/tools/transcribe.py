"""Word-level transcript of a video or audio file.

    python tools/talking-head/transcribe.py <input> <out.json> [--lang vi] [--model large-v3-turbo] [--cpu]

Writes <out.json>: {"lang", "duration", "segments": [{start, end, text, words: [{start, end, word, p}]}]}
and <out.txt> next to it: one "[m:ss.ss] text" line per segment (easy to read and plan from).
Times are seconds in the input's timeline.
"""
import argparse, json, os, subprocess, sys, time

sys.path.insert(0, os.path.dirname(__file__))
from _cuda import add_cuda_dlls

add_cuda_dlls()
import numpy as np
from faster_whisper import WhisperModel


def load_audio(path, sr=16000):
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", path, "-vn", "-ac", "1", "-ar", str(sr), "-f", "s16le", "-"],
        stdout=subprocess.PIPE, check=True).stdout
    return np.frombuffer(raw, np.int16).astype(np.float32) / 32768.0


def load_model(name, cpu):
    if not cpu:
        try:
            m = WhisperModel(name, device="cuda", compute_type="float16")
            m.transcribe(np.zeros(16000, np.float32))  # forces the CUDA libs to load now
            return m, "cuda"
        except Exception as e:
            print("CUDA unavailable, using CPU:", e, file=sys.stderr)
    return WhisperModel(name, device="cpu", compute_type="int8", cpu_threads=os.cpu_count() or 4), "cpu"


def fmt(t):
    return f"{int(t // 60)}:{t % 60:05.2f}"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("input")
    ap.add_argument("out")
    ap.add_argument("--lang", default="vi")
    ap.add_argument("--model", default="large-v3-turbo")
    ap.add_argument("--cpu", action="store_true")
    ap.add_argument("--prompt", default=None, help="names/terms to spell right, e.g. brand or product names")
    a = ap.parse_args()

    audio = load_audio(a.input)
    model, dev = load_model(a.model, a.cpu)
    t0 = time.time()
    segs, info = model.transcribe(audio, language=a.lang or None, word_timestamps=True,
                                  vad_filter=True, vad_parameters={"min_silence_duration_ms": 300},
                                  initial_prompt=a.prompt, condition_on_previous_text=False)
    out = {"lang": info.language, "duration": round(len(audio) / 16000, 3), "segments": []}
    for s in segs:
        out["segments"].append({
            "start": round(s.start, 3), "end": round(s.end, 3), "text": s.text.strip(),
            "words": [{"start": round(w.start, 3), "end": round(w.end, 3), "word": w.word.strip(),
                       "p": round(w.probability, 2)} for w in (s.words or [])]})

    os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
    with open(a.out, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
    with open(os.path.splitext(a.out)[0] + ".txt", "w", encoding="utf-8") as f:
        for s in out["segments"]:
            f.write(f"[{fmt(s['start'])}] {s['text']}\n")
    nw = sum(len(s["words"]) for s in out["segments"])
    print(f"{dev} {a.model}: {out['duration']:.1f}s audio in {time.time() - t0:.1f}s, "
          f"{len(out['segments'])} segments, {nw} words -> {a.out}")


if __name__ == "__main__":
    main()
