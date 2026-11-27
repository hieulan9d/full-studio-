---
name: video-tu-van-hiem-muon
description: Làm reel dọc tư vấn hiếm muộn / phụ khoa (người dẫn AI ngồi nói + nền đồ hoạ y khoa động, thẻ hook trắng chữ đỏ, phụ đề từ đang đọc màu xanh, SFX nhẹ, 1,1x) bằng clip Google Flow. Dùng skill này mỗi khi người dùng nhắc tới video hiếm muộn, mong con, kinh nguyệt, rụng trứng, niêm mạc, "video như mấy video trước", "làm thêm video người dẫn áo xanh", viết kịch bản hay prompt Flow cho loạt này, hoặc bảo "tải về / dựng video" sau khi tự tạo clip trên Flow, kể cả khi không gọi tên phong cách.
---

# Video tư vấn hiếm muộn

Rút từ lần làm thật 16 video (2026-11-26). Công thức mẫu gốc: `phong-cach/tu-van-hiem-muon/PHONG-CACH.md`; đọc `memory/` của kit trước khi làm. Nơi nào hai tài liệu khác nhau, theo skill này vì nó phản ánh cách người dùng đã chốt.

## Người dùng đã chốt
- Người dẫn AI từ ảnh người dùng đưa (`output/hiem-muon-v01/ref/nguoi-dan.jpg`): áo blazer xanh đậm, bàn trắng.
- Flow tạo **liền một lần** người dẫn + nền động + hình minh hoạ. Không tạo ảnh nền riêng, không tách nền.
- Flow **không vẽ chữ**. Thẻ hook và phụ đề chèn lúc dựng.
- Có SFX nhẹ; nhanh **1,1×**; cắt hết khoảng nghỉ.
- Kiểu đồ hoạ duyệt 2026-11-27 (theo mẫu HTPM ngắn): thẻ hook vàng + 2 ô hình, chữ chốt lớn, thẻ ảnh hai bên đầu, dải ngày, thẻ mời bình luận, phụ đề tô vàng.
- Hiệu ứng chữ duyệt 2026-11-27 (`scripts/hieu_ung.py`): bật phóng, thẻ trượt từ hai bên, vệt sáng quét, hạt lấp lánh, sóng chấm sau chữ chốt, phụ đề phóng nhoè, từ chưa đọc tô xám.
- **Giữ nguyên nền AI của clip**: không thay nền, không tách người ghép nền, không làm tối hay làm mờ nền.
- Chưa có: tên cho chữ ký, nhạc nền. Đừng tự đặt.

## Ai làm gì
**Người dùng bấm tạo trên Flow. AI lo kịch bản, prompt, tải về, dựng, kiểm.**
Lý do: gửi lệnh tạo bằng script đã bị Flow báo "hoạt động bất thường" nhiều lần (sau chừng 20 clip liên tục, có lần chỉ sau 4 clip), tài khoản có nguy cơ bị khoá. Không chạy tạo tự động, không thử lại, không giả thao tác người, kể cả khi được giục. Tài liệu chung của dự án còn ghi AI tạo trực tiếp trên Brave; với loạt video này hãy nói rõ rủi ro trên và dùng cách tạo tay.

## Quy trình
Mỗi loạt là một thư mục `output/<ten-loat>/` có `kich_ban.py` (mẫu đầy đủ: `output/hiem-muon-lo/kich_ban.py`).
`S=.claude/skills/video-tu-van-hiem-muon/scripts/hiem_muon.py`

1. Viết kịch bản theo `references/kich-ban-va-prompt.md` (đọc trước khi viết), kèm `DO_HOA` cho từng video trong `kich_ban.py` (cách khai báo ở đầu `scripts/do_hoa.py`, mẫu: video 08 trong `output/hiem-muon-lo/kich_ban.py`).
2. `python -X utf8 -B $S <du_an> kiem`, sửa cảnh báo.
3. Đưa bản kịch bản kèm **số clip**, **mọi chữ trên thẻ** (lệnh `kiem` in ra) và các câu khẳng định sức khoẻ cho người dùng duyệt. Chưa duyệt thì chưa đưa prompt: mỗi clip tốn điểm của họ.
4. `... <du_an> prompt` rồi đưa `tao-tay/prompts.html` (có nút chép).
5. Người dùng tạo xong video đầu tiên (5 clip) thì dựng và cho xem trước khi họ tạo tiếp.
6. `... <du_an> nhap <N>`: tải N video mới nhất từ tab Flow đang mở trên Brave (cổng 9333), tự xếp theo lời, dựng video đủ clip. Người dùng có làm việc khác trong cùng project thì tăng N. Hoặc họ tự đặt tệp `<id>/clip1.mp4…` rồi `... <du_an> dung`.
7. Kiểm theo `references/kiem-va-bao-cao.md`.
8. Ghi một dòng vào `phong-cach/tu-van-hiem-muon/memory/nhat-ky-video.md`, bẫy mới vào `loi-da-gap.md`.

**Không bao giờ gõ lại prompt theo trí nhớ.** Đã từng đưa nhầm lời cho người dùng và họ mất điểm tạo. Prompt chỉ lấy từ tệp sinh ở bước 4.

## Script làm sẵn khi dựng
Nghe lại bằng whisper `large-v3-turbo` (CPU, khoảng 1–2 phút/video), chữ lấy từ kịch bản; giữ đúng đoạn có lời kịch bản (bỏ lời Flow chế thêm); xen phóng 1.0/1.08; thẻ hook vàng 2,2–4 s tâm y=1345; phụ đề y=1400, từ đang đọc vàng `#ffde00`; thẻ và dải ngày ở y=56, hiện theo cụm từ và giữ đến hết clip; SFX từ kho kit SaaS; 1080×1920, 24 fps; video 32–39 s. Độ to chỉnh về −14,4 LUFS. Video không khai `DO_HOA` chỉ có hook và phụ đề.
Cần: ffmpeg, node, Pillow, numpy, faster-whisper đã tải model, font Segoe UI Black Italic.
