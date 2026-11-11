# Infinity Studio

Phần mềm tạo ảnh / video / âm thanh trên canvas vô hạn, gồm:

| Thư mục | Vai trò | Nguồn gốc |
|---|---|---|
| `app/` | Giao diện canvas vô hạn (React + Vite), đã Việt hóa, thêm chọn giọng, giới hạn thời lượng Flow | [basketikun/infinite-canvas](https://github.com/basketikun/infinite-canvas) (MIT) |
| `flowkit/` | Cầu nối Google Flow (FastAPI + extension Chrome), thêm chọn model Veo và proxy media | [crisng95/flowkit](https://github.com/crisng95/flowkit) (MIT) |
| `voice-studio/` | Tạo giọng nói (OpenAI-compatible API `:3900`) | [debpalash/VoiceStudio](https://github.com/debpalash/VoiceStudio) (AGPL-3.0) |
| `desktop/` | Vỏ Electron: chạy canvas + FlowKit + proxy trong một cửa sổ | mới |
| `flow-canvas/` | Script model Flow và `import-flow-config.json` | mới |

Giữ nguyên giấy phép và thông tin tác giả gốc của từng phần (xem LICENSE trong mỗi thư mục).
`voice-studio/` theo AGPL-3.0: nếu công khai repo hoặc phân phối, cần tuân thủ điều khoản này.

## Chạy nhanh (Windows)

Yêu cầu: Node.js 18+, Python 3.10+, ffmpeg, Chrome.

1. `pip install -r flowkit/requirements.txt`
2. Nạp `flowkit/extension` vào Chrome (chrome://extensions > Load unpacked), mở https://flow.google.com đã đăng nhập.
3. `start.bat` (web dev) hoặc `app.bat` (cửa sổ phần mềm Electron).
4. Canvas > Cài đặt > Nhập cài đặt: chọn `flow-canvas/import-flow-config.json`.
5. Voice: chạy VoiceStudio (xem `voice-studio/README.md`), thêm nhà cung cấp `http://127.0.0.1:3900/v1`, bật Proxy cục bộ (`http://127.0.0.1:23210`).

Chi tiết nối Flow: `flow-canvas/README.md`.

## Không có trong repo
`node_modules`, bản build, file cài `.exe`, cơ sở dữ liệu, `.flow-project-id` (ID project Flow, tạo khi chạy `start.bat`).
