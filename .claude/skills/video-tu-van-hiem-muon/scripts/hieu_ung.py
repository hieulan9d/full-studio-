# -*- coding: utf-8 -*-
"""Hieu ung chu rut tu 5 video mau HTPM 26.11: bat phong, truot vao tu hai ben, vet sang quet, hat lap lanh,
song cham sau tieu de, phu de vao kieu phong nhoe. Chi ve DE LEN video."""
import math
import numpy as np
from PIL import Image, ImageDraw

_cache = {}


def sprite(rgba):
    """Cat lop toan khung ve vung co hinh: (anh PIL, tam x, tam y)."""
    key = id(rgba)
    if key not in _cache or _cache[key][0] is not rgba:
        ys, xs = np.where(rgba[..., 3] > 0)
        x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
        _cache[key] = (rgba, Image.fromarray(rgba[y0:y1, x0:x1]), (x0 + x1) / 2, (y0 + y1) / 2)
    return _cache[key][1:]


def paste(frame, a, x, y):
    """Tron mang RGBA a vao frame tai goc (x, y), tu cat phan ra ngoai khung."""
    h, w = a.shape[:2]
    H, W = frame.shape[:2]
    x0, y0, x1, y1 = max(0, x), max(0, y), min(W, x + w), min(H, y + h)
    if x1 <= x0 or y1 <= y0:
        return
    s = a[y0 - y:y1 - y, x0 - x:x1 - x]
    al = s[..., 3:4].astype(np.float32) / 255
    frame[y0:y1, x0:x1] = (frame[y0:y1, x0:x1] * (1 - al) + s[..., :3] * al + 0.5).astype(np.uint8)


def back_out(p):
    p = min(1.0, max(0.0, p)) - 1
    return 1 + p * p * (2.7 * p + 1.7)


def shine(a, t, start=0.35, every=1.9, last=0.75):
    """Vet sang cheo quet tu trai sang phai, lap lai."""
    u = (t - start) % every
    if t < start or u > last:
        return a
    h, w = a.shape[:2]
    pos = -0.25 * w + (w * 1.5) * (u / last)
    x = np.arange(w)[None, :] + 0.45 * np.arange(h)[:, None]
    g = np.exp(-((x - pos) / (0.07 * w)) ** 2)[..., None] * 0.75
    out = a.copy()
    out[..., :3] = (a[..., :3] + (255 - a[..., :3].astype(np.float32)) * g).astype(np.uint8)
    return out


def show(frame, rgba, t, left=None, enter="pop", glint=True, bob=0.0):
    """Ve mot the: t = giay ke tu luc hien, left = giay con lai (de mo dan khi bien mat)."""
    if t < 0:
        return
    img, cx, cy = sprite(rgba)
    k = back_out(t / 0.3)
    alpha = min(1.0, t / 0.14)
    if left is not None:
        alpha *= min(1.0, max(0.0, left / 0.12))
    scale, dx = 1.0, 0.0
    if enter == "pop":
        scale = 0.72 + 0.28 * k
    elif enter == "slide":
        dx = (1 - k) * (-240 if cx < 540 else 240)
        scale = 0.9 + 0.1 * k
    dy = bob * math.sin(t * 3.2)
    if abs(scale - 1) > 0.002:
        img = img.resize((max(1, int(img.width * scale)), max(1, int(img.height * scale))), Image.BILINEAR)
    a = np.array(img)
    if glint:
        a = shine(a, t)
    if alpha < 1:
        a = a.copy()
        a[..., 3] = (a[..., 3] * alpha).astype(np.uint8)
    paste(frame, a, int(round(cx + dx - a.shape[1] / 2)), int(round(cy + dy - a.shape[0] / 2)))


def sparkles(frame, t):
    """Dau cong va o vuong nho troi len hai ben nguoi dan."""
    for i in range(14):
        side = i % 2
        x = (36 + (i * 53) % 190) if not side else (1044 - (i * 71) % 190)
        y = 1100 - ((i * 211 + t * (55 + (i % 3) * 22)) % 1040)
        r = 7 + (i % 3) * 3
        alpha = int(235 * (0.45 + 0.55 * abs(math.sin(t * 3 + i * 1.7))))
        color = ((70, 235, 215), (255, 235, 90), (255, 255, 255))[i % 3] + (alpha,)
        im = Image.new("RGBA", (r * 2 + 4, r * 2 + 4), (0, 0, 0, 0))
        d = ImageDraw.Draw(im)
        if i % 4 == 3:
            d.rectangle([3, 3, r * 2, r * 2], outline=color, width=3)
        else:
            d.line([r + 2, 2, r + 2, r * 2 + 2], fill=color, width=4)
            d.line([2, r + 2, r * 2 + 2, r + 2], fill=color, width=4)
        paste(frame, np.array(im), int(x), int(y))


def dot_wave(frame, t, alpha=1.0):
    """Hai dai cham sang uon song sau chu chot."""
    im = Image.new("RGBA", (1080, 260), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    for row, color in enumerate(((255, 222, 0), (80, 230, 220))):
        for i in range(40):
            x = 20 + i * 27
            y = 130 + 62 * math.sin(i * 0.33 + t * 4 + row * 2.4)
            r = 4 + 3 * abs(math.sin(i * 0.9 + t * 5))
            if x < 1080 * min(1.0, t / 0.4):
                d.ellipse([x - r, y - r, x + r, y + r], fill=color + (int(220 * alpha),))
    paste(frame, np.array(im), 0, 170)


def caption_in(frame, rgba, t, over):
    """0,2 s dau: chu phong tu nho len, kem mot bong nhoe lan rong ra."""
    if t >= 0.2:
        over(frame, rgba)
        return
    p = max(0.0, t / 0.2)
    img, cx, cy = sprite(rgba)
    for scale, alpha in ((1.0 + 0.45 * p, 0.45 * (1 - p)), (0.86 + 0.14 * back_out(p), min(1.0, 0.35 + p))):
        if alpha <= 0:
            continue
        a = np.array(img.resize((int(img.width * scale), int(img.height * scale)), Image.BILINEAR))
        a[..., 3] = (a[..., 3] * alpha).astype(np.uint8)
        paste(frame, a, int(cx - a.shape[1] / 2), int(cy - a.shape[0] / 2))
