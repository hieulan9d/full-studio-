# Phụ đề lời đọc (theo câu hoặc hiện từng chữ) + chữ trên màn hình -> danh sách sự kiện chung, xuất ASS (và CapCut dùng lại).
import difflib, json, os, re
from . import tts

GOLD, WHITE, DARK = '&H003CC8FF&', '&H00FFFFFF&', '&H0035491E&'


def split(txt, maxc=78):
    out = []
    for s in re.split(r'(?<=[.?!])\s+', txt):
        if len(s) <= maxc: out.append(s); continue
        cur = ''
        for w in re.split(r'(?<=[,:])\s+', s):
            if cur and len(cur) + len(w) > maxc: out.append(cur.strip()); cur = ''
            cur += w + ' '
        out.append(cur.strip())
    return [o for o in out if o]


def _words_of(p, vo):
    """Thời gian từng chữ của đoạn giọng (nhận dạng, lưu cache cạnh file giọng)."""
    f = os.path.join(os.path.dirname(os.path.abspath(p['_path'])), vo['file']); cache = f + '.words.json'
    if os.path.exists(cache) and os.path.getmtime(cache) > os.path.getmtime(f): return json.load(open(cache, encoding='utf-8'))
    w = tts.transcribe(f, words=True); json.dump(w, open(cache, 'w', encoding='utf-8'), ensure_ascii=False); return w


def _align(script_tokens, asr_words, t0, t1):
    """Gán (bắt đầu, kết thúc) cho từng chữ của kịch bản theo kết quả nhận dạng; chữ lệch được nội suy."""
    n = len(script_tokens); st = [None] * n; en = [None] * n
    a = [tts.norm(x) for x in script_tokens]; b = [tts.norm(w['word']) for w in asr_words]
    for blk in difflib.SequenceMatcher(None, a, b, autojunk=False).get_matching_blocks():
        for k in range(blk.size): st[blk.a + k] = asr_words[blk.b + k]['start']; en[blk.a + k] = asr_words[blk.b + k]['end']
    known = [i for i in range(n) if st[i] is not None]
    if not known: return [(t0 + (t1 - t0) * i / n, t0 + (t1 - t0) * (i + 1) / n) for i in range(n)]
    for i in range(n):
        if st[i] is not None: continue
        lo = max([k for k in known if k < i], default=None); hi = min([k for k in known if k > i], default=None)
        a0 = en[lo] if lo is not None else 0.0; a1 = st[hi] if hi is not None else (asr_words[-1]['end'] if asr_words else t1 - t0)
        l = lo if lo is not None else -1; h = hi if hi is not None else n; span = h - l
        st[i] = a0 + (a1 - a0) * (i - l - 1) / (span - 1 if span > 1 else 1); en[i] = a0 + (a1 - a0) * (i - l) / (span - 1 if span > 1 else 1)
    return [(t0 + st[i], t0 + max(en[i], st[i] + 0.05)) for i in range(n)]


def events(p, mode=None):
    """Danh sách sự kiện chữ: {start, end, text, style, pos?, parts?, words?}. style: Sub, SubTop, SubW, Key, Big, Tag, Dark, DarkB, DarkS."""
    mode = mode or p.get('subs', {}).get('mode', 'sentence'); top_after = p.get('subs', {}).get('top_after', 1e9); ev = []
    vo = {o['section']: o for o in p.get('voiceover', [])}
    for s in p['sections']:
        if s.get('script'):
            o = vo.get(s['id']); t0, d = (o['start'], o['dur']) if o else (s['start'] + 0.4, s['end'] - s['start'] - 0.8)
            ch = split(s['script']); tot = sum(len(c) for c in ch)
            if mode == 'word' and o:
                toks = s['script'].split(); tm = _align(toks, _words_of(p, o), t0, t0 + d); k = 0
                for c in ch:
                    n = len(c.split()); ws = tm[k:k + n]; k += n
                    st, style = ws[0][0], 'SubTop' if ws[0][0] >= top_after else 'SubW'
                    ev.append({'start': st, 'end': ws[-1][1] + 0.15, 'text': c, 'style': style, 'words': [(w, round((e - b) * 100)) for w, (b, e) in zip(c.split(), ws)]})
            else:
                t = t0
                for c in ch:
                    dd = d * len(c) / tot; ev.append({'start': t, 'end': t + dd - 0.05, 'text': c, 'style': 'SubTop' if t >= top_after else 'Sub'}); t += dd
        for e in s.get('onscreen', []):
            ev.append({'start': e['start'], 'end': e['end'], 'text': e.get('text', ''), 'style': e.get('style', 'Key'), 'pos': e.get('pos'), 'parts': e.get('parts')})
    return sorted(ev, key=lambda e: e['start'])


def _ts(t): return '%d:%02d:%05.2f' % (int(t // 3600), int(t % 3600 // 60), t % 60)


def to_ass(p, ev, font='Segoe UI', vertical=False):
    W, H = (p['canvas']['h'], p['canvas']['w']) if vertical else (p['canvas']['w'], p['canvas']['h'])
    f = (W / 1080 * 0.95) if vertical else (H / 1080)  # hệ số chữ theo khung
    mv = lambda v: int(v * f); fs = lambda v: int(v * f)
    st = [  # name, size, primary, secondary, outline-colour, bold, italic, outline, align, marginV
        ('Sub', 46, '&H00FFFFFF', '&H00FFFFFF', '&H00000000', -1, 0, 3, 2, 60), ('SubW', 50, '&H003CC8FF', '&H00FFFFFF', '&H00000000', -1, 0, 3, 2, 60),
        ('SubTop', 44, '&H0035491E', '&H0035491E', '&H00FFFFFF', -1, 0, 0, 8, 40), ('Key', 64, '&H00FFFFFF', '&H00FFFFFF', '&H00000000', -1, 0, 4, 8, 110),
        ('Big', 96, '&H00FFFFFF', '&H00FFFFFF', '&H00000000', -1, 0, 0, 5, 0), ('Tag', 34, '&H003CC8FF', '&H003CC8FF', '&H00000000', -1, 0, 0, 5, 0),
        ('Dark', 44, '&H0035491E', '&H0035491E', '&H00FFFFFF', -1, 0, 0, 5, 0), ('DarkB', 60, '&H0035491E', '&H0035491E', '&H00FFFFFF', -1, 0, 0, 5, 0),
        ('DarkS', 30, '&H0035491E', '&H0035491E', '&H00FFFFFF', 0, 1, 0, 5, 0)]
    out = ['[Script Info]', 'ScriptType: v4.00+', f'PlayResX: {W}', f'PlayResY: {H}', 'WrapStyle: 0', '', '[V4+ Styles]',
           'Format: Name,Fontname,Fontsize,PrimaryColour,SecondaryColour,OutlineColour,BackColour,Bold,Italic,Underline,StrikeOut,ScaleX,ScaleY,Spacing,Angle,BorderStyle,Outline,Shadow,Alignment,MarginL,MarginR,MarginV,Encoding']
    for n, sz, pc, sc, oc, b, i, ol, al, m in st:
        out.append(f'Style: {n},{font},{fs(sz)},{pc},{sc},{oc},&H80000000,{b},{i},0,0,100,100,0,0,1,{ol},1,{al},{int(W * 0.115) if not vertical else 60},{int(W * 0.115) if not vertical else 60},{mv(m)},1')
    out += ['', '[Events]', 'Format: Layer,Start,End,Style,Name,MarginL,MarginR,MarginV,Effect,Text']
    for e in ev:
        pos = '' if not e.get('pos') else '{\\pos(%d,%d)}' % (e['pos'][0] / 1920 * W, e['pos'][1] / 1080 * H)
        if e.get('words'): txt = ' '.join('{\\k%d}%s' % (max(cs, 1), w) for w, cs in e['words'])
        elif e.get('parts'): txt = ''.join('{\\c%s}%s' % (c if c.startswith('&') else GOLD if c == 'gold' else WHITE, t) for t, c in e['parts'])
        else: txt = e['text']
        fade = '{\\fad(350,350)}' if e['style'] in ('Key', 'Big', 'Tag', 'Dark', 'DarkB', 'DarkS') else ''
        out.append('Dialogue: %d,%s,%s,%s,,0,0,0,,%s%s%s' % (1 if fade else 0, _ts(e['start']), _ts(e['end']), e['style'], fade, pos, txt))
    return '\n'.join(out) + '\n'
