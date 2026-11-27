# -*- coding: utf-8 -*-
"""Lop do hoa nguoi dung duyet 2026-11-27: the hook vang, 2 o hinh, chu chot, the anh hai ben dau, dai ngay, the moi.
Chi ve DE LEN video; nen AI cua clip giu nguyen.

Khai bao trong kich_ban.py (moi muc deu tuy chon):
DO_HOA = {"08": {
  "o_hook": [("lich", "27"), ("trung",)],              # trai, phai; hoac ("chu", "AMH")
  "chot": ("đừng chỉ", ["ĐỪNG CHỈ CANH", "MỘT NGÀY!"]),  # cum tu trong clip 1, 2 dong chu
  "the": [  # (so clip, cum tu lam moc hien, noi dung); the giu den het clip do
    (2, "ta lấy",   {"kieu": "the", "ben": "trai", "nhan": "CÁCH TÍNH", "tieu_de": "BẰNG 13", "phu": "...",
                     "lon": "27 − 14", "mau": "xanh"}),
    (2, "được ngày", {"kieu": "the", "ben": "phai", ..., "anh": (2, 8.0, (80, 100, 640, 268))}),  # (clip, giay, khung 720x1280)
    (4, "từ ngày",  {"kieu": "lich", "tieu_de": "...", "ngay": (8, 15), "vung": (9, 14), "dam": (11, 13)}),
    (5, "Hãy để lại", {"kieu": "moi", "dong": ["BẠN CHƯA BIẾT TÍNH?", "Để lại ...", "..."]}),
  ]}}
"anh" cung co the la duong dan tep anh."""
import math, re, subprocess
import numpy as np
from PIL import Image, ImageDraw, ImageFont

W, H = 1080, 1920
YELLOW, NAVY, RED, TEAL = (255, 222, 0), (16, 38, 82), (213, 9, 33), (10, 140, 150)
COLORS = {"xanh": TEAL, "do": RED}
CW, CH, TOP = 430, 340, 56


def font(size, bold=False):
    return ImageFont.truetype("C:/Windows/Fonts/" + ("segoeuib.ttf" if bold else "seguibl.ttf"), size)


def canvas(w=W, h=H):
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    return im, ImageDraw.Draw(im)


def text(d, xy, s, size, fill, width=None, bold=False, anchor="mm", **kw):
    f = font(size, bold)
    while width and d.textlength(s, font=f) > width and size > 20:
        size -= 2
        f = font(size, bold)
    d.text(xy, s, font=f, fill=fill, anchor=anchor, **kw)


def place(layers):
    im, _ = canvas()
    for lay, x, y in layers:
        im.alpha_composite(lay, (x, y))
    return np.array(im)


def photo(spec, folder, size):
    if isinstance(spec, str):
        im, box = Image.open(spec).convert("RGB"), None
    else:
        clip, t, box = spec
        raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", str(t), "-i", f"{folder}/clip{clip}.mp4", "-frames:v", "1",
                              "-vf", "scale=720:1280", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
                             capture_output=True, check=True).stdout
        im = Image.frombytes("RGB", (720, 1280), raw)
    c = im.crop(box) if box else im
    k = max(size[0] / c.width, size[1] / c.height)
    c = c.resize((math.ceil(c.width * k), math.ceil(c.height * k)), Image.LANCZOS)
    x, y = (c.width - size[0]) // 2, (c.height - size[1]) // 2
    return c.crop((x, y, x + size[0], y + size[1]))


def card(s, folder):
    color = COLORS[s.get("mau", "xanh")]
    im, d = canvas(CW + 24, CH + 24)
    d.rounded_rectangle([14, 18, CW + 14, CH + 18], 30, fill=(0, 0, 0, 70))
    d.rounded_rectangle([8, 8, CW + 8, CH + 8], 30, fill=(255, 255, 255, 255), outline=color, width=6)
    size = (CW - 24, 178)
    if s.get("anh"):
        mask = Image.new("L", size, 0)
        ImageDraw.Draw(mask).rounded_rectangle([0, 0, size[0] - 1, size[1] - 1], 22, fill=255)
        im.paste(photo(s["anh"], folder, size), (20, 20), mask)
    else:                                                 # mau dac: alpha thap se duc lo the
        d.rounded_rectangle([20, 20, 20 + size[0], 20 + size[1]], 22, fill=(236, 246, 248, 255))
        text(d, (CW / 2 + 8, 108), s.get("lon", ""), 76, color, width=size[0] - 20)
    tw = d.textlength(s["nhan"], font=font(24)) + 36
    d.rounded_rectangle([28, 182, 28 + tw, 222], 20, fill=color)
    text(d, (28 + tw / 2, 201), s["nhan"], 24, (255, 255, 255))
    text(d, (CW / 2 + 8, 262), s["tieu_de"], 44, NAVY, width=CW - 30)
    text(d, (CW / 2 + 8, 312), s["phu"], 29, (80, 80, 90), width=CW - 30, bold=True)
    return im


def day_strip(s):
    first, last = s["ngay"]
    lo, hi = s["vung"]
    a, b = s["dam"]
    step = min(122, 976 // (last - first + 1))
    x0 = 518 - (step * (last - first + 1) - 14) / 2
    im, d = canvas(1040, 360)
    d.rounded_rectangle([14, 18, 1034, 348], 36, fill=(0, 0, 0, 70))
    d.rounded_rectangle([8, 8, 1028, 340], 36, fill=(255, 255, 255, 255), outline=TEAL, width=6)
    text(d, (518, 62), s["tieu_de"], 40, NAVY, width=960)
    for k, day in enumerate(range(first, last + 1)):
        x = x0 + k * step
        hot, ok = a <= day <= b, lo <= day <= hi
        d.rounded_rectangle([x, 116, x + step - 14, 240], 24, fill=RED if hot else (255, 214, 214) if ok else (236, 236, 240))
        col = (255, 255, 255) if hot else RED if ok else (150, 150, 160)
        text(d, (x + (step - 14) / 2, 148), "ngày", 24, col, bold=True)
        text(d, (x + (step - 14) / 2, 196), str(day), 52, col, width=step - 20)
    d.rounded_rectangle([160, 272, 196, 308], 8, fill=(255, 214, 214))
    text(d, (208, 290), f"Ngày {lo}–{hi}", 30, NAVY, bold=True, anchor="lm")
    d.rounded_rectangle([520, 272, 556, 308], 8, fill=RED)
    text(d, (568, 290), f"Chú ý hơn: {a}–{b}", 30, NAVY, bold=True, anchor="lm")
    return im


def invite(lines):
    im, d = canvas(940, 300)
    d.rounded_rectangle([8, 8, 932, 292], 36, fill=(255, 255, 255, 250), outline=YELLOW, width=8)
    text(d, (470, 70), lines[0], 50, RED, width=860)
    for k, s in enumerate(lines[1:3]):
        text(d, (470, 152 + 72 * k), s, 48, NAVY, width=860)
    return im


def icon(spec):
    kind, label = spec[0], spec[1] if len(spec) > 1 else ""
    im, d = canvas(230, 230)
    d.rounded_rectangle([10, 10, 220, 220], 40, fill=(22, 30, 62, 245), outline=(120, 220, 255, 255), width=6)
    if kind == "lich":
        d.rounded_rectangle([50, 56, 180, 178], 16, fill=(255, 255, 255))
        d.rounded_rectangle([50, 56, 180, 92], 16, fill=RED)
        d.rectangle([50, 76, 180, 92], fill=RED)
        text(d, (115, 134), label, 62, NAVY, width=116)
    elif kind == "trung":
        for r, c in ((66, (255, 196, 140)), (46, (255, 168, 110)), (20, (230, 100, 70))):
            d.ellipse([115 - r, 115 - r, 115 + r, 115 + r], fill=c)
        text(d, (115, 116), label or "?", 40, (255, 255, 255), width=40)
    else:
        text(d, (115, 115), label, 66, YELLOW, width=170)
    return im


def hook_card(lines):
    im, d = canvas()
    top = 1345 - (len(lines) * 90 + 60) // 2
    bottom = top + len(lines) * 90 + 60
    d.rounded_rectangle([96, top + 12, 992, bottom + 12], 44, fill=(0, 0, 0, 70))
    d.rounded_rectangle([88, top, 984, bottom], 44, fill=YELLOW)
    for k, s in enumerate(lines):
        text(d, (536, top + 76 + 90 * k), s, 76, (20, 20, 20), width=840)
    return np.array(im)


def hook_icons(specs):
    return [place([(icon(s), x, 150)]) for s, x in zip(specs, (40, 810))]


def punch(lines):
    im, d = canvas()
    text(d, (540, 190), lines[0], 92, (255, 255, 255), width=1000, stroke_width=9, stroke_fill=RED)
    text(d, (540, 310), lines[1], 122, YELLOW, width=1000, stroke_width=10, stroke_fill=NAVY)
    return np.array(im)


def render(s, folder):
    if s["kieu"] == "the":
        return place([(card(s, folder), 40 if s["ben"] == "trai" else W - 40 - CW - 24, TOP)])
    if s["kieu"] == "lich":
        return place([(day_strip(s), 22, TOP)])
    return place([(invite(s["dong"]), 70, 70)])


def blend(frame, rgba, t, start, over):
    """The truot len va hien dan trong 0,22 s."""
    k = min(1.0, max(0.0, (t - start) / 0.22))
    k = 1 - (1 - k) ** 3
    if k < 1:
        rgba = np.roll(rgba, int((1 - k) * 46), axis=0)
        rgba[..., 3] = (rgba[..., 3] * k).astype(np.uint8)
    if rgba[..., 3].any():
        over(frame, rgba)


def find(words, phrase):
    """Vi tri tu dau cua cum tu trong cau thoai, hoac None."""
    clean = lambda w: re.sub(r"[^\w]", "", w.lower())
    toks, want = [clean(w) for w in words], [clean(w) for w in phrase.split()]
    for k in range(len(toks) - len(want) + 1):
        if want and toks[k:k + len(want)] == want:
            return k
    return None


NEEDED = {"the": ("ben", "nhan", "tieu_de", "phu"), "lich": ("tieu_de", "ngay", "vung", "dam"), "moi": ("dong",)}


def problems(video, spec):
    """Loi khai bao do hoa cua mot video (danh sach chuoi)."""
    out, clips, used = [], video["clips"], []
    if "chot" in spec:
        phrase, lines = spec["chot"]
        if find(clips[0][0].split(), phrase) is None:
            out.append(f"chu chot: khong thay '{phrase}' trong clip 1")
        if len(lines) != 2:
            out.append("chu chot phai dung 2 dong")
    for clip, phrase, s in spec.get("the", []):
        tag = f"the clip{clip} '{phrase}'"
        if not 1 <= clip <= len(clips) or find(clips[clip - 1][0].split(), phrase) is None:
            out.append(tag + ": khong thay cum tu trong cau thoai")
            continue
        missing = [k for k in NEEDED.get(s.get("kieu"), ("kieu",)) if k not in s]
        if missing:
            out.append(f"{tag}: thieu {' '.join(missing)}")
            continue
        place_ = s["ben"] if s["kieu"] == "the" else "ca hai"
        if any(c == clip and (p == place_ or "ca hai" in (p, place_)) for c, p in used):
            out.append(tag + ": de len the khac trong cung clip")
        used.append((clip, place_))
    return out


def texts(spec):
    """Moi chu hien tren man hinh, de dua vao ban duyet."""
    out = [" / ".join(spec["chot"][1])] if "chot" in spec else []
    for clip, _, s in spec.get("the", []):
        if s["kieu"] == "the":
            out.append(f"clip{clip}: " + " · ".join(x for x in (s["nhan"], s.get("lon"), s["tieu_de"], s["phu"]) if x))
        elif s["kieu"] == "lich":
            out.append(f"clip{clip}: {s['tieu_de']} · ngày {s['vung'][0]}–{s['vung'][1]}, chú ý {s['dam'][0]}–{s['dam'][1]}")
        else:
            out.append(f"clip{clip}: " + " · ".join(s["dong"]))
    return out
