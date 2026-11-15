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
