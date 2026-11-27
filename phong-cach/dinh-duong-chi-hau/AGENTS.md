# Cách làm một tập (dinh dưỡng chị Hậu)

Đọc trước: `memory/` → `PHONG-CACH.md` → `mau/kich-ban.md`. Dùng luồng chung của dự án (`HUONG-DAN-AI.md` mục 2):
kịch bản phải được người dùng duyệt trước khi tạo clip.

## 1. Kịch bản gửi duyệt
Nếu người dùng đã đưa kịch bản (như `mau/kich-ban.md`) thì **giữ nguyên lời**; chỉ thêm:
- chia lời thành 3 đoạn theo ý, mỗi đoạn một clip;
- bối cảnh và đạo cụ từng clip, danh sách cảnh AI cận, thẻ chữ và mốc dự kiến;
- số clip AI sẽ tạo, các câu khẳng định cần duyệt, các mục "Chưa chốt" trong `PHONG-CACH.md`.

## 2. Tạo nguyên liệu (sau khi duyệt)
- Clip người dẫn: Flow, 9:16, kèm ảnh tham chiếu (`NGUOI-DAN.md`), mỗi đoạn một bối cảnh.
  Khoảng 30–38 âm tiết cho clip 10–12 s, ít hơn thì dùng 8 s. Bài học ở kit hiếm muộn: lời ngắn trên clip dài thì
  Omni tự chế thêm lời.
- Prompt phải ghi: máy cố định, không chữ, không phụ đề, không nhạc, lời thoại nguyên văn tiếng Việt.
- Cảnh AI cận: clip ngắn không lời ("no speech, no text, no captions"), hoặc ảnh. Không vẽ chữ trong clip.
- Nghe lại bằng whisper: đúng lời, đúng "đậu lăng", "canxi carbonat", "curcuminoid"; không lời thừa ở đuôi.

## 3. Dựng
```
python -X utf8 -B phong-cach/dinh-duong-chi-hau/tools/dung.py plan.json -o ra.mp4
```
`plan.json` (mẫu ở `mau/plan.json`; đường dẫn tính từ thư mục chứa nó):

| Khoá | Ý nghĩa |
|---|---|
| `doan` | trục chính, nối cắt cứng: `file`, `tu`, `den` (giây trong tệp, bỏ được) |
| `chen` | cảnh đè lên hình, giữ tiếng: `file` (video hoặc ảnh), `t`, `den` (giây trên video ra), `tu` |
| `chu` | thẻ chữ: `kieu`, `t`, `den`, `y` (bỏ được, mặc định 1049) |
| `giong` | tệp giọng thu riêng, **thay** tiếng của clip (bỏ được; không khớp môi) |

Kiểu chữ: `hook` và `the` dùng `dong: [..]`; `quy-doi` dùng `tren`, `duoi`; `hai-bang` dùng `trai`, `phai`.

Cắt `tu`/`den` theo mốc từ để khoảng không lời giữa hai đoạn khoảng 0,3–0,6 s [đề xuất]. Video mẫu để trống tới 4 s,
đừng chép điểm đó trừ khi người dùng muốn.

## 4. Tự kiểm
- Xem khung giữa mỗi đoạn, mỗi cảnh chèn, mỗi thẻ chữ; chữ không che mặt và món đang nói tới.
- 1080×1920, 24 fps, khoảng −15,5 LUFS.
- Chữ trong clip AI (sổ, nhãn, hộp) không được là chữ giả đọc thấy rõ.
- Báo rõ phần không kiểm được (cảm xúc giọng, khớp môi), rồi ghi `memory/nhat-ky-video.md`.

## Đã kiểm và chưa kiểm
`dung.py` đã chạy thử trên các đoạn cắt từ video mẫu (hai đoạn, ảnh và video chèn, bốn thẻ chữ, giọng riêng), thẻ hook
nhìn khớp mẫu. Chưa chạy trên clip mới tạo từ Flow, chưa thử tệp không có tiếng, chưa làm tập nào trọn quy trình.
