# Quy Chuẩn Chỉnh Màu & Kiến Trúc Mask Sáng Tối 16-Bit (Mizuki Kikkawa × Pure Camera Raw)

Tài liệu tham chiếu chuyên sâu của skill `photoshop-pro-studio`, đúc kết từ **Mizuki Kikkawa** (`https://www.facebook.com/profile.php?id=100008006534752`, Sony Alpha Academy Japan) kết hợp quy trình **Pure 16-Bit Camera Raw (`Adobe Portrait`) + Native 16-Bit Photoshop**.

---

## 1. Nguyên Tắc Bất Di Bất Dịch Khi Làm Beauty + Chỉnh Màu File RAW (`.ARW` / `.CR3` / `.NEF`)

1. **TUYỆT ĐỐI CẤM tô đè màu da bằng Python LAB (`L*, a*, b*` overwrite)**:
   - Mọi phép ghi đè sắc độ da bằng mảng 8-bit bên ngoài sẽ phá hủy độ trong mao mạch dưới da, làm bệt sáp như tượng nhựa và tạo viền gắt quanh chân mày/cánh mũi.
   - **Quy trình chuẩn duy nhất**: Giữ nguyên **99.7% pixel 16-bit gốc từ Adobe Camera Raw (`CameraProfile = Adobe Portrait`)**, chỉ chấm xóa đúng các nốt mụn rời rạc (`31_pimple_dots_only_rgba.png`) + chạy **Native 16-bit Photoshop Frequency Separation** (`Surface Blur` ở `~40%–42%` Opacity với mask bảo vệ 100% hốc mắt/chân mày/mũi/môi + `Apply Image` 16-bit `Invert=true, Add, Scale=2.0, Offset=0` ở `Linear Light`).
2. **TUYỆT ĐỐI CẤM phủ màu vàng đục ("vàng khè") hoặc phủ sương xám toàn ảnh**:
   - Chất "nghệ thuật" đến từ **Phân Tầng Ánh Sáng (`Mask Sáng Tối`)** và **Tách Biệt Sắc Độ Lạnh – Ấm (`Cool Slate-Emerald Background` × `Velvet Ruby Red` × `Clean Porcelain Skin`)**, không phải từ việc kéo kênh Blue xuống làm ảnh vàng ố.

---

## 2. Kiến Trúc 5 Lớp `Mask Sáng Tối & Màu Mizuki` Trên Photoshop 16-Bit (Nhóm `03_MAU_&_MASK_SANG_TOI_MIZUKI`)

Đặt toàn bộ trong một Group Adjustment Layers **16-bit không phá hủy** nằm trên nhóm `02_Frequency_Separation_16Bit` để giữ nguyên 100% kết cấu da thật và cho phép bật/tắt từng lớp trong Photoshop:

1. **`01_Mask3_Diu_Hau_Canh_Contrast` (`Background Minus Subject`)**:
   - Dùng mask hậu cảnh lọc biên chính xác theo cạnh ảnh (`Guided Filter` trên ảnh 16-bit, `0%` viền halo quanh tóc/nón).
   - Hạ nhẹ độ sáng nền rối (`Curves` midtone `-16` đến `-22`), giảm độ rực màu gắt của tường nền (`Saturation -24%`) và nhích nhẹ sắc lạnh đá phiến (`Slate-Cyan`) ở vùng tối nền để chủ thể bật khối 3D tự nhiên.
2. **`02_Mask5_La_Xanh_Thong_&_Do_Lycoris` (`Pine Foliage & RedContrast`)**:
   - **Lá cây / Bụi cỏ**: Chuyển sắc vàng-xanh úa (`Hue 38°–95°`) sang **Xanh Thông Đậm Nhật Bản (`Pine-Emerald`)** (`Selective Color` / `Hue-Saturation` có mask riêng cho vùng lá, không chạm vào da và gấm vàng).
   - **Trang phục đỏ của mẫu (`Mask4 - RedContrast`)**: Làm đầm sâu sắc đỏ nhung (`Lycoris Crimson`) trên áo dài/kimono và phụ kiện đỏ mà không làm cháy bệt chi tiết hoa văn.
3. **`03_Mask1_Dim_Toi_Goc_Duoi_Shadow` (`Diagonal Linear Gradient -Shadow`)**:
   - `Linear Gradient` siêu êm kéo chéo góc `~40°` từ góc dưới phải / đáy tiền cảnh (ghế sắt, bụi cây, gầm bàn) cộng thêm viền tối nhẹ phía tường khuất nắng (`Curves` dìm `-0.45 EV` vùng tiền cảnh rối), neo vững trọng tâm thị giác và đẩy ánh nhìn lên gương mặt mẫu.
4. **`04_Mask2_Anh_Sang_Mem_Huong_Nang_Glow` (`Directional Radial Glow + Black Mist 1/4`)**:
   - `Radial Gradient` elip rộng đặt đúng hướng nắng chiếu vào khung hình, nâng nhẹ vùng sáng trong trẻo (`+0.18 EV` ngọc trai sạch, không ám vàng) kết hợp lớp tán xạ quang học `Black Mist 1/4` cực mảnh (`10%–12%` Screen chỉ ăn vào điểm chói `L > 185`, khóa `0%` tại mắt/chân mày).
5. **`05_Mask4_Sang_Trong_Guong_Mat_Subject` (`+顔の明るさを上げる` — Tight Facial Luminance & Clean Skin Tone)**:
   - `Radial Gradient` mềm đặt đúng tâm gương mặt & cổ mẫu: nâng nhẹ midtones vùng má khuất bóng (`Curves` khóa đỉnh `210->212` chống cháy má nắng) và giảm nhẹ sắc cam-nâu xỉn trong bóng đổ da bằng `Selective Color`, giúp làn da trắng sứ hồng hào trong veo (`透明感`) đúng chuẩn Mizuki Kikkawa.

---

## 3. Kỹ Thuật Scripting 16-Bit Trên Photoshop MCP Cần Nhớ
- Khi dán file PNG mask ngoài vào Layer Mask của tài liệu `16-bit`: bắt buộc chuyển tài liệu mask tạm sang `BitsPerChannelType.SIXTEEN` trước khi `copy()`, nếu không Photoshop báo lỗi `1205`.
- Với tài liệu `6000×4000` `16-bit` nhiều layer (`~500MB`), không gọi `ps_export_frame` (`Save for Web` dễ timeout 30s); luôn dùng `ps_save_document {format: "PNG", path: "..."}` để xuất bản xem kiểm định nhanh và sạch.
