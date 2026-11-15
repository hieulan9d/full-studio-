# 10. Tiếng Việt và ngành nhạy cảm (y tế, phụ khoa)

## Font tiếng Việt

Đã kiểm bằng `tools/fonts_vi.py`:

| Font (bộ Foodtage) | Dấu tiếng Việt |
|---|---|
| TR Impact | **thiếu** (ệ ế ờ ữ ặ…) |
| Pensum Display Book Italic | **thiếu** |
| Tactic Sans (mọi kiểu) | **thiếu** |
| Athelas | **thiếu** (ơ ư và các dấu đi kèm) |
| SVN-Rosellinda Alyamore | đủ (bộ "SVN-" là font Việt hoá) |

Thay thế đề xuất (miễn phí, đủ dấu, có trên Google Fonts). Cần tải và cài, rồi kiểm lại bằng `fonts_vi.py`:

| Vai trò | Thay cho | Gợi ý |
|---|---|---|
| Từ khoá to, đậm hẹp | TR Impact | Anton, Bebas Neue (bản có dấu Việt), Oswald Bold, Be Vietnam Pro Black |
| Phụ đề serif nghiêng | Pensum Italic | Playfair Display Italic, Lora Italic, Noto Serif Display Italic |
| Chữ hook rộng, đậm | Tactic Sans Expanded | Montserrat ExtraBold/Black, Be Vietnam Pro ExtraBold |
| Viết tay | Rosellinda | giữ SVN-Rosellinda, hoặc Dancing Script |

Cỡ chữ: dấu tiếng Việt cao hơn chữ Latin. Tăng `lead` (khoảng cách dòng) thêm khoảng 10% và kiểm phần dấu của dòng trên có chạm dòng dưới không.
Câu tiếng Việt dài hơn tiếng Anh khoảng 20–30%, nên phụ đề để 1–2 từ mỗi dòng (`caption_groups.py --max-chars 10`).

## Phong cách cho dược sĩ hoặc bác sĩ (tư vấn sức khoẻ phụ nữ)

Giữ cấu trúc (hook, ý đánh số, từ khoá sau đầu, phụ đề từng từ, tile, kết), đổi phần "da":
- **Màu**: hồng phấn, tím pastel, xanh ngọc nhạt, trắng. Bỏ neon đỏ/xanh chói. Ví dụ `T.init({colors:{titleTop:'#c46bd6', titleBot:'#ffd6ec', cap:'#ffffff', capAlt:'#ff7eb6', digit:'#f3b6d8', digitEdge:'#ffffff', ...}})`.
- **Grade**: da sáng, ấm, tương phản vừa (contrast khoảng 12, vibrance khoảng 20), không vignette nặng.
- **Glow nhẹ** (inten 0,4–0,6). Bỏ tia sét ở số (`{bolt:false}`).
- **Icon y khoa**: giọt nước, khiên bảo vệ, lá cây, viên thuốc, lịch, đồng hồ, dấu tích. Dùng icon nét hoặc phẳng, không dùng ảnh thật.
- **Thẻ tên + chức danh** ở 2–3 s đầu ("DS. Nguyễn Văn A, Dược sĩ"): tăng tin cậy. (Chưa có hàm trong th-lib, dựng bằng `T.txt` + `H.shape`.)
- **Nhịp vừa**: 1 hiệu ứng mỗi 2–3 s. Từ khoá sau đầu chỉ dùng cho 2–3 ý chính.
- **SFX**: pop, click, ping, whoosh nhẹ. Bỏ impact và lightsaber. Có thể thêm nhạc nền nhẹ (−20 đến −24 dB dưới giọng).
- **B-roll**: sơ đồ đơn giản, hình minh hoạ, hộp sản phẩm (nếu được phép). Không dùng hình cơ thể thật.

## Kiểm duyệt nền tảng (TikTok, Facebook, YouTube)

Nội dung sức khoẻ sinh sản dễ bị giảm phân phối hoặc gỡ nếu có từ ngữ hay hình ảnh nhạy cảm.
- Chữ hiện trên màn hình dùng **thuật ngữ y khoa trung tính** ("vùng kín", "âm đạo" trong ngữ cảnh y khoa, "viêm phụ khoa"). Tránh từ lóng, từ gợi dục, từ gây sợ hãi.
- Không ảnh hoặc video cơ thể thật, không minh hoạ giải phẫu chi tiết. Dùng icon và sơ đồ.
- Không đặt từ nhạy cảm vào hook hay chữ to (chữ to bị quét kỹ nhất). Có thể để trong lời nói và phụ đề.
- Lưu một bản danh sách từ thay thế của thương hiệu trong brief ("Điều cấm").

## Quảng cáo sản phẩm và thông tin y tế (Việt Nam)

AI không tư vấn pháp lý. Chỉ cảnh báo và đề xuất cách nói an toàn, để người dùng hoặc bộ phận pháp chế quyết định.
- Không hứa hiệu quả tuyệt đối: "khỏi hẳn", "100%", "dứt điểm", "thay thế thuốc".
- Thực phẩm chức năng hoặc sản phẩm vệ sinh không được nói như thuốc chữa bệnh. Thường cần câu khuyến cáo theo quy định ("Sản phẩm này không phải là thuốc, không có tác dụng thay thế thuốc chữa bệnh") và số giấy phép quảng cáo nếu là nội dung quảng cáo.
- Kiến thức chung nên kết bằng lời khuyên đi khám khi có triệu chứng.
- Không so sánh hay chê sản phẩm khác.
- Ghi trong `report.md` mọi câu trên màn hình có tính khẳng định về sức khoẻ, để người dùng duyệt.

## Liên kết với các phần khác của hệ thống

Trong dự án gốc còn có recipe `phu-khoa` (tạo clip AI trên Google Flow, người dùng cung cấp kịch bản, ảnh dược sĩ và ảnh sản phẩm).
Kịch bản và ảnh sản phẩm từ đó có thể dùng làm nội dung và B-roll cho talking head ở đây.
