# Phong cách: Talking head dọc (After Effects)

Video **người nói trước camera, dọc 1080×1920** (TikTok/Reels/Shorts), 30–90 giây. Xương sống là **lời nói**: mọi chữ, hình, SFX, zoom đặt theo **mốc từng từ** trong transcript.
Đồ hoạ nằm đè lên người nói hoặc thay mặt người vài giây. Dựng bằng After Effects qua MCP; kit đầy đủ: `AGENTS.md` (quy trình) và `knowledge/`.
Độ tin cậy: **[chạy thật]** đã render và người dùng xem · **[chưa kiểm]** chỉ có công thức.

## Ba biến thể
| Biến thể | Hợp với | Nhịp | Trạng thái |
|---|---|---|---|
| **A. Neon dày** (Foodtage, EN): nền tối đèn đỏ/xanh, chữ tím-trắng sau đầu, phụ đề từng từ xanh ngọc, tile icon, số neon, light leak | giải trí, mẹo, "3 cách…" | 0,3–0,7 s/hiệu ứng | [chạy thật] (`examples/foodtage/`, `knowledge/09`) |
| **B. Giới thiệu sản phẩm, màu thương hiệu** (Bojomi, **tiếng Việt**): tường phía trên phủ xanh thương hiệu, chữ gradient trắng→vàng, nhãn hai cấp, bao bì tách nền, bảng thành phần, B-roll 9:16 phủ khung | dược sĩ, tư vấn, bán hàng, thực phẩm bổ sung | ~2,4 s/hiệu ứng (**quá thưa, người dùng chê 2026-11-19**; theo `knowledge/14`: ≥ 1 sự kiện/1,5 s + phụ đề từng từ) | [chạy thật] v1→v3 (`examples/bojomi/`, `knowledge/13`); **v3 chưa có phản hồi người dùng** |
| **C. Chuyên gia tối-xanh, ít chữ** (HD-VN): chỉ từ khoá hai cấp, chia đôi màn hình, nháy trắng, B-roll thẻ dọc | dạy nghề, chuyên gia | ~2,7 s/cảnh | [chưa kiểm] chỉ phân tích (`knowledge/11`) |

Callaway và minimal premium (`knowledge/03` B, C) mới có công thức trên giấy.

## Dấu hiệu nhận diện (chung)
1. **Lời dẫn dắt hình**: mỗi keyframe đặt theo giây của từ; chữ/hình vào trong ±0,3 s quanh từ.
2. **Chữ hai cấp**: dòng nhỏ làm nhãn + dòng to đậm nghiêng làm từ khoá. Từ khoá lớn đặt **sau lưng người** (matte), vùng trên đầu y < 600. **Không che mặt.**
3. **Người nói giới thiệu ý → hiện mặt; người nói mô tả/liệt kê/kể ví dụ → hiện hình** (số liệu, bao bì, B-roll). Không để đoạn dài chỉ có mặt người và không có chữ/hình.
4. **Chuyển ý bằng nháy trắng 0,3 s + whoosh + zoom giật**; zoom vào/ra liên tục 100–112 %.
5. **Hook 3–5 s đầu: chữ kèm hình minh hoạ cho từ khoá** (`knowledge/12`); plan có 2–3 phương án để người dùng chọn.
6. **Kết**: banner thương hiệu + câu khuyến cáo (nội dung y tế).

## Con số chuẩn (biến thể B, đã render)
| Mục | Giá trị |
|---|---|
| Khung | 1080×1920, 30 fps; clip 4K/60 fps hạ về 1080×1920/30 trước; cắt im lặng đầu clip |
| Màu (lấy từ bao bì) | xanh `#14553F`/`#0F4A38`, vàng `#D4A93A`, kem `#F7F3E8`; gradient chữ `#FFFFFF` → `#F0A000` |
| Font (Windows, đủ dấu Việt) | từ khoá **Cambria Bold Italic**, nhãn **Segoe UI Bold**. Georgia thiếu dấu |
| Grade | rất nhẹ: black 4, white 252, vibrance 20, contrast 10, vignette 10 (clip phẳng/log mới cần grade mạnh) |
| Nền tường | phủ xanh đặc (100 %, mask lệch mờ 340 px, hết ở y ≈ 1130), dính vào CAM. 88 % vẫn lộ logo nền |
| Từ khoá sau lưng | một dòng, cỡ 175–230, y 330; gradient + light sweep; vào scale 135→100 trong 5 khung |
| Nhãn | nhỏ 52 (cream, tracking 30) + to 100–150; vị trí trên đầu y 310/425, hoặc ngực y 1085/1195; vào blur 18→0 trong 0,3 s |
| Thẻ ảnh | bo 44–50, khung nét đứt vàng 5 px, 340–460 px; **sản phẩm: PNG tách nền, không khung, cao 430–470 px ở góc trên phải (880, 345)** |
| Bong bóng nguyên tố | d 170, hàng y 230, pop-in bounce 15 %, chú thích 34 px dưới bong bóng |
| Thẻ số liệu | 860×440 giấy kem, số đếm 0→giá trị theo từ nói (slider + expression), giá trị đúng nhãn bao bì |
| B-roll 9:16 | phủ toàn khung, phóng 122 % (che dấu AI ở mép), push-in 7 %, lớp tối 58 % cho chữ, chữ nhãn ở dưới/trên; 2–4,5 s; giọng vẫn chạy |
| Nháy trắng | 0,3 s, đỉnh 88 %, ở chỗ chuyển ý |
| Zoom | các đoạn [vào→ra, từ%→tới%], cuối đoạn nhảy cắt (HOLD); 13 đoạn trong 72 s |
| SFX | pop/tick/whoosh/swoosh/sparkle/shimmer/riser, −12 đến −18 dB so với giọng (kho `saas-animation/audio/sfx`); **không** impact/glitch/typing cho nội dung y tế |
| Bản giao | −14 LUFS (2 lượt loudnorm), đỉnh ≤ −1 dBTP |

## Quy trình rút gọn cho video tiếng Việt
1. `ae_status` có `bridge`; font qua `fonts_vi.py`. Đọc `memory/`.
2. Hạ clip về 1080×1920/30 → `prep.sh --lang vi --prompt "tên riêng, thuật ngữ"`. Đọc transcript, ghi **các chỗ Whisper sai** (tên thương hiệu, đơn vị µg/mg, ảo giác ở đuôi sau khoảng lặng).
3. Xem contact sheet clip gốc: xác định **vùng trống** (tường, logo), **vùng mặt** (tránh), vị trí tay/sản phẩm.
4. `plan.md` (mục Hook bắt buộc, bảng mốc từng câu, SFX, rủi ro nội dung, câu hỏi gộp) → **người dùng duyệt** → mới tạo ảnh/clip AI.
5. Tạo ảnh (Flow) → B-roll 9:16 (Muse; Flow hay bị chặn) → xuất file khỏi canvas, xem lại từng clip.
6. Cắt lời lỗi nếu người dùng chỉ ra (cả aroll lẫn matte, cùng khung), phiên âm lại để kiểm.
7. Dựng từng giai đoạn từ `examples/bojomi/build.src.jsx`, xuất khung sau mỗi giai đoạn, xem ngay.
8. Render (không gửi lệnh vào AE), kiểm `ffprobe -count_frames`, loudnorm, contact sheet, `report.md`.

## Luật nhịp và SFX (mới, 2026-11-19)
Video nội dung khác với mẫu vẫn phải dày như mẫu: **đọc `knowledge/14-luat-nhip-va-sfx.md`** (mật độ tối thiểu đo từ Foodtage, bước tìm điểm nhấn, bảng điểm nhấn → SFX → hiệu ứng, cách đo sau khi dựng). Biến thể B không được tự hạ xuống "nhịp vừa".

## Thứ gây "rẻ", cần tránh
- Đoạn dài chỉ có mặt người, không chữ, không hình (người dùng chê "chán", 2026-11-17).
- Ảnh sản phẩm làm thẻ trắng che mặt; ảnh hướng dẫn to che mặt (người dùng chê, 2026-11-17).
- Chữ màu phẳng khi người dùng muốn gradient; Glow làm trắng xoá chữ màu (`T.glow` thay).
- Để lộ logo/chữ của nơi quay phía sau chữ sau lưng người.
- Chữ trên màn hình khác đơn vị/số liệu trên nhãn; câu hứa quá mức ("đủ", "khỏi", "100%").
- Font thiếu dấu Việt; từ khoá hai dòng cỡ lớn bị đầu che.
- Tự đặt SFX ngoài kho đã duyệt khi chưa được dạy.

## Nội dung y tế / thực phẩm bổ sung
Theo `knowledge/10` và `HUONG-DAN-AI.md` mục 9: "hỗ trợ/góp phần", không "trị/khỏi/100%", chỉ sơ đồ/minh hoạ (không hình cơ thể thật), thẻ kết có "không phải là thuốc, không có tác dụng thay thế thuốc chữa bệnh", **liệt kê mọi câu khẳng định sức khoẻ trong `report.md`** và nêu chỗ **lời nói không khớp chữ/nhãn**. Số liệu trên màn hình lấy từ nhãn bao bì, không lấy từ lời nói.

## Nơi tìm
`AGENTS.md` quy trình · `knowledge/01–13` · `lib/th-lib.jsx` · `examples/foodtage/` (EN, neon) · **`examples/bojomi/`** (VN, giới thiệu sản phẩm: `build.src.jsx`, `plan.md`, `report.md`, `gen_broll_muse.py`) · `memory/` (kinh nghiệm sống) · `CON-THIEU.md` (chưa kiểm chứng).
