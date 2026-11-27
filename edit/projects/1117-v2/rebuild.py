# Dựng lại 1117-v2 từ bản gốc 1117 (một lần, gộp zoom + hiệu ứng + SFX + chữ + icon).
# Bài học: CapCut đọc clip ghép từ subdraft/ (không phải bản nhúng) và bỏ track thiếu vật liệu phụ → sửa cả hai nơi, icon dùng bộ vật liệu của ảnh thật.
# CHỈ chạy khi CapCut đã đóng. Xoá 1117-v2 cũ (bản sao của tôi) rồi tạo lại; không đụng bản gốc 1117.
import json, shutil, copy, uuid, os, sys, glob, subprocess
SRC = 'E:/file cap cut/CapCut Drafts/1117'; DST = 'E:/file cap cut/CapCut Drafts/1117-v2'
TLN = 'Timelines/F4D919B0-598C-4242-9B8D-3D5F3FD8DDDD/draft_content.json'; SDN = 'subdraft/B695114B-2FA8-4249-9B37-6F4B0E622C63/draft_content.json'
HERE = os.path.dirname(os.path.abspath(__file__)); L = json.load(open(HERE + '/lib.json', encoding='utf-8'))
if b'CapCut.exe' in subprocess.run(['tasklist'], capture_output=True).stdout: sys.exit('Đóng hẳn CapCut trước')
def U(): return str(uuid.uuid4()).upper()
def us(s): return int(round(s * 30) / 30 * 1e6)
def kf(prop, pts):
    return {'id': U(), 'material_id': '', 'property_type': prop, 'keyframe_list': [
        {'id': U(), 'curveType': 'Line', 'time_offset': us(t), 'left_control': {'x': 0.0, 'y': 0.0}, 'right_control': {'x': 0.0, 'y': 0.0},
         'values': [v], 'string_value': '', 'graphID': ''} for t, v in pts]}
if os.path.exists(DST): shutil.rmtree(DST)
shutil.copytree(SRC, DST)
os.system(f'python "{HERE}/icons.py" >nul')

def edit_inner(inner):
    segs = inner['tracks'][0]['segments']; IM = inner['materials']
    for i, s in enumerate(segs):  # zoom luân phiên (bỏ cảnh đã có keyframe)
        if s.get('common_keyframes'): continue
        d = s['target_timerange']['duration'] / 1e6
        s['common_keyframes'] = [kf('KFTypeScaleX', [(0, 1.0), (d, 1.16)])] if i % 2 == 1 else [kf('KFTypeScaleX', [(0, 1.2), (d, 1.0)]), kf('KFTypeRotation', [(0, 2.5), (0.35, 0.0)])]
    IM.setdefault('video_effects', [])
    for i, name in {3: 'Góc nhìn rung', 5: 'Lắc', 6: 'Góc nhìn rung', 8: 'Góc nhìn rung'}.items():
        e = copy.deepcopy(L['ve'][name]); e['id'] = U(); IM['video_effects'].append(e); segs[i]['extra_material_refs'].append(e['id'])
    cuts = [s['target_timerange']['start'] / 1e6 for s in segs]
    W, W2, P, PT, MR = 'swish_whoosh (large)(794558)', '"whoosh" (Badminton racket swing) D(966368)', 'pop! (tapping the mouth with a hand)(912415)', 'Pop (lower) telop sound etc', 'Magic reveal'
    SFX = [(cuts[1], W, .9), (cuts[4], W2, .8), (cuts[7], W, .9), (cuts[8], W2, .7), (3.11, P, .5), (4.75, P, .5), (8.9, PT, .9), (14.9, PT, .9), (21.1, PT, .9), (cuts[9], MR, .8)]
    IM.setdefault('audios', []); lanes = []
    for t, name, vol in sorted(SFX):
        m = copy.deepcopy(L['au'][name]); m['id'] = U(); IM['audios'].append(m)
        seg, refs = copy.deepcopy(L['aseg'][name][0]), L['aseg'][name][1]; d = min(m['duration'] / 1e6, 1.3); nr = []
        for k, items in refs:
            for z in items: z = copy.deepcopy(z); z['id'] = U(); IM.setdefault(k, []).append(z); nr.append(z['id'])
        seg.update({'id': U(), 'material_id': m['id'], 'extra_material_refs': nr, 'volume': vol, 'last_nonzero_volume': vol, 'keyframe_refs': [], 'common_keyframes': []})
        seg['source_timerange'] = {'start': 0, 'duration': us(d)}; seg['target_timerange'] = {'start': us(t), 'duration': us(d)}
        for ln in lanes:
            e = ln[-1]['target_timerange']
            if e['start'] + e['duration'] <= seg['target_timerange']['start']: ln.append(seg); break
        else: lanes.append([seg])
    for i, ln in enumerate(lanes): inner['tracks'].append({'id': U(), 'type': 'audio', 'flag': 0, 'attribute': 0, 'name': 'SFX %d' % (i + 1), 'is_default_name': False, 'segments': ln})
    for i, tr in enumerate(inner['tracks']):
        for s in tr['segments']: s['track_render_index'] = i

def patch(path, outer):
    D = json.load(open(path, encoding='utf-8')); dr = D['materials']['drafts'][0]; inner = dr['draft']; st = isinstance(inner, str)
    if st: inner = json.loads(inner)
    if len(inner['tracks'][0]['segments']) >= 10:
        edit_inner(inner); dr['draft'] = json.dumps(inner, ensure_ascii=False, separators=(',', ':')) if st else inner
    else: print('cảnh: không thấy 10 clip trong', path)
    if outer: add_outer(D)
    json.dump(D, open(path, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))

def add_outer(D):
    M = D['materials']
    T = json.load(open('E:/file cap cut/CapCut Drafts/massage body win2/draft_content.json', encoding='utf-8'))
    good = {x['id'] for x in T['materials']['texts'] if x.get('base_content') and x.get('content', '').startswith('{')}
    txseg = next(s for tr in T['tracks'] if tr['type'] == 'text' for s in tr['segments'] if s.get('material_id') in good and s['target_timerange'])
    txmat = next(x for x in T['materials']['texts'] if x['id'] == txseg['material_id'])
    anim = next(x for x in T['materials']['material_animations'] if x['id'] in txseg['extra_material_refs'])
    G = 'gold'
    EV = [(0.27, 1.97, [('Bây giờ thì bên mình', 0)], 12, 'Nảy vào|in', 'Mờ dần|out'),
          (1.97, 3.11, [('sẽ di chuyển sang', 0)], 12, 'Nảy vào|in', 'Mờ dần|out'),
          (3.11, 4.31, [('23 Thái Nguyên', G)], 14, 'Bật lên|in', 'Mờ dần|out'),
          (4.31, 5.79, [('giao ', 0), ('77 set quà', G)], 14, 'Bật lên|in', 'Mờ dần|out'),
          (5.79, 7.37, [('cho trung tâm luyện thi', 0)], 12, 'Nảy vào|in', 'Mờ dần|out'),
          (7.37, 8.6, [('Đăng Khoa Edu', G)], 14, 'Bật lên|in', 'Mờ dần|out'),
          (8.9, 10.6, [('Xếp từng hộp quà', 0)], 9, 'Nảy vào|in', 'Mờ dần|out'), (14.9, 16.7, [('Đóng thùng cẩn thận', 0)], 9, 'Nảy vào|in', 'Mờ dần|out'),
          (21.1, 23.0, [('Lên xe giao đi', 0)], 9, 'Nảy vào|in', 'Mờ dần|out'), (25.4, 26.9, [('Gói trọn tâm ý', 0)], 11, 'Bật lên|in', 'Mờ dần|out')]
    M.setdefault('texts', []); M.setdefault('material_animations', []); segs = []
    for a, b, parts, size, ain, aout in EV:
        text = ''.join(t for t, _ in parts)
        m = copy.deepcopy(txmat); m.update({'id': U(), 'type': 'text', 'recognize_text': '', 'recognize_task_id': '', 'name': ''})
        base = json.loads(m['content'])['styles'][0]; styles = []; pos = 0
        for t, c in parts:
            st = copy.deepcopy(base); st['fill']['content']['solid']['color'] = [1.0, 0.784, 0.235] if c else [1, 1, 1]; st['size'] = size; st['range'] = [pos, pos + len(t)]; styles.append(st); pos += len(t)
        m['content'] = json.dumps({'text': text, 'styles': styles}, ensure_ascii=False)
        bc = json.loads(m['base_content']); bc['text'] = text; bc['styles'][0].update({'range': [0, len(text)], 'size': float(size)}); m['base_content'] = json.dumps(bc, ensure_ascii=False)
        m.update({'words': {'start_time': [], 'end_time': [], 'text': []}, 'current_words': {'start_time': [], 'end_time': [], 'text': []}, 'font_size': float(size), 'text_color': '#FFFFFF', 'alignment': 1, 'line_feed': 1})
        M['texts'].append(m); an = copy.deepcopy(anim); an['id'] = U(); dur = us(b - a)
        yi = copy.deepcopy(L['an'][ain]); yi.update({'start': 0, 'duration': 500000}); yo = copy.deepcopy(L['an'][aout]); yo.update({'start': dur - 300000, 'duration': 300000})
        an['animations'] = [yi, yo]; M['material_animations'].append(an)
        s = copy.deepcopy(txseg); s.update({'id': U(), 'material_id': m['id'], 'extra_material_refs': [an['id']], 'keyframe_refs': []})
        s['target_timerange'] = {'start': us(a), 'duration': dur}; s['clip']['transform'] = {'x': 0.0, 'y': -0.62}
        s['common_keyframes'] = [kf('KFTypeScaleX', [(0, 0.6), (0.18, 1.08), (0.32, 1.0)])]; segs.append(s)
    # icon: dùng bộ vật liệu phụ của một ảnh (photo) thật
    P = json.load(open(glob.glob('E:/file cap cut/CapCut Drafts/0603*/draft_content.json')[0], encoding='utf-8'))
    pv = next(v for v in P['materials']['videos'] if v.get('type') == 'photo'); ps = next(s for tr in P['tracks'] for s in tr['segments'] if s['material_id'] == pv['id'])
    tm = {k: x for k in ('canvases', 'placeholder_infos', 'speeds', 'hsl', 'sound_channel_mappings', 'material_colors', 'loudnesses', 'vocal_separations')
          for x in P['materials'].get(k, []) if x['id'] in ps['extra_material_refs']}
    isegs = []
    for (a, b), n in [((4.31, 5.79), 'gift'), ((8.9, 10.6), 'box'), ((14.9, 16.7), 'check'), ((21.1, 23.0), 'truck'), ((25.4, 26.9), 'heart')]:
        d = b - a; m = copy.deepcopy(pv); m.update({'id': U(), 'unique_id': uuid.uuid4().hex, 'path': f'{DST}/icons/{n}.png', 'material_name': n + '.png', 'width': 1080, 'height': 1080}); M['videos'].append(m)
        refs = []
        for k, x in tm.items(): x = copy.deepcopy(x); x['id'] = U(); M.setdefault(k, []).append(x); refs.append(x['id'])
        s = copy.deepcopy(ps); s.update({'id': U(), 'material_id': m['id'], 'extra_material_refs': refs, 'keyframe_refs': [], 'desc': 'icon ' + n, 'render_index': 2})
        s['source_timerange'] = {'start': 0, 'duration': us(d)}; s['target_timerange'] = {'start': us(a), 'duration': us(d)}
        s['clip'] = {'scale': {'x': 0.26, 'y': 0.26}, 'rotation': 0.0, 'transform': {'x': 0.0, 'y': -0.4}, 'flip': {'vertical': False, 'horizontal': False}, 'alpha': 1.0}
        s['common_keyframes'] = [kf('KFTypeScaleX', [(0, 0.0), (0.16, 0.34), (0.3, 0.24), (0.42, 0.26), (d - 0.25, 0.26), (d, 0.2)]),
                                 kf('KFTypeRotation', [(0, -18.0), (0.16, 10.0), (0.3, -5.0), (0.45, 0.0)]), kf('KFTypeAlpha', [(d - 0.25, 1.0), (d, 0.0)])]
        isegs.append(s)
    D['tracks'].append({'id': U(), 'type': 'video', 'flag': 2, 'attribute': 0, 'name': 'Icon', 'is_default_name': False, 'segments': isegs})
    D['tracks'].append({'id': U(), 'type': 'text', 'flag': 0, 'attribute': 0, 'name': 'Chữ', 'is_default_name': False, 'segments': segs})
    for i, tr in enumerate(D['tracks']):
        for s in tr['segments']: s['track_render_index'] = i

patch(f'{DST}/{TLN}', True); patch(f'{DST}/{SDN}', False)
shutil.copy(f'{DST}/{TLN}', f'{DST}/draft_content.json')
mp = f'{DST}/draft_meta_info.json'; m = json.load(open(mp, encoding='utf-8')); m.update({'draft_name': '1117-v2', 'draft_fold_path': DST, 'draft_id': 'F695CE42-4258-45b2-B175-2EA6E44D7E76'}); json.dump(m, open(mp, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print('xong')
