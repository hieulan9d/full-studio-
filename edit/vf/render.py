# Dựng video từ file dự án bằng FFmpeg: cắt từng clip (tốc độ, zoom), nối, đốt phụ đề, trộn giọng + nhạc (nhạc tự nhỏ khi có giọng).
# Có chế độ dọc 9:16 (cắt giữa khung, hoặc theo focus_x của từng clip).
import hashlib, os, shutil, subprocess
from . import media, project, subs, tts


def _run(*a): subprocess.run(['ffmpeg', '-y', '-hide_banner', '-loglevel', 'error', *a], check=True)


def _clip_filter(c, W, H, vertical):
    sp = c.get('speed', 1.0); T = c['tdur']
    f = []
    if sp != 1.0: f.append(f'setpts=PTS/{sp}')
    if vertical and (c.get('size') in ('SP', 'L') or c.get('fit') == 'blur'):  # clip dựng sẵn/logo: giữ nguyên khung ngang trên nền mờ, không cắt mất chữ
        return (f"[0:v]{','.join(f) + ',' if f else ''}fps=30,split[a][b];[a]scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},boxblur=30,setsar=1[bg];"
                f"[b]scale={W}:-2,setsar=1[fg];[bg][fg]overlay=0:(H-h)/2,format=yuv420p,tpad=stop_mode=clone:stop_duration=8[v]")
    if vertical:  # cắt khung 9:16 từ nguồn ngang, focus_x: 0 trái .. 1 phải
        fx = c.get('focus_x', 0.5)
        f += [f'scale=-2:{H}', f"crop={W}:{H}:x='(iw-{W})*{fx}':y=0"]
    elif c.get('inset'):  # thẻ thu nhỏ trên nền mờ của chính nó (chừa chỗ cho chữ bên dưới)
        k = c['inset']; w = int(W * k) // 2 * 2; h = int(H * k) // 2 * 2
        return (f"[0:v]{','.join(f) + ',' if f else ''}scale={W}:{H},setsar=1,fps=30,split[a][b];[a]boxblur=40[bg];[b]scale={w}:{h}[fg];"
                f"[bg][fg]overlay=(W-w)/2:0,format=yuv420p,tpad=stop_mode=clone:stop_duration=8[v]")
    else:
        z = c.get('zoom')
        f.append(f'scale={W}:{H}:force_original_aspect_ratio={"increase" if z else "decrease"}')
        if z: f += [f"scale=w='trunc(iw*({z[0]}+({z[1]}-{z[0]})*t/{T})/2)*2':h=-2:eval=frame", f'crop={W}:{H}']
        else: f.append(f'pad={W}:{H}:(ow-iw)/2:(oh-ih)/2')
    f += ['setsar=1', 'fps=30', 'format=yuv420p', 'tpad=stop_mode=clone:stop_duration=8']
    return '[0:v]' + ','.join(f) + '[v]'


def render_clip(c, W, H, vertical, tmp):
    key = hashlib.md5(repr((c['src'], os.path.getmtime(c['src']), c['in'], c['dur'], c.get('speed'), c.get('zoom'), c.get('inset'),
                            c.get('focus_x'), c.get('size'), c.get('fit'), W, H, vertical, c['tdur'], 2)).encode('utf-8')).hexdigest()[:16]
    out = os.path.join(tmp, f'c_{key}.mp4')
    if not os.path.exists(out):
        _run('-ss', str(c['in']), '-i', c['src'], '-filter_complex', _clip_filter(c, W, H, vertical), '-map', '[v]', '-t', f"{c['tdur']:.4f}",
             '-an', '-c:v', 'libx264', '-crf', '17', '-preset', 'fast', '-r', '30', out)
    return out


def render(p, out, vertical=False, burn=True, audio=True, sub_mode=None):
    W, H = (p['canvas']['h'], p['canvas']['w']) if vertical else (p['canvas']['w'], p['canvas']['h'])
    base = os.path.dirname(os.path.abspath(p['_path'])); tmp = os.path.join(base, 'tmp'); os.makedirs(tmp, exist_ok=True)
    parts = []
    for i, c in enumerate(p['clips']):
        if 'gap' in c:
            g = os.path.join(tmp, f'gap_{c["gap"]}_{W}x{H}.mp4')
            if not os.path.exists(g):
                _run('-f', 'lavfi', '-i', f'color=c=0x15412c:s={W}x{H}:r=30:d={c["gap"]}', '-vf', 'vignette=PI/4,format=yuv420p', '-an', '-c:v', 'libx264', '-crf', '17', '-r', '30', g)
            parts.append(g)
        else:
            parts.append(render_clip(next(t for t in p['timeline'] if t['idx'] == i), W, H, vertical, tmp))
    lst = os.path.join(tmp, 'list.txt'); open(lst, 'w', encoding='utf-8').write(''.join("file '%s'\n" % x.replace('\\', '/') for x in parts))
    vid = os.path.join(tmp, 'video.mp4'); _run('-f', 'concat', '-safe', '0', '-i', lst, '-c', 'copy', vid)
    vf = []
    if burn:
        ev = subs.events(p, sub_mode)
        fd = os.path.join(tmp, 'fonts'); os.makedirs(fd, exist_ok=True)
        for f in ('segoeui.ttf', 'segoeuib.ttf', 'segoeuii.ttf'): shutil.copy('C:/Windows/Fonts/' + f, os.path.join(fd, f))
        open(os.path.join(tmp, 'subs.ass'), 'w', encoding='utf-8-sig').write(subs.to_ass(p, ev, vertical=vertical)); vf = ['subtitles=subs.ass:fontsdir=fonts']
    ins = ['-i', 'video.mp4']; fc = []; amap = []
    if audio and p.get('voiceover'):
        va = os.path.join(base, 'voice', 'voice_all.wav')
        if not os.path.exists(va): tts.mix_voice(p, va)
        ins += ['-i', va]; m = p.get('music')
        if m and os.path.exists(m['file']):
            ins += ['-stream_loop', '-1', '-i', m['file']]
            fc = [f"[2:a]volume={m.get('gain_db', -14)}dB[m]", '[1:a]asplit[v1][v2]',
                  f"[m][v1]sidechaincompress=threshold=0.03:ratio={m.get('ratio', 10)}:attack=20:release=500:makeup=1[md]",
                  '[md][v2]amix=inputs=2:normalize=0:duration=first[a]']
            amap = ['-map', '[a]']
        else:
            amap = ['-map', '1:a']
    args = [*ins]
    if fc: args += ['-filter_complex', ';'.join(fc)]
    args += ['-map', '0:v', *amap]
    if vf: args += ['-vf', ','.join(vf)]
    args += ['-c:v', 'libx264', '-crf', '18', '-preset', 'medium', '-pix_fmt', 'yuv420p']
    if amap: args += ['-c:a', 'aac', '-b:a', '192k']
    args += ['-t', str(p['duration']), os.path.abspath(out)]
    cwd = os.getcwd(); os.chdir(tmp)
    try: _run(*args)
    finally: os.chdir(cwd)
    return out
