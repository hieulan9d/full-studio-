---
name: video-hang-thu-pharma
description: >-
  Dựng video talking head dọc 1080×1920 kiểu Hằng Thu Pharma / An Vượng (HTPM) theo loạt mẫu 26.11.2026: video ngắn 12–15 s hỏi đáp sức khoẻ
  (thẻ hook vàng phía dưới, thẻ ảnh hai bên đầu, tiêu đề lớn, nền xanh đen cuối) và video dài 38–54 s giới thiệu sản phẩm (hook phía trên,
  phụ đề hiện từng từ, đồ hoạ theo khe, màn chia đôi B-roll, màn sản phẩm, thẻ CTA). Dùng skill này khi người dùng nhắc Hằng Thu, HTPM,
  An Vượng, Bojomi, AV Protein, LT Plus, viên đặt phụ khoa, "edit giống video mẫu ngày 26.11", hoặc đưa clip người nói và muốn dựng
  video bán hàng/tư vấn kiểu đó, kể cả khi không gọi tên phong cách. Không dùng cho loạt tư vấn hiếm muộn nền đồ hoạ Flow.
---

# Video kiểu Hằng Thu Pharma

Toàn bộ kit nằm ở `phong-cach/hang-thu-pharma/` (tính từ gốc dự án). Đọc theo thứ tự:

1. `memory/README.md` rồi các file memory.
2. `PHONG-CACH.md`: hai dạng `ngan` và `dai`, công thức kịch bản, luật nội dung y tế.
3. `AGENTS.md`: quy trình, định dạng `plan.json`, luật dựng.
4. `ref-notes.md`: số đo (vị trí, thời gian, chuyển cảnh) và những gì chưa xác định.

Công cụ dựng: `tools/dung.py`. Mẫu plan: `mau/`.

Ba điều không được bỏ:
- Chờ người dùng duyệt `plan.md` trước khi tạo asset AI hoặc dựng.
- Số liệu, công dụng lấy đúng nhãn; có khuyến cáo; liệt kê câu khẳng định sức khoẻ để người có chuyên môn duyệt.
- SFX và nhạc gốc chưa xác định được: nói rõ khi giao, đừng nói là giống mẫu.

Làm xong thì ghi lại vào `memory/`.
