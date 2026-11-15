"""beats.py AUDIO.wav [--grid N]
Đo nhịp nhạc cho việc đặt mốc cảnh.
In ra: BPM ước lượng, độ dài phách, các tiếng nhấn mạnh (onset), tiếng trầm (kick/impact),
tiếng cao (whoosh/lấp lánh), và LƯỚI MỐC CẢNH = mỗi N phách (mặc định 2) tính từ tiếng nhấn đầu tiên.
Cần: python 3 + numpy. WAV mono 16-bit (analyze-ref.sh tự tạo).
Dùng cho nhạc của brief:  ffmpeg -i music.mp3 -ac 1 -ar 22050 music.wav && python -I beats.py music.wav
"""
import sys, wave
import numpy as np

path = sys.argv[1]
grid = 2
if '--grid' in sys.argv:
    grid = int(sys.argv[sys.argv.index('--grid') + 1])

w = wave.open(path)
sr = w.getframerate()
a = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
dur = len(a) / sr
h, n = 512, 2048
win = np.hanning(n)
fr = np.array([np.abs(np.fft.rfft(a[i:i + n] * win)) for i in range(0, max(1, len(a) - n), h)])
t = np.arange(len(fr)) * h / sr
S = np.log1p(fr)
flux = np.maximum(0, np.diff(S, axis=0)).sum(1)
f = flux - flux.mean()
ac = np.correlate(f, f, 'full')[len(f) - 1:]
lags = np.arange(len(ac)) * h / sr
m = (lags > 0.343) & (lags < 0.857)   # 70–175 BPM: dải nhạc quảng cáo; rộng hơn dễ bắt nhầm nốt 1/8
i0 = np.where(m)[0][np.argmax(ac[m])]
# nội suy parabol quanh đỉnh: bước đo 23 ms quá thô (120 BPM từng bị đọc thành 117.5)
if 0 < i0 < len(ac) - 1:
    y0, y1, y2 = ac[i0 - 1], ac[i0], ac[i0 + 1]
    den = y0 - 2 * y1 + y2
    i0 = i0 + (0.5 * (y0 - y2) / den if den != 0 else 0)
beat = i0 * h / sr
bpm = 60 / beat

def peaks(sig, k):
    th = sig.mean() + k * sig.std()
    out, last = [], -1
    for i in range(1, len(sig) - 1):
        if sig[i] > th and sig[i] >= sig[i - 1] and sig[i] >= sig[i + 1] and t[i] - last > 0.12:
            out.append(round(float(t[i]), 2)); last = t[i]
    return out

strong = peaks(flux, 2.5)
fb = np.fft.rfftfreq(n, 1 / sr)
def band(lo, hi):
    e = np.log1p(fr[:, (fb >= lo) & (fb < hi)].sum(1))
    return peaks(np.maximum(0, np.diff(e)), 3)

print(f"duration {dur:.2f}s")
print(f"tempo ~{bpm:.1f} BPM (beat {beat:.3f}s, bar {beat * 4:.3f}s)")
print("strong onsets:", ' '.join(map(str, strong)))
print("low <150Hz (kick/impact):", ' '.join(map(str, band(0, 150))))
print("high >6kHz (whoosh/sparkle):", ' '.join(map(str, band(6000, 11000))))
start = strong[0] if strong else 0.0
step = beat * grid
g = []
x = start
while x < dur:
    g.append(round(x, 2)); x += step
print(f"scene grid (every {grid} beats = {step:.2f}s from {start:.2f}s):", ' '.join(map(str, g)))
