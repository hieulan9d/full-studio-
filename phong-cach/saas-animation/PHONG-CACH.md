# Phong cách: SaaS Animation (After Effects) — kit 1.3.0

Quảng cáo/giới thiệu phần mềm 15–30 giây, nền tối, giao diện kính, chuyển động liền mạch, **ra cả 16:9 và 9:16,
có nhạc nền + SFX, chuẩn −14 LUFS**. Nguồn: `saas-ae-kit` (đồng bộ bằng `tools/sync-studio.sh`; lịch sử ở `CHANGELOG.md`).
Video mẫu: `mau-tham-chieu/orbiq_v3_final.mp4` (16:9) và `mau-tham-chieu/orbiq_916_v1_final.mp4` (9:16).

## 5 dấu hiệu nhận diện
1. **Ánh sáng có nguồn**: cột sáng rọi xuống, quầng mờ, "hành tinh" tối ở đáy với vòng chân trời phát sáng. Nền gần đen (`#000208` → `#020a1e`), không xanh tươi.
2. **Kính (glassmorphism)**: fill 20–30%, viền sáng mảnh `#b4ccff` 1,5 px, làm mờ phía sau. Không dùng khối màu đặc.
3. **Chữ và UI hiện bằng blur + fade**, chuyển động "lao nhanh rồi phanh" (snap). Khối lớn không bounce, khối nhỏ bounce 8–15%.
4. **Không cắt cứng**: nối cảnh bằng camera, morph, vòng sáng hoặc blur thoát.
5. **Khung đầy**: vật chính chiếm 50–80% chiều ngang. Lỗi hay gặp nhất là vật quá nhỏ, khung trống.

## Con số chuẩn
| Mục | Giá trị |
|---|---|
| Khung | 16:9 1920×1080 và 9:16 1080×1920, 30 fps (cảnh luôn thiết kế ở 1920×1080) |
| Cột sáng lõi | `#4f8dff`, 150×1150, blur 65, ADD, opacity 40–50 |
| Nhấn | `#5fb4ff` |
| Chữ chính / phụ | `#ffffff` / `#8fa3e0` |
| Logo | cụm sao + chữ rộng ~1000 px (`H.logoScale` tự tính) |
| Tiêu đề cảnh | 62 Semibold |
| Vào cảnh | blur 25–30 → 0, opacity 0 → 100, 0,4–0,45 s, ease snap |
| Ra cảnh | blur 0 → 40, tối dần, 0,2–0,25 s |
| Camera | trôi chậm, scale 100 → 103–104% trong cả cảnh |
| So le phần tử phụ | 0,07–0,4 s |
| Glow | threshold ≥ 70, intensity ≤ 0,7 (glow toàn cảnh: 82%) |
| Âm thanh | nhạc −7 dB dưới SFX; bản giao −14 LUFS, đỉnh ≤ −1 dBTP |

## Đổi tông theo brand: `H.HUE`
0 = xanh dương (mặc định) · +45 = tím · +90 = hồng-tím · −30 = teal · −80 = xanh ngọc. Đặt lại sau mỗi lần nạp thư viện.

## Nhịp và âm thanh
- **Chọn nhạc trước**, đặt mốc cảnh theo BPM của bài (mỗi cảnh = bội số 2 phách). Thư viện: `audio/music/INDEX.md`
  (8 bài Mixkit — dùng được cho mạng xã hội/quảng cáo online/YouTube, **không** cho TV). Nhạc của khách: `tools/beats.py`.
  Không hợp bài nào: tạo nhạc đúng BPM bằng `tools/music_gen.py`.
- SFX tự đặt theo mốc chuyển động của từng cảnh (`H.cue` + `H.buildAudio`), bộ 27 SFX ở `audio/sfx/`.
- Bước cuối: `tools/finalize.sh` (−14 LUFS) → `tools/qc_auto.py`.

## 8 loại cảnh có sẵn hàm dựng
logo-reveal → dashboard-rise → zoom-out-overview → feature-orbit → ai-chat → card-ring → star-morph → end-card

## Thứ gây "rẻ", cần tránh
Nền xanh tươi bão hoà · glow cháy trắng · UI là khối đặc · UI thiếu chi tiết hoặc nhãn sai ngành · vật nhỏ, khung trống ·
cột sáng là "cục" tròn · cross-fade hai bản dựng của cùng một vật · video không tiếng hoặc nhạc lệch nhịp.

## Cách dùng lại
1. Tạo `projects/<ten-video>/brief.md` từ `brief-template.md` (AI phát triển thêm vào `brief-dev.md`, không sửa bản của bạn).
2. Mở After Effects (panel Claude Bridge phải hiện "đã kết nối").
3. Mở Claude Code trong thư mục này và nói: **"dựng video <ten-video>"**.
4. Mẫu chạy thật: `projects/orbiq/build.jsx` (đã trỏ đường dẫn về thư mục này).

Cần: After Effects 2026, MCP `after-effects`, ffmpeg, Python 3 + numpy. Font Inter (không có thì dùng Segoe UI).

## Đọc thêm
`CLAUDE.md` (quy trình 11 bước) · `knowledge/07` (bẫy đã gặp — bắt buộc) · `01` phong cách · `10` viết nội dung ·
`11` khung dọc · `12` âm thanh · `CHANGELOG.md`.

## Lưu ý
- Thư mục gốc phát triển kit: `D:\dự án antigravity\agent tạo video\saas-ae-kit`. Sửa ở đó rồi chạy
  `bash tools/sync-studio.sh` để cập nhật thư mục này. Nếu sửa trực tiếp ở đây, nhớ chép ngược về.
- Phong cách "sáng pastel" mới chỉ có mô tả trong `knowledge/01`, chưa có hàm dựng.
