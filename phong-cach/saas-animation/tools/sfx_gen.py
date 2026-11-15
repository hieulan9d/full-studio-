"""sfx_gen.py OUT_DIR [--seed N]
Tổng hợp bộ SFX cho video SaaS (không cần tải, không vướng bản quyền). 48 kHz, stereo, WAV 16-bit.
Mỗi loại tạo 2–3 biến thể (_a, _b, _c) để không lặp tai.

Loại (tên file = <loại>_<biến thể>.wav):
  whoosh        luồng gió lướt 0,7 s (khối lớn vào/ra)          — đầu file = lúc bắt đầu chuyển động
  whoosh_fast   lướt nhanh 0,35 s (chip, thẻ nhỏ, chuyển cảnh nhanh)
  swoosh_up     lướt đi lên 0,5 s (gửi tin, bay lên)
  pop           bật nhỏ có cao độ (icon/chip/bong bóng xuất hiện)
  click         click UI khô (bấm nút, tick)
  tick          tick rất nhẹ (số đếm, chấm "•••")
  typing        gõ phím 1,2 s (cắt bớt cho vừa đoạn gõ)
  riser         dâng 1,5 s (trước chuyển cảnh lớn)                — CUỐI file = mốc chuyển cảnh
  impact        đập trầm + đuôi vang 2 s (chuyển cảnh lớn, logo kết) — đầu file = mốc
  sparkle       lấp lánh 1,2 s (ngôi sao, logo, chữ sáng)
  glitch        nhiễu số ngắn 0,25 s (chuyển cảnh kỹ thuật)
  shimmer       vệt sáng quét 1 s (light sweep trên chữ)
Cần: numpy.
"""
import sys, os, wave
import numpy as np

SR = 48000
out = sys.argv[1]
seed = int(sys.argv[sys.argv.index('--seed') + 1]) if '--seed' in sys.argv else 7
os.makedirs(out, exist_ok=True)
rng = np.random.default_rng(seed)


def t_(d):
    return np.arange(int(SR * d)) / SR


def norm(x, peak=0.89):
    m = np.max(np.abs(x)) + 1e-9
    return x / m * peak


def save(name, L, R=None, peak=0.89):
    if R is None:
        R = L
    st = np.stack([L, R], 1)
    st = norm(st, peak)
    # fade 3 ms hai đầu chống click
    f = int(SR * 0.003)
    st[:f] *= np.linspace(0, 1, f)[:, None]
    st[-f:] *= np.linspace(1, 0, f)[:, None]
    w = wave.open(os.path.join(out, name + '.wav'), 'wb')
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((st * 32767).astype(np.int16).tobytes())
    w.close()


def sweep_band(x, f0, f1, q=1.2, frame=1024):
    """Lọc dải thông có tâm quét từ f0 → f1 (log), xử lý STFT chồng 50%."""
    n = len(x); hop = frame // 2; win = np.hanning(frame)
    y = np.zeros(n + frame); fr = np.fft.rfftfreq(frame, 1 / SR)
    steps = max(1, (n - frame) // hop + 1)
    for i in range(steps + 1):
        s = i * hop
        seg = np.zeros(frame); chunk = x[s:s + frame]; seg[:len(chunk)] = chunk
        u = min(1.0, s / max(1, n - frame))
        fc = f0 * (f1 / f0) ** u
        bw = fc / q
        mask = np.exp(-0.5 * ((fr - fc) / (bw / 2)) ** 2)
        y[s:s + frame] += np.fft.irfft(np.fft.rfft(seg * win) * mask, frame) * win
    return y[:n]


def lowpass(x, fc):
    X = np.fft.rfft(x); fr = np.fft.rfftfreq(len(x), 1 / SR)
    X *= 1 / np.sqrt(1 + (fr / fc) ** 4)
    return np.fft.irfft(X, len(x))


def highpass(x, fc):
    X = np.fft.rfft(x); fr = np.fft.rfftfreq(len(x), 1 / SR)
    X *= 1 - 1 / np.sqrt(1 + (fr / fc) ** 4)
    return np.fft.irfft(X, len(x))


def reverb(x, dur=1.2, mix=0.25):
    ir_t = t_(dur)
    ir = rng.standard_normal(len(ir_t)) * np.exp(-ir_t * 5.5)
    ir = lowpass(ir, 6000)
    wet = np.fft.irfft(np.fft.rfft(x, len(x) + len(ir)) * np.fft.rfft(ir, len(x) + len(ir)))[:len(x) + len(ir)]
    dry = np.concatenate([x, np.zeros(len(ir))])
    return dry * (1 - mix) + norm(wet, np.max(np.abs(x)) + 1e-9) * mix


def pan_pair(x, p0, p1):
    p = np.linspace(p0, p1, len(x))
    return x * np.sqrt((1 - p) / 2), x * np.sqrt((1 + p) / 2)


def env_ar(n, a, peak_at=None):
    peak_at = peak_at if peak_at is not None else a
    t = np.linspace(0, 1, n)
    e = np.where(t < peak_at, (t / peak_at) ** 2, np.exp(-(t - peak_at) / (1 - peak_at) * 4.5))
    return e


# ---------- tạo ----------
def whoosh(d, f0, f1, var):
    n = int(SR * d); x = rng.standard_normal(n)
    y = sweep_band(x, f0, f1, q=1.6) + 0.35 * sweep_band(x, f0 * 2, f1 * 2, q=2.5)
    y *= env_ar(n, 0.5, 0.42 + 0.05 * var)
    L, R = pan_pair(y, -0.6 if var % 2 else 0.6, 0.6 if var % 2 else -0.6)
    return L, R


for i, v in enumerate('abc'):
    save('whoosh_' + v, *whoosh(0.75 + 0.1 * i, 300 + 80 * i, 2600 - 300 * i, i))
    save('whoosh_fast_' + v, *whoosh(0.35 + 0.05 * i, 600, 4500 + 500 * i, i + 1))
for i, v in enumerate('ab'):
    L, R = whoosh(0.5, 500, 6000 + 1500 * i, i)
    tt = t_(0.5); tone = np.sin(2 * np.pi * np.cumsum(400 + 1400 * tt ** 1.5) / SR) * env_ar(len(tt), 0.6) * 0.18
    save('swoosh_up_' + v, L + tone, R + tone)

for i, v in enumerate('abc'):
    d = 0.18; tt = t_(d); f = (520 + 140 * i) * np.exp(-tt * 18) + 260
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 28)
    c = highpass(rng.standard_normal(len(tt)), 3000) * np.exp(-tt * 300) * 0.25
    y = reverb(s + c, 0.4, 0.12)
    save('pop_' + v, y)

for i, v in enumerate('abc'):
    d = 0.06; tt = t_(d)
    y = highpass(rng.standard_normal(len(tt)), 2500 + 800 * i) * np.exp(-tt * 260) + np.sin(2 * np.pi * (1900 + 300 * i) * tt) * np.exp(-tt * 180) * 0.4
    save('click_' + v, y, peak=0.7)

for i, v in enumerate('ab'):
    d = 0.04; tt = t_(d)
    y = np.sin(2 * np.pi * (3200 + 600 * i) * tt) * np.exp(-tt * 220)
    save('tick_' + v, y, peak=0.5)

for i, v in enumerate('ab'):
    d = 1.2; n = int(SR * d); y = np.zeros(n); pos = 0.02
    while pos < d - 0.08:
        k = int(pos * SR); m = int(0.045 * SR); tt = t_(0.045)
        key = highpass(rng.standard_normal(m), 1800 + rng.uniform(-300, 600)) * np.exp(-tt * 140) * rng.uniform(0.5, 1)
        key += lowpass(rng.standard_normal(m), 900) * np.exp(-tt * 90) * 0.4
        y[k:k + m] += key[:max(0, min(m, n - k))]
        pos += rng.uniform(0.055, 0.12)
    save('typing_' + v, *pan_pair(y, -0.15, 0.15), peak=0.6)

for i, v in enumerate('ab'):
    d = 1.5; tt = t_(d); n = len(tt)
    nz = sweep_band(rng.standard_normal(n), 300, 7000 + 2000 * i, q=1.3)
    tone = sum(np.sin(2 * np.pi * np.cumsum(f0 * (1 + 1.5 * tt / d) ** 2) / SR) for f0 in (110 * (i + 1), 165 * (i + 1), 220 * (i + 1))) / 3
    e = (tt / d) ** 2.2
    y = (nz * 0.7 + tone * 0.5) * e
    y[-int(SR * 0.01):] *= np.linspace(1, 0, int(SR * 0.01))
    save('riser_' + v, *pan_pair(y, -0.3, 0.3))

for i, v in enumerate('ab'):
    d = 2.0; tt = t_(d)
    boom = np.sin(2 * np.pi * np.cumsum(45 + 70 * np.exp(-tt * 25)) / SR) * np.exp(-tt * 3.2)
    hit = lowpass(rng.standard_normal(len(tt)), 1800 + 1200 * i) * np.exp(-tt * 22) * 0.7
    y = reverb(boom + hit, 1.6, 0.3)[:len(tt)]
    save('impact_' + v, y)

for i, v in enumerate('ab'):
    d = 1.2; n = int(SR * d); L = np.zeros(n); R = np.zeros(n)
    for _ in range(14 + 4 * i):
        st = rng.uniform(0, 0.7); f = rng.uniform(2500, 7500); m = int(SR * 0.4); tt = t_(0.4)
        p = np.sin(2 * np.pi * f * tt) * np.exp(-tt * rng.uniform(8, 16)) * rng.uniform(0.3, 1) * np.minimum(1, tt / 0.003)
        k = int(st * SR); pn = rng.uniform(-1, 1)
        L[k:k + m] += p[:n - k] * np.sqrt((1 - pn) / 2); R[k:k + m] += p[:n - k] * np.sqrt((1 + pn) / 2)
    e = np.minimum(1, t_(d) / 0.05)
    save('sparkle_' + v, L * e, R * e, peak=0.6)

for i, v in enumerate('ab'):
    d = 0.25; n = int(SR * d); y = np.zeros(n)
    for k in range(0, n, int(SR * 0.012)):
        m = int(SR * rng.uniform(0.004, 0.011)); seg = np.sign(np.sin(2 * np.pi * rng.uniform(200, 3000) * np.arange(m) / SR))
        e = min(n, k + m); y[k:e] += seg[:e - k] * rng.uniform(0.2, 1) * (rng.random() > 0.35)
    y = highpass(y, 400) * np.linspace(1, 0.3, n)
    save('glitch_' + v, y, peak=0.55)

d = 1.0; tt = t_(d)
y = sweep_band(rng.standard_normal(len(tt)), 2500, 11000, q=3) * np.sin(np.pi * tt / d) ** 2
save('shimmer_a', *pan_pair(y, -0.8, 0.8), peak=0.5)

print('ok', len([f for f in os.listdir(out) if f.endswith('.wav')]), 'files ->', out)
