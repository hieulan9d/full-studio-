# Sửa icon: dùng đúng bộ vật liệu phụ của một ảnh (photo) thật trong CapCut, bỏ tham chiếu nhầm của clip ghép.
import json, glob, copy, uuid
DST = 'E:/file cap cut/CapCut Drafts/1117-v2'; TL = DST + '/Timelines/F4D919B0-598C-4242-9B8D-3D5F3FD8DDDD/draft_content.json'
def U(): return str(uuid.uuid4()).upper()
T = json.load(open(glob.glob('E:/file cap cut/CapCut Drafts/0603*/draft_content.json')[0], encoding='utf-8'))
pv = next(v for v in T['materials']['videos'] if v.get('type') == 'photo')
ts = next(s for tr in T['tracks'] for s in tr['segments'] if s['material_id'] == pv['id'])
tm = {}
for k in ('canvases', 'placeholder_infos', 'speeds', 'hsl', 'sound_channel_mappings', 'material_colors', 'loudnesses', 'vocal_separations'):
    x = next((x for x in T['materials'].get(k, []) if x['id'] in ts['extra_material_refs']), None)
    if x: tm[k] = x
D = json.load(open(TL, encoding='utf-8')); M = D['materials']
track = next(t for t in D['tracks'] if t.get('name') == 'Icon')
for s in track['segments']:
    refs = []
    for k, x in tm.items():
        x = copy.deepcopy(x); x['id'] = U(); M.setdefault(k, []).append(x); refs.append(x['id'])
    s['extra_material_refs'] = refs
    s.update({'enable_adjust': True, 'enable_hsl': True, 'enable_lut': True, 'render_index': 2, 'hdr_settings': copy.deepcopy(ts.get('hdr_settings'))})
json.dump(D, open(TL, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':')); print('sửa', len(track['segments']), 'icon; refs', list(tm))
