"""Biến kịch bản kich-ban/tapNN.md thành thư mục dự án projects/dao-ly-tapN/ (scenes.json, loi-thoai.txt, build_project.py, make_voice.py, rebuild_voice.py).
Dùng:  python -X utf8 canvas-tools/new_ep.py 9      (sau đó theo canvas-tools/README.md: voice → ảnh → video → dựng)

Định dạng kịch bản (xem kich-ban/README.md):
  # Tập N — Tên         |  X0: cột canvas  |  ## NUM  (dòng "chữ = số" cho phụ đề)  |  ## CẢNH  (dòng "cNN || lời đọc || ảnh || chuyển động")
  Ảnh bắt đầu bằng "CHAR:" = nhân vật đầu trứng áo trắng; "ELDER:" = nhân vật lớn tuổi; còn lại giữ nguyên (cảnh đồ vật ghi "no people").
"""
import sys, os, re, json
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
CH = "A simple minimalist character with a round blank egg-shaped white head and a plain white t-shirt, "
EL = "An elderly character with a round blank egg-shaped white head, "
SUF = (" Hand-drawn black and white ink sketch on a pure black background, white chalk line art with fine crosshatch shading, rough pencil texture, "
       "Vietnamese everyday atmosphere, melancholic but calm and hopeful mood, scene centered with empty black space at the top and bottom for captions, "
       "vertical 9:16 composition, no text, no letters, no logos, no realistic human faces.")

BAD_VOICE = ('chết', 'tử vong', 'tự tử', 'tự sát', 'rượu', 'bia ', 'khiêu dâm')
BAD_IMG = ('child', 'baby', 'kid', 'infant', 'toddler', 'boy', 'girl', 'student')

def check(n):
    """Kiểm tra kịch bản không ghi file: từ nhạy cảm trong lời đọc, từ bị Flow chặn trong prompt ảnh, số chữ không có trong NUM."""
    txt = open(f'{ROOT}/kich-ban/tap{n:02d}.md', encoding='utf-8').read().replace(chr(13), '')
    title = re.search(r'^# (.+)$', txt, re.M).group(1); problems = []; words = 0; k = 0
    for ln in txt.splitlines():
        if not re.match(r'c\d+ \|\|', ln): continue
        sid, voice, img, mot = [x.strip() for x in ln.split('||')]; k += 1; words += len(voice.split())
        for b in BAD_VOICE:
            if b in voice.lower(): problems.append(f'{sid}: lời đọc có "{b}"')
        for b in BAD_IMG:
            if re.search(rf'{b}', img.lower()): problems.append(f'{sid}: ảnh có "{b}"')
        if len(voice.split()) > 62: problems.append(f'{sid}: lời quá dài ({len(voice.split())} chữ)')
    print(f'tập {n}: {title} | {k} cảnh, ~{words} chữ (~{words/4.7:.0f}s) | ' + ('OK' if not problems else '; '.join(problems)))
    return not problems

def main(n):
    src = f'{ROOT}/kich-ban/tap{n:02d}.md'; txt = open(src, encoding='utf-8').read().replace('\r', '')
    title = re.search(r'^# (.+)$', txt, re.M).group(1)
    sec = re.split(r'^## ', txt, flags=re.M); body = {s.split('\n', 1)[0].strip(): s.split('\n', 1)[1] for s in sec[1:]}
    num = []
    for ln in body.get('NUM', '').splitlines():
        if ' = ' in ln: a, b = ln.split(' = ', 1); num.append((a.strip().lstrip('- '), b.strip()))
    for w in ('Một', 'Hai', 'Ba', 'Bốn', 'Năm', 'Sáu', 'Bảy', 'Tám'): num.append((w + ':', w + ' –'))
    scenes = []
    for ln in body['CẢNH'].splitlines():
        if not re.match(r'c\d+ \|\|', ln): continue
        sid, voice, img, mot = [x.strip() for x in ln.split('||')]
        img = CH + img[5:].strip() if img.startswith('CHAR:') else EL + img[6:].strip() if img.startswith('ELDER:') else img
        scenes.append({"id": sid, "clip_s": 8, "voice": voice, "image_prompt": img + SUF, "motion": mot})
    H = f'{ROOT}/projects/dao-ly-tap{n}'
    for d in ('voice/parts', 'media'): os.makedirs(f'{H}/{d}', exist_ok=True)
    json.dump({"scenes": scenes}, open(f'{H}/scenes.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    open(f'{H}/loi-thoai.txt', 'w', encoding='utf-8').write('\n'.join(s['voice'] for s in scenes))
    tpl = f'{ROOT}/projects/dao-ly-tap7'   # bản mẫu mới nhất
    mv = open(f'{tpl}/make_voice.py', encoding='utf-8').read().replace('Năm|Sáu)', 'Năm|Sáu|Bảy|Tám)')
    rv = open(f'{tpl}/rebuild_voice.py', encoding='utf-8').read().replace("'sáu':'6'}", "'sáu':'6','bảy':'7','tám':'8'}")
    bp = open(f'{tpl}/build_project.py', encoding='utf-8').read()
    a = bp.index("NUM=[("); b = bp.index("NUM=[(a.split()")
    bp = (bp[:a] + "NUM=" + repr(num) + "\n" + bp[b:]).replace('Tập 7', f'Tập {n}').replace('tập 7', f'tập {n}')
    for fn, c in (('make_voice.py', mv), ('rebuild_voice.py', rv), ('build_project.py', bp)): open(f'{H}/{fn}', 'w', encoding='utf-8').write(c)
    print(f'{title}: {len(scenes)} cảnh, {len(num)} mục NUM → {H}')

if __name__ == '__main__':
    if sys.argv[1] == 'check':
        import glob
        for f in sorted(glob.glob(f'{ROOT}/kich-ban/tap*.md')): check(int(re.search(r'tap(\d+)', f).group(1)))
    else: main(int(sys.argv[1]))
