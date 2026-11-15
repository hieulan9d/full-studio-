# 02 — Nhịp, ease, chuyển cảnh, âm thanh

## 1. Đặt mốc cảnh theo nhạc

Video mẫu: 117,5 BPM (1 phách 0,51 s). Tiếng nhấn mạnh rơi đều mỗi 2 phách (~1,02 s):
0,98 · 3,02 · 4,04 · 5,06 · 7,08 · 8,10 · 9,13 · 11,15 · 12,17 · 13,19 · 15,21 · 16,16.
**Mọi lần đổi cảnh đều đặt đúng trên tiếng nhấn** — đây là lý do video "đã" mắt.

Cách làm:
1. Có nhạc: `ffmpeg -i music.mp3 -ac 1 -ar 22050 m.wav && python -I tools/beats.py m.wav` → lấy
   `scene grid` (mỗi 2 phách). Không có nhạc: lưới 120 BPM, mốc mỗi 1,0 s.
2. Mỗi cảnh dài 2–4 ô lưới (≈ 2–4 s). Cảnh "khoe" (dashboard, chat) 3–4 ô; cảnh nối (vòng, ngôi sao) 1–2 ô.
3. Mốc vào cảnh = mốc lưới. Chuyển động chính trong cảnh cũng rơi trên phách (0,5 s).
4. Phần tử phụ so le lệch phách (0,07–0,4 s) để không đồng loạt.

Phân bổ mẫu cho 20 s (theo NeuraFlow):

| Cảnh | Giây | Ô lưới |
|---|---|---|
| Logo | 0–1,0 | 1 |
| Dashboard dâng + tiêu đề + số đếm | 1,0–4,0 | 3 |
| Zoom out + đổi nội dung | 4,0–7,0 | 3 |
| Vòng "New Updates" | 7,0–9,1 | 2 |
| Chat AI | 9,1–13,1 | 4 |
| Trụ thẻ 3D | 13,1–16,2 | 3 |
| Ngôi sao morph | 16,2–17,4 | 1 |
| End card | 17,4–20,0 | 2–3 |

15 s: bỏ vòng "New Updates" và rút chat còn 3 ô. 30 s: thêm 1–2 cảnh tính năng (xem 03).

## 2. Ease (đặt bằng `H.anim(prop, times, values, style)`)

| style | Ý nghĩa | Influence out / in | Dùng cho |
|---|---|---|---|
| `snap` | lao nhanh, phanh êm | 8 / 92 | **mặc định** — UI, chữ, thẻ vào cảnh |
| `smooth` | Easy Ease | 33 / 33 | bounce, chuyển động ngắn |
| `soft` | chậm–chậm | 80 / 80 | camera trôi, xoay chậm, quầng sáng thở |
| `accel` | chậm rồi tăng tốc | 92 / 8 | thoát khỏi khung, scale lấp màn, blur ra |
| `linear` | đều | — | quay quỹ đạo, gõ chữ, lấy mẫu dày |

Bounce (`H.pop`): từ → vượt 8–15% → đích trong 0,4–0,5 s, đoạn đầu lao nhanh. Chỉ cho vật nhỏ.

## 3. Thời lượng chuẩn

| Chuyển động | Thời gian |
|---|---|
| Chữ blur-in | 0,4–0,45 s (blur 25–30 → 0) |
| Cửa sổ/thẻ lớn vào | 0,5–0,6 s, snap |
| Chip/icon bật ra | 0,5 s, pop vượt 8–10% |
| Số đếm | 1,0–1,6 s, snap (chậm dần về cuối) |
| Gõ chữ | ~0,025 s/ký tự (26 ký tự ≈ 0,65 s) |
| Camera trôi | cả cảnh, soft, scale +3–4% |
| Blur thoát cảnh | 0,22–0,25 s, accel, blur 0→40 |
| Uốn dải thẻ thành vòng | 0,85 s, 10 mẫu, ease 1−(1−u)³ |

## 4. Chuyển cảnh (không cắt cứng)

| Kiểu | Cách | Dùng khi |
|---|---|---|
| Blur thoát + vào | cảnh A blur 0→40 (0,25 s), cảnh B blur-in | mặc định |
| Camera lùi | cửa sổ thu từ 100% → 55% + panel nền hiện | dashboard → tổng quan |
| Vật dẫn | logo trượt xuống, cửa sổ dâng lên che | logo → app |
| Vòng sáng | màn tối, vòng kính phóng 135%→100% | sang chương mới |
| Morph hình | sao 4 cánh nuốt cảnh (track matte) → thu thành icon | về logo kết |
| Uốn liên tục | một bộ vật thể đổi dạng liên tục | thẻ phẳng → trụ |

Chồng 0,1–0,2 s giữa hai cảnh trong MAIN (opacity cảnh trước 100→0 trong 0,15 s).

## 5. SFX (khi có `assets/sfx/`)

Đặt layer âm thanh trong `04_SFX`, tên `SFX_<loại>_<cảnh>`, đầu file ở đúng frame chuyển động:

| Chuyển động | SFX | Ghi chú |
|---|---|---|
| Cửa sổ/khối lớn vào | whoosh mềm (2–3 lớp chồng, lệch 2 frame) | vào trước đỉnh chuyển động ~3 frame |
| Chip/icon bật | pop / click nhẹ | |
| Gõ chữ | typing ngắn | dài bằng đoạn gõ |
| Gửi tin | swoosh nhỏ | |
| Số đếm | tick nhỏ dồn | tuỳ chọn |
| Chuyển cảnh vòng/morph | riser → impact trên mốc lưới | |
| Logo kết | sparkle + impact trầm | |

Âm lượng: nhạc −14 đến −18 LUFS dưới SFX; fade nhạc 1–1,5 s cuối.
