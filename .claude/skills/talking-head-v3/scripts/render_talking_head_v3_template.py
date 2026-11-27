import json, math, os, re, subprocess, sys, time
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

sys.stdout.reconfigure(encoding="utf-8")

PROJ_DIR  = r"d:\AI\full studio\output\lt-plus-talking-head"
AROLL_DIR = os.path.join(PROJ_DIR, "aroll")
MEDIA_DIR = os.path.join(PROJ_DIR, "media")
CHECK_DIR = os.path.join(PROJ_DIR, "check")
os.makedirs(CHECK_DIR, exist_ok=True)

W, H = 1080, 1920
FPS = 30.0
F = 1.0 / FPS

FONT_TITLE  = r"C:\Users\Hang thu\AppData\Local\CapCut\User Data\Cache\effect\7182504807289065985\0a5333de6f4d592cb2d2390d68b31efb\Oswald-Bold.ttf"
FONT_WIDE   = r"C:\Users\Hang thu\AppData\Local\CapCut\User Data\Cache\effect\7517455788122705168\91d28cfa5e7db054f4872f1ae2417ac2\Montserrat-Bold.otf"
FONT_CAP    = r"C:\Windows\Fonts\palabi.ttf"
FONT_SCRIPT = r"C:\Users\Hang thu\AppData\Local\CapCut\User Data\Cache\effect\6990292000264163842\840d58433e5d79e2599f155e83c2defb\ZYVNA Dreamboat.ttf"
FONT_SUB    = r"C:\Users\Hang thu\AppData\Local\CapCut\User Data\Cache\effect\7542214368361057553\d376267c892ee3a53654ae93a78dcfb7\font.ttf"

_font_cache = {}
def get_font(path, size):
    key = (path, int(round(size)))
    if key not in _font_cache:
        _font_cache[key] = ImageFont.truetype(path, max(10, int(round(size))))
    return _font_cache[key]

def clamp01(x):
    return 0.0 if x <= 0.0 else (1.0 if x >= 1.0 else x)

def ease_out_cubic(u):
    u = clamp01(u)
    return 1.0 - (1.0 - u) ** 3.0

def smoothstep(u):
    u = clamp01(u)
    return u * u * (3.0 - 2.0 * u)

def smooth_in_out_env(t, t0, t1, d_in=0.42, d_out=0.36):
    if t <= t0 or t >= t1:
        return 0.0
    a_in = smoothstep((t - t0) / max(0.05, d_in)) if (t - t0) < d_in else 1.0
    a_out = smoothstep((t1 - t) / max(0.05, d_out)) if (t1 - t) < d_out else 1.0
    return min(a_in, a_out)

def fit_cover(rgb_arr, target_w, target_h, zoom=1.0):
    """Aspect-ratio locked center-crop: 0% stretching or distortion EVER!"""
    sh, sw = rgb_arr.shape[:2]
    base_scale = max(target_w / float(sw), target_h / float(sh)) * zoom
    nw = max(target_w, int(round(sw * base_scale)))
    nh = max(target_h, int(round(sh * base_scale)))
    im = Image.fromarray(rgb_arr, "RGB").resize((nw, nh), Image.Resampling.BILINEAR)
    x0 = (nw - target_w) // 2
    y0 = (nh - target_h) // 2
    return im.crop((x0, y0, x0 + target_w, y0 + target_h))

def _build_static_helpers():
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    vig = np.clip(1.0 - 0.50 * (((xx - 540.0) / 640.0) ** 2 + ((yy - 960.0) / 1080.0) ** 2), 0.35, 1.0)
    bbg = np.zeros((H, W, 3), dtype=np.uint8)
    # Deep velvet plum-charcoal vignette canvas tailored to LT PLUS rose-gold medical aesthetic
    bbg[:, :, 0] = (28 * vig).astype(np.uint8)
    bbg[:, :, 1] = (19 * vig).astype(np.uint8)
    bbg[:, :, 2] = (27 * vig).astype(np.uint8)
    broll_bg_im = Image.fromarray(bbg, "RGB").convert("RGBA")

    fl = np.exp(-((xx / 340.0) ** 2 + (yy / 360.0) ** 2)) + np.exp(-(((W - xx) / 340.0) ** 2 + (yy / 360.0) ** 2))
    fl_rgba = np.zeros((H, W, 4), dtype=np.uint8)
    fl_rgba[:, :, 0] = 255; fl_rgba[:, :, 1] = 225; fl_rgba[:, :, 2] = 240
    fl_rgba[:, :, 3] = np.clip(fl * 75.0, 0, 100).astype(np.uint8)
    flare_im = Image.fromarray(fl_rgba, "RGBA")
    return broll_bg_im, flare_im

BROLL_BG_IM, RINGS_FLARE_IM = _build_static_helpers()

_sprite_cache = {}
def render_glow_text_sprite(text, font_path, size, top_col, bot_col=None, glow_col=None, glow_rad=14, stroke_col=None, stroke_w=0):
    bot_col = bot_col or top_col
    glow_col = glow_col or top_col
    key = (text, font_path, int(round(size)), top_col, bot_col, glow_col, glow_rad, stroke_col, stroke_w)
    if key in _sprite_cache:
        return _sprite_cache[key]

    font = get_font(font_path, size)
    dummy = ImageDraw.Draw(Image.new("RGBA", (10, 10)))
    bbox = dummy.textbbox((0, 0), text, font=font, stroke_width=stroke_w)
    tw = max(4, bbox[2] - bbox[0])
    th = max(4, bbox[3] - bbox[1])
    pad = int(glow_rad * 3 + stroke_w + 16)
    cw, ch = tw + pad * 2, th + pad * 2
    ox, oy = pad - bbox[0], pad - bbox[1]

    mask_im = Image.new("L", (cw, ch), 0)
    ImageDraw.Draw(mask_im).text((ox, oy), text, font=font, fill=255)

    arr_m = np.array(mask_im, dtype=np.float32) / 255.0
    yy = np.clip((np.arange(ch, dtype=np.float32) - pad) / max(1.0, float(th)), 0.0, 1.0)[:, None]
    grad_rgb = np.zeros((ch, cw, 3), dtype=np.uint8)
    for c in range(3):
        grad_rgb[:, :, c] = np.clip(top_col[c] * (1.0 - yy) + bot_col[c] * yy, 0, 255).astype(np.uint8)
    fill_im = Image.fromarray(np.dstack([grad_rgb, (arr_m * 255.0).astype(np.uint8)]), "RGBA")

    # Color-preserving Dual Drop-Shadow Glow (knowledge/07 #1: 0% white-out!)
    base = Image.new("RGBA", (cw, ch), (0, 0, 0, 0))
    if glow_rad > 0:
        g1_a = mask_im.filter(ImageFilter.GaussianBlur(radius=glow_rad * 0.8))
        g2_a = mask_im.filter(ImageFilter.GaussianBlur(radius=glow_rad * 2.0))
        g_arr = np.zeros((ch, cw, 4), dtype=np.uint8)
        g_arr[:, :, 0] = glow_col[0]; g_arr[:, :, 1] = glow_col[1]; g_arr[:, :, 2] = glow_col[2]
        g_arr[:, :, 3] = np.clip(np.array(g1_a, dtype=np.float32) * 0.68 + np.array(g2_a, dtype=np.float32) * 0.42, 0, 255).astype(np.uint8)
        base = Image.alpha_composite(base, Image.fromarray(g_arr, "RGBA"))

    sh_a = mask_im.filter(ImageFilter.GaussianBlur(radius=6))
    sh_im = Image.new("RGBA", (cw, ch), (0, 0, 0, 0))
    sh_arr = np.zeros((ch, cw, 4), dtype=np.uint8)
    sh_arr[:, :, 3] = (np.array(sh_a, dtype=np.float32) * 0.68).astype(np.uint8)
    sh_im.paste(Image.fromarray(sh_arr, "RGBA"), (4, 6))
    base = Image.alpha_composite(base, sh_im)
    base = Image.alpha_composite(base, fill_im)

    if stroke_w > 0 and stroke_col is not None:
        st_only = Image.new("RGBA", (cw, ch), (0, 0, 0, 0))
        ImageDraw.Draw(st_only).text((ox, oy), text, font=font, fill=(*stroke_col, 255), stroke_width=stroke_w, stroke_fill=(*stroke_col, 255))
        st_arr = np.array(st_only)
        inner = mask_im.filter(ImageFilter.MinFilter(3))
        st_arr[:, :, 3] = np.clip(st_arr[:, :, 3].astype(np.int32) - np.array(inner, dtype=np.int32), 0, 255).astype(np.uint8)
        base = Image.alpha_composite(base, Image.fromarray(st_arr, "RGBA"))

    if len(_sprite_cache) > 500:
        _sprite_cache.clear()
    _sprite_cache[key] = (base, mask_im)
    return base, mask_im

def paste_centered(canvas_im, sprite_im, cx, cy, scale=1.0, opacity=1.0, angle=0.0, blur_px=0.0, sweep_prog=None):
    if opacity <= 0.01 or scale <= 0.02:
        return
    im = sprite_im
    if sweep_prog is not None and 0.0 <= sweep_prog <= 1.0:
        arr = np.array(im).copy()
        sh, sw = arr.shape[:2]
        yy, xx = np.mgrid[0:sh, 0:sw].astype(np.float32)
        diag = (xx + yy * 0.45) / (sw + sh * 0.45)
        band = np.exp(-((diag - sweep_prog) / 0.09) ** 2)
        alpha_f = (arr[:, :, 3:4].astype(np.float32) / 255.0)
        arr[:, :, :3] = np.clip(arr[:, :, :3].astype(np.float32) + 170.0 * band[:, :, None] * alpha_f, 0, 255).astype(np.uint8)
        im = Image.fromarray(arr, "RGBA")

    if abs(scale - 1.0) > 0.008:
        nw = max(2, int(round(im.width * scale)))
        nh = max(2, int(round(im.height * scale)))
        im = im.resize((nw, nh), Image.Resampling.BILINEAR)
    if abs(angle) > 0.15:
        im = im.rotate(angle, resample=Image.Resampling.BICUBIC, expand=True)
    if blur_px >= 0.6:
        im = im.filter(ImageFilter.GaussianBlur(radius=min(14.0, blur_px)))
    if opacity < 0.995:
        arr = np.array(im)
        arr[:, :, 3] = (arr[:, :, 3].astype(np.float32) * clamp01(opacity)).astype(np.uint8)
        im = Image.fromarray(arr, "RGBA")

    px = int(round(cx - im.width / 2.0))
    py = int(round(cy - im.height / 2.0))
    canvas_im.alpha_composite(im, dest=(px, py))

def load_icons():
    files = {
        "hook1":  os.path.join(MEDIA_DIR, "hook_01_clean.png"),
        "hook2":  os.path.join(MEDIA_DIR, "hook_02_clean.png"),
        "clinic": os.path.join(MEDIA_DIR, "icon_clinic_clean.png"),
        "herbs":  os.path.join(MEDIA_DIR, "icon_herbs_clean.png"),
        "ph":     os.path.join(MEDIA_DIR, "icon_ph_clean.png"),
        "box":    os.path.join(MEDIA_DIR, "pack_box_clean.png"),
        "bottle": os.path.join(MEDIA_DIR, "pack_bottle_clean.png"),
        "open":   os.path.join(MEDIA_DIR, "pack_open_clean.png"),
    }
    ims = {}
    for k, p in files.items():
        if os.path.exists(p):
            ims[k] = Image.open(p).convert("RGBA")
        else:
            ims[k] = Image.open(files["box"]).convert("RGBA")
    return ims

def render_tile_frame(icon_ims, icon_key, size_px, t_sec):
    S = size_px
    im = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    pad = 14
    cs = S - pad * 2
    rad = int(cs * 0.22)

    rmask = Image.new("L", (cs, cs), 0)
    ImageDraw.Draw(rmask).rounded_rectangle([0, 0, cs - 1, cs - 1], radius=rad, fill=255)

    ic_resized = icon_ims[icon_key].resize((cs, cs), Image.Resampling.LANCZOS)
    glow_bg = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    ImageDraw.Draw(glow_bg).rounded_rectangle([pad - 3, pad - 3, pad + cs + 2, pad + cs + 2], radius=rad + 3, outline=(255, 145, 195, 215), width=5)
    glow_bg = glow_bg.filter(ImageFilter.GaussianBlur(radius=6))
    im = Image.alpha_composite(im, glow_bg)

    card_layer = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    card_layer.paste(ic_resized, (pad, pad), mask=rmask)
    im = Image.alpha_composite(im, card_layer)

    ImageDraw.Draw(im).rounded_rectangle([pad, pad, pad + cs - 1, pad + cs - 1], radius=rad, outline=(255, 185, 215, 195), width=4)

    ang = (t_sec / 3.5) * 2.0 * math.pi
    sx = S / 2.0 + (cs * 0.48) * math.cos(ang)
    sy = S / 2.0 + (cs * 0.48) * math.sin(ang)
    border_mask = Image.new("L", (S, S), 0)
    ImageDraw.Draw(border_mask).rounded_rectangle([pad, pad, pad + cs - 1, pad + cs - 1], radius=rad, outline=255, width=6)
    bm_arr = np.array(border_mask, dtype=np.float32) / 255.0
    yy, xx = np.mgrid[0:S, 0:S].astype(np.float32)
    spot = np.exp(-(((xx - sx) ** 2 + (yy - sy) ** 2) / (2.0 * (S * 0.18) ** 2)))
    sweep_rgba = np.zeros((S, S, 4), dtype=np.uint8)
    sweep_rgba[:, :, 0] = 255; sweep_rgba[:, :, 1] = 240; sweep_rgba[:, :, 2] = 190
    sweep_rgba[:, :, 3] = np.clip(bm_arr * spot * 255.0, 0, 255).astype(np.uint8)
    im = Image.alpha_composite(im, Image.fromarray(sweep_rgba, "RGBA").filter(ImageFilter.GaussianBlur(radius=2)))
    return im

def draw_burst(canvas_im, cx, cy, t_now, t0, diam=74):
    dt = t_now - t0
    if dt < 0 or dt > 0.45:
        return
    u = dt / 0.45
    sc = 0.60 + 1.25 * ease_out_cubic(u)
    op = smoothstep(1.0 - u)
    r = int(round(diam * 0.5 * sc))
    sw = max(2, int(round(6 * (1.0 - 0.6 * u))))
    sz = r * 2 + 20
    bim = Image.new("RGBA", (sz, sz), (0, 0, 0, 0))
    ImageDraw.Draw(bim).ellipse([10, 10, sz - 10, sz - 10], outline=(255, 240, 248, int(230 * op)), width=sw)
    canvas_im.alpha_composite(bim, dest=(int(cx - sz // 2), int(cy - sz // 2)))

def draw_rings_bg(canvas_im, icon_ims, t_now, t0, t1):
    env = smooth_in_out_env(t_now, t0, t1, d_in=0.50, d_out=0.45)
    if env <= 0.01:
        return
    dt = t_now - t0
    dur = max(0.2, t1 - t0)
    sc = 0.92 + 0.08 * ease_out_cubic(min(1.0, dt / 0.55))
    rot_deg = 34.0 * (dt / dur)
    cx, cy = 540, 680

    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    dr = ImageDraw.Draw(layer)
    R1 = int(525 * sc)
    R2 = int(405 * sc)
    dr.ellipse([cx - R1, cy - R1, cx + R1, cy + R1], outline=(255, 230, 242, int(155 * env)), width=3)
    dr.ellipse([cx - R2, cy - R2, cx + R2, cy + R2], outline=(255, 195, 220, int(95 * env)), width=2)

    keys = ["herbs", "ph", "box", "bottle", "clinic"]
    for i, k in enumerate(keys):
        a_deg = -165.0 + i * (150.0 / 4.0) + rot_deg * 0.65
        a_rad = math.radians(a_deg)
        ix = cx + int(R1 * math.cos(a_rad))
        iy = cy + int(R1 * math.sin(a_rad))
        mini = icon_ims[k].resize((80, 80), Image.Resampling.BILINEAR)
        mm = Image.new("L", (80, 80), 0)
        ImageDraw.Draw(mm).ellipse([2, 2, 77, 77], fill=int(225 * env))
        layer.paste(mini, (ix - 40, iy - 40), mask=mm)
        dr.ellipse([ix - 41, iy - 41, ix + 41, iy + 41], outline=(255, 240, 246, int(195 * env)), width=3)

        ga = a_rad + 0.32
        gx = cx + int(R2 * math.cos(ga))
        gy = cy + int(R2 * math.sin(ga))
        dr.ellipse([gx - 10, gy - 10, gx + 10, gy + 10], outline=(255, 230, 165, int(195 * env)), width=4)

    if env > 0.2:
        fl_arr = np.array(RINGS_FLARE_IM)
        fl_arr[:, :, 3] = (fl_arr[:, :, 3].astype(np.float32) * env).astype(np.uint8)
        layer = Image.alpha_composite(layer, Image.fromarray(fl_arr, "RGBA"))

    canvas_im.alpha_composite(layer)

def render_split_broll_v3(base_rgba, top_rgb, bot_rgb, t_now, st, en, badge_small, badge_big):
    """Distortion-Free Dual Split B-Roll Card with Smooth Keyframe Glide & Crossfade!"""
    env = smooth_in_out_env(t_now, st, en, d_in=0.42, d_out=0.40)
    if env <= 0.005:
        return base_rgba

    dt = t_now - st
    dur = max(0.2, en - st)
    card_layer = BROLL_BG_IM.copy()

    z_top = 1.02 + 0.07 * smoothstep(dt / dur)
    z_bot = 1.08 - 0.06 * smoothstep(dt / dur)

    cw, ch = 920, 720
    top_crop = fit_cover(top_rgb, cw, ch, zoom=z_top).convert("RGBA")
    tmask = Image.new("L", (cw, ch), 0)
    ImageDraw.Draw(tmask).rounded_rectangle([0, 0, cw - 1, ch - 1], radius=54, fill=255)
    tcard = Image.new("RGBA", (cw, ch), (0, 0, 0, 0))
    tcard.paste(top_crop, (0, 0), mask=tmask)
    ImageDraw.Draw(tcard).rounded_rectangle([1, 1, cw - 2, ch - 2], radius=54, outline=(255, 175, 210, 225), width=5)

    bot_crop = fit_cover(bot_rgb, cw, ch, zoom=z_bot).convert("RGBA")
    bcard = Image.new("RGBA", (cw, ch), (0, 0, 0, 0))
    bcard.paste(bot_crop, (0, 0), mask=tmask)
    ImageDraw.Draw(bcard).rounded_rectangle([1, 1, cw - 2, ch - 2], radius=54, outline=(255, 225, 145, 205), width=4)

    sh_card = Image.new("RGBA", (cw + 60, ch + 60), (0, 0, 0, 0))
    ImageDraw.Draw(sh_card).rounded_rectangle([30, 34, 30 + cw, 34 + ch], radius=54, fill=(0, 0, 0, 170))
    sh_card = sh_card.filter(ImageFilter.GaussianBlur(radius=18))

    glide = (1.0 - env) * 42.0
    sc_card = 0.94 + 0.06 * env

    paste_centered(card_layer, sh_card, 540, 1420 + glide, scale=sc_card, opacity=1.0, angle=-1.0)
    paste_centered(card_layer, bcard,   540, 1415 + glide, scale=sc_card, opacity=1.0, angle=-1.0)

    paste_centered(card_layer, sh_card, 540, 492 - glide, scale=sc_card, opacity=1.0, angle=1.0)
    paste_centered(card_layer, tcard,   540, 485 - glide, scale=sc_card, opacity=1.0, angle=1.0)

    pill = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(pill).rounded_rectangle([75, 882, 1005, 1018], radius=40, fill=(38, 14, 28, 240), outline=(255, 175, 210, 225), width=3)
    card_layer = Image.alpha_composite(card_layer, pill)

    sp1, _ = render_glow_text_sprite(badge_small, FONT_WIDE, 25, (255, 215, 235), glow_rad=6)
    sp2, _ = render_glow_text_sprite(badge_big, FONT_WIDE, 35, (255, 224, 80), (255, 185, 35), glow_col=(255, 195, 50), glow_rad=10)
    paste_centered(card_layer, sp1, 540, 918, scale=sc_card, opacity=1.0)
    paste_centered(card_layer, sp2, 540, 972, scale=sc_card, opacity=1.0)

    if env >= 0.995:
        return card_layer
    arr = np.array(card_layer)
    arr[:, :, 3] = (arr[:, :, 3].astype(np.float32) * env).astype(np.uint8)
    out = base_rgba.copy()
    out.alpha_composite(Image.fromarray(arr, "RGBA"))
    return out

def draw_synergy_bar(canvas_im, icon_ims, t_now, t0, t1):
    env = smooth_in_out_env(t_now, t0, t1, d_in=0.45, d_out=0.38)
    if env <= 0.01:
        return
    dt = t_now - t0
    dur = max(0.2, t1 - t0)
    ox = 180.0 * (1.0 - ease_out_cubic(min(1.0, dt / 0.48))) - 18.0 * (dt / dur)

    bar = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    dr = ImageDraw.Draw(bar)
    bx1, by1, bx2, by2 = int(65 + ox), 1595, int(1015 + ox), 1825
    dr.rounded_rectangle([bx1, by1, bx2, by2], radius=52, fill=(36, 14, 26, int(212 * env)), outline=(255, 180, 215, int(215 * env)), width=3)

    items = [
        ("herbs",  "6 THẢO DƯỢC", -315, 128),
        ("box",    "LT PLUS",     -95,  164),
        ("ph",     "ACID LACTIC",  125, 128),
        ("bottle", "LỌ 15 VIÊN",   320, 128),
    ]
    cx_base = 540 + ox
    for k, lbl, dx, sz in items:
        ic = icon_ims[k].resize((sz, sz), Image.Resampling.BILINEAR)
        rm = Image.new("L", (sz, sz), 0)
        ImageDraw.Draw(rm).rounded_rectangle([0, 0, sz - 1, sz - 1], radius=int(sz * 0.22), fill=int(255 * env))
        px = int(cx_base + dx - sz // 2)
        py = 1690 - sz // 2
        bar.paste(ic, (px, py), mask=rm)
        ImageDraw.Draw(bar).rounded_rectangle([px, py, px + sz - 1, py + sz - 1], radius=int(sz * 0.22), outline=(255, 225, 130, int(215 * env)), width=3)
        sp, _ = render_glow_text_sprite(lbl, FONT_WIDE, 20 if sz < 155 else 25, (255, 255, 255) if sz < 155 else (255, 222, 75), glow_rad=5)
        paste_centered(bar, sp, cx_base + dx, py + sz + 22, opacity=env)

    canvas_im.alpha_composite(bar)

# ======================================================================
# SMOOTH CAMERA ZOOM & BACKGROUND DIMMING ENVELOPES FOR LT PLUS (70.40s)
# ======================================================================
ZOOM_KEYS = [
    (0.00,  1.00),
    (4.60,  1.06),
    (7.14,  1.02),
    (10.54, 1.08),
    (18.00, 1.03),
    (27.96, 1.09),
    (31.34, 1.04),
    (37.66, 1.08),
    (43.74, 1.10),
    (52.56, 1.04),
    (55.96, 1.09),
    (60.52, 1.03),
    (64.28, 1.09),
    (70.40, 1.03),
]

def get_smooth_zoom(t):
    if t <= ZOOM_KEYS[0][0]:
        return ZOOM_KEYS[0][1]
    for i in range(len(ZOOM_KEYS) - 1):
        t0, z0 = ZOOM_KEYS[i]
        t1, z1 = ZOOM_KEYS[i + 1]
        if t0 <= t <= t1:
            trans_dur = min(0.75, (t1 - t0) * 0.5)
            u = smoothstep((t - t0) / max(0.1, trans_dur))
            return z0 + (z1 - z0) * u
    return ZOOM_KEYS[-1][1]

# Windows where visual animations appear -> smoothly darken room background behind speaker!
# Between these windows (e.g. 7.1-10.5s, 21.8-22.5s, 37.6-37.7s, 60.6-64.2s), room returns smoothly to 100% normal!
ANIM_DIM_WINDOWS = [
    (0.05,  4.58),   # Hook animation + 3 overhead tiles
    (4.86,  7.10),   # Keyword "LO LẮNG?"
    (10.54, 13.30),  # "LƯU Ý 1"
    (17.90, 21.90),  # Keyword "CẦN KIỂM TRA" + clinic tile
    (27.96, 33.85),  # "LƯU Ý 2" + "KHÁM PHỤ KHOA"
    (37.66, 47.30),  # "GIẢI PHÁP 3" + "LT PLUS" + Synergy Bar
    (52.56, 60.55),  # Orbital Rings + "3 NGÀY 1 LẦN" + "HỘP 15 VIÊN" + open box tile
    (64.28, 70.10),  # CTA Orbital Rings + "TÌM HIỂU RÕ" + box tile
]

def get_bg_dim(t):
    val = 0.0
    for w0, w1 in ANIM_DIM_WINDOWS:
        val = max(val, smooth_in_out_env(t, w0, w1, d_in=0.50, d_out=0.50))
    return val

def load_timeline_ltplus():
    tr = json.load(open(os.path.join(AROLL_DIR, "main_cut_clean.json"), encoding="utf-8"))
    broll_spans = [
        (13.36, 17.85, "1a_cal",     "1b_drop",    "BIỂU HIỆN DỄ NHẦM LẪN",  "TIẾT DỊCH • BẤT THƯỜNG CHU KỲ"),
        (22.48, 27.90, "2a_consult", "2b_barrier", "BIỂU HIỆN BÊN NGOÀI",     "KHÔNG PHẢI DẤU HIỆU RIÊNG BIỆT"),
        (33.88, 37.62, "3a_lab",     "3b_shield",  "CHẨN ĐOÁN CHÍNH XÁC",     "KHÁM & XÉT NGHIỆM CHUYÊN KHOA"),
        (47.35, 52.52, "4a_herbs",   "4b_ltplus",  "TỔ HỢP 6 THÀNH PHẦN",     "THẢO DƯỢC TỰ NHIÊN & ACID LACTIC"),
    ]
    skip_ranges = [(0.0, 4.58)] + [(s[0] + 0.15, s[1] - 0.15) for s in broll_spans]
    words = [
        w for seg in tr["segments"] for w in seg["words"]
        if not any(a <= (w["start"] + w["end"]) * 0.5 <= b for a, b in skip_ranges)
    ]

    # Strict max 2 lines per caption group so chest captions stay 100% on dark navy top (y=1125..1195), NEVER touching chin or LT PLUS box!
    groups, cur, line = [], [], []
    def flush_line():
        nonlocal line
        if line: cur.append(line); line = []
    def flush_group():
        nonlocal cur
        flush_line()
        if cur: groups.append(cur); cur = []

    prev = None
    for w in words:
        txt = w["word"].strip()
        if not txt: continue
        if prev is not None and (w["start"] - prev["end"]) >= 0.34:
            flush_group()
        if line and (len(line) >= 3 or sum(len(x[0]) + 1 for x in line) + len(txt) > 15):
            flush_line()
        if len(cur) >= 2 and not line:
            flush_group()
        line.append([txt, round(w["start"], 3), round(w["end"], 3)])
        prev = w
        if re.search(r"[.,?!…:;]$", txt):
            flush_group()
    flush_group()

    GOLD_WORDS = {
        "LT", "Plus", "Hằng", "Thu.", "Hoàng", "bá,", "Ích", "mẫu,", "Kim", "ngân", "hoa,",
        "Trà", "xanh,", "Trầu", "Acid", "Lactic.", "3", "15", "viên,", "30", "40", "bác", "sĩ."
    }
    PINK_WORDS = {
        "lo", "lắng,", "nguyên", "nhân.", "Lộ", "tuyến", "triệu", "chứng,", "kiểm", "tra.",
        "Đừng", "tự", "chẩn", "đoán", "khám", "phụ", "khoa,", "viêm", "tuyến,", "khác", "biệt",
        "Nhắn", "thành", "phần", "rõ"
    }
    STROKE_UP_WORDS = {"Plus", "khám", "15", "30", "Nhắn"}

    cap_groups = []
    for i, g in enumerate(groups):
        last_end = g[-1][-1][2]
        nxt = groups[i + 1][0][0][1] if i + 1 < len(groups) else 70.35
        t1 = min(nxt, last_end + 0.45) if (nxt - last_end) > 0.6 else nxt
        cap_groups.append({"t0": g[0][0][1], "t1": t1, "lines": g})
    return broll_spans, cap_groups, GOLD_WORDS, PINK_WORDS, STROKE_UP_WORDS

class VideoReader:
    def __init__(self, path):
        self.proc = subprocess.Popen(
            ["ffmpeg", "-v", "error", "-i", path, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
            stdout=subprocess.PIPE
        )
    def read(self):
        buf = self.proc.stdout.read(W * H * 3)
        if len(buf) < W * H * 3:
            return None
        return np.frombuffer(buf, dtype=np.uint8).reshape((H, W, 3))
    def close(self):
        self.proc.stdout.close()
        self.proc.wait()

def load_clip_frames(path):
    frames = []
    r = VideoReader(path)
    while True:
        f = r.read()
        if f is None: break
        frames.append(f)
    r.close()
    return frames

def main():
    t_start = time.time()
    test_mode = "--test" in sys.argv
    test_frames = {int(round(ts * FPS)) for ts in [1.8, 11.8, 15.5, 25.0, 32.2, 44.8, 49.5, 57.5, 66.0]}
    test_saved = []

    aroll_path = os.path.join(AROLL_DIR, "main_cut.mp4")
    matte_path = os.path.join(AROLL_DIR, "main_cut_matte.mp4")

    icon_ims = load_icons()

    print("Loading 8 distinct 1080x1920 B-roll clips into RAM...")
    broll_clips = {
        "1a_cal":     load_clip_frames(os.path.join(MEDIA_DIR, "broll_1a_calendar.mp4")),
        "1b_drop":    load_clip_frames(os.path.join(MEDIA_DIR, "broll_1b_droplet.mp4")),
        "2a_consult": load_clip_frames(os.path.join(MEDIA_DIR, "broll_2a_consult.mp4")),
        "2b_barrier": load_clip_frames(os.path.join(MEDIA_DIR, "broll_2b_barrier.mp4")),
        "3a_lab":     load_clip_frames(os.path.join(MEDIA_DIR, "broll_3a_lab.mp4")),
        "3b_shield":  load_clip_frames(os.path.join(MEDIA_DIR, "broll_3b_shield.mp4")),
        "4a_herbs":   load_clip_frames(os.path.join(MEDIA_DIR, "broll_4a_herbs.mp4")),
        "4b_ltplus":  load_clip_frames(os.path.join(MEDIA_DIR, "broll_4b_ltplus.mp4")),
    }

    broll_spans, cap_groups, GOLD_WORDS, PINK_WORDS, STROKE_UP_WORDS = load_timeline_ltplus()

    NUMBERS = [
        ("LƯU Ý",     "1", 10.54, 13.25),
        ("LƯU Ý",     "2", 27.96, 31.25),
        ("GIẢI PHÁP", "3", 37.66, 41.45),
    ]
    KEYWORDS = [
        ("LO LẮNG?",      4.86,  7.05,  180, (255, 228, 130), (255, 255, 255)),
        ("CẦN KIỂM TRA",  17.90, 21.85, 148, (130, 252, 230), (242, 255, 252)),
        ("KHÁM PHỤ KHOA", 31.34, 33.82, 132, (255, 175, 212), (255, 245, 250)),
        ("LT PLUS",       43.74, 47.28, 195, (255, 218, 85),  (255, 245, 230)),
        ("3 NGÀY 1 LẦN",  52.56, 55.85, 152, (135, 250, 228), (245, 255, 252)),
        ("HỘP 15 VIÊN",   55.96, 60.50, 158, (255, 215, 90),  (255, 248, 230)),
        ("TÌM HIỂU RÕ",   64.28, 70.00, 158, (255, 182, 215), (255, 255, 255)),
    ]
    # Body floating tiles placed at LEFT lower side (cx=215, cy=1455) so the real LT PLUS box on right/hands is 100% unobstructed!
    TILE_PLACES = [
        ("clinic", 0.65,  4.50,  215, 305,  215, -10.0),
        ("hook2",  0.83,  4.50,  540, 240,  225,   0.0),
        ("ph",     1.01,  4.50,  865, 305,  215,  10.0),
        ("clinic", 18.10, 21.85, 215, 1455, 235,  -2.0),
        ("herbs",  31.40, 33.82, 215, 1455, 235,   2.0),
        ("open",   55.96, 60.50, 215, 1455, 242,  -2.0),
        ("box",    64.35, 69.95, 215, 1455, 242,   2.0),
    ]
    BURSTS = [
        (215, 305, 0.73, 68), (540, 240, 0.91, 74), (865, 305, 1.09, 68),
        (215, 1455, 18.20, 76), (215, 1455, 31.50, 76), (215, 1455, 56.06, 76), (215, 1455, 64.45, 76),
    ]

    legal_sp, _ = render_glow_text_sprite(
        "Sản phẩm không phải là thuốc, không có tác dụng thay thế thuốc chữa bệnh • Tham khảo ý kiến bác sĩ",
        FONT_SUB, 17, (235, 232, 236), glow_rad=0
    )

    reader_a = VideoReader(aroll_path)
    reader_m = subprocess.Popen(
        ["ffmpeg", "-v", "error", "-i", matte_path, "-f", "rawvideo", "-pix_fmt", "gray", "-"],
        stdout=subprocess.PIPE
    )

    raw_vid_out = os.path.join(PROJ_DIR, "_v3_video_only.mp4")
    writer = None
    if not test_mode:
        writer = subprocess.Popen([
            "ffmpeg", "-y", "-v", "error",
            "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", "30", "-i", "-",
            "-c:v", "libx264", "-crf", "16", "-preset", "fast", "-pix_fmt", "yuv420p",
            raw_vid_out
        ], stdin=subprocess.PIPE)

    # Precompute static coordinate grids for desk + product box foreground protection
    yy_g, xx_g = np.ogrid[0:H, 0:W]
    desk_line = np.clip((np.arange(H, dtype=np.float32) - 1545.0) / 55.0, 0.0, 1.0)[:, None]
    desk_box_mask = np.exp(-((np.maximum(0.0, np.abs(xx_g - 695.0) - 195.0)) / 42.0) ** 2) * \
                    np.clip((yy_g - 1315.0) / 45.0, 0.0, 1.0) * np.clip((1610.0 - yy_g) / 40.0, 0.0, 1.0)
    held_box_mask = np.exp(-((np.maximum(0.0, np.abs(xx_g - 640.0) - 230.0)) / 48.0) ** 2) * \
                    np.clip((yy_g - 1295.0) / 50.0, 0.0, 1.0) * np.clip((1630.0 - yy_g) / 45.0, 0.0, 1.0)

    frame_idx = 0
    while True:
        rgb = reader_a.read()
        mbuf = reader_m.stdout.read(W * H)
        if rgb is None or len(mbuf) < W * H:
            break
        if test_mode and frame_idx not in test_frames:
            frame_idx += 1
            if frame_idx > max(test_frames):
                break
            continue

        matte = np.frombuffer(mbuf, dtype=np.uint8).reshape((H, W)).astype(np.float32) / 255.0
        t = frame_idx / FPS

        # 1. Smooth Camera Zoom on original video + matte
        z = get_smooth_zoom(t)
        if z > 1.003:
            cw, ch = int(round(W / z)), int(round(H / z))
            x0 = max(0, min(W - cw, int(round(540 - cw * 0.5))))
            y0 = max(0, min(H - ch, int(round(680 - ch * (680.0 / H)))))
            frame_im = Image.fromarray(rgb[y0:y0+ch, x0:x0+cw], "RGB").resize((W, H), Image.Resampling.BILINEAR)
            matte_im = Image.fromarray((matte[y0:y0+ch, x0:x0+cw] * 255.0).astype(np.uint8), "L").resize((W, H), Image.Resampling.BILINEAR)
            fg_rgb = np.array(frame_im)
            m_arr = np.array(matte_im, dtype=np.float32) / 255.0
        else:
            frame_im = Image.fromarray(rgb, "RGB")
            fg_rgb = rgb
            m_arr = matte

        # 2. Keep normal background in normal talk; smoothly darken room background when animation appears!
        dim = get_bg_dim(t)
        if dim <= 0.005:
            comp_im = frame_im.convert("RGBA")
        else:
            bg_soft = frame_im.filter(ImageFilter.GaussianBlur(radius=5.0 * dim)) if dim > 0.08 else frame_im
            bg_arr = np.array(bg_soft, dtype=np.float32)
            bg_factor = 1.0 - 0.75 * dim
            bg_dimmed = np.zeros_like(bg_arr)
            # Subtle velvet plum-emerald studio tint when dimmed
            bg_dimmed[:, :, 0] = bg_arr[:, :, 0] * bg_factor * (1.0 - 0.04 * dim)
            bg_dimmed[:, :, 1] = bg_arr[:, :, 1] * bg_factor * (1.0 - 0.10 * dim)
            bg_dimmed[:, :, 2] = bg_arr[:, :, 2] * bg_factor * (1.0 - 0.02 * dim)
            comp_im = Image.fromarray(np.clip(bg_dimmed, 0, 255).astype(np.uint8), "RGB").convert("RGBA")

            # Behind-speaker Orbital Rings
            draw_rings_bg(comp_im, icon_ims, t, 52.56, 60.55)
            draw_rings_bg(comp_im, icon_ims, t, 64.28, 70.10)

            # Behind-speaker Numbers (1 / 2 / 3)
            for lbl, dig, t0, t1 in NUMBERS:
                env_n = smooth_in_out_env(t, t0, t1, d_in=0.38, d_out=0.35)
                if env_n > 0.01:
                    dt = t - t0
                    sc_l = 0.88 + 0.12 * ease_out_cubic(min(1.0, dt / 0.38))
                    gy_l = (1.0 - env_n) * 20.0
                    sp_l, _ = render_glow_text_sprite(lbl, FONT_TITLE, 102, (255, 185, 220), (255, 115, 175), glow_col=(255, 130, 185), glow_rad=14)
                    paste_centered(comp_im, sp_l, 240, 355 + gy_l, scale=sc_l, opacity=env_n)

                    if dt >= 0.06:
                        dt_d = dt - 0.06
                        u_d = ease_out_cubic(min(1.0, dt_d / 0.44))
                        sc_d = 0.84 + 0.16 * u_d
                        rot_d = -10.0 * (1.0 - u_d)
                        sp_d, _ = render_glow_text_sprite(dig, FONT_CAP, 525, (255, 225, 110), (255, 175, 215), glow_col=(255, 165, 205), glow_rad=22, stroke_col=(255, 245, 250), stroke_w=8)
                        paste_centered(comp_im, sp_d, 775, 545 + gy_l, scale=sc_d, opacity=env_n, angle=rot_d)

            # Behind-speaker Giant Keywords
            for kw_txt, t0, t1, fsz, c_top, c_bot in KEYWORDS:
                env_k = smooth_in_out_env(t, t0, t1, d_in=0.40, d_out=0.36)
                if env_k > 0.01:
                    dt = t - t0
                    sc_k = 0.90 + 0.10 * ease_out_cubic(min(1.0, dt / 0.40))
                    gy_k = (1.0 - env_k) * 22.0
                    sw_p = (dt / max(0.3, t1 - t0)) * 1.25 - 0.12
                    sp_k, _ = render_glow_text_sprite(kw_txt, FONT_TITLE, fsz + 10, c_top, c_bot, glow_col=c_top, glow_rad=12)
                    paste_centered(comp_im, sp_k, 540, 445 + gy_k, scale=sc_k, opacity=env_k, sweep_prog=sw_p)

            # Composite real speaker + real desk & LT PLUS box smoothly in front!
            cur_box = held_box_mask if t >= 38.0 else desk_box_mask
            fg_alpha = np.maximum(m_arr, np.maximum(desk_line, cur_box * 0.96))
            fg_lit = np.clip(fg_rgb.astype(np.float32) * (1.0 - 0.06 * dim), 0, 255).astype(np.uint8)
            comp_im = Image.alpha_composite(comp_im, Image.fromarray(np.dstack([fg_lit, (fg_alpha * 255.0).astype(np.uint8)]), "RGBA"))

        # 3. Front Hook Animation (0.05 - 4.55s) — 100% Face-Safe & TikTok Moderation-Safe!
        env_hook = smooth_in_out_env(t, 0.05, 4.55, d_in=0.35, d_out=0.35)
        if env_hook > 0.01:
            if t >= 0.05:
                u1 = ease_out_cubic(min(1.0, (t - 0.05) / 0.36))
                sp_h1, _ = render_glow_text_sprite("Dấu hiệu bất thường", FONT_WIDE, 62, (145, 245, 255), (85, 195, 255), glow_col=(85, 205, 255), glow_rad=13)
                paste_centered(comp_im, sp_h1, 540, 1095 + (1.0 - u1) * 24.0, scale=0.86 + 0.14 * u1, opacity=env_hook * u1)
            if t >= 0.46:
                u2 = ease_out_cubic(min(1.0, (t - 0.46) / 0.38))
                sp_h2, _ = render_glow_text_sprite("PHẢI", FONT_WIDE, 102, (255, 228, 80), (255, 135, 65), glow_col=(255, 175, 55), glow_rad=16)
                paste_centered(comp_im, sp_h2, 240, 1215 + (1.0 - u2) * 26.0, scale=0.84 + 0.16 * u2, opacity=env_hook * u2)
            if t >= 0.72:
                u3 = ease_out_cubic(min(1.0, (t - 0.72) / 0.40))
                sp_h3, _ = render_glow_text_sprite("Lộ Tuyến?", FONT_SCRIPT, 116, (255, 165, 215), (255, 95, 165), glow_col=(255, 120, 185), glow_rad=18, stroke_col=(255, 242, 248), stroke_w=2)
                paste_centered(comp_im, sp_h3, 708, 1222 + (1.0 - u3) * 26.0, scale=0.84 + 0.16 * u3, opacity=env_hook * u3)
            if t >= 2.72:
                u4 = ease_out_cubic(min(1.0, (t - 2.72) / 0.36))
                sp_h4, _ = render_glow_text_sprite("Chưa thể đoán chỉ qua bên ngoài!", FONT_CAP, 50, (255, 255, 255), (185, 255, 240), glow_col=(110, 247, 226), glow_rad=12)
                paste_centered(comp_im, sp_h4, 540, 1332 + (1.0 - u4) * 20.0, scale=0.90 + 0.10 * u4, opacity=env_hook * u4)

        # 4. Smooth Floating Icon Tiles + Bursts
        for ikey, t0, t1, cx, cy, sz, rot in TILE_PLACES:
            env_t = smooth_in_out_env(t, t0, t1, d_in=0.42, d_out=0.36)
            if env_t > 0.01:
                dt = t - t0
                u_in = ease_out_cubic(min(1.0, dt / 0.45))
                cur_y = cy + (1.0 - u_in) * (85.0 if cy < 400 else 140.0) - (1.0 - env_t) * (0.0 if dt < 0.5 else 22.0)
                cur_sc = 0.75 + 0.25 * env_t
                tile_im = render_tile_frame(icon_ims, ikey, sz, t)
                paste_centered(comp_im, tile_im, cx, cur_y, scale=cur_sc, opacity=env_t, angle=rot)

        for bx, by, bt0, bdiam in BURSTS:
            draw_burst(comp_im, bx, by, t, bt0, bdiam)

        # 5. Smooth Synergy Frosted Glass Bar (41.52 - 47.28s)
        draw_synergy_bar(comp_im, icon_ims, t, 41.52, 47.28)

        # 6. Word-by-Word Glowing Captions (strictly y=1130..1196 on dark navy chest: 100% Face-Safe & Box-Safe!)
        for g in cap_groups:
            if g["t0"] <= t < g["t1"]:
                op_g = smoothstep((g["t1"] - t) / 0.26) if (g["t1"] - t) < 0.26 else 1.0
                y_base = 1130
                lh = 66
                for li, ln in enumerate(g["lines"]):
                    word_renders = []
                    total_w = 0
                    gap = 18
                    for wi, (wtxt, ws, we) in enumerate(ln):
                        k = 1.22 if (wtxt in GOLD_WORDS or wtxt in PINK_WORDS) else 1.0
                        col = (255, 224, 75) if wtxt in GOLD_WORDS else ((255, 148, 205) if wtxt in PINK_WORDS else (110, 247, 226))
                        sp, _ = render_glow_text_sprite(wtxt, FONT_CAP, 64 * k, col, glow_col=col, glow_rad=12)
                        adv = int(ImageDraw.Draw(comp_im).textlength(wtxt, font=get_font(FONT_CAP, 64 * k)))
                        word_renders.append((wtxt, ws, sp, adv, col, k))
                        total_w += adv + (gap if wi > 0 else 0)

                    cur_x = 540 - total_w // 2
                    cur_y = y_base + li * lh
                    for wtxt, ws, sp, adv, col, k in word_renders:
                        if t >= ws:
                            dt_w = t - ws
                            u_w = ease_out_cubic(min(1.0, dt_w / 0.26))
                            wy = cur_y + (1.0 - u_w) * 22.0
                            blur_w = (1.0 - u_w) * 6.0
                            wcx = cur_x + adv // 2
                            paste_centered(comp_im, sp, wcx, wy, scale=0.92 + 0.08 * u_w, opacity=op_g * u_w, blur_px=blur_w)

                            if wtxt in STROKE_UP_WORDS and 0.08 <= dt_w <= 0.48:
                                u_su = (dt_w - 0.08) / 0.40
                                sc_su = 1.0 + 1.15 * ease_out_cubic(u_su)
                                op_su = smoothstep(1.0 - u_su) * 0.80 * op_g
                                sp_su, _ = render_glow_text_sprite(wtxt, FONT_CAP, 64 * k, (0, 0, 0), glow_col=col, glow_rad=8, stroke_col=(255, 240, 248), stroke_w=3)
                                paste_centered(comp_im, sp_su, wcx, cur_y, scale=sc_su, opacity=op_su)
                        cur_x += adv + gap
                break

        # 7. Smooth Crossfading Dual-Layer Split B-Roll Cards (2 distinct clips per card, 0% distortion!)
        for st, en, top_k, bot_k, b_sm, b_bg in broll_spans:
            if st <= t <= en:
                dt = t - st
                tc = broll_clips[top_k]
                bc = broll_clips[bot_k]
                top_f = tc[min(len(tc) - 1, int(dt * FPS))]
                bot_f = bc[min(len(bc) - 1, int(dt * FPS))]
                comp_im = render_split_broll_v3(comp_im, top_f, bot_f, t, st, en, b_sm, b_bg)
                break

        # 8. Fixed Legal Bar at bottom
        bar_bot = Image.new("RGBA", (W, 54), (18, 8, 14, 175))
        comp_im.alpha_composite(bar_bot, dest=(0, H - 54))
        paste_centered(comp_im, legal_sp, 540, H - 27, opacity=0.92)

        if test_mode:
            tp = os.path.join(CHECK_DIR, f"v3_test_{len(test_saved):02d}.png")
            comp_im.convert("RGB").save(tp)
            test_saved.append(tp)
            frame_idx += 1
            continue

        writer.stdin.write(np.array(comp_im.convert("RGB"), dtype=np.uint8).tobytes())
        frame_idx += 1
        if frame_idx % 300 == 0:
            el = time.time() - t_start
            print(f"  Rendered {frame_idx}/2112 frames ({frame_idx / el:.1f} fps)", flush=True)

    if writer:
        writer.stdin.close()
        writer.wait()
    reader_a.close()
    reader_m.stdout.close()
    reader_m.wait()
    print(f"Done LT PLUS video: {frame_idx} frames in {time.time() - t_start:.1f}s")

if __name__ == "__main__":
    main()
