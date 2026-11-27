---
name: capcut-pro-editor
description: >-
  Bộ kỹ năng chuyên sâu mô phỏng và nâng cấp phong cách dựng phim CapCut cá nhân
  của Editor (TVC, Reels, Vlog, Storytelling/AI Drama). Sử dụng khi phân tích,
  chỉnh sửa, nâng cấp hoặc tạo mới dự án CapCut (draft_content.json).
---

# CapCut Pro Editor Skill (Signature Style + Pro Upgrades)

Skill này cung cấp toàn bộ thông số kỹ thuật JSON (`draft_content.json`), ID hiệu ứng/mask/font/SFX trên máy của Editor và bộ công cụ tự động hóa để dựng hoặc nâng cấp dự án CapCut theo đúng chuẩn cá nhân đã nâng tầm.

---

## 1. Cấu Trúc & Quy Chuẩn Dựng Theo Thể Loại

| Thể loại | Tỷ lệ khung | Median Dur (Main Track) | Median Dur (B-Roll) | Speed Đặc Trưng | Phong cách Âm thanh & Chữ |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TVC Luxury / Không gian (WinHair...)** | `1920x1080` hoặc `1080x1920` | `1.8s – 2.0s` | `1.1s – 1.67s` (đa tầng Track 1–6) | Slow-mo `0.8x`, `0.7x`, `0.6x` cho cảnh beauty/flycam | Voiceover cắt bậc thang (`vol: 1.12`) + BGM (`vol: 0.26–0.38`) + Text 2 tầng (Vàng Gold `#FFD400` + Trắng) |
| **Reels / Short Trend** | `1080x1920` (`9:16`) | `1.0s – 1.27s` | `0.4s – 1.0s` | Slow-mo `0.6x – 0.8x` xen kẽ `1.2x – 2.3x` | Mute B-roll (`0.0`), bật ASMR thực tế (`vol: 1.98–9.39`), SFX dày (`Magic reveal`, `Deep woosh`, `Pop`, `打字-102214`) |
| **Vlog / Training / Sự kiện (F20...)** | `1080x1920` (`9:16`) | `2.5s` | `2.4s – 6.0s` | `1.0x` tự nhiên | Hook 3s đầu dùng Text 3 cụm (`Montserrat-Bold` / `Oswald-Bold`) + `Camera shutter` + `Máy chữ` + BGM `0.42` |
| **Dược phẩm / Doanh nghiệp (An Vượng...)** | `1920x1080` (`16:9`) | `1.83s` | Logo góc cố định (`scale: 0.11`) | `1.0x` (điểm nhấn `0.9x` / `1.8x`) | Voiceover `vol: 1.0–1.46`, BGM `0.28`, Subtitles IN HOA cỡ `5` tại `Y = -0.85` (~`1.97s`/cụm) |
| **AI Drama / Storytelling (`túi cá`, `1103`)** | `1080x1920` (`9:16`) | `2.6s – 3.57s` | `1.0s – 1.4s` | `1.0x` giữ thoại | Nhạc kịch tính/bi cảm Lê Tuấn Khang (`vol: 0.47–0.62`) + SFX `Tiếng Nổ impact căng căng`, `Deep woosh` |

---

## 2. Danh Mục Resource ID & Đường Dẫn Cache Trên Máy

Khi thêm Transition, Animation, Mask, Font hoặc SFX vào `draft_content.json`, sử dụng chính xác các ID và đường dẫn sau:

### A. Fonts
- **Font mặc định (TVC / Subtitles)**:
  - `id`: `"7542214368361057553"`
  - `path`: `"C:/Users/Hang thu/AppData/Local/CapCut/User Data/Cache/effect/7542214368361057553/d376267c892ee3a53654ae93a78dcfb7/font.ttf"`
- **Montserrat-Bold (Hook / Luxury Title)**:
  - `id`: `"7517455788122705168"`
  - `path`: `"C:/Users/Hang thu/AppData/Local/CapCut/User Data/Cache/effect/7517455788122705168/91d28cfa5e7db054f4872f1ae2417ac2/Montserrat-Bold.otf"`
- **Oswald-Bold (Vlog / Điểm nhấn mạnh)**:
  - `id`: `"7182504807289065985"`
  - `path`: `"C:/Users/Hang thu/AppData/Local/CapCut/User Data/Cache/effect/7182504807289065985/0a5333de6f4d592cb2d2390d68b31efb/Oswald-Bold.ttf"`

### B. Masks (`materials.common_mask`)
1. **Tách (Line Mask - Chia đôi chéo sang trọng)**:
   - `resource_type`: `"line"`, `resource_id`: `"7374020197990011409"`
   - `path`: `"C:/Users/Hang thu/AppData/Local/CapCut/User Data/Cache/effect/1068046536/4c6a0ef5de6a844342d40330e00c59eb"`
   - `config` chuẩn: `{"width": 0.28, "height": 0.0, "centerX": -0.849, "centerY": 0.137, "rotation": 101.5, "feather": 0.51, "expansion": 0.0, "roundCorner": 0.0, "invert": false, "aspectRatio": 1.0}`
2. **Cuộn phim (Mirror Mask - Lồng cảnh nghệ thuật)**:
   - `resource_type`: `"mirror"`, `resource_id`: `"7374021024985125377"`
   - `path`: `"C:/Users/Hang thu/AppData/Local/CapCut/User Data/Cache/effect/7374021024985125377/d434671c844fde7d8846e8e8019f8b1d"`
   - `config` chuẩn: `{"width": 0.28, "height": 0.759, "centerX": 0.062, "centerY": -0.11, "rotation": -79.0, "feather": 0.27, "expansion": 0.0, "roundCorner": 0.0, "invert": false, "aspectRatio": 1.0}`
3. **Hình chữ nhật (Rectangle Mask - Khung PIP / Collage)**:
   - `resource_type`: `"rectangle"`, `resource_id`: `"7374021450748924432"`
   - `path`: `"C:/Users/Hang thu/AppData/Local/CapCut/User Data/Cache/effect/1068046537/02b8999168d121538a98ea59127483ef"`
   - `config` chuẩn: `{"width": 0.5, "height": 0.468, "centerX": 0.0, "centerY": 0.0, "rotation": 0.0, "feather": 0.14, "expansion": 0.0, "roundCorner": 0.0, "invert": false, "aspectRatio": 1.0}`

### C. Animations (`materials.material_animations`)
- **Video / PIP In-Out**:
  - `in:Trượt sang trái`: `id="6798332871267324423"`, `duration=466666`, `path="C:/Users/Hang thu/AppData/Local/CapCut/User Data/Cache/effect/6798332871267324423/667952e8cf6918f62e16b8e6dfc2fef2"`
  - `in:Trượt sang phải`: `id="6798333076469453320"`, `duration=500000`, `path="C:/Users/Hang thu/AppData/Local/CapCut/User Data/Cache/effect/6798333076469453320/abb44c05890e39fdfeb58abc8524c1a6"`
  - `out:Mờ dần`: `id="6798320902548230669"`, `duration=500000`, `path="C:/Users/Hang thu/AppData/Local/CapCut/User Data/Cache/effect/6798320902548230669/c6f05ce62355b537be762550040bfc08"`
- **Text Animations**:
  - `in:Máy chữ`: `id="7210980292243231233"`, `duration=800000`, `path="C:/Users/Hang thu/AppData/Local/CapCut/User Data/Cache/effect/7210980292243231233/6828d67634e66ace1e76c4eb7cc2f8e6"`
  - `in:Bụi vàng`: `id="7331632775948145153"`, `duration=700000`, `path="C:/Users/Hang thu/AppData/Local/CapCut/User Data/Cache/effect/7331632775948145153/25d1da238cd78c05757f2d6036dec895"`
  - `in:Chữ mờ dần hiện vào`: `id="7648937403646004500"`, `duration=700000`, `path="C:/Users/Hang thu/AppData/Local/CapCut/User Data/Cache/effect/7648937403646004500/495e55b3bcd1f6420b6e4b1b44ed1fc8"`
  - `in:Mờ`: `id="6923135604519604737"`, `duration=866666`, `path="C:/Users/Hang thu/AppData/Local/CapCut/User Data/Cache/effect/6923135604519604737/a5f4d3998c0648ec65c03251506bd0a0"`

### D. Transitions (`materials.transitions`)
- `Kéo vào ii`: `effect_id="7291211157254181377"`, `duration=466666`, `is_overlap=true`, `path="C:/Users/Hang thu/AppData/Local/CapCut/User Data/Cache/effect/7291211157254181377/94815943a86e741a5fec1737fbb46d60"`
- `Kết hợp`: `effect_id="6724845717472416269"`, `duration=466666`, `is_overlap=true`, `path="C:/Users/Hang thu/AppData/Local/CapCut/User Data/Cache/effect/6724845717472416269/7b53f4c008c4c684fccf8c7d4d46cc92"`
- `Mờ thu phóng hiện ra`: `effect_id="7621850078533143861"`, `duration=466666`, `is_overlap=true`, `path="C:/Users/Hang thu/AppData/Local/CapCut/User Data/Cache/effect/7621850078533143861/01e4b5812c36fd59c8e3e776bd411d35"`
- `Chói lòa 1`: `effect_id="6726707814028284423"`, `duration=333333`, `is_overlap=true`, `path="C:/Users/Hang thu/AppData/Local/CapCut/User Data/Cache/effect/6726707814028284423/a3fd6266c293496fd9480884a93fb90e"`

### E. Kho SFX Chủ Lực Có Sẵn Trên Máy
- `Magic reveal`: `"C:/Users/Hang thu/AppData/Local/CapCut/User Data/Cache/music/229f88e6452098f686f43df9309b1acc.mp3"`
- `Deep woosh`: `"C:/Users/Hang thu/AppData/Local/CapCut/User Data/Cache/music/270677b49d33e1e347819050db9ee915.mp3"`
- `打字-102214` (Gõ máy chữ): `"C:/Users/Hang thu/AppData/Local/CapCut/User Data/Cache/music/de7663a758c391a57ebc8060285800f8.mp3"`
- `Pop (lower) telop sound etc`: `"C:/Users/Hang thu/AppData/Local/CapCut/User Data/Cache/music/d3b74afaf571dd3056bd7e9996a683cc.mp3"`
- `鼠标单击1` (Click chuột): `"C:/Users/Hang thu/AppData/Local/CapCut/User Data/Cache/music/25b5bc6c42f453173fbf056859eec22b.mp3"`
- `Camera shutter sound`: `"C:/Users/Hang thu/AppData/Local/CapCut/User Data/Cache/music/66c35a8a836911a52824fcd5c8cb016a.mp3"`
- `Woosh vshort - chữ.mp3`: `"Z:/Máy tính khác/My Computer/Document HT Media/TLH/Edit/02_Hiệu Ứng Âm Thanh (SFX)/Woosh vshort - chữ.mp3"`
- `Noitifi - chữ.mp3`: `"Z:/Máy tính khác/My Computer/Document HT Media/TLH/Edit/02_Hiệu Ứng Âm Thanh (SFX)/Noitifi - chữ.mp3"`
- `Tiếng Nổ impact căng căng.mp3`: `"Z:/Máy tính khác/My Computer/Document HT Media/TLH/Edit/02_Hiệu Ứng Âm Thanh (SFX)/Tiếng Nổ impact căng căng.mp3"`
- **Kho Chuẩn Hóa Toàn Hệ Thống (`2.700+` files dùng chung cho mọi dự án)**:
  - `1.340` Nhạc nền BGM (12 thể loại): `"Z:/Máy tính khác/My Computer/Document HT Media/TLH/Edit/01_Nhạc Nền (BGM)"`
  - `1.043` Hiệu ứng âm thanh SFX phẳng: `"Z:/Máy tính khác/My Computer/Document HT Media/TLH/Edit/02_Hiệu Ứng Âm Thanh (SFX)"`
  - `76` Video Meme & Chèn cảnh: `"Z:/Máy tính khác/My Computer/Document HT Media/TLH/Edit/03_Video Meme & Chèn Cảnh"`
  - `39` Font Tiếng Việt TVC & Chữ Gradient: `"Z:/Máy tính khác/My Computer/Document HT Media/TLH/Edit/04_Font Chữ TVC & Chữ Gradient"`
  - `229` Hiệu ứng Chữ & Chuyển cảnh Final Cut Pro / Apple Liquid Glass (khi xuất Overlay/Intro từ HyperFrames sang CapCut): `"Z:/Máy tính khác/My Computer/Document HT Media/TLH/Edit/05_Hiệu Ứng Chữ & Chuyển Cảnh Final Cut (HyperFrames)"`

---

## 3. Quy Trình 5 Bước Nâng Cấp Dự Án CapCut (Pro Upgrade Workflow)

Khi người dùng yêu cầu **"nâng cấp"**, **"chuẩn hóa"** hoặc **"dựng theo phong cách của tôi"**, hãy chạy công cụ `scripts/capcut_pro_engine.py` hoặc áp dụng trực tiếp 5 nâng cấp sau:

1. **Khử Click/Pop cho Voiceover cắt nhỏ (Micro-Fade Smoothing)**:
   - Tự động kiểm tra toàn bộ các segment thoại cắt ngắn (`0.4s – 10s`) và gắn `audio_fade` (`fade_in_duration = 33333` µs [1 frame], `fade_out_duration = 66666` µs [2 frames]) để câu chữ nối nhau êm tuyệt đối.
2. **Tạo Nhịp Thở Khung Hình (Subtle Ken Burns Micro-Zoom)**:
   - Với các clip trên Track 0 dài `> 2.3s` đang đứng tĩnh (`common_keyframes` rỗng và `scale == 1.0`), tự động thêm cặp keyframe `KFTypeScaleX` & `KFTypeScaleY` phóng nhẹ từ `1.00 -> 1.06` (hoặc thu từ `1.06 -> 1.00` xen kẽ) suốt thời lượng clip.
3. **Chuẩn Hóa Bố Cục & Hiệu Ứng Chữ 2 Tầng (Staggered Dual-Tier Typography)**:
   - Đảm bảo Tầng 1 (Vàng Gold `#FFD400`, size `12`, `Y = -0.42`) và Tầng 2 (Trắng `#FFFFFF`, size `9`, `Y = -0.64`) có hiệu ứng vào/ra mượt (`in:Chữ mờ dần hiện vào` + `out:Mờ dần`) và Tầng 2 xuất hiện trễ hơn Tầng 1 `0.25s – 0.4s`.
4. **Cân Bằng Âm Lượng & Đi `Tactile Micro-SFX` Chuẩn Studio (`phong-cach/kobe-ai-motion-talking-head/CHUYEN-DONG-LOP-PHU-VA-SFX.md`)**:
   - Đưa Voiceover về ngưỡng chuẩn `1.12 – 1.25` (`-14 LUFS`), BGM lùi sâu `-13.5` đến `-15.7 dB` dưới thoại (`volume = 0.24 – 0.34`), tắt tiếng (`volume = 0.0`) các B-roll thừa.
   - Đặt `Micro-SFX` ngắn gọn (`Pop`, `Click`, `Card Riffle`, `Soft Ping` ở mức `-9` đến `-14 dB` dưới Voice) trúng `0ms` frame thẻ/chữ chạm đích và trùng từ nhấn của giọng đọc (`0` SFX rơi lạc vào khoảng nghỉ); tiếng gió lướt `Whoosh` đặt sớm `-3 frames` (`-110ms`); chuỗi 3–5 thẻ liên tiếp nâng nhẹ cao độ `+1 semitone`/nấc.
5. **Kiểm Tra Nhịp Sóng (Wave Pacing Audit)**:
   - Phát hiện các chuỗi > 3 clip liên tiếp có thời lượng quá giống nhau hoặc quá dài (> 4.5s không có B-roll đè lên) để gợi ý điểm chèn B-roll / PIP / Split-Screen.

---

## 4. Quy Chuẩn Nâng Cấp Thực Chiến Từ Dự Án `FEEL CHICKEN V6`, `HTPM` & `1117 F20` (Cập Nhật Bắt Buộc)

Khi dựng hoặc chỉnh sửa dự án trực tiếp trên **CapCut Desktop (`draft_content.json` + `Timelines/<id>/draft_content.json`)**, bắt buộc áp dụng 6 quy tắc thực chiến sau:

1. **100% Source Gốc Cho Mọi Lớp Phủ Video (`100% Raw Original Sources — Zero Pre-baked B-Roll MP4s`)**:
   - **Tuyệt đối không** xuất sẵn file `.mp4` trung gian đã cắt/ghép làm mất tay nắm đầu-cuối (`source_timerange`) khiến Editor không kéo dãn, đổi tốc độ hay căn lại khung hình trực tiếp trong CapCut được!
   - Mọi segment lớp phủ (`Track 1` B-roll toàn màn hình, `Track 2` PIP góc, và `Tracks 2..5` 4 ô Bento `2×2`) **bắt buộc trỏ trực tiếp tới file quay gốc của khách hàng** với đầy đủ `duration` gốc, `source_timerange`, `clip.scale`, `clip.transform` và `common_mask` (`Hình chữ nhật` bo góc chỉnh sửa được).
   - Với các clip quay phẳng (`DJI D-Log`), gắn **thanh trượt màu gốc CapCut (`materials.effects`: `temperature: +0.15`, `saturation: +0.20`, `contrast: +0.10`, `brightness: +0.04`)** vào `extra_material_refs` để vừa đồng bộ màu ấm với máy `Sony` vừa cho phép Editor kéo chỉnh tiếp trong tab *"Tùy chỉnh"*.

2. **Tiết Chế Hiệu Ứng Ra/Vào Hợp Lý (`Hard-Cut First — Selective Animations`)**:
   - **Không bao giờ** gắn đồng loạt hiệu ứng `Rõ dần` / `Mờ dần` cho tất cả B-roll hoặc tất cả câu phụ đề!
   - **B-Roll toàn màn hình (`Track 1`)**: Mặc định **85–90% dùng Hard Cut cắt thẳng (`0` animation)** để dứt khoát và không bị nháy xuyên thấu xuống `Track 0` khi 2 cảnh B-roll nằm sát nhau; chỉ đặt `Rõ dần` / `Mờ dần` nhẹ ở 2–3 ranh giới mở màn / kết hồi lớn.
   - **Phụ đề thoại dưới (`Track Subtitle`)**: Mặc định **85–90% câu thoại liên tục giữ tĩnh (`0` animation)** để người xem đọc êm mắt, không bị chớp nháy liên hồi giữa các câu cách nhau `0.02s`; chỉ điểm nhẹ hiệu ứng `in` (`Chữ mờ dần hiện vào` `0.18s`, không gắn `out`) ở vài câu mở ý / chốt con số đắt giá.
   - **Thẻ PIP / Bento nổi & Chữ nhấn bay riêng**: Vì xuất hiện lơ lửng giữa cảnh nên gắn hiệu ứng vào/ra gọn (`Mờ` hoặc `Trượt sang trái/phải` + `Mờ dần`), tránh các hiệu ứng lòe loẹt như `Bụi vàng` / `Xoay lấp lánh`.

3. **Quy Tắc Vàng Cho Text CapCut Trực Tiếp Chỉnh Sửa Được (`Native Editable CapCut Text — check_flag = 15`)**:
   - Khi người dùng dựng trực tiếp trên CapCut Desktop, **luôn dùng 100% Native Text (`materials.texts` trên `type: "text"` track, `0` file PNG chữ)** để người dùng bấm sửa trực tiếp nội dung/vị trí/cỡ chữ ngay trong CapCut.
   - **CẢNH BÁO CỰC QUAN TRỌNG VỀ `check_flag`**:
     - Trong CapCut, `check_flag` là bitmask: **`15`** = Chữ thường + Viền (`Fill + Stroke` sạch đẹp); bit **`16`** (`check_flag = 31`) sẽ **TỰ ĐỘNG BẬT HỘP NỀN ĐEN ĐẶC (`background_color: #000000`) + In nghiêng/Gạch chân** làm hỏng hoàn toàn giao diện chữ!
     - **Bắt buộc đặt**: `"check_flag": 15`, `"background_style": 0`, `"has_shadow": false`, `"strokes": [{"width": 0.06, "mode": 0, ...}]`, cỡ chữ `11.5 – 14.2`, `line_spacing: 0.02`, `letter_spacing: 0.0`.
   - **Phân tách 2 hệ thống Text CapCut**:
     - *Track Phụ đề dưới (`type: "subtitle"`)*: Chữ thường Đỏ viền Trắng (`width: 0.06`), từ nhấn trong câu đổi sang Trắng viền Đỏ (`width: 0.065`).
     - *Các Track Chữ Nhấn Bay Nổi Riêng (`type: "text"`)*: Chữ Trắng tinh `#FFFFFF` + Viền Đỏ `#EC1D1D` (`width: 0.068`), kết hợp `KFTypePositionY` bay nhẹ quanh nhân vật/sản phẩm (chỉ gắn loop `Chao đảo ngẫu nhiên` cho các nhãn điểm nhấn chính quanh người nói).

4. **Lưới Bento Đa Khung Bằng 4 Track Source Gốc (`4-Track Native Editable 2×2 Bento`)**:
   - Khi lời thoại giới thiệu tổng quan *"Một set quà / gói sản phẩm gồm có 4 món..."*: Đặt 4 segment video gốc trên `Tracks 2..5` kết hợp `common_mask` (`Hình chữ nhật`, `roundCorner: 0.16`, căn `transform = card_center - scale * mask_center`) để tạo lưới Bento `2×2` sống động mà từng ô vẫn là source gốc chỉnh sửa độc lập được.
   - Tuyệt đối giữ **nhất quán không gian/ánh sáng**, **0% lệch khẩu hình**, và **0% đè chữ/PIP lên mặt người nói**.

5. **Đi `Tactile Micro-SFX` Tinh Tế Đã Kiểm Thính Bằng Tai (`Ear-Verified Luxury SFX` — `volume = 0.09 – 0.13` / `-18..-21 dB`)**:
   - **BẮT BUỘC nghe kiểm tra file âm thanh bằng `read_file`** trước khi đưa vào Timeline; tuyệt đối không chọn theo tên file mù quáng (đã xóa vĩnh viễn các file còi trượt/bọt miệng hoạt hình thô kệch như `Pop - Hiện chữ nảy tròn chuẩn TVC 01.mp3`, `Pop - Hiện chữ nảy nhẹ gọn 02.mp3`, `Slide - Tiếng trượt chữ bay lên/ngang.mp3`, `Cute pop`, `Poyoi`, `Magic Reveal`, `Notification`).
   - **Bộ SFX Sang Trọng Chuẩn TVC Đã Kiểm Thính Thực Tế** (trong `Z:\Máy tính khác\My Computer\Document HT Media\TLH\Edit\02_Hiệu Ứng Âm Thanh (SFX)`):
     - *Lướt chữ / Thẻ nổi hiện đại êm ái*: `Whoosh - Title Swoosh (1s).mp3`, `Whoosh - Fast Swoosh Pop 01 (1s).mp3`, `Whoosh - Fuwa short wind noise swipe etc(222764) (1s).mp3`, `Whoosh - Swish Sound 1(1695850) (1s).mp3`, `Whoosh - Short Whoosh 2 (1s).mp3`, `Whoosh - Hiện chữ mượt tiêu chuẩn TVC.mp3`, `Whoosh - Gió lướt chữ nhẹ (Swoosh 02).mp3`.
     - *Điểm chạm thẻ Bento / Checklist tinh tế (không tiếng bụp miệng)*: `Click & Máy Chữ - click (1s).mp3`, `Đời Thường & ASMR - The sound that deals with the Shap Schat card (1s).mp3`, `Đời Thường & ASMR - Paper page turn sound 1 scene change swipe (1s).mp3`, `Chụp ảnh - Tiếng chụp màn hình gọn 03.mp3`.
     - *Chuông gió & Ánh kim sang trọng (chỉ điểm xuyết tiết chế ở mở màn / sản phẩm chủ đạo / kết bài)*: `Ting & Chuông Đúng - Chimes 6115_04_1 (7s).mp3`, `Ting & Chuông Đúng - Bell sound title animation(954662) (2s).mp3`, `Lấp Lánh & Phép Thuật - Shine_03 (1s).mp3`, `Ding - Tiếng chuông ngân trong trẻo.mp3`.
   - **Âm lượng & mật độ bắt buộc**: Đặt `volume = 0.09 – 0.13` (`-18` đến `-21 dB`) kèm `audio_fade` mượt; tiết chế đúng điểm nhấn, không bắn SFX ở mọi vết cắt Hard Cut.

6. **Cập Nhật Đồng Thời Cả Root & Active Sub-Timeline Trong CapCut `v193.0.0` (`unlink()` Trước Khi Ghi & Chỉ Giữ 1 Dự Án Duy Nhất)**:
   - Luôn chỉ chỉnh sửa trực tiếp trên **1 dự án duy nhất** của khách (không tự ý nhân bản thêm project phụ gây rối màn hình chính CapCut), kiểm tra `.locked == False` trước khi ghi, `unlink()` rồi mới ghi đồng bộ cả 4 tệp (`draft_content.json`, `template-2.tmp`, `Timelines/<main_timeline_id>/draft_content.json`, `Timelines/<main_timeline_id>/template-2.tmp`) để tránh lỗi hardlink ghi đè chéo, và đăng ký đầy đủ tài nguyên vào `draft_meta_info.json` (`type == 0`).

7. **Triệt Tiêu 100% Lỗi Cắt Đáy Ảnh (`0.8804 Crop Bug`) & Lỗi Méo Bầu Dục Lớp Phủ Tròn (`1:1 -> 9:16 Oval Stretch Bug`)**:
   - **Bắt buộc reset `FULL_CROP_1_1`**: Khi nhân bản template `materials.videos` (cả `video` lẫn `photo`) từ dự án cũ, phải ghi đè tường minh `"crop": {"upper_left_x": 0.0, "upper_left_y": 0.0, "upper_right_x": 1.0, "upper_right_y": 0.0, "lower_left_x": 0.0, "lower_left_y": 1.0, "lower_right_x": 1.0, "lower_right_y": 1.0}`, `"crop_ratio": "free"`, `"crop_scale": 1.0` — tuyệt đối không để sót thông số crop cũ (như `lower_left_y: 0.8804`) làm cắt cụt 12% cạnh dưới của Banner/Ảnh.
   - **Lớp Phủ Hình Tròn Sản Phẩm (`Clean Circular Product Badges`)**: Khi tạo các icon/huy hiệu tròn minh họa thành phần & sản phẩm (viền tròn mảnh sạch sẽ, **tuyệt đối không vẽ cán kính lúp rườm rà**), phải xuất trên **khung PNG trong suốt đúng tỷ lệ khung hình dự án (`1080×1920` cho dự án `9:16`)** đặt tâm hình tròn tại `(540, 960)` kết hợp `clip.scale = {"x": sc, "y": sc}` đồng nhất và `common_keyframes = []`. Không đưa ảnh vuông `720×720` (`1:1`) trực tiếp vào segment template `9:16` vì CapCut sẽ kéo dãn trục dọc `1.78×` biến hình tròn thành hình bầu dục đứng.

8. **Giữ Nguyên Khung Gốc Tự Nhiên Cho Video Lớp Phủ (`scale = 1.0, pos = (0,0)`) & Đồng Bộ Đa Góc Máy `DJI` Khớp Miệng (`2.5ms Audio Cross-Correlation`)**:
   - Với các source video lớp phủ dọc `9:16` trên `Track 1`, giữ nguyên khung hình gốc tự nhiên (`clip.scale = {"x": 1.0, "y": 1.0}`, `clip.transform = {"x": 0.0, "y": 0.0}`, `common_keyframes = []`), không tự ý phóng to/kéo lệch làm vỡ bố cục quay.
   - Khi bộ source có thêm máy phụ quay song song (như `DJI Osmo Pocket` quay cùng lúc với máy chính), dùng tương quan chéo biên độ âm thanh `400Hz` (`2.5ms` — mịn gấp 12 lần 1 frame hình) để tìm độ lệch `offset_s` chính xác tuyệt đối, đặt điểm xuyết các đoạn `DJI` lên `Track 1` khớp miệng 100% theo đúng `speed` của `Track 0` (chỉ chọn các đoạn máy phụ lấy trọn vẹn gương mặt & khẩu hình, không chọn đoạn mặt bị cắt nửa ở mép khung).
   - **Banner Kết Bài (Outro Card) & Vùng An Toàn TikTok × Reels `9:16` (`safe_zone_9x16.py`)**: Luôn thiết kế đồng bộ 100% theo **bảng màu nhận diện của Logo thương hiệu** (ví dụ `F20`: Trắng Mint + Xanh Lá Ngọc `#009E49` + Xanh Dương Hoàng Gia `#2563EB`). Mọi Text, Phụ đề, Thẻ Bento, Huy hiệu tròn & Lớp phủ trong video dọc `1080×1920` **cấm tuyệt đối chạm vào 5 Vùng Đen Cấm**: Đỉnh `Y = 0..248px` (`CapCut Y > +0.74`), Đáy `Y = 1548..1920px` (`CapCut Y < -0.61`, lề đáy an toàn `>= 375px`), Lề trái `X = 0..52px`, Lề phải trên `X = 1026..1080px` (`Y < 860px`), và Cột nút tương tác phải-dưới `X = 886..1080px` suốt `Y = 860..1548px` (ở nửa dưới `Y >= 860px`, mọi text/overlay phải dừng trước `X <= 884px`).

---

## 5. Sử Dụng Script Tự Động Hóa (`capcut_pro_engine.py`)

Chạy lệnh sau để phân tích (audit) hoặc tự động nâng cấp (upgrade) bất kỳ dự án CapCut nào:

```powershell
# 1. Phân tích & chấm điểm dự án theo chuẩn cá nhân + gợi ý nâng cấp:
python "Z:\Drive của tôi\AI_Full_Studio\01_Skills\capcut-pro-editor\scripts\capcut_pro_engine.py" audit "<Tên dự án CapCut>"

# 2. Tự động áp dụng gói Pro Upgrade (có tự động tạo bản sao lưu .bak):
python "Z:\Drive của tôi\AI_Full_Studio\01_Skills\capcut-pro-editor\scripts\capcut_pro_engine.py" upgrade "<Tên dự án CapCut>" --micro-fade --micro-zoom --text-fade
```
