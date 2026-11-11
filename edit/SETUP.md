# Cài đặt trên máy mới (để dùng hệ thống như bình thường)

1. Cài Python 3.11, ffmpeg (có trong PATH), Git, Claude Code (CLI hoặc app desktop).
2. Clone repo về bất kỳ đâu (đường dẫn trong dự án đã là tương đối). Riêng thư mục xuất của canvas mặc định đọc ở `E:ntigravyti\infinite-canvas\exports\manifest.json`: nếu để chỗ khác, sửa dòng `manifest.json` trong `projects/dao-ly-tapN/build_project.py`.
3. `pip install -r requirements.txt`
4. Chạy app: `chay-app.bat` (cổng 5180). Lệnh dựng: `python -X utf8 -m vf <lệnh>` (xem `CLAUDE.md`, `vf/README.md`).
5. Dịch vụ ngoài (cài riêng, KHÔNG nằm trong repo này):
   - **VoiceStudio** (giọng đọc + whisper) chạy ở `localhost:3900`, profile giọng `70afd348`.
   - **Canvas Infinity Studio**: repo `hieulan9d/infinity-studio`, đặt ở `E:\antigravyti\infinite-canvas`; chạy `agent.bat`/`app.bat` để có agent ở `127.0.0.1:17371`, token tự tạo ở `%USERPROFILE%\.infinite-canvas\canvas-agent.json`. Canvas cần đăng nhập Google Flow (FlowKit).
   - Video xuất từ canvas nằm ở `E:\antigravyti\infinite-canvas\exports\manifest.json`.
6. Mở Claude Code trong thư mục này: nó đọc `CLAUDE.md`, rồi `kien-thuc/dao-ly/` (kinh nghiệm đã học) và `canvas-tools/README.md` (quy trình canvas → video).
7. Cuốn sách nguồn (PDF) để riêng; bản tóm tắt 8 tập: `kien-thuc/dao-ly/sach-tong-hop-8-tap.md`.

Video/giọng/ảnh các tập KHÔNG có trong repo: tạo lại bằng canvas + `make_voice.py` + `vf render`.
