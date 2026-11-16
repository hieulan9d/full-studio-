# 01. Thể loại talking head

## Nguồn đã học

| Mã | Nguồn | Dạy gì |
|---|---|---|
| **HD1** | "hướng dẫn 1" (50 phút, tiếng Việt, DaVinci Resolve/Fusion), kèm **bộ Foodtage** (clip gốc, video mẫu, SFX, font, preset) | Talking head dọc nhịp dày: chữ hook, chữ sau lưng người, icon bay, zoom giật, light leak, SFX. **Ví dụ trong kit dựng lại đúng video này** |
| **HD2** | "hướng dẫn 2" (25 phút, AE, kênh TomsProject) | 3 animation kiểu Callaway: tiêu đề + đường dẫn + viên thuốc chữ, danh sách gạch đầu dòng, thẻ kính HUD sau lưng người |
| **HD-CL** | "hướng dẫn làm với claude" (21 phút) | Phong cách minimal premium (podcast Arthur Brooks), cách dạy AI một phong cách, quy trình plan → dựng → sửa |

| **HD-VN** | "Cách mở đầu video thu hút hơn…" (40 s, **tiếng Việt**, phân tích 2026-11-16) | Phong cách chuyên gia tối-xanh, chỉ chữ từ khoá hai cấp, không phụ đề từng từ, chia đôi màn hình, nháy trắng, B-roll thẻ dọc. Phân tích ở `knowledge/11` (chưa dựng lại) |

## Talking head khác video đồ hoạ thuần ở đâu

| | Video đồ hoạ (SaaS…) | Talking head |
|---|---|---|
| Xương sống | nhạc, cắt theo phách | **lời nói**, cắt theo từ |
| Đơn vị thời gian | phách | **mốc từng từ** (ms) trong transcript |
| Nền | dựng toàn bộ | **A-roll** (người nói); đồ hoạ đè lên hoặc thay thế vài giây |
| Chuẩn bị | không | transcript từng từ, cắt khoảng lặng, tách người khỏi nền |
| Điểm nhấn | chuyển cảnh | **từ khoá được nói ra** |

Hệ quả: mọi keyframe đặt theo giây của từ trong transcript.

## Luật chọn hiện mặt người hay hiện đồ hoạ (HD-CL)

- Mở video bằng mặt người nói kèm phụ đề, để người xem kết nối trước.
- Người nói **giới thiệu** một ý mới: quay về mặt. Người nói **mô tả hoặc kể ví dụ**: cho xem hình (B-roll, minh hoạ, biểu đồ).
- Một câu có thể nửa đầu hiện mặt, nửa sau hiện đồ hoạ. Mọi lần chuyển cảnh rơi vào **đầu một từ**.
- Hình ảnh đầu tiên phải gây tò mò. Không để 2 cảnh đồ hoạ cùng loại liền nhau.
- HD-CL đo được: cảnh đồ hoạ dài 2–4 giây, đoạn mặt người 1–3 giây giữa các cảnh, khoảng 55% thời lượng là đồ hoạ.

## Nhịp (mật độ hiệu ứng)

| Kiểu | Mật độ | Dùng cho |
|---|---|---|
| HD1 / Foodtage (dày) | một thứ mới mỗi **0,3–0,7 s**; mỗi ý chính có đủ impact + số neon + icon tile + từ khoá sau đầu | video giải trí, mẹo, "3 cách…" |
| Bán hàng / tư vấn | 1 hiệu ứng mỗi **2–3 s** (chính HD1 nói khách thường không trả tiền cho mật độ dày) | dược sĩ, bác sĩ, chuyên gia, sản phẩm |
| Minimal premium (HD-CL) | đồ hoạ 2–4 s xen mặt người 1–3 s | chia sẻ sâu, thương hiệu cá nhân cao cấp |

## Cấu trúc nội dung hay gặp

- **Hook 0–2,5 s**: chữ to kèm con số ("3 cách…", "Sai lầm số 1…"). Icon xếp trên đầu để báo trước nội dung.
- **Các ý đánh số**: mỗi ý mở bằng "Number 1/2/3" kèm impact và zoom giật. Từ khoá của ý đặt to sau đầu.
- **Ví dụ hoặc minh hoạ**: B-roll thay mặt người 2–3 s.
- **Kết**: thay nền phía sau người (nền vòng tròn, nền thương hiệu), riser kéo tới hết, từ cuối đổi màu.

## Ba phong cách đã có công thức

1. **Neon dày (HD1/Foodtage)**: nền phòng tối có đèn đỏ/xanh. Chữ TR Impact tím-trắng sau đầu, phụ đề serif nghiêng xanh ngọc phát sáng, tile icon neon. Công thức AE đã chạy thật (knowledge/03, examples/foodtage).
2. **Callaway (HD2)**: nền tối có blob màu mờ. Font Montserrat, đường dẫn và viên thuốc chữ, danh sách, thẻ kính sau lưng. Mới có công thức, chưa dựng thử (knowledge/03 mục B).
3. **Minimal premium (HD-CL)**: trắng giấy, đen than, một màu nhấn xanh cobalt. Inter kết hợp Playfair Italic, đường kẻ, tranh cổ, biểu đồ. Mới có công thức, chưa dựng thử (knowledge/03 mục C).
4. **Chuyên gia tối-xanh, ít chữ (HD-VN)**: phòng tối rèm xanh cobalt, người áo đen, chỉ từ khoá hai cấp (nhãn nhỏ + từ khoá to đậm nghiêng) ở ngực/đỉnh đầu, **không phụ đề từng từ**, cắt cảnh TB 2,7 s, chia đôi màn hình, nháy trắng, B-roll thẻ dọc tối nền. **Có dấu tiếng Việt.** Phân tích đầy đủ ở knowledge/11; chưa dựng thử. Nhịp thuộc loại "vừa", hợp dạy nghề / chuyên gia (kể cả y tế nếu bỏ phần người thật khác).
