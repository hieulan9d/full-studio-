# -*- coding: utf-8 -*-
"""Dung video tu van hiem muon tu clip nguoi dung tu tao tren Flow. Script nay KHONG tao gi tren Flow.
  python -X utf8 -B hiem_muon.py <du_an> kiem                 soat kich ban truoc khi dua nguoi dung duyet
  python -X utf8 -B hiem_muon.py <du_an> prompt               viet tao-tay/prompts.html + prompts.md cho video chua dung
  python -X utf8 -B hiem_muon.py <du_an> nhap [N] [project]   tai N video moi nhat trong project Flow dang mo, xep theo loi, dung video du clip
  python -X utf8 -B hiem_muon.py <du_an> dung [id...]         dung tu <du_an>/<id>/clip1..N.mp4 co san
<du_an> chua kich_ban.py: VIDEOS = {"01": {"ten", "hook": [3 dong], "clips": [(loi, canh_dau, canh_sau), ...]}}"""
import difflib, glob, html, importlib.util, json, os, re, shutil, subprocess, sys, tempfile
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.abspath(os.path.dirname(__file__) + "/../../../..").replace("\\", "/")
KIT = ROOT + "/phong-cach/tu-van-hiem-muon"
SFXDIR = ROOT + "/phong-cach/saas-animation/audio/sfx"
W, H, FPS, SPEED, SR = 1080, 1920, 24, 1.1, 48000
FONT = "C:/Windows/Fonts/seguibli.ttf"
D, VIDEOS = "", {}
PROMPT = (
    'The presenter from the reference image sits at the white desk, same face, hair, dark green blazer and jewelry. '
    'Replace the plain white backdrop with an animated medical advertising background in warm coral pink and gold tones, with '
    'drifting light particles and soft bokeh. Large moving 3D illustrations appear behind the presenter, clearly visible in the '
    'upper area on both sides of the head: during the first half %s; in the second half the background smoothly crossfades to %s. '
    'The illustrations keep moving the whole time. Vertical 9:16, locked static camera, waist-up framing, the presenter stays in '
    'front, sharp and naturally lit by the warm background. The presenter talks directly to the camera in Vietnamese with a natural '
    'Northern Vietnamese accent, a warm, calm, medium-pitched voice, brisk and clear, small natural hand gestures, lips matching '
    'the speech. The speech starts immediately, each word is said once, then silence. Spoken line: "%s" '
    'No on-screen text, no captions, no letters, no numbers, no logo, no watermark, no music.')

_model = None


def model():
    global _model
    if _model is None:
        from faster_whisper import WhisperModel
        _model = WhisperModel("large-v3-turbo", device="cpu", compute_type="int8", local_files_only=True)
    return _model


def run(cmd, **kw):
    return subprocess.run(cmd, capture_output=True, check=True, **kw).stdout


def audio(path, sr=16000, ch=1):
    raw = run(["ffmpeg", "-v", "error", "-i", path, "-ac", str(ch), "-ar", str(sr), "-f", "f32le", "-"])
    return np.frombuffer(raw, np.float32).reshape(-1, ch).copy()


def duration(path):
    return float(run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=duration", "-of", "csv=p=0", path]))


# ---------------------------------------------------------------- khop loi
UNITS = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"]


def num_words(n):
    if n < 10:
        return [UNITS[n]]
    if n < 100:
        t, u = divmod(n, 10)
        head = ["mười"] if t == 1 else [UNITS[t], "mươi"]
        return head + ([] if u == 0 else [UNITS[u]])
    return [str(n)]


SAME = {"dụng": "rụng", "chứng": "trứng", "xảy": "sảy", "tư": "bốn", "lăm": "năm", "mốt": "một", "nhăm": "năm",
        "hàng": "hằng", "da": "ra", "dối": "rối", "dầu": "giàu", "sẩy": "sảy", "kì": "kỳ"}


def norm(w):
    w = re.sub(r"[^\w]", "", w.lower())
    return SAME.get(w, w)


def heard_tokens(path):
    a = audio(path)[:, 0]
    segs = model().transcribe(a, language="vi", beam_size=5, word_timestamps=True, vad_filter=True,
                              condition_on_previous_text=False)[0]
    out = []
    for s in segs:
        for w in s.words:
            m = re.match(r"^\D*(\d+)(mm)?\D*$", w.word.strip())
            if m:
                parts = num_words(int(m.group(1))) + (["mi", "li", "mét"] if m.group(2) else [])
                step = (w.end - w.start) / len(parts)
                out += [(norm(p), w.start + step * i, w.start + step * (i + 1)) for i, p in enumerate(parts)]
            else:
                for p in re.split(r"[-/]", w.word.strip()):
                    if norm(p):
                        out.append((norm(p), w.start, w.end))
    return out


def align(line, path):
    """Tra (tu kich ban, moc tung tu, ti le khop, chuoi tu thieu dai nhat, tu thieu)."""
    script = line.split()
    heard = heard_tokens(path)
    sm = difflib.SequenceMatcher(a=[norm(w) for w in script], b=[h[0] for h in heard], autojunk=False)
    times = [None] * len(script)
    for a, b, n in sm.get_matching_blocks():
        for k in range(n):
            times[a + k] = (heard[b + k][1], heard[b + k][2])
    ok = sum(t is not None for t in times)
    run_len = best = 0
    for t in times:
        run_len = run_len + 1 if t is None else 0
        best = max(best, run_len)
    missing = [w for w, t in zip(script, times) if t is None]
    end = duration(path)
    i = 0
    while i < len(script):
        if times[i] is None:
            j = i
            while j < len(script) and times[j] is None:
                j += 1
            t0 = times[i - 1][1] if i else 0.0
            t1 = times[j][0] if j < len(script) else min(end, t0 + 0.28 * (j - i))
            t1 = min(t1, t0 + 0.45 * (j - i))
            step = max(0.0, t1 - t0) / (j - i)
            for k in range(i, j):
                times[k] = (t0 + step * (k - i), t0 + step * (k - i + 1))
            i = j
        else:
            i += 1
    return script, times, ok / len(script), best, missing


# ---------------------------------------------------------------- dung
def segments(rec, path, last):
    """Giu cac doan co loi kich ban (bo nghi, doc lap, loi che them)."""
    end = duration(path)
    t = rec["times"]
    segs = [[max(0.0, t[0][0] - 0.05), t[0][1]]]
    for a, b in t[1:]:
        if a - segs[-1][1] <= 0.22:
            segs[-1][1] = max(segs[-1][1], b)
        else:
            segs.append([a - 0.06, b])
    for k, s in enumerate(segs):
        s[1] = s[1] + (0.14 if k == len(segs) - 1 else 0.08)
    if last:
        segs[-1][1] += 0.8                       # chua mot nhip cuoi video de thay minh hoa
    out = []
    for a, b in segs:
        a, b = int(max(0.0, a) * FPS) / FPS, int(min(end, b) * FPS + 0.999) / FPS
        b = min(b, int(end * FPS) / FPS)
        if out and a <= out[-1][1]:
            out[-1][1] = max(out[-1][1], b)
        elif b - a >= 3 / FPS:
            out.append([a, b])
    return out


def phrases(words):
    groups, cur = [], []
    for i, w in enumerate(words):
        cur.append(i)
        text = " ".join(words[k] for k in cur)
        nxt = words[i + 1] if i + 1 < len(words) else ""
        if w[-1] in ".,?!:;" or len(cur) >= 4 or len(text) + len(nxt) >= 21:
            groups.append(cur)
            cur = []
    if cur:
        groups.append(cur)
    return groups


def fit_font(lines, size, width):
    while size > 30:
        f = ImageFont.truetype(FONT, size)
        if max(ImageDraw.Draw(Image.new("L", (1, 1))).textlength(t, font=f) for t in lines) <= width:
            return f
        size -= 2
    return ImageFont.truetype(FONT, size)


def hook_card(lines):
    font = fit_font(lines, 66, 900)
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    cw, lh = int(max(d.textlength(t, font=font) for t in lines)) + 90, 84
    ch = lh * len(lines) + 56
    x, y = (W - cw) // 2, 1330 - ch // 2
    d.rounded_rectangle([x + 4, y + 8, x + cw + 4, y + ch + 8], 56, fill=(0, 0, 0, 60))
    d.rounded_rectangle([x, y, x + cw, y + ch], 56, fill=(255, 255, 255, 255))
    for k, t in enumerate(lines):
        d.text((W / 2, y + 28 + lh * k + lh / 2), t, font=font, fill=(213, 9, 33, 255), anchor="mm")
    return np.array(im)


def caption(words, on):
    text = " ".join(words)
    font = fit_font([text], 66, W - 90)
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    x = (W - d.textlength(text, font=font)) / 2
    for k, w in enumerate(words):
        d.text((x, 1400), w, font=font, fill=(89, 255, 65, 255) if k == on else (255, 255, 255, 255),
               anchor="lm", stroke_width=7, stroke_fill=(0, 0, 0, 255))
        x += d.textlength(w + " ", font=font)
    return np.array(im)


def over(frame, rgba):
    ys = np.where(rgba[..., 3].any(axis=1))[0]
    y0, y1 = ys[0], ys[-1] + 1
    a = rgba[y0:y1, :, 3:4].astype(np.float32) / 255
    frame[y0:y1] = (frame[y0:y1] * (1 - a) + rgba[y0:y1, :, :3] * a + 0.5).astype(np.uint8)


def bg_change(path, segs):
    """Moc (giay nguon) ma hinh nen phia tren doi manh nhat, hoac None."""
    raw = run(["ffmpeg", "-v", "error", "-i", path, "-vf", "fps=4,scale=90:160", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"])
    f = np.frombuffer(raw, np.uint8).reshape(-1, 160, 90, 3).astype(np.float32)
    top = f[:, :45]
    d = [float(np.abs(top[i + 3] - top[i - 3]).mean()) if 3 <= i < len(f) - 3 else 0 for i in range(len(f))]
    inside = [i for i in range(len(f)) if any(a + 0.8 <= i / 4 <= b - 0.5 for a, b in segs)]
    if not inside:
        return None
    i = max(inside, key=lambda k: d[k])
    return i / 4 if d[i] > 9 else None


def build(vid, hook, recs, folder, out):
    clips = [f"{folder}/clip{i}.mp4" for i in range(1, len(recs) + 1)]
    inputs, parts, tags, plan, offset = [], [], [], [], 0.0
    words_all, whooshes, starts = [], [], []
    for c, (path, rec) in enumerate(zip(clips, recs)):
        segs = segments(rec, path, c == len(clips) - 1)
        z = 1.08 if c % 2 else 1.0
        w, h = int(round(W * z / 2)) * 2, int(round(H * z / 2)) * 2
        inputs += ["-i", path]
        starts.append(offset / SPEED)

        def moved(t, base=offset, segs=segs):
            acc = 0.0
            for a, b in segs:
                if t < b:
                    return (base + acc + max(0.0, t - a)) / SPEED
                acc += b - a
            return (base + acc) / SPEED

        change = bg_change(path, segs)
        if change is not None:
            whooshes.append(moved(change))
        words_all.append((rec["words"], [(moved(a), moved(b)) for a, b in rec["times"]]))
        for j, (a, b) in enumerate(segs):
            d = b - a
            offset += d
            parts.append(f"[{c}:v]trim={a}:{b},setpts=PTS-STARTPTS,fps={FPS},scale={w}:{h}:flags=lanczos,"
                         f"crop={W}:{H}:(iw-{W})/2:(ih-{H})*0.3,setsar=1[v{c}_{j}]")
            parts.append(f"[{c}:a]loudnorm=I=-14:TP=-1.5:LRA=11,aresample={SR},apad,atrim={a}:{b},asetpts=PTS-STARTPTS,"
                         f"afade=t=in:d=0.012,afade=t=out:st={d - 0.012:.3f}:d=0.012[a{c}_{j}]")
            tags.append(f"[v{c}_{j}][a{c}_{j}]")
    total = offset / SPEED
    # moi doan can mot nhanh am thanh rieng cua cung mot dau vao
    chain = []
    count = {}
    for p in parts:
        m = re.match(r"\[(\d):a\]", p)
        if m:
            count[int(m.group(1))] = count.get(int(m.group(1)), 0) + 1
    seen = {}
    for c, n in count.items():
        chain.append(f"[{c}:a]loudnorm=I=-14:TP=-1.5:LRA=11,aresample={SR},apad=pad_dur=2,asplit={n}" +
                     "".join(f"[s{c}_{k}]" for k in range(n)))
    for p in parts:
        m = re.match(r"\[(\d):a\]loudnorm[^,]*,aresample=\d+,apad,", p)
        if m:
            c = int(m.group(1))
            k = seen.get(c, 0)
            seen[c] = k + 1
            p = f"[s{c}_{k}]" + p[m.end():]
        chain.append(p)
    chain.append("".join(tags) + f"concat=n={len(tags)}:v=1:a=1[vc][ac]")
    chain.append(f"[vc]setpts=PTS/{SPEED},fps={FPS}[v];[ac]atempo={SPEED},aresample={SR},apad[a]")
    tmp = f"{folder}/noi.mp4"
    run(["ffmpeg", "-v", "error", "-y", *inputs, "-filter_complex", ";".join(chain), "-map", "[v]", "-map", "[a]",
         "-c:v", "libx264", "-crf", "16", "-pix_fmt", "yuv420p", "-c:a", "pcm_s16le", "-f", "mov", "-t", f"{total:.3f}", tmp])

    # chu
    caps = []
    hook_end = None
    for c, (words, times) in enumerate(words_all):
        if c == 0:
            first_stop = next((i for i, w in enumerate(words) if w[-1] in ".?!"), len(words) - 1)
            hook_end = min(max(times[first_stop][1], 2.2), 4.0)
        for g in phrases(words):
            caps.append(([words[k] for k in g], [times[k][0] for k in g], times[g[-1]][1]))
    for k in range(len(caps) - 1):
        if caps[k + 1][1][0] - caps[k][2] < 0.5:
            caps[k] = (caps[k][0], caps[k][1], caps[k + 1][1][0])
    card, cache = hook_card(hook), {}

    # sfx
    events = [(0.05, "pop_b", -9, False), (hook_end, "pop_a", -10, False)]
    for k, s in enumerate(starts[1:]):
        events.append((s, "whoosh_b" if k % 2 else "whoosh_a", -15, True))
        events.append((s + 0.08, "pop_c" if k % 2 else "pop_a", -11, False))
    events += [(t, "whoosh_a", -17, True) for t in whooshes if min(abs(t - s) for s in starts) > 1.0]
    events.append((max(0.0, total - 1.1), "sparkle_a", -14, False))
    mix = audio(tmp, SR, 2)
    for t, name, db, at_peak in events:
        s = audio(f"{SFXDIR}/{name}.wav", SR, 2)
        s *= 10 ** ((-3 + db) / 20) / float(np.abs(s).max())
        lead = int(np.argmax(np.abs(s).max(axis=1))) if at_peak else 0
        i = max(0, int(t * SR) - lead)
        n = min(len(s), len(mix) - i)
        if n > 0:
            mix[i:i + n] += s[:n]
    mix = np.clip(mix * 1.1, -0.94, 0.94)[: int(total * SR)]          # bu ~0,8 dB ve -14 LUFS
    wav = f"{folder}/mix.f32"
    mix.astype(np.float32).tofile(wav)

    dec = subprocess.Popen(["ffmpeg", "-v", "error", "-i", tmp, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], stdout=subprocess.PIPE)
    enc = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                            "-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", wav, "-map", "0:v", "-map", "1:a", "-c:v", "libx264",
                            "-crf", "18", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", out],
                           stdin=subprocess.PIPE)
    f = 0
    while True:
        buf = dec.stdout.read(W * H * 3)
        if len(buf) < W * H * 3:
            break
        frame = np.frombuffer(buf, np.uint8).reshape(H, W, 3).copy()
        t = f / FPS
        if t < hook_end:
            over(frame, card)
        else:
            for words, st, end in caps:
                if st[0] <= t < end:
                    on = max(k for k in range(len(st)) if st[k] <= t)
                    key = (" ".join(words), on)
                    if key not in cache:
                        cache[key] = caption(words, on)
                    over(frame, cache[key])
                    break
        enc.stdin.write(frame.tobytes())
        f += 1
    enc.stdin.close()
    enc.wait()
    dec.wait()
    os.remove(tmp)
    os.remove(wav)
    return total


def check(vid, recs, out, total):
    """Nghe lai video thanh pham va ghi bao cao + anh xem nhanh."""
    full = " ".join(w for r in recs for w in r["words"])
    _, _, cov, gap, missing = align(full, out)
    run(["ffmpeg", "-v", "error", "-y", "-i", out, "-vf", f"fps=12/{total:.2f},scale=180:-2,tile=12x1", "-frames:v", "1",
         out[:-4] + ".jpg"])
    rep = {"giay": round(total, 1), "khop": round(cov, 3), "thieu_lien": gap, "thieu": missing,
           "clip_khop": [r["cov"] for r in recs]}
    json.dump(rep, open(f"{D}/{vid}/bao-cao.json", "w", encoding="utf-8"), ensure_ascii=False)
    return rep


def hand_clips(vid, lines):
    """Che do --tay: chi dung tep clip1..5.mp4 co san, khong bao gio goi Flow."""
    folder = f"{D}/{vid}"
    absent = [i for i in range(1, 6) if not os.path.exists(f"{folder}/clip{i}.mp4")]
    if absent:
        print(vid, "chua du clip, thieu:", " ".join(f"clip{i}.mp4" for i in absent), flush=True)
        return None
    recs = []
    for i, (line, _, _) in enumerate(lines, 1):
        info = f"{folder}/clip{i}.align.json"
        if os.path.exists(info) and os.path.getmtime(info) >= os.path.getmtime(f"{folder}/clip{i}.mp4"):
            rec = json.load(open(info, encoding="utf-8"))
        else:
            script, times, cov, gap, missing = align(line, f"{folder}/clip{i}.mp4")
            rec = {"words": script, "times": times, "cov": round(cov, 3), "gap": gap, "missing": missing}
            json.dump(rec, open(info, "w", encoding="utf-8"), ensure_ascii=False)
        print(f"  {vid} clip{i} khop {rec['cov']:.0%}" + (f", thieu: {' '.join(rec['missing'])}" if rec["missing"] else ""), flush=True)
        recs.append(rec)
    return recs


def load(project):
    global D, VIDEOS
    D = os.path.abspath(project).replace("\\", "/")
    spec = importlib.util.spec_from_file_location("kich_ban", D + "/kich_ban.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    VIDEOS = mod.VIDEOS


def done(vid):
    return bool(glob.glob(f"{D}/xong/{vid}.mp4") + glob.glob(f"{D}/xong/{vid} - *.mp4"))


def seconds(line):
    return 10 if len(line.split()) <= 29 else 12


def lint():
    """Loi da gap that khi lam video 01-16."""
    warns, scenes = [], {}
    for vid, v in VIDEOS.items():
        for t in v["hook"]:
            if len(t) > 20:
                warns.append(f"{vid} hook dai {len(t)} ky tu (chu bi thu nho): {t}")
        for i, (line, a, b) in enumerate(v["clips"], 1):
            n, tag = len(line.split()), f"{vid} clip{i}"
            if not (22 <= n <= 29 or 33 <= n <= 40):
                warns.append(f"{tag} {n} am tiet: nen 22-29 (clip 10 s) hoac 33-40 (12 s); thieu thi Flow che loi")
            if re.search(r"(^|[.?!]\s+)Không\b", line):
                warns.append(f"{tag} co cau mo bang 'Khong' (tung bi doc nguoc nghia)")
            if re.search(r"\d", line):
                warns.append(f"{tag} con chu so trong loi thoai: viet bang chu")
            for s in (a, b):
                if "calendar" in s and "blank" not in s:
                    warns.append(f"{tag} lich chua ghi 'blank calendar pages' (AI ve so sai)")
                if "friendly" in s:
                    warns.append(f"{tag} 'friendly' lam noi tang co mat hoat hinh")
                scenes.setdefault(s, set()).add(vid)
    warns += [f"canh lap o {len(v)} video, nen doi hinh: {s}" for s, v in scenes.items() if len(v) >= 4]
    print("\n".join(warns) or "khong thay loi")
    print(len(warns), "canh bao")


def write_prompts():
    os.makedirs(D + "/tao-tay", exist_ok=True)
    md = ["# Prompt tu tao tren Flow", "", "Video · Omni 1.2 Flash · anh nguoi dan lam tham chieu · 9:16 · 720p · 1 ban.", ""]
    page = ['<!doctype html><meta charset="utf-8"><title>Prompt Flow</title><style>body{font:16px Segoe UI,sans-serif;max-width:760px;'
            'margin:24px auto}textarea{width:100%;height:70px}button{font-size:16px;padding:6px 16px}.done{background:#e8f6e8}</style>',
            "<h1>Prompt tu tao tren Flow</h1><p>" + md[2] + "</p>"]
    n = 0
    for vid, v in VIDEOS.items():
        if done(vid):
            continue
        md += [f"## Video {vid}: {v['ten']}", ""]
        page.append(f"<h2>Video {vid}: {html.escape(v['ten'])}</h2>")
        for i, (line, a, b) in enumerate(v["clips"], 1):
            if os.path.exists(f"{D}/{vid}/clip{i}.mp4"):
                continue
            text, sec = PROMPT % (a, b, line), seconds(line)
            md += [f"### {vid}/clip{i}.mp4 · {sec} giây", "", "```", text, "```", ""]
            page.append(f"<div><b>Clip {i} · {sec} giây</b> <button>Chép prompt</button><p>{html.escape(line)}</p>"
                        f"<textarea readonly>{html.escape(text)}</textarea></div>")
            n += 1
    page.append('<script>document.querySelectorAll("button").forEach(b=>b.onclick=async()=>{const c=b.parentNode,t=c.querySelector("textarea");'
                'try{await navigator.clipboard.writeText(t.value)}catch(e){t.select();document.execCommand("copy")}c.className="done"})</script>')
    open(D + "/tao-tay/prompts.md", "w", encoding="utf-8").write("\n".join(md))
    open(D + "/tao-tay/prompts.html", "w", encoding="utf-8").write("\n".join(page))
    print(n, "prompt ->", D + "/tao-tay/prompts.html")


def make(ids):
    os.makedirs(D + "/xong", exist_ok=True)
    for vid in ids or [v for v in VIDEOS if not done(v)]:
        if vid not in VIDEOS:
            print(vid, "khong co trong kich_ban.py")
            continue
        v, folder = VIDEOS[vid], f"{D}/{vid}"
        absent = [f"clip{i}" for i in range(1, len(v["clips"]) + 1) if not os.path.exists(f"{folder}/clip{i}.mp4")]
        if absent:
            print(vid, "con thieu:", " ".join(absent))
            continue
        if done(vid):
            print(vid, "da co")
            continue
        recs = []
        for i, (line, _, _) in enumerate(v["clips"], 1):
            clip, info = f"{folder}/clip{i}.mp4", f"{folder}/clip{i}.align.json"
            rec = json.load(open(info, encoding="utf-8")) if os.path.exists(info) else None
            if rec is None or rec["words"] != line.split() or os.path.getmtime(info) < os.path.getmtime(clip):
                words, times, cov, gap, missing = align(line, clip)
                rec = {"words": words, "times": times, "cov": round(cov, 3), "gap": gap, "missing": missing}
                json.dump(rec, open(info, "w", encoding="utf-8"), ensure_ascii=False)
            flag = "  <- NGHE LAI" if rec["cov"] < 0.9 or rec["gap"] >= 3 else ""
            print(f"  {vid} clip{i} khop {rec['cov']:.0%} {' '.join(rec['missing'])}{flag}", flush=True)
            recs.append(rec)
        name = re.sub(r'[\\/:*?"<>|]', "-", v["ten"])
        out = f"{D}/xong/{vid} - {name}.mp4"
        total = build(vid, v["hook"], recs, folder, out)
        print(vid, "XONG", json.dumps(check(vid, recs, out, total), ensure_ascii=False), flush=True)


def fetch(count, project):
    tmp = tempfile.mkdtemp(prefix="flow-nhap-").replace("\\", "/")
    subprocess.run(["node", KIT + "/tools/flow-tai.js", tmp, count, project], check=True)
    want = [(v, i, c[0]) for v, d in VIDEOS.items() if not done(v)
            for i, c in enumerate(d["clips"], 1) if not os.path.exists(f"{D}/{v}/clip{i}.mp4")]
    touched = set()
    for p in sorted(glob.glob(tmp + "/v*.mp4"), key=lambda x: int(os.path.basename(x)[1:-4])):
        heard = [t[0] for t in heard_tokens(p)]
        if not heard or not want:
            continue
        score = lambda w: difflib.SequenceMatcher(a=[norm(x) for x in w[2].split()], b=heard, autojunk=False).ratio()
        best = max(want, key=score)
        if score(best) < 0.75:
            print("khong khop cau nao:", " ".join(heard)[:120])
            continue
        v, i, _ = best
        os.makedirs(f"{D}/{v}", exist_ok=True)
        shutil.copy(p, f"{D}/{v}/clip{i}.mp4")
        want.remove(best)
        touched.add(v)
        print(f"nhan {v}/clip{i} (khop {score(best):.0%})", flush=True)
    shutil.rmtree(tmp, ignore_errors=True)
    if touched:
        make(sorted(touched))


if __name__ == "__main__":
    if len(sys.argv) < 3:
        raise SystemExit(__doc__)
    load(sys.argv[1])
    cmd, rest = sys.argv[2], sys.argv[3:]
    if cmd == "kiem":
        lint()
    elif cmd == "prompt":
        write_prompts()
    elif cmd == "dung":
        make(rest)
    elif cmd == "nhap":
        fetch(rest[0] if rest else "6", rest[1] if len(rest) > 1 else "")
    else:
        raise SystemExit(__doc__)
