# 00. Cài đặt trên máy mới (Windows)

Làm một lần mỗi máy. Đã chạy trên Windows 10, After Effects 2026 (26.0), Node 24, Python 3.13, GPU RTX 3060.

## 1. Cầu nối MCP với After Effects (`ae-bridge/`)

Gồm 2 phần:
- **MCP server** (Node, `ae-bridge/src/server.js`): Claude hoặc AI khác gọi các tool `ae_*` qua MCP (stdio).
- **Extension "Claude Bridge"** (panel CEP, `ae-bridge/panel/`): chạy bên trong AE, nhận lệnh từ server qua HTTP `127.0.0.1:47811` kèm token ngẫu nhiên (ghi trong `%TEMP%\claude-ae-bridge\panel.json`). Mỗi lệnh chỉ mất khoảng 40–70 ms.
  Nếu không mở panel, server tự chuyển sang cách cũ là gọi `AfterFX.exe -r job.jsx` (chậm hơn).

```
AI ──MCP stdio──> node ae-bridge/src/server.js ─┬─ HTTP 127.0.0.1:47811 ──> panel Claude Bridge ──> After Effects
                                                 └─ (không có panel) AfterFX.exe -r job.jsx ──> After Effects
```

Các bước:

1. Cài **Node.js ≥ 18**. Trong `ae-bridge/` chạy `npm install`, rồi `npm run check`: phải thấy 13 dòng `ok` và `MCP: 13 tools`.
2. **Cài extension**: `npm run install-panel`, hoặc `powershell -ExecutionPolicy Bypass -File install-panel.ps1`.
   - Lệnh này chép `panel\` vào `%APPDATA%\Adobe\CEP\extensions\com.claude.aebridge` và bật `PlayerDebugMode=1` (CSXS.9–13, chỉ cho user hiện tại) để AE nạp được panel chưa ký.
   - Gỡ: `install-panel.ps1 -Uninstall`.
   - File `install-panel.ps1` phải giữ **UTF-8 có BOM**, nếu không PowerShell 5.1 đọc sai chữ Việt.
3. Trong AE: **Edit > Preferences > Scripting & Expressions**, bật *Allow Scripts to Write Files and Access Network*.
4. Khởi động lại AE, mở **Window > Extensions > Claude Bridge**. Chấm trạng thái xanh nghĩa là sẵn sàng. AE nhớ panel trong workspace.
   Panel có các nút: Chụp (khung hiện tại), Self test (phiên bản, quyền ghi file, matchName hiệu ứng), Thư mục (mở thư mục tạm).
5. **Đăng ký MCP** với AI:
   - Claude Code:
     ```bash
     claude mcp add after-effects --scope user -- node "<KIT>\ae-bridge\src\server.js"
     ```
     AE cài ngoài `C:\Program Files\Adobe\Adobe After Effects <năm>\` thì thêm `-e AE_EXE="<...>\Support Files\AfterFX.exe"`.
   - AI khác hỗ trợ MCP: khai báo server stdio với lệnh `node <KIT>/ae-bridge/src/server.js`, biến môi trường `AE_EXE` nếu cần.
6. Mở phiên AI mới và gọi `ae_status`: kết quả phải có `"bridge": "panel Claude Bridge"`.

Lưu ý:
- **Sửa code trong `ae-bridge/src` thì phải khởi động lại hẳn tiến trình node.** Trên Claude desktop, Reconnect trong `/mcp` không đủ: phải thoát hẳn app rồi mở lại. Sửa `panel/` thì cài lại panel và khởi động lại AE.
- **Render lâu bị MCP cắt.** `ae_render` mặc định chờ 1800 s, nhưng client MCP có thể có giới hạn "không phản hồi" riêng. Với Claude Code: đặt biến môi trường `CLAUDE_CODE_MCP_TOOL_IDLE_TIMEOUT` (ms, `0` là tắt), hoặc khai báo `timeout` riêng cho server `after-effects`.
  Nếu bị cắt: render có thể vẫn đã xong, kiểm tra file bằng `ffprobe -count_frames`.
- Biến môi trường khác: `AE_NO_PANEL=1` để buộc dùng `AfterFX.exe -r`; `AE_DRY_RUN=1` để chỉ ghi job, không chạy.
- File tạm và job lỗi nằm ở `%TEMP%\claude-ae-bridge\`.
- Chi tiết từng tool: `ae-bridge/README.md`.

## 2. Python + công cụ chuẩn bị clip

```bash
pip install -r tools/requirements.txt
```
- Có GPU NVIDIA: gỡ `onnxruntime` thường trước khi cài `onnxruntime-gpu==1.23.*` (bản 1.24+ cần CUDA 13).
- Mô hình tách người đã kèm sẵn: `tools/models/rvm_mobilenetv3_fp32.onnx`.
- Mô hình Whisper `large-v3-turbo` (khoảng 1,6 GB) tự tải về ở lần phiên âm đầu tiên.
- ffmpeg/ffprobe phải có trong PATH (đã dùng bản 9.0 của gyan.dev).

## 3. Font

Cài font dùng trong video, ví dụ `examples/foodtage/assets/Fonts/` (giải nén Tactic Sans). Chuột phải > Install, hoặc chép vào `%LOCALAPPDATA%\Microsoft\Windows\Fonts`. AE thường nhận ngay; nếu chưa thì khởi động lại AE.
Kiểm tra dấu tiếng Việt: `python tools/fonts_vi.py <file|thư mục>`.

## 4. Kiểm tra cuối

Dựng lại ví dụ: `examples/foodtage/README.md` mục "Chạy lại". Kết quả phải ra 8 giai đoạn không lỗi và 144 layer.
