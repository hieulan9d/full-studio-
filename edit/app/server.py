# App dựng video kiểu VideoFlow chạy cục bộ: timeline + xem trước + khung chat với Claude (qua Claude Code CLI, dùng gói của bạn, không cần API key).
# Chạy:  python app/server.py   rồi mở http://localhost:5180
import asyncio, hashlib, json, os, queue, shutil, subprocess, sys, threading, time
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)
from vf import project as vfp, subs, media  # noqa: E402

PROJECTS = os.path.join(ROOT, 'projects')
STATIC = os.path.join(ROOT, 'app', 'static')
PROXY_DIR = os.path.join(ROOT, 'app', '.proxies'); os.makedirs(PROXY_DIR, exist_ok=True)
CLAUDE = shutil.which('claude')
ENV = dict(os.environ, PYTHONUTF8='1', PYTHONIOENCODING='utf-8')
# Claude trong khung chat chỉ được: đọc/sửa file trong dự án và chạy bộ lệnh vf (không chạy lệnh tùy ý)
ALLOWED = 'Read,Edit,Write,Glob,Grep,Bash(python -m vf:*),Bash(python -X utf8 -m vf:*)'
app = FastAPI()
state = {'name': 'an-vuong', 'job': None, 'chat_proc': None}
jobs = {}  # id -> {title, status, log, out}
lock = threading.Lock()


def pdir(name=None): return os.path.join(PROJECTS, name or state['name'])
def ppath(name=None): return os.path.join(pdir(name), 'project.json')


# ---------- lịch sử (hoàn tác) ----------
def hist_dir(): d = os.path.join(pdir(), '.history'); os.makedirs(d, exist_ok=True); return d


def snapshot(tag=''):
    h = hist_dir(); cur = open(ppath(), 'rb').read()
    files = sorted(f for f in os.listdir(h) if f.endswith('.json'))
    if files and open(os.path.join(h, files[-1]), 'rb').read() == cur: return
    open(os.path.join(h, f'{time.time_ns()}{("_" + tag) if tag else ""}.json'), 'wb').write(cur)
    for f in files[:-60]: os.remove(os.path.join(h, f))


# ---------- proxy xem trước (H.264 nhỏ, mở được trên mọi trình duyệt) ----------
proxy_q = queue.Queue(); proxy_state = {}


def proxy_path(src):
    st = os.stat(src); return os.path.join(PROXY_DIR, hashlib.md5(f'{src}|{st.st_size}|{st.st_mtime}'.encode('utf-8')).hexdigest()[:20] + '.mp4')


def proxy_worker():
    while True:
        src = proxy_q.get(); out = proxy_path(src)
        try:
            if not os.path.exists(out):
                tmp = out + '.part.mp4'
                subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', src, '-vf', 'scale=640:-2,fps=30', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '28',
                                '-g', '15', '-an', '-movflags', '+faststart', tmp], check=True); os.replace(tmp, out)
            proxy_state[src] = 'ok'
        except Exception as e:
            proxy_state[src] = 'lỗi: ' + str(e)[:80]


threading.Thread(target=proxy_worker, daemon=True).start()


def ensure_proxies(p):
    for s in {c['src'] for c in p['timeline']}:
        if proxy_state.get(s) != 'ok' and os.path.exists(s):
            if os.path.exists(proxy_path(s)): proxy_state[s] = 'ok'
            elif s not in proxy_state: proxy_state[s] = 'đang tạo'; proxy_q.put(s)


def ranged(path, request, mime):
    size = os.path.getsize(path); rng = request.headers.get('range'); start, end = 0, size - 1
    if rng:
        a, _, b = rng.replace('bytes=', '').partition('-'); start = int(a or 0); end = int(b) if b else size - 1
    end = min(end, size - 1); n = end - start + 1

    def gen():
        with open(path, 'rb') as f:
            f.seek(start); left = n
            while left > 0:
                d = f.read(min(1 << 20, left))
                if not d: break
                left -= len(d); yield d
    h = {'Accept-Ranges': 'bytes', 'Content-Length': str(n), 'Cache-Control': 'no-cache'}
    if rng: h['Content-Range'] = f'bytes {start}-{end}/{size}'
    return StreamingResponse(gen(), status_code=206 if rng else 200, media_type=mime, headers=h)


# ---------- dự án ----------
def load():
    p = vfp.load(ppath()); ensure_proxies(p); return p


def view(p):
    base = pdir(); ev = subs.events(p, 'sentence')
    clips = [{k: c.get(k) for k in ('idx', 'src', 'in', 'dur', 'speed', 'size', 'label', 'start', 'tdur', 'zoom', 'inset')} for c in p['timeline']]
    for c in clips:
        c['name'] = os.path.basename(c['src']); c['proxy'] = proxy_state.get(c['src'], '?')
        sh = media.shake_cached(c['src']) if os.path.exists(c['src']) else None
        c['shake'] = None if (sh is None or any(x in c['src'] for x in p['rules'].get('shake_exempt', []))) else round(media.shake_at(c['src'], c['in'], c['dur']), 2)
    raw = [c for c in p['clips']]
    return {'name': p.get('name'), 'rev': os.path.getmtime(ppath()), 'duration': p['duration'], 'canvas': p['canvas'], 'clips': clips, 'raw_clips': raw,
            'events': ev, 'voiceover': p.get('voiceover', []), 'music': p.get('music'), 'sections': [{k: s.get(k) for k in ('id', 'title', 'start', 'end')} for s in p['sections']],
            'proxies': {'ok': sum(1 for c in {c['src'] for c in p['timeline']} if proxy_state.get(c) == 'ok'), 'total': len({c['src'] for c in p['timeline']})},
            'errors': vfp.check(p) if p['timeline'] else []}


@app.get('/api/projects')
def projects(): return {'active': state['name'], 'list': sorted(d for d in os.listdir(PROJECTS) if os.path.exists(ppath(d)))}


@app.post('/api/open')
async def open_project(req: Request):
    n = (await req.json())['name']
    if not os.path.exists(ppath(n)): raise HTTPException(404)
    state['name'] = n; return {'ok': True}


@app.get('/api/project')
def get_project(): return view(load())


@app.get('/api/rev')
def rev(): return {'rev': os.path.getmtime(ppath()), 'proxies': sum(1 for v in proxy_state.values() if v == 'ok'), 'busy': state['chat_proc'] is not None}


@app.post('/api/project')
async def save_project(req: Request):
    """UI gửi lại danh sách clip (kéo thả/sửa) -> lưu, có lịch sử để hoàn tác."""
    body = await req.json(); snapshot('ui')
    p = json.load(open(ppath(), encoding='utf-8'))
    for k in ('clips', 'sections', 'voiceover', 'music', 'subs', 'rules'):
        if k in body: p[k] = body[k]
    json.dump(p, open(ppath(), 'w', encoding='utf-8'), ensure_ascii=False, indent=1); return view(load())


@app.post('/api/undo')
def undo():
    h = hist_dir(); files = sorted(f for f in os.listdir(h) if f.endswith('.json')); cur = open(ppath(), 'rb').read()
    while files and open(os.path.join(h, files[-1]), 'rb').read() == cur: os.remove(os.path.join(h, files.pop()))
    if not files: return {'ok': False}
    last = os.path.join(h, files[-1]); open(ppath(), 'wb').write(open(last, 'rb').read()); os.remove(last); return {'ok': True}


@app.get('/api/proxy')
def proxy(request: Request, src: str):
    p = vfp.load(ppath())
    if src not in {c['src'] for c in p['timeline']}: raise HTTPException(403)
    out = proxy_path(src)
    if not os.path.exists(out): raise HTTPException(425)
    return ranged(out, request, 'video/mp4')


@app.get('/api/file')
def file(request: Request, rel: str):
    f = os.path.realpath(os.path.join(pdir(), rel))
    if not f.startswith(os.path.realpath(pdir())) or not os.path.isfile(f): raise HTTPException(404)
    return ranged(f, request, 'video/mp4' if f.endswith('.mp4') else 'audio/wav' if f.endswith('.wav') else 'audio/mpeg' if f.endswith('.mp3') else 'application/octet-stream')


# ---------- dựng / xuất ----------
def run_job(title, args, out=None):
    jid = str(int(time.time() * 1000)); jobs[jid] = {'id': jid, 'title': title, 'status': 'đang chạy', 'log': '', 'out': out}

    def work():
        pr = subprocess.run([sys.executable, '-X', 'utf8', '-m', 'vf', *args], cwd=ROOT, env=ENV, capture_output=True, text=True, encoding='utf-8')
        jobs[jid]['log'] = (pr.stdout + pr.stderr)[-1500:]; jobs[jid]['status'] = 'xong' if pr.returncode == 0 else 'lỗi'
    threading.Thread(target=work, daemon=True).start(); return jid


@app.post('/api/render')
async def render(req: Request):
    b = await req.json(); vertical = bool(b.get('vertical')); word = b.get('sub_mode', 'word')
    out = os.path.join(pdir(), 'out', f"{state['name']}_{'doc_9x16' if vertical else 'ngang'}_{time.strftime('%H%M%S')}.mp4"); os.makedirs(os.path.dirname(out), exist_ok=True)
    args = ['render', ppath(), out, '--sub-mode', word] + (['--vertical'] if vertical else [])
    return {'job': run_job('Dựng ' + ('bản dọc 9:16' if vertical else 'bản ngang'), args, out)}


@app.post('/api/capcut')
async def capcut(req: Request):
    b = await req.json(); name = b.get('name') or f"{state['name']} - vf"
    return {'job': run_job('Xuất CapCut: ' + name, ['capcut', ppath(), name, '--audio', b.get('audio', 'none')])}


@app.get('/api/jobs')
def get_jobs(): return list(jobs.values())[-8:]


# ---------- chat với Claude ----------
SYSTEM = ("Bạn là trợ lý dựng video trong app dựng video này. Người dùng ra lệnh bằng tiếng Việt; bạn sửa file dự án JSON và chạy bộ lệnh `python -X utf8 -m vf` "
          "(xem CLAUDE.md ở thư mục gốc). Dự án đang mở: {proj}. Trả lời ngắn gọn bằng tiếng Việt, nói rõ đã đổi gì. Sau khi sửa luôn chạy `python -X utf8 -m vf check` "
          "và sửa lỗi nếu có. Không xóa file của người dùng, không ghi ra ngoài thư mục dự án.")


def chat_path(): return os.path.join(pdir(), '.chat.json')


def chat_load():
    return json.load(open(chat_path(), encoding='utf-8')) if os.path.exists(chat_path()) else {'session': None, 'messages': []}


@app.get('/api/chat')
def chat_get(): return chat_load()


@app.post('/api/chat/stop')
def chat_stop():
    pr = state['chat_proc']
    if pr: pr.kill()
    return {'ok': True}


@app.post('/api/chat')
async def chat(req: Request):
    if state['chat_proc'] is not None: raise HTTPException(409, 'Claude đang làm việc, đợi xong hoặc bấm Dừng')
    text = (await req.json())['text']; hist = chat_load(); snapshot('truoc-chat')
    cmd = [CLAUDE, '-p', '--output-format', 'stream-json', '--verbose', '--allowedTools', ALLOWED, '--permission-mode', 'acceptEdits',
           '--append-system-prompt', SYSTEM.format(proj=os.path.relpath(ppath(), ROOT))]
    if hist['session']: cmd += ['--resume', hist['session']]
    loop = asyncio.get_running_loop(); q: asyncio.Queue = asyncio.Queue()
    hist['messages'].append({'role': 'user', 'text': text})

    def work():
        try:
            pr = subprocess.Popen(cmd, cwd=ROOT, env=ENV, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, encoding='utf-8')
            state['chat_proc'] = pr; pr.stdin.write(text); pr.stdin.close()
            for line in pr.stdout: loop.call_soon_threadsafe(q.put_nowait, line)
            pr.wait()
        except Exception as e:
            loop.call_soon_threadsafe(q.put_nowait, json.dumps({'type': 'app_error', 'error': str(e)}))
        finally:
            state['chat_proc'] = None; loop.call_soon_threadsafe(q.put_nowait, None)
    threading.Thread(target=work, daemon=True).start()

    async def stream():
        asst = ''
        while True:
            line = await q.get()
            if line is None: break
            try: j = json.loads(line)
            except Exception: continue
            out = None; t = j.get('type')
            if t == 'system' and j.get('session_id'): hist['session'] = j['session_id']
            elif t == 'assistant':
                for it in j['message'].get('content', []):
                    if it['type'] == 'text' and it['text'].strip():
                        out = {'type': 'text', 'text': it['text']}; asst += it['text'] + '\n'
                        yield 'data: ' + json.dumps(out, ensure_ascii=False) + '\n\n'
                    elif it['type'] == 'tool_use':
                        inp = it['input']; s = inp.get('command') or inp.get('file_path') or json.dumps(inp, ensure_ascii=False)
                        yield 'data: ' + json.dumps({'type': 'tool', 'name': it['name'], 'summary': str(s)[:160]}, ensure_ascii=False) + '\n\n'
                continue
            elif t == 'user': out = {'type': 'refresh'}
            elif t == 'result':
                hist['session'] = j.get('session_id') or hist['session']
                out = {'type': 'done', 'error': bool(j.get('is_error'))}
                if j.get('is_error'): asst += '\n[lỗi] ' + str(j.get('result', ''))
            elif t == 'app_error': out = {'type': 'error', 'error': j['error']}
            if out: yield 'data: ' + json.dumps(out, ensure_ascii=False) + '\n\n'
        if asst.strip(): hist['messages'].append({'role': 'assistant', 'text': asst.strip()})
        json.dump(hist, open(chat_path(), 'w', encoding='utf-8'), ensure_ascii=False)
        yield 'data: ' + json.dumps({'type': 'end'}) + '\n\n'
    return StreamingResponse(stream(), media_type='text/event-stream', headers={'Cache-Control': 'no-cache', 'X-Accel-Buffering': 'no'})


@app.post('/api/chat/clear')
def chat_clear():
    if os.path.exists(chat_path()): os.remove(chat_path())
    return {'ok': True}


app.mount('/', StaticFiles(directory=STATIC, html=True), name='static')

if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host='127.0.0.1', port=5180, log_level='warning')
