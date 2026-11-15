# 04 — Công thức kỹ thuật trong AE

Rút từ 2 video hướng dẫn (HD1: nền SaaS, số đếm 3D, lưới kính có video, quảng cáo ChatGPT;
HD2: trailer Ultimate Editors — chữ pop-up, kính UI, vòng tròn lộ chữ, con trỏ 3D).
HD1 cho thông số rất cụ thể — dùng thẳng. HD2 nhiều chỗ "kéo theo mắt" — tự chọn rồi chụp khung kiểm tra.

Viết bằng hàm thư viện: hình `H.r/H.c/H.path/H.star`, chữ `H.t/H.text`, hiệu ứng `H.fx(layer, matchName, {prop: value})`,
keyframe `H.anim/H.pop`. matchName của thuộc tính hiệu ứng có dạng `'<matchName hiệu ứng>-000N'` — tra bằng
đoạn dò ở `07-mcp-va-bay-loi.md` §4 nếu chưa có trong bảng dưới.

## 1. Hiệu ứng hay dùng
Tên trong AE, kèm matchName để gọi bằng script. matchName nên kiểm tra lại một lần bằng *Self test* của panel trên máy.

| Hiệu ứng | matchName | Dùng để |
|---|---|---|
| Fast Box Blur | `ADBE Box Blur2` | làm mềm hình nền, làm kính |
| Gaussian Blur | `ADBE Gaussian Blur 2` | nhoè nền, chuyển cảnh blur |
| Wave Warp | `ADBE Wave Warp` | nền gợn sóng |
| Turbulent Displace | `ADBE Turbulent Displace` | bẻ hình mềm, nền chuyển động |
| Warp | chưa dò — chạy đoạn dò ở 07 §4 trước khi dùng | uốn cong (Arc) |
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

## 1b. Thuộc tính layer đặt bằng script
- Adjustment layer: `layer.adjustmentLayer = true`
- Track matte (AE 2023+): `layer.setTrackMatte(matteLayer, TrackMatteType.ALPHA)`. Đảo matte thì dùng `ALPHA_INVERTED`.
- Collapse transformations (để thấy lớp kính bên trong precomp): `layer.collapseTransformation = true`
- 3D: `layer.threeDLayer = true`
- Parent: `layer.parent = nullLayer` — gắn khi cha chưa có keyframe, hoặc dùng `H.attach(con, cha)` (xem 07 §3)
- Blending mode: `layer.blendingMode = BlendingMode.SCREEN` (hoặc `OVERLAY`, `DARKEN`)
- Precompose: `comp.layers.precompose([i, j, k], "S03_Card_01", true)`
- Label: `layer.label = 1..16`
- Layer Styles (Bevel & Emboss, Inner Glow): bật bằng menu command, rồi chỉnh trong `ADBE Layer Styles`. Nếu MCP không bật được thì thay bằng Inner Shadow giả: một bản sao stroke trắng + blur.


Mã thuộc tính đã dò được (AE 2026):

| Hiệu ứng | Thuộc tính |
|---|---|
| `ADBE Box Blur2` | 0001 Blur Radius · 0002 Iterations · 0003 Dimensions · 0004 Repeat Edge |
| `ADBE Gaussian Blur 2` | 0001 Blurriness · 0002 Dimensions · 0003 Repeat Edge |
| `ADBE Glo2` | 0001 Based On · 0002 Threshold · 0003 Radius · 0004 Intensity · 0006 Operation · 0012/0013 Color A/B |
| `ADBE Geometry2` (Transform) | 0001 Anchor · 0002 Position · 0011 Uniform Scale · 0003 Scale Height · 0004 Scale Width · 0007 Rotation · 0008 Opacity |
| `ADBE Ramp` | 0001 Start · 0002 Start Color · 0003 End · 0004 End Color · 0005 Shape |
| `ADBE 4ColorGradient` | 0001/0003/0005/0007 Point 1–4 · 0002/0004/0006/0008 Color 1–4 · 0009 Blend |
| `ADBE Tint` | 0001 Map Black To · 0002 Map White To · 0003 Amount |
| `ADBE Fractal Noise` | 0004 Contrast · 0005 Brightness · 0010 Scale · 0015 Complexity · 0023 Evolution |
| `ADBE HUE SATURATION` | 0004 Master Hue · 0005 Master Saturation · 0006 Master Lightness (**0004 là Hue, không phải Saturation**) |
| `ADBE Brightness & Contrast 2` | 0001 Brightness · 0002 Contrast |
| `CC Light Sweep` | 0001 Center · 0002 Direction · 0004 Width · 0005 Sweep Intensity · 0006 Edge Intensity · 0007 Edge Thickness |
| `ADBE Linear Wipe` | 0001 Completion · 0002 Angle · 0003 Feather |
| `ADBE Grid` | 0002 Size From · 0004 Width · 0005 Height · 0006 Border · 0012 Color · 0013 Opacity |
| `CC Cylinder` | 0002 Radius % · 0009/0010/0011 Rotation X/Y/Z (**Radius chỉ kéo giãn ngang — không dùng để uốn phẳng→tròn**) |
| `ADBE Slider Control` | 0001 Slider |

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

## 4. Bảng màu và chữ (theo 2 video hướng dẫn — xem thêm 01-phong-cach)

- Font: **Inter** (Regular cho câu dài, Bold/Black cho số và tiêu đề), hoặc Medium/Heavy như HD2.
- Hai hệ màu trong video:
  - **Tối**: nền đen/xanh đen, nhấn xanh dương điện (#2F6BFF đến #7FB0FF), cột sáng từ trên, vòng chân trời phát sáng. Video mẫu dùng hệ này.
  - **Sáng**: trắng + tím/hồng/xanh pastel, kính mờ, bóng rất nhẹ (opacity 7–25%). HD2 dùng hệ này.
- Phát sáng nhuộm theo màu thương hiệu, không dùng glow trắng gắt.

