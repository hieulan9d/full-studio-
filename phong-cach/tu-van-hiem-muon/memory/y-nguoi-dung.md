# Ý người dùng

- 2026-11-26: yêu cầu xem video trong `E:\video mẫu để clone` để clone phong cách.
- 2026-11-26: người dẫn là **AI mới** (không dùng người trong mẫu). Hồ sơ: `../NGUOI-DAN.md`.
- Chưa chốt: ngoại hình người dẫn, mức giống, đề tài video đầu, tên ở chữ ký.
- 2026-11-26: duyệt kiểu nền ảnh minh hoạ trôi chậm ("Ổn, làm cả video").
- 2026-11-26: **muốn tạo liền** người dẫn + nền động + hình minh hoạ trong cùng clip Flow (không ghép ảnh nền, không tách nền).
- 2026-11-26: **không phụ đề** ("ko subtext"); bản v03 không có chữ nào.
- 2026-11-26: Đính chính: "ko subtext" là **Flow không vẽ chữ vào clip**; chữ (thẻ hook, phụ đề) vẫn chèn ở bước edit ("edit text đi"). Quy trình: tạo liền không chữ -> `build_text.py` chèn chữ.
- 2026-11-26: người dùng hỏi thêm SFX cho v02. Đã đặt 13 tiếng nhẹ (`output/hiem-muon-v02/mix_sfx.py`): pop ở thẻ hook và đầu mỗi ý, whoosh khi hình đổi, sparkle cuối. Chờ nhận xét mức to/loại tiếng.
- 2026-11-26: muốn video **nhanh 1,1×** và **cắt hết khoảng nghỉ** (`output/hiem-muon-v02/nhanh.py`). Áp dụng mặc định cho video sau.
- 2026-11-27: muốn nâng cấp video, đưa 5 mẫu HTPM ngày 26.11 (3 ngắn 12–15 s người dẫn AI áo xanh, 2 dài bán hàng người thật). Đã xem và đề xuất mượn lớp đồ hoạ của bản ngắn (`../../hang-thu-pharma/`). Người dùng chưa chọn.
- 2026-11-27: chê nền xanh đêm ghép vào ("nền xấu thế sao ko để nền video AI tạo ra"). **Giữ nguyên nền AI của clip**: không thay nền, không tách người ghép nền; đã bỏ cả làm tối và làm mờ nền. Chỉ đặt thẻ/chữ đè lên.
- 2026-11-27: yêu cầu thêm hiệu ứng chữ theo mẫu HTPM. Đã thêm `scripts/hieu_ung.py` (bật phóng, trượt hai bên, vệt sáng, hạt lấp lánh, sóng chấm, phụ đề phóng nhoè, từ chưa đọc tô xám) vào script chung; bản thử `output/hiem-muon-lo/thu-hieu-ung/17-hieu-ung.mp4`, chờ người dùng xem.
