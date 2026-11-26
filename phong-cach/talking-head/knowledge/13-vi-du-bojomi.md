# 13. Ví dụ tiếng Việt thứ ba: giới thiệu sản phẩm (Bojomi, 2026-11-16/17)

Video **dược sĩ giới thiệu thực phẩm bổ sung**, tiếng Việt, 75,7 s gốc → 71,6 s, dọc 1080×1920. Làm bằng kit này trên máy Windows + AE 2026 + GPU, ba bản v1 → v3.
Mã: `examples/bojomi/build.src.jsx` (nguồn UTF-8) → `python enc.py` → `build.jsx` (ký tự Việt thành `\uXXXX`). Plan và báo cáo: `examples/bojomi/plan.md`, `report.md`.
Media gốc (clip, matte, ảnh AI, video 9:16) **không đưa vào kit** (của khách / tốn dung lượng); nằm ở `fullstudio/output/video-chi/` và `projects/video-chi/`.
(đo) = từ số đo; (mắt) = xem khung; (người dùng) = lời người dùng.

## Đầu vào và chuẩn bị
- Clip `C4018.MP4`: quay dọc (cờ xoay 90°) 1920×1080 ghi chú → hiển thị 1080×1920, 59,94 fps, 86 s. Hạ về **1080×1920/30 fps** bằng `ffmpeg -vf scale=1080:1920,fps=30` (ffmpeg tự xoay).
- `prep.sh --lang vi --prompt "Bojomi, Droppii, …"`: phiên âm 5,1 s trên GPU, cắt 22 chỗ im lặng (86,1 → 75,7 s), matte 246 s (2270 khung, 9,2 khung/s). Matte đẹp: viền tóc sạch, hộp sản phẩm trên bàn không dính vào người (mắt).
- Whisper tiếng Việt **sai**: "Bozomi"→BOJOMI, "ăn vườn"→An Vượng, "dàng m, K7"→dạng MK-7, "vồi"→vội, "hề xương"→hệ xương; và **ảo giác ở đuôi** ("Hãy subscribe cho kênh…" sau khoảng lặng cuối). Dùng số đo năng lượng để quyết cắt đuôi.
- Tường sau lưng có **logo lớn cam và chữ xanh** (Droppii): chữ "sau lưng người" đặt thẳng lên đó sẽ rối → **phủ tường bằng xanh thương hiệu** (xem dưới).

## Bố cục (người cao bằng khung, mặt y ≈ 900)
Mặt y 800–1010; tóc y ≥ 645 (≥ 580 khi zoom 112 %); ngực/áo y 1100–1300; tay và sản phẩm y 1050–1450; bàn y ≥ 1620.
- **Vùng trên đầu y < 580**: chữ, thẻ ảnh, bong bóng, bảng thành phần, sản phẩm tách nền (không bao giờ che mặt).
- **Vùng ngực y 1085–1195**: chữ hook, chữ trên cảnh có thẻ ở trên (chữ trắng/vàng đọc tốt trên áo navy).

## Khối đã dựng (hàm trong `build.src.jsx`; chưa chuyển vào `th-lib.jsx`)
| Hàm | Làm gì |
|---|---|
| `m(t)`, `o(t)` | `m`: đổi giây trên aroll gốc sang aroll đã cắt thêm lời lỗi; `o`: sang timeline MAIN (trừ `OFF` giây đầu). Mọi DATA ghi theo giây **aroll gốc** |
| `applyZoom(cam)` | zoom theo đoạn `[vào, ra, từ%, tới%]`, ease mềm, cuối đoạn HOLD nên nhảy cắt; thay cho HOLD thuần của `T.base` |
| `S.base` + `BG_Tint` | `T.base` rồi phủ **solid xanh 100 %** với mask phía trên (`maskTop`, mờ 340 px), dính vào CAM → che logo nền, mờ dần xuống bàn |
| `T.keyword` (th-lib) | từ khoá gradient (`#FFFFFF`→`#F0A000`) + light sweep, đặt sau người bằng `moveBefore(BG_Tint)` |
| `LBL` | nhãn hai cấp (nhỏ cream + to gradient), tự thu nhỏ vừa 960 px (`fitW`, dùng `H.mulScale` vì scale có keyframe) |
| `imgCard`/`putCard` | thẻ bo góc (ảnh hoặc **video**, bỏ 0,35 s đầu clip AI; ảnh tĩnh zoom chậm 100→112 % cho có chuyển động), khung nét đứt vàng, pop-in |
| `putCut` | ảnh sản phẩm **PNG alpha** không khung, đổ bóng, trôi nhẹ |
| `bubble` | bong bóng nguyên tố kiểu bao bì (radial ramp + viền + bóng loáng) |
| `S.note` | thẻ giấy kem "Trong mỗi gói 20 g": 3 dòng, số **đếm 0→giá trị đúng lúc nói** (`H.counter` + expression `effect("Value")("Slider")*1`, `.toFixed(1)` đổi `.`→`,`) |
| `S.table` | bảng thành phần 4 dòng (tĩnh, hiện lệch 0,18 s) thay cho ảnh hướng dẫn che mặt |
| `S.broll` | clip 9:16 phủ khung 122 %, push-in 7 %, lớp tối (mask trên hoặc dưới) cho chữ; sau `behind`, trước `labels` nên chữ nằm trên |
| `S.endcard` | banner xanh-vàng trượt lên: tên + "Thực phẩm bổ sung" + câu khuyến cáo |
| `flash` | nháy trắng 0,3 s đỉnh 88 % |

Thứ tự giai đoạn: `base, behind, broll, labels, cards, bubbles, note, table, endcard, flash, sfx`. `B.all()` ≈ 1–2 phút (`timeoutSec` 500).

## Tách nền ảnh sản phẩm (không có rembg/scipy)
Ảnh tham chiếu là bản cắt khít từng mặt hộp nên nền trắng chỉ còn ở góc. Dùng `PIL.ImageDraw.floodfill` từ các điểm biên (ngưỡng 18, màu marker) → mặt nạ → `MinFilter(3)` + `GaussianBlur(1)` → PNG alpha. Mặt hộp 3D tách sạch (mắt). **Mặt "Thành phần" trong ảnh tham chiếu bị nhoè (không đọc được): không đưa lên màn hình.**

## B-roll và minh hoạ bằng AI
- Ảnh Flow `flow-nano-banana-pro` 1:1: bàn ăn gia đình, làm việc muộn, xương (biểu tượng), tảo biển đỏ; palette nêu trong prompt; không chữ, không trẻ em. Dấu sao AI ở góc dưới.
- Video từ ảnh (Flow Omni): **thất bại** nhiều lần (xem knowledge/07 mục 31–33); 2/4 clip dùng được.
- **Video 9:16 bằng Muse** (`muse::muse-video`, 5 s, 720×1280): 3/4 clip tốt và khớp lời (cặp đôi đi dạo, bữa sáng khuấy ly, giãn cơ buổi sáng); mỗi clip 20–60 s. Script: `examples/bojomi/gen_broll_muse.py`.

## Từng giây (v3, giây trên timeline đã cắt)
| Giây | Lời | Hình |
|---|---|---|
| 0–4 | nhớ chăm sóc cả nhà, nhưng có đang bỏ quên chính mình | **Hook A**: ảnh bàn ăn + chữ ngực "chăm sóc / cả nhà"; ảnh làm việc một mình + "bỏ quên / chính mình" |
| 4–8 | ăn sáng vội, bữa trưa vừa ăn vừa làm | nhãn "ăn sáng/vội", "bữa trưa/vừa ăn vừa làm" + clip làm việc muộn |
| 8–12 | tối lo xong cho gia đình, đủ chất hay chưa | ảnh bàn ăn + "tối lo xong/cho gia đình"; từ khoá "ĐỦ CHẤT?" |
| 12–16 | mong có sức khoẻ, đi chơi cùng gia đình | "ngày nào cũng mong/có sức khoẻ" → từ khoá "SỨC KHOẺ" → **B-roll cặp đôi đi dạo** + nhãn |
| 17–25 | chăm sóc bản thân để sau cùng; dưỡng cho xương | nháy trắng; nhãn; từ khoá XƯƠNG + thẻ xương |
| 24–30 | **BOJOMI An Vượng** là một lựa chọn; bổ sung dinh dưỡng cho xương | nháy trắng; từ khoá BOJOMI + **hộp tách nền** góc phải; nhãn |
| 30–37 | công thức: Canxi từ tảo biển đỏ, D3, K2 MK-7, collagen | 4 bong bóng lần lượt đúng từ; thẻ tảo biển |
| 37–52 | mỗi hộp 14 gói; một gói có 417,6 mg canxi… | "14" + hộp 3D; **thẻ thành phần đếm số** |
| 52–61 | một ngày một gói; góp phần bổ sung dưỡng chất cho xương | nháy trắng; "1 GÓI MỖI NGÀY"; **B-roll giãn cơ** + nhãn |
| 61–70 | chăm sóc bản thân có chỗ trong lịch; bắt đầu từ bữa ăn; đọc nhãn | **B-roll bữa sáng** + nhãn; nháy trắng; **bảng thành phần 4 dòng**; banner kết + khuyến cáo |

Mật độ ≈ 1 sự kiện / 2,4 s; ~75 SFX; −14,0 LUFS.

## Nhận xét người dùng (đã ghi vào `memory/y-nguoi-dung.md`)
v1 → "muốn chữ gradient"; ảnh sản phẩm phải **tách nền, không che mặt**; thay ảnh hướng dẫn bằng **bảng các chất**; cắt hai đoạn lời lỗi; "nên có **zoom in zoom out**"; "nên có **video minh hoạ** cho đỡ chán"; v2 → "những đoạn không có text hay broll rất chán, thêm text và broll, broll là **một video 9:16 liên quan đến thoại**".

## Chưa kiểm
- Người dùng chưa phản hồi v3. Không nghe được âm thanh (chỉ đo −14,0 LUFS).
- Lời nói của chị "đủ dưỡng chất" và "170 mg" (nhãn 169,8 µg) vẫn nguyên; chữ màn hình đúng nhãn.
- Chưa kiểm "Canxi từ tảo biển đỏ" với nhãn thật.
- Chưa chuyển các khối ở trên vào `th-lib.jsx` (hỏi người dùng trước).
