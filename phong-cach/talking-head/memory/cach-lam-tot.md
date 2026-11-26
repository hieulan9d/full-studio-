# Cách làm tốt (Talking head dọc)

Thêm mục mới ở dưới, theo quy ước trong README.md.

### 2026-11-16 — SFX theo bảng knowledge/05 được chấp nhận   [người dùng nói]
- Bản v2 (có SFX theo bảng) người dùng nói "ổn" (chưa có nhận xét chi tiết). Video: fullstudio/output/foodtage-thu/.

### 2026-11-17 — Công thức "giới thiệu sản phẩm màu thương hiệu"   [chạy thật, v3 chưa có phản hồi]
- Phủ tường 100 % bằng xanh thương hiệu + từ khoá gradient + nhãn hai cấp: sạch, đọc rõ, che logo nền. Chi tiết ở `PHONG-CACH.md` biến thể B và `knowledge/13`.
- Đồ hoạ theo lời: bong bóng Ca/D3/K2/Collagen đúng từ nói, thẻ số liệu đếm 0→giá trị đúng lúc nói, bảng thành phần ở câu "đọc nhãn".
- B-roll 9:16 từ Muse (5 s, 720×1280) khớp lời; phóng 122 % + lớp tối cho chữ dễ đọc; whoosh vào, swoosh ra.
- Lập plan có Hook A/B/C và danh sách rủi ro nội dung, chờ duyệt rồi mới tạo ảnh: người dùng chọn Hook A ngay.
- Thử chạy từng giai đoạn rồi `saveFrames` + contact sheet sau mỗi giai đoạn bắt được lỗi bố cục sớm (chữ trùng thẻ, đếm số hỏng).

### 2026-11-21 — Quy trình "Claude lên plan, Gemini thi hành" cho video talking head trong Tool Edit   [chạy thật, teaser 24 s]
- Claude: chọn ý tưởng, tính mốc cắt tại chỗ im lặng (RMS 20 ms, làm tròn khung), viết hợp đồng từng bước, dựng kiến trúc lớp, tính sẵn 64 SFX thành `sfx-ops.json`; Gemini: nhập media, ghép đoạn, phiên âm/tách người, thêm chữ/hình/B-roll/phụ đề, đặt SFX; Claude kiểm bằng `contact_sheet`/`preview_frame` sau mỗi bước rồi mới giao bước sau.
- Giao việc cho Gemini hiệu quả: một prompt = một bước hẹp, kèm thông số chính xác (start/duration/y/size), tiêu chí kiểm bằng `preview_frame`, "ghi nhật ký vào nhat-ky.md". Việc cần JSON dài: Claude tạo file `.json`, Gemini chỉ đọc và gửi `propose_ops`.
- Video và nhật ký: `output/teaser-bojomi/` (`report.md`, `nhat-ky.md`, `prompt-*.txt`, `gemini-*.log`); kế hoạch: `fullstudio/docs/ke-hoach-talking-head-tool-edit.md`.

### 2026-11-21 — Khớp khẩu hình: đo độ mở miệng, dùng Opus cho việc suy luận   [người dùng nói: "Đã khớp" với v7]
- Teaser Bojomi v7 khớp sau khi: (1) đo **độ mở miệng** (bám mặt, 59,94 fps, cửa sổ 8 s) thay vì đo chuyển động; (2) clip gốc chỉ lệch ~50 ms nên chỉ dời hình **1 khung** (không phải 0,16 s); (3) sửa mốc phụ đề đầu câu ("Khi" sớm 0,7 s) bằng `set_text` `animator.times`; (4) đặt lại keyframe zoom sau khi đổi `in`.
- Việc cần suy luận/đo khó giao cho **Claude Opus 5.5** (Agent `model: opus`, prompt có bối cảnh + số đo cũ + tiêu chí kiểm), Gemini giữ phần thi hành có số cụ thể. Chi tiết: `fullstudio/docs/kinh-nghiem-giao-gemini.md`, `output/teaser-bojomi/opus-bao-cao.md`.

### 2026-11-21 — Dạy Gemini: GEMINI.md tự nạp + mẫu lệnh   [chạy thật]
- `fullstudio/GEMINI.md` được agy tự nạp (kiểm bằng câu hỏi không nhắc file). Gemini làm đúng công thức khẩu hình/track nhưng bịa tên trường keyframe tới khi có **mẫu JSON** trong file. Khi giao việc mới: thêm mẫu lệnh đúng vào GEMINI.md rồi thử lại.
