# Xuất file dự án -> dự án CapCut (CapCut 9.5, new_version 187) để bạn sửa tay / thêm cảnh trong CapCut.
# Dựng theo khuôn của một draft thật của bạn (TEMPLATE). Mỗi clip là một đoạn riêng trỏ thẳng vào file nguồn (không copy).
# audio: none (mặc định, an toàn) | full (10 đoạn wav) | mp3 (đoạn mp3, giống file CapCut tự ghi) | one (1 đoạn mp3 cả bài) | min
import copy, json, os, subprocess, time, uuid
from . import media, subs

DRAFTS = 'E:/file cap cut/CapCut Drafts'
TEMPLATE = DRAFTS + '/massage body win2'
FPS = 30
WHITE, DARK, GOLD = [1, 1, 1], [0.118, 0.286, 0.208], [1.0, 0.784, 0.235]
# style -> (cỡ chữ, màu, y mặc định)  — y: +1 mép trên, -1 mép dưới
STYLE = {'Sub': (6, WHITE, -0.86), 'SubW': (6, WHITE, -0.86), 'SubTop': (6, DARK, 0.9), 'Key': (9, WHITE, 0.78), 'Big': (16, WHITE, 0.1),
         'Tag': (7, GOLD, -0.3), 'Dark': (8, DARK, -0.45), 'DarkB': (11, DARK, -0.6), 'DarkS': (5, DARK, -0.74)}


def U(): return str(uuid.uuid4()).upper()


def us(sec): return int(round(sec * FPS) / FPS * 1_000_000)


def usf(sec): return int(int(sec * FPS) / FPS * 1_000_000)  # làm tròn xuống khung hình


def export(p, name, audio='none', drafts=DRAFTS, template=TEMPLATE):
    out = f'{drafts}/{name}'
    T = json.load(open(f'{template}/draft_content.json', encoding='utf-8')); TM = json.load(open(f'{template}/draft_meta_info.json', encoding='utf-8'))
    vseg = next(s for tr in T['tracks'] if tr['type'] == 'video' for s in tr['segments'])
    tmat = {k: next(x for x in T['materials'][k] if x['id'] in vseg['extra_material_refs'])
            for k in ('speeds', 'placeholder_infos', 'canvases', 'sound_channel_mappings', 'material_colors', 'vocal_separations')}
    vmat = next(x for x in T['materials']['videos'] if x['id'] == vseg['material_id'])
    good = {x['id'] for x in T['materials']['texts'] if x.get('base_content') and x.get('content', '').startswith('{')}
    txseg = next(s for tr in T['tracks'] if tr['type'] == 'text' for s in tr['segments'] if s.get('material_id') in good and s['target_timerange'])
    txmat = next(x for x in T['materials']['texts'] if x['id'] == txseg['material_id'])
    anim = next(x for x in T['materials']['material_animations'] if x['id'] in txseg['extra_material_refs'])
    track_tpl = next(tr for tr in T['tracks'] if tr['type'] == 'video')
    D = {k: copy.deepcopy(v) for k, v in T.items()}
    D.update({'id': U(), 'name': '', 'tracks': [], 'materials': {k: [] for k in T['materials']}, 'time_marks': None, 'keyframe_graph_list': [],
              'relationships': [], 'lyrics_effects': [], 'fps': float(p['fps']),
              'canvas_config': {'ratio': 'original', 'width': p['canvas']['w'], 'height': p['canvas']['h'], 'background': None},
              'extra_info': {'text_to_video': None, 'track_info': None, 'subtitle_fragment_info_list': []}})
    D['config']['subtitle_taskinfo'] = []; D['config']['attachment_info'] = []
    M = D['materials']

    # --- track video ---
    vt = copy.deepcopy(track_tpl); vt.update({'id': U(), 'segments': [], 'name': ''}); mat_of = {}
    for c in p['timeline']:
        info = media.probe(c['src'])
        if c['src'] not in mat_of:
            m = copy.deepcopy(vmat); m.update({'id': U(), 'unique_id': uuid.uuid4().hex, 'path': c['src'].replace('\\', '/'), 'material_name': os.path.basename(c['src']),
                                               'duration': us(info['dur']), 'width': info['w'], 'height': info['h'], 'has_audio': True, 'local_material_id': str(uuid.uuid4())})
            M['videos'].append(m); mat_of[c['src']] = m
        refs = []
        for k, tp in tmat.items():
            x = copy.deepcopy(tp); x['id'] = U()
            if k == 'speeds': x['speed'] = c.get('speed', 1.0)
            if k == 'canvases' and c.get('inset'): x['color'] = '#e9e9ea'
            M[k].append(x); refs.append(x['id'])
        seg = copy.deepcopy(vseg); seg.update({'id': U(), 'material_id': mat_of[c['src']]['id'], 'extra_material_refs': refs, 'speed': c.get('speed', 1.0),
                                               'volume': c.get('volume', 0.0), 'last_nonzero_volume': 1.0, 'render_index': 0, 'track_render_index': 0, 'keyframe_refs': [],
                                               'common_keyframes': [], 'desc': c.get('label', '')})
        seg['source_timerange'] = {'start': us(c['in']), 'duration': us(c['dur'])}
        seg['target_timerange'] = {'start': us(c['start']), 'duration': us(c['tdur'])}
        if c.get('inset'):
            k = c['inset']; seg['clip']['scale'] = {'x': k, 'y': k}; seg['clip']['transform'] = {'x': 0.0, 'y': round(1 - k, 3)}; seg['uniform_scale'] = {'on': True, 'value': k}
        vt['segments'].append(seg)
    D['tracks'].append(vt)

    # --- chữ ---
    def text_seg(e):
        size, color, y = STYLE.get(e['style'], STYLE['Key'])
        if e.get('pos'): y = round(1 - 2 * e['pos'][1] / 1080, 3)
        m = copy.deepcopy(txmat); m.update({'id': U(), 'type': 'text', 'recognize_text': '', 'recognize_task_id': '', 'name': ''})
        base = json.loads(m['content'])['styles'][0]; styles = []; text = e['text']
        if e.get('parts'):
            text = ''.join(t for t, _ in e['parts']); pos = 0
            for t, col in e['parts']:
                st = copy.deepcopy(base); st['fill']['content']['solid']['color'] = GOLD if col == 'gold' else WHITE; st['size'] = size; st['range'] = [pos, pos + len(t)]
                styles.append(st); pos += len(t)
        else:
            st = copy.deepcopy(base); st['fill']['content']['solid']['color'] = color; st['size'] = size; st['range'] = [0, len(text)]; styles.append(st)
        m['content'] = json.dumps({'text': text, 'styles': styles}, ensure_ascii=False)
        bc = json.loads(m['base_content']); bc['text'] = text; bc['styles'][0].update({'range': [0, len(text)], 'size': float(size)}); m['base_content'] = json.dumps(bc, ensure_ascii=False)
        m.update({'words': {'start_time': [], 'end_time': [], 'text': []}, 'current_words': {'start_time': [], 'end_time': [], 'text': []},
                  'font_size': float(size), 'text_color': '#%02X%02X%02X' % tuple(int(c * 255) for c in color), 'alignment': 1, 'line_feed': 1})
        M['texts'].append(m); an = copy.deepcopy(anim); an['id'] = U(); M['material_animations'].append(an)
        s = copy.deepcopy(txseg); s.update({'id': U(), 'material_id': m['id'], 'extra_material_refs': [an['id']], 'keyframe_refs': [], 'common_keyframes': []})
        s['target_timerange'] = {'start': us(e['start']), 'duration': us(e['end'] - e['start'])}; s['clip']['transform'] = {'x': 0.0, 'y': y}
        return s

    ev = subs.events(p, 'sentence'); lanes = []
    for e in ev:  # đoạn chữ chồng thời gian phải nằm ở track riêng
        s = text_seg(e); a = s['target_timerange']['start']
        for ln in lanes:
            last = ln[-1]['target_timerange']
            if last['start'] + last['duration'] <= a: ln.append(s); break
        else: lanes.append([s])
    for i, ln in enumerate(lanes):
        D['tracks'].append({'id': U(), 'type': 'text', 'flag': 0, 'attribute': 0, 'name': 'Chữ %d' % (i + 1), 'is_default_name': False, 'segments': ln})

    # --- giọng đọc ---
    vo = p.get('voiceover', [])
    if vo and audio != 'none':
        base = os.path.dirname(os.path.abspath(p['_path'])); atpl = next(tr for tr in T['tracks'] if tr['type'] == 'audio' and len(tr['segments']) >= 5)['segments'][0]
        amat_t = next(x for x in T['materials']['audios'] if x['id'] == atpl['material_id'])
        keys = ('speeds',) if audio == 'min' else ('speeds', 'placeholder_infos', 'beats', 'sound_channel_mappings', 'vocal_separations')
        arefs_t = {k: next(x for x in T['materials'][k] if x['id'] in atpl['extra_material_refs']) for k in keys}
        items = [{'section': 'all', 'file': 'voice/voice_all.wav', 'start': 0.0}] if audio == 'one' else vo
        at = {'id': U(), 'type': 'audio', 'flag': 0, 'attribute': 0, 'name': '', 'is_default_name': True, 'segments': []}
        for o in items:
            f = os.path.join(base, o['file'])
            if audio in ('mp3', 'min', 'one'):  # CapCut thật của bạn dùng mp3
                mp3 = f[:-4] + '.mp3'
                if not os.path.exists(mp3) or os.path.getmtime(mp3) < os.path.getmtime(f):
                    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', f, '-c:a', 'libmp3lame', '-b:a', '192k', mp3], check=True)
                f = mp3
            fp = f.replace('\\', '/'); d = media.probe(f)['dur']
            m = copy.deepcopy(amat_t); m.update({'id': U(), 'unique_id': uuid.uuid4().hex, 'type': 'extract_music', 'name': os.path.basename(fp), 'path': fp, 'duration': usf(d), 'wave_points': []})
            M['audios'].append(m); refs = []
            for k, tp in arefs_t.items():
                x = copy.deepcopy(tp); x['id'] = U(); M[k].append(x); refs.append(x['id'])
            sg = copy.deepcopy(atpl); sg.update({'id': U(), 'material_id': m['id'], 'extra_material_refs': refs, 'volume': 1.0, 'last_nonzero_volume': 1.0,
                                                 'keyframe_refs': [], 'common_keyframes': [], 'desc': 'Giọng đọc ' + o['section']})
            sg['source_timerange'] = {'start': 0, 'duration': usf(d)}; sg['target_timerange'] = {'start': us(o['start']), 'duration': usf(d)}
            at['segments'].append(sg)
        D['tracks'].append(at)


    # --- nhạc nền: p['music_tracks'] = [{file, in, start, dur, gain_db?}] ---
    mt = p.get('music_tracks', [])
    if mt:
        atpl = next(tr for tr in T['tracks'] if tr['type'] == 'audio' and len(tr['segments']) >= 5)['segments'][0]
        amat_t = next(x for x in T['materials']['audios'] if x['id'] == atpl['material_id'])
        arefs_t = {k: next(x for x in T['materials'][k] if x['id'] in atpl['extra_material_refs'])
                   for k in ('speeds', 'placeholder_infos', 'beats', 'sound_channel_mappings', 'vocal_separations')}
        for o in mt:
            at = {'id': U(), 'type': 'audio', 'flag': 0, 'attribute': 0, 'name': '', 'is_default_name': True, 'segments': []}
            fp = o['file'].replace('\\', '/'); d = media.probe(o['file'])['dur']
            m = copy.deepcopy(amat_t); m.update({'id': U(), 'unique_id': uuid.uuid4().hex, 'type': 'extract_music', 'name': os.path.basename(fp), 'path': fp, 'duration': usf(d), 'wave_points': []})
            M['audios'].append(m); refs = []
            for k, tp in arefs_t.items():
                x = copy.deepcopy(tp); x['id'] = U(); M[k].append(x); refs.append(x['id'])
            vol = 10 ** (o.get('gain_db', 0) / 20)
            sg = copy.deepcopy(atpl); sg.update({'id': U(), 'material_id': m['id'], 'extra_material_refs': refs, 'volume': vol, 'last_nonzero_volume': vol,
                                                 'keyframe_refs': [], 'common_keyframes': [], 'desc': 'Nhạc ' + os.path.basename(fp)})
            sg['source_timerange'] = {'start': us(o.get('in', 0)), 'duration': us(o['dur'])}; sg['target_timerange'] = {'start': us(o['start']), 'duration': us(o['dur'])}
            at['segments'].append(sg); D['tracks'].append(at)

    D['duration'] = us(p['duration'])
    for i, tr in enumerate(D['tracks']):
        for s in tr['segments']: s['track_render_index'] = i

    # --- ghi dự án ---
    os.makedirs(out, exist_ok=True)
    json.dump(D, open(f'{out}/draft_content.json', 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    now = int(time.time() * 1_000_000); meta = copy.deepcopy(TM)
    meta.update({'draft_fold_path': out, 'draft_id': U(), 'draft_name': name, 'draft_root_path': drafts, 'tm_duration': us(p['duration']), 'tm_draft_create': now,
                 'tm_draft_modified': now, 'draft_timeline_materials_size_': 0, 'draft_segment_extra_info': [], 'draft_removable_storage_device': out[:2],
                 'cloud_package_completed_time': '', 'tm_draft_cloud_completed': '0', 'tm_draft_cloud_entry_id': -1, 'tm_draft_cloud_modified': 0,
                 'tm_draft_cloud_parent_entry_id': -1, 'tm_draft_cloud_space_id': -1, 'tm_draft_cloud_user_id': -1})
    tpl = TM['draft_materials'][0]['value'][0]; vals = []
    for m in M['videos']:
        e = copy.deepcopy(tpl); e.update({'duration': m['duration'], 'extra_info': m['material_name'], 'file_Path': m['path'], 'height': m['height'], 'width': m['width'],
                                          'id': U(), 'roughcut_time_range': {'duration': m['duration'], 'start': 0}}); vals.append(e)
    meta['draft_materials'] = [{'type': t['type'], 'value': vals if t['type'] == 0 else []} for t in TM['draft_materials']]
    json.dump(meta, open(f'{out}/draft_meta_info.json', 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    open(f'{out}/draft_settings', 'w', encoding='utf-8').write(open(f'{template}/draft_settings', encoding='utf-8').read())
    first = p['timeline'][min(len(p['timeline']) - 1, 5)]
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-ss', str(first['in']), '-i', first['src'], '-frames:v', '1', '-vf', 'scale=640:-2', f'{out}/draft_cover.jpg'])
    return out, {'video': len(p['timeline']), 'nguon': len(M['videos']), 'chu': len(M['texts']), 'track': len(D['tracks'])}
