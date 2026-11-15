# 01 — Phong cách SaaS animation

Video SaaS là quảng cáo phần mềm 15–30 giây. Khách trả $300–$3.000+ cho một video vì nó trông
"đắt": sạch, sáng có chủ đích, chuyển động mượt, không cắt cứng. Mọi con số dưới đây đã được
kiểm chứng bằng cách đặt bản dựng cạnh video mẫu và sửa tới khi gần giống.

## 1. Năm dấu hiệu nhận diện (thiếu cái nào cũng lộ "rẻ")

1. **Ánh sáng có nguồn**: một cột sáng rọi xuống (hoặc lên), quầng xanh mờ quanh nó, một
   "hành tinh" tối ở đáy khung với vòng chân trời phát sáng. Nền gần đen, không phải xanh tươi.
2. **Kính (glassmorphism)**: thẻ/khung UI trong suốt xanh đậm, viền sáng mảnh, làm mờ thứ phía sau.
   Không phải khối màu đặc.
3. **Chữ & UI hiện bằng blur + fade**, chuyển động "lao nhanh rồi phanh". Không bounce khối lớn.
4. **Không cắt cứng**: mọi chỗ nối là chuyển động camera, morph, vòng sáng, hoặc blur thoát.
5. **Khung đầy**: vật thể chính chiếm 50–80% chiều ngang. Video mẫu luôn "zoom sát"; bản dựng
   đầu tiên của chúng ta bị nhỏ 1,4–2 lần và trông trống trải — lỗi số 1 cần tránh.

## 2. Màu (hệ "tối xanh" — mặc định)

| Vai trò | Giá trị | Ghi chú |
|---|---|---|
| Nền trên → dưới | `#000208` → `#020a1e` | gần đen, KHÔNG xanh tươi |
| Cột sáng lõi | `#4f8dff`, rộng 150, dài 1150, blur 65, ADD, opacity 40–50 | thở nhẹ theo nhịp 2 s |
| Cột sáng rộng | `#1d4fd8`, 520×1500, blur 170, ADD, 32 | |
| Quầng mờ | `#0b2670` ellipse 1900×1400, blur 300, ADD, 22 | |
| Vòng chân trời | viền `#9fd2ff` 5 px + glow; quầng `#3a7bff` 60 px blur 70 | đỉnh vòng ở y≈950 |
| Lòng hành tinh | gradient `#163a8c` → `#030a20`, fill 75% | KHÔNG đen đặc (thành mái vòm đen) |
| Nhấn (chữ phụ, nút) | `#5fb4ff` | xanh lơ sáng |
| Kính | fill `#3a5fd8` 20–30%, viền `#b4ccff` 1,5 px 55–70% | |
| Cửa sổ app | gradient `#22379a` → `#0a1240`, 88–92% | |
| Chữ chính / phụ | `#ffffff` / `#8fa3e0` | |
| Điểm nhấn hiếm | tím/hồng `#d46cf0` `#8e5cf2` | chỉ 1 lần (vd. ngôi sao morph) |

Lớp chỉnh tổng trên cùng MAIN (`H.finishMain`): Hue/Saturation (hue −8, saturation −28) +
Brightness/Contrast (−12 / +22) + Glow toàn cảnh (threshold 82%, radius 70, intensity 0,35)
+ vignette (mask ellipse đảo, feather 500, 55%). Glow toàn cảnh threshold < 75% làm cháy trắng cả khung.

Hệ "sáng pastel" (video hướng dẫn 2): nền trắng→xám rất nhạt, 3 vệt tím/hồng blur 350 ở 50%,
kính trắng, bóng opacity 7–25%, chữ tím đậm. Dùng khi brand sáng.

**Đổi tông theo brand — cách chính: `H.HUE`.** Mọi màu trong kit đi qua `H.rgb`, nên đặt `H.HUE = <độ>` ngay sau khi
nạp thư viện là cả video (nền, kính, chữ nhấn, UI, sao) xoay sang tông mới, giữ nguyên độ sáng và quan hệ màu.
Trắng/xám không đổi. Đã chạy thử: `H.HUE = 45` → tím (video Orbiq).

| Tông | H.HUE |
|---|---|
| xanh dương (mặc định) | 0 |
| tím / violet | +45 |
| hồng-tím | +90 |
| xanh lơ / teal | −30 |
| xanh lá ngọc | −80 |

Cần đúng mã màu brand cho vài chi tiết (logo): dùng `H.rgbRaw('#hex')`. Tinh chỉnh từng vai trò: `H.palette({...})`.
Đặt `H.HUE` lại sau mỗi lần nạp lại thư viện (giá trị về 0). Giữ nền gần đen bất kể brand màu gì.

## 3. Chữ

| Vai trò | Cỡ (1920×1080) | Font |
|---|---|---|
| Wordmark logo | 118 × scale 145% ≈ 170 | Semibold |
| Tiêu đề cảnh | 62 | Semibold |
| Dòng phụ tiêu đề | 44, màu `#a9bdf0`, có vệt sáng quét | Regular |
| Chữ lớn giữa vòng ("New") | 150 Bold + gradient trắng→`#a9c8ff` | Bold |
| Chữ khổng lồ nền | 330, opacity 32%, blur theo DOF | Semibold |
| Chữ trong UI | 13–54 (xem 05-giao-dien-ui) | |

Font: Inter (Regular/SemiBold/Bold) nếu có; không thì Segoe UI. `H.pickFonts()` tự chọn.
Đổi text bằng `H.setText` — gán thẳng `text` sẽ làm font về mặc định (đã gặp: chữ thành font có chân).

## 4. Bố cục & tỉ lệ (đo từ mẫu)

- Logo mở đầu/kết: cụm icon + chữ rộng ≈ 1000 px, giữa khung.
- Cửa sổ app lúc "dâng lên": rộng ~1500–1600 px, mép trên ở y≈480, mép dưới bị khung cắt.
- Cửa sổ app lúc zoom-out: rộng ~870 px giữa khung, xung quanh là panel nền mờ.
- Cảnh chat: bong bóng câu hỏi ~890 px rộng, chữ 25×1,45; cụm chat căn giữa ngang.
- Bong bóng icon quanh vòng: đường kính ~150–200 px (không phải 80).
- Không để khoảng trống lớn: nếu ảnh kiểm tra có >40% diện tích đen trống, phóng to cảnh.

## 5. Chuyển động — tinh thần chung

- Vào: blur 25–30 → 0 + opacity 0 → 100 trong 0,4–0,45 s, ease "snap".
- Khối lớn (cửa sổ, thẻ lớn) không bounce; khối nhỏ (chip, icon, nhãn) bounce vượt 8–15%.
- Camera luôn trôi rất chậm (scale 100 → 103–104% trong cả cảnh) — khung không bao giờ đứng im.
- Mọi phần tử phụ so le 0,07–0,4 s.
- Ra: blur 0 → 40 + tối dần trong 0,2–0,25 s ngay trước mốc cảnh mới.

## 6. Thứ gây "rẻ" — tránh

| Lỗi | Cách sửa |
|---|---|
| Nền xanh tươi, bão hoà | Nền gần đen + lớp chỉnh màu giảm bão hoà |
| Glow cháy trắng (bong bóng, avatar, ngôi sao) | Glow threshold ≥ 70, intensity ≤ 0,7; fill tối hơn |
| UI là khối đặc tím/xanh | Kính: fill 20–30% + viền sáng + adjustment blur phía dưới |
| UI ít chi tiết | Đủ icon, nhãn, số liệu, trục biểu đồ (05-giao-dien-ui) |
| Vật nhỏ, khung trống | Phóng to 1,2–1,5× |
| Cột sáng là "cục" tròn | Cột dài mảnh, chạm tới chân trời |
| Hai bản dựng chồng nhau khi chuyển | Một vật thể xuyên suốt chuyển động |
