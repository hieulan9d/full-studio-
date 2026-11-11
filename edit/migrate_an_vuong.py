# Chuyển dự án An Vượng (các script build_full / EDL cũ) sang file dự án của hệ thống vf. Chạy một lần.
import ast, json, os, shutil
OLD = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'an-vuong')
NEW = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'projects', 'an-vuong'); os.makedirs(NEW + '/voice', exist_ok=True)
src = open(OLD + '/build_full.py', encoding='utf-8').read(); ns = {'__file__': OLD + '/build_full.py'}
exec(src[:src.index('# luật xen kẽ')], ns)
LOI = next(ast.literal_eval(n.value) for n in ast.parse(src).body if isinstance(n, ast.Assign) and n.targets[0].id == 'LOI')
RAW = ns['RAW']; clips = []
def add(srcp, ss, d, size, label, **kw): clips.append(dict(src=srcp, **{'in': ss}, dur=d, size=size, label=label, **kw))
for s in ns['S1']: add(s[0], s[1], s[2], s[3], 'Mở đầu')
for s in ns['S2']: add(s[0], s[1], s[2], s[3], 'Triết lý')
for fn in ('nha-may-edl.json', 'kiem-nghiem-edl.json'):
    for e in json.load(open(f'{OLD}/{fn}', encoding='utf-8')): add(RAW + chr(92) + e['clip'].replace('/', chr(92)), e['start'], e['dur'], e['co'], e['cong_doan'])
for n, p, ss, d in ns['S5']:
    add(p, ss, d, 'SP', n) if p else clips.append({'gap': d})
from vf import media
for s in ns['S6']:
    if s[3] == 'E':
        real = min(s[2], media.probe(s[0])['dur'] - s[1] - 0.05); add(s[0], s[1], round(real, 3), 'L', 'Thẻ kết', speed=round(real / s[2], 4), inset=0.76)
    else: add(s[0], s[1], s[2], s[3], 'Kết')
titles = ['Mở đầu', 'Triết lý', 'Sản xuất', 'Kiểm nghiệm', 'BOJOMI', 'COLLAMELA', 'AV PROTEIN', 'CURCUMILK PHYTO', 'AV PSYLLIUM HUSK', 'Kết']
secs = [{'id': f's{i}', 'title': t, 'start': a, 'end': b, 'script': txt, 'onscreen': []} for i, (t, ((a, b), txt)) in enumerate(zip(titles, LOI.items()), 1)]
S = {s['id']: s for s in secs}
S['s2']['onscreen'].append({'start': 22, 'end': 38, 'text': 'Khoa học làm gốc  •  Chất lượng làm kim chỉ nam'})
chain = ['Nguyên liệu', 'Cân chia', 'Phối trộn', 'Đóng gói']
for i in range(4):
    parts = []
    for j, w in enumerate(chain):
        parts.append([w, 'gold' if j == i else 'white'])
        if j < 3: parts.append(['  →  ', 'white'])
    S['s3']['onscreen'].append({'start': 40 + i * 7.5 + 0.2, 'end': 40 + (i + 1) * 7.5 - 0.2, 'parts': parts, 'text': ''})
S['s4']['onscreen'].append({'start': 71, 'end': 94, 'text': 'Kiểm tra chất lượng  •  Đối chiếu hồ sơ  •  Truy xuất thông tin'})
for sid, tx in (('s5', 'Aquamin  •  D3  •  K2  •  Collagen'), ('s6', 'Collagen tripeptide  •  Vitamin C  •  Kẽm  •  HA'), ('s7', '22 g protein / khẩu phần 30 g'),
                ('s8', 'Curcumin dạng phytosome  •  Hương vani'), ('s9', 'Vỏ hạt mã đề  •  Bổ sung chất xơ')):
    S[sid]['onscreen'].append({'start': S[sid]['start'] + 0.6, 'end': S[sid]['end'] - 0.4, 'text': tx})
for sid in ('s8', 's9'):
    a, b = S[sid]['start'], S[sid]['end']
    S[sid]['onscreen'] += [{'start': a + 0.3, 'end': b - 0.3, 'text': S[sid]['title'], 'style': 'Big', 'pos': [960, 420]},
                           {'start': a + 0.3, 'end': b - 0.3, 'text': '[ CHỜ FOOTAGE SẢN PHẨM ]', 'style': 'Tag', 'pos': [960, 640]}]
S['s10']['onscreen'] += [{'start': 171.8, 'end': 180, 'text': 'Tìm hiểu sản phẩm  •  Kết nối hợp tác', 'style': 'Dark', 'pos': [960, 745]},
                         {'start': 171.8, 'end': 180, 'text': 'Hotline 0867 399 268', 'style': 'DarkB', 'pos': [960, 815]},
                         {'start': 171.8, 'end': 180, 'text': 'Thực phẩm bổ sung, không phải là thuốc.', 'style': 'DarkS', 'pos': [960, 880]}]
pron = [['CURCUMILK PHYTO', 'Cơ-cu-mil Phai-tô'], ['AV PSYLLIUM HUSK', 'Ây Vi Si-li-âm Hắc'], ['AV PROTEIN', 'Ây Vi Prô-tin'], ['BOJOMI', 'Bô-giô-mi'],
        ['COLLAMELA', 'Cô-la-mê-la'], ['An Vượng Pharma', 'An Vượng Pha-ma'], ['22 gam', 'hai mươi hai gam'], ['30 gam', 'ba mươi gam']]
vo = []
for t in json.load(open(OLD + '/voice/tvc/timing_fit.json')):
    sid = f"s{t['n']}"; shutil.copy(f"{OLD}/voice/tvc/fit_m{t['n']}.wav", f'{NEW}/voice/{sid}.wav')
    vo.append({'section': sid, 'file': f'voice/{sid}.wav', 'start': t['start'], 'dur': t['dur'], 'speedup': t['speedup']})
p = {'name': 'An Vuong Pharma - TVC 3 phut', 'fps': 30, 'canvas': {'w': 1920, 'h': 1080}, 'clips': clips, 'sections': secs,
     'voice': {'profile': 'd00dc307', 'pron': pron}, 'voiceover': vo, 'music': None, 'subs': {'mode': 'sentence', 'top_after': 171.7},
     'rules': {'shake_max': 0.5, 'alternate_sizes': True, 'shake_exempt': ['video BOJOMI', 'video collamela', 'video protein AV']}}
json.dump(p, open(NEW + '/project.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('đã tạo', NEW + '/project.json', len(clips), 'clip')
