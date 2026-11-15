# claude-ae-bridge

MCP server cho phép Claude (Claude Code / Claude Desktop) điều khiển **Adobe After Effects**
trên Windows: tạo comp, import clip, xếp clip nối tiếp, thêm chữ, xem thử khung hình, render.

## Cách hoạt động

```
Claude ──MCP (stdio)──> node src/server.js ─┬─ HTTP 127.0.0.1:47811 ──> panel Claude Bridge ──evalScript──> After Effects
                                            └─ (không có panel) AfterFX.exe -r job.jsx ──> After Effects
```

Mỗi lệnh được dịch thành một đoạn ExtendScript. Nếu panel **Claude Bridge** đang mở trong AE,
server gửi thẳng cho panel (nhanh, không cần file tạm). Nếu không, server dùng cách cũ:
ghi `.jsx` vào `%TEMP%\claude-ae-bridge\`, chuyển cho AE bằng `AfterFX.exe -r`, rồi đọc file
JSON kết quả. Mỗi lệnh là một bước Undo (Ctrl+Z) trong AE. `ae_status` cho biết lệnh đi đường nào.

### Panel Claude Bridge (tuỳ chọn, nên cài)

```powershell
npm run install-panel        # gỡ: powershell -File install-panel.ps1 -Uninstall
```

Script chép `panel\` vào `%APPDATA%\Adobe\CEP\extensions\com.claude.aebridge` và bật
`PlayerDebugMode` (CSXS.9–13, chỉ cho user hiện tại) để AE nạp panel chưa ký. Khởi động lại AE,
mở **Window > Extensions > Claude Bridge** (AE nhớ panel trong workspace).

Panel có: chấm trạng thái (xanh = sẵn sàng, vàng = đang chạy lệnh), **Chụp** (khung hình hiện
tại của comp đang mở), **Self test** (phiên bản, quyền ghi file của script, matchName các hiệu
ứng hay dùng), **Thư mục** (mở thư mục tạm) và nhật ký lệnh gần đây. Panel chỉ nghe ở
127.0.0.1 và chỉ nhận lệnh kèm token ngẫu nhiên ghi trong `%TEMP%\claude-ae-bridge\panel.json`.
Đặt `AE_NO_PANEL=1` để buộc server dùng `AfterFX.exe -r`.

## Cài đặt (một lần)

1. Cài Node.js ≥ 18, rồi trong thư mục này: `npm install`
2. Trong After Effects: **Edit > Preferences > Scripting & Expressions** → bật
   **Allow Scripts to Write Files and Access Network** (không có thì không nhận được kết quả).
3. Đăng ký với Claude Code (dùng được trong mọi dự án):

   ```bash
   claude mcp add after-effects --scope user -- node "D:\dự án antigravity\claude-ae-bridge\src\server.js"
   ```

   AE cài ngoài `C:\Program Files\Adobe\Adobe After Effects <năm>\` thì thêm
   `-e AE_EXE="<đường dẫn>\Support Files\AfterFX.exe"` vào lệnh trên.
4. Mở After Effects, rồi mở phiên Claude Code mới và hỏi "trạng thái AE".

## Tool

| Tool | Việc làm |
|------|----------|
| `ae_status` | Phiên bản AE, project đang mở, danh sách comp |
| `ae_list_items` / `ae_comp_info` | Xem item trong project / layer của một comp |
| `ae_new_project` / `ae_open_project` / `ae_save_project` | Quản lý file .aep |
| `ae_import_files` | Import video/ảnh/audio, tuỳ chọn vào folder |
| `ae_create_comp` | Tạo comp (mặc định 1080×1920, 30fps) |
| `ae_add_layers` | Đặt clip vào comp, xếp nối tiếp, cắt đầu/cuối, scale phủ khung |
| `ae_add_text` | Thêm chữ/phụ đề: font, cỡ, màu, viền, vị trí, thời gian |
| `ae_preview_frame` | Xuất một khung hình PNG để Claude tự nhìn và kiểm tra |
| `ae_render` | Render comp ra file qua Render Queue |
| `ae_run_script` | Chạy ExtendScript tuỳ ý (hiệu ứng, keyframe, expression...) |

Ví dụ yêu cầu: *"Import các file output/abc/scene*.mp4, tạo comp dọc 1080x1920, xếp nối tiếp,
thêm tiêu đề ở 2 giây đầu, xem thử khung giây 1 rồi render ra D:\out\abc.mp4."*

## Lưu ý

- AE phải đang mở và không vướng hộp thoại; nếu AE chưa mở, lệnh đầu tiên sẽ khởi động AE
  (có thể quá thời gian chờ — gọi lại sau khi AE mở xong).
- `ae_render` khoá AE tới khi render xong. Template output module mặc định tuỳ phiên bản AE;
  AE 2023+ thường có sẵn H.264 (mp4).
- `ae_new_project` khi project hiện tại chưa lưu: AE hỏi lưu trong cửa sổ AE, trả lời ở đó.
- Kiểm tra không cần AE: `npm run check`.
- File tạm nằm ở `%TEMP%\claude-ae-bridge\`; job lỗi được giữ lại để xem.
