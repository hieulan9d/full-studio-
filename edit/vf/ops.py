# Thao tác sửa timeline bằng lệnh (cho Claude trong khung chat dùng, thay vì sửa tay file JSON).
# Chỉ số `idx` = vị trí trong danh sách clips của file dự án (kể cả khoảng trống gap), đúng như lệnh `ls` in ra.
import json, os, re
from . import project


def _num(v):
    if v.lower() in ('null', 'none'): return None
    if v.lower() in ('true', 'false'): return v.lower() == 'true'
    try: return float(v) if re.fullmatch(r'-?\d+\.\d*|-?\.\d+', v) else int(v)
    except ValueError: return v


def ls(path):
    p = project.load(path); tl = {c['idx']: c for c in p['timeline']}
    for i, c in enumerate(p['clips']):
        if 'gap' in c: print(f'{i:3d}  (khoảng trống {c["gap"]}s)'); continue
        t = tl[i]; print(f"{i:3d}  {t['start']:6.1f}s  {t['tdur']:4.1f}s  {c.get('size', '-'):2s}  {c.get('label', ''):14s} {os.path.basename(c['src'])} @{c['in']}+{c['dur']}" + (f" x{c['speed']}" if c.get('speed') else ''))
    print(f"tổng {p['duration']}s, {len(p['timeline'])} cảnh")


def _edit(path, fn):
    p = project.load(path); fn(p['clips']); project.save(p, path); ls(path)


def add(path, src, t_in, dur, size=None, label='', at=None, speed=None):
    c = {'src': src, 'in': t_in, 'dur': dur, 'label': label}
    if size: c['size'] = size
    if speed: c['speed'] = speed
    _edit(path, lambda cl: cl.insert(len(cl) if at is None else at, c))


def rm(path, idxs):
    _edit(path, lambda cl: [cl.pop(i) for i in sorted(idxs, reverse=True)])


def mv(path, i, to):
    _edit(path, lambda cl: cl.insert(to, cl.pop(i)))


def set_(path, i, pairs):
    def fn(cl):
        for kv in pairs:
            k, _, v = kv.partition('='); v = _num(v)
            if v is None: cl[i].pop(k, None)
            else: cl[i][k] = v
    _edit(path, fn)
