# Lớp 2 cho 1117-v2: hiệu ứng video, SFX (kho SFX người dùng hay dùng), hiệu ứng chữ. Chạy 1 lần trên bản sao.
import json, copy, uuid, sys, os
DST = 'E:/file cap cut/CapCut Drafts/1117-v2'; TL = DST + '/Timelines/F4D919B0-598C-4242-9B8D-3D5F3FD8DDDD/draft_content.json'
L = json.load(open(os.path.join(os.path.dirname(__file__), 'lib.json'), encoding='utf-8'))
def U(): return str(uuid.uuid4()).upper()
def us(s): return int(round(s * 30) / 30 * 1e6)
D = json.load(open(TL, encoding='utf-8')); dr = D['materials']['drafts'][0]; inner = dr['draft']; was_str = isinstance(inner, str)
if was_str: inner = json.loads(inner)
if D.get('_v2_layer2') or inner.get('_v2_layer2'): sys.exit('đã chạy rồi')
IM = inner['materials']; segs = inner['tracks'][0]['segments']

# --- 1. hiệu ứng video gắn vào cảnh (extra_material_refs) ---
IM.setdefault('video_effects', [])
FX = {3: 'Góc nhìn rung', 5: 'Lắc', 6: 'Góc nhìn rung', 8: 'Góc nhìn rung'}
for i, name in FX.items():
    e = copy.deepcopy(L['ve'][name]); e['id'] = U(); IM['video_effects'].append(e); segs[i]['extra_material_refs'].append(e['id'])

# --- 2. SFX ---
cuts = [s['target_timerange']['start'] / 1e6 for s in segs]
SFX = [(cuts[1], 'swish_whoosh (large)(794558)', 0.9), (cuts[4], '"whoosh" (Badminton racket swing) D(966368)', 0.8), (cuts[7], 'swish_whoosh (large)(794558)', 0.9),
       (cuts[8], '"whoosh" (Badminton racket swing) D(966368)', 0.7), (0.3, 'pop! (tapping the mouth with a hand)(912415)', 0.9),
       (8.9, 'Pop (lower) telop sound etc', 0.9), (14.9, 'Pop (lower) telop sound etc', 0.9), (21.1, 'Pop (lower) telop sound etc', 0.9),
       (cuts[9], 'Magic reveal', 0.8)]
IM.setdefault('audios', [])
tpl_seg = {k: v for k, v in L['aseg'].items()}
lanes = []  # các track audio, tránh chồng nhau
for t, name, vol in sorted(SFX):
    m = copy.deepcopy(L['au'][name]); m['id'] = U(); IM['audios'].append(m)
    seg, refs = copy.deepcopy(tpl_seg[name][0]), tpl_seg[name][1]
    d = min(m['duration'] / 1e6, 1.3); newrefs = []
    for k, items in refs:
        for z in items:
            z = copy.deepcopy(z); z['id'] = U(); IM.setdefault(k, []).append(z); newrefs.append(z['id'])
    seg.update({'id': U(), 'material_id': m['id'], 'extra_material_refs': newrefs, 'volume': vol, 'last_nonzero_volume': vol, 'keyframe_refs': [], 'common_keyframes': []})
    seg['source_timerange'] = {'start': 0, 'duration': us(d)}; seg['target_timerange'] = {'start': us(t), 'duration': us(d)}
    for ln in lanes:
        e = ln[-1]['target_timerange']
        if e['start'] + e['duration'] <= seg['target_timerange']['start']: ln.append(seg); break
    else: lanes.append([seg])
for i, ln in enumerate(lanes):
    inner['tracks'].append({'id': U(), 'type': 'audio', 'flag': 0, 'attribute': 0, 'name': 'SFX %d' % (i + 1), 'is_default_name': False, 'segments': ln})
for i, tr in enumerate(inner['tracks']):
    for s in tr['segments']: s['track_render_index'] = i
inner['_v2_layer2'] = True
dr['draft'] = json.dumps(inner, ensure_ascii=False, separators=(',', ':')) if was_str else inner

# --- 3. hiệu ứng chữ (outer) ---
A = L['an']; M = D['materials']
PLAN = [('Bụi vàng|in', 'Phóng to chữ|loop'), ('Nảy vào|in', 'Mờ dần|out'), ('Nảy vào|in', 'Mờ dần|out'), ('Nảy vào|in', 'Mờ dần|out'), ('Bật lên|in', 'Mờ dần|out')]
ttrack = D['tracks'][-1]; assert ttrack['type'] == 'text'
for seg, plan in zip(ttrack['segments'], PLAN):
    dur = seg['target_timerange']['duration']; an = next(x for x in M['material_animations'] if x['id'] in seg['extra_material_refs'])
    an['animations'] = []
    for key in plan:
        y = copy.deepcopy(A[key])
        if y['type'] == 'in': y.update({'start': 0, 'duration': 500000})
        elif y['type'] == 'out': y.update({'start': dur - 300000, 'duration': 300000})
        else: y.update({'start': 0, 'duration': dur})
        an['animations'].append(y)
json.dump(D, open(TL, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print('video fx', len(FX), '| sfx', len(SFX), 'trên', len(lanes), 'track | chữ', len(ttrack['segments']))
