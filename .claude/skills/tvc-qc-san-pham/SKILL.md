---
name: tvc-qc-san-pham
description: >-
  Skill "TVC QC sản phẩm" chuyên dựng video quảng cáo sản phẩm thương mại cao cấp
  (FMCG, Mỹ phẩm, Dược phẩm, Thời trang, Tiêu dùng nhanh) trên HyperFrames (HTML +
  CSS + GSAP + SVG + WebGL Shaders). Đúc kết từ chuẩn TVC quốc tế (Unilever /
  Comfort "Thơm Xinh Cứ Bling!"): nhịp dựng Beat-Grid 0.92s, Diegetic Typography,
  3D Gold Glitter Bling Text, Specular Shimmer, chữ ký SVG Write-On, Portal
  Transitions, 3D Sensory Ingredient World và hệ thống UL/UI Brand End-Card. Kích
  hoạt khi người dùng yêu cầu làm "TVC QC sản phẩm", dựng TVC quảng cáo thương
  hiệu/sản phẩm bằng HyperFrames, hoặc thiết kế Motion Graphics/End-Card TVC.
---

# TVC QC Sản Phẩm — Hệ Quy Chuẩn Đạo Diễn & Dựng TVC Thương Mại Trên HyperFrames

Skill này biến HyperFrames (`index.html` + `compositions/*.html` + GSAP paused timelines) thành bàn dựng **TVC Quảng Cáo Sản Phẩm chuẩn Agency** (FMCG, Beauty, Dược mỹ phẩm, Thời trang). Đọc kết hợp cùng skill gốc [`hyperframes`](../hyperframes/SKILL.md) và [`hyperframes-registry`](../hyperframes-registry/SKILL.md) để đảm bảo tuân thủ 100% **12 Quy Tắc Render Contract**.

---

## 1. Cấu Trúc Kịch Bản & Nhịp Dựng Sóng (6-Act Commercial Beat-Grid)

Một TVC quảng cáo sản phẩm hiện đại (`15s`, `30s` hoặc `45s`, khung `1920×1080` `16:9` hoặc `1080×1920` `9:16`) **tuyệt đối không dàn đều thời lượng các cảnh**. Dựng trên lưới nhịp âm nhạc **Electro-Pop / Funky Upbeat `124–130 BPM`** (`1 beat ≈ 0.46s – 0.48s`):

- **Median Shot Duration**: `0.88s – 0.96s` (**đúng 2 beats / cú cắt**).
- **Nhịp Punch-In cực nhanh**: `0.48s – 0.72s` (**1 – 1.5 beats**) cho cận cảnh biểu cảm, giọt tinh chất, bước chân, lật bảng tên.
- **Nhịp Payoff / Hero Hold**: `2.20s – 2.96s` (**4 – 6 beats**) chỉ xuất hiện đúng **3–4 lần** trong toàn phim tại điểm bung hiệu ứng (Surreal Bloom, 3D Ingredient Climax, End-Card Lockup).

| Hồi (Act) | Tỷ trọng thời lượng (mốc chuẩn 45s) | Median Shot | Nhiệm vụ Thị giác & Cảm xúc |
| :--- | :--- | :--- | :--- |
| **Hồi 1: Subliminal Product + Attitude Hook** | `00.0s – 07.3s` (`~16%`) | `0.80s` | Đặt bao bì sản phẩm sắc nét ngay tiền cảnh giây `0.0s–1.4s` (Subliminal Branding) trước khi vào câu chuyện; cận cảnh thần thái + hành động cảm nhận sản phẩm + bảng chữ đạo cụ gây tò mò (`TÉM LẠI ĐI`). |
| **Hồi 2: Contrast & Surreal Visual Payoff** | `07.3s – 15.2s` (`~18%`) | `1.18s` | Đối lập bối cảnh đời thường (văn phòng/phố thị) với hào quang chủ thể (rim-light flare); lật đạo cụ chữ tạo cú twist hài hước/thông minh + bung đạo cụ siêu thực (hoa khổng lồ nở quanh vai). |
| **Hồi 3: Multi-Context Social Proof Montage** | `15.2s – 25.2s` (`~22%`) | `1.00s` | Liên hoàn `8–9 shots` đổi bối cảnh Sáng/Tối ("Dù là sáng hay tối, nơi nào đến cũng nổi"): cắt liên tục giữa góc rộng bước đi, đặc tả phụ kiện/giày, ánh nhìn ngoái lại của đám đông (Over-the-shoulder reaction). |
| **Hồi 4: Portal Transition & Studio Product Demo** | `25.2s – 32.2s` (`~16%`) | `0.80s` | Chuyển cảnh xuyên tâm vật thể (lồng máy giặt / nắp lọ / mặt gương xoay tròn) đưa thẳng vào **Brand Studio đồng bộ màu nhận diện**; đại sứ tương tác trực tiếp với bao bì & rót tinh chất lấp lánh. |
| **Hồi 5: 3D CGI Sensory / Ingredient World** | `32.2s – 36.5s` (`~10%`) | `0.84s` | Thế giới vĩ mô 3 tầng hương / thành phần (hoa nở 3D, sóng lụa, tinh cầu vàng); luôn kèm dòng **Legal Disclaimer nhỏ** góc dưới phải (`*Hình ảnh chỉ mang tính chất minh hoạ`). |
| **Hồi 6: Festive/Lifestyle Climax & End-Card Lockup** | `36.5s – 45.0s` (`~18%`) | `1.44s` | Quay lại đời thực rực rỡ đông người (Match-cut qua rèm quần áo/cánh hoa) → Chốt **End-Card `2.3s–3.0s`**: Chủ thể + Packshot lấp lánh bên trái (`45%`), cụm Logo + Slogan Bling + Chữ ký + Legal bên phải (`55%`), nhãn tập đoàn (`UL`) thả xuống từ góc trên trái. |

> Chi tiết bảng đo 41 cú cắt thực tế theo từng frame xem tại [`references/comfort-bling-benchmark.md`](./references/comfort-bling-benchmark.md).

---

## 2. Hệ Thống Typography & Cặp Phối Font Chữ (Commercial Font Pairing)

TVC sản phẩm cao cấp **cấm dùng 1 font đơn điệu từ đầu đến cuối** và **cấm rải phụ đề thoại karaoke đè lên mặt diễn viên** (trừ bản xuất riêng cho social tắt tiếng). Chữ được chia làm **5 vai trò độc lập**:

1. **Hero Slogan / Key Claim (`"Thơm xinh cứ Bling!"`) — High-Contrast Editorial Display Serif**:
   - **Đặc điểm nhận diện**: Chân chữ sắc mảnh, nét sổ dọc dày tương phản cao, dấu tiếng Việt thanh thoát, tạo cảm giác nước hoa/thời trang xa xỉ (tương đương Didone / Editorial Display Serif).
   - **Font trong HyperFrames**: Dùng font có sẵn `Playfair Display` (`700/800`) hoặc `EB Garamond` (`700`), hoặc nhúng `@font-face` (`Cormorant Garamond Bold`, `Prata`, `SVN-Gallery Modern`) trong `assets/fonts/`.
   - **Tỷ lệ kích thước**: Dòng dẫn (`Thơm xinh`, `cứ`) bằng `45% – 52%` chiều cao chữ khóa chính (`Bling!`). Từ khóa chính chiếm `9% – 13%` chiều cao khung hình.
2. **Diegetic Typography (Chữ Đạo Cụ Trong Cảnh Quay — `"TÉM LẠI ĐI"`, `"GIÁM ĐỐC"`, `"THỰC TẬP SINH"`)**:
   - **Đặc điểm**: Biến thông điệp quảng cáo thành **vật thể thật trong cảnh** (biển treo cửa kính, bảng tên tam giác trên bàn họp, tag quần áo) thay vì chèn text phẳng 2D!
   - **Font**: Geometric / Neo-Grotesque Sans-Serif IN HOA toàn bộ, nét dày dứt khoát, kerning chặt `-0.01em` đến `+0.03em` (`Montserrat 700/800`, `Outfit 700`, `Oswald 700` cho bảng hẹp).
3. **Celebrity / Founder Endorsement Block (Chữ Ký Tay + Danh Hiệu)**:
   - **Dòng tên (`Thanh Thủy`)**: Handwritten Monoline Script nghiêng `8°–12°`, nét mảnh thanh lịch — trong HyperFrames dựng bằng **`<svg><path>`** (hoặc font script qua `@font-face`) để diễn hoạt nét bút ký sống động.
   - **Dòng danh hiệu (`Miss International 2024` / `Chuyên gia Da liễu`)**: Serif thanh mảnh (`Playfair Display Regular` / `EB Garamond`), cỡ `2.2%–2.6%` chiều cao khung, tracking `+0.02em`, màu trắng tinh `#FFFFFF`.
4. **Packshot Typography (Chữ trên bao bì sản phẩm)**:
   - Giữ nguyên 100% thiết kế gốc từ file PNG/WebP tách nền của nhãn hàng (quy tắc `launch.md`: không bao giờ vẽ lại logo/bao bì bằng CSS thay cho ảnh thật).
5. **Legal Super / Regulatory Disclaimer (`*Hình ảnh chỉ mang tính chất minh hoạ`, địa chỉ nhà sản xuất)**:
   - **Font**: `Inter` hoặc `Roboto` `400/500`, cỡ `12px – 15px` (trên chuẩn `1920×1080`), `line-height: 1.25`, `opacity: 0.82`. Trên bản ngang `16:9` đặt sát mép an toàn dưới phải (`right: 3.5%; bottom: 3.2%`); **riêng trên bản dọc `9:16` (`1080×1920`) bắt buộc tuân thủ Vùng Trắng An Toàn TikTok × Reels (`safe_zone_9x16.py`)**: cấm chạm vùng đen đỉnh `Y < 250px`, đáy `Y > 1545px`, lề trái `X < 54px`, lề phải trên `X > 1024px`, và cột nút phải-dưới `X > 884px` (`Y >= 860px`) — đặt Legal Super ở `left: 58px; bottom: 380px; max-width: 820px`.

---

## 3. Animation Text & Text Effects Đặc Trưng Của TVC Quảng Cáo

Tuyệt đối tránh kiểu chữ `fade + slide-up 20px` lặp đi lặp lại trông rẻ tiền. Áp dụng đúng **4 kỹ thuật chữ thương mại** sau (mẫu code dựng sẵn nằm tại [`templates/endcard-bling-lockup.html`](./templates/endcard-bling-lockup.html)):

### A. Hiệu Ứng Chữ Vàng Kim Tuyến 3D ("3D Metallic Gold Glitter & Bevel")
- **Cấu trúc lớp (3 Layers chồng khít bằng `position: absolute` + `data-layout-allow-overlap`)**:
  1. **Lớp Đổ Bóng & Khối Nổi (Extrusion/Shadow Layer)**: `text-shadow` đa tầng tạo cạnh vát vàng đồng sẫm (`#8B5A19`, `#5E3708`) + bóng mềm màu hồng mận (`rgba(110, 12, 58, 0.48)` `0 8px 18px`) để tách chữ khỏi nền hồng rực.
  2. **Lớp Bề Mặt Kim Tuyến Vàng (Gold Champagne Gradient + Glitter Texture)**: `background: linear-gradient(180deg, #FFF7D6 0%, #F7D27A 28%, #D99B38 55%, #FFE8A3 78%, #B6761B 100%)` kết hợp họa tiết hạt kim tuyến siêu mịn bằng SVG `<feTurbulence>` + `<feSpecularLighting>` hoặc lớp pattern kim tuyến, cắt theo chữ bằng `-webkit-background-clip: text; color: transparent` và viền sáng mảnh `-webkit-text-stroke: 1.5px #FFF4CC`.
  3. **Lớp Quét Ánh Kim (Specular Light Sweep / Sheen)**: Một dải sáng trắng chéo `115deg` (`transparent 35% -> rgba(255,255,255,0.95) 50% -> transparent 65%`) chạy ngang qua mặt chữ `Bling!` từ `backgroundPositionX: "-120%"` sang `"220%"` trong `0.55s` (`ease: "power2.inOut"`).

### B. Nhịp Xuất Hiện Phân Tầng Trên End-Card (Frame-Accurate Cascade)
Đo chính xác từ chuẩn TVC (`42.72s -> 44.00s` = `32 frames @ 25fps`):
- `t + 0.00s`: Nền hồng gradient + Chủ thể cầm Packshot bung mở từ hoa mẫu đơn; dòng Legal Super hiện sẵn tinh tế ở góc dưới phải.
- `t + 0.08s`: Cụm **Logo Thương Hiệu (`Comfort`)** + **Headline (`Thơm xinh cứ Bling!`)** bung hiện mượt với `blur(8px) -> blur(0px)`, `scale: 0.94 -> 1.00`, `opacity: 0 -> 1` trong **`0.24s` (`ease: "power4.out"`)** — sau khi đáp xuống, chữ đứng **tĩnh tuyệt đối (dead still)**, chỉ có ánh kim và hạt sao chuyển động trên bề mặt!
- `t + 0.16s`: **Chữ ký tay (`Thanh Thủy`)** bắt đầu tự viết nét bút từ trái sang phải bằng **`strokeDashoffset: pathLength -> 0`** trong **`0.64s` (`ease: "power2.out"`)**.
- `t + 0.44s`: Dòng chức danh (`Miss International 2024`) hiện êm bên dưới chữ ký (`opacity: 0 -> 1`, `blur(4px) -> 0` trong `0.24s`).
- `t + 0.52s`: Nhãn **UL / Corporate Ribbon** trượt từ mép trên trái xuống + hiệu ứng xếp mảnh logo bên trong (`0.40s`, `ease: "expo.out"`).

### C. Hạt Ngôi Sao 4 Cánh Lấp Lánh ("4-Point Bling Sparkles `✦`")
- Đặt **2–4 ngôi sao 4 cánh tia dài mảnh (`SVG polygon/path`)** gắn sát chân chữ cái đầu (`B`), dấu chấm cảm (`!`) và trên góc túi sản phẩm.
- **Quy tắc HyperFrames bắt buộc**: Không bao giờ dùng `Math.random()` tự do hay `repeat: -1`. Tạo hàm băm xác định (`seededMulberry32(seed)`) và chuỗi tween hữu hạn trên `tl`: `scale: 0 -> 1.25 -> 0.85 -> 1.1 -> 0`, kết hợp xoay nhẹ `rotation: 0 -> 45` lệch pha nhau `0.08s – 0.14s` kèm SFX tiếng *Bling / Chime* trong trẻo.

### D. Chuyển Động Chữ Đạo Cụ (Diegetic Kinetic Props)
- **Biển treo lắc lư (`Pendulum Sign`)**: Đặt `transformOrigin: "50% 0%"`, dùng dao động tắt dần xác định: `rotation: 7° -> -4.5° -> 2.5° -> -1° -> 0°` (`ease: "sine.inOut"`).
- **Bảng tên lật lăng trụ 3D (`3D Prism Flip`)**: Dùng container `perspective: 900px`, xoay `rotateX: 0 -> -120deg` (hoặc `rotateY`) trong `0.48s` (`ease: "back.out(1.3)"`) để lật từ mặt trống/chức danh cũ sang chức danh mới màu hồng neon `#FF5C93`.

---

## 4. Góc Quay, Animation Của Video & Ngôn Ngữ Máy Quay

Khi điều khiển footage `<video>` / `<img>` bên trong một `.clip` trên HyperFrames, **luôn bọc media trong một `<div class="cam-rig">` không gắn thời gian** và chỉ tween `scale`, `x`, `y`, `rotation` trên `.cam-rig` (tuân thủ Rule 5 & 6 của HyperFrames):

1. **Foreground Subliminal Framing (`85mm`, `f/2.0`)**: Đặt bao bì sản phẩm nét căng ở `1/3` dưới tiền cảnh, trong khi nhân vật bước đi mờ bokeh phía hậu cảnh và phản chiếu qua gương uốn lượn (`0.0s–1.4s`).
2. **Whip-Dolly & Snap Punch-In (`0.35s – 0.50s`, `power3.out`)**: Phóng nhẹ `scale: 1.00 -> 1.09` vào gương mặt khi nhân vật nhướng mày / mỉm cười / nháy mắt (`wink`). Bật `data-motion-blur="on"` ở composition gốc để các cú trượt nhanh có vệt nhòe điện ảnh tự nhiên.
3. **Low-Angle Catwalk Tracking (`35mm`)**: Góc máy thấp ngang thắt lưng hoặc sát mặt sàn bóng phản chiếu đôi giày hồng bước đi đúng nhịp trống bass (`17.2s–18.1s`).
4. **Over-The-Shoulder (OTS) Crowd Reaction**: Tiền cảnh mờ vai/tóc người qua đường (`blur` tự nhiên từ ống kính) để làm nổi bật ánh mắt ngoái nhìn theo hương thơm của nhân vật chính.
5. **Top-Down / Through-The-Drum POV (`16mm Wide Fisheye Feel`)**: Góc nhìn từ bên trong lồng máy giặt / hộp sản phẩm nhìn ngược ra nhân vật đang xoay tròn rồi tiến sát ống kính lấy sản phẩm (`25.2s–26.6s`).
6. **180° Profile-to-Front Beauty Turn (`85mm Macro Beauty`)**: Nhân vật nghiêng góc mặt `90°` bên cạnh đóa hoa mẫu đơn viền vàng 3D rồi quay mặt trực diện cười rạng rỡ vào máy quay (`35.0s–36.5s`).

---

## 5. Hệ Thống Chuyển Cảnh Có Nguyên Nhân (Causal Transitions)

Một TVC 30–45s sử dụng **5 loại chuyển cảnh có nguyên nhân vật lý trên hình**, tuyệt đối không dùng `crossfade` mờ chồng đều hai cảnh khác bối cảnh:

1. **Object / Pillar Pass-By Wipe (Chuyển cảnh che khuất tự nhiên)**: Một cánh cửa kính, mép áo vest hồng hoặc bóng người lướt ngang che kín ống kính trong `6–8 frames` (`0.24s–0.32s`), cắt sang cảnh mới ngay lúc khung hình bị che tối đa (`03.0s`, `04.4s`, `19.9s`).
2. **Warm Anamorphic Sun-Flare Flash (Chói nắng vàng hồng)**: Ánh đèn/nắng ngược sáng bùng trắng hồng (`opacity: 0 -> 0.92 -> 0` với `mix-blend-mode: screen` trong `0.28s`, đỉnh sáng nằm đè lên vết cắt) để nối cảnh bước ra cửa sang cảnh hoa nở siêu thực (`12.3s -> 12.6s`).
3. **Circular Portal Spin Transition (Xoáy lồng tròn xuyên không gian)**: Khung tròn vành kim loại xoay `rotation: 0 -> 180deg` kèm `scale: 0.85 -> 2.60` (`ease: "power3.in"`) mở toạc khung hình từ cảnh tiệc đêm sang phòng Studio hồng (`25.2s -> 26.6s`).
4. **Liquid Pour -> Dark-to-Bloom Sensory Morph**: Từ cận cảnh dòng nước xả/tinh chất chảy lấp lánh (`31.8s`), cắt vào nền tối mờ rồi bừng sáng (`exposure/bloom ramp` `0.4s`) khi đóa hoa 3D đầu tiên bung cánh trên vai nhân vật (`32.2s -> 33.0s`).
5. **Garment / Curtain Parting Match-Cut (Rẽ màn quần áo khớp chuyển động)**: Nhân vật dùng hai tay rẽ hàng trang phục sang hai bên (`x: 0 -> ±55%`) làm lộ cảnh lễ hội lân sư rồng rực rỡ phía sau (`36.6s -> 38.4s`).

*(Mẫu code Portal Spin, Sun-Flare Flash, 3D Prism Flip và Pendulum Sign xem tại [`templates/transitions-and-diegetic-ui.html`](./templates/transitions-and-diegetic-ui.html)).*

---

## 6. Hệ Thống UL / UI, Motion Graphics & Bố Cục End-Card Chuẩn Nhãn Hàng

Trong sản xuất TVC thương mại (đặc biệt chuẩn tập đoàn FMCG như **UL — Unilever** / L'Oréal / P&G / Dược phẩm), hệ thống **UL & UI Overlays** phải tuân thủ kỷ luật:

1. **UL Corporate Endorsement Ribbon (Nhãn Bảo Chứng Tập Đoàn Góc Trên Trái)**:
   - Vị trí: Góc trên bên trái (`left: 3.4%; top: 8.5%` hoặc thả sát mép trên `top: 0 -> 8.5%`), nằm gọn trong vùng `90% Action-Safe`.
   - Hình thái: Thẻ vuông/chữ nhật nền trắng tinh `#FFFFFF` (`aspect-ratio: 1 / 1`, rộng `5.0% – 5.5%` chiều ngang khung `16:9`), bên trong là biểu tượng tập đoàn/thương hiệu mẹ màu xanh navy `#1F36C7`.
   - Chuyển động chuẩn: Thẻ trắng trượt mở từ trên xuống (`clipPath: "inset(0 0 100% 0)" -> "inset(0 0 0% 0)"` trong `0.20s`), tiếp theo các hạt vi họa tiết bên trong biểu tượng hội tụ thành chữ `U` + tên thương hiệu mẹ trong `0.36s` (`ease: "expo.out"`).
2. **Bố Cục Tỷ Lệ Vàng Trên End-Card (`45% Visual Hero / 55% Brand Claim`)**:
   - **Nửa Trái (`x: 2% – 54%`)**: Đại sứ thương hiệu bước lên từ đóa hoa mẫu đơn 3D viền nhũ vàng, tay nâng cao Packshot sản phẩm nghiêng góc `-28°` đến `-32°` tạo thế năng động; quanh bao bì có các hạt Bling lấp lánh.
   - **Nửa Phải Trên (`x: 60% – 95%, y: 9% – 58%`)**: Logo nhãn hàng đặt trên cùng (`rộng ~20% khung`) → Slogan 2 dòng (`Thơm xinh` / `cứ Bling!`) căn giữa theo trục dọc của cột phải.
   - **Nửa Phải Dưới (`x: 74% – 96%, y: 72% – 87%`)**: Chữ ký tay + Chức danh đại sứ thương hiệu.
   - **Đáy Phải (`x: 62% – 96.5%, y: 92% – 97%`)**: 2 dòng Legal Super (Tên công ty + Địa chỉ sản xuất / Số công bố).
3. **Bảng Màu Thống Trị ("Monochromatic Pink-Gold Dominance")**:
   - `70%` diện tích mọi khung hình giữ dải hồng phấn – hồng cánh sen (`#FFD6E5`, `#F78FB3`, `#E83E8C`, `#C2185B`), `20%` kem/trắng sáng (`#FFF9FB`), và `10%` điểm nhấn **Vàng Kim Champagne (`#FFD778` – `#C98A26`)** + **Xanh Navy Logo (`#0B2D78`)** để sản phẩm và chữ `Bling!` bật lên ngay lập tức.

---

## 7. Quy Trình Thực Thi Từng Bước Trên HyperFrames

Khi người dùng yêu cầu dựng mới hoặc nâng cấp một dự án theo skill **"TVC QC sản phẩm"**:

1. **Khởi tạo & Đồng bộ Tài nguyên Offline (Font Gradient Tiếng Việt + Hiệu ứng Final Cut Pro)**:
   - Khởi tạo project: `npx.cmd hyperframes init <dir> --skip-skills --skill=hyperframes` (mặc định `1920×1080 @ 30fps`, `1080×1920 @ 24fps` cho TVC kết hợp clip Google Flow `Omni 1.2`, hoặc `1080×1920 @ 30fps` cho Reels/TikTok).
   - **Đồng bộ tự động Bộ `39` Font Tiếng Việt + `6` Preset Chữ Gradient 5 điểm dừng + Hiệu ứng Final Cut Pro Offline vào dự án**:
     ```powershell
     python "d:/AI/full studio/BO_KIEN_THUC_TVC_AI_PORTABLE/05_SCRIPTS_TU_DONG_HOA/sync_resources_to_project.py" "<dir>" --with-fcp-defaults
     ```
     *(Hoặc chép lẻ bất kỳ hiệu ứng nào trong `229` gói Final Cut / Apple Liquid Glass / Blur-Focus bằng `python "d:/AI/full studio/BO_KIEN_THUC_TVC_AI_PORTABLE/03_TAI_NGUYEN_DUNG_CHUNG/fcp_hyperframes_pack/copy_fcp_effect.py" "<dir>" cinematic-zoom whip-pan vfx-liquid-glass focus-blur-resolve lt-clean-bar light-leak`).*
   - **Quy tắc Ưu tiên Số 1 Typography**: Luôn sử dụng cấu trúc **Chữ Gradient 5 điểm dừng + tách 2 lớp viền (`.grad-back` + `.grad-front` trong `gradient-text-presets.css` hoặc SVG `#...-silk-3d`) + dải quét sáng ánh kim** kết hợp các font Việt thân dày (`Fraunces Black`, `Playfair Display ExtraBold`, `Yeseva One`, `Montserrat Black`, `Be Vietnam Pro ExtraBold`, `Paytone One`, `Baloo 2 ExtraBold`).
   - Khai báo toàn bộ biến thương hiệu trên thẻ `<html>` của `index.html` (`brand_name`, `slogan_lead`, `slogan_bling`, `endorser_name`, `endorser_role`, `legal_text`, `packshot_src`, `--brand-primary`, `--brand-accent-gold`) để người dùng sửa trực tiếp trên HyperFrames desktop app.
2. **Tổ chức Sub-Compositions theo 6 Hồi**:
   - `compositions/act1-hook.html` (Subliminal Packshot + Attitude Hook + Diegetic Sign)
   - `compositions/act2-payoff.html` (3D Prism Flip + Sun-Flare + Surreal Floral Reveal)
   - `compositions/act3-montage.html` (Beat-synced Day/Night Social Proof Cuts)
   - `compositions/act4-demo.html` (Portal Vortex Transition + Brand Studio Product Demo)
   - `compositions/act5-sensory-cgi.html` (3-Note Ingredient Bloom + `*Hình ảnh chỉ mang tính chất minh hoạ`)
   - `compositions/act6-endcard.html` (Lấy trực tiếp kiến trúc từ [`templates/endcard-bling-lockup.html`](./templates/endcard-bling-lockup.html))
3. ** Mix Âm Thanh Thương Mại (`<audio id="...">`)**:
   - Nhạc nền Pop/Funky tươi sáng (`data-volume="0.32"` khi có thoại, nâng lên `"0.58"` ở đoạn Montage/Portal và chốt stinger cuối).
   - Voiceover ngắt nhịp duyên dáng (`data-volume="1.20"`, `data-fade-in="0.04"`, `data-fade-out="0.06"`).
   - Đặt SFX đúng từng hành động nhìn thấy theo chuẩn **Tactile Micro-SFX (`-9` đến `-14 dB` dưới Voice — xem `phong-cach/kobe-ai-motion-talking-head/CHUYEN-DONG-LOP-PHU-VA-SFX.md`)**: tiếng *Pop/Click* đặt `0ms` đúng frame chạm đáy (có vòng sóng chạm đất cho thẻ UI & mở nét `Blur-Focus` hai chiều `0.26s` vào / `0.20s` ra), *Airy Whoosh* đi sớm `-110ms` (`-3 frames`) trước cú trượt/Portal Spin, chuỗi hoạt chất tăng `+1 semitone` mỗi bậc, *Magic Shimmer / Crystal Bling* đúng frame chữ `Bling!` lóe sáng (`0` SFX rơi lạc vào khoảng nghỉ thoại).
4. **Kiểm định chất lượng bắt buộc (Validation)**:
   - Chạy `npx hyperframes check --json` — sửa sạch **100% lỗi lint** (đặc biệt: không tween trực tiếp trên `.clip`, dùng `gsap.fromTo`, mọi `<video>` có `muted` hoặc `data-has-audio="true"`, mọi `<audio>` có `id`, không dùng `Math.random()` không hạt giống).
   - Chạy `npx hyperframes snapshot --review` để chụp và soi trực tiếp các frame chuyển cảnh, frame chữ `Bling!` quét sáng, vị trí nhãn `UL` góc trái và chữ Legal không bị tràn vùng an toàn trước khi mở `preview` hoặc xuất MP4 (`render`).
