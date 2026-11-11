# Tạo giọng đọc (cột "Voice (dự phòng khi bật tiếng)") cho TVC WinHair cơ sở 2 bằng giọng "thanh thanh tvc" của VoiceStudio -> mỗi cảnh một file mp3.
# Chạy: python tao_voice_winhair.py   (VoiceStudio phải đang chạy ở localhost:3900)
import json, os, subprocess, sys
import openpyxl
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from vf import tts

XLSX = r'C:\Users\ADMIN\Downloads\TVC_WinHair_CoSo2_KichBan_ChiTiet_final.xlsx'
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'voice-winhair-tvc'); TMP = os.path.join(OUT, '_tmp'); os.makedirs(TMP, exist_ok=True)
VOICE = 'd00dc307'  # thanh thanh tvc

# Sửa lỗi gõ rõ ràng trong cột Voice trước khi đọc (ghi lại trong bao_cao.txt)
FIX = [('thu được được sự', 'thu được sự'), ('dù là là dịch vụ', 'dù là dịch vụ'), ('khách hàng lưu ưu ái winhair', 'khách hàng luôn ưu ái Win Hair'), ('Winhair', 'Win Hair')]
# Cách đọc (chỉ cho giọng)
PRON = [('Cơ sở 1', 'Cơ sở một'), ('Cơ sở 2', 'Cơ sở hai'), ('41', 'bốn mươi mốt'), ('59', 'năm mươi chín'), ('1:1', 'một kèm một'), ('VIP', 'víp'), ('vip', 'víp'),
        ('Kingsport', 'Kinh-sờ-po'), ('combo', 'côm-bô'), ('sofa', 'sô-pha'), ('fade', 'phây'), ('KOC', 'Kây Ô Xi'), ('KOL', 'Kây Ô Eo'),
        ('form', 'phom'), ('menu', 'me-nu')]
SKIP = {'TRÍCH DẪN'}  # chỗ giữ chỗ chờ trích dẫn thật của khách/KOC/KOL, không đọc

ws = openpyxl.load_workbook(XLSX, data_only=True)['Kịch bản']
rows = [r for r in ws.iter_rows(min_row=2, values_only=True)]
scenes = []  # (mã cảnh, bắt đầu, voice, tên phần)
for r in rows:
    if r[1]: scenes.append({'id': r[1], 'start': r[2], 'voice': (r[7] or '').strip(), 'part': r[0]})
sec = lambda t: t.hour * 3600 + t.minute * 60 + t.second if hasattr(t, 'hour') else sum(int(x) * k for x, k in zip(str(t).split(':'), (3600, 60, 1)))
last_end = max(sec(r[3]) for r in rows if r[3])
for i, s in enumerate(scenes):  # khung thời gian của cảnh = từ đầu cảnh đến đầu cảnh kế
    nxt = sec(scenes[i + 1]['start']) if i + 1 < len(scenes) else last_end; s['window'] = nxt - sec(s['start'])

report, log, made = [], [], []
for s in scenes:
    if not s['voice']: continue
    if s['voice'] in SKIP:
        report.append(f"{s['id']}: bỏ qua, chỉ là chỗ giữ chỗ \"{s['voice']}\" (chờ trích dẫn thật)"); continue
    text = s['voice']
    for a, b in FIX:
        if a in text: report.append(f"{s['id']}: sửa lỗi gõ \"{a}\" -> \"{b}\""); text = text.replace(a, b)
    wav = os.path.join(TMP, f"{s['id']}.wav"); mp3 = os.path.join(OUT, f"{s['id']}.mp3")
    if os.path.exists(mp3) and '--lai' not in sys.argv:  # đã tạo ở lần chạy trước (chạy lại cả bộ: thêm --lai)
        d = tts.dur(mp3); made.append({'id': s['id'], 'part': s['part'], 'dur': round(d, 1), 'window': s['window']})
        report.append(f"{s['id']}: {d:.1f}s (khung {s['window']}s)" + (' ⚠ dài hơn khung' if d > s['window'] else '') + ' [đã có từ lần chạy trước]'); print(report[-1], flush=True); continue
    lows = tts.render_section(text, VOICE, PRON, wav, TMP, s['id'], log=log)
    tts.ff('-i', wav, '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11', '-ar', '44100', '-ac', '1', '-c:a', 'libmp3lame', '-b:a', '192k', mp3)
    d = tts.dur(mp3); made.append({'id': s['id'], 'part': s['part'], 'dur': round(d, 1), 'window': s['window']})
    flag = f" ⚠ dài hơn khung {s['window']}s" if d > s['window'] else ''
    report.append(f"{s['id']}: {d:.1f}s (khung {s['window']}s){flag}" + (f" | nghi đọc sai {len(lows)} đoạn" if lows else ''))
    print(report[-1], flush=True)
open(os.path.join(OUT, 'bao_cao.txt'), 'w', encoding='utf-8').write('\n'.join(report) + '\n\n--- kiểm tra nhận dạng ---\n' + '\n'.join(log))
json.dump(made, open(os.path.join(OUT, 'danh_sach.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('xong', len(made), 'file')
