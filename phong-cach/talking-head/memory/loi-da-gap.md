# Lỗi và bẫy đã gặp (Talking head dọc)

Thêm mục mới ở dưới. Bẫy đã có trong knowledge/ thì chỉ cần trỏ tới, đừng chép lại.

### Font Foodtage thiếu dấu Việt   [chạy thật]
- Xem knowledge/10; kiểm font bằng tools/fonts_vi.py trước khi lập plan.
### Chưa có video tiếng Việt nào được dựng   [chưa kiểm]
- Xem CON-THIEU.md mục A2, B. Phiên âm tiếng Việt chưa đo độ chính xác: sửa transcript tay.

### 2026-11-16/17 — Bẫy từ video Bojomi   [chạy thật]
- Chi tiết ở `knowledge/07-bay-loi.md` mục 28–40: scale có keyframe (`H.mulScale`), bộ đếm số (`*1`), chữ Việt trong .jsx (`enc.py`), Flow upload lỗi do tên ảnh, Flow chặn "hoạt động bất thường" (dừng, không né), Muse cần `canvas_run_generation`, xuất file cần viewport, `ae_render` báo lỗi dù file đã ra, cắt lời lỗi, tường có logo, ảnh sản phẩm che mặt.
- Lời nói ≠ nhãn bao bì ("170 mg" vs 169,8 µg; "đủ dưỡng chất"): luôn ghi vào báo cáo và hỏi người dùng thu lại/cắt; chữ màn hình theo nhãn.
- Mặt "Thành phần" trên ảnh bao bì tham chiếu nhoè (ảnh dựng AI): không lên màn hình.

### 2026-11-19 — Bẫy khi dựng bằng Tool Edit (video-chi v4)   [chạy thật]
- `propose_ops` kiểm schema: mỗi keyframe phải có `ease` dạng object (`{"kind":"linear"}`, `{"kind":"hold"}`, bezier cần x1..y2); chuỗi "snap" bị từ chối. `text.blur` KHÔNG keyframe được (chỉ `text.size/letterSpacing/shadow/glow/fill...`). `fx.shadow` bắt buộc có `x`.
- Shape không ghi `fill` = tô trắng (khung viền thành khối trắng che ảnh): khung viền phải có `"fill":""`.
- Track xếp từ dưới lên theo thứ tự tạo; nền thẻ phải nằm dưới chữ của thẻ. `generate_captions` tự tạo track mới trên cùng (nằm đè mọi thứ): xoá các câu phụ đề ở đoạn hook, B-roll, thẻ kết bằng `remove_clip`.
- Không có SFX trong thư viện app (`list_library` rỗng): nhập từng file wav từ `saas-animation/audio/sfx` bằng `media_import` rồi đặt clip audio.
- Gửi hàng trăm clip: sinh JSON bằng Python rồi chia khối ≤ 14 KB; `proposals_list` / `project_get track_id` trả > 200 KB, đọc từ file persisted bằng Python, đừng đọc thẳng.
- Whisper tiếng Việt vẫn sai nhiều (BOJOMI, tảo→tàu, hệ→hề, vận động…): sửa bằng `fix_transcript` trước khi tạo phụ đề; phụ đề tách "BOJO MI" nên sửa tay bằng `set_text`.

### 2026-11-21 — Dựng bằng Tool Edit + giao Gemini (agy CLI): bẫy   [chạy thật]
- **agy chạy không tương tác tự từ chối quyền**: gọi MCP cần `--settings '{"permissions":{"allow":["mcp(tool-edit/*)"]}}'` (chỉ phiên đó); Gemini hay cố chạy `run_command` → ghi trong prompt "run_command bị cấm, chỉ dùng call_mcp_tool/view_file/write_to_file". Gắn MCP: `agy mcp add --env TOOL_EDIT_AI_NAME=gemini tool-edit -- node .../tool-edit/dist/mcp.mjs` (đổi cấu hình agy: hỏi người dùng trước).
- **Bước dài (đọc tài liệu + nhiều tool) hết 10 phút**; bước hẹp (≤ 10 tool, danh sách mục có số liệu cụ thể, đường dẫn tuyệt đối, "không đọc tài liệu dài") xong trong 2–5 phút. Tool Edit `project_get` không kèm `track_id`/`summary` in cả transcript (~12k token): luôn dặn.
- **Tool Edit: clip cùng track không được chồng nhau** → chữ nhỏ và chữ to cần track khác nhau; chữ phải nằm TRÊN banner/hình (track cao hơn) nếu không bị che (câu khuyến cáo từng bị banner che).
- **Thư viện SFX của Tool Edit rỗng** (`list_library` total 0): nhập wav thủ công (`media_import` từ `saas-animation/audio/sfx`) rồi `add_clip` lên track âm thanh; không chồng nhau nên cần 4 track.
- `edit_word` không nhận chuỗi rỗng (không gộp được "Bo jo mi" thành 1 từ); phụ đề word-pop vẫn hiện từ phiên âm sai → xoá clip phụ đề ở đoạn đó.
- `set_keyframes` trong `propose_ops`: mỗi keyframe phải có `ease` (kể cả cái cuối), dùng `{"kind":"bezier","x1":...}`; tool `set_keyframes` nhận `ease` dạng tên ("snap","linear").
- Cách dựng lớp trong Tool Edit khi nền có logo: track v2 hình chữ nhật xanh (mờ biên bằng `blur`), v4 bản sao người đã tách nền (`set_clip_matte`, volume 0), chữ sau lưng ở v3 (giữa v2 và v4), zoom bằng keyframe `transform.scale` trên cả clip gốc lẫn bản sao.

### 2026-11-21 — Đo lệch khẩu hình bằng chuyển động là SAI   [chạy thật]
- Đo tương quan "chuyển động vùng mặt ↔ đường bao tiếng" cho miệng đi trước tiếng 80–300 ms vì chuyển động là đạo hàm của độ mở; dời hình 0,16 s theo số đó làm lệch hơn (v5). Đúng: đo độ mở miệng, miệng đi trước tiếng 0–60 ms là tự nhiên, chỉ sửa khi > ~80 ms nhất quán. Công thức: tiếng trễ d → `in_hình = in_tiếng − d`.
