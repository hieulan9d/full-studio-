"""Sinh ảnh/video qua Muse2API (chạy cục bộ) cho một tập Đạo lý — thay thế Flow/canvas khi cần.
CHƯA kiểm thử với Muse thật: chạy `test` trước để xem phản hồi, sửa nếu schema khác.

Cấu hình (biến môi trường):  MUSE2API_URL (mặc định http://127.0.0.1:18610), MUSE2API_KEY (Bearer, nếu có).
Dùng:  python -X utf8 canvas-tools/muse.py <lệnh> ...
  models                  liệt kê model của Muse2API
  test "prompt"           thử 1 ảnh 9:16, in nguyên phản hồi, lưu vào canvas-tools/_muse_test/
  img N [k ...]           ảnh khung đầu cho mọi cảnh (hoặc chỉ cảnh k) -> projects/dao-ly-tapN/muse/cXX.png
  vid N [k ...]           video từ ảnh cXX.png + trường "motion" -> projects/dao-ly-tapN/muse/cXX.mp4
Ghi chú: Muse giới hạn duration 1–10 giây (clip_s > 10 sẽ bị cắt về 10). Chạy theo đợt nhỏ (captcha/hạn mức).
"""
import sys, os, json, time, base64, mimetypes, urllib.request, urllib.error

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..'))
BASE = os.environ.get('MUSE2API_URL', 'http://127.0.0.1:18610').rstrip('/')
KEY = os.environ.get('MUSE2API_KEY', '')

def http(method, path, body=None, timeout=900):
    h = {'content-type': 'application/json'}
    if KEY: h['authorization'] = 'Bearer ' + KEY
    req = urllib.request.Request(BASE + path if path.startswith('/') else path,
                                 json.dumps(body).encode() if body is not None else None, h, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r: return json.load(r)
    except urllib.error.HTTPError as e:
        raise SystemExit(f'HTTP {e.code} {path}: {e.read().decode("utf-8", "replace")[:500]}')

def download(url, out):
    if url.startswith('/'): url = BASE + url
    with urllib.request.urlopen(url, timeout=300) as r, open(out, 'wb') as f: f.write(r.read())
    return os.path.getsize(out)

def scenes(n): return json.load(open(f'{ROOT}/projects/dao-ly-tap{n}/scenes.json', encoding='utf-8'))['scenes']
def outdir(n):
    d = f'{ROOT}/projects/dao-ly-tap{n}/muse'; os.makedirs(d, exist_ok=True); return d

def gen_image(prompt, out, ratio='9:16'):
    r = http('POST', '/v1/images/generations', {"prompt": prompt, "model": "muse-image", "aspect_ratio": ratio, "size": ratio})
    d = (r.get('data') or [{}])[0]
    if d.get('url'): return download(d['url'], out)
    if d.get('b64_json'): open(out, 'wb').write(base64.b64decode(d['b64_json'])); return os.path.getsize(out)
    raise SystemExit('Không thấy url/b64 trong phản hồi: ' + json.dumps(r)[:500])

def data_url(path):
    mt = mimetypes.guess_type(path)[0] or 'image/png'
    return f'data:{mt};base64,' + base64.b64encode(open(path, 'rb').read()).decode()

def gen_video(prompt, image_path, out, seconds, ratio='9:16'):
    body = {"prompt": prompt, "model": "muse-video", "duration": max(1, min(10, int(seconds))), "aspect_ratio": ratio, "size": ratio}
    if image_path: body["image"] = data_url(image_path)
    t = http('POST', '/v1/videos', body); tid = t.get('task_id') or t.get('id')
    for _ in range(300):  # tối đa ~25 phút
        time.sleep(5); s = http('GET', f'/v1/videos/{tid}')
        if s.get('status') == 'completed':
            url = s.get('url') or (s.get('video') or {}).get('url') or (s.get('result') or {}).get('url')
            return download(url, out)
        if s.get('status') == 'failed': raise SystemExit(f'Video lỗi: {s.get("error")}')
    raise SystemExit('Quá thời gian chờ video: ' + str(tid))

def cmd_img(n, only):
    d = outdir(n)
    for k, s in enumerate(scenes(n), 1):
        if only and k not in only: continue
        out = f'{d}/c{k:02d}.png'
        try: print('ảnh', k, gen_image(s['image_prompt'], out), 'byte', flush=True)
        except SystemExit as e: print('ảnh', k, 'LỖI', e, flush=True)
        time.sleep(3)

def cmd_vid(n, only):
    d = outdir(n)
    for k, s in enumerate(scenes(n), 1):
        if only and k not in only: continue
        img = f'{d}/c{k:02d}.png'
        if not os.path.exists(img): print('video', k, 'thiếu ảnh', img); continue
        p = ("Hand-drawn black and white ink sketch animation on pure black background, white chalk line art with crosshatch shading, same style as the reference image. "
             + s['motion'] + ". Camera almost static: at most a very slight, barely noticeable slow push-in (under 3 percent), no fast zoom, no big camera movement; only small gentle subject motion and a faint chalk flicker. No text, no letters, no logos.")
        try: print('video', k, gen_video(p, img, f'{d}/c{k:02d}.mp4', s.get('clip_s', 8)), 'byte', flush=True)
        except SystemExit as e: print('video', k, 'LỖI', e, flush=True)
        time.sleep(5)

if __name__ == '__main__':
    c = sys.argv[1] if len(sys.argv) > 1 else ''
    if c == 'models': print(json.dumps(http('GET', '/v1/models'), ensure_ascii=False, indent=1))
    elif c == 'test':
        d = f'{HERE}/_muse_test'; os.makedirs(d, exist_ok=True)
        print('ảnh', gen_image(sys.argv[2], f'{d}/test.png'), 'byte ->', d)
    elif c in ('img', 'vid'):
        n = int(sys.argv[2]); only = set(int(x) for x in sys.argv[3:]) or None
        (cmd_img if c == 'img' else cmd_vid)(n, only)
    else: print(__doc__)
