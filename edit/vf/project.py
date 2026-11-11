# File dự án JSON = nguồn sự thật duy nhất. Mọi công cụ (render, CapCut, 9:16, phụ đề) đọc từ đây.
#
# {
#   "name": "...", "fps": 30, "canvas": {"w": 1920, "h": 1080},
#   "clips":   [ {"src","in","dur","speed","size","label","zoom","canvas"} ... | {"gap": giây} ],   # đặt nối tiếp nhau
#   "sections":[ {"id","title","start","end","script","onscreen":[{"start","end","text","pos","color"}]} ],
#   "voice":   {"profile","pron":[[chữ, cách đọc]]},   "voiceover": [ {"section","file","start","dur"} ],
#   "music":   {"file","gain_db","duck_db"},            "subs": {"mode":"sentence|word"},
#   "rules":   {"shake_max": 0.5, "alternate_sizes": true, "shake_exempt": [chuỗi trong đường dẫn: clip dựng sẵn/CGI không đo rung]}
# }
# size: T toàn, Tr trung, C cận, SP clip sản phẩm dựng sẵn, L logo/thẻ (không tính vào luật xen kẽ)
import json, os
from . import media

SIZES = ('T', 'Tr', 'C')


def load(path):
    p = json.load(open(path, encoding='utf-8')); p['_path'] = path
    p.setdefault('fps', 30); p.setdefault('canvas', {'w': 1920, 'h': 1080}); p.setdefault('rules', {})
    base = os.path.dirname(os.path.abspath(path))
    for c in p.get('clips', []):   # src tương đối được tính từ thư mục dự án (để clone về đâu cũng chạy)
        if c.get('src') and not os.path.isabs(c['src']) and not os.path.exists(c['src']): c['src'] = os.path.join(base, c['src']).replace(chr(92), '/')
    layout(p); return p


def save(p, path=None):
    path = path or p['_path']
    import copy; q = copy.deepcopy({k: v for k, v in p.items() if not k.startswith('_') and k not in ('timeline', 'duration')})
    base = os.path.dirname(os.path.abspath(path)).replace(chr(92), '/') + '/'
    for c in q.get('clips', []):   # ghi lại src dạng tương đối nếu nằm trong thư mục dự án
        if c.get('src', '').replace(chr(92), '/').startswith(base): c['src'] = c['src'].replace(chr(92), '/')[len(base):]
    json.dump(q, open(path, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)


def layout(p):
    """Tính vị trí từng clip trên timeline (nối tiếp nhau). Clip kéo chậm/nhanh: độ dài timeline = dur / speed."""
    t = 0.0; tl = []
    for i, c in enumerate(p['clips']):
        if 'gap' in c:
            t += c['gap']; continue
        d = c['dur'] / c.get('speed', 1.0)
        tl.append(dict(c, idx=i, start=round(t, 4), tdur=round(d, 4))); t += d
    p['timeline'] = tl; p['duration'] = round(t, 3); return tl


def check(p):
    """Kiểm tra luật. Trả về danh sách lỗi (rỗng = đạt)."""
    errs = []; r = p['rules']; shake_max = r.get('shake_max', 0.5)
    last = None
    for c in p['timeline']:
        src, i0, d = c['src'], c['in'], c['dur']
        info = media.probe(src); name = f"{c.get('label', os.path.basename(src))} @{c['start']:.1f}s"
        if i0 < 0 or i0 + d > info['dur'] + 0.04:
            errs.append(f'{name}: đoạn nguồn {i0}-{i0 + d:.1f}s vượt độ dài file {info["dur"]:.1f}s')
        if c.get('size') in SIZES:
            if r.get('alternate_sizes', True) and last == c['size']:
                errs.append(f'{name}: hai cảnh {c["size"]} liền nhau')
            last = c['size']
            if media.shake_at(src, i0, d) > shake_max and not c.get('allow_shake') and not any(x in src for x in r.get('shake_exempt', [])):
                errs.append(f'{name}: rung {media.shake_at(src, i0, d):.2f} > {shake_max}')
        else:
            last = None
    return errs
