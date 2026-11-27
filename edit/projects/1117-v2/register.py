# Đăng ký "1117-v2" vào danh sách dự án CapCut. CHỈ chạy khi CapCut đã đóng hẳn.
import json, shutil, copy, os, subprocess, sys, uuid
if b'CapCut.exe' in subprocess.run(['tasklist'], capture_output=True).stdout: sys.exit('CapCut còn đang mở, hãy đóng hẳn rồi chạy lại')
R = os.path.expandvars('%LOCALAPPDATA%/CapCut/User Data/Projects/com.lveditor.draft/root_meta_info.json')
shutil.copy(R, R + '.bak_1117v2')
d = json.load(open(R, encoding='utf-8')); L = d['all_draft_store']
if any(x.get('draft_name') == '1117-v2' for x in L): sys.exit('đã đăng ký')
e = copy.deepcopy(next(x for x in L if x.get('draft_name') == '1117'))
e.update({'draft_name': '1117-v2', 'draft_fold_path': 'E:/file cap cut/CapCut Drafts/1117-v2', 'draft_id': str(uuid.uuid4()).upper(),
          'draft_json_file': 'E:/file cap cut/CapCut Drafts/1117-v2/draft_content.json', 'draft_cover': 'E:/file cap cut/CapCut Drafts/1117-v2/draft_cover.jpg'})
L.insert(0, e); json.dump(d, open(R, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':')); print('xong')
