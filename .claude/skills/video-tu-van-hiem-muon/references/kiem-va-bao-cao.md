# Kiểm và báo cáo

## Sau khi dựng
1. Đọc dòng `XONG {...}`: `khop` là tỉ lệ chữ kịch bản máy nghe được trong bản cuối. Mọi chữ trong `thieu` phải nêu cho người dùng nghe lại (đa số là chữ ngắn như "và", "đến", "nhé" mà máy bỏ sót; chữ có nghĩa như "chậu", "buốt" cần nghe kỹ hơn).
2. Clip bị đánh dấu `NGHE LAI` (khớp dưới 90% hoặc thiếu liền 3 chữ): đề nghị tạo lại clip đó.
3. Mở ảnh `xong/<id> - <tên>.jpg` và soát: mặt và áo giống nhau giữa các đoạn; hình minh hoạ đúng ý, không bị đầu che hết; không có chữ hay số do AI vẽ (nhất là lịch); thẻ hook đọc được; phụ đề không đè mặt.

## Chỗ phụ đề còn yếu
Cụm cắt theo số chữ nên đôi khi tách từ ghép ("Chị em nên kiểm | …"). Chưa sửa; nếu người dùng chê thì sửa hàm `phrases`.

## Nói với người dùng
- AI không nghe được: khớp môi, giọng, mức SFX cần họ nghe.
- Câu sức khoẻ cần người có chuyên môn duyệt; bật nhãn nội dung AI khi đăng.
- Nói đúng việc đã kiểm: xem ảnh thu nhỏ không phải là xem video.

## Đặt tên
`xong/<số> - <chủ đề>.mp4`. Script nhận video đã làm theo phần số ở đầu. Người dùng chuyển tệp đi nơi khác thì script coi là chưa dựng: khi gọi `dung` nên ghi rõ số video.
