# Hướng dẫn: dùng full-studio kết hợp 2 kit kiến thức để làm video tốt hơn

Có ba hệ thống. Mỗi hệ thống làm tốt một việc, ghép lại thì ra video đầy đủ hơn.

| Hệ thống | Làm tốt việc gì | Chạy bằng | Cần After Effects? |
|---|---|---|---|
| **full-studio** (`repo/`) | Làm **nguyên liệu**: giọng đọc, ảnh/video AI, phiên âm. Dựng nhanh bằng ffmpeg, xuất CapCut | Python, ffmpeg | Không |
| **`phong-cach/saas-animation`** | Motion graphics quảng cáo phần mềm: UI kính, chữ blur, chat AI, thẻ 3D, nhạc, SFX. Ra 16:9 và 9:16 | After Effects qua MCP | Có |
| **`phong-cach/talking-head`** | Video người nói dọc 1080×1920: phụ đề từng từ, chữ sau lưng người, B-roll | After Effects + Python | Có |

> Trạng thái kiểm chứng: từng kit chạy được riêng. **Việc ghép chúng với nhau (đặc biệt là đưa giọng đọc của
> Voice Studio vào kit AE) chưa được chạy thử trọn vẹn.** Chỗ nào chưa chắc, file này ghi "chưa kiểm chứng".

---

## 1. Chọn kit theo loại video

| Muốn làm | Dùng | Ghi chú |
|---|---|---|
| Quảng cáo/giới thiệu phần mềm 15–30 s, UI kính | **saas-animation** | Đã kiểm chứng nhiều nhất |
| Người thật nói trước camera, dọc TikTok/Reels | **talking-head** | Mới kiểm chứng với tiếng Anh |
| Video giải thích dài, nhiều cảnh quay + giọng đọc, nhiều tập | **full-studio (`vf`)** | Không cần AE |
| Video giải thích + vài cảnh đồ hoạ "đắt tiền" | full-studio + saas-animation | Ghép ở mục 3.2 |
| Kiến thức chuyên môn (y tế…) dạng người nói | talking-head + canvas làm B-roll | Đọc `talking-head/CON-THIEU.md` mục B trước |

Quy tắc ngắn: **cần motion/UI/3D/glow → kit AE. Cần nhiều tập, nhanh, rẻ → `vf`.** Nguyên liệu (giọng, ảnh, video AI) luôn lấy từ full-studio.

## 2. Chuẩn bị môi trường (một lần)

### Full-studio
Làm theo `repo/CAI-DAT.md`. Các cổng dịch vụ cần mở khi dùng:

| Dịch vụ | Cổng | Dùng để |
|---|---|---|
| Voice Studio | `localhost:3900` | Tạo giọng, nhân bản giọng, phiên âm (API kiểu OpenAI: `/v1/audio/speech`, `/v1/audio/transcriptions`) |
| Canvas agent | `127.0.0.1:17371` | Tạo ảnh/video AI (cần đăng nhập Google Flow của chính bạn) |
| App web `vf` | `localhost:5180` | Xem trước, khung chat Claude (`chay-app.bat`) |

### Hai kit After Effects
- After Effects 2026 + MCP `after-effects` + panel **Claude Bridge** hiện "đã kết nối". Cài cầu nối: `talking-head/ae-bridge/` và `talking-head/knowledge/00-cai-dat.md`.
- Trong AE bật *Preferences → Scripting & Expressions → Allow Scripts to Write Files and Access Network*.
- ffmpeg, Python 3 (+ numpy). Font Inter (không có thì Segoe UI). Font tiếng Việt: kiểm bằng `talking-head/tools/fonts_vi.py`.
- talking-head thêm: GPU NVIDIA (không có GPU vẫn chạy nhưng chậm 4–10 lần), mô hình tách người đã kèm ở `tools/models/`.

### Nhờ AI làm đúng kit
Mở Claude Code trong thư mục `full studio`. File `CLAUDE.md` ở đó đã dặn AI tự đọc đúng kit:
- yêu cầu "video SaaS" → đọc `phong-cach/saas-animation/` (PHONG-CACH.md, CLAUDE.md, knowledge 01/02/03/07/10);
- yêu cầu "talking head dọc" → đọc `phong-cach/talking-head/` (AGENTS.md, CON-THIEU.md, knowledge 01/02/07).

Nếu mở Claude Code ở thư mục khác, nhắc AI: *"đọc D:\dự án antigravity\full studio\phong-cach\… trước khi làm"*.

## 3. Quy trình ghép

### 3.1 Video SaaS có giọng đọc (khuyên dùng để bắt đầu)

1. **Viết brief**: chép `saas-animation/brief-template.md` vào `projects/<ten-video>/brief.md`. Điền tên sản phẩm, thông điệp chính, thời lượng, tính năng, tông màu.
2. **Tạo giọng đọc** ở Voice Studio (`localhost:3900`) cho lời dẫn. Xuất `.wav`. Cắt lặng đầu/cuối, chuẩn âm lượng, rồi phiên âm lại để lấy **mốc từng chữ** (cách làm có trong `repo/HE-THONG-TONG-HOP.md`, mục giọng đọc).
3. **Đặt mốc cảnh theo lời đọc**: lời dẫn dài bao lâu thì 8 cảnh chia theo đó. Kit mặc định chia theo lưới nhịp 120 BPM, nên mốc từ lời đọc phải ghi vào storyboard thay cho lưới nhịp. *(Chưa kiểm chứng.)*
4. **Dựng AE**: nói với AI "dựng video <ten-video>". AI chạy quy trình 11 bước trong `saas-animation/CLAUDE.md`: brief → storyboard → dựng từng cảnh → QC → render.
5. **Ghép tiếng**: đưa file giọng vào track âm thanh. Nhạc nền nhỏ hơn giọng đọc ít nhất khoảng 10 dB (kit đặt nhạc −7 dB dưới SFX; với giọng đọc cần hạ thêm). Chuẩn cuối **−14 LUFS**: `tools/finalize.sh`, kiểm bằng `tools/qc_auto.py`. *(Chưa kiểm chứng.)*
6. **Xuất khung dọc** (cùng bản dựng): kit có chế độ 9:16 (`knowledge/11-khung-doc.md`).

### 3.2 Video dài kiểu giải thích, xen vài cảnh đồ hoạ
1. Dựng bản chính bằng `vf` (kịch bản, giọng, cảnh quay/AI) và render ra MP4 như bình thường.
2. Cảnh đồ hoạ (logo mở đầu, số liệu, tổng kết tính năng): dựng riêng bằng saas-animation, xuất MP4 ngắn **không có tiếng**.
3. Chèn các đoạn đó vào đúng chỗ trong `project.json` như một clip nguồn (`{src, in, dur}`), hoặc ghép bằng ffmpeg. *(Chưa kiểm chứng.)*

### 3.3 Talking head dọc

1. Quay `raw.mp4` (người nói, nền gọn, đủ sáng). Viết `brief.md` theo `talking-head/templates/brief.md`.
2. **Chuẩn bị clip** (ngoài AE):
   ```bash
   bash tools/prep.sh assets/raw.mp4 output/<slug>/aroll --lang vi
   ```
   Cho ra transcript từng từ, clip đã cắt lặng và matte người. Đọc lại file `.txt` và **sửa lỗi phiên âm tiếng Việt** trước khi sang bước sau (độ chính xác tiếng Việt chưa được đo).
3. **B-roll từ canvas**: tạo ảnh/video AI minh hoạ ở Infinity Studio (`17371`), đặt vào `assets/broll/`. Đây là điểm ghép giá trị nhất so với đi tìm clip có bản quyền.
4. **Lập `plan.md`** (mỗi câu một dòng: khối hiệu ứng, mốc vào/ra, chữ hiện). **Gửi người dùng duyệt một lần** trước khi dựng.
5. **Dựng AE** theo `talking-head/AGENTS.md`, từng giai đoạn, xem khung so với mẫu sau mỗi giai đoạn.
6. **Render**, rồi chuẩn hoá −14 LUFS bằng 2 lượt `loudnorm`. Lập `report.md`.

## 4. Lỗi hay gặp (đã có trong kit, nhắc lại những cái tốn thời gian nhất)

- **Gửi lệnh vào AE khi đang render** → hộp thoại chặn AE. Khi render, không gửi gì.
- Có hộp thoại trong AE → mọi lệnh MCP treo. Bấm OK trước.
- Mỗi lệnh `ae_run_script` giữ dưới ~60 giây; chia nhỏ khi dựng cảnh lớn.
- `saveFrameToPng` ghi file bất đồng bộ → chờ file xuất hiện (`tools/wait-files.sh`) rồi mới đọc ảnh.
- Gắn parent khi cha đang scale ≠ 100 làm layer lệch; gắn trước, keyframe sau.
- talking-head: **không dùng effect Glow cho chữ màu**, dùng `T.glow`.
- Chữ tiếng Việt phải dùng font có dấu.
- Danh sách đầy đủ: `saas-animation/knowledge/07-mcp-va-bay-loi.md` và `talking-head/knowledge/07-bay-loi.md`.

## 5. Nội dung y tế và bản quyền

- Nội dung y tế/phụ khoa: kit mới có lưu ý chung (`talking-head/knowledge/10`). **Chưa có** danh sách từ cấm hay câu khuyến cáo chuẩn. Liệt kê mọi câu khẳng định sức khoẻ trong `report.md` để người có chuyên môn duyệt.
- **Nhân bản giọng**: chỉ khi người đó đồng ý.
- **Nhạc**: 8 bài Mixkit trong `saas-animation/audio/music/` dùng được cho mạng xã hội/quảng cáo online/YouTube, **không dùng cho TV**, và không đăng lại công khai (bản trên GitHub đã bỏ nhạc).
- **Tài nguyên ví dụ Foodtage** (SFX, meme, clip, font) thuộc tài liệu khoá học: chỉ để học, không dùng cho video thương mại.
- Ảnh/video AI từ canvas: dùng theo điều khoản của Google Flow, tài khoản của chính bạn.

## 6. Cách nói với AI để ra kết quả tốt

- Nêu rõ loại: *"làm video SaaS cho <sản phẩm>, 20 giây, có giọng đọc"* hoặc *"edit talking head dọc từ clip này"*.
- Đưa đủ thông tin một lần: sản phẩm/nội dung, thông điệp chính, thời lượng, nền tảng, tông màu, có nhạc/logo/giọng không.
- Có video mẫu thì đưa kèm (`ref.mp4`); AI phân tích rồi dựng cạnh mẫu để so.
- Sau khi xem, góp ý **cụ thể**: *"đoạn thẻ chuyển sang tròn bị giật"* tốt hơn *"chưa đẹp"*. AI sửa và render bản `_v2`, `_v3`.
- Khi AI báo kết quả, hỏi lại: *giống và khác brief ở đâu, lỗi nào còn giữ lại?*

## 7. Việc còn thiếu (làm dần)

- Chưa có quy trình chính thức nối giọng Voice Studio vào kit AE (mục 3.1 bước 3 và 5).
- Chưa làm video tiếng Việt nào bằng talking-head; chưa có bộ font Việt, phong cách y tế, thẻ tên dược sĩ, khung kết có CTA.
- Chưa có nhạc nền cho talking-head.
- Chưa dựng thử đoạn đồ hoạ SaaS chèn vào video `vf` (mục 3.2).

Mỗi khi làm xong một video thật, ghi kết quả vào `CHANGELOG.md` (SaaS) hoặc `CON-THIEU.md` (talking head) rồi cập nhật file này.
