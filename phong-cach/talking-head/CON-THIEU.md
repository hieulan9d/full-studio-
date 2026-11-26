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
| [~] A1 (2026-11-16) | **Đã có một lần chạy thử bởi AI không phải tác giả** (`fullstudio/output/foodtage-thu/`, **không đưa lên git**: chứa clip gốc 4K và tài nguyên khoá học; chuẩn bị clip, plan có Hook, dựng 5 giai đoạn, render, QC; kết quả và lỗi ở `report.md`, bẫy mới ở knowledge/07 mục 23–27). Chưa phải "máy sạch": máy đã cài sẵn AE, font, GPU. Người dùng đã xem bản v2 (có SFX theo bảng knowledge/05) và nói "ổn" (2026-11-16); chưa có nhận xét chi tiết. | |
| [ ] A1b | **Chưa có AI nào khác dùng thử kit.** Tài liệu do chính AI dựng ví dụ viết, có thể còn chỗ hiểu ngầm | Trước khi làm video thật, dựng lại Foodtage theo `examples/foodtage/README.md` để thử môi trường. Chỗ nào tài liệu khó hiểu thì báo người dùng |
| [~] A2 (2026-11-17) | **Đã làm một video tiếng Việt** (Bojomi, `examples/bojomi/`, knowledge/13, v1→v3). Phiên âm large-v3-turbo: 257 từ, sai tên thương hiệu/từ mượn/đơn vị và có ảo giác ở đuôi (knowledge/07 mục 37). Chưa đo tỉ lệ sai. Người dùng chưa phản hồi v3 | Luôn dùng `--prompt`; đọc lại `.txt`; chữ trên màn hình lấy từ nhãn/brief, không từ transcript |
| [ ] A2b | Đã có **một video mẫu tiếng Việt** để học (knowledge/11) nhưng chưa dựng lại; whisper của refkit sai tên riêng/từ mượn, chưa đo bản large-v3-turbo của kit | Sửa transcript tay trước khi lập plan; thử dựng một khối (chữ hai cấp, chia đôi màn hình) trước khi dựng cả video |
| [~] A3 (2026-11-16) | **Đã chạy trên clip thật** (Bojomi: 22 chỗ, 86,1→75,7 s; cắt thêm 2 đoạn lời lỗi bằng ffmpeg `trim`/`concat`, đã phiên âm lại để kiểm). Chưa nghe lại bằng tai | Chạy `cut_silence.py --dry` trước, xem danh sách đoạn cắt, rồi nghe thử `aroll.mp4` |
| [ ] A4 | Phong cách Callaway và minimal premium (knowledge/03 B, C) **mới có công thức trên giấy** | Dựng từng khối riêng và so khung trước khi đưa vào video |
| [ ] A5 | Mới chạy trên **Windows + AE 2026 + GPU NVIDIA** | macOS: `install-panel.ps1`, `_cuda.py` và đường dẫn font phải viết lại. Không có GPU: chạy được nhưng chậm 4–10 lần |

## B. Tiếng Việt và ngành y (mục tiêu chính của người dùng: dược sĩ chia sẻ kiến thức phụ khoa)

| # | Thiếu | Cách tạm |
|---|---|---|
| [~] B1 (2026-11-17) | **Đã kiểm bằng `fonts_vi.py`**: Cambria (mọi kiểu), Segoe UI, Corbel, Tahoma, Arial **đủ dấu**; Georgia **thiếu**. Bojomi dùng Cambria Bold Italic (từ khoá) + Segoe UI Bold (nhãn). Chưa thử Be Vietnam Pro, Montserrat, Playfair (cần tải). Font Foodtage (TR Impact, Pensum, Tactic Sans, Athelas) thiếu dấu | Chọn theo bảng gợi ý ở knowledge/10, kiểm bằng `tools/fonts_vi.py`, hỏi người dùng có font thương hiệu không |
| [~] B2 (2026-11-17) | **Đã dựng thử một bộ màu thương hiệu** xanh–vàng–kem cho thực phẩm bổ sung, nhịp vừa (PHONG-CACH.md, biến thể B). Chưa có bộ pastel hồng-tím cho phụ khoa | Đổi `T.init({colors})` và grade theo knowledge/10; gửi khung thử cho người dùng duyệt sớm |
| [~] B3 (2026-11-17) | **Đã dựng trong `examples/bojomi/build.src.jsx` (chưa vào th-lib):** packshot tách nền, banner kết + khuyến cáo, bong bóng nguyên tố, thẻ thành phần đếm số, bảng thành phần, B-roll 9:16 phủ khung, nháy trắng, zoom theo đoạn. **Còn thiếu:** thẻ tên + chức danh dược sĩ, danh sách triệu chứng/gạch đầu dòng | Dựng bằng `T.txt` + `H.shape` + `T.punchIn`; sau đó thêm vào `lib/th-lib.jsx` và knowledge/03 |
| [ ] B3b | **Thiếu khối từ video HD-VN (knowledge/11, chưa có hàm `T.*`)**: chữ hai cấp ở ngực, thẻ tên người được nhắc, nháy trắng + chữ đen nghiêng, chia đôi màn hình (đồ hoạ 46% trên / người dưới), thẻ điện thoại bay vào + số lượt xem, khung nét đứt sáng + bong bóng emoji, B-roll thẻ dọc tối nền, zoom giật có nhoè | Dựng bằng `T.txt` + `H.shape` + `T.punchIn`; hỏi người dùng trước khi thêm vào `th-lib.jsx` |
| [ ] B4 | **Thiếu icon y khoa** (giọt nước, khiên, lá, viên thuốc, lịch…) | Hỏi người dùng; hoặc dùng icon nét có giấy phép rõ ràng. `T.tile` nhận cả PNG |
| [ ] B5 | Nội dung y tế và quảng cáo: kit chỉ có **lưu ý chung** (knowledge/10), chưa có danh sách từ cấm hay câu khuyến cáo chuẩn của thương hiệu | Hỏi người dùng hoặc pháp chế. Liệt kê mọi câu khẳng định sức khoẻ trong `report.md` để duyệt |

## C. Tài nguyên

| # | Thiếu | Cách tạm |
|---|---|---|
| [ ] C1 | SFX, meme, clip và font trong `examples/foodtage/assets/` **thuộc bộ tài liệu khoá học**, chỉ dùng để học | Video thương mại: hỏi người dùng nguồn SFX/nhạc có bản quyền |
| [ ] C2 | **Không có nhạc nền** (Bojomi v1–v3 không có nhạc; người dùng chưa yêu cầu) | Hỏi người dùng; mức −20 đến −24 dB dưới giọng |
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
