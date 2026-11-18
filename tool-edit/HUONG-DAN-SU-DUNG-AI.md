# HƯỚNG DẪN DÙNG TOOL EDIT CHO AI (để EDIT VIDEO)

File này dành cho AI **dùng** Tool Edit để dựng video theo yêu cầu của người dùng.
(Nếu bạn được giao **sửa/xây thêm phần mềm** thì đọc `HUONG-DAN-AI.md` cùng thư mục, không phải file này.)

Trả lời người dùng bằng **tiếng Việt**, ngắn gọn: đã làm gì, kết quả ở đâu, còn gì chưa kiểm.

> **Quy tắc bảo trì (bắt buộc):** mỗi khi thêm, đổi hay bỏ một chức năng, tool MCP hay hành vi mà AI thấy được,
> **cập nhật file này trong cùng lần làm** (mục 4 danh sách tool, mục 5 luật, mục 8 "Còn hạn chế"),
> rồi ghi một dòng vào `NHAT-KY.md` và `CHUC-NANG.md`. Ghi ngày ở "Cập nhật gần nhất" cuối file.

---

## 1. Chuẩn bị (mỗi lần bắt đầu)

1. **Tool Edit phải đang chạy.** Mở `tool-edit/release/ToolEdit/ToolEdit.exe` (bản đóng gói), hoặc `npm start` trong `tool-edit/`. MCP chỉ là cầu nối tới app đang mở, cổng nội bộ `127.0.0.1:17480`.
2. **MCP `tool-edit` phải gắn vào phiên của bạn** (tool tên `mcp__tool-edit__*`). Cấu hình có sẵn ở `D:\dự án antigravity\full studio\.mcp.json` (chạy `tool-edit/dist/mcp.mjs`). Phiên đang chạy không nạp thêm MCP: nếu không thấy tool, nhờ người dùng mở phiên mới trong thư mục `full studio` và chấp nhận server `tool-edit`.
3. Gọi **`app_status`**: kiểm tra app lên, GPU, số clip, việc nền đang chạy. Nếu báo chưa chạy: dừng, nhờ người dùng mở app.
4. Nếu Trang chủ hiện khung "Máy còn thiếu…", báo người dùng đúng mục thiếu (FFmpeg, Python, gói Python, mô hình tách nền). Thiếu mục nào thì chức năng tương ứng (nhập media, phiên âm, tách nền, nhịp nhạc) sẽ lỗi.
5. Gọi **`project_get`** để biết dự án hiện có gì. Dự án lớn (hàng chục clip trở lên) thì dùng `summary=true`, rồi `track_id` hoặc `from`/`to` để xem từng phần. Đừng tải cả dự án 177 clip nếu không cần.

## 2. AI tự áp dụng, không cần người duyệt

- Mặc định, thay đổi của bạn (`propose_ops` và các tool chữ, màu, phụ đề, SFX…) **được áp dụng ngay** nếu hợp lệ. Kết quả có `applied: true`.
- Lệnh sai bị từ chối kèm lý do (kiểm tra thử trước khi áp dụng): đọc lỗi, sửa, gửi lại. Đừng gửi mù.
- Người dùng thấy thông báo "AI vừa áp dụng…" kèm nút **Hoàn tác**, và Ctrl+Z hoàn tác từng bước. Bạn **không** có tool hoàn tác hay chấp nhận.
- Người dùng có thể **tắt** chế độ này ở Cài đặt → AI. Khi tắt, kết quả có `applied: false` và thay đổi nằm ở hàng đề xuất chờ họ bấm Chấp nhận: nói rõ cho họ biết có đề xuất chờ duyệt, đừng coi là đã xong.
- **Trước khi làm thay đổi lớn** (đổi nhiều clip, dựng lại cả timeline) gọi `snapshot_create` để người dùng có điểm quay lại. Chỉ người dùng khôi phục được snapshot.

## 3. Quy trình dựng chuẩn

1. **Nhập media**: `media_import` (đường dẫn tuyệt đối). Trả `mediaId` và `job_id`; hỏi **`job_status` đến khi `done`** rồi mới đặt clip. Chưa `cache.status=ready` thì không dùng được.
2. **Xem** `project_get` (tóm tắt) để biết track, id, độ dài.
3. **Dựng** bằng `propose_ops` (cấu trúc, cắt, dời, biến đổi) và các tool chuyên dụng (mục 4).
4. **Tự kiểm bằng mắt sau mỗi bước chính**: `preview_frame` (một khung) và `contact_sheet` (cả timeline). Mô tả trung thực điều bạn thấy; lỗi thì sửa ngay, đừng đợi dựng xong hết.
5. **`qc_check`** trước khi xuất (glyph tiếng Việt, tràn khung, loudness, phủ lời).
6. **Xuất**: `render_start` (preset `9:16` hoặc `16:9`, NVENC chạy nền theo job) rồi `job_status` đến khi xong. Báo đường dẫn file cho người dùng.
7. Cần mang sang phần mềm khác: `export_timeline` (Premiere, DaVinci Resolve, CapCut, After Effects, EDL).

## 4. Danh sách tool MCP (43)

Chi tiết tham số nằm trong mô tả của từng tool; đọc mô tả khi gọi lần đầu.

| Nhóm | Tool | Việc |
|---|---|---|
| Trạng thái | `app_status`, `project_get`, `job_status`, `job_cancel`, `proposals_list` | Xem app, dự án (có `summary`, `track_id`, `from`, `to`), việc nền, đề xuất |
| Nhập/xem | `media_import`, `preview_frame`, `contact_sheet`, `analyze_frame`, `scope_image` | Nhập media; xem khung, xem cả timeline; đo/scope màu |
| Chỉnh sửa | `propose_ops` | Mọi op cấu trúc: thêm/xoá/chia/dời clip, track, transform, keyframe, nhóm, vô hiệu, marker |
| Chữ | `list_fonts`, `list_presets`, `add_text`, `apply_preset`, `set_keyframes` | Chữ (font đủ dấu Việt), preset chuyển động, keyframe + ease |
| Phụ đề/lời | `transcribe`, `get_transcript`, `fix_transcript`, `generate_captions`, `cut_words`, `cut_silences` | Whisper từng từ, sửa lời, phụ đề từng từ, dựng theo lời, cắt khoảng lặng |
| Âm thanh | `list_library`, `suggest_sfx`, `duck_music`, `detect_beats`, `beat_markers` | Kho SFX/nhạc, SFX theo sự kiện, hạ nhạc khi có lời, nhịp nhạc |
| Tách nền/tốc độ | `remove_background`, `apply_matte`, `text_behind_person`, `set_speed` | Tách người (RVM), chữ sau lưng người, tốc độ và speed ramp |
| Màu | `grade_get`, `grade_set`, `apply_lut`, `match_color` | Chỉnh màu, LUT, khớp màu giữa clip |
| Hiệu ứng/hình | `set_fx`, `set_blend`, `add_shape` | Blur, glow, bóng, bo góc, vignette, wipe; chế độ trộn; hình vector |
| An toàn/xuất | `snapshot_create`, `snapshots_list`, `qc_check`, `render_start`, `export_timeline` | Điểm quay lại, kiểm chất lượng, xuất video, xuất sang phần mềm khác |

## 5. Luật dựng (đã trả giá bằng lỗi thật)

- **Việc dài chạy nền** (nhập, phiên âm, tách nền, xuất): lấy `job_id`, hỏi `job_status`, **không giả định đã xong**. Không có hộp thoại chặn.
- **Keyframe `t` tính từ ĐẦU CLIP**, không phải đầu timeline. `x`, `y` của transform theo tỉ lệ khung (0 = giữa).
- **Chữ tiếng Việt**: chọn font bằng `list_fonts` (chỉ font đủ dấu). Chọn font thiếu dấu thì `project_get.warnings` báo lỗi.
- **Clip cùng track không được chồng nhau**; `in + duration` không vượt độ dài nguồn.
- **Xoá giữa track**: dùng `ripple_delete` để các clip sau tự kéo lùi liền.
- **Tách nền**: nếu `remove_background` báo `MODEL_MISSING`, dừng và báo người dùng (cần file `models/rvm_mobilenetv3_fp32.onnx`, khoảng 15 MB). Không tự tải về.
- **SFX và nhạc**: dùng kho của app (`list_library`). Nhạc/SFX trong ví dụ khoá học chỉ để học, không đưa vào video thương mại. Chuẩn cuối **−14 LUFS** (app đo khi xuất).
- **Hiệu năng**: đừng gọi `preview_frame` dồn dập trong lúc app đang xuất hoặc người dùng đang phát. Giải mã chạy tuần tự nên gọi chồng làm giật. Nhập media lớn thì để job cache xong rồi mới thao tác.
- **Máy 16 GB RAM, GPU 6 GB**: app giữ trần RAM cho cache giải mã (1,5 GB) nên mở dự án lớn vẫn ổn, nhưng đừng nhập hàng chục video 4K cùng lúc.
- **Dự án nhiều clip** (vd. dựng lại Foodtage, 177 clip): dùng `project_get` có `summary`/`track_id`/`from`/`to`, không đọc hết.
- **Đừng làm điều người dùng không yêu cầu.** Đề xuất thêm (phụ đề, SFX, màu) thì hỏi trước khi áp dụng, vì giờ thay đổi tự có hiệu lực ngay.

## 6. Thể loại video và kit tham chiếu

Tool Edit được xây để thay dần After Effects. Khi người dùng muốn một thể loại, đọc kit tương ứng trong `phong-cach/` để biết **phong cách, nhịp, thông số**, rồi dựng bằng tool ở mục 4:
- Talking head dọc (người nói, phụ đề từng từ, chữ sau lưng người): `phong-cach/talking-head/`. Mẫu đã dựng lại trong Tool Edit: `scripts/build-foodtage.mjs` (lần 1, còn khác bản AE).
- SaaS animation: `phong-cach/saas-animation/` (**Tool Edit chưa dựng lại được**, vẫn dùng After Effects; xem `CHUC-NANG.md` F-61).
- Luồng điều phối cả video (kịch bản → giọng + clip AI → dựng): `../HUONG-DAN-AI.md` mục 2.

## 7. Khi có lỗi

| Hiện tượng | Xử lý |
|---|---|
| Tool báo app chưa chạy | Nhờ người dùng mở Tool Edit |
| Lệnh bị từ chối (dry-run) | Đọc `errors`, sửa đúng chỗ, gửi lại |
| `403` ở đường áp dụng/hoàn tác/lưu | Đúng thiết kế: chỉ giao diện làm được. Nhờ người dùng làm trong app |
| Khung xem đen / lỗi giải mã | Media chưa `cache.status=ready`, hoặc giải mã đang bận: chờ job rồi thử lại |
| Xuất treo hoặc chậm | Đừng gọi `preview_frame` lúc đang xuất; kiểm `job_status` |
| Phiên âm/tách nền lỗi | Kiểm thiếu Python, gói, mô hình (mục 1.4) |

## 8. Còn hạn chế (đừng hứa quá)

- Whisper **tiếng Việt thật** chưa đo độ chính xác: đọc lại `get_transcript` và `fix_transcript` trước khi tạo phụ đề.
- AI **không nghe được**: SFX, nhịp, duck nhạc chưa được kiểm bằng tai. Nhờ người dùng nghe.
- Bản xuất sang Premiere, DaVinci, After Effects, CapCut **chưa mở thử trong phần mềm thật**.
- Chưa có: qualifier HSL, power window, nội suy khung RIFE (chỉ trộn khung), dựng lại video SaaS (F-61).
- MCP mới thử bằng client SDK và Claude; Gemini/GPT chưa kiểm.
- Chưa có proxy chỉnh sửa (dùng thẳng cache đã chuẩn hoá).

---
Cập nhật gần nhất: 2026-11-18 (AI tự áp dụng + nút bật/tắt; `project_get` có `summary`; kiểm phụ thuộc khi mở app; trần RAM cache giải mã; hỏi trạng thái nền theo nhịp thích ứng).
