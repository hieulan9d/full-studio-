# Công cụ đọc footage: thông tin, đo độ rung, tìm đoạn êm, ảnh xem nhanh, tìm điểm cắt cảnh.
# Kết quả đo được lưu cache theo (đường dẫn, ngày sửa file) để lần sau không đo lại.
import hashlib, json, os, subprocess
import cv2
import numpy as np

CACHE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.cache'); os.makedirs(CACHE_DIR, exist_ok=True)
WINDOW = 2.0  # độ dài cửa sổ đo rung (giây)


def _key(path, tag):
    st = os.stat(path)
    return os.path.join(CACHE_DIR, hashlib.md5(f'{path}|{st.st_size}|{st.st_mtime}|{tag}'.encode('utf-8')).hexdigest() + '.json')


def _cached(path, tag, fn):
    k = _key(path, tag)
    if os.path.exists(k):
        return json.load(open(k, encoding='utf-8'))
    v = fn(); json.dump(v, open(k, 'w', encoding='utf-8')); return v


def probe(path):
    """{w, h, fps, dur, audio} của file video/âm thanh."""
    def run():
        o = subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'stream=codec_type,width,height,r_frame_rate:format=duration',
                                     '-of', 'json', path])
        j = json.loads(o); v = next((s for s in j['streams'] if s['codec_type'] == 'video'), None)
        fps = 0
        if v:
            a, b = v['r_frame_rate'].split('/'); fps = float(a) / float(b or 1)
        return {'w': v['width'] if v else 0, 'h': v['height'] if v else 0, 'fps': fps, 'dur': float(j['format']['duration']),
                'audio': any(s['codec_type'] == 'audio' for s in j['streams'])}
    return _cached(path, 'probe', run)


def shake(path):
    """Độ rung theo cửa sổ 2 giây: danh sách trung vị 'giật nhanh' (px, khung 480 rộng). Càng nhỏ càng êm.
    Chuyển động mượt (lia, nghiêng máy) bị loại, chỉ tính phần giật nhanh."""
    def run():
        cap = cv2.VideoCapture(path); fps = cap.get(5) or 30
        step = max(1, int(round(fps / 12))); prev = None; d = []; i = 0
        while True:
            if not cap.grab(): break
            if i % step == 0:
                ok, fr = cap.retrieve()
                g = cv2.cvtColor(cv2.resize(fr, (480, 270)), cv2.COLOR_BGR2GRAY)
                if prev is not None:
                    (dx, dy), _ = cv2.phaseCorrelate(np.float32(prev), np.float32(g)); d.append((dx, dy))
                prev = g
            i += 1
        d = np.array(d)
        if len(d) < 5: return {'seg': [0.0], 'med': 0.0, 'p90': 0.0, 'rate': 12}
        sm = np.stack([np.convolve(d[:, j], np.ones(12) / 12, 'same') for j in range(2)], 1)
        jit = np.sqrt(((d - sm) ** 2).sum(1)); w = int(12 * WINDOW)
        seg = [float(np.median(jit[a:a + w])) for a in range(0, len(jit) - w + 1, w)] or [float(np.median(jit))]
        return {'seg': seg, 'med': float(np.median(jit)), 'p90': float(np.percentile(jit, 90)), 'rate': 12}
    return _cached(path, 'shake', run)


def shake_cached(path):
    """Kết quả đo rung nếu đã có cache, không thì None (không đo mới, dùng cho giao diện)."""
    k = _key(path, 'shake'); return json.load(open(k, encoding='utf-8')) if os.path.exists(k) else None


def shake_at(path, start, dur):
    """Độ rung (trung vị cửa sổ) lớn nhất trong đoạn [start, start+dur]; chỉ tính cửa sổ chồng lên đoạn >= 0.9 giây."""
    s = shake(path)['seg']; end = start + dur; worst = 0.0
    for k, v in enumerate(s):
        if min(end, (k + 1) * WINDOW) - max(start, k * WINDOW) >= min(0.9, dur): worst = max(worst, v)
    return worst


def calm_windows(path, length=2.5, thr=0.35, hop=0.5):
    """Các đoạn dài `length` giây đủ êm (độ rung <= thr), sắp theo độ êm."""
    d = probe(path)['dur']; out = []; t = 0.0
    while t + length <= d - 0.05:
        out.append((round(t, 2), round(shake_at(path, t, length), 3))); t += hop
    return sorted([x for x in out if x[1] <= thr], key=lambda x: x[1])


def contact(path, t0, t1, n, out, thumb=(320, 180)):
    """Ghép n khung hình đều nhau trong [t0, t1] thành một ảnh để xem nhanh."""
    cap = cv2.VideoCapture(path); fps = cap.get(5) or 30; fr = []
    for t in np.linspace(t0, t1, n):
        cap.set(1, int(t * fps)); ok, im = cap.read()
        if not ok: im = np.zeros((thumb[1], thumb[0], 3), np.uint8)
        im = cv2.resize(im, thumb); cv2.putText(im, f'{t:.1f}s', (4, 18), 0, 0.55, (0, 255, 255), 2); fr.append(im)
    cols = min(n, 4)
    while len(fr) % cols: fr.append(np.zeros_like(fr[0]))
    cv2.imwrite(out, np.vstack([np.hstack(fr[i:i + cols]) for i in range(0, len(fr), cols)]), [cv2.IMWRITE_JPEG_QUALITY, 80])
    return out


def scenes(path, t0=0, t1=None, thr=0.25):
    """Các điểm cắt cảnh (giây) trong [t0, t1], dùng để lấy trọn từng cảnh của video dựng sẵn."""
    t1 = t1 or probe(path)['dur']
    o = subprocess.run(['ffmpeg', '-hide_banner', '-ss', str(t0), '-t', str(t1 - t0), '-i', path, '-vf', f"select='gt(scene,{thr})',showinfo",
                        '-an', '-f', 'null', '-'], capture_output=True, text=True).stderr
    import re
    return [round(float(x) + t0, 2) for x in re.findall(r'pts_time:([0-9.]+)', o)]
