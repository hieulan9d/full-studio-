# Vẽ 5 icon PNG trong suốt 1080x1080 (vẽ x2 rồi thu nhỏ cho mượt)
import math, os
from PIL import Image, ImageDraw
OUT = 'E:/file cap cut/CapCut Drafts/1117-v2/icons'; os.makedirs(OUT, exist_ok=True)
S = 2160; W = 1080
RED, GOLD, DARK, GREEN, BROWN, TAPE, WHITE = (214, 40, 57), (255, 200, 60), (40, 40, 48), (46, 184, 92), (176, 126, 78), (240, 214, 150), (255, 255, 255)
def new(): im = Image.new('RGBA', (S, S), (0, 0, 0, 0)); return im, ImageDraw.Draw(im)
def save(im, n): im.resize((W, W), Image.LANCZOS).save(f'{OUT}/{n}.png')
def shadow(d, box, r=60):  # bóng nhẹ
    d.rounded_rectangle(box, r, fill=(0, 0, 0, 70))
def star(d, cx, cy, R, col):
    pts = []
    for i in range(8):
        a = math.pi / 4 * i - math.pi / 2; r = R if i % 2 == 0 else R * 0.28
        pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    d.polygon(pts, fill=col)
# 1. hộp quà
im, d = new(); shadow(d, (480, 700, 1700, 1640)); 
d.rounded_rectangle((440, 900, 1720, 1700), 70, fill=RED); d.rounded_rectangle((380, 720, 1780, 960), 60, fill=(235, 62, 78))
d.rectangle((1020, 720, 1140, 1700), fill=GOLD)
d.ellipse((780, 380, 1090, 760), outline=GOLD, width=90); d.ellipse((1070, 380, 1380, 760), outline=GOLD, width=90)
d.ellipse((1000, 660, 1160, 820), fill=GOLD); star(d, 1620, 520, 150, GOLD); star(d, 560, 460, 100, (255, 235, 150)); save(im, 'gift')
# 2. thùng carton + băng keo
im, d = new(); shadow(d, (420, 760, 1740, 1740))
d.polygon([(420, 760), (1740, 760), (1640, 560), (520, 560)], fill=(204, 150, 98)); d.rounded_rectangle((420, 760, 1740, 1700), 30, fill=BROWN)
d.rectangle((1000, 560, 1160, 1700), fill=TAPE); d.rectangle((1000, 560, 1160, 760), fill=(226, 196, 130))
d.rounded_rectangle((520, 1240, 880, 1500), 24, fill=(250, 240, 215)); d.line((580, 1330, 820, 1330), fill=(130, 90, 55), width=26); d.line((580, 1410, 760, 1410), fill=(130, 90, 55), width=26); save(im, 'box')
# 3. dấu tích tròn
im, d = new(); d.ellipse((380, 380, 1780, 1780), fill=GREEN); d.ellipse((380, 380, 1780, 1780), outline=(255, 255, 255, 255), width=50)
d.line([(760, 1100), (980, 1320), (1420, 800)], fill=WHITE, width=150, joint='curve')
for p in [(760, 1100), (980, 1320), (1420, 800)]: d.ellipse((p[0] - 75, p[1] - 75, p[0] + 75, p[1] + 75), fill=WHITE)
save(im, 'check')
# 4. xe tải giao hàng
im, d = new(); shadow(d, (260, 700, 1920, 1560))
d.rounded_rectangle((260, 640, 1300, 1450), 40, fill=(255, 255, 255)); d.rounded_rectangle((260, 640, 1300, 780), 40, fill=RED)
d.polygon([(1300, 820), (1620, 820), (1900, 1130), (1900, 1450), (1300, 1450)], fill=(235, 62, 78)); d.polygon([(1380, 890), (1580, 890), (1760, 1110), (1380, 1110)], fill=(190, 230, 250))
for cx in (640, 1560): d.ellipse((cx - 190, 1290, cx + 190, 1670), fill=DARK); d.ellipse((cx - 85, 1385, cx + 85, 1575), fill=(200, 200, 210))
for y in (900, 1020, 1140): d.line((100, y, 220, y), fill=(255, 255, 255, 200), width=34)
save(im, 'truck')
# 5. trái tim + lấp lánh
im, d = new(); d.ellipse((460, 520, 1100, 1160), fill=RED); d.ellipse((1060, 520, 1700, 1160), fill=RED)
d.polygon([(480, 960), (1680, 960), (1080, 1740)], fill=RED); d.ellipse((600, 620, 760, 780), fill=(255, 140, 150))
star(d, 1760, 520, 170, GOLD); star(d, 420, 1500, 120, GOLD); star(d, 1700, 1560, 90, (255, 235, 150)); save(im, 'heart')
print(os.listdir(OUT))
