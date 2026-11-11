"""Điều khiển canvas cho một tập Đạo lý (tổng quát, thay cho genimg3/genvid3/wait3...).
Dùng:  python -X utf8 canvas-tools/ep.py <lệnh> <N> [...]
  img N          sinh ảnh khung đầu cho mọi cảnh (title "T{N}-cXX ảnh")
  waitimg N      chờ ảnh xong
  vid N [k ...]  sinh video (clip_s trong scenes.json, prompt chuyển động = trường "motion"); k = chỉ các cảnh đó
  waitvid N      chờ video xong; ghi video_nodes.json khi đủ
  export N       đặt exportRequest mới cho node Xuất file và chờ manifest có đủ video
  layout N X0    xếp node: MỖI TẬP MỘT CỘT DỌC riêng tại x=X0 (tập 5:15000, 6:17000, 7:19000, …)
  clean N        xóa node video lỗi (video + cấu hình + chữ, KHÔNG xóa ảnh tham chiếu)
"""
import sys, os, json, time
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
from cv import call
ROOT = os.path.abspath(os.path.join(HERE, '..'))
MANIFEST = os.environ.get('CANVAS_MANIFEST', r'E:/antigravyti/infinite-canvas/exports/manifest.json')

def scenes(n): return json.load(open(f'{ROOT}/projects/dao-ly-tap{n}/scenes.json', encoding='utf-8'))['scenes']
def state():
    r = call('canvas_get_state', {})['result']; return r, {x['id']: x for x in r['nodes']}
def outs(r, N, cid, typ): return [N[x['toNodeId']] for x in r['connections'] if x['fromNodeId'] == cid and N[x['toNodeId']]['type'] == typ]
def cfg(N, title): return [n for n in N.values() if n['type'] == 'config' and (n.get('title') or '').startswith(title)]

def img(n):
    for s in scenes(n):
        r = call('canvas_generate_image', {"prompt": s['image_prompt'], "model": "flow::flow-nano-banana-pro", "size": "9:16", "count": 1, "title": f"T{n}-{s['id']} ảnh"})
        print(s['id'], r.get('ok'), flush=True); time.sleep(3)

def wait(n, kind, mins=15):
    for _ in range(mins * 3):
        r, N = state(); st = {}
        sc = scenes(n)
        for k, s in enumerate(sc, 1):
            t = f"T{n}-{s['id']} ảnh" if kind == 'img' else f"T{n}-V-c{k:02d} "
            c = cfg(N, t); o = outs(r, N, c[0]['id'], 'image' if kind == 'img' else 'video') if c else []
            st[k] = o[0]['metadata'].get('status') if o else 'none'
        vals = list(st.values()); print({v: vals.count(v) for v in set(vals)}, flush=True)
        if all(v in ('success', 'error') for v in vals):
            err = [k for k, v in st.items() if v == 'error']; print('lỗi cảnh:', err); return err
        time.sleep(20)

def vid(n, only=None):
    r, N = state(); sc = scenes(n)
    for k, s in enumerate(sc, 1):
        if only and k not in only: continue
        c = cfg(N, f"T{n}-{s['id']} ảnh")[0]; im = outs(r, N, c['id'], 'image')[0]['id']
        p = ("Hand-drawn black and white ink sketch animation on pure black background, white chalk line art with crosshatch shading, same style as the reference image. "
             + s['motion'] + ". Subtle slow camera push-in, chalk lines flicker slightly. No text, no letters, no logos.")
        res = call('canvas_generate_video', {"prompt": p, "referenceNodeIds": [im], "model": "flow::flow-omni-flash", "size": "9:16", "seconds": str(s['clip_s']), "title": f"T{n}-V-c{k:02d} video {s['clip_s']}s"})
        print('video', k, res.get('ok'), flush=True); time.sleep(5)

def save_nodes(n):
    r, N = state(); ids = []
    for k in range(1, len(scenes(n)) + 1):
        c = cfg(N, f"T{n}-V-c{k:02d} ")[0]; ids.append(outs(r, N, c['id'], 'video')[0]['id'])
    json.dump(ids, open(f'{ROOT}/projects/dao-ly-tap{n}/video_nodes.json', 'w')); return ids

def export(n):
    ids = save_nodes(n); r, N = state(); ex = [x for x in r['nodes'] if x['type'] == 'export:folder']
    if not ex: print('KHÔNG có node Xuất file: hãy thêm lại trên canvas'); return False
    e = ex[0]; p = e['position']
    if not e['metadata'].get('exportAll'): call('canvas_apply_ops', {"ops": [{"type": "update_node", "id": e['id'], "metadata": {"exportAll": True}}]})
    call('canvas_set_viewport', {"viewport": {"x": -p['x'] * 0.5 + 300, "y": -p['y'] * 0.5 + 300, "k": 0.5}})
    call('canvas_apply_ops', {"ops": [{"type": "update_node", "id": e['id'], "metadata": {"exportRequest": f"t{n}-{int(time.time())}"}}]})
    for _ in range(24):
        time.sleep(15); have = {i['nodeId'] for i in json.load(open(MANIFEST, encoding='utf-8'))['items']}
        if all(i in have for i in ids): print('xuất đủ', len(ids)); return True
    print('thiếu'); return False

def layout(n, x0):
    """Mỗi tập MỘT CỘT DỌC riêng tại x0: các node xếp chồng từ trên xuống, cảnh nọ nối tiếp cảnh kia
    (chữ ảnh → cấu hình → ảnh → chữ video → cấu hình → video)."""
    r, N = state(); ch = {}
    for x in r['connections']: ch.setdefault(x['fromNodeId'], []).append(x['toNodeId'])
    items = []; y = [0]; seen = set()
    def put(i):
        if i in seen: return
        seen.add(i); items.append({"id": i, "x": x0, "y": y[0]}); y[0] += int(N[i].get('height') or 420) + 80
    def chain(t):
        cur = t
        while cur:
            put(cur); nx = [i for i in ch.get(cur, []) if N[i]['type'] in ('config', 'image', 'video')]; cur = nx[0] if nx else None
    for k in range(1, len(scenes(n)) + 1):
        for t in N.values():
            ti = t.get('title') or ''
            if t['type'] == 'text' and ti == f"T{n}-c{k:02d} ảnh": chain(t['id'])
        for t in N.values():
            ti = t.get('title') or ''
            if t['type'] == 'text' and ti.startswith(f"T{n}-V-c{k:02d} "): chain(t['id'])
    call('canvas_move_nodes', {"items": items}); print('đã xếp', len(items), 'node vào một cột dọc, x =', x0)

def clean(n):
    r, N = state(); par = {}
    for x in r['connections']: par.setdefault(x['toNodeId'], []).append(x['fromNodeId'])
    dele = []
    for c in [x for x in N.values() if x['type'] == 'config' and (x.get('title') or '').startswith(f"T{n}-V-c")]:
        o = outs(r, N, c['id'], 'video')
        if o and o[0]['metadata'].get('status') == 'error':
            dele += [o[0]['id'], c['id']] + [p for p in par.get(c['id'], []) if N[p]['type'] == 'text']
    if dele: call('canvas_delete_nodes', {"ids": dele})
    print('đã xóa', len(dele))

if __name__ == '__main__':
    c, n = sys.argv[1], int(sys.argv[2])
    if c == 'img': img(n)
    elif c == 'waitimg': wait(n, 'img')
    elif c == 'waitvid': print(wait(n, 'vid', 25)); save_nodes(n)
    elif c == 'vid': vid(n, set(int(x) for x in sys.argv[3:]) or None)
    elif c == 'export': export(n)
    elif c == 'layout': layout(n, int(sys.argv[3]))
    elif c == 'clean': clean(n)
