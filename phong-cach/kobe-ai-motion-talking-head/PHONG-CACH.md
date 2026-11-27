# Kit Phong Cách: Kobe AI Motion × Talking Head (2 Biến Thể Dark Stage & Light SaaS UI)

Tài liệu này đúc kết từ việc đo đạc từng khung hình (`refkit.py` + `22` khung độ phân giải gốc) trên 2 video mẫu thực chiến trong kho `TLH`:
1. **Biến thể A — `Dark Cyber Letterbox (16:9 trong 9:16)`**: *Đừng Dùng AI Edit Video Nếu Chưa Có Tư Duy Này* (`185.1s`, `30fps`, nền tối `#14161a` + `#000000`, điểm nhấn Cyan `#36ccc8` & Cam `#f26b21`).
2. **Biến thể B — `Light Pastel Dot-Grid UI (Full 9:16)`**: *Một câu prompt ra 10 kịch bản, ads, bài giảng và landing page* (`100.7s`, `30fps`, nền sáng `#eff1f7` → `#ced8fa`, điểm nhấn Xanh Cobalt `#3656fb` & Đỏ Coral `#f36659`).

---

## 1. Triết Lý Dựng Chung Của Cả 2 Video (Khác Biệt Hoàn Toàn Với Talking Head Đại Trà)

1. **KHÔNG rải phụ đề từng từ (Zero Karaoke Subtitles)**:
   - Cả 2 video **bỏ hoàn toàn phụ đề chạy từng chữ ở ngực/bụng**. Khán giả không đọc chữ chép lại lời nói, mà nhìn vào **Đồ họa trực quan hóa ý tưởng (Visual Metaphor / UI Simulation)** trên sân khấu chính!
2. **Luân phiên nhịp "Mặt Thật Toàn Cảnh (Trust)" ↔ "Sân Khấu Motion + Mặt Tròn PiP (Retention)"**:
   - **Cảnh Mở Đầu (Hook `0–3s`), Chuyển Ý Lớn & Kết (CTA)**: Cắt về **A-Roll người nói phóng lớn** (chiếm `100%` vùng khung hình, tách nền đặt **Chữ/Số khổng lồ phát sáng sau lưng đầu** hoặc nhãn Sticker nổi bật trước ngực).
   - **Cảnh Giải Thích / Chứng Minh (`75–80%` thời lượng)**: Thu người nói vào **Khung Tròn (`Circle PiP`)** có viền màu thương hiệu phát sáng nhẹ, nhường toàn bộ không gian chính cho **Sân khấu Motion Graphics liền mạch** (sơ đồ dây nối, hộp quà mở nắp, cuộn phim, giao diện phần mềm gõ chữ/cuộn trang thật).
3. **Chuyển cảnh bằng Camera Trượt Trên Bàn Cờ Vô Tận (`Infinite Canvas Pan & Morph`) thay vì cắt rời rạc**:
   - Thay vì mỗi câu hiện 1 ảnh tĩnh rồi tắt, các vật thể nằm trên một mặt lưới tọa độ (`Grid` hoặc `Dot-Matrix`); camera trượt ngang/dọc mượt (`ease: power3.inOut`, `0.45s – 0.65s`) theo đường dây dẫn sáng nối từ ý `1 → 2 → 3 → 4`.
4. **Quy Luật Chữ Khổng Lồ (`Zero Micro-Text`: `>= 38px – 72px`) & Lấp Đầy Khoảng Trống (`Dense Bento Stage` — Đúc kết từ 5 Reels trên Fanpage Kobe Media)**:
   - **Cấm chữ nhỏ li ti (`< 36px`)**: Mọi nhãn tiêu đề / Pill Sticker dùng font dày **`54px – 72px ExtraBold`** (`2–5 từ`), phối 2 màu (Đen `#0F172A` + Xanh `#2563EB` / Đỏ `#E11D48` / Cam `#F97316`). Các ô nhánh / Bento dùng **`38px – 50px ExtraBold`** (`1–4 từ`) đi kèm **Icon đồ họa lớn (`76px – 130px`)** hoặc **Số thứ tự lớn (`64px – 84px`)**.
   - **Lấp kín không gian trống**: Khung sân khấu chính phủ sát biên vùng an toàn (`X = [52..1026px]` nửa trên, `X = [52..884px]` nửa dưới `Y >= 860px`), chia thành **Lưới Bento Đặc Khít (`2×2`, `Split 55/45`, hoặc `2 Thanh Impact Lớn`)** có nền màu pastel/tối tách biệt, khe hở chỉ `12px – 16px`, nối qua đường phân cách ngang xuống `Circle PiP` lớn (`360px – 390px`) để không bao giờ lộ khoảng trắng chết.

---

## 2. Thông Số Kỹ Thuật Chi Tiết — Biến Thể A: `Dark Cyber 16:9-in-9:16` (Video 1)

| Thành phần | Thông số chuẩn quy đổi trên khung `1080×1920 @ 30fps` (đo từ mẫu) |
| :--- | :--- |
| **Khung Sân Khấu (`16:9` Letterbox)** | Rộng `1080px` × Cao **`608px`**, đặt chính giữa chiều dọc (`y = 656px → 1264px`). Phần trên (`0..656`) và dưới (`1264..1920`) là dải đen tuyền `#000000` (giúp mắt tập trung tuyệt đối vào tâm màn hình, không bao giờ bị nút Like/Caption TikTok che!). |
| **Nền Sân Khấu Motion** | Nền xám than `#17191e` phủ **lưới vuông mảnh (`Grid 36×36px`, nét `1px rgba(255,255,255,0.045)`)** + quầng sáng Radial nhẹ ở tâm `#262b34` + các icon mờ (`opacity: 0.08`, kéo, clapperboard, sao) trôi nhẹ ở hậu cảnh. |
| **Bảng Màu Thương Hiệu** | **Cyan Điện Tử `#36CCC8`** (màu chính, viền phát sáng) × **Cam Đồng `#F26B21`** (cảnh báo/điểm nhấn đối lập) × Chữ trắng `#FFFFFF`. |
| **Cảnh A-Roll Toàn Khung (`16:9`)** | Người nói ngồi giữa khung `1080×608`, tách nền RVM: đặt **Chữ IN HOA khổng lồ (`Anton` / `Montserrat Black` `115–145px`) hoặc Số khổng lồ (`280px`) phát sáng Cyan `#36CCC8` / Cam `#F26B21` nằm SAU LƯNG người nói** (`y ≈ 720..920px`). |
| **Khung Tròn Người Nói (`Circle PiP`)** | Đường kính **`246px`** (`r = 123px`), đặt cố định ở **góc dưới phải sân khấu** (`cx = 924px, cy = 1118px`). Viền tròn kép `4px #36CCC8` + Outer Glow `18px rgba(54,204,200,0.55)`. |
| **5 Cụm Hiệu Ứng Minh Họa Đắt Giá** | 1. **Sơ đồ tổng quan (`Overview Map`)**: Lưới 6–12 ô màn hình nhỏ viền Cyan nối bằng dây chấm đứt, sau đó camera zoom thẳng vào từng ô khi bắt đầu giải thích.<br>2. **Ẩn dụ "Cái Bẫy" (`Visual Trap`)**: Cái bẫy kẹp sắt + các nhãn đen viền cam (`AI AGENT`, `API`, `MODEL`) phóng dây cam trói chặt vào bẫy rồi cây kéo cắt đứt.<br>3. **Hộp Quà 3D Mở Nắp (`Skill Box`)**: Hộp đen buộc nơ Cyan trượt theo đường ray sáng, bung nắp bay ra thẻ `BỘ NÃO` / `SKILL`.<br>4. **Bảng Clapperboard + Cuộn Phim + 5 Sao Vàng**: Minh họa tư duy đạo diễn điện ảnh.<br>5. **Chuỗi Xoắn Kép DNA (`DNA ĐỘC BẢN`)**: 24 cột dọc có hạt tròn Đỏ – Xanh chạy sóng hình sin ngược pha nhau + 4 ô bảng màu chéo (`Color Swatches`) + chữ ký cá nhân. |

---

## 3. Thông Số Kỹ Thuật Chi Tiết — Biến Thể B: `Light Pastel SaaS UI 9:16` (Video 2)

| Thành phần | Thông số chuẩn đo trực tiếp trên khung `1080×1920 @ 30fps` |
| :--- | :--- |
| **Nền Sân Khấu (`Full 9:16`)** | Phủ kín `1080×1920` màu trắng xanh Periwinkle sáng (`#F4F6FC` kết hợp quầng loang mềm `#CED8FA` ở góc trên trái, độ sáng TB `197/255`) + **Lưới chấm bi mịn (`Dot Matrix` bước `32px`, chấm `3px` màu `#CBD2EC`)**. |
| **Bảng Màu Thương Hiệu** | **Xanh Cobalt `#3656FB`** (nhấn từ khóa, icon, đường ray) × **Đỏ Coral `#F36659`** (cảnh báo đầy bộ nhớ) × **Đen Mực `#141418`** (chữ chính & huy hiệu số). |
| **Khung Tròn Người Nói (`Bottom Circle PiP`)** | Đường kính **`416px`** (`r = 208px`), đặt **căn giữa trục ngang ở phần dưới màn hình** (`cx = 540px, cy = 1465px`). Viền kép cực sang: **vòng trắng trong `8px #FFFFFF` + vòng xanh mảnh ngoài `3px #8FA2F7` + bóng đổ mềm `0 18px 42px rgba(45,62,140,0.18)`**. |
| **Đường Ray Dẫn Chuyện (`Dashed Highway Track`)** | Một dải đường màu tím nhạt rộng `38px` (`#BCC7F8`), chính giữa có vạch đứt màu trắng (`stroke-dasharray: 18 18`), chạy xuyên từ cảnh này sang cảnh khác (ngang/vuông góc bo tròn) tạo cảm giác "luồng xử lý liên hoàn 1 mạch". |
| **Nhãn Tiêu Đề Nghiêng (`Tilted Pill Sticker`)** | Hộp thuốc bo tròn (`border-radius: 999px`), nền trắng tinh `#FFFFFF`, bóng đổ nhẹ, **xoay nghiêng nhẹ `-1.8°` đến `-2.2°`**, đặt tại `y ≈ 285px`. Font đậm hẹp (`Oswald Bold` / `Be Vietnam Pro ExtraBold` `56–64px`), phối 2 màu: nửa đầu Đen `#141418` + nửa từ khóa Xanh `#3656FB` (hoặc toàn bộ Đỏ `#F36659` khi báo lỗi `BỊ ĐẦY BỘ NHỚ`). |
| **Sân Khấu UI Nửa Trên (`y = 220px → 1160px`)** | 1. **Thẻ Đánh Số (`Numbered Step Cards`)**: 3–4 thẻ trắng bo góc `28px` (`280×360px`), góc trái trên đính huy hiệu tròn đen đánh số `1, 2, 3, 4`, icon nét xanh `#3656FB` ở giữa, tiêu đề 2 dòng bên dưới; nối nhau bằng mắt xích `🔗`.<br>2. **Bình Chứa Bộ Nhớ Đầy Tràn (`Memory Tank`)**: Khung bo góc viền đỏ chứa các thanh mức đỏ `#F36659` dâng đầy tràn lên trên.<br>3. **Mô Phỏng Tài Liệu & Quay Màn Hình Thật (`UI Card + Skeleton Blur`)**: Khung cửa sổ trắng bo góc `32px` (`980×920px`); các dòng chữ phụ được thay bằng thanh xám mờ (`Skeleton Bars`) để người xem chỉ tập trung đọc đúng tiêu đề `KỊCH BẢN 1..10` + huy hiệu đen góc phải + 3 dòng tích xanh (`✓ 3 HOOK`, `✓ CHI TIẾT`, `✓ FACEBOOK`). Khi chiếu cảnh quay màn hình thật, luôn gắn nhãn nhỏ góc trái dưới `Quay màn hình thật`. |
| **Cảnh A-Roll Xen Kẽ** | Cắt thẳng (`Hard Cut`) sang A-Roll toàn màn hình `9:16` dài `2.3s – 5.8s` tại các nhịp chuyển đoạn lớn (`0–3s`, `20–22.5s`, `32.3–35.3s`, `65.9–71.8s`, `96.7–100s`), có gắn **Pill Sticker 2 màu** nổi trước ngực (`DỰ ÁN DÀI`, `GEMINI 4 ARGON`, `BỨT PHÁ HIỆU SUẤT`). |

---

## 4. Cách Áp Dụng Ngay Trong `Full Studio` (HyperFrames + Chữ Gradient Tiếng Việt)

Khi dựng video theo một trong hai biến thể này trong `Full Studio`:
1. **Dùng HyperFrames (`1080×1920 @ 30fps`)** làm bàn dựng chính để vẽ mượt lưới `Grid` / `Dot-Matrix`, đường dây nối SVG `strokeDashoffset`, khung `Circle PiP` tách bóng và các thẻ UI mô phỏng.
2. **Nâng cấp theo DNA cá nhân của bạn (Ưu tiên Chữ Gradient)**:
   - Ở các chữ lớn sau lưng người nói (Biến thể A) và chữ từ khóa trong Pill Sticker / Tiêu đề (Biến thể B), kết hợp bộ **`39` Font Tiếng Việt TVC + `gradient-text-presets.css`** (`.grad-back` tách viền + `.grad-front` 5 điểm dừng + quét ánh kim) và kho **`448` hiệu ứng 3D/Final Cut Offline** (`focus-blur-resolve`, `spring-pop`, `tracing-beam`, `stagger-cascade`, `cursor-glyph-trail`).
