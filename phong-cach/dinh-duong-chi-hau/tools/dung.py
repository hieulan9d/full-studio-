# -*- coding: utf-8 -*-
"""Dung video "dinh duong chi Hau": noi clip nguoi dan, chen canh minh hoa, chen the chu.

  python -X utf8 -B dung.py plan.json -o ra.mp4

Duong dan trong plan.json tinh tu thu muc chua plan.json. Dinh dang plan: xem ../AGENTS.md.
Can: ffmpeg, ffprobe, Pillow; font Be Vietnam Pro ExtraBold."""
import argparse, json, os, subprocess, sys, tempfile

from PIL import Image, ImageDraw, ImageFont

W, H, FPS, LUFS = 1080, 1920, 24, -15.5
CARD_X, CARD_W, CARD_Y, PAD = 59, 790, 1049, 29          # so do tu video mau
FILL, EDGE = (25, 33, 22, 190), (214, 206, 178, 200)
WHITE, YELLOW = (255, 255, 252), (252, 227, 131)
FADE_IN, FADE_OUT = 0.29, 0.25
FONT_DIRS = ["C:/Windows/Fonts", os.path.join(os.environ.get("LOCALAPPDATA", ""), "Microsoft/Windows/Fonts")]
IMAGES = (".png", ".jpg", ".jpeg", ".webp")


def font(size):
    for d in FONT_DIRS:
        p = os.path.join(d, "BeVietnamPro-ExtraBold.ttf")
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    sys.exit("Thieu font BeVietnamPro-ExtraBold.ttf")


def fit(text, size, width):
    while font(size).getlength(text) > width and size > 30:
        size -= 1
    if font(size).getlength(text) > width:
        sys.exit(f"Chu qua dai, hay xuong dong: {text}")
    return font(size)


def card(draw, xy):
    draw.rounded_rectangle(xy, 26, fill=FILL, outline=EDGE, width=2)


def lines_card(draw, lines, y, x=CARD_X, w=CARD_W):
    """Dong dau trang 47 px, cac dong sau vang 55 px; mot dong thi trang."""
    h = 177 + 75 * max(0, len(lines) - 2) if len(lines) > 1 else 104
    card(draw, [x, y, x + w, y + h])
    base = y + 66
    for i, s in enumerate(lines):
        draw.text((x + PAD, base), s, font=fit(s, 47 if i == 0 else 55, w - 2 * PAD),
                  fill=WHITE if i == 0 else YELLOW, anchor="ls")
        base += 75


def render_text(item, path):
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    kind, y = item["kieu"], item.get("y", CARD_Y)
    if kind in ("hook", "the"):
        lines_card(d, item["dong"], y)
    elif kind == "quy-doi":                                  # A -> B, xep doc
        card(d, [CARD_X, y - 80, CARD_X + CARD_W, y + 200])
        cx = CARD_X + CARD_W / 2
        d.text((cx, y - 12), item["tren"], font=fit(item["tren"], 47, CARD_W - 60), fill=WHITE, anchor="ms")
        d.line([cx, y + 18, cx, y + 78], fill=YELLOW, width=8)
        d.polygon([(cx - 22, y + 70), (cx + 22, y + 70), (cx, y + 102)], fill=YELLOW)
        d.text((cx, y + 170), item["duoi"], font=fit(item["duoi"], 55, CARD_W - 60), fill=YELLOW, anchor="ms")
    elif kind == "hai-bang":
        for x, s, col in ((59, item["trai"], WHITE), (555, item["phai"], YELLOW)):
            card(d, [x, y, x + 466, y + 120])
            d.text((x + 233, y + 78), s, font=fit(s, 50, 420), fill=col, anchor="ms")
    else:
        sys.exit(f"Kieu chu khong ho tro: {kind}")
    im.save(path)


def probe(path):
    out = subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration:stream=codec_type",
                                   "-of", "json", path])
    j = json.loads(out)
    return float(j["format"].get("duration", 0)), any(s["codec_type"] == "audio" for s in j["streams"])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("plan")
    ap.add_argument("-o", "--out", required=True)
    a = ap.parse_args()
    base = os.path.dirname(os.path.abspath(a.plan))
    plan = json.load(open(a.plan, encoding="utf-8-sig"))

    def path(p):
        full = p if os.path.isabs(p) else os.path.join(base, p)
        if not os.path.exists(full):
            sys.exit(f"Khong thay tep: {full}")
        return full

    fill = f"scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},setsar=1,fps={FPS}"
    inputs, chains, joined, total, n = [], [], "", 0.0, 0
    for k, seg in enumerate(plan["doan"]):                   # truc chinh: clip nguoi dan noi tiep
        f = path(seg["file"])
        dur, has_audio = probe(f)
        start, end = seg.get("tu", 0.0), seg.get("den") or dur
        length = round(min(end, dur) - start, 3)
        if length <= 0:
            sys.exit(f"Doan rong: {seg['file']}")
        inputs += ["-ss", f"{start}", "-t", f"{length}", "-i", f]
        chains.append(f"[{n}:v]{fill},tpad=stop_mode=clone:stop_duration=1,trim=0:{length},setpts=PTS-STARTPTS[v{k}]")
        src = f"[{n}:a]aresample=48000,aformat=channel_layouts=stereo,apad" if has_audio else \
            "anullsrc=r=48000:cl=stereo"
        chains.append(f"{src},atrim=0:{length},asetpts=PTS-STARTPTS,afade=t=in:d=0.01,"
                      f"afade=t=out:st={max(0, length - 0.01):.3f}:d=0.01[a{k}]")
        joined += f"[v{k}][a{k}]"
        total += length
        n += 1
    chains.append(f"{joined}concat=n={len(plan['doan'])}:v=1:a=1[base][spine]")
    last = "base"

    for k, ins in enumerate(plan.get("chen", [])):           # canh minh hoa de len, giu tieng truc chinh
        f = path(ins["file"])
        t, end = ins["t"], min(ins["den"], total)
        if f.lower().endswith(IMAGES):
            inputs += ["-loop", "1", "-t", f"{end - t:.3f}", "-i", f]
        else:
            if probe(f)[0] - ins.get("tu", 0.0) < end - t - 0.05:
                sys.exit(f"Canh chen ngan hon khoang can phu: {ins['file']}")
            inputs += ["-ss", f"{ins.get('tu', 0.0)}", "-t", f"{end - t:.3f}", "-i", f]
        chains.append(f"[{n}:v]{fill},setpts=PTS-STARTPTS+{t}/TB[i{k}]")
        chains.append(f"[{last}][i{k}]overlay=eof_action=pass:enable='between(t,{t},{end - 0.001:.3f})'[b{k}]")
        last = f"b{k}"
        n += 1

    tmp = tempfile.mkdtemp(prefix="chihau_")
    for k, item in enumerate(plan.get("chu", [])):
        png = os.path.join(tmp, f"chu{k}.png")
        render_text(item, png)
        t, end = item["t"], min(item["den"], total)
        inputs += ["-loop", "1", "-framerate", str(FPS), "-t", f"{end:.3f}", "-i", png]
        chains.append(f"[{n}:v]format=rgba,fade=t=in:st={t}:d={FADE_IN}:alpha=1,"
                      f"fade=t=out:st={max(t, end - FADE_OUT):.3f}:d={FADE_OUT}:alpha=1[t{k}]")
        chains.append(f"[{last}][t{k}]overlay=eof_action=pass:enable='between(t,{t},{end})'[c{k}]")
        last = f"c{k}"
        n += 1

    audio = "[spine]"
    if plan.get("giong"):                                    # giong thu rieng thay tieng clip
        f = path(plan["giong"])
        dur = probe(f)[0]
        if dur > total + 0.05:
            sys.exit(f"Giong dai {dur:.2f}s hon hinh {total:.2f}s: them hoac keo dai doan")
        inputs += ["-i", f]
        chains.append(f"[spine]anullsink;[{n}:a]aresample=48000,aformat=channel_layouts=stereo,apad,"
                      f"atrim=0:{total:.3f}[voice]")
        audio = "[voice]"
    chains.append(f"{audio}loudnorm=I={LUFS}:TP=-1.5:LRA=11,aresample=48000[mix]")

    cmd = ["ffmpeg", "-v", "error", "-y"] + inputs + [
        "-filter_complex", ";".join(chains), "-map", f"[{last}]", "-map", "[mix]", "-t", f"{total:.3f}",
        "-c:v", "libx264", "-crf", "18", "-pix_fmt", "yuv420p", "-r", str(FPS),
        "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", a.out]
    if subprocess.run(cmd).returncode:
        sys.exit("ffmpeg loi khi xuat")
    print(f"XONG {a.out}: {total:.2f}s, {len(plan['doan'])} doan, {len(plan.get('chen', []))} canh chen, "
          f"{len(plan.get('chu', []))} the chu")


if __name__ == "__main__":
    main()
