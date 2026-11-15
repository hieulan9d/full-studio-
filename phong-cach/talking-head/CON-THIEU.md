# Còn thiếu trong kit (AI đọc trước khi làm)

Kit đã kiểm chứng cho đúng một trường hợp: **dựng lại video mẫu Foodtage** (tiếng Anh, phong cách neon, nhịp dày) bằng After Effects qua MCP, trên một máy Windows có GPU NVIDIA.
Ngoài trường hợp đó, các mục dưới đây **chưa có hoặc chưa được kiểm tra**. Gặp mục nào thì:
- nói rõ với người dùng;
- làm theo cách tạm ghi ở cột phải;
- sau khi làm thật, ghi kết quả vào knowledge/ (hoặc báo người dùng cập nhật file này).

Người dùng sẽ cập nhật file này dần. Mục nào đã xong thì đánh dấu `[x]` và ghi ngày.

## A. Kiểm chứng

| # | Thiếu | Cách tạm |
|---|---|---|
| [ ] A1 | **Chưa có AI nào khác dùng thử kit.** Tài liệu do chính AI dựng ví dụ viết, có thể còn chỗ hiểu ngầm | Trước khi làm video thật, dựng lại Foodtage theo `examples/foodtage/README.md` để thử môi trường. Chỗ nào tài liệu khó hiểu thì báo người dùng |
| [ ] A2 | **Chưa làm video tiếng Việt nào.** Độ chính xác phiên âm tiếng Việt (large-v3-turbo) chưa đo | Luôn dùng `--prompt` cho thuật ngữ; đọc lại `.txt` và sửa JSON trước khi lập plan |
| [ ] A3 | **Bước cắt khoảng lặng chưa chạy trên clip thật** (Foodtage không cần cắt; mới thử trên clip tự chèn im lặng) | Chạy `cut_silence.py --dry` trước, xem danh sách đoạn cắt, rồi nghe thử `aroll.mp4` |
| [ ] A4 | Phong cách Callaway và minimal premium (knowledge/03 B, C) **mới có công thức trên giấy** | Dựng từng khối riêng và so khung trước khi đưa vào video |
| [ ] A5 | Mới chạy trên **Windows + AE 2026 + GPU NVIDIA** | macOS: `install-panel.ps1`, `_cuda.py` và đường dẫn font phải viết lại. Không có GPU: chạy được nhưng chậm 4–10 lần |

## B. Tiếng Việt và ngành y (mục tiêu chính của người dùng: dược sĩ chia sẻ kiến thức phụ khoa)

| # | Thiếu | Cách tạm |
|---|---|---|
| [ ] B1 | **Chưa có bộ font tiếng Việt đã kiểm tra.** Font Foodtage (TR Impact, Pensum, Tactic Sans, Athelas) thiếu dấu | Chọn theo bảng gợi ý ở knowledge/10, kiểm bằng `tools/fonts_vi.py`, hỏi người dùng có font thương hiệu không |
| [ ] B2 | **Chưa có bộ phong cách y tế** (màu pastel, grade da sáng, glow nhẹ, nhịp vừa) đã dựng thử | Đổi `T.init({colors})` và grade theo knowledge/10; gửi khung thử cho người dùng duyệt sớm |
| [ ] B3 | **Thiếu khối:** thẻ tên + chức danh dược sĩ, thẻ sản phẩm (packshot), khung kết có CTA + câu khuyến cáo, danh sách triệu chứng/gạch đầu dòng | Dựng bằng `T.txt` + `H.shape` + `T.punchIn`; sau đó thêm vào `lib/th-lib.jsx` và knowledge/03 |
| [ ] B4 | **Thiếu icon y khoa** (giọt nước, khiên, lá, viên thuốc, lịch…) | Hỏi người dùng; hoặc dùng icon nét có giấy phép rõ ràng. `T.tile` nhận cả PNG |
| [ ] B5 | Nội dung y tế và quảng cáo: kit chỉ có **lưu ý chung** (knowledge/10), chưa có danh sách từ cấm hay câu khuyến cáo chuẩn của thương hiệu | Hỏi người dùng hoặc pháp chế. Liệt kê mọi câu khẳng định sức khoẻ trong `report.md` để duyệt |

## C. Tài nguyên

| # | Thiếu | Cách tạm |
|---|---|---|
| [ ] C1 | SFX, meme, clip và font trong `examples/foodtage/assets/` **thuộc bộ tài liệu khoá học**, chỉ dùng để học | Video thương mại: hỏi người dùng nguồn SFX/nhạc có bản quyền |
| [ ] C2 | **Không có nhạc nền** | Hỏi người dùng; mức −20 đến −24 dB dưới giọng |
| [ ] C3 | **Chưa có bảng ghi đoạn đẹp** của file light leak (bản v1 chọn sai 3 đoạn: nhiễu, loé đỏ, vệt trắng) | Đo độ sáng và xem khung theo knowledge/06 mục 7 trước khi chọn |

## D. Công cụ

| # | Thiếu | Cách tạm |
|---|---|---|
| [ ] D1 | **Chưa có script chuẩn hoá âm thanh 2 lượt** (v1 chạy 1 lượt, mới đạt −15,5 LUFS) | Chạy tay 2 lệnh ở knowledge/05 |
| [ ] D2 | **Chưa dựng thẳng từ plan.** Vẫn phải sửa tay khối DATA trong `build.jsx` | Chép `examples/foodtage/build.jsx`, sửa DATA theo `plan.md` |
| [ ] D3 | Chưa có công cụ tự đề xuất vị trí chữ tránh mặt (dựa trên matte) | Đặt chữ sau lưng ở phần trên khung (y < 600) và so khung |

## E. Lỗi còn trong ví dụ Foodtage v1

| # | Lỗi | Ghi chú |
|---|---|---|
| [ ] E1 | Light leak sai đoạn ở 6,0 / 7,67 / 16,67 s | xem C3 |
| [ ] E2 | Âm lượng −15,5 LUFS | xem D1 |
| [ ] E3 | Nét icon tile mảnh hơn mẫu; icon trên nền vòng là nét viền (mẫu là hình trắng đặc) | |
| [ ] E4 | B-roll nghiêng hơn mẫu; nửa dưới lộ một phần đồng hồ âm thanh | chỉnh `bottomAnchor`, góc xoay |
| [ ] E5 | Số 1/2/3 phẳng (mẫu kiểu 3D ánh kim) | |

---
Đã có (không còn thiếu): cầu nối MCP + extension Claude Bridge (`ae-bridge/`, cài theo knowledge/00).
