# Nhạc: dò nhịp (BPM, vị trí beat) bằng numpy thuần, và hàm bám cú cắt vào beat gần nhất. Hạ nhạc khi có giọng làm ở render.py.
import subprocess
import numpy as np
from . import media


def beats(path, max_dur=240):
    """{bpm, offset, period, beats:[giây]} — ước lượng từ năng lượng âm (spectral flux), cho nhạc có nhịp rõ."""
    def run():
        sr = 22050
        raw = subprocess.check_output(['ffmpeg', '-v', 'error', '-t', str(max_dur), '-i', path, '-ac', '1', '-ar', str(sr), '-f', 'f32le', '-'])
        x = np.frombuffer(raw, np.float32); n_fft, hop = 1024, 512; win = np.hanning(n_fft)
        frames = 1 + (len(x) - n_fft) // hop
        S = np.abs(np.stack([np.fft.rfft(x[i * hop:i * hop + n_fft] * win) for i in range(frames)]))
        S = np.log1p(10 * S); flux = np.maximum(0, np.diff(S, axis=0)).sum(1); flux = np.concatenate([[0], flux])
        flux = (flux - flux.mean()) / (flux.std() + 1e-9); fps = sr / hop
        ac = np.correlate(flux, flux, 'full')[len(flux) - 1:]
        lo, hi = int(fps * 60 / 180), int(fps * 60 / 60)
        lag = lo + int(np.argmax(ac[lo:hi])); period = lag / fps
        # nếu bắt nhầm nửa nhịp/gấp đôi thì đưa BPM về khoảng 80-160
        bpm = 60 / period
        while bpm < 80: bpm *= 2
        while bpm > 160: bpm /= 2
        period = 60 / bpm; step = period * fps
        best = max(range(int(step)), key=lambda o: flux[np.arange(o, len(flux), step).astype(int)].sum())
        off = best / fps; total = len(x) / sr
        bt = [round(off + k * period, 3) for k in range(int((total - off) / period))]
        return {'bpm': round(bpm, 1), 'offset': round(off, 3), 'period': round(period, 4), 'beats': bt}
    return media._cached(path, 'beats', run)


def snap(t, grid, max_shift=0.15):
    """Dời thời điểm t tới beat gần nhất nếu lệch không quá max_shift giây."""
    b = min(grid['beats'], key=lambda x: abs(x - t))
    return b if abs(b - t) <= max_shift else t
