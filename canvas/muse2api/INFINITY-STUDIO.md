# Vendored copy

Source: https://github.com/www222fff/muse2api (MIT, see LICENSE).

Local change for Infinity Studio: `src/muse2api/api/routes/videos.py` accepts multipart form requests
(what the canvas sends) as well as JSON, and returns `url` / `video_url` at the top level of the task.

Not included on purpose: `data/` (account cookies, API key) and `.env`. On a new machine create
`muse2api/.env` (see `.env.example`; on Windows also set `MUSE2API_CHROMIUM_PATH`,
`MUSE2API_BROWSER_PROFILE_DIR` as an absolute path and a free `MUSE2API_CDP_PORT`), run
`pip install -e muse2api`, then import your own muse.ai cookies from the dashboard (`/dashboard`).

## Ghi chú cài đặt (đã gặp thật)
- Đã đồng bộ mã nguồn `src/` từ upstream (v0.4.0) và viết lại sửa đổi trên (multipart + `url`/`video_url`) ngày 2026-11-15, vì bản cũ bị mất do `.gitignore` từng chứa `muse2api/` (bỏ qua cả `src/muse2api/`). Dòng đó đã xoá; `src/` giờ nằm trong git, còn `data/` và `.env` vẫn bị bỏ qua.
- Đường dẫn có chữ có dấu làm `pip install -e .` không tạo file `.pth`: thêm tay `muse2api_src.pth` (xem `CAI-DAT.md` mục 4.6).
- Khi cập nhật từ upstream, chép lại `src/` rồi **áp lại sửa đổi trong `src/muse2api/api/routes/videos.py`** (tìm chú thích "Infinity Studio").

## Hiện khóa trên canvas (nội bộ)
- Thêm `GET /local/keys` (chỉ nhận kết nối từ 127.0.0.1) trong `src/muse2api/api/routes/dashboard.py`, trả `api_key` và `admin_key`.
- `src/muse2api/app.py`: CORS cho thêm `http://127.0.0.1:*` / `http://localhost:*` để giao diện canvas (cổng 3100) gọi được.
- Canvas: `MuseKeys` trong `app/web/src/components/layout/app-config-modal.tsx` hiện hai khóa kèm nút sao chép ở đầu hộp Cài đặt.
- **Admin key** là khóa vào `/dashboard` và `/admin/*`. Nếu `MUSE2API_ADMIN_KEY` trống thì nó bằng API key. Khi cập nhật từ upstream phải áp lại các sửa này (tìm chú thích "Infinity Studio").
- Lưu ý bảo mật: chỉ dùng nội bộ. Trang web chạy trên `localhost` khác cũng đọc được khóa này.
