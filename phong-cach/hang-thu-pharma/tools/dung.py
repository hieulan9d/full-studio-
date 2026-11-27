# -*- coding: utf-8 -*-
"""Dung video talking head kieu Hang Thu Pharma tu mot clip nguoi noi + moc tung tu + plan.json.

  python -X utf8 -B dung.py plan.json -o ra.mp4              dung ca video
  python -X utf8 -B dung.py plan.json --khung 1,4.5,12 -o x  chi xuat khung kiem tra x_<giay>.png

Moi duong dan trong plan.json tinh tu thu muc chua plan.json. Dinh dang plan: xem ../AGENTS.md.
Can: ffmpeg, Pillow, numpy; font Montserrat va Be Vietnam Pro da cai."""
import argparse, json, math, os, subprocess, sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps

W, H, FPS = 1080, 1920, 30
HERE = os.path.dirname(os.path.abspath(__file__))
SFX_DIR = os.path.join(HERE, "..", "..", "saas-animation", "audio", "sfx")
FONT_DIRS = ["C:/Windows/Fonts", os.path.join(os.environ.get("LOCALAPPDATA", ""), "Microsoft/Windows/Fonts")]
NAVY, YELLOW, YELLOW2, WHITE, DARK = (14, 19, 27), (253, 227, 49), (252, 214, 20), (255, 255, 255), (22, 28, 48)
BASE = "."


def font(name, size):
    for d in FONT_DIRS:
        p = os.path.join(d, name + ".ttf")
        if os.path.exists(p):
            return ImageFont.truetype(p, int(size))
    sys.exit(f"Thieu font {name}.ttf")


BLACK, XBOLD, BOLD, XITAL = "Montserrat-Black", "BeVietnamPro-ExtraBold", "BeVietnamPro-Bold", "Montserrat-ExtraBoldItalic"


def rgb(v, default=WHITE):
    if not v:
        return default
    v = v.lstrip("#")
    return tuple(int(v[i:i + 2], 16) for i in (0, 2, 4))


def path(p):
    return p if os.path.isabs(p) else os.path.join(BASE, p)


def picture(p, size, radius=0):
    im = ImageOps.fit(Image.open(path(p)).convert("RGBA"), size, Image.LANCZOS, centering=(0.5, 0.2))
    if radius:
        m = Image.new("L", size, 0)
        ImageDraw.Draw(m).rounded_rectangle([0, 0, size[0] - 1, size[1] - 1], radius, fill=255)
        im.putalpha(m)
    return im


def fit(name, text, size, width):
    f = font(name, size)
    while f.getlength(text) > width and size > 18:
        size -= 2
        f = font(name, size)
    return f


def canvas():
    return Image.new("RGBA", (W, H), (0, 0, 0, 0))


def box(im, xy, radius, fill, outline=None, width=0, shadow=True):
    if shadow:
        s = canvas()
        ImageDraw.Draw(s).rounded_rectangle([xy[0], xy[1] + 8, xy[2], xy[3] + 8], radius, fill=(0, 0, 0, 80))
        im.alpha_composite(s.filter(ImageFilter.GaussianBlur(10)))
    ImageDraw.Draw(im).rounded_rectangle(xy, radius, fill=fill, outline=outline, width=width)


def text(im, xy, s, f, fill, anchor="mm", **kw):
    ImageDraw.Draw(im).text(xy, s, font=f, fill=fill, anchor=anchor, **kw)


def pill(im, cx, cy, s, size=26, bg=DARK, fg=YELLOW, outline=None):
    f = fit(XBOLD, s, size, 900)
    w = f.getlength(s) + 44
    box(im, [cx - w / 2, cy - size * .85, cx + w / 2, cy + size * .85], int(size * .85), bg, outline, 3 if outline else 0)
    text(im, (cx, cy), s, f, fg)


def gradient_box(im, xy, radius, c1, c2, border=None):
    w, h = xy[2] - xy[0], xy[3] - xy[1]
    t = np.linspace(0, 1, h)[:, None, None]
    g = (np.array(c1) * (1 - t) + np.array(c2) * t).astype(np.uint8)
    g = Image.fromarray(np.repeat(g, w, axis=1), "RGB").convert("RGBA")
    m = Image.new("L", (w, h), 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, w - 1, h - 1], radius, fill=255)
    g.putalpha(m)
    box(im, xy, radius, (0, 0, 0, 0))
    im.alpha_composite(g, (xy[0], xy[1]))
    if border:
        ImageDraw.Draw(im).rounded_rectangle(xy, radius, outline=border, width=5)


# ------------------------------------------------------------------ lop do hoa (tinh mot lan)
def g_hook(it, mau):
    im = canvas()
    lines = it["lines"]
    if mau == "ngan":            # the vang lon phia duoi: x 95..983, y 1158..1498
        gradient_box(im, [95, 1158, 983, 1498], 40, YELLOW, YELLOW2)
        size = min(fit(BLACK, s, 58, 800).size for s in lines)
        lh = int(size * 1.28)
        for k, s in enumerate(lines):
            text(im, (539, 1328 + (k - (len(lines) - 1) / 2) * lh), s, font(BLACK, size), (10, 10, 10))
    else:                        # the vang nho phia tren: x 189..891, y 267..464
        gradient_box(im, [150, 270, 930, 466], 26, YELLOW, YELLOW2, WHITE)
        pill(im, 540, 300, it.get("pill", "HẰNG THU PHARMA"), 22)
        for k, s in enumerate(lines[:2]):
            text(im, (540, 355 + k * 66), s, fit(XBOLD, s, 50, 740), DARK)
    return im


def g_cta(it):
    im = canvas()
    gradient_box(im, [86, 281, 994, 456], 24, YELLOW, YELLOW2, WHITE)
    pill(im, 540, 306, it["pill"], 22)
    text(im, (540, 362), it["lines"][0], fit(XBOLD, it["lines"][0], 44, 860), DARK)
    text(im, (540, 420), it["lines"][1], fit(XBOLD, it["lines"][1], 32, 860), (10, 10, 10))
    if it.get("disclaimer"):
        s = it["disclaimer"]
        text(im, (540, 1523), s, fit(BOLD, s, 24, 960), WHITE, stroke_width=3, stroke_fill=(0, 0, 0, 220))
    return im


def g_card(it):
    """The anh mau ngan: 383x392 o hai ben dau (x 22 hoac 675, y 351)."""
    im = canvas()
    left = it.get("side", "trai") == "trai"
    x, y, col = 22 if left else 675, 351, rgb(it.get("color"), (214, 40, 57))
    h = 392 if it.get("image") else 220
    box(im, [x, y, x + 383, y + h], 28, WHITE, col, 5)
    yy = y + 18
    if it.get("image"):
        im.alpha_composite(picture(it["image"], (359, 220), 20), (x + 12, y + 12))
        yy = y + 248
    f = fit(XBOLD, it["tag"], 24, 320)
    box(im, [x + 20, yy, x + 52 + f.getlength(it["tag"]), yy + 38], 19, col, shadow=False)
    text(im, (x + 36, yy + 19), it["tag"], f, WHITE, "lm")
    text(im, (x + 20, yy + 72), it["title"], fit(XBOLD, it["title"], 36, 345), DARK, "lm")
    if it.get("sub"):
        text(im, (x + 20, yy + 112), it["sub"], fit(BOLD, it["sub"], 25, 345), (90, 90, 100), "lm")
    return im


def g_icons(it):
    im = canvas()
    emoji = ImageFont.truetype("C:/Windows/Fonts/seguiemj.ttf", 76)
    col = rgb(it.get("color"), (20, 110, 80))
    for s, x in zip(it["icons"], (54, 870)):
        box(im, [x, 340, x + 150, 490], 34, col, (120, 255, 200), 3)
        ImageDraw.Draw(im).text((x + 75, 415), s, font=emoji, anchor="mm", embedded_color=True)
    return im


def g_steps(it):
    """Hang 3 the nho phia tren (mau dai)."""
    im = canvas()
    cols = [(214, 40, 57), (20, 140, 90), (200, 150, 20)]
    for k, c in enumerate(it["cards"][:3]):
        x, col = 100 + k * 305, rgb(c.get("color"), cols[k])
        box(im, [x, 300, x + 280, 520], 22, WHITE, col, 4)
        if c.get("image"):
            im.alpha_composite(picture(c["image"], (264, 150), 16), (x + 8, 308))
            text(im, (x + 140, 490), c["label"], fit(XBOLD, c["label"], 28, 255), col)
        else:
            text(im, (x + 140, 375), c["label"], fit(XBOLD, c["label"], 30, 255), col)
            text(im, (x + 140, 450), c.get("sub", ""), fit(BOLD, c.get("sub", "") or " ", 24, 255), DARK)
    return im


def g_pair(it):
    """Hai anh kieu polaroid dan bang keo + pill tieu de (mau dai)."""
    im = canvas()
    for k, c in enumerate(it["cards"][:2]):
        p = Image.new("RGBA", (330, 330), WHITE + (255,))
        p.alpha_composite(picture(c["image"], (298, 240)), (16, 16))
        text(p, (165, 294), c["label"], fit(XBOLD, c["label"], 28, 300), DARK)
        ImageDraw.Draw(p).rectangle([110, 0, 220, 26], fill=(235, 90, 80, 210) if k == 0 else (80, 190, 140, 210))
        r = p.rotate(5 if k == 0 else -5, expand=True, resample=Image.BICUBIC)
        im.alpha_composite(r, (60 if k == 0 else 1020 - r.width, 300))
    if it.get("pill"):
        pill(im, 540, 290, it["pill"], 30, YELLOW, DARK)
    return im


def g_bigtitle(it):
    im = canvas()
    if it.get("pill"):
        pill(im, 540, 345, it["pill"], 28, YELLOW, DARK)
    s = it["text"]
    f = fit(BLACK, s, 92, 960)
    d = ImageDraw.Draw(im)
    for i in range(34):
        x, y = 80 + i * 28, 415 + 22 * math.sin(i / 3.2)
        d.ellipse([x, y, x + 9, y + 9], fill=[(90, 220, 200), (250, 200, 60), (250, 110, 170)][i % 3])
    text(im, (540, 470), s, f, (255, 208, 60), stroke_width=4, stroke_fill=(70, 40, 0))
    return im


def g_title(it):
    """Tieu de 2 dong nghieng do + xanh, tren dau (mau ngan)."""
    im = canvas()
    colors = [rgb(c) for c in it.get("colors", ["#c8102e", "#1746c8"])]
    for k, s in enumerate(it["lines"][:2]):
        text(im, (500 if it.get("number") else 540, 220 + k * 76), s, fit(XITAL, s, 70, 860), colors[k], stroke_width=6,
             stroke_fill=WHITE)
    if it.get("number"):
        text(im, (955, 300), it["number"], font(BLACK, 120), (110, 190, 255), stroke_width=4, stroke_fill=WHITE)
    return im


def g_split_top(it):
    """Nua tren man chia doi: 1080x856."""
    im = Image.new("RGBA", (W, 856), NAVY + (255,))
    d = ImageDraw.Draw(im)
    for x in range(0, W, 54):
        d.line([x, 0, x, 856], fill=(30, 38, 52), width=1)
    for y in range(0, 856, 54):
        d.line([0, y, W, y], fill=(30, 38, 52), width=1)
    col = rgb(it.get("color"), (251, 123, 167))
    im.alpha_composite(picture(it["image"], (888, 502), 30), (95, 278))
    ImageDraw.Draw(im).rounded_rectangle([95, 278, 983, 780], 30, outline=col, width=5)
    c = canvas()
    pill(c, 540, 313, it["tag"], 28, DARK, WHITE, col)
    if it.get("caption"):
        s = it["caption"]
        text(c, (540, 743), s, fit(XBOLD, s, 30, 820), WHITE, stroke_width=4, stroke_fill=(0, 0, 0, 200))
    s = it.get("footer", "HẰNG THU • CHUYÊN GIA PHÂN TÍCH")
    box(c, [210, 796, 870, 856 - 6], 25, (255, 250, 240), col, 4, shadow=False)
    text(c, (540, 823), s, fit(XBOLD, s, 30, 620), DARK)
    im.alpha_composite(c.crop((0, 0, W, 856)))
    return im


def g_product(it):
    """Man san pham toan khung."""
    im = picture(it["image"], (W, H))
    shade = np.zeros((H, W, 4), np.uint8)
    shade[..., 3] = (np.clip((np.arange(H) - 900) / 700, 0, 1) * 200).astype(np.uint8)[:, None]
    im.alpha_composite(Image.fromarray(shade, "RGBA"))
    pill(im, 540, 316, it["pill"], 32, YELLOW, DARK, WHITE)
    col = rgb(it.get("color"), (251, 123, 167))
    box(im, [221, 905, 540, 1148], 24, DARK + (235,), col, 4)
    info = it["info"]
    pill(im, 380, 935, info["tag"], 20, (80, 80, 96), YELLOW)
    for k, s in enumerate(info["title"][:2]):
        text(im, (380, 995 + k * 40), s, fit(XBOLD, s, 30, 295), WHITE)
    text(im, (380, 1095), info.get("sub", ""), fit(BOLD, info.get("sub", "") or " ", 22, 295), (210, 215, 225))
    if it.get("pack"):
        pk = Image.open(path(it["pack"])).convert("RGBA")
        pk.thumbnail((300, 300), Image.LANCZOS)
        im.alpha_composite(pk, (590, 1180 - pk.height))
    return im


def g_navy():
    im = Image.new("RGBA", (W, H), (30, 36, 62, 255))
    d = ImageDraw.Draw(im)
    for r in (380, 480, 580):
        d.ellipse([540 - r, 720 - r, 540 + r, 720 + r], outline=(90, 140, 190, 200), width=2)
    d.rectangle([0, 1660, W, H], fill=(24, 28, 44, 255))
    return im


# ------------------------------------------------------------------ phu de
def load_words(p):
    d = json.load(open(path(p), encoding="utf-8"))
    if isinstance(d, dict):
        d = [w for s in d["segments"] for w in s["words"]] if "segments" in d else d["words"]
    return [(w[0], float(w[1]), float(w[2])) if isinstance(w, list) else (w["word"].strip(), float(w["start"]), float(w["end"]))
            for w in d]


def phrases(words, max_words, max_chars):
    out, cur = [], []
    for w in words:
        if cur and (len(cur) >= max_words or len(" ".join(x[0] for x in cur + [w])) > max_chars or w[1] - cur[-1][2] > 0.35):
            out.append(cur)
            cur = []
        cur.append(w)
        if w[0][-1:] in ".!?;,":
            out.append(cur)
            cur = []
    if cur:
        out.append(cur)
    return out


def norm(s):
    return "".join(c for c in s.lower() if c.isalnum())


def caption_layer(phrase, now, style, y, accent, keys):
    """style: ngan (mot dong vien, tu khoa to mau) | hop_toi | hop_trang | vien (hai dong, tu chua doc mo)."""
    im = canvas()
    f = font("Montserrat-ExtraBold" if style == "ngan" else BOLD, 44 if style == "ngan" else 54)
    two = style != "ngan" and style != "vien_mot"
    lines, line = [], []
    for i, w in enumerate(phrase):
        trial = " ".join(phrase[k][0] for k in line + [i])
        if line and (f.getlength(trial) > (560 if two else 980)):
            lines.append(line)
            line = []
        line.append(i)
    lines.append(line)
    lh = int(f.size * 1.22)
    widths = [f.getlength(" ".join(phrase[i][0] for i in ln)) for ln in lines]
    top = y - lh * len(lines) / 2
    boxed = style in ("hop_toi", "hop_trang")
    if boxed:
        bw = max(widths) + 60
        box(im, [540 - bw / 2, top - 14, 540 + bw / 2, top + lh * len(lines) + 12], 20,
            (26, 36, 58, 225) if style == "hop_toi" else (250, 247, 238, 240), (150, 170, 200), 2)
    base = DARK if style == "hop_trang" else WHITE
    current = max([i for i, w in enumerate(phrase) if w[1] <= now] or [0])
    for n, ln in enumerate(lines):
        x, cy = 540 - widths[n] / 2, top + lh * n + lh / 2
        for i in ln:
            word = phrase[i][0]
            key = norm(word) in keys
            if style == "ngan":
                fill = accent if key else base
            else:
                fill = accent if (i == current or key) else base
                if i > current:
                    fill = tuple(fill[:3]) + (115,)
            layer = canvas()
            text(layer, (x, cy), word, f, fill, "lm", stroke_width=0 if boxed else 5, stroke_fill=(15, 15, 20, 255 if i <= current or style == "ngan" else 90))
            im.alpha_composite(layer)
            x += f.getlength(word + " ")
    return im


# ------------------------------------------------------------------ dung
def ease_out(p):
    return 1 - (1 - min(max(p, 0.0), 1.0)) ** 3


def faded(layer, a, scale=1.0):
    if scale != 1.0:
        s = layer.resize((int(W * scale), int(H * scale)), Image.BILINEAR)
        out = canvas()
        bb = layer.getbbox() or (0, 0, W, H)
        cx, cy = (bb[0] + bb[2]) / 2, (bb[1] + bb[3]) / 2
        out.paste(s, (int(cx - cx * scale), int(cy - cy * scale)))
        layer = out
    if a < 1:
        layer = layer.copy()
        layer.putalpha(layer.getchannel("A").point(lambda v: int(v * a)))
    return layer


BUILDERS = {"hook": None, "cta": g_cta, "card": g_card, "icons": g_icons, "steps": g_steps, "pair": g_pair,
            "bigtitle": g_bigtitle, "title": g_title, "split": g_split_top, "product": g_product}
AUTO_SFX = {"hook": ("pop_b", -12), "card": ("pop_a", -14), "icons": ("pop_c", -16), "steps": ("pop_a", -14),
            "pair": ("pop_a", -14), "bigtitle": ("shimmer_a", -16), "title": ("swoosh_up_a", -14), "split": ("whoosh_a", -14),
            "product": ("whoosh_b", -14), "cta": ("sparkle_a", -15), "dark": ("whoosh_c", -16)}


class Video:
    def __init__(self, plan):
        self.p = plan
        self.mau = plan["mau"]
        self.items = plan["items"]
        bad = [i["type"] for i in self.items if i["type"] not in list(BUILDERS) + ["dark", "zoom"]]
        if bad:
            sys.exit(f"Loai khong ho tro: {bad}")
        if any(i["type"] == "dark" for i in self.items) and not plan.get("matte"):
            sys.exit('Muc "dark" (nen toi sau nguoi noi) can "matte": tao bang talking-head/tools/matte.py')
        self.layers = {k: (g_hook(i, self.mau) if i["type"] == "hook" else BUILDERS[i["type"]](i))
                       for k, i in enumerate(self.items) if i["type"] not in ("dark", "zoom")}
        self.navy = g_navy()
        cap = plan.get("caption", {})
        self.style = cap.get("style", "ngan" if self.mau == "ngan" else "hop_toi")
        self.y = cap.get("y", 1318 if self.mau == "ngan" else 1160)
        self.accent = rgb(cap.get("accent"), YELLOW)
        self.keys = {norm(w) for k in cap.get("keywords", []) for w in k.split()}
        self.groups = phrases(load_words(plan["words"]), *( (6, 30) if self.mau == "ngan" else (6, 28)))
        self.cache = {}

    def active(self, kind, t):
        return [(k, i) for k, i in enumerate(self.items) if i["type"] == kind and i["t"] <= t < i["end"]]

    def frame(self, src, matte, t):
        base = src.convert("RGBA")
        person = None
        if matte is not None:
            person = base.copy()
            person.putalpha(matte)
        for _, z in self.active("zoom", t):          # day vao cham: phong ca khung quanh mat
            s = z.get("from", 1.0) + (z.get("to", 1.08) - z.get("from", 1.0)) * (t - z["t"]) / max(z["end"] - z["t"], .01)
            crop = (540 - 540 / s, 760 - 760 / s, 540 + 540 / s, 760 + 1160 / s)
            base = base.resize((W, H), Image.BICUBIC, box=crop)
            if person is not None:
                person = person.resize((W, H), Image.BICUBIC, box=crop)
        for _, d in self.active("dark", t):
            a = min(1, (t - d["t"]) / 0.2)
            bg = Image.blend(base, self.navy, a)
            bg.alpha_composite(person)
            base = bg
        for _, ti in self.active("title", t):        # lam xam nen khi hien tieu de
            a = min(1, (t - ti["t"]) / 0.2, (ti["end"] - t) / 0.2)
            dim = Image.blend(base, Image.new("RGBA", (W, H), (40, 42, 48, 255)), 0.55 * a)
            if person is not None:
                dim.alpha_composite(person)
            base = dim
        split_p, cap_y, cap_style = 0.0, self.y, self.style
        for k, sp in self.active("split", t):
            split_p = min(ease_out((t - sp["t"]) / 0.4), ease_out((sp["end"] - t) / 0.33))
            shifted = Image.new("RGBA", (W, H), NAVY + (255,))
            shifted.paste(base, (0, int(360 * split_p)))
            shifted.paste(self.layers[k], (0, int(-856 * (1 - split_p))))
            base = shifted
            if split_p > 0.5:
                cap_y, cap_style = 1415, "vien_mot"
        product_a = 0.0
        for k, pr in self.active("product", t):
            product_a = max(0.0, min(1.0, (t - pr["t"]) / (5 / FPS), (pr["end"] - t) / (5 / FPS)))
            base = Image.blend(base, self.layers[k], product_a)
            if product_a > 0.5:
                cap_y, cap_style = 1345, "hop_toi" if self.mau == "dai" else "ngan"
        for k, i in enumerate(self.items):
            if i["type"] in ("zoom", "dark", "split", "product") or not i["t"] <= t < i["end"]:
                continue
            a = ease_out((t - i["t"]) * FPS / 5) if i["t"] > 0.05 else min(1.0, 0.2 + t * FPS / 5)
            out = min(1.0, (i["end"] - t) * FPS / 5)
            base.alpha_composite(faded(self.layers[k], a * out, 0.9 + 0.1 * a))
        hide_cap = self.mau == "ngan" and self.active("hook", t)
        if not hide_cap and not (self.mau == "dai" and self.active("hook", t) and t < 0.5):
            for n, g in enumerate(self.groups):
                start = g[0][1] - 0.05
                end = self.groups[n + 1][0][1] - 0.05 if n + 1 < len(self.groups) else g[-1][2] + 0.4
                end = min(end, g[-1][2] + 0.8)
                if start <= t < end:
                    cur = max([i for i, w in enumerate(g) if w[1] <= t] or [0])
                    key = (n, cur, cap_style, cap_y)
                    if key not in self.cache:
                        self.cache[key] = caption_layer(g, t, cap_style, cap_y, self.accent, self.keys)
                    base.alpha_composite(faded(self.cache[key], min(1.0, (t - start) * FPS / 4 + 0.25)))
                    break
        return base.convert("RGB")


def reader(p, pix, start=None):
    cmd = ["ffmpeg", "-v", "error"] + (["-ss", f"{start}"] if start is not None else []) + [
        "-i", p, "-vf", f"fps={FPS},scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H}", "-f", "rawvideo",
        "-pix_fmt", pix, "-"]
    return subprocess.Popen(cmd, stdout=subprocess.PIPE)


def read(proc, mode):
    n = W * H * (3 if mode == "RGB" else 1)
    buf = proc.stdout.read(n)
    return Image.frombytes(mode, (W, H), buf) if len(buf) == n else None


def duration(p):
    return float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", p]))


def mix_audio(v, video, dur, out):
    a = v.p.get("audio", {})
    events = list(a.get("sfx", []))
    if a.get("sfx_auto", True):
        for i in v.items:
            if i["type"] in AUTO_SFX:
                name, db = AUTO_SFX[i["type"]]
                events.append({"t": max(0.0, i["t"] - (0.1 if name.startswith("whoosh") else 0)), "name": name, "db": db})
            if i["type"] == "split":
                events.append({"t": max(0.0, i["end"] - 0.35), "name": "whoosh_c", "db": -16})
    target = a.get("lufs", -15 if v.mau == "ngan" else -14)
    cmd = ["ffmpeg", "-v", "error", "-y", "-i", video]
    chains = [f"[0:a]loudnorm=I={target}:TP=-1.5:LRA=11,aresample=48000[voice]"]
    labels, n = ["[voice]"], 1
    if a.get("bgm"):
        cmd += ["-stream_loop", "-1", "-i", path(a["bgm"])]
        chains.append(f"[{n}:a]loudnorm=I={target + a.get('bgm_db', -18)}:TP=-3,aresample=48000,atrim=0:{dur},"
                      f"afade=t=out:st={max(0, dur - 1):.2f}:d=1[bgm]")
        labels.append("[bgm]")
        n += 1
    for e in events:
        if e["t"] >= dur:
            continue
        cmd += ["-i", os.path.join(SFX_DIR, e["name"] + ".wav")]
        ms = int(e["t"] * 1000)
        chains.append(f"[{n}:a]aresample=48000,volume={e.get('db', -14)}dB,adelay={ms}|{ms}[s{n}]")
        labels.append(f"[s{n}]")
        n += 1
    chains.append("".join(labels) + f"amix=inputs={len(labels)}:duration=first:normalize=0,alimiter=limit=0.89:level=disabled[mix]")
    subprocess.run(cmd + ["-filter_complex", ";".join(chains), "-map", "[mix]", "-t", f"{dur:.3f}", out], check=True)
    return len(events)


def main():
    global BASE
    ap = argparse.ArgumentParser()
    ap.add_argument("plan")
    ap.add_argument("-o", "--out", required=True)
    ap.add_argument("--khung", help="danh sach giay, vd 1,4.5,12: chi xuat anh kiem tra")
    a = ap.parse_args()
    BASE = os.path.dirname(os.path.abspath(a.plan))
    plan = json.load(open(a.plan, encoding="utf-8"))
    v = Video(plan)
    video = path(plan["video"])
    matte = path(plan["matte"]) if plan.get("matte") else None
    if a.khung:
        for t in (float(x) for x in a.khung.split(",")):
            p = reader(video, "rgb24", t)
            m = reader(matte, "gray", t) if matte else None
            f = read(p, "RGB")
            if f is None:
                print("bo qua", t, "(ngoai video)")
                continue
            v.frame(f, read(m, "L") if m else None, t).save(f"{a.out}_{t:g}.png")
            p.kill()
            if m:
                m.kill()
            print(f"{a.out}_{t:g}.png")
        return
    dur = duration(video)
    wav = a.out + ".mix.wav"
    nsfx = mix_audio(v, video, dur, wav)
    dec = reader(video, "rgb24")
    mat = reader(matte, "gray") if matte else None
    enc = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r",
                            str(FPS), "-i", "-", "-i", wav, "-map", "0:v", "-map", "1:a", "-c:v", "libx264", "-crf", "18",
                            "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", "-shortest", a.out],
                           stdin=subprocess.PIPE)
    n = 0
    while True:
        f = read(dec, "RGB")
        if f is None:
            break
        m = read(mat, "L") if mat else None
        if mat and m is None:
            sys.exit("Matte ngan hon video")
        enc.stdin.write(v.frame(f, m, n / FPS).tobytes())
        n += 1
    enc.stdin.close()
    enc.wait()
    dec.wait()
    os.remove(wav)
    if enc.returncode:
        sys.exit("ffmpeg loi khi xuat")
    print(f"XONG {a.out}: {n / FPS:.1f}s, {n} khung, {nsfx} SFX")


if __name__ == "__main__":
    main()
