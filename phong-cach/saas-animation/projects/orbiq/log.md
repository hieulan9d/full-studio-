# Log: orbiq (chạy thử kit, 2026-11-15)

1. AE + panel OK, nạp lib OK, máy không có Inter → Segoe UI.
2. Brief tự sáng tác (Orbiq — AI ghi chú cuộc họp), storyboard 8 cảnh, lưới 120 BPM.
3. Thêm `H.HUE` (xoay sắc độ mọi màu) → +45 cho tông tím. Chạy tốt ngay lần đầu.
4. Lỗi kit: `H.saveFrames` ghi vào thư mục chưa có → thất bại im lặng. Sửa: tự tạo thư mục.
5. Logo tên ngắn bị nhỏ → thêm `H.logoScale` (cụm ~1000 px, 120–220%). End card chưa căn giữa với tên ngắn → căn theo độ rộng chữ, lưu `H.lastEndIcon/lastEndScale` để sao morph bay về đúng chỗ.
6. Nhãn dashboard cứng ("Documents", "Costs"…) không hợp app họp → thêm `o.labels`. Lỗi ES3: hàm `L` bị `var L` cục bộ che → đổi tên `LB/LBA`.
7. Cảnh dashboard-rise / zoom-out trước phải dựng tay → thêm `H.sceneDashboardRise`, `H.sceneZoomOut`.
8. Nút AI và avatar AI cháy sáng → hạ glow. Cụm chat lệch trái ~160 px (lỗi có từ NeuraFlow v4) → dời null cảnh.
9. Đo nhầm vị trí từ ảnh sheet (×2 thay vì ×2,4) — đọc lại giá trị trong AE thì đúng. Ghi vào 07.
10. Render `orbiq_v1.mp4` (20,0 s). Viết `build.jsx` gom toàn bộ, chạy lại từ đầu 5 giai đoạn → kết quả khớp.

## Lần 2 (kit 1.2.0, 2026-11-15)
11. Tạo SFX (`sfx_gen.py`) + nhạc 120 BPM (`music_gen.py`); sửa `beats.py` đo sai nhịp (199 → dải 70–175 + nội suy).
12. Lệnh đầu treo 200 s: AE bị khởi động lại/hộp thoại → chạy lại từng giai đoạn một lệnh (mỗi giai đoạn 5–8 s).
13. 16:9 + âm thanh: 36 SFX + nhạc, render `orbiq_v2.mp4` (−18,5 LUFS) → `finalize.sh` → `orbiq_v2_final.mp4` (−14).
14. 9:16: lần đầu ra khung vuông 1080×1080 — ternary lồng của ExtendScript trong `H.setFormat`; sửa cả `H.text` (căn lề).
15. 9:16: mép cửa sổ bị cắt ngang → `H.frame` bật collapse; hành tinh lộ cả vòng → bản dọc chỉ trượt xuống; chat tràn → 82%, dx −80.
16. Render `orbiq_916_v1.mp4` → `orbiq_916_v1_final.mp4`. `qc_auto.py`: tất cả PASS.

## Lần 3 (kit 1.3.0)
17. Tải 8 bài Mixkit (người dùng duyệt), `music_index.py`. Ghép "Better Times are Coming" từ 37,97 s → render `orbiq_v3.mp4` → `orbiq_v3_final.mp4`; qc_auto 9/9 PASS. Phách rơi ở x.1/x.6 s (lệch 0,1 s so với mốc cảnh).
