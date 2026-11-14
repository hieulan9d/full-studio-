"""Chạy ảnh rồi video của một tập bằng Muse, mỗi lần tối đa B việc đang chạy (Muse hay báo 'all accounts are busy').
Tự xóa node lỗi và gửi lại. Dùng: python -X utf8 canvas-tools/muse_run.py N [B]"""
import sys, os, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('IMAGE_MODEL', 'muse::muse-image'); os.environ.setdefault('VIDEO_MODEL', 'muse::muse-video')
import ep
from cv import call
n = int(sys.argv[1]); B = int(sys.argv[2]) if len(sys.argv) > 2 else 2
def st(kind):
    r, N = ep.state(); out = {}
    for k, s in enumerate(ep.scenes(n), 1):
        t = f"T{n}-{s['id']} ảnh" if kind == 'img' else f"T{n}-V-c{k:02d} "
        c = ep.cfg(N, t); o = ep.outs(r, N, c[0]['id'], 'image' if kind == 'img' else 'video') if c else []
        out[k] = (o[0]['metadata'].get('status') if o else 'none', c, r)
    return out
def drop(items):
    dele = []
    for _, c, r in items:
        Nd = {x['id']: x for x in r['nodes']}
        for cc in c:   # xóa cấu hình + chữ prompt + kết quả; KHÔNG xóa ảnh tham chiếu của video
            dele += [cc['id']] + [x['fromNodeId'] for x in r['connections'] if x['toNodeId'] == cc['id'] and Nd[x['fromNodeId']]['type'] == 'text'] + [x['toNodeId'] for x in r['connections'] if x['fromNodeId'] == cc['id']]
    if dele: call('canvas_delete_nodes', {"ids": list(dict.fromkeys(dele))})
for kind in ('img', 'vid'):
    for rnd in range(400):
        s = st(kind); print(kind, rnd, ''.join({'success': 'O', 'loading': '.', 'error': 'x', 'none': '_'}.get(v[0], '?') for v in s.values()), flush=True)
        if all(v[0] == 'success' for v in s.values()): break
        busy = sum(v[0] == 'loading' for v in s.values())
        bad = [k for k, v in s.items() if v[0] in ('error', 'none')]
        if bad and busy < B:
            take = bad[:B - busy]; drop([s[k] for k in take])
            (ep.img if kind == 'img' else ep.vid)(n, set(take)); time.sleep(10)
        time.sleep(30)
ep.save_nodes(n); print('XONG ảnh+video')
