# Dựng talking head trong After Effects qua MCP

> Bản ghi chép gốc lúc học 3 video hướng dẫn (giữ để tra cứu). Kiến thức đã được sắp lại trong knowledge/01–10; nếu hai nơi khác nhau, tin knowledge/01–10. Đường dẫn `tools/talking-head/` ở đây tương ứng `tools/` của kit.

Rút ra từ 3 video trong `Downloads/talking head`:

- **HD-CL** "hướng dẫn làm với claude" (20:57, tiếng Anh, kênh Ultimate Editors): phong cách *minimal premium* kiểu Arthur Brooks — 10 nguyên tắc, cách dạy Claude một phong cách, quy trình raw clip → kế hoạch → dựng → sửa → âm thanh. Claude dựng bằng Remotion, ở đây ta dựng bằng AE.
- **HD2** (25:33, tiếng Anh, kênh TomsProject): 3 animation kiểu Callaway trong AE — đường dẫn + viên thuốc chữ, danh sách gạch đầu dòng, thẻ kính HUD nằm **sau lưng người nói**.
- **HD1** (50:50, tiếng Việt): quy trình edit talking head dọc trong DaVinci Resolve/Fusion — chữ hook to, chữ sau lưng người, icon bay, zoom giật, ánh sáng chuyển cảnh. Kỹ thuật được đổi sang AE ở mục 5.

Luật chung khi dựng qua MCP (đặt tên layer, keyframe thay expression, precomp theo cảnh, easing, thứ tự làm, matchName hiệu ứng) **giữ nguyên như `docs/saas-ae-layer.md` mục 1**. Tài liệu này chỉ ghi phần riêng của talking head.

---

## 1. Talking head khác SaaS ở đâu

| | SaaS | Talking head |
|---|---|---|
| Xương sống | nhạc, cắt theo phách | **lời nói**, cắt theo từ |
| Đơn vị thời gian | 2 phách ≈ 1 giây | **mốc từng từ** (ms) trong transcript |
| Nền | dựng hoàn toàn | **A-roll** (người nói) là nền, đồ hoạ đè lên hoặc thay thế vài giây |
| Việc chuẩn bị | không | cắt khoảng lặng, transcript từng từ, tách người khỏi nền |
| Điểm nhấn | chuyển cảnh | **từ khoá** được nói ra |

Hệ quả cho MCP: mọi keyframe đặt theo mốc thời gian của từ trong transcript, không đặt theo mắt.

---

## 2. Quy trình (HD-CL, đổi sang AE)

1. **Chuẩn bị clip** (ngoài AE, bằng Python/ffmpeg):
   - Transcript **từng từ, mức ms** (faster-whisper `word_timestamps=True`, đã cài trên máy).
   - **Cắt khoảng lặng, chừa 30 ms** mỗi đầu. Cắt xong chạy transcript lại để mốc khớp clip mới.
   - Màu: clip log thì áp LUT trước (HD1 dùng LUT S-Log3 → Rec709).
2. **Bảng kế hoạch** (`plan.md`): mỗi câu một dòng — lời thoại, mốc giờ, loại cảnh (mục 3), từ khoá được nhấn. Đây là bước quan trọng nhất; HD-CL nói AI tự lên kế hoạch "không đủ sáng tạo", người làm chọn cảnh.
3. **Danh sách tài sản**: tranh (Wikipedia, tranh cổ hết bản quyền), stock (Pexels), ảnh người nói, icon, font. Chỉ dùng nguồn được phép.
4. **Dựng**: phụ đề A-roll trước, rồi từng cảnh đồ hoạ. Mỗi cảnh một precomp `S##_<loại>`.
5. **Bản nháp chỉ đạt 60–70%.** Xem lại, ghi các lỗi cụ thể (chữ cảnh 1 xấu, cắt thô giữa 2 animation, texture không chạy theo chuyển động, cắt xấu ở giây 24, cảnh xoắn ốc cần giữ lâu hơn, thiếu ngoặc kép cảnh cuối) rồi sửa.
6. **Âm thanh** làm sau cùng: nhạc nền điện ảnh, *click* khi chữ hiện, *highlighter* khi vẽ biểu đồ, *whoosh* khi chuyển cảnh.

**Luật chọn A-roll hay đồ hoạ** (HD-CL):
- Mở video: giữ mặt người nói + phụ đề, để người xem kết nối trước.
- Khi người nói **giới thiệu** một ý mới → quay về mặt.
- Khi họ **mô tả / kể ví dụ** → cho xem (tranh, b-roll, biểu đồ, minh hoạ).
- Một câu có thể nửa đầu A-roll, nửa sau đồ hoạ.
- Hình ảnh đầu tiên xuất hiện phải gây tò mò (HD-CL dùng biểu đồ bậc thang ở câu thứ 2).
- Cân bằng: không 2 cảnh đồ hoạ cùng loại liền nhau.

Thời gian thực tế trong HD-CL cho 1 clip 60 giây: chuẩn bị + kế hoạch 30 phút, Claude dựng 60 phút, sửa 10 phút, âm thanh 15 phút.

---

## 3. 10 loại cảnh của phong cách minimal premium (HD-CL)

Khung 1080×1920 (dọc). Bảng màu: **trắng giấy / đen than / xanh cobalt** (#1F3FE0 – #2D5BFF) làm màu nhấn duy nhất.

### 3.0 Chữ điện ảnh — dùng ở mọi cảnh
- 2 font: **Inter** (sans) cho chữ thường, **Playfair Display Italic** (serif) cho từ đặc biệt. Bold sans hoặc bold serif cho từ khoá.
- Mỗi dòng ≤ 5 từ. Chọn **1–2 từ quan trọng nhất**: to, đậm, đặt giữa. Các từ còn lại **nhỏ (~25–35% cỡ từ khoá)** chèn vào khoảng trống phía trên hoặc dưới từ khoá, lệch trái/phải.
- Từ khoá serif có thể tô xanh cobalt. Đôi khi có ô highlight xanh sau chữ (vd "42 years").
- Chữ hiện bằng **blur → nét + fade**, từ nhỏ hiện trước từ khoá vài frame. Từ khoá có thể nhoè chuyển động khi ra.
- Phụ đề A-roll dùng đúng logic này, đặt ở ~60% chiều cao khung, dưới cằm.

Dựng trong AE:
- Mỗi cụm từ = 1 precomp `CAP_###` gồm `TXT_Small_Top`, `TXT_Key`, `TXT_Small_Bottom`.
- Mỗi text layer có Text Animator: Blur 20 + Opacity 0 + Position y +20; Range Selector based on Words, Shape Ramp Up, keyframe Offset −100 → 100 trong 6–8 frame. In: frame của từ đó trong transcript.
- Ra: opacity 100 → 0 trong 3–4 frame, blur 0 → 15.

### 3.1 Phụ đề trên A-roll
Như 3.0. Có thể đặt chữ **sau lưng người nói** (cần matte người, mục 6).

### 3.2 B-roll + chữ
- B-roll minh hoạ đúng điều đang nói, phủ kín khung.
- Texture giấy nhẹ (blend Multiply/Overlay, opacity 15–25%), **tối 4 góc** (vignette: solid đen + mask elip đảo, feather lớn), **nhoè mép** (adjustment Gaussian Blur 10–20 + mask elip đảo).
- Chữ điện ảnh mô tả cảnh, đặt cạnh chủ thể.

### 3.3 Tranh cổ + chữ
- Tranh khớp nội dung (vd "fell in love with a girl in San Diego" → tranh cặp đôi hôn nhau).
- Texture sơn + giấy thô phủ lên. **Texture phải chạy cùng chuyển động** (parent vào tranh), HD-CL phải sửa lỗi này.
- Chữ quanh chủ thể chính của tranh.
- Vào cảnh: **camera trượt vào nhanh** — position lệch 15–20% + Directional Blur mạnh ở 4–6 frame đầu, rồi phanh (fast ease-in).

### 3.4 Đường + chữ
- Nền đen hoặc trắng + texture giấy.
- **Một đường xanh cobalt** vẽ ra (Trim Paths End 0 → 100), bị chữ "cắt ngang" rồi đi tiếp sang chữ liên quan. Stroke dày (~20–30 px trên 1080 rộng), đầu tròn.
- **Camera bám theo đầu đường**: null `NULL_Cam` parent mọi thứ, keyframe để đầu đường luôn gần giữa khung.
- Ví dụ cuối video mẫu: đường cong đi qua "calling", "agility", "courage".

### 3.5 Đường + minh hoạ
- Như 3.4 nhưng đường dẫn tới hình minh hoạ.
- Đường ngang có **chấm trắng** đánh dấu vật thể, chữ mô tả, minh hoạ phía dưới.
- Đường zigzag, camera pan để lộ vật thể hai bên → dùng khi nói về **tiến trình nhiều giai đoạn**.

### 3.6 Cảnh chữ trung tâm
- Nền trắng hoặc xanh cobalt, texture giấy rất thô.
- Hai dấu ngoặc kép quanh tâm, chữ điện ảnh ở giữa. Dùng cho câu chốt cuối video.

### 3.7 Minh hoạ trung tâm
- Minh hoạ chiếm nửa dưới, loang lên giữa khung, **mép thô, sơn, nhiễu** (Roughen Edges + Turbulent Displace + texture).
- Biến thể: não nhìn từ trên, hoa văn tròn nét mảnh, **chân dung nghiêng phủ vải thô xanh cobalt** (người nói được tô xanh đơn sắc — Tint/Colorama + texture vải, nền trắng).
- Video mẫu: vòng xoắn ốc xanh vẽ ra (Trim Paths) với "spirals"; chân dung xanh có vòng tròn mảnh xoay quanh đầu, các nghề hiện quanh vòng ("circus clown", "firefighter").

### 3.8 Minh hoạ một bên + chữ bên kia
- Nhân vật/nửa hình tròn vải thô ở một mép, chữ bên kia. Dùng khi cần 2 yếu tố cùng lúc.

### 3.9 Vật thể + chữ
- Một vật (ảnh cũ, đồ vật) giữa nền giấy, chữ quanh, hiện bằng reveal thô.
- Video mẫu: ảnh cũ người nói hồi trẻ (khung trắng, hơi nghiêng), "leaving the French horn" → "becoming a scientist", ảnh thứ 2 trượt vào.

### 3.10 Biểu đồ / số liệu
- Nền tối phẳng + texture, **lưới đường trắng mảnh phát sáng** (glow nhẹ), trục có nhãn nhỏ ("CAREER", "TIME").
- **Chấm xanh** chạy làm đầu đường, camera bám theo.
- Mỗi lần người nói lặp từ ("up and up and up") đường leo thêm một bậc **đúng mốc từ đó**.
- Đường phẳng cho "slow and steady".

Dựng trong AE: đường là shape path với Trim Paths End keyframe theo mốc từng từ; `DOT_Blue` dùng expression `thisComp.layer("LINE").content(...).path.pointOnPath()` hoặc keyframe position trùng các đỉnh. Đây là chỗ được phép dùng expression (bám đường), nhịp vẫn ở keyframe Trim Paths.

---

## 4. Ba animation kiểu Callaway trong AE (HD2)

Comp 4K 25 fps. Font Montserrat (Bold cho tiêu đề, Regular/Medium cho chữ trong viên thuốc).

### 4.1 Nền tối gradient mềm
1. Solid xanh đen rất tối.
2. 2–3 elip fill xanh/tím đậm → Gaussian Blur 300–600, **tắt Repeat Edge Pixels**. Mỗi bản sao sáng hơn chút, lệch vị trí.
3. Muốn chuyển động: Convert to Bézier path, sửa thành hình blob, thêm **Wiggle Paths** (points Smooth, detail rất thấp, size lớn, **wiggles/second 0,4–0,5**) → chuyển động kiểu đèn dung nham.
4. Adjustment `ADJ_Grain`: Noise 10%, tắt Use Color Noise.

### 4.2 Tiêu đề + đường dẫn + viên thuốc chữ
1. `TXT_Title` Montserrat Bold, căn giữa. Glow: radius rất lớn, intensity 0,4–0,7 (mềm, không gắt).
2. `LINE_Guide`: shape không fill, stroke tím-xanh **giảm bão hoà**, dày vừa, copy Glow sang. Trim Paths End keyframe 0 → 100. Tiêu đề nằm **trên** đường.
3. Viên thuốc: rounded rectangle roundness tối đa, fill **radial gradient** xanh đậm → tím, kéo gradient rộng cho mềm; stroke 5–10 px tối.
   - Bản sao `PILL_Lit` ở trên, parent vào viên dưới, fill none, stroke sáng → **opacity 0 → 100 đúng lúc đầu đường chạm viên**.
   - Đổi kích thước bằng thuộc tính **Size** của rectangle, không scale ngang (chữ bị bóp méo). Đổi cả hai bản.
   - Chữ trong viên: Regular/Medium, **nhỏ, chừa khoảng thở**. Thử với từ dài nhất (vd "automation") để chốt cỡ chữ chung, không đổi cỡ từng viên.
4. `NULL_Mover` parent mọi thứ trừ nền. Viên sau hiện xong thì null trượt xuống, nhân bản cụm viên cho các từ tiếp theo. Easing mềm trong graph editor.

### 4.3 Danh sách gạch đầu dòng
- Dùng khi người nói **tóm tắt / liệt kê** ("bạn sẽ học…", "4 prompt nên dùng…"). Không chèn danh sách vào chỗ không liệt kê.
- Đầu dòng: tam giác (polygon 3 điểm, xoay 90°), fill tím nhạt, glow radius cao intensity thấp. Vào: scale 0 → 100, rotation 45–90° → 0 trong ~20 frame, ease mềm.
- Chữ: dán cả đoạn trước để căn line-height, rồi tách mỗi dòng 1 layer. Text Animator Position (đẩy xuống) + Opacity 0, Range Selector Words, Ramp Up, Ease Low 100%, keyframe Offset −100 → 100. (HD2 lưu thành preset "slow word fade on".)
- So le: dòng trên vào trước, dòng sau trễ dần; tam giác vào khớp dòng của nó. Kéo keyframe cuối ra chút cho chữ chạy chậm, liên tục.

### 4.4 Chia màn: video trái, danh sách trượt vào từ phải
- A-roll scale lên, mask chữ nhật.
- Precompose danh sách → mask → đặt ngoài khung phải. Keyframe position: A-roll trượt trái, danh sách trượt vào cùng lúc. Ease ~1 giây, không quá đà. **Bật Motion Blur** cho layer và comp.

### 4.5 Thẻ kính HUD sau lưng người nói
1. **Tách người**: Object Matte / Roto Brush (AE mới) chọn người (+ mic nếu cần). Nhân bản layer: bản trên giữ matte (`FG_Person`), bản dưới xoá matte (`BG_Plate`). Thứ cần đi sau lưng người đặt **giữa** hai layer.
2. Thẻ: rounded rectangle fill linear gradient mềm, stroke 4 px, Layer Styles → **Inner Glow** tím nhạt, blend Normal, size lớn. Opacity 80–90%.
3. Icon: không để đen. Tint sang tím, opacity ~70%, mask feather để icon **hoà vào thẻ**.
4. Chữ: tên nhỏ, đậm vừa. **Số đếm**: preset *Counter – countdown monospace* (5 chữ số, dấu phân cách nhóm "."), keyframe 1.000 → 26.130, chữ đậm.
5. Vào/ra: mọi phần tử parent vào thẻ; bản sao thẻ opacity 100 làm **matte cho chữ**; keyframe scale thẻ 0 → 100 (Easy Ease) → chữ được lộ theo thẻ.
6. 3D: bật 3D cho các layer, xoay thẻ nhẹ; keyframe position để thẻ **đi ra sau lưng** người (bật lại `FG_Person`). Lúc thẻ khuất giữa chừng thì đổi nội dung chữ.

---

## 5. Hiệu ứng talking head dọc (HD1, DaVinci → AE)

HD1 dựng trong Resolve/Fusion. Dưới đây là bản tương đương trong AE.

| HD1 (Resolve) | Làm trong AE |
|---|---|
| Subtitle from audio, max 1 từ/dòng → căn mốc chữ | transcript từng từ (faster-whisper) → script tạo text layer theo mốc |
| Gemini: transcript + dịch, gợi ý ý tưởng edit, gợi ý b-roll + từ khoá tìm | Claude làm bước này trong `plan.md` |
| Chữ hook to (Impact / font dày), outline trắng mảnh + Soft Glow | Stroke trắng mảnh (Text stroke hoặc Layer Styles Stroke) + Glow nhẹ |
| Chữ bật lên: transform Y thấp → đích trong **15 frame**, ease **Out Cubic** (vọt nhanh rồi chậm) | position keyframe, ease out influence 5–15 / in 85–95 |
| Opacity 0 → 1 trong **10 frame** | Opacity keyframe |
| **Magic Mask** tách người → chữ nằm sau lưng | xem mục 6 |
| Mỗi từ khoá 1 màu khác (xanh dương, cam, vàng, xanh lá), mix font trong một câu, số "3" thay chữ "three" | Fill riêng mỗi text layer |
| Gradient + light sweep chạy qua chữ (preset trả phí) | Gradient Ramp/4-Color Gradient + CC Light Sweep |
| Icon bay lên từ sau lưng người, xoay nhẹ, lệch nhau **3 frame** | 3 layer icon giữa `BG_Plate` và `FG_Person`, position + rotation, stagger 3 frame |
| **Zoom giật**: adjustment clip, scale 2 → 1 trong 10 frame, đầu đồ thị kéo thẳng (rất nhanh vào), motion blur 5 | adjustment layer Transform scale 200 → 100, influence out ~0, in ~90, bật Motion Blur |
| **Magic Zoom**: zoom chậm 1.0 → 1.1 suốt câu | Transform scale 100 → 110 tuyến tính |
| Ánh sáng chuyển cảnh (light leak) blend Add, opacity ~50% | footage light leak, blend Add/Screen |
| Chữ nhấp nháy: opacity 0/1 xen kẽ mỗi frame trong 5 frame đầu | 6 keyframe Hold |
| Ký tự riêng trong một text (cỡ khác nhau) | Text Animator Scale + Range Selector theo ký tự |
| 3 vòng tròn nở rồi tắt: elip, width 0 → 0.5 trong 10 frame, border width tăng rồi về 0 | shape ellipse, Size 0 → đích, Stroke Width 0 → 8 → 0 |
| Logo app bay từ phải vào, xoay −360°, ease **Out Back** (vọt quá rồi về), drop shadow, motion blur | position + rotation, overshoot như `saas-ae-layer.md` 1.2 |
| Hiệu ứng Glow mạnh quanh logo | Glow / Deep Glow |

| Glitch (preset free) đè đoạn logo cho nổi bật | adjustment layer: Displacement Map/ Wave Warp ngắn + RGB tách kênh, 4–6 frame |
| **Icon bay vào đúng chỗ logo** (chuyển cảnh khớp vị trí): keyframe position + size của icon từ chỗ cũ tới vị trí logo, size → 0 đúng lúc logo bay lên | parent hoặc keyframe icon tới toạ độ logo, scale → 0 cùng frame logo xuất hiện |
| Nhóm chữ của một đoạn thành Compound Clip để dời cả cụm | precomp `S##_Captions`, dời bằng null |
| Chèn meme: crop vùng cần (Rectangle mask), freeze frame, DVE 3D xoay nhẹ + zoom vào mặt (key 0 → 30 → giữ đến 50 → về), ease mềm, nền b-roll che phần thừa | footage + mask + 3D layer, keyframe position/scale/rotation Y |

**Nhịp HD1:** video mẫu 20 giây, gần như mỗi câu có một hiệu ứng (chữ hook, icon, zoom, ánh sáng, vòng tròn). Chính HD1 nói khách thường không trả tiền cho mật độ này — với video bán hàng, giảm mật độ xuống 1 hiệu ứng mỗi 2–3 giây.

### 5.1 Âm thanh (HD1)
1. Chuẩn hoá giọng trước (Resolve: Normalize Audio Levels theo chuẩn YouTube). Ngoài AE: `ffmpeg -af loudnorm=I=-14:TP=-1:LRA=11`.
2. Tách track và đặt tên: Voice, SFX, Ambience, Music.
3. Bảng SFX theo hiệu ứng:

| Hiệu ứng hình | SFX | Ghi chú |
|---|---|---|
| zoom giật vào | *ping* ngắn | cắt sát đầu |
| chữ hook/từ khoá bật lên | *tick-tock*, *click* | giảm âm lượng (~−5 dB) |
| ánh sáng chuyển cảnh | *camera shutter* / *camera flash* | chỉ lấy phần đầu |
| cuối đoạn | *riser* | đỉnh riser rơi đúng điểm cắt |
| chữ to xuất hiện | *movie impact* + *light saber* | saber ~−10 dB |
| 3 vòng tròn | *pop* ×3 | ~−10 đến −15 dB, khớp từng vòng |
| icon/UI | *gear*, *whoosh* (tăng tốc 120% nếu dài) | |

4. SFX **không được át giọng**; đeo tai nghe khi căn. Âm lượng SFX nghe nhỏ trong lúc dựng thường to khi xuất.

---

## 6. Tách người khỏi nền khi dựng qua MCP

Chữ, icon, thẻ nằm **sau lưng người nói** là chiêu chính của cả HD1 (Magic Mask) và HD2 (Object Matte). Roto Brush / Object Matte trong AE cần click chọn trên giao diện, script không gọi được. Cách làm qua MCP:

1. Tạo **video matte** ngoài AE bằng `tools/talking-head/matte.py` (RobustVideoMatting, xem mục 6.1). File ra cùng kích thước, fps và số khung với A-roll.
2. Import vào AE, `FG_Person` = A-roll + `setTrackMatte(matte, TrackMatteType.LUMA)`.
3. `BG_Plate` = A-roll gốc ở dưới. Đồ hoạ "sau lưng" đặt giữa.
4. Nếu matte xấu ở tóc/mic: chỉ dùng hiệu ứng sau lưng cho đoạn ngắn, hoặc nhờ người dùng bấm Object Matte một lần trong AE.

### 6.1 Công cụ chuẩn bị A-roll (`tools/talking-head/`)

Một lệnh làm cả ba bước trước khi dựng AE:

```bash
bash tools/talking-head/prep.sh <raw.mp4> output/<slug>/aroll --lang vi
```

| File ra | Dùng để |
|---|---|
| `raw.json`, `raw.txt` | Lời thoại của clip gốc, mốc thời gian từng từ |
| `aroll.mp4` | Đã cắt khoảng lặng, âm lượng −14 LUFS. Đây là A-roll đưa vào AE |
| `aroll.edl.json` | Các đoạn giữ lại: thời gian gốc → thời gian mới |
| `aroll.transcript.json` / `.txt` | Từng từ trên timeline của `aroll.mp4`. Lập `plan.md` và đặt keyframe phụ đề theo file này |
| `aroll_matte.mp4` | Người trắng trên nền đen. Trong AE dùng làm Track Matte → Luma |

Tuỳ chọn của `prep.sh`:
- `--from-words`: tìm khoảng nghỉ theo transcript thay vì theo mức âm thanh. Dùng khi có nhạc nền dưới giọng hoặc phòng ồn.
- `--noise -40`: ngưỡng im lặng tính bằng dB, mặc định −35.
- `--min-silence 0.35`: chỉ cắt khoảng nghỉ dài hơn số giây này.
- `--pad 0.08`: chừa lại bao nhiêu giây ở mỗi đầu câu nói.
- `--prompt "tên riêng"`: giúp Whisper viết đúng tên thương hiệu, sản phẩm.
- `--no-matte`: bỏ bước tách người.

Có thể chạy riêng từng script: `transcribe.py`, `cut_silence.py` (thêm `--dry` để chỉ xem trước sẽ cắt gì), `matte.py` (thêm `--cutout person.mov` để ra ProRes 4444 có alpha).

Máy và tốc độ đo trên RTX 3060 Laptop:
- Phiên âm: faster-whisper `large-v3-turbo` chạy GPU, 60 giây âm thanh mất khoảng 3 giây.
- Cắt lặng: ffmpeg, khoảng 3× thời gian thực.
- Matte: onnxruntime-gpu 1.23 (CUDA 12), khoảng 8 khung/giây ở 1080p, tức một clip 60 giây 30 fps mất khoảng 4 phút.
- Thư viện CUDA lấy từ pip (`nvidia-cublas-cu12`, `nvidia-cudnn-cu12`). `_cuda.py` tự thêm chúng vào đường dẫn DLL. Không dùng onnxruntime-gpu từ 1.24 trở lên: các bản này cần CUDA 13.
- Mô hình `tools/talking-head/models/rvm_mobilenetv3_fp32.onnx` (15 MB, không đưa lên git). Nếu thiếu, tải ở github.com/PeterL1n/RobustVideoMatting, bản phát hành v1.0.0.

Giới hạn:
- Matte tách cả mic và đồ vật người đang cầm.
- Tay cử động nhanh có thể bị mờ cạnh.

---

## 7. Phân tích video kết quả trong HD-CL (60 giây, dọc)

Clip podcast Arthur Brooks, "4 kiểu sự nghiệp". Đây là tác phẩm của người khác, chỉ dùng để học cách bố trí.

| Giây | Lời | Cảnh | Chi tiết |
|---|---|---|---|
| 0–2 | "There's four career patterns" | A-roll + phụ đề | "four" bold to, "There's" nhỏ trên, "career patterns," nhỏ dưới |
| 2–5 | "linears… up and up and up" | 3.10 biểu đồ | nền đen lưới mảnh, đường bậc thang leo theo từng "up", chấm xanh, chữ "linears" góc trên phải |
| 6–10 | "…only change when something is better. There are transitories who kind of just skip around" | A-roll + phụ đề | "transitories", "skip around" bold, mờ khi ra |
| 11–13 | "I'm gonna be a barista… fell in love with a girl in San Diego" | 3.3 tranh | vào bằng blur trượt mạnh, tranh hôn nhau, chữ nhỏ cạnh chủ thể |
| 14 | "There are what's called…" | A-roll | |
| 15–16 | "expert, slow and steady" | 3.10 | đường phẳng có chấm xanh, chữ mờ dần |
| 17–19 | "My dad had the same job for 42 years" | 3.3 tranh | tranh ông già đọc báo, "Same job" bold, "42 years" ô highlight xanh |
| 20–23 | "because it was secure and low stress" | 3.7 minh hoạ | ông già tô xanh cobalt thô trên nền trắng chấm, "secure" bold |
| 24–25 | "A lot of people who are watching this show" | A-roll | "people", "this show" bold |
| 26–27 | "are spirals for every 7 to 12 years" | 3.7 | xoắn ốc xanh vẽ ra, "spirals" bold, số "7" to |
| 28–31 | "take their career down to the studs and start again" | 3.2 b-roll | b-roll tối, người đi qua cửa, vignette |
| 32 | "The first turn is hardest" | A-roll | |
| 33–35 | "leaving the French horn and becoming a scientist" | 3.9 vật thể | ảnh cũ trên nền giấy, "French horn" serif xanh, "scientist" bold xanh |
| 36 | "that was brutal" | A-roll | "brutal." serif italic |
| 37–39 | "Going back and getting a PhD when I didn't know what I was" | 3.9 | ảnh tốt nghiệp, "what I was" serif xanh |
| 40–43 | "really hard. Second turn, easier. I'm on my fourth turn" | A-roll | đổi góc máy, "fourth turn" bold |
| 44–47 | "Maybe in 10 years I'll be a circus clown or firefighter" | 3.7 | nền xanh cobalt, chân dung xanh, vòng mảnh quanh đầu, nghề hiện quanh vòng |
| 48 | "But the whole point" | A-roll | |
| 49–50 | "that's what it means to live an entrepreneurial life" | 3.6 chữ trung tâm | nền xanh, ngoặc kép, "entrepreneurial" bold |
| 51–54 | "pursuing your calling… agility and courage" | 3.4 đường + chữ | nền trắng, đường xanh cong cắt qua "your calling", "agility" |
| 55–57 | "to be an entrepreneur in the enterprise… business of life" | A-roll | "enterprise" bold, "of life." serif |

**Nhịp rút ra:** cảnh đồ hoạ dài 2–4 giây; A-roll 1–3 giây giữa các cảnh; trong 60 giây có ~12 cảnh đồ hoạ, khoảng 55% thời lượng là đồ hoạ. Mọi lần chuyển cảnh rơi vào đầu một từ.

---

## 8. Lưu ý

- HD-CL không chia sẻ file skill. Phần "huấn luyện phong cách" nằm trong mục 2–3 ở trên; muốn sát hơn thì làm như họ: tải ~20 video mẫu, chụp ~130 khung đẹp, xếp theo 10 loại cảnh.
- HD1 và HD2 đều chèn quảng cáo khoá học/bộ template. Các preset trả phí của HD1 (bộ FX, bộ icon) đã đổi thành hiệu ứng có sẵn của AE.
- Matte người tự động đã chạy thử (mục 6.1); chưa thử ghép matte với Track Matte trong AE. Chưa thử: Counter preset của AE qua script, Layer Styles Inner Glow qua script (xem `saas-ae-layer.md` 1.5).

---

## 9. Mẫu Foodtage (bộ đủ của HD1)

Thư mục: `C:\Users\hieu\Downloads\talking head\Project Foodtage\Project Foodtage`.

| File | Thông số / dùng để |
|---|---|
| `clip gốc.mp4` | 2160×3840 HEVC 23,976 fps, 22,1 s, màu phẳng chưa grade. Không có chỗ lặng, **không cần cắt** |
| `video mẫu.mov` | 1080×1920 30 fps, 22,2 s. Cùng timeline với clip gốc (lệch 0 ms), chỉ thêm grade + đồ hoạ + SFX |
| `B-Roll/meme khóc rồi cười.mp4` | 576×1024, chèn 12,0–14,7 s |
| `B-Roll/Record.mov` | 4K ngang, quay màn hình timeline DaVinci, chèn cùng meme |
| `icon&logo/*.mp4` | 3 icon neon động 512×512 60 fps (keyboard, audio, storytelling) |
| `icon&logo/*.png` | Logo Pr, CapCut, DaVinci, AE, FCP |
| `ánh sáng chuyển cảnh 1.mp4` | Light leak 1024×576, blend Screen/Add |
| `Fonts/` | TR Impact (tiêu đề xanh/tím), Pensum Display Book Italic (phụ đề từng từ), SVN-Rosellinda Alyamore (chữ viết tay "Ways"), Athelas, Tactic Sans. **Chưa cài trên máy** |
| `SFX/` | ping, pop, click, camera shutter, film flash, gears, riser long, MUI impact, lightsaber, Tiktok SFX 2, Sound Vip |
| `*.setting` | Preset Fusion, đã đọc thông số (9.2) |

### 9.1 Từng giây của video mẫu

| Giây | Lời | Hình | Âm thanh |
|---|---|---|---|
| 0,0–0,3 | Here's three ways… | A-roll đã grade (tăng tương phản, đỏ/xanh neon) | Hook (Tiktok SFX 2 ở 0,0) |
| 0,33 | Here's | "Here's" TR Impact xanh dương glow, giữa ngực | |
| 0,67 | three ways | "3" đỏ neon + "Ways" Rosellinda xanh lá neon | |
| 1,0 | | Light leak loé trắng; icon tile đầu tiên bật ra | |
| 1,33–2,0 | | 3 icon tile (keyboard, audio, storytelling) xếp trên đầu, lơ lửng | pop từng icon |
| 2,67–3,3 | Number one | "Number" Impact xanh ở trên + số "1" neon 3D lớn **sau lưng** người | Impact lớn 2,6 s (−4 dB) |
| 3,67–4,7 | keyboard shortcuts | Icon tile keyboard trên mic; vòng tròn trắng nổ ra; "Keyboard Shortcut" Impact nghiêng, Stroke Up | |
| 5,0–5,7 | This will make you way | Phụ đề từng từ Pensum nghiêng, xanh ngọc glow, chồng 2–3 dòng | click mỗi từ (5,7 s khớp file click) |
| 6,0–6,3 | faster | Light leak; "FASTER" Impact tím-trắng to ở trên, sau đầu | |
| 6,67–8,3 | more efficient | "Efficient" thay "FASTER" | |
| 7,33–9,0 | no matter what editing software | Hàng logo Pr/CapCut/**DaVinci to ở giữa**/AE/FCP trượt ngang; light leak 7,67 | Riser 7,3 → 9,2 |
| 9,33–10,0 | Number two | "Number" + "2" neon sau lưng | Impact 9,2 s |
| 10,0–10,7 | you need to be practicing | Phụ đề từng từ; "Practicing" Stroke Up | |
| 11,0–11,7 | sound design | Icon tile audio; "Sound Design" Impact tím rất to **sau đầu** | |
| 12,0–14,7 | Sound design can make… | Nửa trên: meme trong thẻ bo góc (khóc → cười); nửa dưới: Record.mov (timeline DaVinci). Hết A-roll | Tiktok SFX 13,5 s |
| 15,1–16,0 | And last | "and Last" + "3" neon sau lưng | Impact 15,1 s |
| 15,67–16,3 | but not least focus | Phụ đề từng từ | |
| 16,67–17,7 | on telling a story | Light leak; icon tile storytelling; "Telling Story" sau đầu | |
| 18,0–22,2 | Practice editing… abilities | **Nền thay bằng vòng tròn tối có icon quay quanh** (người được tách khỏi nền); phụ đề từng từ, "storytelling abilities" đổi màu tím | Gears 17,9 s, riser 18,3 s → hết |

Nhịp: cứ 0,3–0,7 s lại có một thứ mới. Mỗi ý chính có 1 impact + 1 số neon + 1 icon tile + 1 từ khoá Impact sau đầu.

### 9.2 Preset DaVinci → AE

**icon effect.setting** (icon tile):
- Thẻ 512×512, bo góc 22 %, nền xanh đen `#101318` alpha 0,83.
- Viền 0,4 % gradient tím `rgb(170,0,255)` → đen.
- Một vệt sáng dài 20 % chu vi chạy vòng quanh viền: 0→1 trong 178 khung (≈6 s).
- Glow gain 5, size 20. Edge detect glow brightness 2,5.
- Bay vào theo path trong 15 khung, có motion blur.
- AE: Shape rounded rect + Stroke gradient + Trim Paths (Start/End cách 20 %, Offset 0→360° trong 6 s) + Glow + Position 15 khung Easy Ease + motion blur.

**Strock Up.setting** (từ khoá nổi viền):
- Chữ chính + một bản viền (sOutline) màu gradient, SoftGlow gain 1,5 size 30.
- Viền dày 0 → tối đa ở khung 9–16.
- Bản viền phóng to 100 % → 250 % ở khung 10–20, mờ 100 → 0 % ở khung 16–20.
- Chữ đi theo path: lên từ y −0,3 về 0 (khung 0–10), giữ, rồi đi tiếp lên +0,4 (khung 20–30).
- AE: text + duplicate có Stroke (Layer Style) → Scale 100→250 % + Opacity 100→0 ở các khung trên.

**opacity.setting**: chỉ là Merge với Background trong suốt (dùng để làm mờ dần). Trong AE đây là Opacity keyframe, không cần dựng riêng.

### 9.3 Dựng lại trong AE: thứ tự đề xuất

1. Comp 1080×1920 30 fps, 22,2 s. Clip gốc 4K → scale 50 %, grade (Lumetri: contrast +, saturation +, curves). Punch zoom giữ nguyên chỗ mẫu có.
2. Không cắt: chạy riêng `transcribe.py` + `matte.py` (hạ clip 4K về 1080×1920 trước khi matte).
3. Lớp chữ sau đầu (Number/FASTER/Efficient/Sound Design/Telling Story): đặt giữa `BG_Plate` và `FG_Person` (Track Matte Luma).
4. Số neon 1/2/3, icon tile, hàng logo, light leak, vòng tròn nổ.
5. Phụ đề từng từ theo transcript (Pensum nghiêng, xanh ngọc, glow).
6. Đoạn meme + Record.mov 12,0–14,7 s.
7. Đoạn nền vòng tròn 18–22 s: người tách khỏi nền (matte) đặt trên nền mới.
8. SFX theo bảng 9.1, loudnorm −14 LUFS.
