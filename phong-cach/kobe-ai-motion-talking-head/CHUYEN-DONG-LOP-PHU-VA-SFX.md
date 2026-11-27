# Giải Phẫu Chuyển Động Lớp Phủ (Overlay Physics) & Nghệ Thuật Đi SFX Của 2 Video Mẫu

Tài liệu này được đo trực tiếp bằng **10 dải khung hình tốc độ cao (`0.15s – 0.25s/khung`)** và **Phổ tần âm thanh Log-FFT (`showspectrumpic`)** từ 2 video Kobe Media. Mọi dự án dựng theo kit `kobe-ai-motion-talking-head` bắt buộc áp dụng đúng **6 quy luật Vật lý Lớp phủ** và **4 quy luật Đi SFX Vi mô** dưới đây để tạo cảm giác "mượt, có trọng lượng thật và sướng tai".

---

## PHẦN 1: 6 Kỹ Thuật Chuyển Động Lớp Phủ (`Overlay Motion Physics`)

### 1. Màn Trập Tròn Mở/Đóng Mặt Người (`Iris Circle Wipe` trên `Circle PiP`)
- **Đo thực tế (`v2_strip1` `3.14s`, `v2_strip2` `20.02s` & `22.48s`)**:
  - Khi cắt từ cảnh A-Roll toàn khung sang Sân khấu Đồ họa (hoặc ngược lại), hình người bên trong khung tròn **không bật/tắt khô cứng**.
  - Có một **hình tròn màu trung tính đồng tông áo/nền (`#8C856B` / `#CED8FA`) đóng vai trò màn trập (`Iris Mask`)**:
    - **Lúc vào PiP (`6–8 frames` = `0.22s`)**: Hình người nở từ tâm tròn ra sát viền (`clip-path: circle(0% at 50% 50%) -> circle(50% at 50% 50%)`, `ease: expo.out`).
    - **Lúc thoát PiP về A-Roll toàn cảnh (`6 frames` = `0.20s`)**: Hình tròn thu sập nhẹ vào tâm ngay trước vết cắt về A-Roll lớn → mắt người xem được dẫn hướng liền mạch 100%, không bị giật khung!
  - *(Ở Biến thể Dark 16:9 `v1_strip2` `14.94s → 15.25s`)*: Người nói tách nền thu nhỏ mượt từ chính giữa sân khấu trượt chéo xuống góc dưới phải rồi khóa vào viền tròn Cyan!

### 2. Thẻ Rơi Đàn Hồi + Vòng Sóng Chạm Đất (`Drop-Bounce + Landing Ripple Ring`)
- **Đo thực tế (`v2_strip1` `3.14s`, `3.95s → 4.22s`, `5.04s`)**:
  - Mỗi thẻ UI (`1. 10 Kịch Bản`, `2. Quảng Cáo`, `3. Bài Giảng`) rơi từ trên xuống theo quỹ đạo có trọng lực:
    - `y`: `-135px → +9px → 0px` trong `0.28s` (`spring` có nhún nhẹ `overshoot ~6%`).
  - **Chi tiết đắt giá tạo "trọng lượng vật lý"**: Ngay frame đáy thẻ chạm xuống mặt đường ray (`t_land`), một **vòng elip xanh mảnh (`Landing Ripple Ring`, `border: 2px solid #7B93FA`)** bung tỏa ngang dưới chân thẻ (`scaleX: 0.25 -> 1.35`, `scaleY: 0.25 -> 0.55`, `opacity: 0.85 -> 0` trong `0.26s`)!

### 3. Mở Nét Quang Học Hai Chiều (`Bidirectional Optical Blur-Focus`)
- **Đo thực tế (`v1_strip3` `34.50s → 35.21s`, `v2_strip1` `6.39s → 6.93s`, `v2_strip2` `22.26s`)**:
  - Mọi nhãn chữ `Pill Sticker` (`KHÓA HỌC MỚI`, `DỰ ÁN DÀI`, `XỬ LÝ LIÊN HOÀN`) và cả các cụm minh họa mới **không bao giờ chỉ `opacity 0 -> 1`**.
  - **Vào (`0.26s` = `8 frames`)**: `filter: blur(18px) -> blur(0px)` đồng thời `scale: 0.92 -> 1.00`, `opacity: 0 -> 1` (`ease: power3.out`).
  - **Ra (`0.20s` = `6 frames`)**: Trước khi chuyển cảnh, nhãn chữ nhòe mở nhẹ `blur(0px -> 14px)` + `opacity: 1 -> 0` (`22.26s`).

### 4. Leo Thang Trạng Thái + Hạt Vật Lý Nổ Rơi (`State Escalation + Gravity Particles`)
- **Đo thực tế (`v2_strip3` `27.0s → 30.2s` & `v1_strip5` `150.7s → 159.0s`)**:
  - Lớp phủ không đứng yên sau khi hiện ra mà **biến đổi trạng thái theo đúng cao trào giọng đọc**:
    - *Ví dụ Bình Bộ Nhớ (`v2`)*: Các viên dữ liệu nhỏ rơi từ trên vào bình → mực pin dâng 5 nấc đổi màu **Xanh `#3656FB` → Vàng `#C8C44B` (`29.0s`) → Đỏ `#F36659` (`29.2s`)** → nắp bình tóe tia chớp cảnh báo → bung nhãn `BỊ ĐẦY BỘ NHỚ` kèm **8–10 hạt chấm tròn đỏ bắn tung lên cao rồi rơi xuống theo parabol trọng lực (`29.6s – 30.2s`)**!
    - *Ví dụ Chuỗi DNA (`v1`)*: Khi 4 ô màu thương hiệu hiện ra ở trên, các hạt của chuỗi xoắn kép bên dưới **nhuộm đổi màu theo từng ô màu** (lóe sáng tâm ở `153.71s`), chữ `AA` đổi sang `Aa`, ô vuông xoay biến hình thành hình tròn (`Shape Morph`).

### 5. Sợi Dây Dẫn Đường Kéo Camera (`Thread-Line Camera Follow`)
- **Đo thực tế (`v1_strip3` `38.03s → 40.50s` & `v2_strip4` `38.48s → 39.72s`)**:
  - Hai cảnh đồ họa không cắt đứt quãng mà luôn có **một sợi dây sáng Cyan (hoặc đường ray nét đứt)** phóng vọt sang ngang trước (`strokeDashoffset` chạy trước `0.15s`), sau đó **Camera trượt ngang (`pan X`) bám theo đầu sợi dây** dẫn mắt khán giả tới vật thể tiếp theo (như từ cái Kéo cắt dây chạy sang Hộp Quà số `2`, hoặc từ ô `1.000.000 TOKEN` lướt xuống 4 thẻ `1 🔗 2 🔗 3 🔗 4` khóa mắt xích vào nhau!).

### 6. Lật Thẻ Siêu Tốc + Huy Hiệu Nhảy Số (`Rapid Riffle 1 → 10`)
- **Đo thực tế (`v2_strip5` `55.58s → 58.21s` — chỉ `2.6 giây` lướt qua 10 kịch bản)**:
  - Thay vì chiếu chậm gây nhàm chán, nội dung bên trong khung thẻ cuộn lướt tốc độ cao với `motion blur` dọc nhẹ, trong khi góc phải trên giữ nguyên vị trí **Huy hiệu đen nảy nhịp `scale: 1.08 -> 1.00`** đếm `KỊCH BẢN 1 → 2 → 4 → 5 → 7 → 9 → 10` và 3 dấu tích xanh `✓` nháy xác nhận liên hoàn!

---

## PHẦN 2: Nghệ Thuật Đi SFX ("Xúc Giác Vi Mô" — Tactile Micro-SFX)

Phân tích phổ tần `spec_v1_30s.png` & `spec_v2_35s.png` cùng phép đo RMS cho thấy **4 bí quyết làm nên chất âm cực sang của 2 video**:

### 1. Chất Âm: "UI Xúc Giác Nhỏ Gọn (`30–120ms`)", Tuyệt Đối Không Dùng Tiếng Nổ To Rẻ Tiền
- Không có tiếng `Boom` rền vang hay tiếng còi/meme hài nhảm.
- Toàn bộ SFX thuộc nhóm **Foley / Tactile UI ngắn gọn, giàu dải `2.5 kHz – 15 kHz`**: tiếng *Pop bọt khí mềm*, *Click chuột/phím cơ đầm*, *Tiếng sột soạt lật thẻ giấy (`Card Flip/Slide`)*, *Tiếng lưỡi kéo khép gọn (`Crisp Snip`)*, *Tiếng khóa mắt xích kim loại mảnh* và *Tiếng chuông thủy tinh rất khẽ (`Soft Ping`)* khi hoàn tất.

### 2. Vị Trí Đặt Mốc (`Timing Sync`): Trùng Khít Điểm Chạm + Bám Nhấn Giọng (`0` SFX Rơi Lạc Lõng)
- **SFX Va chạm (`Pop`, `Click`, `Tick`, `Snip`, `Lock`)**: Đặt **đúng `0ms` tại frame vật thể chạm đích** (frame vòng sóng chạm đất, frame mắt xích khóa lại, frame dấu `✓` hiện lên), đồng thời khớp vào từ nhấn của người nói (`0` tiếng SFX bị rơi lạc lõng vào khoảng im lặng!).
- **SFX Chuyển động (`Soft Airy Whoosh`)**: Dùng tiếng gió mềm đã cắt bớt tần số chói, đặt **sớm hơn chuyển động trượt Camera `3–4 frames` (`-0.10s` đến `-0.13s`)** để đỉnh gió trùng đúng lúc Camera đạt vận tốc cao nhất.

### 3. Chuỗi SFX Tăng Cấp (`Escalating Pitch & Riffle`)
- Khi 3–4 thẻ rơi liên tiếp (`1 → 2 → 3 → 4`) hoặc cột pin đầy bộ nhớ dâng `5` vạch: tăng nhẹ `pitch` mỗi nấc **`+1` đến `+1.5 semitone`** (tạo cảm giác dâng trào tự nhiên), chốt bằng 1 tiếng *Alert Ping / Pop* rõ nét ở nấc cuối cùng.
- Khi lướt nhanh `Kịch bản 1 → 10` (`55.5s – 58.2s`): dùng chuỗi *Tick-Tick-Tick-Tick* tốc độ cao (như bánh răng/lật thẻ bài) rồi chốt 1 tiếng *Glass Chime* êm khi dừng ở `KỊCH BẢN 10`.

### 4. Tỷ Lệ Âm Lượng Chuẩn Đo Từ Mẫu (`Gain Staging`)
- **Giọng đọc chính (`Voice`)**: Dày, cắt sát nhịp nghỉ (`J-cut` `0.08s`), mức chuẩn **`-14.0` đến `-15.5 LUFS`** (`RMS ~ -20 dBFS`).
- **Lớp `Micro-SFX`**: Nằm dưới giọng đọc từ **`-9 dB` đến `-14 dB`** (nghe rõ độ "nảy" xúc giác nhưng không bao giờ che lấp phụ âm lời nói).
- **Nhạc nền (`Minimal Tech Pulse / Lo-fi`)**: Nằm sâu dưới giọng đọc **`-13.5 dB` đến `-15.7 dB`** (`RMS ~ -35 dBFS`), giữ nhịp đều đặn suốt bài.

### 5. Bảng Ánh Xạ Chính Xác Từng Chuyển Động Với Kho SFX Có Sẵn Trên Máy Bạn

Khi dựng theo phong cách này trong `Full Studio`, sử dụng trực tiếp các file SFX đã chuẩn hóa sẵn (tại `BO_KIEN_THUC_TVC_AI_PORTABLE/03_TAI_NGUYEN_DUNG_CHUNG/audio_bgm_sfx/`, `phong-cach/saas-animation/audio/sfx/` và `Z:\Máy tính khác\My Computer\Document HT Media\TLH\Edit\02_Hiệu Ứng Âm Thanh (SFX)\`):

| Chuyển động Lớp phủ trên màn hình | Mốc đặt so với hình | Mức dB dưới Voice | File SFX chuẩn trên máy bạn |
| :--- | :---: | :---: | :--- |
| **Thẻ UI rơi chạm đường ray + bung vòng sóng (`Drop-Bounce + Ripple`)** | `0ms` (đúng frame chạm đáy) | `-11 dB` | `sfx_pop_clean.mp3` · `Pop - Hiện chữ nảy nhẹ gọn 02.mp3` (`+1 semitone` mỗi thẻ tiếp theo) |
| **Nhãn chữ `Pill Sticker` mở nét `Blur-Focus` / Bật dấu tích `✓`** | `0ms` | `-13 dB` | `sfx_click_soft.mp3` · `Click & Máy Chữ - click (1s).mp3` · `Thông báo - Chuông hiện chữ tinh tế (Notification).mp3` |
| **Camera trượt ngang bám sợi dây sáng (`Thread-Line Pan`) / Mở `Iris PiP`** | Sớm `-110ms` (`-3 frames`) | `-10 dB` | `sfx_whoosh_soft.mp3` · `Whoosh - Gió lướt chữ nhẹ (Swoosh 02).mp3` |
| **Gõ câu lệnh Prompt / Chữ tự chạy trong khung Chat** | Theo cụm gõ chữ | `-14 dB` | `Click & Máy Chữ - 打字-102214 (1s).mp3` · `typing_a.wav` |
| **Lướt đếm nhanh `Kịch bản 1 → 10` (`Rapid Card Riffle`)** | Dọc suốt `2.5s` cuộn + chốt cuối | `-13 dB` | `Đời Thường & ASMR - The sound that deals with the Shap Schat card (1s).mp3` + `tick_a.wav` → chốt bằng `sfx_ping_glass.mp3` |
| **Kéo cắt dây bẫy / Trượt thẻ giấy (`Snip / Slide`)** | `0ms` (khép lưỡi kéo) | `-11 dB` | `Đời Thường & ASMR - Cut paper with a cutter 03(1487879) (1s).mp3` · `Hoạt Hình & Hài - 01 Paper slide (1s).mp3` |
| **Đầy tràn bộ nhớ / Đổi màu chuỗi `DNA Độc Bản`** | Dâng `5` nấc → bung hạt | `-12 dB` → `-9 dB` | `pop_a.wav` tăng cao độ 5 nấc → chốt `sfx_sparkle_shine.mp3` / `Ting - Chuông Ting nảy ý tưởng.mp3` |
