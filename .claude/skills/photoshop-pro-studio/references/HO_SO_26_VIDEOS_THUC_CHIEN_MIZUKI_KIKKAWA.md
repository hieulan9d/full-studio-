# Hồ Sơ Phân Tích Trực Tiếp 26 Video `.MP4` Của Mizuki Kikkawa (`1440p` Frame-by-Frame)

Tài liệu này được đúc kết từ việc **tải trực tiếp và xem trọn vẹn từ đầu đến cuối 26 video hướng dẫn gốc (`.mp4`)** của **Mizuki Kikkawa** (`https://www.facebook.com/profile.php?id=100008006534752`), bao gồm cả bản quay màn hình `1440×2560` ghi rõ **từng con số thanh trượt trên màn hình làm việc thật của tác giả**.

- **Thư mục lưu 26 video `.mp4` gốc**: `Z:\Máy tính khác\My Computer\[2] ẢNH DỰ ÁN NGOÀI\photoshop\04_Videos_Mizuki_Goc\`
- **Thư mục 18 ảnh chụp bảng thông số `2K` trích từ video `19`**: `04_Videos_Mizuki_Goc\Bang_Thong_So_2K_Tu_Video\`

---

## 1. Bảng Thông Số Gốc Chính Xác 100% Đọc Từ Màn Hình Của Mizuki (`Video 19 — 885859187720596`)

### A. Bảng Ánh Sáng Cơ Bản (`基本補正 / Basic Tone` — `sec_04.2` & `sec_07.2`)
| Thanh trượt (Nhật / Anh) | Con số chính xác | Giải nghĩa kỹ thuật của Mizuki |
| :--- | :---: | :--- |
| **White Balance (`ホワイトバランス`)** | `As Shot (0 / 0)` | **Giữ nguyên cân bằng trắng lúc chụp**, tuyệt đối không kéo vàng toàn ảnh! |
| **Exposure (`露光量`)** | `+0.45` | Nâng tổng thể ảnh sáng thoáng ngay từ đầu |
| **Contrast (`コントラスト`)** | `+9` | Giữ độ trong, không làm phẳng đục |
| **Brightness (`明度`)** | `+11` | Nâng nhẹ vùng trung gian (Midtones) |
| **Highlights (`ハイライト`)** | `-70` | Kéo sâu vùng cháy sáng để cứu trọn chi tiết hoa/áo trắng/má nắng |
| **Shadows (`シャドウ`)** | `+56` | Mở rộng chi tiết vùng tối toàn khung trước, sau đó mới **dìm chọn lọc ở góc bằng Mask**! |
| **Whites (`白レベル`)** | `+10` (đến `+17`) | Giữ điểm trắng trong trẻo lấp lánh |
| **Blacks (`黒レベル`)** | `0` | Không ép đen toàn khung ở bảng Basic |
| **Clarity (`明瞭度`)** | `+10` | Tăng độ nét vi tương phản (không kéo âm làm bệt ảnh) |
| **Dehaze (`かすみの除去`)** | `-5` | **Bí quyết tạo lớp sương nắng mơ màng kiểu kính lọc `Black Mist 1/4`!** |
| **Vibrance (`自然な彩度`)** | `-7` | Hạ nhẹ độ gắt màu trung gian để da không bị rực cam |
| **Saturation (`彩度`)** | `+3` | Bù nhẹ độ tươi cho sắc màu chính |

### B. Đường Cong `Tone Curve` (`トーンカーブ` — `sec_07.2`)
- Nhấc nhẹ điểm đen đầu mút trái (`Input 0 -> Output ~6`) tạo độ êm phim Nhật.
- Khóa điểm giữa `(128, 128)`, nhấc nhẹ vùng sáng trung gian `(192 -> 198)` và ghim êm điểm trắng `(255 -> 252)`.

### C. Bảng Màu `HSL` Chính Xác Từng Con Số (`sec_07.9` – `sec_12.1`)
1. **Hue (`色相`)**:
   - `Green (グリーン)`: **`-17`** *(tùy bối cảnh kéo `-17` hoặc nhích sang xanh lục bảo; các kênh khác để `0`)*.
2. **Saturation (`彩度`)** — *Chìa khóa tạo chất màu Mizuki*:
   - `Red (レッド)`: **`+33`** *(đẩy sắc đỏ hoa/trang phục lên tươi trong rực rỡ)*.
   - `Orange (オレンジ)`: **`0`** *(giữ nguyên màu da tự nhiên, không đẩy cam!)*.
   - `Yellow (イエロー)`: **`-23`** *(khử sạch sắc vàng úa trên lá cây & mặt đất)*.
   - `Green (グリーン)`: **`-55`** *(**giảm mạnh `-55` độ rực xanh lá** — đây chính là lý do lá cây của Mizuki luôn trầm tĩnh, sang trọng, không bao giờ xanh chuối chói mắt!)*.
   - `Aqua (アクア)`: **`+19`**
   - `Blue (ブルー)`: **`+20`** *(tăng độ trong thanh khiết cho sắc xanh dương/lam của hoa, kimono và bóng râm)*.
3. **Luminance (`輝度`)**:
   - `Yellow (イエロー)`: **`+50`** *(kết hợp với `Yellow Sat -23`: làm phần ngọn lá đón nắng sáng bừng trong veo như ngọc mà không bị vàng khè!)*.
   - `Aqua (アクア)`: **`+30`** *(làm sáng trong dải xanh ngọc)*.

### D. Retouch Da & Tóc Tự Nhiên (`sec_12.6` – `sec_17.8`)
- **Toàn bộ thanh xóa nếp nhăn mắt/mũi/miệng (`シワ消し`)**: **Để `0` tuyệt đối** (giữ 100% bọng mắt cười & thần thái tự nhiên).
- **Màu da (`肌色を選択`)**: Chọn ô số `#1` (trắng sứ hồng nhạt) ở mức rất nhẹ **`25 / 100`** (`Temp 0, Tint 0`).
- **Xóa tóc con rối viền đầu (`ほつれ毛除去`)**: **`72`**.

---

## 2. Giải Mã Bí Mật "Tại Sao Background Của Mizuki Rất Tự Nhiên, Không Bị Tách Giả?" (`sec_21` – `sec_36.2` & 25 Videos Còn Lại)

Khi xem trọn vẹn chuyển động kéo Mask trong cả 26 video, quy luật quan trọng nhất lộ rõ:
> **Mizuki HẦU NHƯ KHÔNG BAO GIỜ chọn `Invert Subject (Toàn bộ Background)` rồi kéo tối sập cả nền xuống `-0.5 EV`!** Làm vậy sẽ khiến người và nền bị lệch tông giả tạo. Thay vào đó, anh ấy tạo chiều sâu bằng **Ánh sáng chuyển tiếp quang học (`Linear` + `Radial`) ở các góc biên** kết hợp tinh chỉnh tương phản trên chủ thể:

1. **Bước 1 — Đọc hướng nắng & Mở sáng hướng mắt nhìn (`光の方向を読んで・目線の先を明るく`, `sec_26.2`)**:
   - Đặt 1 `Radial Gradient` lớn tại góc hướng nắng chiếu tới (hoặc khoảng không trước ánh mắt mẫu nhìn):
   - Thông số chính xác: **`Exposure = +0.50`**, **`Brightness = +22`**, **`Highlights = -4`**.
2. **Bước 2 — Dìm nhẹ các góc tối bằng `Linear Gradient` (`主役の顔に視線がいくように・影の部分を暗く`, `sec_28.2` & `sec_31.2`)**:
   - Kéo 2 đường `Linear Gradient` chéo rất rộng từ góc dưới / góc khuất nắng (tự động lan êm từ biên vào, **không cắt gắt theo viền người**!):
   - Góc phụ: **`Exposure = -0.30`**
   - Góc tiền cảnh dưới: **`Exposure = -0.45`**
3. **Bước 3 — Bí quyết "Tăng sáng nhưng Hạ bóng" trên Chủ thể (`モデルの明るさを微調整 / +人物全体`, `sec_36.2`)**:
   - Chọn `Select Person`, áp thông số cực kỳ tinh tế:
   - **`Exposure = +0.25`** · **`Contrast = +5`** · **`Highlights = +7`** · **`Shadows = -16`**!
   - *Giải thích*: Nâng `Exposure +0.25` giúp da mặt bừng sáng, nhưng kéo ngược **`Shadows = -16` và `Contrast = +5`** giúp mái tóc đen, hàng mi và nếp áo giữ nguyên độ đen sâu 3D, không bị bạc phếch!

---

## 3. 7 Kỹ Thuật Micro-Mask Nâng Cao Khác Phát Hiện Từ Các Video `03` – `25`

1. **Cân bằng nhiệt độ màu vùng bóng đổ trên mặt (`Video 10` — `Mask4 +WB: +顔の影の色温度を整える`)**:
   - Dùng cọ Brush tô riêng nửa bên má khuất bóng của mẫu và đẩy nhẹ `+Temp / +Tint` để vùng da trong bóng râm không bị xỉn xanh/xám lạnh mà tiệp màu hồng hào với bên má đón nắng.
2. **Tách ngược chủ thể khỏi quầng sáng (`Video 21` — `Love my Edit 6step`: `Mask2 Glow` -> `Mask3 -Delete Subject`)**:
   - Khi chụp ngược sáng mạnh, tạo `Radial Glow` lớn phía sau đầu mẫu rồi bấm **`Subtract Subject (-Delete Subject)`** để ánh sáng mù sương chỉ tỏa sau lưng mà không làm mờ đục mái tóc và gương mặt mẫu!
3. **Chấm sáng tròng mắt khi ngược sáng (`Video 21` — `Mask5 +Eye Exposure`)**:
   - Dùng cọ nhỏ chấm đúng 2 tròng mắt (`+Exposure` nhẹ) để đôi mắt long lanh có hồn dù đứng ngược nắng.
4. **Hạ chói đỉnh tóc đen ngày âm u (`Video 04` — `Mask4 -highlight: -髪の毛のハイライトを下げる`)**:
   - Ngày trời mây trắng dễ làm đỉnh tóc đen bị lóa xám; Mizuki dùng cọ quét đỉnh tóc kéo `-Highlights` để tóc đen nhánh mượt mà.
5. **Khử vàng đất/đường đi (`Video 05` — `Mask4 -Saturation: -地面の黄色っぽさを下げる`)**:
   - Tô cọ dưới mặt đất/lối đi giảm `-Saturation` để màu đất vàng không làm bẩn tông ảnh.
6. **Hạ độ sáng hoa/lá tiền cảnh quá rực (`Video 06, 09, 16` — `-Green Shadow / -Orange Shadow / -Red brightness`)**:
   - Khi có cụm hoa đỏ/cam/lá xanh nằm sát ống kính ở tiền cảnh quá sáng, dùng Brush hạ nhẹ `-Luminance` của cụm tiền cảnh đó để không tranh chấp với gương mặt mẫu.
7. **Tăng `Texture` cho chủ thể ở cảnh toàn rộng (`Video 23` — `Mask3 +Subject Detail: +被写体のテクスチャをあげて立体的に`)**:
   - Ở ảnh góc rộng có sương mờ, chọn `Subject` tăng nhẹ `+Texture` để người mẫu nổi nét khối rõ ràng giữa rừng sương.
