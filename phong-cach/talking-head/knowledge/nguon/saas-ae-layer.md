# Làm layer SaaS animation trong After Effects qua MCP

Rút ra từ 2 video hướng dẫn và 1 video mẫu trong `Downloads/sass`:

- **HD1** (23:20, tiếng Anh): nền SaaS (3 kiểu), số đếm phần trăm 3D, lưới kính 12 ô có video, quảng cáo ChatGPT kiểu "motion explainer" (thanh tìm kiếm, gõ chữ, thẻ trả lời, ảnh hiện ra).
- **HD2** (21:56, tiếng Anh, kênh Ultimate Editors): trailer 3 cảnh — chữ pop-up + icon, 2 thẻ kính UI bật từ 2 bên + chuyển cảnh vòng tròn "2026", màn khoá học có con trỏ 3D và camera.
- **Mẫu** (20 giây): quảng cáo "NeuraFlow", tông xanh dương tối.

Tài liệu này để Claude dựng trong AE qua MCP **theo cách một editor làm**: keyframe, layer có tên, precomp theo cảnh. Mục 1 là luật bắt buộc, mục 2–4 là công thức có thông số, mục 5 là bảng phân tích video mẫu.

---

## 1. Luật khi dựng qua MCP

### 1.1 Dễ sửa tay là ưu tiên số một
1. **Chuyển động bằng keyframe, không bằng expression.** Expression chỉ dùng cho chuyển động lặp vô tận không cần chỉnh nhịp: `time*80` trên Evolution của Turbulent Displace (HD1), `wiggle` nhẹ. Không viết expression điều khiển vị trí, scale, opacity của các cảnh.
2. **Mỗi cảnh một precomp** đặt tên `S01_<tên>`, `S02_<tên>`… và comp `MAIN` ghép các cảnh. Nền dùng chung để riêng `ENV_<tên>`.
3. **Đặt tên mọi layer** theo vai trò: `BG_Gradient`, `UI_Window`, `UI_Window_Glass`, `TXT_Title`, `ICON_Arrow`, `NULL_Group`, `CAM_Push`, `ADJ_Blur`, `SFX_Whoosh_01`. Không để mặc định "Shape Layer 14".
4. **Tô màu label theo nhóm** (HD1 làm vậy): nhóm thanh tìm kiếm tím, nút tròn cam, chấm đang gõ aqua… Cùng một nhóm thì cùng màu.
5. **Gom chuyển động bằng Null:** các layer của một khối UI parent vào `NULL_<khối>`, rồi animate null. Hai video đều di chuyển cả cụm chữ bằng null.
6. **Thư mục project:** `00_MAIN`, `01_ENV`, `02_SCENES`, `03_UI`, `04_SFX`, `05_MUSIC`, `06_ASSETS`.
7. **Cắt layer gọn:** layer hết vai trò thì trim out ngay sau keyframe opacity 0. Layer không cần nữa (ảnh template để đồ) thì xoá.

### 1.2 Nhịp chuyển động (easing)
Hai video dùng 4 kiểu ease. Đây là cách đặt bằng script (`KeyframeEase(speed, influence)`):

| Cách gọi trong video | Ý nghĩa | Đặt ở keyframe đầu (out) | Đặt ở keyframe cuối (in) |
|---|---|---|---|
| Easy Ease | chậm – nhanh – chậm | influence 33 | influence 33 |
| "start slow, end slow" (speed graph) | ease mềm hơn | influence 75–85 | influence 75–85 |
| "start fast, end slow" / "fast ease-in" | lao vào rồi phanh — **kiểu chính của SaaS** | influence 5–15 | influence 85–95 |
| "start slow, end fast" | tăng tốc ra khỏi khung, dùng cho chuyển cảnh scale lấp màn | influence 85–95 | influence 5–15 |

- UI và chữ đi vào: **start fast, end slow**. Không bounce cho khung cửa sổ lớn.
- Phần tử nhỏ (icon, chip, nhãn 2.0, mũi tên) mới được **bounce/overshoot**. Hai video dùng plugin *Bounce it* (Motion Tools). Qua MCP không có plugin thì làm bằng keyframe: thêm 1 keyframe vượt 8–12% sau 4–6 frame, rồi 1 keyframe về đích sau 4–6 frame nữa.
- **So le (stagger) 2–3 frame** giữa các layer cùng nhóm. HD1 offset 3 frame cho 12 ô kính, HD2 "delay the layers" ở mọi nhóm.
- Chuyển động camera: vị trí đầu–cuối, ease "start slow end slow", tốc độ thấp. Camera chỉ trôi nhẹ, không lệch bố cục.

### 1.3 Thứ tự làm một cảnh
Nền → khối chính (khung/thẻ) → chữ → icon → kính/ánh sáng → chuyển động → stagger → camera → chuyển cảnh → kiểm tra bằng ảnh chụp frame (nút **Chụp** của panel MCP). Làm xong **từng cảnh rồi chụp kiểm tra**, không dựng hết 10 cảnh rồi mới xem.

### 1.4 Hiệu ứng hay dùng
Tên trong AE, kèm matchName để gọi bằng script. matchName nên kiểm tra lại một lần bằng *Self test* của panel trên máy.

| Hiệu ứng | matchName | Dùng để |
|---|---|---|
| Fast Box Blur | `ADBE Box Blur2` | làm mềm hình nền, làm kính |
| Gaussian Blur | `ADBE Gaussian Blur 2` | nhoè nền, chuyển cảnh blur |
| Wave Warp | `ADBE Wave Warp` | nền gợn sóng |
| Turbulent Displace | `ADBE Turbulent Displace` | bẻ hình mềm, nền chuyển động |
| Warp | `ADBE WRPMESH` | uốn cong (Arc) |
| Transform | `ADBE Geometry2` | scale trong adjustment layer → hiệu ứng kính khúc xạ, lật ngang (scale width −100) |
| Gradient Ramp | `ADBE Ramp` | nền, tô chữ |
| 4-Color Gradient | `ADBE 4ColorGradient` | chữ/khung nhiều màu, ánh màu |
| Tint | `ADBE Tint` | nền đen → trắng khi chuyển cảnh |
| Hue/Saturation | `ADBE HUE SATURATION` | đổi màu bản sao |
| Linear Wipe | `ADBE Linear Wipe` | dải gradient hiện dần |
| Displacement Map | `ADBE Displacement Map` | méo kính |
| Brightness & Contrast | `ADBE Brightness & Contrast 2` | làm tối phần sau kính |
| Drop Shadow | `ADBE Drop Shadow` | bóng thẻ, con trỏ |
| CC Light Sweep | `CC Light Sweep` | vệt sáng viền chữ/icon |
| Roughen Edges | `ADBE Roughen Edges` | bo góc ảnh chụp màn hình |
| Glow / Deep Glow | `ADBE Glo2` / plugin Deep Glow | phát sáng |

Plugin của bên thứ ba trong video: Bounce it, Deep Glow, Chromatic Aberration, Counter (đếm số), preset typewriter và preset "bouncing text". Khi dựng qua MCP, ưu tiên hiệu ứng có sẵn của AE. Chỉ dùng plugin khi máy đã cài và ghi chú lại trong báo cáo.

### 1.5 Thuộc tính layer cần đặt bằng script
- Adjustment layer: `layer.adjustmentLayer = true`
- Track matte (AE 2023+): `layer.setTrackMatte(matteLayer, TrackMatteType.ALPHA)`. Đảo matte thì dùng `ALPHA_INVERTED`.
- Collapse transformations (để thấy lớp kính bên trong precomp): `layer.collapseTransformation = true`
- 3D: `layer.threeDLayer = true`
- Parent: `layer.parent = nullLayer`
- Blending mode: `layer.blendingMode = BlendingMode.SCREEN` (hoặc `OVERLAY`, `DARKEN`)
- Precompose: `comp.layers.precompose([i, j, k], "S03_Card_01", true)`
- Label: `layer.label = 1..16`
- Layer Styles (Bevel & Emboss, Inner Glow): bật bằng menu command, rồi chỉnh trong `ADBE Layer Styles`. Nếu MCP không bật được thì thay bằng Inner Shadow giả: một bản sao stroke trắng + blur.

---

## 2. Công thức nền SaaS (HD1, HD2)

Ý chính: **một hình đơn giản + 3 hiệu ứng** (Fast Box Blur, Turbulent Displace, Wave Warp). Hình càng lạ thì nền càng đẹp.

**Nền 1 – ngôi sao xanh** (comp 1920×1080)
1. Shape ngôi sao giữa khung, anchor ở tâm. Fill = linear gradient các tông xanh, kéo 2 điểm màu ra hai mép cho mềm.
2. Rotation: keyframe 0° ở đầu layer, 360° ở cuối, Easy Ease.
3. Fast Box Blur: radius 80.
4. Wave Warp #1: type Circle, height 290, width 500, direction 135°, speed 0.1.
5. Wave Warp #2 (nhân bản #1): type Sine, height 115, direction 280°.

**Nền 2 – vệt cong**
1. Đường thẳng bằng pen, stroke 220 px, gradient màu tuỳ chọn.
2. Fast Box Blur radius 150. Wave Warp: height 300, width 300, type Circle, speed 0.1.
3. Rotation 200°, tách scale X/Y rồi thu nhỏ.
4. Warp: style Arc, axis Vertical, bend 75, horizontal distortion −100.

**Nền 3 – vệt hồng/đỏ/cam**
1. Đường stroke 220 px, gradient hồng → đỏ → cam. Taper: start length 50%.
2. Anchor ở mép phải. Rotation 30° ở đầu, −30° ở cuối.
3. Turbulent Displace: amount 84, size 300, Evolution = expression `time*80`.
4. Fast Box Blur 120. Scale 50%, tách scale và giảm X.
5. Wave Warp: height 115, width 500, speed 0.1.

**Nền sáng (HD2)**
1. Solid + Gradient Ramp: trên trắng, dưới xám rất nhạt.
2. 3 shape layer vẽ bằng pen, không stroke, tím nhạt / tím nhạt hơn / tím đậm. Precompose lại.
3. Gaussian Blur 350, opacity 50%.
4. Nhân bản precomp → Transform scale width −100 (lật sang phía kia) → Hue/Saturation đổi master hue → opacity 30%.
5. Turbulent Displace trên cả hai, keyframe Evolution 0 → 4 suốt cảnh (bản trên lệch keyframe để hai lớp không trùng nhịp).

---

## 3. Các khối dựng sẵn

### 3.1 Chữ pop-up từng từ (HD2)
1. Text layer, font Medium.
2. Animate → Position (đẩy chữ xuống). Advanced: Based on = Words, Shape = Ramp Up, Units = Index. Keyframe End: đầu = 0, sau ~10 frame = 5.
3. Add property: Blur 10, Opacity 30, Fill Color RGB = màu nhấn (tím).
4. Mỗi từ quan trọng một layer riêng, delay vài frame. Parent tất cả vào `NULL_Text`. Null trượt sang trái 2 nhịp, mỗi nhịp ease "start slow end slow". Nhịp 2 nhường chỗ cho icon/nhãn mới.

### 3.2 Icon app trong khung bo góc (HD2)
1. Rectangle trắng, roundness 60, scale 80. Logo track matte vào rectangle.
2. Bản sao rectangle phía dưới: tắt fill, stroke trắng dày → viền. Drop Shadow viền: distance 17, softness 40, opacity 25. Drop Shadow khung: distance 20, softness 20, opacity 15.
3. Logo: Inner Glow trắng, size 90, opacity 21.
4. Vào cảnh: keyframe position (từ dưới lên), scale (từ nhỏ), rotation (từ nghiêng) rồi bounce cả ba.

### 3.3 Nhãn viên thuốc "2.0" + sóng vòng (HD2)
1. Chữ font Heavy, Gradient Ramp tím đậm → tím nhạt.
2. Hình vuông roundness max, 4-Color Gradient (trắng + tím nhạt, blend 25) nằm dưới chữ.
3. Scale 0 → 100, rotation −14 → 0, bounce.
4. Nhân bản viên 4 lần, mỗi lần to hơn và nhạt hơn (hồng nhạt → trắng). Scale ease "start fast end slow", delay từng lớp → sóng vòng lan ra.
5. Chuyển cảnh: viên ngoài cùng scale lấp màn hình ("start slow end fast"), chữ 2.0 scale 100 → 110 → 0.

### 3.4 Thẻ kính (glassmorphism) — dùng nhiều nhất
Theo HD1 (thanh tìm kiếm, 12 ô):
1. Rectangle bo góc (roundness 500 nếu là thanh dài).
2. Chuyển thành **adjustment layer** → Fast Box Blur 100 (thẻ nhỏ: 20) → Transform scale 160 (ô nhỏ: blur 5, scale 120). Đây là kính: làm mờ và phóng to thứ nằm phía sau.
3. Bản sao phía trên: tắt adjustment, xoá effect, tắt fill, **stroke trắng 1 px** → viền kính.

Theo HD2 (thẻ UI kính):
1. Shape placeholder, fill đen, Inner Glow trắng size lớn.
2. Adjustment layer track matte vào placeholder: Gaussian Blur 100 → Brightness giảm → Displacement Map (map = placeholder, ngang 30, dọc −30) → Transform scale 120 (đặt trên Displacement Map).
3. Icon và chữ phía sau cũng track matte vào placeholder → nhìn xuyên qua kính bị méo.
4. Chữ chính có CC Light Sweep (intensity 0, edge thickness 3, edge intensity 75) + Deep Glow (luminance, threshold 82, exposure 0.5).
5. Bóng chữ: bản sao chữ, xoá sweep/glow, Gradient Ramp, opacity 25%, track matte.

### 3.5 Lưới thẻ có video (HD1)
1. Ảnh template để đồ, vẽ rectangle khớp từng ô, xoá template.
2. Tất cả thành 3D, keyframe position từ xa tới (fast ease-in).
3. Video đặt trên từng ô, **track matte + parent** vào ô, bật 3D. Có 12 ô nhưng chỉ 4 video thì cắt mỗi video thành 3 đoạn khác nhau.
4. Mỗi ô một bản sao to hơn chút làm adjustment (blur 5, transform 120) → lớp kính dưới ô.
5. Precompose mỗi ô (3 layer) thành một comp, **bật collapse transformations**, bật 3D, offset 3 frame giữa các ô.
6. Adjustment toàn cảnh: blur 5 + Chromatic Aberration 50 + mask tròn đảo ngược, feather 330 → mép khung nhoè, tâm nét.

### 3.6 Thanh chat / tìm kiếm có gõ chữ (HD1)
1. Thanh kính như 3.4. Scale 100 → 230% trong 20 frame và đưa lên giữa → giữ 2 giây trượt nhẹ → co về 90%. Fast ease-in.
2. Nút tròn góc phải: vòng stroke 1 px + bản sao kính, parent vào thanh.
3. Mũi tên gửi: hạ xuống 5 frame → bay lên ra khỏi nút. Bản sao mũi tên từ dưới bay vào lại tâm trong 7 frame, bounce. Hai mũi tên track matte vào hình tròn để biến mất khi ra khỏi nút.
4. Ánh màu khi bấm: bản sao hình tròn + 4-Color Gradient (đen, xanh đậm, đen, đen), keyframe điểm xanh trượt lên trong 10 frame, opacity 0 → 100 → 0, **blend mode Screen**.
5. Ánh màu cho cả thanh: solid nhiều màu (đen, xanh, cam, vàng) + glow, track matte vào bản sao thanh, scale từ nhỏ lên bằng thanh, opacity 0 → 100 → 0, Screen.
6. Chữ gõ: font Inter Regular, trắng, preset typewriter. Thêm Animator Fill Color cam nhạt, keyframe Start 0 → 100 chạy sau chữ 3 frame → chữ vừa gõ sáng cam rồi về trắng.
7. Thẻ trả lời: thẻ kính nhỏ (blur 20) trượt từ dưới lên, chữ typewriter 1,5 giây, 2 dòng đều.
8. Chấm "đang suy nghĩ": 3 hình tròn, nhảy lên-xuống 3 lần (bounce), lệch 3 frame. Tắt opacity đúng lúc thẻ đổi hình.
9. Ảnh kết quả: thẻ giãn từ mép trái (anchor ở góc trái), scale 300% + đổi size. Ảnh track matte vào bản sao thẻ.

### 3.7 Số đếm phần trăm 3D (HD1)
1. Text "0" font Inter Bold, scale 250%, Y 114. Đếm 0 → 99 → 0 (Slider keyframe → sourceText. Đây là chỗ được dùng expression vì chỉ đổi số thành chữ, nhịp vẫn nằm ở keyframe).
2. Bevel & Emboss: size 7, highlight 50%, shadow 50%, depth 250%, blend mode Overlay. Cần solid đen phía dưới mới thấy.
3. Bản sao dưới làm adjustment: blur 10 + transform 120. Bản sao nữa: tắt fill, stroke trắng 18 px.
4. Camera 2 đoạn: đoạn 1 lùi + nghiêng, đoạn 2 trôi ngang, nối đồ thị thành một đường mượt.
5. Chuyển cảnh: adjustment blur 0 → 30 → 0 trong 10 frame quanh điểm cắt. Solid nền Tint đen → trắng trong 5 frame.

### 3.8 Con trỏ 3D và màn hình khoá học (HD2)
1. Ảnh chụp màn hình nhân bản 10 lần, mỗi bản mask một mảnh (thanh trên, từng thẻ). Roughen Edges (sharpness 10, border 20, fractal influence thấp) để bo góc.
2. Màu nền lấy bằng eyedropper từ ảnh. Mảng mờ phía sau opacity 10%.
3. Thẻ: position từ dưới + scale từ nhỏ, bounce. Thanh trên từ trên xuống. Opacity 0 → 100. Delay từng thẻ.
4. Tất cả 3D. Con trỏ: Gradient Ramp xám nhạt, Drop Shadow opacity 100, distance 11, xám đậm. 3D, rotation Y 4, X −7, đặt Z gần camera.
5. Con trỏ animate bằng keyframe riêng **và** một null 3D cha (hai lớp chuyển động chồng nhau, cùng ease "start slow end slow").
6. Hover: thẻ con trỏ đi qua scale lên rồi về, kèm Y orientation nghiêng nhẹ.
7. Camera một nút, cắt 2 đoạn: đoạn 1 từ dưới lên, đoạn 2 trôi từ trái sang phải. Z gần UI.

### 3.9 Chuyển cảnh vòng tròn lộ chữ (HD2)
1. Chữ "2026" font Black ở giữa.
2. Hình tròn gradient tím scale 0 → lấp màn ("start slow end fast"), track matte vào chữ.
3. Nhân bản 4 vòng, mỗi vòng delay và nhạt dần đến trắng. Vòng trắng cuối giữ lâu thành nền cảnh sau.
4. Ra cảnh: shape trắng phía trên + track matte đảo (inverted) → chữ bị "khoét" mất, Gaussian Blur 130.

---

## 4. Bảng màu và chữ

- Font: **Inter** (Regular cho câu dài, Bold/Black cho số và tiêu đề), hoặc Medium/Heavy như HD2.
- Hai hệ màu trong video:
  - **Tối**: nền đen/xanh đen, nhấn xanh dương điện (#2F6BFF đến #7FB0FF), cột sáng từ trên, vòng chân trời phát sáng. Video mẫu dùng hệ này.
  - **Sáng**: trắng + tím/hồng/xanh pastel, kính mờ, bóng rất nhẹ (opacity 7–25%). HD2 dùng hệ này.
- Phát sáng nhuộm theo màu thương hiệu, không dùng glow trắng gắt.

---

## 5. Phân tích video mẫu NeuraFlow (20 giây)

1920×1080, 30 fps, 20,15 giây, watermark "zellos" góc trên trái. Xem ở 5 khung/giây.

**Phong cách chung:** nền đen xanh, **cột sáng xanh rọi từ trên xuống**, **vòng chân trời phát sáng** (mép một "hành tinh" tối ở đáy khung), bụi sao li ti, lưới mảnh mờ. Chữ và UI hiện bằng **blur + fade**, không cắt cứng: mọi chỗ nối đều là chuyển động camera, morph hoặc một vòng sáng. Tông xanh dương xuyên suốt, chỉ có màu tím/hồng ở đoạn ngôi sao 16,2–17,4 giây.

**Nhạc:** khoảng **117,5 BPM** (1 phách = 0,51 giây), nhạc nền đều suốt video, fade ra từ 19 giây. Tiếng nhấn mạnh rơi đều mỗi 2 phách (~1,02 giây): 0,98 · 3,02 · 4,04 · 5,06 · 7,08 · 8,10 · 9,13 · 11,15 · 12,17 · 13,19 · 15,21 · 16,16. **Mọi lần đổi cảnh đều đặt đúng trên các tiếng nhấn này.** Tiếng cao (whoosh/lấp lánh) ở 2,00 · 7,99 · 9,89 · 10,91 · 11,66 · 17,44.

| Giây | Cảnh | Layer cần có | Chuyển động chi tiết |
|---|---|---|---|
| 0,0–0,8 | Logo | `ICON_Star`, `TXT_Wordmark`, `ENV_Beam_Top`, `ENV_Horizon` | wordmark từ mờ tối sáng lên (blur → nét); ngôi sao xoay khoảng 45° về thẳng trong 0,4 giây; cột sáng và vòng chân trời sáng dần |
| 0,8–1,2 | Logo nhường chỗ | — | logo trượt xuống và chìm sau mép trên cửa sổ đang dâng lên |
| 1,0–1,6 | Cửa sổ dâng | `UI_Window` (to, mép dưới bị khung cắt) | cửa sổ dâng từ đáy lên, lao nhanh rồi phanh (fast ease-in), đặt trên tiếng nhấn 0,98 |
| 1,2–1,6 | Tiêu đề | `TXT_Title` "Smart Control", `TXT_Sub` "Customized Dashboard", `ICON_Orb` + 2 vạch ngang | chấm sáng xuất hiện, 2 vạch kéo dài ra hai bên, chữ blur → nét; dòng phụ có vệt sáng quét qua |
| 1,4–2,0 | Thẻ phụ | `CHIP_Calendar`, `CHIP_Chat` (trái), `CARD_Search` (phải) | chip trái bật ra từ mép trái cửa sổ, thẻ phải bật ra từ mép phải; so le 0,2–0,4 giây |
| 1,6–3,8 | Dashboard chạy | `UI_Progress` (vòng + số %) và nội dung trong cửa sổ | nội dung hiện dần; số đếm 50 → 61 → 69 → 76 → 81 → 85 → 89 → 91 → 93% (chậm dần); cả cụm trôi rất chậm |
| 3,8–4,8 | Zoom out | `UI_Window` 3D, các panel phụ mờ xung quanh, `TXT_Wordmark_BG` khổng lồ | camera lùi mạnh trên tiếng nhấn 4,04: cửa sổ thu nhỏ, lơ lửng giữa các panel bị blur; chữ "NeuraFlow" khổng lồ trượt từ trên xuống, nằm sau cửa sổ |
| 5,0–6,0 | Đổi nội dung | nội dung cửa sổ v2: thẻ "Documents", biểu đồ cột, biểu đồ vùng | nội dung cũ xoá đi (5,0–5,2), nội dung mới hiện từ trên xuống, cột biểu đồ mọc lên (5,4–6,0); nút tròn sáng xuất hiện góc phải dưới (5,8) |
| 6,0–6,9 | Trôi | — | camera trôi rất chậm, chuẩn bị chuyển cảnh |
| 7,0 | Chuyển cảnh | `RING_Glass` | màn tối, một vòng kính phát sáng hiện giữa khung, đúng tiếng nhấn 7,08 |
| 7,2–8,0 | "New Updates" | `TXT_New`, `TXT_Updates`, 2 vòng quỹ đạo, 5–6 `BUBBLE_Icon` (bút, tài liệu, biểu đồ, ngôi sao, thư mục, dấu tick) | "New" blur → nét, rồi "Updates" hiện dưới; vòng quỹ đạo vẽ ra; bong bóng bay từ mép khung vào quỹ đạo |
| 8,0–9,0 | Quỹ đạo | — | bong bóng quay theo chiều kim đồng hồ quanh tâm, camera lùi nhẹ |
| 9,1–9,7 | Gõ câu hỏi | `CHAT_Input` (kính, viền sáng), `TXT_Typing` "How NeuraFlow.AI can help?", `TXT_User` "Mark Smith", `AVATAR_User` | cắt sang cảnh tối với cột sáng; chữ gõ dần có con trỏ nhấp nháy; avatar và tên người dùng hiện ở 9,4 |
| 9,8–10,2 | Gửi | `AI_Orb`, `AI_Dots`, `TXT_AI` "AI Agent" | ô nhập co lại thành bong bóng, trượt lên trên; chấm sáng xuất hiện bên phải rồi lớn thành avatar AI; "•••" nhảy |
| 10,2–11,0 | Chờ | — | AI đang nghĩ ("•••"), cả cụm trôi chậm |
| 11,0–12,0 | Trả lời | `CARD_Answer` (kính dài), 3 gạch đầu dòng, lưới mảnh nền | thẻ trả lời vẽ viền rồi đầy lên (11,0–11,2); chữ trong thẻ từ mờ thành nét từng dòng (11,4–12,0); lưới mảnh phía sau hiện dần, thẻ sáng lên |
| 12,0–13,0 | Trôi | — | camera trôi chậm |
| 13,1–13,6 | Thẻ đơn | `CARD_3D_Center` + 2 `CARD_3D_Side` | thẻ kính trống hiện giữa (có chấm nhỏ); chấm lớn thành icon (bút); 2 thẻ bên mờ hiện ra |
| 13,6–14,4 | 3 thẻ | icon trên từng thẻ | 3 thẻ dồn sát lại, icon thẻ bên sáng lên |
| 14,4–16,2 | Trụ thẻ | thẻ cong (CC Cylinder hoặc Bend) quanh một null 3D | các thẻ cong lại thành trụ tròn; camera bay vòng và nghiêng từ trên xuống; ánh tím xuất hiện từ mép dưới phải |
| 16,2–16,8 | Morph sao | `SHAPE_Star4` tím/hồng viền xanh lơ | ngôi sao 4 cánh khổng lồ bung ra sau trụ, xoay; trụ thẻ bị gói vào trong sao (sao làm matte) và thu nhỏ theo |
| 16,8–17,4 | Sao trắng | — | sao chuyển sang trắng phát sáng, thu nhỏ, xoay, trượt sang trái |
| 17,4–18,0 | Lộ logo | `ICON_Star`, `TXT_Wordmark`, `TXT_Tagline` "Discover NeuraFlow today", `ENV_Beam_Bottom`, `ENV_Horizon` | sao trắng thành icon logo; wordmark hiện từ sau sao ra (quét phải sang trái); tagline hiện dưới có vệt sáng quét qua (17,6–19,2); cột sáng giờ rọi từ chân trời lên |
| 18,0–20,0 | End card | — | giữ yên, nhạc fade ra |

Kỹ thuật từ 2 video hướng dẫn dùng cho từng cảnh mẫu:
- Cột sáng, vòng chân trời, nền: mục 2 (shape + blur + wave/turbulent), tông xanh.
- Chip/thẻ kính: mục 3.4. Bật ra: bounce như 3.2.
- Số đếm vòng tiến độ: mục 3.7 bước 1 (bỏ bevel).
- Zoom out có DOF: camera một nút + Depth of Field, hoặc adjustment blur có mask đảo như 3.5 bước 6.
- Vòng "New Updates": mục 3.9 (vòng tròn đồng tâm) + 3.3 (sóng vòng).
- Chat: mục 3.6.
- Trụ thẻ 3D: thẻ 3D + null cha xoay Y. Muốn thẻ cong thật thì dùng CC Cylinder hoặc Bend It.
- Ngôi sao morph: shape sao 4 cánh làm track matte cho precomp trụ thẻ, scale lớn → nhỏ, đổi fill tím → trắng.
- Chuyển cảnh: blur 0 → 30 → 0 như 3.7 bước 5.

**Quy tắc thời gian rút ra:** cảnh mới vào trên một tiếng nhấn (mỗi 2 phách ≈ 1,02 giây ở 117,5 BPM). Mỗi cảnh dài 2–4 tiếng nhấn. Trong cảnh, phần tử phụ so le 0,2–0,4 giây. Khi dựng lại với nhạc khác, đo BPM trước rồi đặt mốc cảnh theo bội số 2 phách.

---

## 6. Lưu ý

- HD1 cho số liệu rất cụ thể (blur 80/150/120, wave height 290/300/115, stroke 220…), có thể dùng trực tiếp. HD2 nhiều chỗ chỉ nói "like so" (kéo theo mắt). Những chỗ đó Claude phải tự chọn rồi chụp frame ra kiểm tra.
- Cả hai video đều là kênh bán khoá học, chèn quảng cáo khá dài: HD2 ở 7:10–8:24 và 16:07–16:58.
- Video mẫu có watermark "zellos": đây là tác phẩm của người khác. Chỉ dùng để học kỹ thuật, không làm lại y nguyên để giao khách.
