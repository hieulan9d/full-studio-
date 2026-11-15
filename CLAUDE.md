# Full studio

**Việc đầu tiên, với mọi yêu cầu: đọc `HUONG-DAN-AI.md`** (mục tiêu dự án, luồng subagent, chọn kit, dịch vụ và cổng, việc phải hỏi người dùng). Sau đó mới đọc kit theo loại video bên dưới.

## Làm một video (luồng điều phối bằng subagent)
Khi người dùng đưa chủ đề / brief và muốn ra video: theo **mục 2 của `HUONG-DAN-AI.md`**. Gọi lần lượt subagent
`content` (viết kịch bản, **dừng chờ người dùng duyệt**), `tao-asset` (giọng + clip AI, chỉ sau khi duyệt), `edit` (dựng bằng kit
của thể loại, tự kiểm QC). Định nghĩa subagent: `.claude/agents/`; mẫu `job.json` và bản kịch bản duyệt: `mau/`.

## Tạo thể loại video MỚI từ video mẫu (việc riêng)
Chỉ khi người dùng muốn **thêm thể loại mới / học phong cách từ một video mẫu** (hoặc hỏi "video này làm thế nào"), **đọc
`phong-cach/PHAN-TICH-VIDEO-MAU/PHAN-TICH-VIDEO-MAU.md`**: chọn mức giống (1–4), chạy `refkit.py analyze`, xem 4 lượt, đo chi tiết,
viết `ref-notes.md`, rồi biến thành một kit mới trong `phong-cach/<tên>/`. Việc này **không** chạy trong mỗi lần làm video thường:
khi đã có kit thì chỉ đọc kit.

## Video dạng SaaS (sass)
Khi người dùng yêu cầu tạo hoặc edit video dạng SaaS (quảng cáo phần mềm, giao diện kính, nền tối, After Effects),
**phải đọc folder `phong-cach/saas-animation/` trước khi làm**:
1. `phong-cach/saas-animation/PHONG-CACH.md` (tóm tắt phong cách, kit 1.3.0)
2. `phong-cach/saas-animation/CLAUDE.md` (quy trình 11 bước: brief → 16:9 + 9:16 có nhạc/SFX → QC → tự học)
3. `phong-cach/saas-animation/knowledge/01, 02, 03, 07, 10` (07 bắt buộc: các bẫy đã gặp)
4. Khi cần: `knowledge/11` (9:16), `knowledge/12` + `audio/music/INDEX.md` (âm thanh, chọn nhạc)

Dùng `lib/`, `tools/`, `audio/` và mẫu `projects/orbiq/build.jsx` trong folder đó. Nhạc Mixkit không có trong repo công khai: xem `HUONG-DAN-AI.md` mục 9.

## Video talking head dọc (người nói + đồ hoạ)
Khi người dùng yêu cầu tạo hoặc edit video talking head dọc 1080×1920 (TikTok/Reels/Shorts, clip người nói, phụ đề từng từ,
chữ sau lưng người, B-roll, After Effects), **phải đọc folder `phong-cach/talking-head/` trước khi làm**:
1. `phong-cach/talking-head/AGENTS.md` (hướng dẫn chính, quy trình tóm tắt, luật dựng)
2. `phong-cach/talking-head/CON-THIEU.md` (những gì chưa kiểm chứng: tiếng Việt, ngành y, v.v.)
3. `phong-cach/talking-head/knowledge/01, 02, 07` (07 bắt buộc: các bẫy đã gặp)
4. Khi cần: `knowledge/03` (thư viện hiệu ứng), `04` (chuẩn bị clip), `05` (âm thanh), `10` (font Việt, nội dung y tế)

Dùng `lib/` (`saas-lib.jsx` + `th-lib.jsx`), `tools/` và mẫu `examples/foodtage/build.jsx` trong folder đó. Đây là kit khác với SaaS:
đừng nhầm hai phong cách. Tài nguyên Foodtage (`assets`, `media`) không có trong repo công khai.

Trả lời bằng tiếng Việt.
