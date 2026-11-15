"""music_index.py AUDIO_DIR
Lập chỉ mục thư viện nhạc để AI chọn bài + cắt đoạn theo brief. Ghi AUDIO_DIR/index.json, in bảng markdown.

Cho mỗi file (mp3/wav):
  - BPM: tự tương quan dòng onset; xét cả ×2 và ×0,5, ưu tiên dải 90–150 (nhạc quảng cáo) nếu đỉnh đủ mạnh
  - beat0: phách đầu tiên (pha của lưới) — mốc cảnh = beat0 + k × (60/BPM)
  - drop: lúc nhạc vào "full" (năng lượng 2 s đạt ≥ 80% đỉnh lần đầu)
  - cut15/cut20/cut30: giây bắt đầu nên cắt — đặt trên phách, ~1 ô nhịp trước drop, đủ dài tới hết đoạn
  - độ to LUFS (ffmpeg), độ dài
Cần ffmpeg + numpy. Không nghe được tai → các con số này cần soát với dạng sóng khi nghi ngờ.
"""
import sys, os, json, subprocess, re, wave
import numpy as np
sys.stdout.reconfigure(encoding='utf-8')

d = sys.argv[1]
SR = 22050

def load(path):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-ac', '1', '-ar', str(SR), '-f', 's16le', '-'], capture_output=True).stdout
    return np.frombuffer(raw, np.int16).astype(np.float32) / 32768

def lufs(path):
    e = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', path, '-af', 'ebur128', '-f', 'null', '-'], capture_output=True, text=True, errors='replace').stderr
    m = re.findall(r'I:\s+(-?[\d.]+) LUFS', e)
    return float(m[-1]) if m else None

def analyze(a):
    h, n = 512, 2048
    win = np.hanning(n)
    fr = np.array([np.abs(np.fft.rfft(a[i:i + n] * win)) for i in range(0, len(a) - n, h)])
    flux = np.maximum(0, np.diff(np.log1p(fr), axis=0)).sum(1)
    fps = SR / h
    f = flux - flux.mean()
    ac = np.correlate(f, f, 'full')[len(f) - 1:]
    ac /= ac[0] + 1e-9
    def peak_at(lag):           # độ mạnh tự tương quan quanh một độ trễ (giây)
        i = int(round(lag * fps)); return ac[max(1, i - 1):i + 2].max() if i + 2 < len(ac) else 0
    lags = np.arange(len(ac)) / fps
    m = (lags > 0.343) & (lags < 0.857)
    i0 = np.where(m)[0][np.argmax(ac[m])]
    if 0 < i0 < len(ac) - 1:
        y0, y1, y2 = ac[i0 - 1], ac[i0], ac[i0 + 1]; den = y0 - 2 * y1 + y2
        i0 = i0 + (0.5 * (y0 - y2) / den if den else 0)
    beat = i0 / fps
    # thử ×2 / ×0,5: chọn ứng viên trong 90–150 nếu đỉnh của nó ≥ 60% đỉnh gốc
    best, bs = beat, peak_at(beat)
    for c in (beat / 2, beat * 2):
        bpmc = 60 / c
        if 90 <= bpmc <= 150 and not (90 <= 60 / beat <= 150) and peak_at(c) >= 0.6 * bs:
            best = c
    beat = best
    # pha lưới: dịch 0..beat sao cho tổng flux tại các phách lớn nhất
    t = np.arange(len(flux)) / fps
    best_ph, best_sc = 0, -1
    for ph in np.linspace(0, beat, 24, endpoint=False):
        idx = np.round((np.arange(ph, t[-1], beat)) * fps).astype(int); idx = idx[idx < len(flux)]
        sc = flux[idx].sum()
        if sc > best_sc: best_sc, best_ph = sc, ph
    # năng lượng 2 s
    w = int(2 * SR); rms = np.array([np.sqrt(np.mean(a[i:i + w] ** 2)) for i in range(0, max(1, len(a) - w), SR // 2)])
    tt = np.arange(len(rms)) * 0.5
    pk = rms.max() + 1e-9
    drop = float(tt[np.argmax(rms >= 0.8 * pk)])
    dur = len(a) / SR
    def cut(L):
        # đoạn L giây có năng lượng trung bình cao nhất + thưởng nếu đầu đoạn là lúc nhạc dâng lên
        # (video mở bằng intro nhẹ rồi "vào" ở ~2 s). Bắt đầu đặt trên phách.
        best_s, best_v = 0.0, -1
        for k in range(0, int((dur - L - 0.5) / beat) + 1):
            s = best_ph + k * beat
            if s < 0 or s + L > dur - 0.5: continue
            i0, i1 = int(s * 2), int((s + L) * 2)
            if i1 > len(rms): continue
            body = rms[i0 + 2:i1].mean() / pk if i1 > i0 + 2 else 0
            rise = (rms[min(len(rms) - 1, i0 + 4)] - rms[max(0, i0 - 2)]) / pk
            v = body + 0.35 * max(0, rise)
            if v > best_v: best_v, best_s = v, s
        return round(best_s, 2)
    return {'bpm': round(60 / beat, 1), 'beat': round(beat, 4), 'beat0': round(float(best_ph), 3), 'drop': drop,
            'dur': round(dur, 2), 'cut15': cut(15), 'cut20': cut(20), 'cut30': cut(30),
            'energy': [round(float(x / pk), 2) for x in rms[::4]]}

out = {}
for fn in sorted(os.listdir(d)):
    if not fn.lower().endswith(('.mp3', '.wav')): continue
    p = os.path.join(d, fn)
    r = analyze(load(p)); r['lufs'] = lufs(p); out[fn] = r
json.dump(out, open(os.path.join(d, 'index.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('| File | BPM | Dài | Drop | Cắt 15 / 20 / 30 s từ | LUFS | Năng lượng (mỗi 2 s, 0–1) |')
print('|---|---|---|---|---|---|---|')
for fn, r in out.items():
    e = ''.join(' ▁▂▃▄▅▆▇█'[min(8, int(x * 8))] for x in r['energy'])
    print(f"| {fn} | {r['bpm']} | {r['dur']:.0f}s | {r['drop']:.1f}s | {r['cut15']} / {r['cut20']} / {r['cut30']} | {r['lufs']} | `{e}` |")
