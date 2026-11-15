# 03. Thư viện hiệu ứng

Ba nhóm, kèm mức độ đã kiểm chứng:
- **A.** Đã chạy thật trong AE và render ra video (ví dụ Foodtage). Có hàm `T.*` trong `lib/th-lib.jsx`.
- **B.** Công thức Callaway (HD2): mới có trên giấy, chưa dựng thử.
- **C.** Công thức minimal premium (HD-CL): mới có trên giấy, chưa dựng thử.
- **D.** Bảng đổi kỹ thuật DaVinci (HD1) sang AE.

Quy ước: comp `MAIN` 1080×1920 30 fps, F = 1/30 s. "snap" là kiểu ease lao nhanh rồi phanh (influence ra 8, vào 92).

---

## A. Khối đã kiểm chứng (th-lib.jsx)

### A1. Nền: A-roll grade + người tách nền + zoom (`T.base`)
- Precomp `AROLL_G` chứa clip và các hiệu ứng chỉnh màu. Clip phẳng/log (Foodtage):
  - Levels: input đen 24/255, trắng 228/255, gamma 0,92.
  - Vibrance: vibrance 45, saturation 25.
  - Brightness/Contrast: −8 / 32.
  - CC Vignette 35.
  - Clip đã có màu đẹp thì giảm hết về khoảng ⅓.
- Trong MAIN, xếp từ dưới lên: `BG_Plate` (AROLL_G), `MATTE_Person` (video matte), `FG_Person` (AROLL_G, Track Matte = MATTE_Person, kiểu **Luma**), null `CAM` làm cha của cả ba.
- **Zoom giật**: key scale của `CAM` kiểu **HOLD** ở đầu mỗi ý (100 → 120 → 110…). Tâm zoom là mặt người (`focus` ≈ [540, 700]). Mức 110–122%.
- Chỉ bật âm thanh của `BG_Plate`. FG_Person và matte phải tắt âm thanh, không thì giọng bị nhân đôi.

### A2. Chữ sau lưng người (`T.behind`)
Mọi layer đưa xuống ngay trên `BG_Plate` sẽ nằm sau người nói, vì người nằm ở `FG_Person` phía trên. Đầu và vai che chữ một phần, đây chính là hiệu ứng mong muốn.
Chỉ đặt **phần trên khung** (y < 600) hoặc hai bên đầu, để mặt luôn rõ.

### A3. Từ khoá to sau đầu (`T.keyword`)
- Font tiêu đề đậm hẹp (Foodtage: TR Impact). Cỡ 230–300 cho một từ khoảng 8 ký tự; hai dòng cỡ khoảng 300, line height 0,98.
- Gradient dọc tím đậm `#7563ff` → tím nhạt `#dcd3ff` (`T.grad`). CC Light Sweep chạy ngang suốt thời gian hiện. Drop shadow 40%.
- Vào: scale 135 → 100% trong 5 khung kiểu snap. Ra: tắt trong 3 khung. Vị trí: y 215 (một dòng), y 330 (hai dòng).
- Đổi từ khoá liên tiếp (FASTER → Efficient): từ sau vào **đúng khung** từ trước tắt.

### A4. Nhãn + số neon (`T.number`)
- Nhãn ("Number", "and Last"): font tiêu đề cỡ 190, màu xanh `#1f4fff`, glow giữ màu, đặt trên trái [70, 205].
- Số: serif nghiêng cỡ 1050, fill tím `#9a82ff`, viền xanh ngọc `#8ff8ff` 12 px nằm trên fill, glow xanh ngọc. Vị trí [850, 430], tức bên phải đầu, sau lưng người.
- Vào: scale 150 → 100% và xoay −14 → 0° trong 8 khung, opacity 2 khung. Sau đó trôi nhẹ 100 → 94% tới lúc tắt.
- Tia sét: path trắng xanh, nháy opacity 0/100/30/100/0 trong khoảng khung 3–16.
- Luôn đi kèm SFX impact + lightsaber (knowledge/05) và zoom giật cùng khung.

### A5. Phụ đề từng từ (`T.captions`, `T.capGroup`)
- Font serif nghiêng (Foodtage: Pensum Display Book Italic) cỡ 112, xanh ngọc `#5cf7e0`, glow giữ màu bán kính 14.
- Vị trí: ngực, dòng đầu ở y 990, mỗi dòng cách 82, căn giữa. Mỗi dòng 1–2 từ, mỗi nhóm 2–4 dòng xếp chồng sát nhau.
- **Từng từ hiện đúng mốc nói**: trồi lên 30 px + blur 18 → 0 trong 5 khung. Cả nhóm tắt cùng lúc (2 khung) khi nhóm sau bắt đầu.
- Từ nhấn: `{k: 1.25–1.4}` (to hơn). Từ chốt: `{c: '#d35bff'}` (đổi màu). Từ quan trọng nhất: `{su: 1}` (Stroke Up).
- Không đặt phụ đề trùng thời gian với hook, chữ to cùng nội dung hoặc B-roll.
- Nháp: `tools/caption_groups.py`.

### A6. Stroke Up (`T.strokeUp`), từ preset DaVinci "Strock Up.setting"
- Chữ trồi lên 70 px vào chỗ trong 10 khung.
- Một bản sao chỉ có viền (không fill, viền 4 px) phóng 100 → 250% ở khung 6–14 và mờ dần ở khung 10–14.
- Thông số gốc trong Fusion: viền dày 0 → max ở khung 9–16; bản viền scale 1 → 2,5 ở khung 10–20, mờ ở khung 16–20; SoftGlow gain 1,5 size 30.

### A7. Icon tile (`T.tile` + `T.placeTile`), từ preset "icon effect.setting"
- Precomp 420×420: thẻ 380 px bo góc 22%, nền `#101318`, ánh tím radial ở góc dưới phải, viền tím `#9b3cff` 5 px.
- Vệt sáng dài 20% chu vi chạy vòng viền, 6 giây một vòng (Trim Paths Offset 0 → 360°, `loopOut()`).
- Icon: file minh hoạ (nền trắng, tô đặc) qua chuỗi Find Edges (invert) → Levels (25/90) → Minimax 2 px → Tint đen→xanh ngọc `#55f2ff` → chế độ Screen → 2 lớp glow (xanh ngọc, tím). Kết quả là nét neon như preset.
- Đặt vào MAIN: bay lên 260 px trong 15 khung, scale 60 → 100%, motion blur. Vị trí chuẩn [540, 1460] (trên mic, dưới phụ đề).
- Hook mở đầu: 3 tile scale 72% xếp trên đầu ([200, 310] xoay −12°, [540, 250], [880, 310] xoay 12°), vào lệch nhau 0,15 s.
- Mỗi tile kèm 1–2 vòng nổ (`T.burst`) và SFX ping hoặc pop.

### A8. Vòng nổ (`T.burst`)
Vòng tròn trắng viền 6 px, đường kính 45–70, scale 60 → 190% và tắt trong 0,4 s. Rắc quanh tile hoặc logo, mỗi chỗ 1–2 vòng.

### A9. Hàng logo trên thanh kính (`T.logoBar`)
- Thanh 940×300 bo góc 60, nền trắng 16%. Logo cao 215 px, logo chính ở giữa 270 px và nằm trên cùng.
- Cả hàng trượt từ phải vào trong 0,3 s, rồi trôi chậm 30 px. Đặt ở y 1300.
- Dùng khi người nói liệt kê ("dù bạn dùng phần mềm nào"). Kèm riser.

### A10. B-roll thẻ 3D (`T.brollCard`)
- Thay mặt người 2–3 s. Nền xám tối có noise và vignette.
- Nửa trên: clip trong thẻ bo góc 880×740 (Track Matte Alpha), xoay 3D nhẹ (X 6°, Y −6°, Z −2°), scale 85 → 106 → 110%.
- Nửa dưới (tuỳ chọn): clip thứ hai 3D nghiêng (X 8°, Y −6°, Z −3°), phóng to khoảng 150% quanh vùng cần xem (`bottomAnchor`).
- Có camera trong comp. **Thẻ phải có z = −250** (gần camera hơn), nếu không lớp nghiêng phía dưới sẽ che thẻ.
- Meme có cảm xúc đổi (khóc → cười): chọn `topStart` để lúc đổi cảm xúc rơi vào giữa đoạn, kèm SFX.

### A11. Nền vòng tròn sau người (`T.ringsBg`)
- Thay nền phía sau người (người vẫn đứng trước nhờ matte) cho đoạn kết.
- Gradient radial `#232c52` → `#04050b`. Hai vòng trắng (đường kính 1150 và 900, opacity 70 và 35).
- Icon trắng (Find Edges) và chấm bánh răng quay quanh tâm: 0 → 38° suốt đoạn.
- Hai vệt sáng trắng mờ ở góc trên. Vào bằng một chớp trắng 4 khung và scale 125 → 100%. Kèm SFX gears + riser.

### A12. Light leak (`T.leaks`)
- Footage leak chế độ **Screen**, opacity 75%, dài 0,45 s, phủ đầy khung. Đặt ở chỗ chuyển ý hoặc khi tile/từ khoá vào.
- **Chọn đúng đoạn trong file leak.** File tổng hợp thường lẫn nhiễu, glitch, loé đỏ (bản v1 đã dính lỗi này). Cách chọn ở knowledge/06.

### A13. Glow giữ màu (`T.glow`)
Thay hoàn toàn effect Glow: 2 Drop Shadow cùng màu, distance 0, softness `rad` và `rad × 3`, opacity theo `inten`. Lý do ở knowledge/07.

---

## B. Callaway (HD2), chưa dựng thử

- **Nền tối gradient mềm**: solid xanh đen; 2–3 hình elip xanh/tím qua Gaussian Blur 300–600 (tắt Repeat Edge Pixels). Muốn chuyển động thì đổi elip thành path, thêm Wiggle Paths (points Smooth, 0,4–0,5 lần/giây). Thêm adjustment Noise 10%.
- **Tiêu đề + đường dẫn + viên thuốc chữ**:
  - Tiêu đề Montserrat Bold, glow mềm (bán kính lớn, intensity 0,4–0,7).
  - Đường dẫn vẽ bằng Trim Paths End 0 → 100.
  - Viên thuốc: rounded rect, fill radial gradient xanh → tím, viền 5–10 px. Bản sao `PILL_Lit` có viền sáng, opacity 0 → 100 **đúng lúc đầu đường chạm tới viên**.
  - Đổi kích thước bằng Size, không bằng Scale.
  - Một null `NULL_Mover` trượt cả cụm xuống.
- **Danh sách gạch đầu dòng**: chỉ dùng khi người nói liệt kê.
  - Đầu dòng tam giác: scale 0 → 100, xoay 45–90° → 0 trong khoảng 20 khung.
  - Chữ dùng Text Animator: Position + Opacity, Range theo Words, Ramp Up, Offset −100 → 100.
  - Các dòng vào lệch nhau.
- **Chia màn**: A-roll trượt sang trái, danh sách trượt vào từ phải, ease khoảng 1 s, bật motion blur.
- **Thẻ kính HUD sau lưng người**:
  - Thẻ: rounded rect gradient, viền 4 px, opacity 80–90%. Hiệu ứng Inner Glow kiểu Layer Style chưa thử qua script; thay bằng một viền mờ bên trong.
  - Icon tô tím, opacity 70%.
  - Số đếm: Slider kèm expression đổi số thành chữ (`H.counter`).
  - Thẻ là cha của mọi phần tử; một bản sao thẻ làm matte cho chữ. Scale 0 → 100, xoay 3D nhẹ, rồi đi ra sau lưng người.

## C. Minimal premium (HD-CL), chưa dựng thử

- Bảng màu: trắng giấy, đen than, một màu nhấn xanh cobalt `#1F3FE0`–`#2D5BFF`. Font Inter (sans) + Playfair Display Italic (serif, cho từ đặc biệt).
- **Chữ điện ảnh**:
  - Mỗi dòng tối đa 5 từ. 1–2 từ quan trọng nhất to và đậm ở giữa; các từ còn lại cỡ 25–35%, chèn ở trên hoặc dưới.
  - Vào bằng blur 20 + opacity + y +20, Offset −100 → 100 trong 6–8 khung. Ra: opacity 3–4 khung, blur 0 → 15.
- **Mười loại cảnh**:
  1. Phụ đề trên A-roll.
  2. B-roll + chữ: texture giấy 15–25%, vignette, nhoè mép.
  3. Tranh cổ + chữ: texture phải đi cùng chuyển động; vào bằng camera trượt nhanh có directional blur 4–6 khung.
  4. Đường + chữ: đường cobalt dày 20–30 px, Trim Paths, camera bám đầu đường.
  5. Đường + minh hoạ.
  6. Chữ trung tâm trong ngoặc kép.
  7. Minh hoạ trung tâm mép thô: Roughen Edges + Turbulent Displace.
  8. Minh hoạ một bên, chữ bên kia.
  9. Vật thể (ảnh cũ) + chữ.
  10. Biểu đồ: lưới trắng mảnh, chấm xanh làm đầu đường; mỗi lần người nói lặp từ ("up and up") thì đường leo thêm một bậc **đúng mốc**.
- Bảng từng giây của video mẫu HD-CL (60 s, Arthur Brooks): xem `knowledge/nguon/talking-head-ae-layer.md` mục 7.

## D. Đổi kỹ thuật DaVinci (HD1) sang AE

| HD1 (Resolve/Fusion) | AE |
|---|---|
| Subtitle from audio, 1 từ mỗi dòng | transcript từng từ → `T.captions` |
| Chữ hook dày, viền trắng mảnh + Soft Glow | text stroke + `T.glow` |
| Chữ bật: Y thấp → đích trong 15 khung, ease Out Cubic; opacity trong 10 khung | `H.anim` 'snap' |
| Magic Mask → chữ sau lưng | `tools/matte.py` + Track Matte Luma (A1, A2) |
| Gradient + light sweep chạy qua chữ | `T.grad` + CC Light Sweep (`H.sweep`) |
| Icon bay lên từ sau lưng, xoay nhẹ, lệch nhau 3 khung | `T.placeTile` + `T.behind` |
| Zoom giật: adjustment, scale 2 → 1 trong 10 khung, motion blur | key `CAM` (HOLD) hoặc scale 200 → 100 ease (ra ~0, vào ~90) |
| Magic Zoom chậm 1,0 → 1,1 suốt câu | key scale tuyến tính |
| Light leak blend Add, opacity ~50% | `T.leaks` (Screen) |
| Chữ nhấp nháy 5 khung đầu | 6 key opacity HOLD |
| 3 vòng tròn nở | `T.burst` |
| Logo app bay từ phải, xoay −360°, ease Out Back | `H.pop` (vượt rồi về) |
| Glitch ngắn nhấn logo | adjustment: Wave Warp + tách kênh RGB, 4–6 khung |
| Icon bay vào đúng chỗ logo (chuyển khớp vị trí) | key icon tới toạ độ logo, scale → 0 đúng khung logo xuất hiện |
| Meme: crop, freeze, DVE 3D xoay nhẹ + zoom vào mặt | `T.brollCard` |
