# Xưởng dựng video toàn diện (full-studio)

Hệ thống làm video bằng lệnh và AI, gồm 3 mắt xích chạy cục bộ:

| Thư mục | Vai trò | Cổng |
|---|---|---|
| `canvas/` | **Infinity Studio**: canvas tạo ảnh và video AI (Google Flow), có agent điều khiển bằng HTTP | 17371 (agent), 3100 (web) |
| `voice-studio/` | **Voice Studio**: tạo giọng đọc, nhân bản giọng, nhận dạng chữ (whisper) | 3900 |
| `edit/` | **Hệ thống edit** (`vf`): file dự án JSON, dựng bằng ffmpeg, app web xem trước, xuất CapCut, script làm series | 5180 |

## Luồng làm một video
1. Viết kịch bản và lời đọc (`edit/kich-ban`, `edit/kien-thuc`).
2. Tạo giọng ở Voice Studio (hoặc node âm thanh trên canvas, model `omnivoice`).
3. Sinh ảnh và video trên canvas (`edit/canvas-tools` gọi agent của `canvas/`).
4. Dựng: `python -X utf8 -m vf check|render|capcut <project.json> ...` (xem `edit/vf/README.md`).

## Nguồn gốc và giấy phép từng phần
| Thư mục | Nguồn |
|---|---|
| `canvas/` | Giao diện từ [basketikun/infinite-canvas](https://github.com/basketikun/infinite-canvas) (MIT), Việt hóa và thêm vỏ Electron, script Flow (`desktop/`, `flow-canvas/`) |
| `voice-studio/` | **[debpalash/VoiceStudio](https://github.com/debpalash/VoiceStudio) (AGPL-3.0), dự án của tác giả khác**, giữ nguyên LICENSE; mô hình giọng có giấy phép riêng |
| `edit/` | Bộ lệnh `vf`, app web, script series và kiến thức: của chủ repo |

Tài liệu tổng hợp cách hoạt động và cách dùng: [`HE-THONG-TONG-HOP.md`](HE-THONG-TONG-HOP.md).

## Cài đặt
- Xem `edit/SETUP.md` (máy mới) và `edit/CLAUDE.md` (luật dựng, lệnh `vf`).
- Các script trong `edit/` mặc định đọc canvas ở `E:\antigravyti\infinite-canvas` (xuất file ở `exports/manifest.json`). Đặt `canvas/` ở đường dẫn đó hoặc sửa lại trong script.
- Canvas cần đăng nhập Google Flow (tài khoản của chính bạn). Không có khóa hay token nào được lưu trong repo; token agent tự tạo ở `%USERPROFILE%\.infinite-canvas\canvas-agent.json`.

## Giấy phép
- `voice-studio/` theo **AGPL-3.0** (xem `voice-studio/LICENSE` và `LICENSE-NOTICE.md`). Các mô hình giọng có giấy phép riêng; chỉ nhân bản giọng khi có sự đồng ý.
- Các phần còn lại: xem giấy phép trong từng thư mục (nếu có).
- Thư mục `canvas/flowkit` (bản cũ) đã được loại khỏi repo này.
