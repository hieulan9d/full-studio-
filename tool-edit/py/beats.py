"""Nhan nhip nhac (tempo + luoi nhip) chi bang numpy.

    python beats.py <input> <out.json>

Out: {"bpm", "period", "beat0", "times": [giay...], "duration"}. Luoi nhip co tempo khong doi (hop voi nhac dien tu / pop).
Thuat toan: spectral flux tren 24 dai tan log -> tu tuong quan chon tempo (uu tien quanh 120, xet boi/uoc) -> tinh chinh chu ky
tren toan bai bang cach gap (fold) bao onset theo chu ky -> chon pha.
"""
import json
import subprocess
import sys

import numpy as np

SR = 22050
HOP = 256
NFFT = 1024
LAT = 0.044  # do tre he thong cua spectral flux (cua so + do doc), do tren nhac tong hop co dap an
LOW_HZ = 220.0  # dai tram (kick/bass) dung de chon PHA: tranh nham sang off-beat cua hi-hat


def load(path):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-vn", "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], stdout=subprocess.PIPE)
    if raw.returncode != 0 or not raw.stdout:
        print("ERROR khong doc duoc am thanh", file=sys.stderr)
        sys.exit(2)
    return np.frombuffer(raw.stdout, np.float32)


def onset_env(y):
    win = np.hanning(NFFT).astype(np.float32)
    n = 1 + (len(y) - NFFT) // HOP
    idx = np.arange(NFFT)[None, :] + HOP * np.arange(n)[:, None]
    spec = np.abs(np.fft.rfft(y[idx] * win, axis=1))
    freqs = np.fft.rfftfreq(NFFT, 1.0 / SR)
    edges = np.geomspace(40, 10000, 25)
    bands = np.stack([spec[:, (freqs >= edges[i]) & (freqs < edges[i + 1])].sum(axis=1) for i in range(24)], axis=1)
    lg = np.log1p(20.0 * bands)
    d = np.maximum(0.0, np.diff(lg, axis=0))
    low_cols = [i for i in range(24) if edges[i + 1] <= LOW_HZ]

    def clean(flux):
        k = 43  # ~0.5 s: bo nen cham
        base = np.convolve(flux, np.ones(k) / k, mode="same")
        e = np.maximum(0.0, flux - base)
        s = e.std()
        return e / (s if s > 1e-9 else 1.0)

    full = clean(d.sum(axis=1))
    low = clean(d[:, low_cols].sum(axis=1)) if low_cols else full
    return full, low


def autocorr(env):
    n = len(env)
    f = np.fft.rfft(env - env.mean(), 2 * n)
    ac = np.fft.irfft(f * np.conj(f))[:n]
    return ac / (ac[0] if ac[0] > 0 else 1.0)


def pick_tempo(env, fps):
    ac = autocorr(env)

    def at(lag):  # noi suy tuyen tinh
        lag = float(lag)
        i = int(lag)
        if i + 1 >= len(ac) or i < 1:
            return 0.0
        fr = lag - i
        return ac[i] * (1 - fr) + ac[i + 1] * fr

    best, best_s = 120.0, -1.0
    for bpm in np.arange(60.0, 200.0, 0.25):
        lag = fps * 60.0 / bpm
        prior = np.exp(-0.5 * (np.log2(bpm / 120.0) / 0.7) ** 2)
        s = (at(lag) + 0.5 * at(2 * lag) + 0.5 * at(lag / 2.0) + 0.25 * at(4 * lag)) * prior
        if s > best_s:
            best, best_s = float(bpm), float(s)
    return best


def fold_score(env, period):
    """Gap bao onset theo chu ky `period` (khung, so thuc); tra ve (diem, pha_khung)."""
    nb = max(8, int(round(period)))
    ph = (np.arange(len(env)) / period) % 1.0
    bins = np.minimum((ph * nb).astype(int), nb - 1)
    acc = np.bincount(bins, weights=env, minlength=nb)
    sm = acc + 0.5 * (np.roll(acc, 1) + np.roll(acc, -1))
    j = int(np.argmax(sm))
    # tinh chinh pha trong bin bang trung binh co trong so voi 2 bin ke
    w = np.array([acc[(j - 1) % nb], acc[j], acc[(j + 1) % nb]])
    off = (w[2] - w[0]) / (w.sum() + 1e-9)
    phase = ((j + 0.5 + off) / nb) % 1.0
    return float(sm[j] / len(env)), phase * period


def main():
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(1)
    y = load(sys.argv[1])
    dur = len(y) / SR
    env, low = onset_env(y)
    fps = SR / HOP
    bpm0 = pick_tempo(env, fps)
    env_ph = 0.4 * env + 1.0 * low  # pha: uu tien dai tram
    p0 = fps * 60.0 / bpm0
    best = (-1.0, p0, 0.0)
    for p in np.linspace(p0 * 0.985, p0 * 1.015, 301):
        sc, ph = fold_score(env_ph, p)
        if sc > best[0]:
            best = (sc, float(p), float(ph))
    _, period, phase = best
    bpm = fps * 60.0 / period
    sec_period = period / fps
    beat0 = phase / fps + LAT
    beat0 = beat0 % sec_period  # dua ve nhip dau tien
    times = []
    t = beat0
    while t < dur:
        times.append(round(t, 4))
        t += sec_period
    out = {"bpm": round(bpm, 3), "period": round(sec_period, 5), "beat0": round(beat0, 4), "times": times, "duration": round(dur, 3)}
    with open(sys.argv[2], "w", encoding="utf-8") as f:
        json.dump(out, f)
    print(f"DONE bpm={out['bpm']} beat0={out['beat0']} nhip={len(times)}", flush=True)


if __name__ == "__main__":
    main()
