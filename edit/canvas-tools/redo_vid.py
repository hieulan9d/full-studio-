"""Sinh lại video của vài cảnh (xóa video cũ, giữ ảnh), từng cái một: python -X utf8 canvas-tools/redo_vid.py N k [k...]  (VIDEO_MODEL qua biến môi trường)"""
import sys, os, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ep
from cv import call
n = int(sys.argv[1])
for k in [int(x) for x in sys.argv[2:]]:
    r, N = ep.state(); c = ep.cfg(N, f"T{n}-V-c{k:02d} ")
    dele = []
    for cc in c:
        dele += [cc['id']] + [x['fromNodeId'] for x in r['connections'] if x['toNodeId'] == cc['id'] and N[x['fromNodeId']]['type'] == 'text'] + [x['toNodeId'] for x in r['connections'] if x['fromNodeId'] == cc['id']]
    if dele: call('canvas_delete_nodes', {"ids": list(dict.fromkeys(dele))})
    ep.vid(n, {k})
    for _ in range(90):
        r, N = ep.state(); c = ep.cfg(N, f"T{n}-V-c{k:02d} "); o = ep.outs(r, N, c[0]['id'], 'video') if c else []
        st = o[0]['metadata'].get('status') if o else 'none'
        if st in ('success', 'error'): break
        time.sleep(10)
    print('cảnh', k, st, flush=True)
