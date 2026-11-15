# 11 — Khung dọc 9:16 (Reels, TikTok, Shorts)

Đã chạy thật: Orbiq 9:16 (`output/orbiq/orbiq_916_v1_final.mp4`) dựng từ cùng `build.jsx` với bản 16:9.

## 1. Cách kit làm 9:16

- **Cảnh luôn thiết kế ở 1920×1080** (không gian thiết kế `H.W/H.Hh`) — mọi hàm cảnh giữ nguyên.
- **Khung ra** đặt bằng `H.setFormat('9:16')` → `H.FRAME = 1080×1920`. `MAIN`, `ENV_Space`, `ENV_Planet`
  tạo bằng `H.frameComp` nên theo khung ra; nền/cột sáng/hành tinh/vignette tự tính theo kích thước.
- Mỗi layer cảnh đặt vào MAIN bằng `H.frame(layer, scale%, dy, dx)`: ở 100% thấy dải giữa rộng 1080 px của
  cảnh, hai bên bị cắt. `H.frame` bật **collapse transformations** ở khung dọc để nội dung vượt vùng 1080 px
  cao của cảnh (cửa sổ dashboard, panel nền) không bị cắt thành đường ngang cứng.
- Trong `build.jsx`: `CFG.v = { S0x_Ten: [scale, dy, dx] }` cho từng cảnh; dựng bản dọc bằng
  `$.global.BUILD_FORMAT = '9:16'` trước `evalFile` (project riêng `<slug>_916.aep`).

## 2. Tỉ lệ đã chạy được (Orbiq)

| Cảnh | scale | dy | dx | Lý do |
|---|---|---|---|---|
| logo-reveal / end-card | 100 | 0 | 0 | cụm logo ~1000 px vừa khít |
| dashboard-rise | 66 | 80 | 0 | cửa sổ 1600 px phải thu để thấy cả sidebar |
| zoom-out | 112 | 0 | 0 | cửa sổ giữa + panel nền hai bên bị cắt bớt — vẫn đẹp |
| feature-orbit | 100 | 0 | 0 | vòng ngoài bị cắt, chấp nhận |
| ai-chat | 82 | 0 | −80 | cụm chat rộng ~1000 px và lệch phải trong thiết kế |
| card-ring | 125 | 0 | 0 | trụ thẻ hẹp → phóng cho lấp khung |
| star-morph | 100 | 0 | 0 | phải bằng end-card để sao bay về đúng icon |

Kiểm tra mỗi cảnh: không có vật quan trọng chạm mép trái/phải (chữ, avatar, nút AI).

## 3. Khác biệt cần xử lý riêng

- **Hành tinh ở cảnh dashboard**: bản 16:9 thu hành tinh còn 45% và đưa lên sau tiêu đề; ở khung dọc làm vậy sẽ lộ
  nguyên vòng tròn → bản dọc chỉ trượt hành tinh xuống (+520 px) rồi tắt.
- **Khoảng trống trên/dưới**: khung dọc cao gấp ~1,8 lần; cảnh thiết kế ngang chỉ lấp dải giữa. Cột sáng và
  hành tinh lấp phần còn lại. Muốn chặt hơn: thêm chữ phụ (caption) ở 1/3 trên hoặc dưới khung — mạng xã hội
  thường xem không tiếng, caption giúp giữ người xem.
- **Vùng an toàn**: TikTok/Reels che ~250 px dưới đáy (mô tả, nút) và ~150 px trên. Không đặt CTA/chữ quan trọng ở đó.
- Chữ trong UI nhỏ hơn so với chiều cao khung → ưu tiên cảnh có chữ lớn (logo, orbit, chat) cho bản dọc;
  có thể bỏ zoom-out nếu video ngắn.

## 4. Bẫy đã gặp

- `H.setFormat` từng biến '9:16' thành khung vuông do ternary lồng của ExtendScript (xem 07). Sau khi dựng,
  luôn kiểm tra `MAIN.width × MAIN.height` và chạy `tools/qc_auto.py --w 1080 --h 1920`.
- Không có collapse: mép dưới cửa sổ dashboard bị cắt thành đường thẳng ngang giữa khung.
