---
name: photoshop-pro-studio
description: >-
  Bộ kỹ năng chuyên sâu chỉnh ảnh thương mại chuẩn Studio & Adobe Photoshop 2026:
  Retouch chân dung & món ăn tự nhiên (khóa bảo vệ 100% mắt/mí mắt/chân mày, chấm xóa
  mụn/nốt ruồi/vật thừa bằng Big-LaMa + bù hạt da thật, Frequency Separation nhẹ giữ
  96% lỗ chân lông, chỉnh tươi chuẩn ICC sRGB), Tách nền chủ thể sắc nét (BiRefNet FP16)
  căn tỷ lệ đồng nhất hàng loạt, xuất file .PSD đa layer chuẩn Photoshop và điều khiển
  trực tiếp Adobe Photoshop 2026 qua Photoshop MCP / ExtendScript (.jsx).
  Kích hoạt ngay khi người dùng yêu cầu chỉnh ảnh, retouch da, xóa vật thừa/mụn,
  tách nền ghép hình, xuất file .PSD hoặc thao tác với Photoshop.
---

# Photoshop Pro Studio Skill (Retouch Tự Nhiên, Cutout Đồng Bộ & Photoshop 2026 MCP)

Skill này đóng gói trọn bộ quy chuẩn xử lý ảnh thương mại & chân dung chuẩn Studio kết hợp **Adobe Photoshop 2026** (`Photoshop MCP Server` + `.PSD` đa layer + GPU Vision Pipeline trên `D:\AI\full studio\voice-studio\.venv\Scripts\python.exe`).

---

## 1. Quy Tắc Sống Còn Khi Làm Ảnh (Bắt Buộc Tuân Thủ 100%)

### A. Quy Tắc Vàng Số 1: Bảo Vệ Tuyệt Đối 100% Đôi Mắt & Ngũ Quan
- **TUYỆT ĐỐI KHÔNG BAO GIỜ** chạy làm mịn (Bilateral / Frequency Separation), chấm xóa tự động hoặc cộng sáng (`+L*`) đè lên:
  1. **Con ngươi & tròng mắt (`l_eye`, `r_eye`)** — cộng sáng làm con ngươi đen bị đục/mờ sương!
  2. **Nếp mí mắt trên (Double Eyelid) & Bọng mắt cười dưới (`aegyo-sal`)** — `face-parsing` mặc định gộp vùng da mí mắt vào `class 1 (face_skin)`. Nếu không tạo vùng đệm **`eye_socket_guard` (dilate mắt tối thiểu `5.5% – 7.5%` chiều ngang mặt)**, bộ lọc làm mịn sẽ xóa phẳng nếp mí khiến mắt trông sưng, mờ và giả!
  3. **Chân mày (`l_brow`, `r_brow` mở rộng ngang `5.5%` bảo vệ phần đuôi mày thưa)**, lỗ mũi, viền môi và rãnh cười tự nhiên.
- **Mask Áo Trắng (`shirt_mask`)**: Luôn cắt cứng **chỉ áp dụng phía dưới cằm (`y > face_bottom`)** để thuật toán khử ám vàng áo trắng không bao giờ ăn nhầm lên sợi chân mày hay lòng trắng mắt.

### B. Quy Tắc Vàng Số 2: "Retouch Ít Thôi" — Tự Nhiên Như Chụp Máy Cơ
- **Spot Healing chọn lọc (`Big-LaMa` Crop ở độ phân giải gốc + bù hạt cảm biến `grain_strength = 0.55–0.65`)**:
  - Chỉ chấm xóa các khuyết điểm rời rạc thật sự: mụn đỏ (`red_score > 2.65`), thâm mụn/nốt ruồi đậm (`dark_score > 3.8`, dilate rộng `0.020 * face_w` cho nốt ruồi sát viền hàm), lông thừa vùng cổ, cúc micro cài áo, tem dán thừa ở mép bàn.
  - Luôn dùng `cv2.MORPH_RECT` khi gom cụm cluster kích thước lớn (`> 45px`) thay vì `MORPH_ELLIPSE` để chạy trong `0.005s` thay vì `60s`.
- **Làm mịn da siêu nhẹ (`22% – 28%` Low-Frequency Bilateral + giữ `96%` Fine Pores & `68%` Mid Texture)**:
  - Giữ nguyên khối sáng tối tự nhiên trên sống mũi, gò má và **lỗ chân lông nam/nữ thật ở mức phóng đại 200%**. Không tẩy trắng bệt da.
- **Chỉnh tươi kiểu Camera Raw (`+0.15` đến `+0.20 EV` vùng midtone)**:
  - Nhân trọng số bảo vệ vùng tối (`x^0.85 * (1-x)^1.15`) để tóc đen, con ngươi đen và chữ in trên áo giữ độ đen sâu trong trẻo.
  - Khử vàng răng nhẹ nhàng (`28%–32%`), giữ sắc trắng ngà tự nhiên.

### C. Quy Tắc Vàng Số 3: Chuẩn Hệ Màu Apple `.HEIC` (`Display P3` -> `sRGB ICC`)
- File `.HEIC` từ iPhone luôn mang hệ màu rộng **Display P3 (`smpte432`)**. Không giải mã qua `ffmpeg` trần vì sẽ mất ICC làm ảnh xỉn màu.
- Bắt buộc giải mã bằng `pillow_heif` + `ImageOps.exif_transpose` + `ImageCms.profileToProfile(..., sRGB)` và **nhúng `icc_profile=SRGB_ICC` khi xuất `.jpg` (`quality=98, subsampling=0`)**.

### D. Quy Tắc Vàng Số 4: Chống Treo Ngầm `Photoshop.exe`
- Trước hoặc sau khi gọi tự động hóa Photoshop trên Windows, kiểm tra tiến trình bằng [check_photoshop_health.ps1](./scripts/check_photoshop_health.ps1).
- Nếu phát hiện `Photoshop.exe` có `MainWindowHandle == 0` tồn tại lâu (zombie process) hoặc `Adobe Crash Processor`, phải tắt tiến trình treo đó ngay để người dùng mở giao diện **Adobe Photoshop 2026** bình thường.

---

## 2. Hai Chế Độ Vận Hành Linh Hoạt

### Chế Độ 1: Điều Khiển Trực Tiếp Adobe Photoshop 2026 Qua `photoshop` MCP Server
- Khi **Adobe Photoshop 2026** đang mở trên màn hình người dùng, sử dụng các tool của MCP server `photoshop` (đã cấu hình trong `~/.gemini/config/mcp_config.json`) hoặc chạy script mẫu [run_photoshop_jsx.jsx](./scripts/run_photoshop_jsx.jsx) để:
  - Mở tài liệu, nhân đôi Layer (`Spot Heal`, `Frequency Separation Low/High`, `Camera Raw Filter`), tạo Adjustment Layers (`Curves`, `Selective Color`, `Hue/Saturation`, `Vibrance`), chạy Action `.atn` có sẵn của người dùng và lưu `.PSD` / `.JPG`.

### Chế Độ 2: Xử Lý Hàng Loạt Tốc Độ Cao Bằng GPU + Xuất `.PSD` Đa Layer Chuẩn Photoshop
Khi cần xử lý tự động hàng chục bức ảnh nặng (`12MP – 24MP`) với độ chính xác AI phân vùng ngữ nghĩa (`BiRefNet` + `SegFormer Face Parsing` + `Big-LaMa`):
1. **Retouch Chân Dung & Ẩm Thực Tự Nhiên + Xuất `.JPG` & `.PSD` 3 Layer**:
   - Chạy hoặc tùy biến từ script chuẩn: [retouch_portrait_natural.py](./scripts/retouch_portrait_natural.py)
   - Luôn kiểm tra trước trên 2–3 ảnh mẫu ở **độ phóng đại 200% vùng mắt (`_face_zoom_BA.jpg`)** bằng `read_file` trước khi chạy hàng loạt!
   - Xuất kèm bộ file `.PSD` nén RLE (`pytoshop` + `packbits`) gồm 3 layer rời (`Anh Goc`, `Xoa Mun & Vat Thua`, `Chinh Tuoi & Min Nhe`) để Editor mở bằng Photoshop 2026 tinh chỉnh Opacity bất cứ lúc nào.
2. **Tách Nền Sắc Nét (`BiRefNet FP16`) & Căn Tỷ Lệ Đồng Nhất Hàng Loạt**:
   - Sử dụng script chuẩn: [cutout_align_batch.py](./scripts/cutout_align_batch.py)
   - Khử viền halo màu nền quanh tóc (`edge color decontamination`), căn đáy chân chủ thể về cùng một vạch baseline và đồng bộ chiều cao chủ thể trên toàn bộ khung hình (`1080×1920` hoặc kích thước gốc), xuất cả `.PNG` trong suốt và `.PSD` tách lớp.

---

## 3. Chỉnh Màu & Kiến Trúc Mask Sáng Tối 16-Bit Chuẩn Mizuki Kikkawa (`Camera Raw` + `Photoshop`)
- Khi chỉnh Beauty từ file RAW (`.ARW`, `.CR3`, `.NEF`) hoặc cần chất màu điện ảnh Nhật Bản trong trẻo (`透明感` — Toumeikan) có chiều sâu ánh sáng 3D mà không ám vàng đục:
  - **Bắt buộc đọc**: [mizuki-color-and-masking.md](./references/mizuki-color-and-masking.md)
  - Giữ nguyên **99.7% pixel 16-bit gốc từ Adobe Camera Raw (`Adobe Portrait`)** + chấm mụn rời rạc + **Native 16-bit Frequency Separation** (`Surface Blur` ~42%), tuyệt đối không tô đè màu da bằng Python LAB.
  - Xây dựng nhóm **5 lớp `Mask Sáng Tối & Màu Mizuki` (`03_MAU_&_MASK_SANG_TOI_MIZUKI`)** bằng Adjustment Layers 16-bit: `Mask3 Background Minus Subject` (lọc biên `Guided Filter` 0% viền halo), `Pine-Emerald Foliage & Lycoris RedContrast`, `Mask1 Diagonal Shadow Anchor (-Shadow)`, `Mask2 Directional Sunlight Glow + Black Mist 1/4`, và `Mask4 Tight Facial Luminance (+顔の明るさを上げる)`.

---

## 4. Quy Trình Kiểm Định Chất Lượng (QC Checklist) Trước Khi Bàn Giao
1. Soi ảnh cắt 200% vùng mắt & chân mày (`read_file`): nếp mí trên, bọng mắt dưới, con ngươi và đuôi chân mày phải sắc nét 100% y hệt ảnh gốc.
2. Soi 4 góc ảnh: kiểm tra không để sót mép tem bàn, vệt biên padding hay lem vùng inpaint sang vật thể kế bên (như đĩa đồ ăn).
3. Kiểm tra `check_photoshop_health.ps1` đảm bảo không để lại tiến trình `Photoshop.exe` treo ngầm.
4. Lưu trữ script & bảng Contact Sheet Trước/Sau vào `E:\LUU-VIDEO\03_Du_An\<slug>\`.
