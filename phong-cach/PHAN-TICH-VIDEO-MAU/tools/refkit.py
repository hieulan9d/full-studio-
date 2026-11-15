"""refkit.py — bộ đo video tham chiếu cho AI (không cần xem video liên tục). Cần: ffmpeg, numpy, opencv-python.
Tuỳ chọn: faster-whisper (lời nói theo từng từ).

  analyze REF OUT [--lang vi|en|auto] [--no-words]
      Phân tích toàn bộ: thông số, cắt cảnh (cứng/mềm), đoạn cảnh + bảng màu hex, độ sáng/bão hoà/vùng trắng/chuyển động
      theo giây, nhịp nhạc + cắt cảnh có trúng phách không, độ to, lời nói theo từ + cắt cảnh có trúng đầu từ không,
      và ảnh: overview.jpg (toàn video), dense_NN.jpg (5 khung/s, 6 s/ảnh), cut_NN.jpg (từng khung quanh mỗi chỗ cắt).
      Ghi OUT/ref-auto.md (đọc đầu tiên) + OUT/ref-auto.json.
  track REF T0 T1 X,Y,W,H OUT_PREFIX
      Bám một vật (hộp X,Y,W,H toạ độ gốc tại T0) qua từng khung T0→T1: vị trí, tỉ lệ, rồi suy ra ease, thời lượng,
      overshoot. Ghi OUT_PREFIX.csv, OUT_PREFIX.png (đồ thị), in nhận xét.
  pick REF T X,Y [X,Y ...]
      Mã màu hex (trung bình 5×5 px) tại các điểm toạ độ gốc, ở giây T.
  strip REF T0 T1 OUT.jpg [--every 1]
      Mọi khung (hoặc mỗi N khung) từ T0 tới T1, có nhãn giây — soi chuyển động/chuyển cảnh.
  compare REF OURS OUT_PREFIX T [T ...]
      Ảnh cạnh nhau (trái mẫu, phải bản dựng) + bảng số: độ sáng, bão hoà, vùng trắng, độ chi tiết (cạnh), độ phủ khung,
      khoảng cách bảng màu, độ giống cấu trúc. In gợi ý sửa theo mức chênh. OUT_PREFIX_N.jpg + OUT_PREFIX.md.
Mọi toạ độ là pixel của video gốc. Ảnh xuất có nhãn giây ở góc trên trái.
"""
import sys, os, json, subprocess, re, math
import numpy as np, cv2
sys.stdout.reconfigure(encoding='utf-8')

# ---------------------------------------------------------------- tiện ích
def run(a, text=True):
    return subprocess.run(a, capture_output=True, text=text, encoding='utf-8' if text else None, errors='replace' if text else None)

def probe(path):
    j = json.loads(run(['ffprobe', '-v', 'error', '-show_entries', 'stream=codec_type,width,height,r_frame_rate,nb_frames:format=duration', '-of', 'json', path]).stdout)
    v = [s for s in j['streams'] if s['codec_type'] == 'video'][0]
    n, d = v['r_frame_rate'].split('/'); fps = float(n) / float(d)
    return {'w': int(v['width']), 'h': int(v['height']), 'fps': round(fps, 3), 'dur': float(j['format']['duration']),
            'audio': any(s['codec_type'] == 'audio' for s in j['streams'])}

def frames(path, w, fps=None, t0=None, t1=None, info=None):
    """Sinh (t, ảnh BGR) — khung thu nhỏ rộng w, đọc tuần tự (không tốn RAM)."""
    info = info or probe(path)
    h = int(round(w * info['h'] / info['w'] / 2) * 2)
    a = ['ffmpeg', '-v', 'error']
    if t0 is not None: a += ['-ss', str(t0)]
    a += ['-i', path]
    if t1 is not None: a += ['-t', str(t1 - (t0 or 0))]
    vf = (f'fps={fps},' if fps else '') + f'scale={w}:{h}'
    a += ['-vf', vf, '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-']
    # stderr bỏ đi: ngừng đọc giữa chừng làm ffmpeg in hàng chục dòng "Broken pipe" vô hại
    p = subprocess.Popen(a, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
    sz = w * h * 3; i = 0; step = 1 / (fps or info['fps'])
    try:
        while True:
            b = p.stdout.read(sz)
            if len(b) < sz: break
            yield (t0 or 0) + i * step, np.frombuffer(b, np.uint8).reshape(h, w, 3)
            i += 1
    finally:
        p.stdout.close(); p.kill(); p.wait()

def frame_at(path, t, w=None):
    info = probe(path); w = w or info['w']
    for _, f in frames(path, w, t0=t, t1=t + 1.0 / info['fps'] + 0.001, info=info): return f
    return None

def label(img, txt, scale=0.5):
    cv2.rectangle(img, (0, 0), (int(len(txt) * 11 * scale / 0.5) + 8, int(22 * scale / 0.5)), (0, 0, 0), -1)
    cv2.putText(img, txt, (4, int(16 * scale / 0.5)), cv2.FONT_HERSHEY_SIMPLEX, scale, (0, 255, 255), 1, cv2.LINE_AA)
    return img

def tile(imgs, cols, path, q=85):
    if not imgs: return
    h, w = imgs[0].shape[:2]; rows = math.ceil(len(imgs) / cols)
    out = np.zeros((rows * h, cols * w, 3), np.uint8)
    for i, im in enumerate(imgs): out[(i // cols) * h:(i // cols + 1) * h, (i % cols) * w:(i % cols + 1) * w] = im
    cv2.imwrite(path, out, [cv2.IMWRITE_JPEG_QUALITY, q])

def hexc(bgr): return '#%02x%02x%02x' % (int(bgr[2]), int(bgr[1]), int(bgr[0]))

def palette(imgs, k=6):
    px = np.concatenate([im.reshape(-1, 3) for im in imgs]).astype(np.float32)
    if len(px) > 60000: px = px[np.random.default_rng(1).choice(len(px), 60000, replace=False)]
    _, lab, cen = cv2.kmeans(px, k, None, (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 30, 0.5), 3, cv2.KMEANS_PP_CENTERS)
    cnt = np.bincount(lab.ravel(), minlength=k) / len(lab)
    order = np.argsort(-cnt)
    return [(hexc(cen[i]), round(float(cnt[i]) * 100, 1)) for i in order]

def stats(img):
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV); g = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    e = cv2.Canny(g, 60, 160)
    ys, xs = np.where(e > 0)
    cover = (xs.max() - xs.min()) / img.shape[1] * 100 if len(xs) > 50 else 0   # bề rộng vùng có chi tiết (% khung)
    return {'luma': float(g.mean()), 'sat': float(hsv[..., 1].mean()), 'white': float((g > 235).mean() * 100),
            'black': float((g < 12).mean() * 100), 'edges': float((e > 0).mean() * 100), 'cover': float(cover),
            'hue': float(np.median(hsv[..., 0][hsv[..., 1] > 60]) * 2) if (hsv[..., 1] > 60).any() else -1}

# ---------------------------------------------------------------- âm thanh
def audio_analysis(path):
    raw = run(['ffmpeg', '-v', 'error', '-i', path, '-ac', '1', '-ar', '22050', '-f', 's16le', '-'], text=False).stdout
    a = np.frombuffer(raw, np.int16).astype(np.float32) / 32768
    if len(a) < 22050: return None
    sr, h, n = 22050, 512, 2048; win = np.hanning(n)
    fr = np.array([np.abs(np.fft.rfft(a[i:i + n] * win)) for i in range(0, len(a) - n, h)])
    flux = np.maximum(0, np.diff(np.log1p(fr), axis=0)).sum(1); fps = sr / h
    f = flux - flux.mean(); ac = np.correlate(f, f, 'full')[len(f) - 1:]; ac /= ac[0] + 1e-9
    lags = np.arange(len(ac)) / fps; m = (lags > 0.343) & (lags < 0.857)
    i0 = np.where(m)[0][np.argmax(ac[m])]
    if 0 < i0 < len(ac) - 1:
        y0, y1, y2 = ac[i0 - 1], ac[i0], ac[i0 + 1]; den = y0 - 2 * y1 + y2
        i0 = i0 + (0.5 * (y0 - y2) / den if den else 0)
    beat = i0 / fps; strength = float(ac[int(round(i0))])
    t = np.arange(len(flux)) / fps
    best_ph, best = 0, -1
    for ph in np.linspace(0, beat, 24, endpoint=False):
        idx = np.round(np.arange(ph, t[-1], beat) * fps).astype(int); idx = idx[idx < len(flux)]
        s = flux[idx].sum()
        if s > best: best, best_ph = s, ph
    th = flux.mean() + 2.5 * flux.std(); on = []; last = -1
    for i in range(1, len(flux) - 1):
        if flux[i] > th and flux[i] >= flux[i - 1] and flux[i] >= flux[i + 1] and t[i] - last > 0.12: on.append(round(float(t[i]), 2)); last = t[i]
    e = run(['ffmpeg', '-hide_banner', '-nostats', '-i', path, '-af', 'ebur128', '-f', 'null', '-']).stderr
    L = re.findall(r'I:\s+(-?[\d.]+) LUFS', e)
    return {'bpm': round(60 / beat, 1), 'beat': round(beat, 4), 'beat0': round(float(best_ph), 3), 'beat_strength': round(strength, 2),
            'onsets': on, 'lufs': float(L[-1]) if L else None}

def words(path, lang):
    try:
        from faster_whisper import WhisperModel
    except Exception:
        return None, 'faster-whisper chưa cài'
    raw = run(['ffmpeg', '-v', 'error', '-i', path, '-ac', '1', '-ar', '16000', '-f', 's16le', '-'], text=False).stdout
    a = np.frombuffer(raw, np.int16).astype(np.float32) / 32768
    try:
        m = WhisperModel('small', device='cpu', compute_type='int8')
        segs, inf = m.transcribe(a, language=None if lang == 'auto' else lang, vad_filter=True, word_timestamps=True, beam_size=1)
        out = []
        for s in segs:
            for w in (s.words or []): out.append({'t': round(w.start, 2), 'e': round(w.end, 2), 'w': w.word.strip()})
        return out, inf.language
    except Exception as ex:
        return None, str(ex)[:120]

# ---------------------------------------------------------------- analyze
def analyze(ref, out, lang='auto', want_words=True):
    os.makedirs(out, exist_ok=True)
    info = probe(ref); fps = info['fps']; land = info['w'] >= info['h']
    print('thông số', info)
    # 1) quét mọi khung ở 96 px: khác biệt liên tiếp + thống kê
    d1, d_t, st, small = [], [], [], []
    prev = None
    for t, f in frames(ref, 96, info=info):
        g = cv2.cvtColor(f, cv2.COLOR_BGR2GRAY).astype(np.int16)
        d1.append(float(np.abs(g - prev).mean()) if prev is not None else 0.0); d_t.append(t); prev = g
        small.append(cv2.resize(f, (48, int(48 * f.shape[0] / f.shape[1]))))
    d1 = np.array(d1); n = len(d1)
    # cắt cứng: đỉnh 1 khung vượt hẳn nền xung quanh
    cuts = []
    for i in range(1, n):
        lo, hi = max(1, i - 15), min(n, i + 15)
        med = np.median(d1[lo:hi]) + 1e-3
        if d1[i] > 18 and d1[i] > 3.5 * med and d1[i] == d1[max(1, i - 2):min(n, i + 3)].max():
            cuts.append({'t': round(d_t[i], 3), 'kind': 'cứng', 'strength': round(float(d1[i]), 1)})
    # chuyển mềm: so khung cách nhau ±0,5 s theo 3 tín hiệu (màu, bố cục chuẩn hoá, bản đồ cạnh), chuẩn hoá z theo
    # chính video này (ngưỡng tương đối). z ≥ 1,2 → "mềm"; 0,6–1,2 → ứng viên yếu (AI tự soi bằng strip).
    k = max(1, int(round(fps * 0.5))); step = max(1, int(round(fps / 10)))
    idx = list(range(k, n - k, step))
    def z(v): v = np.array(v); return (v - v.mean()) / (v.std() + 1e-9)
    s_col, s_lay, s_edg = [], [], []
    for i in idx:
        a = small[i - k].astype(np.float32); b = small[i + k].astype(np.float32)
        s_col.append(float(np.abs(a - b).mean()))
        ga = cv2.cvtColor(small[i - k], cv2.COLOR_BGR2GRAY).astype(np.float32); gb = cv2.cvtColor(small[i + k], cv2.COLOR_BGR2GRAY).astype(np.float32)
        s_lay.append(float(np.abs((ga - ga.mean()) / (ga.std() + 8) - (gb - gb.mean()) / (gb.std() + 8)).mean()))
        ea = cv2.Canny(small[i - k], 60, 160) > 0; eb = cv2.Canny(small[i + k], 60, 160) > 0
        s_edg.append(float((ea ^ eb).mean()))
    sc = (z(s_col) + z(s_lay) + z(s_edg)) / 3 if idx else np.array([])
    weak = []
    win = max(1, int(round(0.8 * 10)))
    for j in range(len(idx)):
        if sc[j] < 0.6 or sc[j] != sc[max(0, j - win):j + win + 1].max(): continue
        t = d_t[idx[j]]
        if any(abs(c['t'] - t) < 0.6 for c in cuts): continue
        (cuts if sc[j] >= 1.2 else weak).append({'t': round(t, 3), 'kind': 'mềm' if sc[j] >= 1.2 else 'yếu', 'strength': round(float(sc[j]), 2)})
    cuts.sort(key=lambda c: c['t'])
    # 2) thống kê theo giây + khung mẫu cho bảng màu (2 khung/giây, 240 px)
    per_sec = {}; samples = []
    W2 = 240
    for t, f in frames(ref, W2, fps=2, info=info):
        s = stats(f); sec = int(t)
        per_sec.setdefault(sec, []).append(s); samples.append((t, f))
    secs = []
    for sec in sorted(per_sec):
        L = per_sec[sec]
        row = {k2: round(float(np.mean([x[k2] for x in L])), 1) for k2 in ('luma', 'sat', 'white', 'black', 'edges', 'cover')}
        row['t'] = sec
        idx = [i for i, tt in enumerate(d_t) if sec <= tt < sec + 1]
        row['motion'] = round(float(d1[idx].mean()), 1) if idx else 0
        secs.append(row)
    # 3) đoạn cảnh = khoảng giữa các cắt (cứng + mềm)
    bounds = [0.0] + [c['t'] for c in cuts] + [info['dur']]
    segs = []
    for i in range(len(bounds) - 1):
        a0, b0 = bounds[i], bounds[i + 1]
        if b0 - a0 < 0.15: continue
        imgs = [f for t, f in samples if a0 <= t < b0] or [min(samples, key=lambda x: abs(x[0] - (a0 + b0) / 2))[1]]
        S = [stats(im) for im in imgs]
        segs.append({'t0': round(a0, 2), 't1': round(b0, 2), 'dur': round(b0 - a0, 2), 'palette': palette(imgs),
                     'luma': round(float(np.mean([x['luma'] for x in S])), 1), 'sat': round(float(np.mean([x['sat'] for x in S])), 1),
                     'edges': round(float(np.mean([x['edges'] for x in S])), 2), 'cover': round(float(np.mean([x['cover'] for x in S])), 1)})
    # 4) âm thanh + lời
    au = audio_analysis(ref) if info['audio'] else None
    wd, wlang = (words(ref, lang) if (want_words and info['audio']) else (None, None))
    if wd is not None: json.dump(wd, open(os.path.join(out, 'words.json'), 'w', encoding='utf-8'), ensure_ascii=False)
    # độ khớp: cắt ↔ phách, cắt ↔ đầu từ
    def near(t, grid): return min((abs(t - g) for g in grid), default=9)
    beat_grid = []
    if au and au['beat_strength'] > 0.15:
        b = au['beat0']
        while b < info['dur']: beat_grid.append(b); b += au['beat']
    for c in cuts:
        c['to_beat'] = round(near(c['t'], beat_grid), 3) if beat_grid else None
        c['to_word'] = round(near(c['t'], [w['t'] for w in wd]), 3) if wd else None
    # 5) ảnh
    cw = 320 if land else 180
    ov_step = max(0.5, info['dur'] / 48)
    ov = [label(f.copy(), f'{t:.1f}s') for t, f in frames(ref, cw, fps=1 / ov_step, info=info)]
    tile(ov, 8 if land else 12, os.path.join(out, 'overview.jpg'))
    dense = []
    for t, f in frames(ref, cw, fps=5, info=info): dense.append(label(f.copy(), f'{t:.1f}s'))
    per = 30
    for j in range(0, len(dense), per): tile(dense[j:j + per], 6 if land else 10, os.path.join(out, f'dense_{j // per:02d}.jpg'))
    for ci, c in enumerate(cuts[:40]):
        t0 = max(0, c['t'] - 0.25); t1 = min(info['dur'], c['t'] + 0.45)
        st_ = [label(f.copy(), f'{t:.2f}') for t, f in frames(ref, 240 if land else 135, t0=t0, t1=t1, info=info)]
        tile(st_, 9 if land else 11, os.path.join(out, f'cut_{ci:02d}.jpg'))
    # 6) tổng hợp
    hard = [c for c in cuts if c['kind'] == 'cứng']; soft = [c for c in cuts if c['kind'] == 'mềm']
    rep = {'info': info, 'cuts': cuts, 'segments': segs, 'seconds': secs, 'audio': au, 'words_lang': wlang, 'n_words': len(wd) if wd else 0}
    json.dump(rep, open(os.path.join(out, 'ref-auto.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    L = []
    L.append(f"# Đo tự động: {os.path.basename(ref)}\n")
    L.append(f"- {info['w']}×{info['h']} · {info['fps']} fps · {info['dur']:.2f} s · {'có' if info['audio'] else 'không có'} tiếng")
    avg_shot = info['dur'] / max(1, len(segs))
    L.append(f"- {len(segs)} đoạn · {len(hard)} cắt cứng · {len(soft)} chuyển mềm · độ dài đoạn TB {avg_shot:.2f} s")
    if weak: L.append('- Ứng viên chuyển cảnh yếu (máy không chắc — soi bằng `strip`): ' + ', '.join(f"{w['t']:.1f}s" for w in weak))
    allp = palette([f for _, f in samples[::max(1, len(samples) // 40)]], 8)
    L.append('- Bảng màu toàn video: ' + ' '.join(f'`{h}` {p}%' for h, p in allp))
    lu = np.mean([s['luma'] for s in secs]); sa = np.mean([s['sat'] for s in secs]); ed = np.mean([s['edges'] for s in secs]); mo = np.mean([s['motion'] for s in secs])
    L.append(f"- Độ sáng TB {lu:.0f}/255 · bão hoà TB {sa:.0f}/255 · chi tiết (cạnh) {ed:.1f}% · chuyển động TB {mo:.1f}")
    if au:
        L.append(f"- Nhạc/nhịp: ~{au['bpm']} BPM (phách {au['beat']:.3f} s, pha {au['beat0']} s, độ rõ {au['beat_strength']}) · {au['lufs']} LUFS")
        if beat_grid and cuts:
            hit = sum(1 for c in cuts if c['to_beat'] is not None and c['to_beat'] <= 0.07)
            L.append(f"- **Cắt trúng phách (±70 ms): {hit}/{len(cuts)}**" + (' → video cắt theo nhạc' if hit >= 0.6 * len(cuts) else ''))
    if wd:
        hitw = sum(1 for c in cuts if c['to_word'] is not None and c['to_word'] <= 0.1)
        L.append(f"- Lời nói: {len(wd)} từ ({wlang}) · {len(wd) / info['dur']:.1f} từ/s · cắt trúng đầu từ (±100 ms): {hitw}/{len(cuts)} → `words.json`")
    elif want_words and info['audio']:
        L.append(f"- Lời nói: không lấy được ({wlang})")
    L.append('\n## Đoạn cảnh\n')
    L.append('| # | Giây | Dài | Vào bằng | Sáng | Bão hoà | Chi tiết | Phủ khung | Bảng màu (top 4) |')
    L.append('|---|---|---|---|---|---|---|---|---|')
    for i, s in enumerate(segs):
        kind = '—' if i == 0 else next((c['kind'] for c in cuts if abs(c['t'] - s['t0']) < 0.01), '?')
        if wd:
            said = ' '.join(w['w'] for w in wd if s['t0'] <= w['t'] < s['t1'])[:60]
        L.append(f"| {i + 1} | {s['t0']:.2f}–{s['t1']:.2f} | {s['dur']:.2f} | {kind} | {s['luma']:.0f} | {s['sat']:.0f} | {s['edges']:.1f}% | {s['cover']:.0f}% | " + ' '.join(f'`{h}`' for h, _ in s['palette'][:4]) + ' |')
    if wd:
        L.append('\n## Lời theo đoạn\n')
        for i, s in enumerate(segs):
            said = ' '.join(w['w'] for w in wd if s['t0'] <= w['t'] < s['t1'])
            if said: L.append(f"- **{i + 1}** ({s['t0']:.1f}s): {said}")
    L.append('\n## Theo giây\n')
    L.append('| s | sáng | bão hoà | trắng% | đen% | chi tiết% | phủ% | chuyển động |')
    L.append('|---|---|---|---|---|---|---|---|')
    for s in secs: L.append(f"| {s['t']} | {s['luma']:.0f} | {s['sat']:.0f} | {s['white']:.1f} | {s['black']:.1f} | {s['edges']:.1f} | {s['cover']:.0f} | {s['motion']:.1f} |")
    L.append('\n## Ảnh để xem\n')
    L.append('- `overview.jpg` — toàn video, ~48 khung (đọc đầu tiên: câu chuyện, các cảnh)')
    L.append('- `dense_NN.jpg` — 5 khung/s, 6 s mỗi ảnh (chuyển động trong cảnh)')
    L.append('- `cut_NN.jpg` — từng khung quanh chỗ cắt thứ NN (cách nối cảnh) — mốc ở bảng "Đoạn cảnh"')
    L.append('\nSố đo là gợi ý của máy: cắt mềm có thể là chuyển động camera lớn; BPM có thể lệch ×2/×0,5; "phủ khung" là bề rộng vùng có cạnh.')
    open(os.path.join(out, 'ref-auto.md'), 'w', encoding='utf-8').write('\n'.join(L))
    print('\n'.join(L[:12])); print('→', os.path.join(out, 'ref-auto.md'))

# ---------------------------------------------------------------- track
def track(ref, t0, t1, box, outp):
    info = probe(ref); x, y, w, h = box
    W = min(info['w'], 960); s = W / info['w']
    fr = list(frames(ref, W, t0=t0, t1=t1, info=info))
    if not fr: print('không đọc được khung'); return
    g0 = cv2.cvtColor(fr[0][1], cv2.COLOR_BGR2GRAY)
    tx, ty, tw, th = int(x * s), int(y * s), max(8, int(w * s)), max(8, int(h * s))
    tpl = g0[ty:ty + th, tx:tx + tw]
    rows = []; last = (tx + tw / 2, ty + th / 2, 1.0)
    for t, f in fr:
        g = cv2.cvtColor(f, cv2.COLOR_BGR2GRAY); best = (-2, 0, 0, 1)
        for sc in np.arange(0.4, 2.55, 0.05):
            tt = cv2.resize(tpl, (max(4, int(tw * sc)), max(4, int(th * sc))))
            if tt.shape[0] >= g.shape[0] or tt.shape[1] >= g.shape[1]: continue
            r = cv2.matchTemplate(g, tt, cv2.TM_CCOEFF_NORMED); _, mv, _, ml = cv2.minMaxLoc(r)
            if mv > best[0]: best = (mv, ml[0] + tt.shape[1] / 2, ml[1] + tt.shape[0] / 2, sc)
        sc_, cx, cy = best[3], best[1] / s, best[2] / s
        rows.append((round(t, 3), round(cx, 1), round(cy, 1), round(float(sc_), 3), round(float(best[0]), 3)))
    with open(outp + '.csv', 'w', encoding='utf-8') as fo:
        fo.write('t,x,y,scale,score\n'); [fo.write(','.join(map(str, r)) + '\n') for r in rows]
    A = np.array(rows)
    disp = np.hypot(A[:, 1] - A[0, 1], A[:, 2] - A[0, 2]); scl = A[:, 3]
    use_scale = (scl.max() - scl.min()) > 0.15 and (disp.max() < 0.05 * info['w'])
    v = scl if use_scale else disp
    span = v[-1] - v[0] if abs(v[-1] - v[0]) > 1e-6 else (v.max() - v[0])
    p = (v - v[0]) / (span if abs(span) > 1e-6 else 1)
    moving = np.where(np.abs(np.diff(p)) > 0.01)[0]
    i_s = int(moving[0]) if len(moving) else 0; i_e = int(moving[-1]) + 1 if len(moving) else len(p) - 1
    T = A[:, 0]; dur = T[i_e] - T[i_s]
    seg = p[i_s:i_e + 1]; ts = (T[i_s:i_e + 1] - T[i_s]) / (dur if dur > 0 else 1)
    t50 = float(np.interp(0.5, seg, ts)) if seg.max() >= 0.5 and np.all(np.diff(seg[:max(2, np.argmax(seg >= 0.5) + 1)]) >= -0.05) else float('nan')
    over = float(max(0, seg.max() - 1) * 100)
    if np.isnan(t50): kind = 'không đơn điệu (đi rồi về / nhiều đoạn) — xem đồ thị'
    elif t50 < 0.28: kind = 'ease-out mạnh ("snap": lao nhanh rồi phanh) — influence ~8/92'
    elif t50 < 0.42: kind = 'ease-out vừa — influence ~25/75'
    elif t50 <= 0.58: kind = 'easy ease / gần tuyến tính — xem độ dốc hai đầu'
    elif t50 <= 0.72: kind = 'ease-in vừa'
    else: kind = 'ease-in mạnh (tăng tốc ra) — influence ~92/8'
    if over > 3: kind += f' + overshoot {over:.0f}% (bounce)'
    prop = 'scale' if use_scale else 'vị trí'
    # đồ thị
    H_, W_ = 300, 600; img = np.full((H_, W_, 3), 20, np.uint8)
    for i in range(1, len(p)):
        a = (int((T[i - 1] - T[0]) / max(1e-6, T[-1] - T[0]) * (W_ - 40)) + 20, int(H_ - 30 - p[i - 1] * (H_ - 60)))
        b = (int((T[i] - T[0]) / max(1e-6, T[-1] - T[0]) * (W_ - 40)) + 20, int(H_ - 30 - p[i] * (H_ - 60)))
        cv2.line(img, a, b, (0, 220, 255), 2)
    cv2.line(img, (20, H_ - 30), (W_ - 20, H_ - 30), (90, 90, 90), 1); cv2.line(img, (20, 30), (W_ - 20, 30), (90, 90, 90), 1)
    label(img, f'{prop} {T[0]:.2f}-{T[-1]:.2f}s  t50={t50:.2f}  over={over:.0f}%')
    cv2.imwrite(outp + '.png', img)
    print(f'thuộc tính: {prop} · chuyển động {T[i_s]:.2f}→{T[i_e]:.2f} s ({dur:.2f} s ≈ {round(dur * info["fps"])} khung)')
    print(f'từ ({A[i_s,1]:.0f},{A[i_s,2]:.0f}) scale {A[i_s,3]:.2f} → ({A[i_e,1]:.0f},{A[i_e,2]:.0f}) scale {A[i_e,3]:.2f}')
    print(f'đạt 50% ở {t50:.2f} thời lượng → {kind}')
    print(f'độ tin bám TB {A[:,4].mean():.2f} (<0,5: hộp chọn chưa tốt hoặc vật đổi hình — chọn lại hộp)')
    print('→', outp + '.csv', outp + '.png')

# ---------------------------------------------------------------- pick / strip / compare
def pick(ref, t, pts):
    f = frame_at(ref, t)
    for x, y in pts:
        x, y = int(x), int(y); r = f[max(0, y - 2):y + 3, max(0, x - 2):x + 3].reshape(-1, 3).mean(0)
        hsv = cv2.cvtColor(np.uint8([[r]]), cv2.COLOR_BGR2HSV)[0, 0]
        print(f'({x},{y}) {hexc(r)}  H{int(hsv[0]) * 2} S{int(hsv[1] / 2.55)}% V{int(hsv[2] / 2.55)}%')

def strip(ref, t0, t1, outj, every=1):
    info = probe(ref); land = info['w'] >= info['h']
    fr = [label(f.copy(), f'{t:.2f}') for i, (t, f) in enumerate(frames(ref, 240 if land else 135, t0=t0, t1=t1, info=info)) if i % every == 0]
    tile(fr, 8 if land else 12, outj); print('→', outj, len(fr), 'khung')

def ssim(a, b):
    a = cv2.cvtColor(cv2.resize(a, (192, 108)), cv2.COLOR_BGR2GRAY).astype(np.float64); b = cv2.cvtColor(cv2.resize(b, (192, 108)), cv2.COLOR_BGR2GRAY).astype(np.float64)
    C1, C2 = 6.5, 58.5; mu1 = cv2.GaussianBlur(a, (7, 7), 1.5); mu2 = cv2.GaussianBlur(b, (7, 7), 1.5)
    s1 = cv2.GaussianBlur(a * a, (7, 7), 1.5) - mu1 ** 2; s2 = cv2.GaussianBlur(b * b, (7, 7), 1.5) - mu2 ** 2; s12 = cv2.GaussianBlur(a * b, (7, 7), 1.5) - mu1 * mu2
    return float((((2 * mu1 * mu2 + C1) * (2 * s12 + C2)) / ((mu1 ** 2 + mu2 ** 2 + C1) * (s1 + s2 + C2))).mean())

def paldist(a, b):
    pa = palette([a], 5); pb = palette([b], 5)
    def lab(h): c = np.uint8([[[int(h[5:7], 16), int(h[3:5], 16), int(h[1:3], 16)]]]); return cv2.cvtColor(c, cv2.COLOR_BGR2LAB)[0, 0].astype(float)
    A = [(lab(h), w) for h, w in pa]; B = [lab(h) for h, _ in pb]
    return float(sum(w * min(np.linalg.norm(x - y) for y in B) for x, w in A) / sum(w for _, w in A))

def compare(ref, ours, outp, ts):
    ir = probe(ref); io_ = probe(ours); land = ir['w'] >= ir['h']
    cw = 640 if land else 360
    rows = []; pairs = []
    for t in ts:
        a = frame_at(ref, t, cw); b = frame_at(ours, min(t, io_['dur'] - 0.05), cw)
        if a is None or b is None: continue
        if b.shape != a.shape: b = cv2.resize(b, (a.shape[1], a.shape[0]))
        sa, sb = stats(a), stats(b)
        rows.append((t, sa, sb, paldist(a, b), ssim(a, b)))
        pairs.append(np.hstack([label(a.copy(), f'MAU {t}s'), label(b.copy(), f'DUNG {t}s')]))
    for j in range(0, len(pairs), 4): tile(pairs[j:j + 4], 1, f'{outp}_{j // 4}.jpg')
    L = [f'# So sánh: {os.path.basename(ref)} ↔ {os.path.basename(ours)}\n',
         '| giây | sáng M/D | bão hoà M/D | trắng% M/D | chi tiết% M/D | phủ khung% M/D | lệch bảng màu ΔE | giống cấu trúc |', '|---|---|---|---|---|---|---|---|']
    for t, sa, sb, pd, ss in rows:
        L.append(f"| {t} | {sa['luma']:.0f}/{sb['luma']:.0f} | {sa['sat']:.0f}/{sb['sat']:.0f} | {sa['white']:.1f}/{sb['white']:.1f} | {sa['edges']:.1f}/{sb['edges']:.1f} | {sa['cover']:.0f}/{sb['cover']:.0f} | {pd:.1f} | {ss:.2f} |")
    def avg(k, w): return np.mean([r[w][k] for r in rows])
    hints = []
    if rows:
        dl = avg('luma', 2) - avg('luma', 1); ds = avg('sat', 2) - avg('sat', 1); de = avg('edges', 2) / max(0.1, avg('edges', 1)); dc = avg('cover', 2) - avg('cover', 1)
        dw = avg('white', 2) - avg('white', 1); pdm = np.mean([r[3] for r in rows])
        if abs(dl) > 8: hints.append(f"Độ sáng: bản dựng {'SÁNG' if dl > 0 else 'TỐI'} hơn {abs(dl):.0f}/255 → chỉnh nền/ánh sáng/grade")
        if abs(ds) > 12: hints.append(f"Bão hoà: bản dựng {'RỰC' if ds > 0 else 'NHẠT'} hơn {abs(ds):.0f}/255 → Hue/Saturation tổng")
        if dw > 1.5: hints.append(f"Cháy sáng: vùng gần trắng nhiều hơn {dw:.1f}% → hạ glow/bloom")
        if de < 0.7: hints.append(f"Chi tiết: bản dựng chỉ có {de * 100:.0f}% lượng chi tiết của mẫu → thêm chữ/icon/số/trục trong UI, texture")
        elif de > 1.5: hints.append(f"Chi tiết: bản dựng rối hơn mẫu ({de * 100:.0f}%) → bớt phần tử, tăng khoảng trống")
        if dc < -12: hints.append(f"Tỉ lệ khung: vật nội dung hẹp hơn mẫu {abs(dc):.0f}% bề ngang → phóng to")
        if pdm > 18: hints.append(f"Màu: bảng màu lệch ΔE {pdm:.0f} → lấy mã màu bằng `refkit.py pick`, đổi H.HUE/palette")
        if not hints: hints.append('Các số đo gần nhau — so bằng mắt các chi tiết còn lại (chuyển động: dùng strip/track)')
    L.append('\n## Gợi ý sửa (theo trung bình các mốc)\n'); L += [f'- {h}' for h in hints]
    L.append('\nΔE < 10 gần như cùng bảng màu; 10–20 cùng tông khác sắc; > 20 khác màu. "Giống cấu trúc" 0–1 (chỉ có nghĩa khi cùng bố cục).')
    open(outp + '.md', 'w', encoding='utf-8').write('\n'.join(L)); print('\n'.join(L)); print('→', outp + '_*.jpg')

# ---------------------------------------------------------------- CLI
if __name__ == '__main__':
    a = sys.argv[1:]
    if not a: print(__doc__); sys.exit(0)
    c = a[0]
    if c == 'analyze': analyze(a[1], a[2], a[a.index('--lang') + 1] if '--lang' in a else 'auto', '--no-words' not in a)
    elif c == 'track': track(a[1], float(a[2]), float(a[3]), [float(v) for v in a[4].split(',')], a[5])
    elif c == 'pick': pick(a[1], float(a[2]), [tuple(map(float, p.split(','))) for p in a[3:]])
    elif c == 'strip': strip(a[1], float(a[2]), float(a[3]), a[4], int(a[a.index('--every') + 1]) if '--every' in a else 1)
    elif c == 'compare': compare(a[1], a[2], a[3], [float(v) for v in a[4:]])
    else: print(__doc__)
