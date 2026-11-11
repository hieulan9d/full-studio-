# Tìm và tải cảnh quay từ kho tư liệu (YouTube qua yt-dlp, Pexels qua API nếu có khóa PEXELS_API_KEY).
# Chỉ chạy khi người dùng yêu cầu trong chat. Kiểm tra bản quyền trước khi dùng để đăng thật (ưu tiên Pexels / Pixabay / Creative Commons).
import json, os, subprocess, requests


def search(query, source='youtube', n=5):
    if source == 'pexels':
        key = os.environ.get('PEXELS_API_KEY')
        if not key: raise SystemExit('Chưa có PEXELS_API_KEY trong biến môi trường (lấy miễn phí tại pexels.com/api).')
        r = requests.get('https://api.pexels.com/videos/search', params={'query': query, 'per_page': n, 'orientation': 'landscape'}, headers={'Authorization': key}, timeout=30).json()
        out = []
        for v in r.get('videos', []):
            f = max((x for x in v['video_files'] if x.get('width', 0) <= 1920 and x['file_type'] == 'video/mp4'), key=lambda x: x.get('width', 0), default=None)
            if f: out.append({'title': v.get('url', '').rstrip('/').split('/')[-1], 'dur': v['duration'], 'url': f['link'], 'page': v['url'], 'license': 'Pexels'})
        return out
    o = subprocess.run(['yt-dlp', f'ytsearch{n}:{query}', '--dump-json', '--flat-playlist', '--no-warnings'], capture_output=True, text=True, encoding='utf-8').stdout
    return [{'title': j.get('title'), 'dur': j.get('duration'), 'url': j.get('url') or f"https://www.youtube.com/watch?v={j['id']}", 'channel': j.get('channel'), 'license': 'chưa rõ'}
            for j in map(json.loads, filter(None, o.splitlines()))]


def download(url, out_dir, start=None, end=None, name=None):
    """Tải về (tối đa 1080p, không tiếng). Nếu có start/end (giây) chỉ tải đoạn đó."""
    os.makedirs(out_dir, exist_ok=True); name = name or '%(title).60s'
    if url.startswith('http') and url.endswith('.mp4') and 'youtube' not in url:
        f = os.path.join(out_dir, (name if '%' not in name else 'clip') + '.mp4'); open(f, 'wb').write(requests.get(url, timeout=300).content); return f
    a = ['yt-dlp', url, '-f', 'bv*[height<=1080][ext=mp4]/bv*[height<=1080]/b', '-o', os.path.join(out_dir, name + '.%(ext)s'), '--no-warnings', '--no-playlist', '--print', 'after_move:filepath']
    if start is not None and end is not None: a += ['--download-sections', f'*{start}-{end}', '--force-keyframes-at-cuts']
    o = subprocess.run(a, capture_output=True, text=True, encoding='utf-8')
    if o.returncode: raise SystemExit(o.stderr[-400:])
    return o.stdout.strip().splitlines()[-1]
