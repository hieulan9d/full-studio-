# Muse (muse2api) trong canvas — cách cài và các bẫy

Muse (muse.ai) tạo ảnh và video qua **muse2api**: cổng OpenAI-kiểu chạy cục bộ ở `127.0.0.1:18610`, điều khiển một trình duyệt đã đăng nhập tài khoản Muse. Canvas (Infinity Studio) tự khởi động muse2api khi mở (`desktop/main.js`) và có sẵn kênh `muse` với model `muse-image`, `muse-video` (`flow-canvas/import-flow-config.json`).

## Cài đặt (máy này đã làm xong)
- Thư mục: `E:\antigravyti\full studio\canvas\muse2api\`. Thư mục này **không có `src`**; mã nguồn thật chạy từ bản cài editable ở `E:\antigravyti\infinite-canvas\muse2api\src` (`pip show muse2api`). **Không xóa thư mục `infinite-canvas`.**
- Phải có file `.env` (không nằm trong git). Nếu thiếu, driver mặc định là `mock` và chỉ trả ảnh giả (ô xanh ~179 byte). Cấu hình đang dùng:
  ```
  MUSE2API_DRIVER=browser
  MUSE2API_CHROMIUM_PATH=C:/Users/ADMIN/AppData/Local/BraveSoftware/Brave-Browser/Application/brave.exe
  MUSE2API_CDP_PORT=19311
  MUSE2API_BROWSER_PROFILE_DIR=E:/antigravyti/full studio/canvas/muse2api/data/browser-profile
  MUSE2API_HEADLESS=true
  ```
- Dùng dấu `/` trong đường dẫn. Bản dùng dấu `\` + `HEADLESS=false` + cổng 19210 đã lỗi `cdp connection closed` (HTTP 500 ngay lập tức).
- Sửa `.env` xong phải **thoát hẳn canvas (menu Thoát) rồi mở lại** mới có hiệu lực.
- Tài khoản Muse: thêm cookie ở `http://127.0.0.1:18610/dashboard`. API key nằm ở `muse2api/data/api_key` (menu muse2api > Sao chép API key). Không dán key vào chat/commit.

## Bẫy đã gặp
- **Trình duyệt chạy ngầm liên tục** từ lúc mở canvas (không có cửa sổ khi `HEADLESS=true`). Muốn mở theo từng lần tạo thì phải sửa mã `drivers/browser/driver.py` (chưa làm).
- **Video báo "không khả dụng ở khu vực/tài khoản này"**: là giới hạn phía Muse theo tài khoản; **đổi tài khoản là được** (ảnh vẫn tạo bình thường trên tài khoản đó).
- Video Muse dài 1–10 giây; tỉ lệ đặt qua `aspect_ratio`.
- Ảnh thử Muse ra đúng phong cách phấn trắng trên nền đen 9:16 (1152×2048).
- Chạy theo đợt nhỏ, mỗi tài khoản chỉ vài yêu cầu cùng lúc (`MUSE2API_ACCOUNT_MAX_CONCURRENCY`). Đừng tạo song song với người khác trên cùng tài khoản.
- Muse2API là cầu nối không chính thức điều khiển web Muse; có rủi ro điều khoản/khóa tài khoản.

## Kiểm tra nhanh
`canvas-tools/muse.py` gọi thẳng muse2api (đặt `MUSE2API_KEY` trong terminal): `models`, `test "prompt"`, `img N [cảnh…]`, `vid N [cảnh…]`. Chưa dùng cho cả tập; schema ảnh tham chiếu video chưa kiểm chứng qua script (đã tạo được video qua canvas).

## Chẩn đoán lỗi
Nhật ký request ở `muse2api/data/requests.db` (SQLite, cột `error`, `status_code`). Đọc bản sao bằng `sqlite3` `backup`, đừng mở trực tiếp khi muse2api đang chạy.
