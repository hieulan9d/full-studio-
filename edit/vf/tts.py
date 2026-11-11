# Giọng đọc bằng VoiceStudio (localhost:3900): viết lại cách đọc tên riêng/số, đọc từng câu/vế rồi ghép khoảng nghỉ chuẩn,
# nhận dạng lại từng đoạn để bắt lỗi đọc sai, rồi chỉnh khớp khung thời gian từng mục.
import difflib, os, re, subprocess
import requests

BASE = 'http://localhost:3900'
GAP_SENT, GAP_CLAUSE = 0.55, 0.22  # nghỉ giữa câu / giữa các vế (giây)

# Cách đọc mặc định (chỉ dùng cho giọng; phụ đề giữ chữ gốc). Dự án có thể thêm/ghi đè trong voice.pron.
PRON = [
    ('vitamin D3, K2', 'vi-ta-min Đê Ba, Ca Hai'), ('Bifidobacterium breve B-3', 'Bi-fi-đô-bác-tê-ri-um, Bờ-rê-vê, Bê Ba'),
    ('L-Leucine', 'Eo Lơ-xin'), ('inulin', 'i-nu-lin'), ('collagen tripeptide', 'col-la-gen tri-pép-tít'), ('collagen', 'col-la-gen'),
    ('vitamin C', 'vi-ta-min Xê'), ('phytosome', 'phai-tô-sôm'), ('curcumin', 'cơ-cu-min'), ('Aquamin', 'A-qua-min'), ('HA', 'Hát Ây'),
    ('protein', 'prô-tin'),
]


def ff(*a): subprocess.run(['ffmpeg', '-y', '-hide_banner', '-loglevel', 'error', *a], check=True)


def dur(path): return float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path]))


def say(text, pron):
    for a, b in list(pron) + PRON:
        text = re.sub(r'(?<![\w-])' + re.escape(a) + r'(?![\w-])', b, text)
    return text


def speak(text, voice, path):
    r = requests.post(BASE + '/v1/audio/speech', json={'model': 'omnivoice', 'input': text, 'voice': voice, 'response_format': 'wav'}, timeout=1800)
    r.raise_for_status(); open(path, 'wb').write(r.content)


def transcribe(path, words=False):
    d = {'model': 'whisper-1', 'language': 'vi'}
    if words: d.update({'response_format': 'verbose_json', 'timestamp_granularities[]': 'word'})
    r = requests.post(BASE + '/v1/audio/transcriptions', files={'file': open(path, 'rb')}, data=d, timeout=900)
    r.raise_for_status(); j = r.json()
    return j.get('words', []) if words else j.get('text', '')


def norm(s):
    return re.sub(r'[^\w ]', '', s.lower().replace('-', '')).strip()


def pieces(text):
    """(đoạn, nghỉ sau): hết câu nghỉ dài, hết vế nghỉ ngắn; vế quá ngắn gộp vào vế kế."""
    out = []
    for s in re.split(r'(?<=[.?!])\s+', text.strip()):
        merged = []
        for p in [p.strip() for p in re.split(r'(?<=[,:;])\s+', s) if p.strip()]:
            if merged and (len(merged[-1]) < 22 or len(p) < 22): merged[-1] += ' ' + p
            else: merged.append(p)
        for j, p in enumerate(merged): out.append((p, GAP_SENT if j == len(merged) - 1 else GAP_CLAUSE))
    return out


def render_section(text, voice, pron, out, tmp, tag, retries=3, log=None):
    """Tạo giọng cho một mục -> file wav `out`. Trả về danh sách đoạn nghi đọc sai (độ giống < 0.8)."""
    files, gaps, low = [], [], []
    for j, (p, gap) in enumerate(pieces(text)):
        best = None
        for k in range(retries):
            raw = os.path.join(tmp, f'{tag}_{j}_{k}.wav'); speak(say(p, pron), voice, raw)
            heard = transcribe(raw); sim = difflib.SequenceMatcher(None, norm(p), norm(heard)).ratio()
            if best is None or sim > best[0]: best = (sim, raw, heard)
            if sim >= 0.85: break
        sim, raw, heard = best; fin = os.path.join(tmp, f'{tag}_{j}.wav')
        ff('-i', raw, '-af', 'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05,areverse,'
           'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05,areverse', '-ar', '44100', '-ac', '1', fin)
        files.append(fin); gaps.append(gap)
        if log is not None: log.append(f'{tag}.{j} [{sim:.2f}] {p}\n        nghe: {heard}')
        if sim < 0.8: low.append((p, heard, sim))
    parts = []
    for k, (f, g) in enumerate(zip(files, gaps)):
        parts.append(f)
        if k < len(files) - 1:
            s = os.path.join(tmp, f'sil_{g}.wav')
            if not os.path.exists(s): ff('-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=mono', '-t', str(g), s)
            parts.append(s)
    lst = os.path.join(tmp, f'{tag}.txt'); open(lst, 'w', encoding='utf-8').write(''.join("file '%s'\n" % x.replace('\\', '/') for x in parts))
    ff('-f', 'concat', '-safe', '0', '-i', lst, '-c:a', 'pcm_s16le', out)
    return low


def fit(src, dst, room):
    """Chuẩn hóa âm lượng; nếu dài hơn `room` giây thì tăng tốc vừa đủ. Trả về (độ dài, hệ số tăng tốc)."""
    d = dur(src); k = max(d / room, 1.0); af = 'loudnorm=I=-16:TP=-1.5:LRA=11'
    if k > 1.0: af = f'atempo={k:.4f},' + af
    ff('-i', src, '-af', af, '-ar', '44100', '-ac', '1', dst)
    return dur(dst), k


def make_voice(p, outdir, only=None, log=None):
    """Tạo giọng cho mọi mục có `script`, chỉnh khớp khung, ghép voice_all.wav. Ghi p['voiceover']."""
    v = p.get('voice', {}); tmp = os.path.join(outdir, 'parts'); os.makedirs(tmp, exist_ok=True)
    pron = [tuple(x) for x in v.get('pron', [])]; vo = []; lows = []
    for s in p['sections']:
        if not s.get('script') or (only and s['id'] not in only): continue
        a, b = s['start'], s['end']; lead, tail = (0.3, 0.2) if b - a <= 12 else (0.4, 0.4)
        raw = os.path.join(outdir, f"{s['id']}_raw.wav"); fin = os.path.join(outdir, f"{s['id']}.wav")
        for pc, heard, sim in render_section(s['script'], v['profile'], pron, raw, tmp, s['id'], log=log): lows.append((s['id'], pc, heard, sim))
        d, k = fit(raw, fin, b - a - lead - tail)
        vo.append({'section': s['id'], 'file': os.path.relpath(fin, os.path.dirname(p['_path'])).replace('\\', '/'), 'start': round(a + lead, 3),
                   'dur': round(d, 3), 'speedup': round(k, 3)})
        print(f"{s['id']}: khung {b - a:.0f}s, giọng {d:.1f}s" + (f' (tăng tốc x{k:.2f})' if k > 1 else ''), flush=True)
    if only:
        old = {x['section']: x for x in p.get('voiceover', [])}; old.update({x['section']: x for x in vo}); vo = [old[k] for k in [s['id'] for s in p['sections']] if k in old]
    p['voiceover'] = vo
    mix_voice(p, os.path.join(outdir, 'voice_all.wav'))
    return lows


def mix_voice(p, out):
    base = os.path.dirname(os.path.abspath(p['_path'])); ins, fc = [], []
    for i, o in enumerate(p['voiceover']):
        ins += ['-i', os.path.join(base, o['file'])]; fc.append(f"[{i}]adelay={int(o['start'] * 1000)}:all=1[a{i}]")
    n = len(p['voiceover'])
    fc.append(''.join(f'[a{i}]' for i in range(n)) + f"amix=inputs={n}:normalize=0:duration=longest,apad=whole_dur={p['duration']}[o]")
    ff(*ins, '-filter_complex', ';'.join(fc), '-map', '[o]', '-t', str(p['duration']), out)
    return out
