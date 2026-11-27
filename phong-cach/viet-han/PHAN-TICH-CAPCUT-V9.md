# Phân tích chi tiết bản CapCut hoàn chỉnh v9 (người dùng tự làm, 2026-11-20)

Nguồn: `viet-han-kham-mien-phi-261119-v9/draft_content.json` (clip ghép lồng nhau). Dữ liệu đọc từ file, không nghe được âm thanh nên **âm sắc SFX chỉ suy từ tên file + đo phổ**.
Tệp kèm: `capcut-animations.json` (mã resource animation), `capcut-mask-rect.json` (mẫu mask chữ nhật bo góc).

## 1. Chữ: công thức theo loại (đơn vị cỡ chữ CapCut, 1 đơn vị ≈ 6,5 px)

| Loại | Màu chữ | Nền / viền / glow | Cỡ | Animation vào (0,5 s) | Loop | Keyframe |
|---|---|---|---|---|---|---|
| **Chữ hook nhỏ trắng "Nha Trang"** | đỏ `#EC1D1D` | viền trắng 0,06, không nền | 17,2 × scale 1,41 | Hình chiếu đập thẳng | — | pop 0,5→1,08→1 |
| **Pill hook lớn** "MIỄN PHÍ 100%"/"GÓI KHÁM SỨC KHỎE" | xanh `#239555` (dòng 1, 17,2), đỏ `#E0302E` (dòng 2, 12,3) | nền vàng `#FFE003` **bo 0,18**, glow trắng (alpha 0,77, khoảng cách 4, góc -101°, smoothing 0,63) | 17,2/12,3 | Sóng âm 0,33 s | Phóng to chữ | chỉ alpha |
| **Dòng phụ hook** "Đa Khoa Quốc Tế Việt Hàn" | đỏ | viền trắng 0,06 + glow trắng mảnh (alpha 0,62, góc -27°) | 10,3 | Nhiễu sóng 0,37 s | Phóng to chữ | alpha |
| **"BAO GỒM"** (pill) | xanh lá `#00B20A` + xanh `#239555` | nền vàng bo 0,18, glow trắng gần đặc (alpha 0,99, d 5,9, góc -32°) | 12,3/17,2 | Bật lên 0,53 s | **Lắc lư 2** | alpha |
| **Pill tiêu đề bảng/cảnh** | xanh | nền vàng **bo 0,5**, không glow | 7,7–9,5 (scale 1,0–1,14) | không gán | không | pop + alpha (không animation CapCut) |
| **Khung hạn chế (dòng đỏ)** "CHỈ NHẬN 60 SUẤT/NGÀY" | đỏ | viền trắng 0,06, không nền | 9,5 | Phép màu dưới trăng | (bản 60 SUẤT/NGÀY: + Phóng to chữ @0,5 s) | pop trễ 0,13 s |
| **Dòng xanh phụ** "ĐẾN HẾT 31/12" | xanh lá `#2FA84F` | viền trắng 0,06 | 9,2 | Con trỏ mở ra | — | pop |
| **CTA pill chính** "CUỐI NĂM RỒI", "DẪN CẢ GIA ĐÌNH…", "GỌI NGAY/số" | xanh + số đỏ | nền vàng bo 0,18, glow trắng (alpha 0,7–0,96, d 5, góc -45°, smoothing 0,45) | 12,9 / 10,1 / 10,8+14,2 | Ép đỏ-I / Bật lên / Loại 1 | Phóng to chữ (số điện thoại bắt đầu 0,5 s) | pop + nhịp thở 1,0↔1,07 mỗi 0,7 s |
| **Chip phụ** | **trắng** | nền đỏ `#E0302E` hoặc xanh `#249A55`, bo 0,18, rộng 0,1, cao 0,14–0,15; glow đen mờ (alpha 0,26) | 6,2–7,4 | Trượt hoạt hình / Bật thẳng lên / Sóng nảy | không | pop |
| **Nhãn dưới ô** | trắng; từ nhấn **vàng `#FFE003`** | viền xanh đậm `#004D33` **0,12**, không nền | 5,2 × scale 1,16–1,54 | **Sóng âm** | không | pop |
| **Từ khoá giữa màn** | trắng + từ nhấn vàng | viền xanh đậm 0,12 | 8,3 × 1,09–1,11 | Máy đánh chữ retro / Xe điện đụng (từ khoá đầu); các từ sau chỉ pop | không | pop |
| **Thẻ giá** "MỖI DỊCH VỤ CHỈ / 90.000Đ" | xanh nhãn (6,8) + số đỏ (15,4) | **hai lớp**: nền trắng + một lớp nền xanh lá `#007706` bo 0,17/0,3 ngay sau (tạo viền), không glow | 6,8/15,4, scale 0,91–1,0 | Con trỏ mở ra | — | pop |

Nguyên tắc rút ra:
- **Chữ chính (hook, CTA, giá, số) = animation CapCut + loop "Phóng to chữ"; chữ phụ (nhãn, tiêu đề bảng) = keyframe pop, thêm "Sóng âm" cho nhãn.** Không gán animation CapCut cho tiêu đề bảng.
- **Glow trắng chỉ dùng cho pill vàng lớn** (alpha 0,55–0,99): tạo "ánh sáng" quanh pill; góc -45°…-101°, khoảng cách 4–12, smoothing 0,4–0,63.
- Bo góc: pill nhỏ tiêu đề = 0,5 (viên thuốc), pill hook/CTA = 0,18 (chữ nhật bo vừa), thẻ giá = 0,17–0,3.
- Chiều cao nền (`background_height`) rất thấp (0,02–0,06) khi chữ nhiều dòng vì CapCut tự mở rộng theo chữ; chữ một dòng dùng 0,22.
- Thời lượng vào của animation CapCut: 0,33–0,53 s; keyframe pop chạy 0,22 s; mờ ra 0,13 s cuối.
- Mọi chữ xếp **theo đúng từ khoá trong lời** (nhãn ô trễ so với từ vài chục ms; tiêu đề bảng trễ thêm 0,07 s ở bảng đầu).
- Chữ cuối đoạn: pill "MỘT LẦN CHO AN TÂM" và "CHƯA ĐI KHÁM SỨC KHỎE?" là hai chip trắng-trên-màu bổ sung ý, xuất hiện **trước** pill chính (không đè).
- "Địa chỉ / 36 Phan Chu Trinh…" ở đoạn kết 53,1–54,7 s (Sóng âm + Phóng to chữ, cỡ 6,2 × 1,93, viền trắng 0,06).

## 2. Cảnh X-quang / siêu âm (người dùng dựng thêm, không có trong máy)

Ba clip nhỏ **thẻ thu nhỏ (scale 0,42–0,61) có mask "Hình chữ nhật" bo góc `roundCorner` 0,17** (xem `capcut-mask-rect.json`: width/height ≈ 1, feather 0, invert false), trượt vào/ra bằng keyframe vị trí/scale theo lời:
- `IMG_9217.MOV` (X-quang): vào giữa (scale 1 → 0,606 ở +0,33 s) rồi **trượt trái-lên (x -0,58, y 0,13) và co về 0,42** ở lời kế.
- `261119 may anh (37)` (siêu âm): **bay vào từ phải** (x 1,108 → 0 trong 0,24 s, scale 0,42 → 0,61), nằm giữa 0,8 s, rồi **lùi về trái** x -0,58 (y 0,128, scale 0,42).
- `siêu âm bụng cổ (9)`: bay từ phải (x 1,42 → 0,887) rồi **giữa**, rồi **phóng toàn màn** (scale → 1,0 trong 0,27 s) ở "tuyến giáp".
Kết quả: ba thẻ **xếp chồng/lần lượt** ra theo ba từ khoá "X-quang phổi / Siêu âm bụng / Siêu âm tuyến giáp", cuối cùng một cái phóng đầy màn. Các keyframe đều `Line`, nhịp 0,1–0,3 s. Mẫu "bảng slide" thứ hai của kit.

## 3. Hình: màu và người dẫn
- **Chỉnh màu từng clip B-roll** (đều qua mục Điều chỉnh): `brightness` +0,16…+0,25, `contrast` -0,14…+0,08, `saturation` +0,07…+0,10, `highlight` +0,11…+0,19, `shadow` -0,12…+0,27 (tuỳ clip), `temperature` **-0,07…-0,29** (lạnh hơn, chống ám vàng phòng khám), `light_sensation` +0,10…+0,23, `tone` ~+0,07–0,09. Clip tối: tăng brightness mạnh.
- **Nền hex** (video của người dùng) giảm sáng nhẹ: brightness -0,08, black -0,13, light_sensation -0,27, `smart_color_adjust` 0,8.
- **Người dẫn** có hiệu ứng làm đẹp: **Làm trắng 0,47, Làm mịn 0,31**, Xóa vết thâm 0,22, Xóa quầng thâm mắt 0,12, Đầy đặn 0,15, Xóa nhăn 0,32, Căng da mặt 0,3, Làm trắng răng 0,42, Làm đều màu da 0,07 + chỉnh màu (brightness +0,13, contrast -0,14, saturation +0,09, temperature -0,10, light_sensation +0,20, smart_color_adjust 0,175). Cho thấy mặt nhân vật được làm sáng/mịn nhẹ.
- **Người dẫn phóng 112% (đầu), 108,6–116% (cuối)** với keyframe: vị trí 0, scale 1,0 → 1,05 (0,1 s) giữ → 1,12 (0,06 s cuối) (đẩy vào nhẹ ở nhịp cuối câu).
- Cảnh bác sĩ (4) phóng 103,3% (đẩy nhẹ).

## 4. SFX: tên thật, vai trò, mức, thời điểm (phổ đo bằng FFT 22 kHz)

| Thời điểm | SFX (tên file) | Dài | Mức | Phổ/đặc tính | Vai trò |
|---|---|---|---|---|---|
| 0,00 | `Chan.mp3` (cắt từ 0,17 s) | 1,8 s | 100% | tâm 1,5 kHz, tấn công 180 ms (chuông trầm) | mở hook |
| 1,17 | **Magic reveal** | 2,0 s | 95% | rất sáng (tâm 4,9 kHz), nhỏ (-30 dB RMS) | bật pill "MIỄN PHÍ 100%" |
| 2,90 | Glitch sound (logo) | 0,63 s | 100% | tâm 5 kHz, tấn công 14 ms | "Nhiễu sóng" (dòng phụ hook) |
| 4,83 | swish_whoosh (large) | 0,8 s | **48%** | to nhất (+3 dB), tâm 1,2 kHz | "BAO GỒM" vào |
| 6,60 · 8,13 · 9,17 · 10,03 · 11,27 · 12,83 · 14,30 | **Chan (system sound, middle)** | 0,53 s (cắt từ 1,5 s) | 100% | tâm 2,3 kHz, tấn công 140 ms (chuông hệ thống) | **nhãn ô bảng A**, đặt **trước chữ 0,14 s** |
| 18,37 · 19,17 · 20,03 · 20,93 · 21,43 · 22,43 · 22,93 | **Sound of coin** | 0,57 s | **33%** | tâm 3,1 kHz, tấn công 25 ms (đồng xu) | nhãn bảng B (nhỏ để khỏi chói vì dày) |
| 25,37 | 打字-102217 (gõ phím) | 0,63 s | 100% | tâm 3,5 kHz | "Giải thích kết quả" (Máy đánh chữ retro) |
| 29,20 · 30,23 · 31,20 | **pop! (tapping the mouth)** | 0,37 s | 100% | tâm 1,3 kHz, tấn công 20 ms | ba từ khoá X-quang/Siêu âm/Tuyến giáp |
| 32,60 · 35,00 | **Money Chakin** | 0,63 s | 100% | rất sáng (tâm 4,4 kHz), nhỏ | thẻ giá 90.000đ / 50.000đ |
| 35,73 | **Đồng hồ đếm ngược 10 giây** (cắt từ 0,57 s) | 4,8 s | 100% | tâm 6,9 kHz (tích tắc cao), tấn công chậm 648 ms | khung hạn chế (đồng hồ chạy) |
| 35,83 | Magic reveal | 2,0 s | 100% | | "CHỈ NHẬN 60 SUẤT" |
| 37,90 | Mouse click sound | 0,18 s | 100% | | "ĐẾN HẾT 31/12" (dòng gõ) |
| 40,57 | Notification Sound 3 (Confirmation) | 0,73 s | 100% | tấn công 3 ms (chuông báo) | "CUỐI NĂM RỒI" |
| 41,43 | Wrong answer | 0,4 s | **38%** | tâm 2,9 kHz | chip đỏ "CHƯA ĐI KHÁM…?" (gợi câu hỏi/cảnh báo, nhỏ) |
| 43,50 | Sound of coin | 1,9 s | 100% | | "DẪN CẢ GIA ĐÌNH" |
| 45,40 | Pop! (1479450) | 3,03 s | 100% | tâm 1,35 kHz, đuôi dài | "MỘT LẦN CHO AN TÂM" |
| **47,43 · 47,67 · 48,13 · 48,60 · 49,07** | **Black phone ring 01** (chia đoạn 0,23 / 0,47 / 0,47 / 0,47 / 1,77 s) | | **55%** | tâm 3,8 kHz, tấn công 44 ms | **chuông điện thoại cắt nhịp theo từng cụm số 0779 / 36 / 36 / 79** (khớp lời đọc số) |
| nền | voice_all.mp3 (100%), `sfx_bed.wav` của máy (giữ), **Happy and Fun Pop Background Music** (33%, cắt từ 10 s, suốt 54,7 s) | | | | |

Quy tắc SFX rút ra:
1. **Mỗi chữ vào = một SFX riêng, đặt trước chữ 0–0,2 s** (nhãn bảng A trước 0,14 s).
2. **Cùng loại chữ dùng cùng file**: nhãn A = chuông hệ thống; nhãn B = xu (33%); từ khoá = "pop mouth"; thẻ giá = "Money Chakin"; CTA lần lượt notification → xu → pop.
3. **Ý nghĩa của tiếng khớp ý chữ**: tiền/giá → Money Chakin/coin; đếm ngược → đồng hồ; số điện thoại → chuông điện thoại cắt theo nhịp số; câu hỏi cảnh báo → Wrong answer nhỏ 38%; gõ chữ → tiếng gõ phím/click chuột; hook → Magic reveal.
4. **Mức**: tiếng dài/sáng (Magic reveal) 95–100%, tiếng lặp nhiều lần (xu B) 33%, tiếng đệm cảnh báo 38%, whoosh lớn 48%, chuông điện thoại 55%; nhạc nền 33%. Không dùng impact/riser (đúng nguyên tắc y tế).
5. Giữ `sfx_bed.wav` của máy làm lớp nền nền, SFX riêng đặt chồng lên.

## 5. Cấu trúc track & dựng
- Chữ chia thành **nhiều track chữ** (đoạn chồng nhau lên track mới); mỗi nhãn ô thuộc track riêng tuỳ vị trí ô; bảng A và B dùng chung track theo ô.
- Bảng lưới được gộp thành **"Clip ghép"** (ô + nền hex + khung nằm trong); khung `khung dọc FACEBOOK.png` nằm **trên cùng** toàn 54,7 s, chữ nằm dưới khung.
- Đoạn kết 53,1–54,7 s: thêm màn "Địa chỉ" (1,6 s).
- Âm thanh 7+ track: voice, SFX theo nhóm (3 track SFX), chuông điện thoại track riêng, nhạc nền, sfx_bed.

## 6. Việc áp dụng cho video sau (đề xuất)
1. Dùng bảng công thức ở mục 1 cho mọi chữ (gán animation CapCut bằng `capcut-animations.json`).
2. Dùng mask chữ nhật bo góc `roundCorner 0,17` (`capcut-mask-rect.json`) cho ô lưới, thẻ trượt; **không cần lớp nền có lỗ nữa**.
3. Thêm cảnh thẻ trượt cho hạng mục thứ hai (X-quang…): vào từ phải 0,24 s, nằm 0,8 s, lùi trái.
4. Chỉnh màu B-roll theo mục 3 (lạnh -0,1…-0,3, sáng +0,16…+0,25), làm đẹp nhẹ người dẫn.
5. SFX theo mục 4, có nhạc nền 33% và chuông điện thoại cắt theo số.
