# HƯỚNG DẪN: DÙNG FULL STUDIO ĐỂ TẠO VIDEO AI VÀ EDIT
(Dành cho Claude của dự án **quản lý page**. Đọc hết file này trước khi giao hay làm bất kỳ video nào.)

Trả lời người dùng bằng **tiếng Việt**, ngắn gọn: đã làm gì, file ở đâu, còn gì chưa kiểm.

---

## 0. Bạn làm gì, Full Studio làm gì

| Bên | Việc |
|---|---|
| **Dự án quản lý page (bạn)** | Chiến lược nội dung, chọn chủ đề, viết **kịch bản chi tiết** theo đúng mẫu ở mục 3, gửi người dùng duyệt, rồi **bàn giao brief** cho Full Studio |
| **Full Studio** | Biến brief thành video: tạo giọng AI, clip/ảnh AI (Google Flow, Muse), dựng (After Effects hoặc Tool Edit hoặc `vf`), tự kiểm QC, xuất file |

Full Studio nằm ở: `D:\dự án antigravity\full studio\` (lõi: `fullstudio\`).
**Mọi việc chạy trong thư mục này**, bằng Claude Code mở tại `D:\dự án antigravity\full studio\fullstudio` (để nạp được 3 subagent `content`, `tao-asset`, `edit` ở `.claude\agents\`).

Nguyên tắc cứng:
1. **Không tạo clip/ảnh/giọng AI khi người dùng chưa duyệt kịch bản.** Mỗi clip tốn credit.
2. **Không đổi giọng đọc, không ghi đè bản nháp CapCut, không đẩy lên GitHub/mạng** khi chưa hỏi.
3. Không đọc, in, commit token/cookie/mật khẩu/API key. Captcha, đăng nhập: để người dùng làm.
4. AI **không nghe được âm thanh** và không xem được nội dung clip trong canvas: phải nhờ người dùng nghe/xem bản cuối.

---

## 1. Quy trình tổng (5 bước)

```
[1] Page project: chốt chủ đề + viết KỊCH BẢN CHI TIẾT (mẫu mục 3)
        │
        ▼
[2] NGƯỜI DÙNG DUYỆT kịch bản (cổng 1)      ← chưa duyệt = chưa tạo gì
        │
        ▼
[3] Bàn giao brief cho Full Studio (mục 4) → subagent content/tao-asset
        │   tạo giọng AI + clip/ảnh AI
        ▼
[4] Subagent edit: dựng + QC (mục 6)
        │
        ▼
[5] NGƯỜI DÙNG XEM bản dựng (cổng 2) → sửa ĐÚNG cảnh lỗi → xong → ghi memory
```

Bạn (page project) đảm nhận bước 1–2 và là người **giao nhận**; bước 3–5 do Full Studio chạy.

---

## 2. Chọn loại video (kit) — quyết định trước khi viết kịch bản

| Nhu cầu của page | Loại | Kit (trong `fullstudio\phong-cach\`) | Ghi chú |
|---|---|---|---|
| Người nói trước camera, phụ đề từng từ, chữ sau lưng người, B-roll (TikTok/Reels/Shorts, 9:16) | **talking-head** | `talking-head/` | Cần clip người nói **quay thật** (hoặc clip AI nói). Mới kiểm chứng tiếng Anh; tiếng Việt còn trong `CON-THIEU.md` |
| Người mẫu AI nói + khoe sản phẩm, **một cú máy**, camera cố định, **không chữ** | **ugc-ai-thoi-trang** | `ugc-ai-thoi-trang/` | Thể loại thử, đã chạy thật 1 lần. Clip Flow Omni + giọng AI |
| Quảng cáo gói khám/tầm soát/thẩm mỹ phòng khám: MC + B-roll thật + khung thương hiệu | **quang-cao-viet-han** | `quang-cao-viet-han/` | **Chưa dựng thử.** Nội dung y tế: theo mục 5 |
| Quảng cáo phần mềm/SaaS, giao diện kính, nền tối, motion graphics (16:9 + 9:16) | **saas** | `saas-animation/` | Dựng bằng After Effects |
| Video giải thích nhiều cảnh + giọng đọc, nhiều tập (series) | **giải thích `vf`** | `edit/` (lệnh `vf`) | ffmpeg, không cần AE, rẻ và nhanh |

Nếu loại video page cần **không có kit**: **dừng và báo người dùng**. Đừng tự bịa phong cách. (Tạo kit mới từ video mẫu là việc riêng, chỉ làm khi người dùng yêu cầu: `phong-cach/PHAN-TICH-VIDEO-MAU/PHAN-TICH-VIDEO-MAU.md`.)

Trước khi viết kịch bản cho một loại, đọc `PHONG-CACH.md` của kit và **`memory/y-nguoi-dung.md`** (giọng văn, hook người dùng thích/chê; file này thắng mặc định của kit) để kịch bản đúng ý ngay từ đầu.

---

## 3. Mẫu KỊCH BẢN CHI TIẾT (bạn phải viết đúng mẫu này)

Lưu thành `kich-ban-<slug>.md` (slug không dấu, ví dụ `tamsoat-gan-thang11`). Thiếu mục nào là Full Studio phải hỏi lại, nên điền đủ.

```markdown
# Kịch bản: <tên video>
slug: <ten-khong-dau>

## A. Brief
- Page / thương hiệu:
- Chủ đề / sản phẩm / nội dung:
- Thông điệp chính (1 câu):
- Đối tượng xem:
- Nền tảng: tiktok | reels | shorts | youtube | web
- Tỷ lệ: 9:16 (mặc định) | 16:9
- Thời lượng: ... giây
- Loại video (kit): talking-head | ugc-ai-thoi-trang | quang-cao-viet-han | saas | giai-thich-vf
- Ngôn ngữ: vi
- Giọng đọc: có / không. Nếu có: mã giọng người dùng chỉ định (KHÔNG tự đổi)
- Nhạc: có / không (gợi ý thể loại; nhạc lấy từ kho của kit)
- Tư liệu có sẵn (đường dẫn tuyệt đối): clip quay thật, logo, ảnh sản phẩm, ảnh tham chiếu mặt/sản phẩm
- Ghi chú người dùng (điều cấm, điều bắt buộc):

## B. Hook (3–5 giây đầu)
(Talking head: viết 2–3 phương án A/B/C. Mỗi phương án: lời hứa cụ thể, chữ nhỏ / chữ to, hình minh hoạ cùng giây, nguồn hình.
Câu bằng chứng như số liệu/view CHỈ viết khi có thật và kiểm được; không có thì ghi "không có", không bịa.)

## C. Lời đọc đầy đủ (viết sẵn cho giọng TTS)
- Câu ngắn. Số viết bằng chữ. Thuật ngữ khó viết theo cách đọc.
- Không chèn chú thích trong ngoặc vào lời đọc.

## D. Danh sách cảnh
| id | Giây (từ–đến) | Nội dung hình | Lời đọc | Chữ trên màn hình | Nguồn asset | Prompt AI / ghi chú |
|---|---|---|---|---|---|---|
| c01 | 0.0–3.0 | ... | ... | ... | quay-that / flow / muse / do-hoa | ... |

Nguồn asset chỉ được là: `quay-that` | `flow` | `muse` | `do-hoa`.
Với `flow`/`muse` phải có: prompt 9:16, thời lượng clip (Flow Omni 1.2 tối đa 15 s; Muse 1–10 s), ảnh tham chiếu cần dùng.

## E. CTA + Caption đăng (do page project viết, câu chữ cuối gửi khách)
- CTA trên video:
- Caption + hashtag + giờ đăng đề xuất:

## F. Số lượng sẽ tốn credit
- Số clip AI sẽ tạo: ...
- Số ảnh AI sẽ tạo: ...

## G. Cần người có chuyên môn xem (nếu y tế/thực phẩm chức năng/tài chính)
- Liệt kê MỌI câu khẳng định sức khoẻ/số liệu:

## H. Câu hỏi còn thiếu cho người dùng
-
```

Quy tắc viết prompt AI (rút từ lỗi thật, `HUONG-DAN-AI.md` mục 6.1):
- Clip không lời: thêm `no speech, mouth closed, no talking, no text overlays, no captions`.
- **Không** có trẻ em/bé trong prompt (Flow chặn).
- **Không** viết chữ nêu tuổi/giới tính người ("young", "woman", "adult"): Flow từng chặn. Dùng "the model from the reference image".
- Hình giải phẫu: không máu, không ghê. Y tế: dùng sơ đồ/minh hoạ, không hình cơ thể thật.
- Khoá sản phẩm bằng **ảnh tham chiếu thật**; chữ nhỏ trên bao bì dễ lệch nên phải kiểm từng clip.
- Không dùng lại logo, nhạc, chữ, giọng, mặt, footage của video mẫu của người khác.

---

## 4. Bàn giao cho Full Studio (sau khi người dùng duyệt)

Chỉ làm khi người dùng đã nói **rõ ràng là duyệt**.

1. Đặt file kịch bản đã duyệt vào: `D:\dự án antigravity\full studio\fullstudio\output\<slug>\kich-ban-duyet.md`.
2. Tạo `output\<slug>\job.json` từ mẫu `fullstudio\mau\job.json` (điền `brief`, `the_loai`, `kit`, `scenes[]`). Đặt `trang_thai = "da-duyet-kich-ban"`. Với talking head, ghi thêm `kich_ban.hook_da_chon` (A/B/C) theo lựa chọn của người dùng.
   - `the_loai`/`kit` hợp lệ: `saas` → `phong-cach/saas-animation`; `talking-head` → `phong-cach/talking-head`; `giai-thich-vf` → `edit`. (Các kit ugc/viet-han: ghi đúng thư mục kit tương ứng.)
   - Mỗi cảnh trong `scenes[]` dùng khoá: `id, bat_dau_giay, ket_thuc_giay, noi_dung, loi_doc, chu_tren_man_hinh, nguon_asset, prompt_ai, model, anh_tham_chieu, thoi_luong_clip_giay`.
   - Điền `credit.so_clip_ai_duoc_duyet` và `so_anh_ai_duoc_duyet` đúng bằng số người dùng đã duyệt. **Không được tạo vượt số này.**
3. Mở Claude Code **trong `fullstudio\`** và ra lệnh:
   > "Làm video `<slug>` theo `output/<slug>/job.json`. Kịch bản đã duyệt. Gọi `tao-asset` rồi `edit`. Báo tôi khi xong hoặc khi có lỗi."
4. Phiên này đọc `HUONG-DAN-AI.md` rồi chạy subagent đúng thứ tự: `content` (đã làm xong ở bước 1, bỏ qua nếu kịch bản đã đủ) → `tao-asset` → `edit`. Subagent chỉ chạy được khi `trang_thai` đúng.

Vòng đời `trang_thai`: `moi` → `cho-duyet-kich-ban` → `da-duyet-kich-ban` → `da-tao-asset` → `dang-dung` → `cho-nguoi-dung-xem` → `xong` (lỗi thì `sua-loi` rồi quay lại dựng).

---

## 5. Tạo video AI (subagent `tao-asset`)

Điều kiện: các dịch vụ phải **đang chạy** (kiểm trước, `ConnectionRefused` = chưa mở: nhờ người dùng mở rồi đợi ~15 giây).

| Dịch vụ | Cổng | Mở bằng |
|---|---|---|
| Infinity Studio (canvas, tạo ảnh/video AI) | `127.0.0.1:17371` (web `3100`) | `fullstudio\full studido.exe` hoặc `canvas\app.bat` |
| Voice Studio (giọng đọc, whisper) | `localhost:3900` | mở cùng launcher |
| muse2api (cầu nối Muse) | `127.0.0.1:18610` | `app.bat` tự bật |

**Giọng đọc**: dùng node âm thanh trên canvas, model `omnivoice`, nhập lời **thẳng vào ô soạn** (không nối node văn bản vào, nếu không giọng đọc thừa "Văn bản 1"). Dùng đúng mã giọng người dùng chỉ định. Sau đó cắt lặng đầu/cuối, whisper nghe lại để lấy mốc từng chữ. Nhân bản giọng **chỉ khi chủ giọng đồng ý**.

**Video/ảnh**:
- Flow: ảnh `flow::flow-nano-banana-pro`; video `flow::flow-omni-1.2-flash` (≤15 s) hoặc `flow::flow-omni-1.1-flash` (≤10 s). Hay đòi captcha: để người dùng xử lý.
- Muse: `muse-image`, `muse-video`. **Tạo từng video một, tuần tự.**
- Sinh theo **đợt nhỏ** (3 rồi 5–6 clip), mỗi clip ~1–2 phút. Không chạy hai tiến trình tạo cùng lúc. Đừng thu nhỏ/che cửa sổ Flow khi đang tạo.
- Clip dùng ảnh tham chiếu thường có **khung 0 giây trắng**: cắt ~0,3 s đầu.
- Lấy file ra đĩa bằng node **"Xuất file"** (xem `HUONG-DAN-AI.md` mục 6.2). Nhận diện file bằng `nodeId`/`order`, không bằng tên.
- Mỗi clip tạo xong: ghi `scenes[i].asset` (file, độ dài, `kiem`) vào `job.json`; clip lỗi/lệch thì tạo lại **đúng cảnh đó** (tăng `so_lan_tao`, cập nhật `credit`).

Chi tiết sâu: `fullstudio\HE-THONG-TONG-HOP.md` mục 4–5, `canvas\TICH-HOP-EDIT.md`.

---

## 6. Edit video (subagent `edit`)

Chọn công cụ dựng theo loại video:

| Loại | Công cụ dựng | Đọc trước |
|---|---|---|
| talking-head, saas (motion/UI/3D/glow) | **After Effects** qua MCP `after-effects` (panel Claude Bridge phải "đã kết nối") | `phong-cach/<kit>/AGENTS.md` hoặc `CLAUDE.md`, `knowledge/07` (bẫy lỗi, **bắt buộc**) |
| Dựng kiểu CapCut, chạy GPU, có phụ đề từng từ, chữ sau lưng người, chuyển cảnh, màu | **Tool Edit** (MCP `tool-edit`) | `tool-edit\HUONG-DAN-SU-DUNG-AI.md` (đọc trước, bắt buộc) |
| Nhiều tập, nhanh, rẻ | **`vf`** (ffmpeg) | `edit\CLAUDE.md` |

Lưu ý: Tool Edit **chưa dựng lại được video SaaS** (vẫn dùng After Effects). Talking head dựng được bằng cả hai; hỏi người dùng muốn công cụ nào nếu họ không nói.

### Quy trình dựng bằng Tool Edit (tóm tắt)
1. Tool Edit phải đang chạy (`tool-edit\release\ToolEdit\ToolEdit.exe`) và MCP `tool-edit` gắn vào phiên. Gọi `app_status`, rồi `project_get`.
2. `media_import` (đường dẫn tuyệt đối) → hỏi `job_status` đến khi `done` mới đặt clip.
3. `snapshot_create` trước thay đổi lớn.
4. Dựng bằng `propose_ops` và tool chuyên dụng: `transcribe` → `get_transcript` → `fix_transcript` → `generate_captions` (phụ đề), `add_text`, `text_behind_person`, `set_transition`, `suggest_sfx`, `duck_music`…
5. **Sau mỗi bước chính**: `preview_frame` + `contact_sheet`, mô tả trung thực điều thấy, lỗi thì sửa ngay.
6. `qc_check` → `render_start` (preset `9:16` hoặc `16:9`) → `job_status` đến khi xong. Báo đường dẫn file.
- Chữ tiếng Việt: chọn font bằng `list_fonts` (chỉ font đủ dấu).
- Đừng thêm phụ đề/SFX/màu **khi người dùng không yêu cầu**; đề xuất rồi hỏi. Người dùng từng chê SFX do AI tự đặt.
- Chuẩn âm lượng cuối −14 LUFS.

### Quy trình dựng bằng After Effects (tóm tắt)
- Không gửi lệnh vào AE khi đang render. Mỗi `ae_run_script` < ~60 giây. Chữ Việt phải dùng font có dấu. Có hộp thoại trong AE thì mọi lệnh treo: nhờ người dùng bấm OK.
- Chi tiết: `knowledge/07-*` của kit.

### Tự kiểm QC (không có agent chấm điểm riêng)
Agent `edit` tự chạy checklist `knowledge/08-qc.md` của kit và ghi vào `output\<slug>\report.md`: **cái gì đạt, cái gì KHÔNG kiểm được** (đặc biệt âm thanh, cảm xúc giọng, khớp môi).

---

## 7. Nội dung nhạy cảm (page y tế, phòng khám, thực phẩm chức năng)

- Dùng "hỗ trợ/giúp/góp phần". **Cấm** "trị/điều trị/khỏi/nhanh/100%". Không ảnh trước/sau.
- Thêm dòng pháp lý khi cần, ví dụ: "Thực phẩm bảo vệ sức khỏe, không phải thuốc, không có tác dụng thay thế thuốc chữa bệnh".
- B-roll y tế dùng sơ đồ/minh hoạ, **không hình cơ thể thật**.
- Liệt kê **mọi câu khẳng định sức khoẻ** vào mục G của kịch bản để người có chuyên môn duyệt. Không số liệu chưa kiểm chứng.
- Nhạc Mixkit trong kit: dùng cho mạng xã hội/quảng cáo online/YouTube, **không dùng cho TV**, không đăng lại công khai.
- Tài nguyên ví dụ Foodtage (SFX, meme, clip, font) chỉ để học, **không dùng cho video thương mại**.
- Mẫu/B-roll của khách khác: chỉ học kỹ thuật, không dùng lại mặt MC, footage, logo.

---

## 8. Việc phải HỎI người dùng trước

- Tạo clip AI hàng loạt khi kịch bản chưa duyệt, hoặc **vượt số clip đã duyệt**.
- Tải tư liệu từ internet (ưu tiên Pexels/Pixabay/CC, nhắc kiểm bản quyền) hoặc cài công cụ ngoài.
- **Đổi giọng đọc**, ghi đè bản nháp CapCut, xoá nhiều cảnh cùng lúc.
- Đẩy lên GitHub hoặc bất cứ nơi nào bên ngoài. **Tự đăng bài lên page cũng phải hỏi.**
- Captcha, đăng nhập, cookie tài khoản: người dùng làm.

---

## 9. Giao kết quả và học lại

Khi xong, báo người dùng:
1. Đường dẫn file video (và bản 16:9/9:16 nếu có), `report.md`.
2. Bước nào Full Studio làm, bước nào bạn làm.
3. Đã kiểm gì (QC), **chưa kiểm gì** (âm thanh, cảm xúc giọng, độ khớp chữ trên bao bì...).
4. Danh sách câu khẳng định sức khoẻ cần duyệt (nếu có).
5. Caption + hashtag + giờ đăng đề xuất (mục E của kịch bản) để người dùng đăng.

Phát hiện lỗi sau khi giao: sửa **đúng cảnh lỗi**, không dựng lại cả video.

**Sau mỗi video**: ghi vào `memory/` của kit đã dùng (`fullstudio\phong-cach\<kit>\memory\`): một dòng vào `nhat-ky-video.md`, bẫy mới vào `loi-da-gap.md`, cách làm tốt vào `cach-lam-tot.md`, lời khen/chê của người dùng vào `y-nguoi-dung.md`. Nhãn: [chạy thật] / [người dùng nói] / [chưa kiểm]. Không ghi điều chưa kiểm chứng như thể đã chạy được. Không ghi token/key/cookie.

---

## 10. Bảng tra nhanh khi gặp lỗi

| Hiện tượng | Xử lý |
|---|---|
| `ConnectionRefused` canvas/Voice Studio | Chưa mở app: nhờ người dùng mở `full studido.exe`, đợi ~15 s |
| Flow đòi captcha / chặn prompt | Người dùng giải captcha; prompt: bỏ chữ tuổi/giới tính/trẻ em |
| Muse báo video "không khả dụng ở khu vực này" | Đổi tài khoản Muse (nhờ người dùng) |
| Tool Edit báo app chưa chạy | Nhờ người dùng mở `ToolEdit.exe` |
| Thấy không có tool `mcp__tool-edit__*` | Phiên cũ không nạp thêm MCP: nhờ người dùng mở phiên mới trong `full studio` và chấp nhận server |
| AE treo mọi lệnh | Có hộp thoại trong AE: nhờ người dùng bấm OK |
| Đường dẫn trong tài liệu gốc ghi `E:\antigravyti\...` không tồn tại | Đừng đoán: kiểm tra thực tế, xem `CAI-DAT.md` mục 6 |
| Lỗi môi trường khác | `fullstudio\CAI-DAT.md` mục 9 |

---

## 11. Danh sách file cần biết

- `fullstudio\HUONG-DAN-AI.md` — hướng dẫn gốc của Full Studio (đọc đầu tiên ở phía Full Studio)
- `fullstudio\mau\job.json`, `fullstudio\mau\kich-ban-duyet.md` — mẫu bàn giao
- `fullstudio\.claude\agents\content.md | tao-asset.md | edit.md` — 3 subagent
- `fullstudio\phong-cach\<kit>\PHONG-CACH.md`, `memory\` — phong cách + kinh nghiệm
- `fullstudio\tool-edit\HUONG-DAN-SU-DUNG-AI.md` — dùng Tool Edit để dựng
- `fullstudio\edit\CLAUDE.md` — dựng bằng `vf`
- `fullstudio\CAI-DAT.md`, `HE-THONG-TONG-HOP.md` — cài đặt, chi tiết hệ thống

Cập nhật file này khi Full Studio đổi quy trình (đặc biệt các nhãn "chưa dựng thử/thể loại thử" khi chúng đã chạy thật).
