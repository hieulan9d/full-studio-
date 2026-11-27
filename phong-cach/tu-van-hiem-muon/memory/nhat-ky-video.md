# Nhật ký video

- 2026-11-26: phân tích 20 mẫu, tạo kit. Chưa dựng.
- 2026-11-26: v01 "3 sai lầm" (output/hiem-muon-v01): clip thử 1 bằng Omni 1.2 Flash 12 s, người dẫn từ ảnh người dùng đưa; chờ người dùng xem mặt/giọng/khớp môi.
- 2026-11-26: v01 dựng xong cả video 45,6 s (5 clip + 12 nền), chờ người dùng xem.
- 2026-11-26: v03 (tạo liền, không phụ đề) 41,2 s, chờ người dùng xem.
- 2026-11-26: v02 "3 điều kiện vàng" (output/hiem-muon-v02) 37,5 s, tạo liền 5 clip + hook + phụ đề, chờ người dùng xem.
- 2026-11-26: v01 bản nhanh 35,2 s (`output/hiem-muon-v01/v04_nhanh.mp4`). Kịch bản 03–20 ở `output/hiem-muon-lo/` chờ duyệt. Flow ~50–55 điểm/clip Omni 12 s (ước từ số dư).
- 2026-11-26: đợt tạo tự động 07–20: xong 07–10 đủ 5 clip, 11 thiếu clip5; dừng vì Flow cảnh báo. Chưa dựng.
- 2026-11-26: đợt hai tạo tự động: xong 11/clip5 và 12–15, cảnh báo "hoạt động bất thường" lại hiện ở 16/clip1 (sau 20 clip liên tục). Còn 16–20 (25 clip).
- 2026-11-26: mở tab/project mới rồi chạy tiếp, chỉ thêm được 7 clip (16/1–5, 17/1–2) thì cảnh báo lại. Còn 18 clip (17/3 đến 20/5): người dùng tạo tay, không chạy tự động tiếp.
- 2026-11-26: dựng xong 07–16 bằng `output/hiem-muon-lo/day_chuyen.py --tay` (31,9–38,8 s, 1080×1920, -13,3 đến -13,8 LUFS), chờ người dùng xem.
- 2026-11-27: gom bài học 16 video thành skill `.claude/skills/video-tu-van-hiem-muon/` (script `hiem_muon.py`: kiem, prompt, nhap, dung). Thử dựng lại video 08: 31,9 s, khớp 100%.
