# Infinity Studio — Hướng dẫn sử dụng

Canvas vô hạn để tạo **ảnh, video, âm thanh** bằng Google Flow (qua FlowKit) và VoiceStudio, có thể nối với Claude Code.

## 1. Cài đặt lần đầu

Cần có: **Node.js 18+**, **Python 3.10+**, **ffmpeg**, **Chrome**.

```bash
pip install -r flowkit/requirements.txt
npm --prefix app/web install --legacy-peer-deps
npm --prefix desktop install
```

Cài extension FlowKit vào Chrome:
1. Mở `chrome://extensions`, bật **Developer mode**.
2. Bấm **Load unpacked**, chọn thư mục `flowkit/extension`.
3. Mở https://flow.google.com, đăng nhập, **giữ tab này luôn mở**.

## 2. Chạy phần mềm

| Cách | Lệnh | Ghi chú |
|---|---|---|
| Cửa sổ phần mềm (khuyên dùng) | `app.bat` | Tự build web, mở cửa sổ riêng, tự chạy FlowKit và proxy |
| Web dev | `start.bat` | Mở trình duyệt `localhost:3000`, chậm hơn |

Lần đầu `start.bat` hỏi **FLOW_PROJECT_ID** (UUID trong URL project trên flow.google.com), lưu vào `.flow-project-id`.
Chỉ chạy **một** trong hai cách một lúc (cùng dùng cổng 8100).

## 3. Cấu hình Flow trong canvas

1. Vào **Cài đặt** (bánh răng) > **Nhập cài đặt**, chọn `flow-canvas/import-flow-config.json`.
2. Nhập xong có 6 model trong nhà cung cấp "Google Flow (FlowKit)":

| Model | Loại | Ghi chú |
|---|---|---|
| `flow-nano-banana-pro` | Ảnh | Nano Banana Pro (mặc định) |
| `flow-nano-banana-2-lite` | Ảnh | Nano Banana 2 Lite |
| `flow-nano-banana-2-1` | Ảnh | Nano Banana 2.1 |
| `flow-omni-flash` | Video | Omni 1.1 Flash: chữ, 1 ảnh, 2 ảnh (đầu+cuối), nhiều ảnh tham chiếu |
| `flow-veo-lite` | Video | Veo 3.1 Lite: bắt buộc có ảnh khung đầu |
| `flow-veo-fast` | Video | Veo 3.1 Fast: bắt buộc có ảnh khung đầu |

Chưa có: **Veo 3.1 Quality** (FlowKit chưa biết tên model; cần bắt lại yêu cầu mạng, xem `flowkit/docs/CAPTURE.md`).

> Nhập cài đặt **gộp** vào cài đặt hiện có: nhà cung cấp mới được thêm; nhà cung cấp trùng (cùng id hoặc cùng địa chỉ) được cập nhật model và giữ API key đang có nếu file nhập để trống; nhà cung cấp và cài đặt khác đang có không bị xóa. (Trước đây là ghi đè toàn bộ.)

### Giới hạn cần nhớ
- **Thời lượng video Flow:** 4, 6, 8, 10 giây (thanh trượt tự giới hạn tối đa 10s). Không có 2s. Veo do Flow tự quyết định độ dài.
- **Tham chiếu chỉ là ảnh.** Ảnh tạo: tối đa 7 ảnh tham chiếu. Video và âm thanh tham chiếu **không dùng được** với Flow (script báo lỗi rõ ràng).
- Thử video **4 giây** trước cho đỡ tốn credit.

## 4. Quy trình làm video tương tự một video mẫu

Flow không nhận video làm tham chiếu, nên: **phân tích video thành chữ, rồi tạo video mới từ prompt**.

1. Kéo file `.mp4` vào canvas (hoặc nút **Tải video lên** trên node).
2. Chụp khung hình: **Chụp khung đầu / hiện tại / cuối** (mỗi lần tạo một node ảnh).
3. Dùng model văn bản có khả năng đọc ảnh để viết prompt mô tả phong cách, bối cảnh, ánh sáng, chuyển động.
4. Nối prompt (và ảnh khung đầu) vào node video, chọn `flow-omni-flash`, tạo.

Muốn AI hiểu **chuyển động** thật: dùng Claude Code với skill **Watch** (repo `bradautomates/claude-video`) và Gemini:
```
# C:\Users\<tên>\.config\watch\.env   (tự điền key, KHÔNG đưa lên git)
GEMINI_API_KEY=...
WATCH_GEMINI_MODEL=gemini-3.8-flash
```
Key miễn phí lấy ở aistudio.google.com. Gemini 3.8 Flash: 5 yêu cầu/phút, **20 yêu cầu/ngày** (xem hạn mức thật ở trang Rate limit của AI Studio).

## 5. Âm thanh với VoiceStudio

1. Mở VoiceStudio và để chạy (backend `http://127.0.0.1:3900`). Mã nguồn ở `voice-studio/`; file cài tải riêng (không có trong repo).
2. Canvas > **Cài đặt > Nhà cung cấp > Thêm**: giao thức **OpenAI**, endpoint `http://127.0.0.1:3900/v1`, API key bất kỳ (ví dụ `voicestudio`).
3. **Chọn model > Tải danh sách model**, chọn model đọc chữ: nên dùng `omnivoice` (hoặc `omnivoice-subprocess`). Bỏ qua `whisper*`, `*transcribe`, `faster-whisper` (đó là nhận dạng giọng nói). Đổi loại thành **Âm thanh**, lưu.
4. **Bật Proxy cục bộ** (Cài đặt > Proxy cục bộ, `http://127.0.0.1:23210`, công tắc bật). VoiceStudio không cho trình duyệt gọi trực tiếp (CORS) nên cần proxy. `app.bat` và `start.bat` đã tự chạy proxy.
5. Trong node âm thanh chọn model của VoiceStudio, mở **Cài đặt âm thanh**, bấm **Tải danh sách giọng** để quét giọng đã tạo trong VoiceStudio rồi bấm chọn (hoặc gõ mã giọng).

## 6. Nối với Claude Code

Cho Claude điều khiển canvas bằng chữ (thêm node, nối node…):

1. Chạy Canvas Agent và giữ mở:
   ```bash
   npx -y @basketikun/canvas-agent@latest
   ```
2. Thêm MCP cho Claude Code. **PowerShell** nuốt dấu `--`, dùng một trong hai:
   ```powershell
   claude mcp add infinite-canvas --% -- npx -y @basketikun/canvas-agent@latest mcp
   ```
   hoặc chạy lệnh gốc trong **cmd**: `claude mcp add infinite-canvas -- npx -y @basketikun/canvas-agent@latest mcp`
3. Trong canvas bấm **Agent**, dán Local URL và token (thường tự tìm), bấm **Connect**.
4. Mở phiên Claude Code **mới** và ra lệnh. Ô chat bên phải của canvas chỉ chạy Codex.

## 7. Lưu trữ dữ liệu

Canvas, ảnh, video, tài sản, cài đặt nằm trong cơ sở dữ liệu của cửa sổ app, mặc định `%APPDATA%\infinite-canvas-flow`.
Đổi thư mục: **Cài đặt > Lưu trữ cục bộ > Đổi thư mục** (hoặc menu **Tệp**, nhấn Alt). App khởi động lại, có thể chép dữ liệu cũ sang.
Sao lưu: dùng **Xuất canvas**, **Xuất tài sản**, **Xuất cài đặt**.

## 8. Xử lý lỗi thường gặp

| Hiện tượng | Nguyên nhân / cách xử lý |
|---|---|
| Tạo ảnh/video báo 404 | Script gọi sai đường dẫn. Nhập lại `import-flow-config.json` (bản mới dùng địa chỉ đầy đủ) |
| "Script không trả về video" | Script cũ lỗi. Nhập lại `import-flow-config.json` |
| Video tạo xong nhưng canvas không bắt được | Link Google bị chặn khi tải từ trình duyệt; script mới tải qua FlowKit (`/api/flow/proxy-media`). Chạy lại FlowKit, nhập lại cấu hình |
| Tải danh sách giọng báo 401 | Node còn dùng model OpenAI. Chọn model của nhà cung cấp VoiceStudio |
| Tải model/giọng VoiceStudio báo "Yêu cầu thất bại" | CORS. Bật Proxy cục bộ |
| Chỉ có model OpenAI trong danh sách | Chưa nhập `import-flow-config.json` |
| Cổng 8100 bị chiếm | Đang chạy cả `start.bat` lẫn `app.bat`. Tắt một cái |
| Lag khi gõ nhanh / lỗi "Maximum update depth exceeded" | Dùng `app.bat` (bản build, nhanh hơn dev). Đã giảm ưu tiên cập nhật khi gõ; nếu còn lỗi, ghi lại thao tác gây ra |
| FlowKit không kết nối | Mở tab flow.google.com đã đăng nhập, extension đã nạp. Kiểm tra `http://127.0.0.1:8100/health` |

## 9. Phát triển

- Sau khi sửa `app/web`: `npm --prefix app/web run build` để `app.bat` nhận thay đổi.
- Kiểu dữ liệu: `npx tsc --noEmit` trong `app/web` (có một lỗi cũ ở `model-script-editor.tsx` không liên quan).
- Ngôn ngữ: `app/web/src/i18n/locales/` (`vi-VN.ts` là bản dịch Việt; khóa thiếu dùng bản `en-US`). Nút ngôn ngữ ở góc trên xoay VI > EN > 中.
- Git: `git add -A`, `git commit -m "..."`, `git push`. Không commit `.flow-project-id`, API key, `*.db`.
- Giấy phép: giữ nguyên LICENSE của từng phần (xem bảng nguồn gốc trong `README.md`). `voice-studio/` là AGPL-3.0.
