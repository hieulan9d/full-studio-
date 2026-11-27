# Tạo bản sao "1117-v2" từ draft CapCut "1117" và thêm: zoom/nghiêng luân phiên, chữ nhấn nhịp.
# Không sửa bản gốc. Chạy khi CapCut ĐÃ ĐÓNG rồi mới đăng ký (register.py).
import json, shutil, copy, uuid, os, sys
SRC = 'E:/file cap cut/CapCut Drafts/1117'; DST = 'E:/file cap cut/CapCut Drafts/1117-v2'
TL = 'Timelines/F4D919B0-598C-4242-9B8D-3D5F3FD8DDDD/draft_content.json'
TEMPLATE = 'E:/file cap cut/CapCut Drafts/massage body win2/draft_content.json'
def U(): return str(uuid.uuid4()).upper()
def us(s): return int(round(s * 30) / 30 * 1e6)
if os.path.exists(DST): sys.exit('1117-v2 đã tồn tại, không ghi đè')
shutil.copytree(SRC, DST)
D = json.load(open(f'{DST}/{TL}', encoding='utf-8'))
dr = D['materials']['drafts'][0]; inner = dr['draft']; was_str = isinstance(inner, str)
if was_str: inner = json.loads(inner)

def kf(prop, pts):
    return {'id': U(), 'material_id': '', 'property_type': prop, 'keyframe_list': [
        {'id': U(), 'curveType': 'Line', 'time_offset': us(t), 'left_control': {'x': 0.0, 'y': 0.0}, 'right_control': {'x': 0.0, 'y': 0.0},
         'values': [v], 'string_value': '', 'graphID': ''} for t, v in pts]}

# --- zoom / nghiêng cho từng cảnh (bỏ qua cảnh đã có keyframe) ---
n = 0
for i, s in enumerate(inner['tracks'][0]['segments']):
    if s.get('common_keyframes'): continue
    d = s['target_timerange']['duration'] / 1e6
    if i % 2 == 1:   # đẩy vào
        s['common_keyframes'] = [kf('KFTypeScaleX', [(0, 1.0), (d, 1.16)])]
    else:            # kéo ra, mở đầu nghiêng nhẹ rồi thẳng lại (cần scale > 1.1 để không lộ mép)
        s['common_keyframes'] = [kf('KFTypeScaleX', [(0, 1.2), (d, 1.0)]), kf('KFTypeRotation', [(0, 2.5), (0.35, 0.0)])]
    n += 1
if was_str: dr['draft'] = json.dumps(inner, ensure_ascii=False, separators=(',', ':'))
else: dr['draft'] = inner

# --- chữ (khuôn từ draft mẫu thật) ---
T = json.load(open(TEMPLATE, encoding='utf-8'))
good = {x['id'] for x in T['materials']['texts'] if x.get('base_content') and x.get('content', '').startswith('{')}
txseg = next(s for tr in T['tracks'] if tr['type'] == 'text' for s in tr['segments'] if s.get('material_id') in good and s['target_timerange'])
txmat = next(x for x in T['materials']['texts'] if x['id'] == txseg['material_id'])
anim = next(x for x in T['materials']['material_animations'] if x['id'] in txseg['extra_material_refs'])
M = D['materials']; M.setdefault('texts', []); M.setdefault('material_animations', [])
EVENTS = [(0.3, 2.6, 'Hậu trường đóng gói quà tặng', 11), (8.9, 10.6, 'Xếp từng hộp quà', 9), (14.9, 16.7, 'Đóng thùng cẩn thận', 9),
          (21.1, 23.0, 'Lên xe giao đi', 9), (25.4, 26.9, 'Gói trọn tâm ý', 11)]
Y = -0.62; segs = []
for a, b, text, size in EVENTS:
    m = copy.deepcopy(txmat); m.update({'id': U(), 'type': 'text', 'recognize_text': '', 'recognize_task_id': '', 'name': ''})
    st = json.loads(m['content'])['styles'][0]; st['fill']['content']['solid']['color'] = [1, 1, 1]; st['size'] = size; st['range'] = [0, len(text)]
    m['content'] = json.dumps({'text': text, 'styles': [st]}, ensure_ascii=False)
    bc = json.loads(m['base_content']); bc['text'] = text; bc['styles'][0].update({'range': [0, len(text)], 'size': float(size)}); m['base_content'] = json.dumps(bc, ensure_ascii=False)
    m.update({'words': {'start_time': [], 'end_time': [], 'text': []}, 'current_words': {'start_time': [], 'end_time': [], 'text': []},
              'font_size': float(size), 'text_color': '#FFFFFF', 'alignment': 1, 'line_feed': 1})
    M['texts'].append(m); an = copy.deepcopy(anim); an['id'] = U(); M['material_animations'].append(an)
    s = copy.deepcopy(txseg); s.update({'id': U(), 'material_id': m['id'], 'extra_material_refs': [an['id']], 'keyframe_refs': []})
    s['target_timerange'] = {'start': us(a), 'duration': us(b - a)}; s['clip']['transform'] = {'x': 0.0, 'y': Y}
    s['common_keyframes'] = [kf('KFTypeScaleX', [(0, 0.6), (0.18, 1.08), (0.32, 1.0)])]  # bật lên theo nhịp
    segs.append(s)
D['tracks'].append({'id': U(), 'type': 'text', 'flag': 0, 'attribute': 0, 'name': 'Chữ', 'is_default_name': False, 'segments': segs})
for i, tr in enumerate(D['tracks']):
    for s in tr['segments']: s['track_render_index'] = i
json.dump(D, open(f'{DST}/{TL}', 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
# draft_content.json gốc ở thư mục cha cũng là bản chiếu của timeline: xoá để CapCut nạp lại từ Timelines
print('zoom cho', n, 'cảnh;', len(segs), 'dòng chữ')
