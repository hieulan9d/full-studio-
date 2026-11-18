# THỬ MCP VỚI AI THẬT (Claude, Gemini, GPT)

Mục đích: biết AI nào dùng được Tool Edit qua MCP, chỗ nào hiểu sai mô tả tool. Đây là bước **F-14** (`CHUC-NANG.md`). Kết quả ghi vào bảng ở mục 6.

Trạng thái: **chưa có AI thật nào được thử** (2026-11-16). Phần máy móc đã kiểm bằng client MCP của SDK (`npm run mcp-test`, 23 kiểm) và kịch bản mô phỏng AI (nhập, đề xuất, duyệt, xuất).

## 1. Chuẩn bị (một lần)

1. Có file thử trong `out/media/` (cách tạo ở `NHAT-KY.md`, mục "Tạo file thử"): `seq.mp4`, `color.mp4`, `test-a.mp4`.
2. `npm install` và `npm run build` đã chạy.
3. Kiểm cấu hình khởi chạy được: `npm run mcp-config-check` (app tắt vẫn đạt: tool báo "chưa chạy").

## 2. Mở app và duyệt đề xuất

```bash
npm start
```
Giữ cửa sổ Tool Edit mở. Khi AI gọi `propose_ops`, tab **"Đề xuất của AI"** (bên phải) hiện huy hiệu và thông báo. Bấm **Xem thử** để thấy kết quả giả định (khung xanh = clip sẽ thêm, khung đỏ = clip sẽ xoá; dự án chưa đổi), rồi **Chấp nhận** hoặc **Từ chối**. **Không** bật `TOOL_EDIT_DEV_API`: nếu bật, HTTP cho phép tự duyệt và phép thử mất ý nghĩa.

## 3. Gắn MCP vào từng AI

Server: `node "D:/dự án antigravity/full studio/fullstudio/tool-edit/dist/mcp.mjs"`. Đặt `TOOL_EDIT_AI_NAME` khác nhau cho mỗi AI để báo cáo phân biệt được nguồn (`ai:claude`, `ai:gemini`, `ai:gpt`).

| AI | Cách gắn | Trạng thái |
|---|---|---|
| **Claude Code** | Đã có `D:\dự án antigravity\full studio\.mcp.json`. **Mở phiên mới** trong thư mục `D:\dự án antigravity\full studio` (phiên đang chạy không nạp thêm MCP), chấp nhận server `tool-edit` khi được hỏi | cấu hình đã kiểm khởi chạy; chưa thử AI |
| **Gemini CLI** | Thêm vào `~/.gemini/settings.json`: `{"mcpServers":{"tool-edit":{"command":"node","args":["<đường dẫn mcp.mjs>"],"env":{"TOOL_EDIT_AI_NAME":"gemini"}}}}` | [chưa kiểm] theo trí nhớ về định dạng |
| **Codex** | Thêm vào `~/.codex/config.toml`: `[mcp_servers.tool-edit]`, `command = "node"`, `args = ["<đường dẫn mcp.mjs>"]`, `env = { TOOL_EDIT_AI_NAME = "gpt" }` | [chưa kiểm] |
| **Antigravity** | Quản lý MCP trong giao diện (xem cấu hình thô), dùng cùng khối `mcpServers` như trên | [chưa kiểm] |

**Rủi ro đường dẫn có dấu tiếng Việt** (`dự án`): server khởi chạy tốt từ Node, nhưng một số client trên Windows có thể xử lý sai ký tự này. Nếu client báo không tìm thấy file, tạo liên kết thư mục không dấu rồi dùng nó trong cấu hình:
```bash
cmd /c mklink /J C:\tool-edit-link "D:\dự án antigravity\full studio\fullstudio\tool-edit"
```
(đường dẫn trong `args` thành `C:/tool-edit-link/dist/mcp.mjs`).

## 4. Prompt thử (dán nguyên văn cho AI)

> Bạn có MCP `tool-edit` (phần mềm dựng video). Hãy làm đúng các bước, dùng tool, đừng đoán:
> 1. Gọi `app_status` rồi `project_get` để biết trạng thái.
> 2. Nhập hai video: `D:\dự án antigravity\full studio\fullstudio\tool-edit\out\media\seq.mp4` và `...\out\media\test-a.mp4` bằng `media_import`. Chờ `job_status` báo `done` cho cả hai.
> 3. Bằng `propose_ops`, đề xuất bố cục 9:16: `seq.mp4` ở track `v1` từ giây 0 đến 3; `test-a.mp4` cũng ở `v1` từ giây 3 đến 6, lấy từ giây 1 của nguồn. Tôi sẽ duyệt.
> 4. Sau khi tôi duyệt, dùng `preview_frame` xem khung giây 1 và giây 4, rồi `contact_sheet` xem cả timeline. Mô tả bạn thấy gì.
> 5. Đề xuất thêm: thu nhỏ clip thứ hai còn 60% (`set_transform`, `scale` 0,6) và đặt độ mờ 0,8. Chờ tôi duyệt.
> 6. Gọi `render_start` preset `9:16`, chờ xong, báo đường dẫn file.
> Nếu một tool báo lỗi, đọc lỗi, sửa rồi thử lại. Không tự ý làm điều ngoài các bước trên.

**Prompt khó (thử riêng, sau khi prompt trên chạy):** *"Cắt clip thứ hai tại giây 4,5 thành hai nửa rồi xoá nửa đầu và kéo nửa sau lùi lại cho liền."* Cần `split_clip` rồi `ripple_delete`, và AI phải tự tính `at`, `newId`.

**Prompt thử chữ + keyframe (GĐ2, sau khi prompt trên chạy):**

> Dùng `list_presets` và `list_fonts` (chỉ font đủ dấu tiếng Việt). Bằng `add_text` đề xuất một tiêu đề tiếng Việt "Học dựng video cùng AI" từ giây 1 đến 4, dùng preset `keyword-gradient`, font đủ dấu. Sau khi tôi duyệt, dùng `set_keyframes` làm gradient trượt từ 0 đến 0,5 (thuộc tính `text.fill.offset`, ease `linear`) rồi dùng `preview_frame` xem giây 1,2 và giây 3. Cuối cùng đề xuất thêm phụ đề từng từ bằng preset `caption-word` cho câu "Chữ hiện đúng nhịp nói" ở giây 4 đến 7. Mọi thứ đều là đề xuất, chờ tôi duyệt.

**Điều cần quan sát:** AI có chọn font đủ dấu không (hay chọn Impact rồi bị `project_get.warnings` báo lỗi); có hiểu `t` của keyframe tính từ **đầu clip** không; có dùng đúng tên thuộc tính (`text.fill.offset`).

> **Prompt thử giai đoạn 3 (phụ đề và âm thanh).** Dùng `media_import` nhập clip nói, `transcribe` (language `vi`, hỏi `job_status` đến khi xong) rồi `get_transcript`. Đọc lời, dùng `fix_transcript` đề xuất sửa các từ sai chính tả (theo ngữ cảnh). Dùng `generate_captions` kiểu karaoke với font đủ dấu tiếng Việt, `cut_silences` (min_silence 0,6) và `list_library` rồi `suggest_sfx` (chỉ whoosh khi cắt cảnh, chữ hiện dùng pop). Cuối cùng `qc_check` và báo lại vấn đề. Mọi thứ đều là đề xuất chờ tôi duyệt (tôi sẽ bỏ tick SFX không thích). Nhớ: bạn không nghe được âm thanh, đừng khẳng định SFX "nghe hay".

> **Prompt thử giai đoạn 4 (tách nền, chữ sau lưng người, speed ramp).** Nhập clip người nói bằng `media_import`, `remove_background` (hỏi `job_status` đến khi xong; nếu báo `MODEL_MISSING` thì dừng và báo tôi, đừng tự tải). Dùng `text_behind_person` đề xuất chữ "TIÊU ĐỀ" sau lưng người với font đủ dấu tiếng Việt, rồi `preview_frame` xem một khung để xác nhận chữ nằm sau người. Sau đó dùng `set_speed` với preset `hero-time` cho một đoạn clip và báo tôi biết clip đó bị tắt tiếng. Mọi thứ đều là đề xuất chờ tôi duyệt. Nhớ: bạn không nghe được âm thanh và không thấy viền tóc nhấp nháy qua một khung, hãy xem nhiều khung bằng `contact_sheet`.

> **Prompt thử giai đoạn 5 (chỉnh màu).** Chọn một clip video. Dùng `analyze_frame` (clip_id, graded=false) và `scope_image` (kind=parade và vectorscope) để ĐO màu gốc, nói cho tôi biết: có cháy sáng hay ép đen không, có lệch màu không (trường `cast`), da có nằm gần đường da không. Sau đó dùng `grade_set` đề xuất chỉnh nhỏ (phơi sáng, nhiệt độ, tương phản) dựa trên SỐ ĐO, rồi dùng `analyze_frame(proposal_id)` và `preview_frame(proposal_id)` kiểm lại trước khi tôi duyệt. Nếu tôi đưa file `.cube`, dùng `apply_lut`. Nhớ: bạn không thấy màu như người, đừng khẳng định "đẹp"; chỉ báo số đo và thay đổi. Mọi thứ đều là đề xuất chờ tôi duyệt.

> **Prompt thử giai đoạn 6 (hiệu ứng, hình, chế độ trộn).** Dùng `add_shape` đề xuất một vòng `ring` (viền trắng 6 px, đường kính 70) tại một điểm trên khung từ giây 2 đến 2,4, rồi `set_keyframes` cho `transform.scale` (0,6 → 1,9) và `transform.opacity` (1 → 0) để thành "vòng nổ". Dùng `set_fx` cho một clip video: `round` 0,08 và `shadow` (y 20, blur 40, opacity 0,5). Dùng `set_blend` `screen` cho một clip light leak. Kiểm lại bằng `preview_frame(proposal_id)`. Mọi thứ là đề xuất chờ tôi duyệt; nhớ đơn vị px theo cạnh ngắn 1080 và hiệu ứng phải có trước khi keyframe `fx.*`.

## 5. Chấm kết quả

Sau khi AI xong (app vẫn đang chạy): `npm run mcp-report`. (Báo cáo chỉ dùng các đường HTTP chỉ-đọc nên chạy được khi app ở chế độ thường.)

Báo cáo cho biết: dự án cuối, số đề xuất **chấp nhận/từ chối/sai** theo từng AI, lịch sử theo nguồn, job, kiểm file xuất (kích thước, số khung, có âm thanh), và **kiểm luật**. Thoát mã 1 nếu có **VI PHẠM** (AI áp dụng thay đổi không qua đề xuất được duyệt).

Cách đọc:
- **Đề xuất SAI nhiều** = AI hiểu sai mô tả tool: ghi lỗi mẫu (`loi pN: ...`), sửa mô tả trong `src/mcp/server.ts` (`OPS_HELP`) hoặc thêm tool cấp cao.
- **Không gọi `preview_frame`** = AI không "nhìn": xem client có hiển thị ảnh từ tool không.
- **Quay lại hỏi bạn thay vì tự chờ `job_status`** = mô tả tool chưa đủ rõ về chu trình chờ job.

## 6. Bảng kết quả (điền sau khi thử)

| Tiêu chí | Claude | Gemini | GPT |
|---|---|---|---|
| Khởi chạy server từ cấu hình | | | |
| `media_import` + chờ job | | | |
| `propose_ops` hợp lệ ngay lần đầu (số lần sai) | | | |
| Thấy được ảnh `preview_frame` / `contact_sheet` | | | |
| Xử lý lỗi tool và tự sửa | | | |
| Không áp dụng thẳng (báo cáo không VI PHẠM) | | | |
| `render_start` xong, file đúng | | | |
| Prompt khó (split + ripple) | | | |
| Ghi chú lỗi tương thích | | | |

## 7. Giới hạn cần biết khi thử

- Duyệt làm trong giao diện. HTTP mặc định **không có** đường accept/reject/ops/undo (403): AI có shell cũng không tự duyệt được bằng `curl`. HTTP vẫn **chưa có token**, nên tiến trình bất kỳ có thể đọc dự án, gửi đề xuất, nhập media, xuất video. Một AI điều khiển được giao diện (computer use) vẫn có thể bấm duyệt: nằm ngoài phạm vi.
- Dự án sống trong bộ nhớ nhưng có **tự lưu** và nút Lưu (`.tedit`); tắt app rồi mở lại sẽ hỏi khôi phục phiên.
- Nhập được video, ảnh tĩnh và âm thanh.
- Các prompt dùng `test-a.mp4` (1080×1920) và `seq.mp4` (360×640): khác tỉ lệ nên được `fit` vào khung 9:16.
