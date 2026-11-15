"""Tìm SFX trong video tham chiếu: lấy âm thanh bản đã edit TRỪ âm thanh clip gốc, phần còn lại
là SFX/nhạc được thêm vào; rồi so từng file SFX với phần còn lại để ra mốc đặt.

    python tools/sfx_match.py <video-đã-edit> <clip-gốc> <thư-mục-SFX> [--thr 0.6]

In ra:
  1. Mức (dB) của phần thêm vào theo từng 0,1 s — đỉnh lớn = impact, dốc lên dài = riser, gai ngắn đều = click/pop.
  2. Với mỗi file SFX: các mốc (giây) khớp ≥ thr. File dài được cắt thành đoạn 0,75 s để tìm cả khi
     người edit chỉ dùng một phần file.
Chỉ dùng được khi bản edit giữ nguyên timeline clip gốc (không cắt). Nếu có cắt: cắt clip gốc theo EDL trước.
Mốc tìm được là gợi ý; impact đã chỉnh âm lượng/pitch thường không khớp — khi đó dùng bảng mức dB.
"""
import argparse, glob, os, subprocess, sys
import numpy as np
from numpy.fft import rfft, irfft

SR = 8000


def load(p):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", p, "-vn", "-ac", "1", "-ar", str(SR), "-f", "s16le", "-"],
                         stdout=subprocess.PIPE).stdout
    return np.frombuffer(raw, np.int16).astype(np.float32) / 32768


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("edited"); ap.add_argument("raw"); ap.add_argument("sfxdir")
    ap.add_argument("--thr", type=float, default=0.6)
    a = ap.parse_args()
    m, g = load(a.edited), load(a.raw)
    n = min(len(m), len(g))
    lag = max(range(-400, 401, 2), key=lambda L: float(np.dot(m[1000:n - 1000], np.roll(g, L)[1000:n - 1000])))
    g = np.roll(g, lag)[:n]
    k = float(np.dot(m[:n], g) / np.dot(g, g))
    r = m[:n] - k * g
    print(f"lệch {lag / SR * 1000:.0f} ms, hệ số giọng {k:.2f}")
    print("\n# mức phần thêm vào (dB) mỗi 0,1 s")
    w = SR // 10
    for i in range(0, n - w, w):
        e = 20 * np.log10(np.sqrt(np.mean(r[i:i + w] ** 2)) + 1e-9)
        print(f"{i / SR:5.1f} {e:6.1f} " + "#" * max(0, int((e + 50) / 2)))
    print("\n# khớp file SFX (mốc bắt đầu file trên timeline)")
    files = [f for f in glob.glob(os.path.join(a.sfxdir, "**", "*"), recursive=True)
             if os.path.isfile(f) and not os.path.basename(f).startswith(".")]
    for f in sorted(files):
        full = load(f)
        if len(full) == 0:
            continue
        hits = {}
        for st in np.arange(0, max(0.01, len(full) / SR - 0.3), 0.5):
            s = full[int(st * SR):int((st + 0.75) * SR)]
            if len(s) < SR // 10 or np.sqrt(np.mean(s ** 2)) < 0.01:
                continue
            L = len(r) + len(s)
            c = irfft(rfft(r, L) * np.conj(rfft(s, L)), L)[:len(r)]
            e = np.sqrt(np.convolve(r ** 2, np.ones(len(s)), "full")[len(s) - 1:len(s) - 1 + len(r)] + 1e-9) * np.linalg.norm(s)
            nc = c / e
            i = int(np.argmax(nc))
            if nc[i] >= a.thr:
                key = round(i / SR - st, 1)
                hits[key] = max(hits.get(key, 0), float(nc[i]))
        if hits:
            print(f"{os.path.basename(f)[:40]:40s} " + "; ".join(f"{t:.1f}s ({v:.2f})" for t, v in sorted(hits.items()) if t > -0.5))


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    main()
