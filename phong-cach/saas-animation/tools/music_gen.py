"""music_gen.py OUT.wav --bpm 120 --dur 20 [--key A] [--mood dark|bright] [--hits 1.0,4.0,7.0] [--seed N]
Tạo nhạc nền tech/corporate KHỚP NHỊP TUYỆT ĐỐI với video (không bản quyền, không cần tải).

Cấu trúc theo thời lượng:
  - 1 nhịp đầu: pad + sub mở (intro)          - giữa: kick 4/4, hi-hat lệch phách, pluck arpeggio, pad
  - 2 phách trước mỗi --hits: lọc dần (build)  - tại mỗi hit: crash/impact nhẹ, beat vào lại
  - 1,5 s cuối: chỉ pad + vang, fade ra
--hits = các mốc chuyển cảnh lớn (giây) — lấy từ storyboard. Mọi mốc nên nằm trên lưới phách.
Đầu ra 48 kHz stereo 16-bit, chuẩn hoá ~ -14 LUFS (ước lượng RMS). In ra lưới phách để đặt cảnh.
Đây là nhạc "đủ dùng" để video có nhịp; nhạc thật có bản quyền vẫn hay hơn (xem knowledge/02 §6).
"""
import sys, wave
import numpy as np

def arg(k, d):
    return sys.argv[sys.argv.index(k) + 1] if k in sys.argv else d

out = sys.argv[1]
BPM = float(arg('--bpm', 120)); DUR = float(arg('--dur', 20)); KEY = arg('--key', 'A'); MOOD = arg('--mood', 'dark')
HITS = [float(x) for x in arg('--hits', '').split(',') if x]
rng = np.random.default_rng(int(arg('--seed', 3)))
SR = 48000; N = int(SR * DUR); beat = 60 / BPM
L = np.zeros(N); R = np.zeros(N)

NOTES = {'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5, 'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11}
root = 220 * 2 ** ((NOTES.get(KEY, 9) - 9) / 12)   # A3 = 220
minor = MOOD == 'dark'
# vòng hợp âm (bậc, theo nửa cung từ chủ âm): dark i-VI-III-VII, bright I-V-vi-IV
prog = [(0, minor), (8, False), (3, False), (10, False)] if minor else [(0, False), (7, False), (9, True), (5, False)]

def hz(semi): return root * 2 ** (semi / 12)

def add(sig, start, pan=0.0, gain=1.0):
    k = int(start * SR)
    if k >= N or k + len(sig) <= 0: return
    s = max(0, -k); e = min(len(sig), N - k)
    seg = sig[s:e] * gain
    L[k + s:k + e] += seg * np.sqrt((1 - pan) / 2) * 1.414
    R[k + s:k + e] += seg * np.sqrt((1 + pan) / 2) * 1.414

def tt(d): return np.arange(int(SR * d)) / SR

def lp(x, fc):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR); X /= np.sqrt(1 + (f / fc) ** 4); return np.fft.irfft(X, len(x))

def hp(x, fc):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR); X *= 1 - 1 / np.sqrt(1 + (f / fc) ** 4); return np.fft.irfft(X, len(x))

# vùng "build" (2 phách trước hit) và "outro"
def in_build(t): return any(h - 2 * beat <= t < h for h in HITS)
OUTRO = DUR - 1.5
INTRO = 4 * beat

# --- pad (mỗi hợp âm 1 ô nhịp = 4 phách) ---
bar = 4 * beat; nb = int(np.ceil(DUR / bar)) + 1
for b in range(nb):
    deg, mi = prog[b % 4]
    chord = [deg, deg + (3 if mi else 4), deg + 7, deg + 12]
    d = bar + 0.3; t = tt(d); sig = np.zeros(len(t))
    for semi in chord:
        for det in (-0.08, 0.0, 0.07):
            f = hz(semi - 12) * 2 ** (det / 12)
            sig += np.sin(2 * np.pi * f * t + rng.uniform(0, 6.28)) + 0.3 * np.sin(2 * np.pi * 2 * f * t)
    sig = lp(sig, 1400 if minor else 2200) * np.minimum(1, t / 0.25) * np.minimum(1, (d - t) / 0.3)
    add(sig, b * bar, pan=0.0, gain=0.05)

# --- sub bass theo hợp âm, mỗi phách ---
for i in range(int(DUR / beat) + 1):
    t0 = i * beat
    if t0 < INTRO * 0.5 or t0 >= OUTRO or in_build(t0): continue
    deg, _ = prog[int(t0 / bar) % 4]
    t = tt(beat * 0.9); f = hz(deg - 24)
    s = np.sin(2 * np.pi * f * t) * np.exp(-t * 2.5) * np.minimum(1, t / 0.01)
    add(s, t0, gain=0.22)

# --- kick 4/4 ---
for i in range(int(DUR / beat) + 1):
    t0 = i * beat
    if t0 < INTRO or t0 >= OUTRO or in_build(t0): continue
    t = tt(0.35); f = 48 + 110 * np.exp(-t * 35)
    k = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9)
    add(k, t0, gain=0.55)

# --- hi-hat lệch phách + clap phách 2/4 ---
for i in range(int(DUR / beat) * 2 + 2):
    t0 = i * beat / 2
    if t0 < INTRO or t0 >= OUTRO: continue
    if in_build(t0) and i % 2 == 0: continue
    t = tt(0.06); h = hp(rng.standard_normal(len(t)), 7000) * np.exp(-t * 70)
    add(h, t0, pan=0.25 if i % 4 == 1 else -0.25, gain=0.09 if i % 2 else 0.04)
for i in range(int(DUR / beat) + 1):
    t0 = i * beat
    if i % 2 == 1 and INTRO <= t0 < OUTRO and not in_build(t0):
        t = tt(0.25); c = lp(hp(rng.standard_normal(len(t)), 900), 5000) * np.exp(-t * 18)
        add(c, t0, gain=0.10)

# --- pluck arpeggio 1/8 ---
pat = [0, 7, 12, 7, 3 if minor else 4, 7, 12, 15 if minor else 16]
for i in range(int(DUR / beat) * 2 + 2):
    t0 = i * beat / 2
    if t0 < INTRO * 0.5 or t0 >= OUTRO: continue
    deg, _ = prog[int(t0 / bar) % 4]
    f = hz(deg + pat[i % 8])
    t = tt(0.35); p = (np.sin(2 * np.pi * f * t) + 0.4 * np.sin(2 * np.pi * 2 * f * t)) * np.exp(-t * 10) * np.minimum(1, t / 0.004)
    g = 0.07 * (0.5 if in_build(t0) else 1.0)
    add(lp(p, 3500), t0, pan=0.35 if i % 2 else -0.35, gain=g)
    add(lp(p, 2500), t0 + beat * 0.75, pan=-0.35 if i % 2 else 0.35, gain=g * 0.3)   # echo 3/16

# --- build: noise riser trong 2 phách trước hit; hit: crash ---
for h in HITS:
    d = 2 * beat; t = tt(d); n = rng.standard_normal(len(t))
    rs = hp(n, 1500) * (t / d) ** 2.5
    add(rs, h - d, gain=0.10)
    t = tt(2.0); cr = hp(rng.standard_normal(len(t)), 4000) * np.exp(-t * 2.2) + np.sin(2 * np.pi * 55 * t) * np.exp(-t * 6) * 1.5
    add(cr, h, gain=0.12)

# --- master: fade, chuẩn hoá ---
st = np.stack([L, R], 1)
fo = int(SR * 1.5); st[-fo:] *= np.linspace(1, 0, fo)[:, None] ** 1.5
fi = int(SR * 0.4); st[:fi] *= np.linspace(0, 1, fi)[:, None]
rms = np.sqrt(np.mean(st ** 2)) + 1e-9
st *= 10 ** (-17 / 20) / rms            # -17 dBFS RMS ≈ -14 LUFS (đo thực tế)
pk = np.max(np.abs(st))
if pk > 0.95: st = np.tanh(st / pk * 1.2) / np.tanh(1.2) * 0.95   # giới hạn mềm
w = wave.open(out, 'wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
w.writeframes((st * 32767).astype(np.int16).tobytes()); w.close()
grid = [round(i * beat, 3) for i in range(int(DUR / beat) + 1)]
print(f"ok {out}  bpm {BPM}  beat {beat:.3f}s  dur {DUR}s  hits {HITS}")
print("beats:", ' '.join(map(str, grid)))
