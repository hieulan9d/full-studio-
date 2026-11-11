"""Chọn clip_s (6/8/10) cho từng cảnh từ mốc giọng (trước khi cắt âm thừa: trừ ~0,45s mỗi đoạn). Dùng: python canvas-tools/clip_s.py N"""
import sys, os, json
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')); n = sys.argv[1]
H = f'{ROOT}/projects/dao-ly-tap{n}'
sc = json.load(open(H + '/scenes.json', encoding='utf-8')); M = json.load(open(H + '/voice_marks.json', encoding='utf-8'))
T = M['total']; M = M['marks']; ids = [s['id'] for s in sc['scenes']]; out = []
for k, s in enumerate(sc['scenes']):
    mk = [m for m in M if m['scene'] == s['id']]; t0 = mk[0]['start']
    t1 = [m for m in M if m['scene'] == ids[k + 1]][0]['start'] if k + 1 < len(ids) else T
    span = t1 - t0 - 0.45 * len(mk); c = next((c for c in (6, 8, 10) if c >= 0.85 * span), 10)
    s['clip_s'] = c; out.append((s['id'], round(span, 1), c))
json.dump(sc, open(H + '/scenes.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1); print(out)
