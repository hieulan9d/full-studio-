# 09. Ví dụ Foodtage: phân tích từng giây và cách dựng lại

File: `examples/foodtage/`. Đây là bộ tài liệu đi kèm HD1. Video "3 ways to become a kickass video editor", tiếng Anh, 22,2 s, dọc.

## Đầu vào

| File | Thông số |
|---|---|
| `assets/clip gốc.mp4` | 2160×3840 HEVC 23,976 fps, 22,1 s, màu phẳng. **Không có chỗ lặng nên không cắt** |
| `ref/video-mau.mp4` | 1080×1920 30 fps, 22,2 s (chuyển từ `video mẫu.mov` 210 MB, crf 18). Cùng timeline với clip gốc, lệch 0 ms |
| `media/aroll.mp4` | clip gốc hạ về 1080×1920 (crf 14) |
| `media/aroll_matte.mp4` | matte RVM, 530 khung, mất 53 s trên GPU |
| `media/transcript.json` | transcript từng từ (large-v3-turbo) |
| `assets/B-Roll/` | `meme khóc rồi cười.mp4` (576×1024; khóc ở 0–2 s, cười từ 2,5 s), `Record.mov` (4K, quay màn hình timeline DaVinci) |
| `assets/icon&logo/` | 3 icon động 512×512 (keyboard, audio, storytelling: **hình tô đặc trên nền trắng**), 5 logo PNG |
| `assets/SFX/` | 11 file (knowledge/05) |
| `assets/Fonts/` | TR Impact, Pensum Display Book Italic, SVN-Rosellinda Alyamore, Athelas, Tactic Sans (zip) |
| `assets/*.setting` | preset Fusion: icon effect, Strock Up, opacity |
| `assets/ánh sáng chuyển cảnh 1.mp4` | light leak tổng hợp 1024×576, 14 s (lẫn nhiễu và loé màu) |

## Từng giây của video mẫu

| Giây | Lời | Hình | Âm thanh |
|---|---|---|---|
| 0,0–0,3 | Here's three ways… | A-roll đã grade (tương phản, đỏ/xanh neon) | Tiktok SFX 2 |
| 0,33 | Here's | "Here's" xanh dương phát sáng ở ngực | |
| 0,67 | three ways | "3" đỏ cam + "Ways" chữ viết tay xanh lá neon | |
| 1,0 | | light leak loé; tile đầu tiên bật ra | pop |
| 1,33–2,0 | | 3 icon tile xếp trên đầu | pop ×3 |
| 2,58–3,7 | Number one | zoom giật; "Number" xanh trên trái + số "1" neon lớn **sau lưng** | impact + saber |
| 3,67–4,7 | keyboard shortcuts | tile keyboard trên mic, vòng nổ, "Keyboard Shortcut" Stroke Up | ping |
| 4,9–5,6 | This will make you way | phụ đề từng từ xanh ngọc chồng 3 dòng | click mỗi từ |
| 5,64–6,7 | faster | "FASTER" tím to sau đầu | shutter |
| 6,74–8,6 | and way more efficient | "Efficient" thay "FASTER"; phụ đề "and… / way / more" | |
| 7,12–9,0 | no matter what editing software | hàng logo Pr/CapCut/**DaVinci**/AE/FCP; light leak 7,67 | riser 7,3 → 9,2 |
| 9,22–10,4 | Number two | zoom giật; "Number" + "2" | impact + saber |
| 9,86–10,9 | you need to be practicing | phụ đề, "Practicing" Stroke Up | |
| 10,88–12,0 | sound design | tile audio; "Sound Design" sau đầu | ping |
| 12,0–14,7 | Sound design can make… | **B-roll**: meme trong thẻ 3D ở trên, timeline DaVinci ở dưới | Tiktok SFX 13,5 |
| 15,08–16,3 | And last | zoom giật; "and Last" + "3" | impact + saber |
| 15,4–16,7 | but not least, focus | phụ đề, "focus" to | |
| 16,68–17,9 | on telling a story | light leak; tile storytelling; "Telling Story" sau đầu | ping |
| 17,85–22,2 | Practice editing… abilities | **nền vòng tròn** sau người, icon quay quanh; phụ đề, "storytelling abilities" tím | gears 17,9, riser 18,3 → hết |

Nhịp: một thứ mới mỗi 0,3–0,7 s. Mỗi ý chính có zoom + impact + số neon, sau đó tile + từ khoá sau đầu.

## Cách dựng (examples/foodtage/build.jsx)

| Giai đoạn | Hàm | Số layer |
|---|---|---|
| base | `T.base`: grade, BG_Plate / MATTE / FG_Person, CAM zoom HOLD | 4 |
| behind | 3× `T.number` + 4× `T.keyword` → `T.behind` | 13 |
| front | hook riêng, 3 `T.tile`, 6 `T.placeTile`, 10 `T.burst`, Stroke Up, `T.logoBar` | ~22 |
| caps | `T.captions` 11 nhóm, 39 từ | 39 (+ bản Stroke Up) |
| broll | `T.brollCard` | 1 |
| rings | `T.ringsBg` | 1 |
| leaks | `T.leaks` 5 đoạn | 5 |
| sfx | 13 + 6 impact/saber + 39 click | 58 |

Tổng khoảng 144 layer. Chạy cả 8 giai đoạn mất khoảng 1–2 phút; render 22 s mất khoảng 5 phút.

## Kết quả v1 (`result/foodtage_v1.mp4`) và chỗ còn lệch

Đủ 666 khung, giải mã không lỗi, âm lượng −15,5 LUFS (chỉ chạy 1 lượt loudnorm). So với mẫu: `check/*_cmp.jpg`, `check/v1_sheet.jpg`.

| Phần | So với mẫu |
|---|---|
| Grade, zoom, hook, từ khoá sau đầu, số 1/2/3, phụ đề, logo, vòng nền | khớp tốt |
| Light leak 6,0 / 7,67 / 16,67 | **sai đoạn**: nhiễu, loé đỏ kín khung, vệt trắng. Cần chọn lại (knowledge/06 mục 7) |
| Âm lượng | −15,5 LUFS, cần chạy 2 lượt |
| Nét icon | mảnh hơn mẫu |
| B-roll | thẻ và timeline nghiêng nhiều hơn mẫu một chút; nửa dưới lộ một phần đồng hồ âm thanh |
| Icon trên vòng nền | là nét viền, mẫu là hình trắng đặc |
| Số "1/2/3" | mẫu kiểu 3D ánh kim; bản dựng phẳng có viền và glow |

Quá trình làm cần 8 vòng so khung. Các lỗi gặp phải đã ghi ở knowledge/07: glow trắng xoá, icon xám, thẻ bị che, chia 0 do ghép mảng.
