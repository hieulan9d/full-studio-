"""qc_auto.py VIDEO.mp4 [--dur 20] [--w 1920 --h 1080] [--hits 1,3.9,7]
Kiểm tra tự động bản render TRƯỚC khi AI phải xem ảnh. In bảng PASS/WARN/FAIL + chi tiết.

  - thông số: kích thước, fps, thời lượng (so --dur ±0,2 s), có tiếng không
  - khung đen/trống ≥ 0,3 s (blackdetect)             → FAIL
  - đứng hình ≥ 1,0 s (freezedetect), trừ 1,5 s cuối  → WARN (SaaS luôn có chuyển động trôi)
  - cháy sáng: % điểm ảnh gần trắng mỗi 0,5 s > 8%   → WARN (glow quá tay)
  - tối quá: độ sáng trung bình mỗi 0,5 s < 6/255     → WARN (ngoài 0,3 s đầu/cuối)
  - âm thanh: LUFS tích hợp (-14 ±1,5), đỉnh ≤ -0,5 dBTP → WARN
  - --hits: có thay đổi hình mạnh gần mỗi mốc chuyển cảnh (±0,25 s) không → WARN nếu không
Thoát mã 1 nếu có FAIL.
"""
import sys, subprocess, re, json
sys.stdout.reconfigure(encoding='utf-8')   # python -I bỏ qua PYTHONIOENCODING; console Windows mặc định cp1252

v = sys.argv[1]
def arg(k, d):
    return sys.argv[sys.argv.index(k) + 1] if k in sys.argv else d
DUR = float(arg('--dur', 0)); W = int(arg('--w', 0)); Hh = int(arg('--h', 0))
HITS = [float(x) for x in arg('--hits', '').split(',') if x]
res = []
def rep(level, name, msg): res.append((level, name, msg))

def run(args):
    return subprocess.run(args, capture_output=True, text=True, encoding='utf-8', errors='replace')

pr = json.loads(run(['ffprobe', '-v', 'error', '-show_entries', 'stream=codec_type,width,height,r_frame_rate:format=duration', '-of', 'json', v]).stdout)
vs = [s for s in pr['streams'] if s['codec_type'] == 'video'][0]
has_a = any(s['codec_type'] == 'audio' for s in pr['streams'])
dur = float(pr['format']['duration'])
rep('PASS' if (not W or (vs['width'] == W and vs['height'] == Hh)) else 'FAIL', 'kích thước', f"{vs['width']}x{vs['height']}")
rep('PASS' if (not DUR or abs(dur - DUR) <= 0.2) else 'FAIL', 'thời lượng', f"{dur:.2f}s")
rep('PASS' if has_a else 'WARN', 'âm thanh', 'có' if has_a else 'KHÔNG có tiếng')

e = run(['ffmpeg', '-hide_banner', '-nostats', '-i', v, '-vf', 'blackdetect=d=0.3:pix_th=0.04,freezedetect=n=0.002:d=1.0', '-an', '-f', 'null', '-']).stderr
blacks = re.findall(r'black_start:([\d.]+) black_end:([\d.]+)', e)
blacks = [(float(a), float(b)) for a, b in blacks if not (float(a) < 0.05 and float(b) < 0.5)]
rep('FAIL' if blacks else 'PASS', 'khung đen', ', '.join(f'{a:.2f}–{b:.2f}' for a, b in blacks) or 'không')
fs = [float(x) for x in re.findall(r'freeze_start: ([\d.]+)', e)]
fe = [float(x) for x in re.findall(r'freeze_end: ([\d.]+)', e)] + [dur]
fr = [(a, fe[i]) for i, a in enumerate(fs) if a < dur - 1.5]
rep('WARN' if fr else 'PASS', 'đứng hình ≥1s', ', '.join(f'{a:.2f}–{b:.2f}' for a, b in fr) or 'không')

# độ sáng & cháy sáng: lấy mẫu 2 khung/giây, xám 160×90
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', v, '-vf', 'fps=2,scale=160:90,format=gray', '-f', 'rawvideo', '-'], capture_output=True).stdout
n = len(raw) // (160 * 90)
hot, dark, diffs, prev = [], [], [], None
for i in range(n):
    fr_ = raw[i * 14400:(i + 1) * 14400]
    t = i / 2
    mean = sum(fr_) / 14400
    clip = sum(1 for b in fr_ if b > 245) / 14400 * 100
    if clip > 8: hot.append(f'{t:.1f}s {clip:.0f}%')
    if mean < 6 and 0.3 < t < dur - 0.3: dark.append(f'{t:.1f}s')
    if prev is not None: diffs.append((t, sum(abs(a - b) for a, b in zip(fr_[::7], prev[::7])) / len(fr_[::7])))
    prev = fr_
rep('WARN' if hot else 'PASS', 'cháy sáng >8%', ', '.join(hot[:8]) or 'không')
rep('WARN' if dark else 'PASS', 'quá tối', ', '.join(dark[:8]) or 'không')
if HITS:
    miss = []
    for h in HITS:
        near = [d for t, d in diffs if abs(t - h) <= 0.5]
        if not near or max(near) < 6: miss.append(f'{h}')
    rep('WARN' if miss else 'PASS', 'đổi cảnh tại mốc', ('không thấy đổi ở ' + ', '.join(miss)) if miss else f'{len(HITS)} mốc có đổi hình')

if has_a:
    a = run(['ffmpeg', '-hide_banner', '-nostats', '-i', v, '-af', 'ebur128=peak=true', '-f', 'null', '-']).stderr
    I = re.findall(r'I:\s+(-?[\d.]+) LUFS', a); P = re.findall(r'Peak:\s+(-?[\d.]+) dBFS', a)
    I = float(I[-1]) if I else -99; P = float(P[-1]) if P else 0
    rep('PASS' if abs(I + 14) <= 1.5 and P <= -0.5 else 'WARN', 'độ to', f'{I:.1f} LUFS, đỉnh {P:.1f} dBFS' + ('' if abs(I + 14) <= 1.5 else ' → chạy tools/finalize.sh'))

for lv, name, msg in res: print(f'{lv:5} {name:18} {msg}')
sys.exit(1 if any(r[0] == 'FAIL' for r in res) else 0)
