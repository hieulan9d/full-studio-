# Lớp 3: icon PNG nằm trên chữ, bật lên theo nhịp (track video thứ 2 ở timeline ngoài)
import json, copy, uuid, glob, os, sys
DST = 'E:/file cap cut/CapCut Drafts/1117-v2'; TL = DST + '/Timelines/F4D919B0-598C-4242-9B8D-3D5F3FD8DDDD/draft_content.json'
def U(): return str(uuid.uuid4()).upper()
def us(s): return int(round(s * 30) / 30 * 1e6)
D = json.load(open(TL, encoding='utf-8'))
if D.get('_v2_icons'): sys.exit('đã chạy rồi')
M = D['materials']
# mẫu ảnh (photo) từ một draft thật
for f in glob.glob('E:/file cap cut/CapCut Drafts/0603*/draft_content.json'):
    T = json.load(open(f, encoding='utf-8'))
    pv = next((v for v in T['materials']['videos'] if v.get('type') == 'photo'), None)
    if pv: break
oseg = D['tracks'][0]['segments'][0]; tmplrefs = {}
for k in ('speeds', 'placeholder_infos', 'canvases', 'sound_channel_mappings', 'material_colors', 'vocal_separations'):
    tmplrefs[k] = [x for x in M.get(k, []) if x['id'] in oseg['extra_material_refs']]
def kf(prop, pts):
    return {'id': U(), 'material_id': '', 'property_type': prop, 'keyframe_list': [
        {'id': U(), 'curveType': 'Line', 'time_offset': us(t), 'left_control': {'x': 0.0, 'y': 0.0}, 'right_control': {'x': 0.0, 'y': 0.0},
         'values': [v], 'string_value': '', 'graphID': ''} for t, v in pts]}
ICONS = [(0.3, 2.6, 'gift'), (8.9, 10.6, 'box'), (14.9, 16.7, 'check'), (21.1, 23.0, 'truck'), (25.4, 26.9, 'heart')]
segs = []
for a, b, n in ICONS:
    p = f'{DST}/icons/{n}.png'; d = b - a
    m = copy.deepcopy(pv); m.update({'id': U(), 'unique_id': uuid.uuid4().hex, 'path': p, 'material_name': n + '.png', 'width': 1080, 'height': 1080, 'duration': 10800000000})
    M['videos'].append(m); refs = []
    for k, lst in tmplrefs.items():
        for z in lst: z = copy.deepcopy(z); z['id'] = U(); M[k].append(z); refs.append(z['id'])
    s = copy.deepcopy(oseg); s.update({'id': U(), 'material_id': m['id'], 'extra_material_refs': refs, 'keyframe_refs': [], 'volume': 1.0, 'last_nonzero_volume': 1.0, 'desc': 'icon ' + n})
    s['source_timerange'] = {'start': 0, 'duration': us(d)}; s['target_timerange'] = {'start': us(a), 'duration': us(d)}
    s['clip'] = {'scale': {'x': 0.26, 'y': 0.26}, 'rotation': 0.0, 'transform': {'x': 0.0, 'y': -0.4}, 'flip': {'vertical': False, 'horizontal': False}, 'alpha': 1.0}
    s['uniform_scale'] = {'on': True, 'value': 1.0}
    # bật lên nảy + lắc nhẹ, rồi mờ ra
    s['common_keyframes'] = [kf('KFTypeScaleX', [(0, 0.0), (0.16, 0.34), (0.3, 0.24), (0.42, 0.26), (d - 0.25, 0.26), (d, 0.2)]),
                             kf('KFTypeRotation', [(0, -18.0), (0.16, 10.0), (0.3, -5.0), (0.45, 0.0)]),
                             kf('KFTypeAlpha', [(d - 0.25, 1.0), (d, 0.0)])]
    segs.append(s)
D['tracks'].insert(1, {'id': U(), 'type': 'video', 'flag': 2, 'attribute': 0, 'name': 'Icon', 'is_default_name': False, 'segments': segs})
for i, tr in enumerate(D['tracks']):
    for s in tr['segments']: s['track_render_index'] = i
D['_v2_icons'] = True
json.dump(D, open(TL, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':')); print('icon', len(segs), [t['type'] for t in D['tracks']])
