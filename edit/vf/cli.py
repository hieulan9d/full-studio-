# Bộ lệnh dựng video. Chạy từ thư mục gốc dự án:  python -m vf <lệnh> ...
#   scan <thư mục|file>…      đo thông tin + độ rung từng clip (có cache)
#   stable <clip> [--len 2.5 --thr 0.35]   liệt kê các đoạn êm
#   look <clip> <t0> <t1> [--n 8]           ghép ảnh xem nhanh (in đường dẫn ảnh)
#   scenes <clip> [t0 t1]                   điểm cắt cảnh của clip dựng sẵn
#   beats <nhạc>                            BPM + vị trí beat
#   check <project.json>                    kiểm tra luật (rung, xen kẽ cỡ cảnh, vượt độ dài nguồn)
#   voice <project.json> [--only id …]      tạo giọng, kiểm tra đọc sai, chỉnh khớp khung, ghép voice_all.wav
#   render <project.json> <out.mp4> [--vertical] [--no-audio] [--sub-mode sentence|word]
#   capcut <project.json> <tên> [--audio none|full|mp3|one|min]
#   ls <project.json>                       in danh sách cảnh (kèm chỉ số idx)
#   add <project.json> --src F --in S --dur D [--size T|Tr|C] [--label X] [--at IDX] [--speed K]
#   rm <project.json> IDX…   |  mv <project.json> IDX ĐẾN   |  set <project.json> IDX khóa=giá_trị …
#   search "<từ khóa>" [--source youtube|pexels] [--n 5]      tìm cảnh quay trong kho tư liệu
#   download <url> [--start S --end E] [--out THƯ_MỤC]          tải cảnh (chỉ khi người dùng yêu cầu)
import argparse, glob, json, os, sys
from . import media, music, project, render, tts, capcut, ops, fetch


def _clips(paths):
    out = []
    for p in paths:
        out += [f for f in glob.glob(os.path.join(p, '**', '*'), recursive=True) if f.lower().endswith(('.mp4', '.mov', '.mkv'))] if os.path.isdir(p) else [p]
    return sorted(out)


def main(argv=None):
    ap = argparse.ArgumentParser(prog='vf'); sub = ap.add_subparsers(dest='cmd', required=True)
    s = sub.add_parser('scan'); s.add_argument('paths', nargs='+')
    s = sub.add_parser('stable'); s.add_argument('clip'); s.add_argument('--len', type=float, default=2.5); s.add_argument('--thr', type=float, default=0.35)
    s = sub.add_parser('look'); s.add_argument('clip'); s.add_argument('t0', type=float); s.add_argument('t1', type=float); s.add_argument('--n', type=int, default=8); s.add_argument('--out')
    s = sub.add_parser('scenes'); s.add_argument('clip'); s.add_argument('t0', type=float, nargs='?', default=0); s.add_argument('t1', type=float, nargs='?')
    s = sub.add_parser('beats'); s.add_argument('music')
    s = sub.add_parser('check'); s.add_argument('project')
    s = sub.add_parser('voice'); s.add_argument('project'); s.add_argument('--only', nargs='*')
    s = sub.add_parser('render'); s.add_argument('project'); s.add_argument('out'); s.add_argument('--vertical', action='store_true')
    s.add_argument('--no-audio', action='store_true'); s.add_argument('--sub-mode', choices=['sentence', 'word'])
    s = sub.add_parser('capcut'); s.add_argument('project'); s.add_argument('name'); s.add_argument('--audio', default='none', choices=['none', 'full', 'mp3', 'one', 'min'])
    s = sub.add_parser('ls'); s.add_argument('project')
    s = sub.add_parser('add'); s.add_argument('project'); s.add_argument('--src', required=True); s.add_argument('--in', dest='t_in', type=float, required=True)
    s.add_argument('--dur', type=float, required=True); s.add_argument('--size'); s.add_argument('--label', default=''); s.add_argument('--at', type=int); s.add_argument('--speed', type=float)
    s = sub.add_parser('rm'); s.add_argument('project'); s.add_argument('idx', type=int, nargs='+')
    s = sub.add_parser('mv'); s.add_argument('project'); s.add_argument('idx', type=int); s.add_argument('to', type=int)
    s = sub.add_parser('set'); s.add_argument('project'); s.add_argument('idx', type=int); s.add_argument('pairs', nargs='+')
    s = sub.add_parser('search'); s.add_argument('query'); s.add_argument('--source', default='youtube', choices=['youtube', 'pexels']); s.add_argument('--n', type=int, default=5)
    s = sub.add_parser('download'); s.add_argument('url'); s.add_argument('--start', type=float); s.add_argument('--end', type=float); s.add_argument('--out', default='media')
    a = ap.parse_args(argv)

    if a.cmd == 'scan':
        for f in _clips(a.paths):
            i = media.probe(f); sh = media.shake(f)
            print(f"{os.path.relpath(f)}  {i['w']}x{i['h']} {i['fps']:.0f}fps {i['dur']:.1f}s  rung trung vị {sh['med']:.2f} p90 {sh['p90']:.2f}")
    elif a.cmd == 'stable':
        for t, sc in media.calm_windows(a.clip, a.len, a.thr)[:20]: print(f'{t:6.1f}s  rung {sc:.2f}')
    elif a.cmd == 'look':
        out = a.out or os.path.join(os.environ.get('TEMP', '.'), 'vf_look.jpg'); print(media.contact(a.clip, a.t0, a.t1, a.n, out))
    elif a.cmd == 'scenes':
        print(media.scenes(a.clip, a.t0, a.t1))
    elif a.cmd == 'beats':
        b = music.beats(a.music); print(f"BPM {b['bpm']}  offset {b['offset']}s  beat mỗi {b['period']}s  ({len(b['beats'])} beat)")
    elif a.cmd == 'check':
        p = project.load(a.project); errs = project.check(p)
        print(f"{len(p['timeline'])} clip, {p['duration']}s"); print('\n'.join('  ✗ ' + e for e in errs) if errs else '  đạt mọi luật'); sys.exit(1 if errs else 0)
    elif a.cmd == 'voice':
        p = project.load(a.project); log = []; lows = tts.make_voice(p, os.path.join(os.path.dirname(a.project), 'voice'), a.only, log)
        project.save(p); open(os.path.join(os.path.dirname(a.project), 'voice', 'kiem_tra.txt'), 'w', encoding='utf-8').write('\n'.join(log))
        print('đoạn nghi đọc sai:', len(lows)); [print(' ', s, '|', pc, '\n     nghe:', h) for s, pc, h, _ in lows]
    elif a.cmd == 'render':
        p = project.load(a.project); print(render.render(p, a.out, a.vertical, True, not a.no_audio, a.sub_mode))
    elif a.cmd == 'ls': ops.ls(a.project)
    elif a.cmd == 'add': ops.add(a.project, a.src, a.t_in, a.dur, a.size, a.label, a.at, a.speed)
    elif a.cmd == 'rm': ops.rm(a.project, a.idx)
    elif a.cmd == 'mv': ops.mv(a.project, a.idx, a.to)
    elif a.cmd == 'set': ops.set_(a.project, a.idx, a.pairs)
    elif a.cmd == 'search':
        for i, r in enumerate(fetch.search(a.query, a.source, a.n)): print(i, json.dumps(r, ensure_ascii=False))
    elif a.cmd == 'download': print(fetch.download(a.url, a.out, a.start, a.end))
    elif a.cmd == 'capcut':
        p = project.load(a.project); out, st = capcut.export(p, a.name, a.audio); print(out, st)


if __name__ == '__main__':
    main()
