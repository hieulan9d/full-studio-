# Full studio

**Việc đầu tiên, với mọi yêu cầu: đọc `HUONG-DAN-AI.md`** (mục tiêu dự án, luồng subagent, chọn kit, dịch vụ và cổng, việc phải hỏi người dùng). Sau đó mới đọc kit theo loại video bên dưới.

## Memory của từng phong cách (đọc trước, ghi sau)
Mỗi phong cách có folder `memory/` (cạnh `PHONG-CACH.md`/`AGENTS.md`): `README.md`, `y-nguoi-dung.md`, `loi-da-gap.md`, `cach-lam-tot.md`, `nhat-ky-video.md`.
**Đọc `memory/README.md` rồi các file trong đó TRƯỚC khi làm video thuộc phong cách đó; ghi lại bài học SAU khi làm xong** (một dòng nhật ký, bẫy mới, lời khen/chê của người dùng). Phong cách mới tạo từ video mẫu cũng phải có `memory/` (sao từ một phong cách có sẵn).

## Nguồn tạo ảnh/video AI (người dùng chốt 2026-11-26)
- **Flow:** AI agent tạo **trực tiếp trên Brave**, mỗi profile là 1 tài khoản, bằng `node canvas/desktop/flow-cli.js` (`HUONG-DAN-AI.md` mục 6.1b).
- **Muse (ảnh và video):** dùng **canvas** gọi API. Canvas không dùng để tạo Flow nữa.

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
Làm hook: đọc thêm `knowledge/11` (ví dụ tiếng Việt) và `knowledge/12` (luật hook); `plan.md` phải có mục Hook.

## Video UGC AI một cú máy (thời trang/sản phẩm, thể loại thử)
Khi người dùng muốn video người mẫu AI nói + khoe sản phẩm, một cú máy, camera cố định, không chữ (clip Omni + giọng AI):
đọc `phong-cach/ugc-ai-thoi-trang/PHONG-CACH.md` rồi `ref-notes.md`. Kit rút từ **một** video mẫu, đã chạy thật 1 lần (bài học ở mục 6b của `PHONG-CACH.md`).

## Tool Edit (phần mềm dựng video của dự án)
Tool Edit là phần mềm dựng kiểu CapCut chạy bằng GPU, có MCP `tool-edit` cho AI (đã có mã, bản chạy ở `tool-edit/release/ToolEdit/ToolEdit.exe`).
- **Dùng Tool Edit để EDIT video** (người dùng bảo dựng/sửa video bằng Tool Edit): **đọc `tool-edit/HUONG-DAN-SU-DUNG-AI.md` trước** (chuẩn bị, AI tự áp dụng không cần duyệt, quy trình, danh sách tool, luật dựng, hạn chế).
- **Sửa/xây thêm chức năng cho phần mềm**: đọc `tool-edit/HUONG-DAN-AI.md`, rồi `KE-HOACH.md`, `CHUC-NANG.md`, `NHAT-KY.md`.
- **Làm xong chức năng nào phải cập nhật CẢ BA**: `CHUC-NANG.md`, `NHAT-KY.md` và `tool-edit/HUONG-DAN-SU-DUNG-AI.md` (mục tool/luật/hạn chế + dòng "Cập nhật gần nhất"). Đừng nhầm với việc dựng video bằng After Effects.

Trả lời bằng tiếng Việt.
