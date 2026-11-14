"""Điều khiển canvas cho một tập Đạo lý (tổng quát, thay cho genimg3/genvid3/wait3...).
Dùng:  python -X utf8 canvas-tools/ep.py <lệnh> <N> [...]
  img N          sinh ảnh khung đầu cho mọi cảnh (title "T{N}-cXX ảnh")
  waitimg N      chờ ảnh xong
  vid N [k ...] [--dry]  sinh video Flow bằng NODE VIDEO: prompt = "video_prompt" có thẻ @tên-ảnh (bỏ trống thì "motion" + ảnh khung đầu @id-cảnh);
                 tên ảnh = tiêu đề node ảnh; "mode": frames|reference. --dry chỉ in prompt gửi Flow, không đụng canvas.
                 VIDEO_MODEL=muse::muse-video thì dùng kiểu cũ (node cấu hình). k = chỉ các cảnh đó
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

def img(n, only=None):
    for k, s in enumerate(scenes(n), 1):
        if only and k not in only: continue
        r = call('canvas_generate_image', {"prompt": s['image_prompt'], "model": os.environ.get("IMAGE_MODEL", "flow::flow-nano-banana-pro"), "size": "9:16", "count": 1, "title": f"T{n}-{s['id']} ảnh"})
        print(s['id'], r.get('ok'), flush=True); time.sleep(3)

def video_of(r, N, n, k):
    """Node video của cảnh k: node video tự tạo (tiêu đề T{n}-V-cXX ...) hoặc kiểu cũ (node cấu hình -> video)."""
    pre = f"T{n}-V-c{k:02d}"
    direct = [x for x in N.values() if x['type'] == 'video' and (x.get('title') or '').startswith(pre)]
    if direct: return direct[0]
    c = cfg(N, pre + " ")
    o = outs(r, N, c[0]['id'], 'video') if c else []
    return o[0] if o else None

def wait(n, kind, mins=15):
    for _ in range(mins * 3):
        r, N = state(); st = {}
        sc = scenes(n)
        for k, s in enumerate(sc, 1):
            if kind == 'img':
                c = cfg(N, f"T{n}-{s['id']} ảnh"); o = outs(r, N, c[0]['id'], 'image') if c else []
                node = o[0] if o else None
            else: node = video_of(r, N, n, k)
            st[k] = node['metadata'].get('status') if node else 'none'
        vals = list(st.values()); print({v: vals.count(v) for v in set(vals)}, flush=True)
        if all(v in ('success', 'error') for v in vals):
            err = [k for k, v in st.items() if v == 'error']; print('lỗi cảnh:', err); return err
        time.sleep(20)

STYLE_PREFIX = "Hand-drawn black and white ink sketch animation on pure black background, white chalk line art with crosshatch shading, same style as the reference image. "
STYLE_SUFFIX = ". Camera almost static: at most a very slight, barely noticeable slow push-in (under 3 percent), no fast zoom, no big camera movement, framing stays the same; only small gentle motion of the subject and a faint chalk flicker. No text, no letters, no logos."

def vid_config(n, only=None):
    """Kiểu cũ (Muse): node chữ + node cấu hình tạo, ảnh khung đầu là tham chiếu; prompt = trường motion."""
    r, N = state(); sc = scenes(n)
    for k, s in enumerate(sc, 1):
        if only and k not in only: continue
        c = cfg(N, f"T{n}-{s['id']} ảnh")[0]; im = outs(r, N, c['id'], 'image')[0]['id']
        p = STYLE_PREFIX + s['motion'] + STYLE_SUFFIX
        res = call('canvas_generate_video', {"prompt": p, "referenceNodeIds": [im], "model": os.environ.get("VIDEO_MODEL", "flow::flow-omni-flash"), "size": "9:16", "seconds": str(s['clip_s']), "title": f"T{n}-V-c{k:02d} video {s['clip_s']}s"})
        print('video', k, res.get('ok'), flush=True); time.sleep(5)

def vid(n, only=None, dry=False):
    """Video Flow bằng NODE VIDEO tự tạo (không node chữ/cấu hình). Prompt có thẻ @tên-ảnh trỏ tới ảnh tham chiếu;
    tên ảnh = tiêu đề node ảnh (<= 24 ký tự) = tên file ảnh gửi lên Flow. Muse (VIDEO_MODEL=muse::...) dùng kiểu cũ.
    Mỗi cảnh trong scenes.json: "video_prompt" (có @tag; bỏ trống thì dùng "motion" + ảnh khung đầu @{id}),
    "mode" tùy chọn: "frames" (ảnh là khung đầu) | "reference" (ảnh là thành phần). Mặc định: chỉ nhắc ảnh khung đầu -> frames, còn lại -> reference."""
    model = os.environ.get("VIDEO_MODEL", "flow::flow-omni-flash")
    if not model.startswith("flow::"): return vid_config(n, only)
    import re, uuid
    r, N = state(); sc = scenes(n)
    # thư viện ảnh theo tên (tiêu đề node ảnh); ảnh khung đầu của cảnh luôn ưu tiên mang tên = id cảnh
    lib = {}
    for x in N.values():
        t = (x.get('title') or '').strip().lower()
        if x['type'] == 'image' and t and x['metadata'].get('content') and t not in lib: lib[t] = x
    for k, s in enumerate(sc, 1):
        if only and k not in only: continue
        c = cfg(N, f"T{n}-{s['id']} ảnh"); o = outs(r, N, c[0]['id'], 'image') if c else []
        own = o[0] if o else None
        tag_own = s['id'].lower()
        if own: lib[tag_own] = own
        p = s.get('video_prompt') or (f"@{s['id']} " + STYLE_PREFIX + s['motion'] + STYLE_SUFFIX)
        tags = list(dict.fromkeys(m.lower() for m in re.findall(r'@([\w\-]+)', p)))
        miss = [t for t in tags if t not in lib]
        if miss: print('cảnh', k, 'BỎ QUA: không thấy ảnh', ['@' + t for t in miss], '(đặt tiêu đề node ảnh đúng tên tag)', flush=True); continue
        comp = p
        for t in sorted(tags, key=len, reverse=True): comp = re.sub(r'@' + re.escape(t) + r'(?![\w\-])', f"@[node:{lib[t]['id']}]", comp, flags=re.I)
        mode = s.get('mode') or ('frames' if tags == [tag_own] else 'reference')
        title = f"T{n}-V-c{k:02d} video {s['clip_s']}s"
        if dry: print('cảnh', k, mode, '| tag', tags, '\n   gửi Flow:', p, flush=True); continue
        # đặt tên ảnh khung đầu = id cảnh (đây là tên file trên Flow); tên khác đã có thì giữ nguyên
        if own and (own.get('title') or '') != s['id']: call('canvas_update_node', {"id": own['id'], "patch": {"title": s['id']}})
        vid_id = f"video-{uuid.uuid4()}"; base = own or lib[tags[0]] if tags else own
        pos = {"x": (base['position']['x'] + base['width'] + 120) if base else 0, "y": base['position']['y'] if base else 0}
        meta = {"generationMode": "video", "composerContent": comp, "prompt": comp, "status": "idle", "model": model, "size": "9:16",
                "seconds": str(s['clip_s']), "vquality": "720", "videoMode": mode}
        ops = [{"type": "add_node", "nodeType": "video", "id": vid_id, "title": title, "position": pos, "metadata": meta}]
        ops += [{"type": "connect_nodes", "fromNodeId": lib[t]['id'], "toNodeId": vid_id} for t in tags]
        ops += [{"type": "run_generation", "nodeId": vid_id, "mode": "video", "prompt": comp}]
        res = call('canvas_apply_ops', {"ops": ops})
        print('video', k, res.get('ok'), mode, tags, flush=True); time.sleep(5)

def save_nodes(n):
    r, N = state(); ids = []
    for k in range(1, len(scenes(n)) + 1): ids.append(video_of(r, N, n, k)['id'])
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
    for v in N.values():  # node video tự tạo bị lỗi: chỉ xóa chính nó (ảnh tham chiếu giữ nguyên)
        if v['type'] == 'video' and (v.get('title') or '').startswith(f"T{n}-V-c") and v['metadata'].get('status') == 'error': dele.append(v['id'])
    if dele: call('canvas_delete_nodes', {"ids": list(dict.fromkeys(dele))})
    print('đã xóa', len(dele))

if __name__ == '__main__':
    c, n = sys.argv[1], int(sys.argv[2])
    if c == 'img': img(n, set(int(x) for x in sys.argv[3:]) or None)
    elif c == 'waitimg': wait(n, 'img')
    elif c == 'waitvid': print(wait(n, 'vid', 25)); save_nodes(n)
    elif c == 'vid': vid(n, set(int(x) for x in sys.argv[3:] if x.isdigit()) or None, dry='--dry' in sys.argv)
    elif c == 'export': export(n)
    elif c == 'layout': layout(n, int(sys.argv[3]))
    elif c == 'clean': clean(n)
