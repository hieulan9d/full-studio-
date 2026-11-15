# 10 — Viết nội dung và phát triển brief

Video đẹp mà chữ nhạt vẫn là video nhạt. Người dùng đưa brief (có thể sơ sài); AI **phát triển**
nó thành bản đủ để dựng — nhưng **không sửa file `brief.md` của người dùng**. Bản phát triển ghi vào
`projects/<slug>/brief-dev.md`, mỗi chỗ AI tự thêm đánh dấu `(AI)` để người dùng biết.

## 1. Quy trình phát triển brief

1. Đọc brief. Gạch ra cái đã có / còn thiếu so với `brief-template.md`.
2. Thiếu thứ bắt buộc (tên sản phẩm, sản phẩm làm gì, thời lượng) → hỏi người dùng 1 lần, gộp mọi câu.
   Thiếu thứ khác → tự quyết theo mục 2–6 dưới đây, đánh dấu `(AI)`.
3. Viết `brief-dev.md` gồm: thông điệp chính 1 câu, 3–4 tính năng (tên ngắn + 1 câu), CTA, tông màu (HUE),
   định dạng (16:9 và/hoặc 9:16), mọi chữ trên màn hình, nội dung UI (người dùng giả, menu, số liệu, nhãn
   theo ngành), câu hỏi/trả lời chat, chọn cảnh.
4. Tự soát bằng checklist mục 7, rồi mới viết storyboard.

## 2. Thông điệp và cấu trúc câu chuyện

Video 15–30 s chỉ chở được **một** ý chính. Khung chuẩn:

| Nhịp | Câu hỏi người xem | Cảnh thường dùng |
|---|---|---|
| Mở (0–1,5 s) | Đây là gì? | logo-reveal hoặc text-pop câu hứa hẹn |
| Khoe (60–70% thời lượng) | Nó làm được gì cho tôi? | dashboard-rise, ai-chat, feature-orbit, card-ring — mỗi cảnh **một** tính năng |
| Chốt (2–3 s) | Tôi làm gì tiếp? | star-morph → end-card với CTA |

Thứ tự tính năng: cái "wow" nhất (thường là AI) đặt ở giữa-sau, không đặt đầu.

## 3. Chữ trên màn hình

| Loại | Độ dài | Ví dụ tốt | Ví dụ kém |
|---|---|---|---|
| Tiêu đề cảnh | 1–3 từ, danh từ/tên tính năng | "Meeting Hub", "Live Notes" | "Our powerful meeting management feature" |
| Dòng phụ | ≤ 6 từ, lợi ích cụ thể | "All your meetings in one place" | "It helps you manage things better" |
| Chữ 2 dòng trong vòng (orbit) | 1 từ + 1 từ | "New / Updates", "Live / Notes" | câu dài |
| Câu hỏi chat | ≤ 32 ký tự, câu hỏi thật người dùng sẽ gõ | "What did we decide on the launch?" | "Can you help me?" |
| Trả lời chat | 2–4 gạch đầu dòng, ≤ 70 ký tự/dòng, có số/tên/ngày cụ thể | "Launch moves to September 18th…" | "Here is a summary of your meeting." |
| CTA | ≤ 5 từ, động từ | "Meet smarter with Orbiq", "Try it free" | "Thank you for watching" |

Thời gian đọc: ~3 từ/giây cho chữ lớn; chữ phải ở yên trên màn hình ít nhất (số từ / 3) + 0,5 s.
Không viết chữ nào mà người xem không kịp đọc — trừ chữ trang trí trong UI (đó là "kết cấu", không phải thông điệp).

## 4. Nội dung giao diện giả

- Nhãn theo **ngành của sản phẩm** (app họp: Recordings, Meeting hours, Talk time, Action items;
  app tài chính: Balance, Spending, Invoices, Cash flow; app bán hàng: Orders, Revenue, Top products).
  Để nhãn mặc định "Documents / Costs" cho app không liên quan là lỗi.
- Tên người dùng giả: tên tiếng Anh trung tính, đa dạng (Sarah Chen, Leo Park, Maya Patel). Không dùng tên người thật nổi tiếng.
- Số liệu tròn, hợp lý, nhất quán giữa các chỗ (248 Meetings ở thẻ chính và panel nền giống nhau).
- Câu việc/task: động từ + đối tượng ngắn ("Send recap to design").
- Ngôn ngữ chữ UI theo brief; brief tiếng Việt thì chữ UI tiếng Việt (kiểm tra font có dấu — Segoe UI/Inter đều có).

## 5. Chọn tông màu

| Ngành / cảm giác | Tông | H.HUE |
|---|---|---|
| Công nghệ, AI, bảo mật (mặc định) | xanh dương | 0 |
| AI sáng tạo, cộng tác, cao cấp | tím | +45 |
| Sức khoẻ, tài chính xanh, tăng trưởng | teal / xanh lá ngọc | −30 / −80 |
| Mạng xã hội, tiêu dùng, trẻ | hồng-tím | +90 |

Brand có màu riêng → chọn HUE gần màu đó nhất (màu gốc kit là xanh ~220°: HUE = sắc độ brand − 220).

## 6. Định dạng

Người dùng làm cả 16:9 và 9:16. Mặc định dựng **cả hai** từ cùng một `build.jsx` (16:9 trước, rồi 9:16).
9:16 cần chữ to hơn tương đối — xem `11-khung-doc.md`.

## 7. Checklist brief-dev trước khi dựng

- [ ] Một câu thông điệp; mỗi cảnh khoe đúng một tính năng
- [ ] Mọi chữ đúng độ dài bảng mục 3, đúng chính tả, không lặp từ giữa các cảnh
- [ ] Nhãn UI đúng ngành, số liệu nhất quán
- [ ] Chat có câu hỏi thật + câu trả lời có chi tiết cụ thể
- [ ] CTA có động từ
- [ ] Đánh dấu `(AI)` mọi chỗ tự thêm; ghi câu hỏi còn mở cho người dùng ở cuối file
