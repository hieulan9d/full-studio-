# 09 — Ví dụ đầy đủ: NeuraFlow (20 giây)

Video mẫu (watermark "zellos" — tác phẩm của người khác, chỉ dùng để học kỹ thuật, không làm lại y nguyên để giao khách)
và bản dựng lại qua 4 phiên bản. Project: `output/neuraflow-ae/NeuraFlow_test.aep` (trong dự án gốc), video `NeuraFlow_test_v4.mp4`.

## A. Phân tích video mẫu (đây là dạng `ref-notes.md` cần viết khi có video tham chiếu)

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

## B. Bản dựng (v4) — bản đồ comp và mốc

| Comp | Thời lượng | startTime trong MAIN | Nội dung chính | Hàm thư viện tương ứng |
|---|---|---|---|---|
| `ENV_Space` | 20,15 | 0 | nền, sao, quầng, cột sáng (tắt 17,2→17,6) | `H.buildEnvSpace` |
| `ENV_Planet_Intro` (layer của `ENV_Planet`) | 0–4,1 | 0 | vòng chân trời; 1,0→1,6 dời lên (y 145, scale 45%); tắt 3,8→4,05; collapse BẬT | `H.buildEnvPlanet` |
| `S01_Logo` | 1,5 | 0 | logo blur-in, scale 145%, trượt xuống ở 0,85, tắt 0,88→1,12 | `H.sceneLogo` |
| `S02_Dashboard` | 3,2 | 1,0 | cửa sổ dâng 0→0,6; tiêu đề 0,15; chip trái 0,4/0,55; thẻ phải 0,8; số đếm 50→93; cuối scale 97→52% | dựng tay + `H.titleBlock`, `H.glassCard` |
| `S03_ZoomOut` | 3,25 | 3,9 | panel nền, chữ khổng lồ, DOF, cửa sổ 72→57→54%, nội dung đổi ở UI-local 4,0 | `H.uiBackPanels` + `UI_Dashboard` (startTime −2,9) |
| `S04_Updates` | 2,25 | 7,0 | vòng kính, "New/Updates", 6 bong bóng, scene scale 123→111% | `H.sceneOrbit` |
| `S05_Chat` | 4,15 | 9,1 | gõ 0→0,65, gửi 0,72, AI 0,85, trả lời 1,9, scene scale 145% | `H.sceneChat` |
| `S06_Cards` | 4,4 | 13,1 (out 16,25) | 1 thẻ → 3 thẻ → uốn 1,3→2,15 → xoay −140°, nghiêng 12° | `H.sceneCardRing` |
| `S07_Star` | 1,5 | 16,2 (out 17,45) | sao nuốt `S06_Cards` (startTime −3,1), trắng 0,45→0,8, về icon (554,497) 7,4% | `H.sceneStarMorph` |
| `S08_End` | 2,75 | 17,4 | logo + tagline, cột sáng từ dưới, scale 145% | `H.sceneEnd` |
| `ENV_Planet_End` | 17,3–20,15 | 0 | vòng chân trời vào lại (y 700→540) | `H.buildEnvPlanet` |
| `ADJ_Grade`, `VIG_Vignette`, `ADJ_Bloom` | toàn bộ | — | chỉnh màu, vignette, bloom | `H.finishMain` |

Chồng cảnh trong MAIN: opacity cảnh trước 100→0 trong 0,15 s quanh mốc nối.

## C. Thứ tự dựng đã dùng (và nên dùng)

1. ENV → MAIN (đặt ENV) → kiểm tra 1 khung.
2. Logo → kiểm tra. 3. UI_Dashboard → kiểm tra riêng comp UI ở 1–2 thời điểm.
4. Cảnh 2 → kiểm tra 2–3 khung. 5. Cảnh 3 → … (mỗi cảnh kiểm tra ngay).
6. Ghép đủ → render v1 → contact sheet → so với mẫu → sửa → v2… Bốn vòng là bình thường.

## D. Bài học lớn nhất

1. Bản đầu tiên luôn "nhỏ và tối-phẳng" — phóng to + ánh sáng + chỉnh màu ngay từ đầu.
2. Chất liệu (kính, glow) quyết định cảm giác "đắt" hơn là số lượng hiệu ứng.
3. Chuyển động phức tạp phải là **một vật thể biến đổi liên tục**; kiểm tra bằng khung dày, ở nhiều thời điểm.
4. Giao diện phải có nội dung thật (chữ, số, trục), không phải khối/vạch.
