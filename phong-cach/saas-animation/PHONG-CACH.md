# Phong cách: SaaS Animation (After Effects)

Quảng cáo/giới thiệu phần mềm 15–30 giây, nền tối, giao diện kính, chuyển động liền mạch.
Nguồn: `saas-ae-kit` (đã sao chép vào thư mục này). Video mẫu: `mau-tham-chieu/orbiq_v1.mp4`.

## 5 dấu hiệu nhận diện
1. **Ánh sáng có nguồn**: cột sáng rọi xuống, quầng xanh mờ, "hành tinh" tối ở đáy với vòng chân trời phát sáng. Nền gần đen (`#000208` → `#020a1e`), không xanh tươi.
2. **Kính (glassmorphism)**: fill 20–30%, viền sáng mảnh `#b4ccff` 1,5 px, làm mờ phía sau. Không dùng khối màu đặc.
3. **Chữ và UI hiện bằng blur + fade**, chuyển động "lao nhanh rồi phanh" (snap). Khối lớn không bounce, khối nhỏ bounce 8–15%.
4. **Không cắt cứng**: nối cảnh bằng camera, morph, vòng sáng hoặc blur thoát.
5. **Khung đầy**: vật chính chiếm 50–80% chiều ngang. Lỗi hay gặp nhất là vật quá nhỏ, khung trống.

## Con số chuẩn
| Mục | Giá trị |
|---|---|
| Khung | 1920×1080, 30 fps |
| Cột sáng lõi | `#4f8dff`, 150×1150, blur 65, ADD, opacity 40–50 |
| Nhấn | `#5fb4ff` |
| Chữ chính / phụ | `#ffffff` / `#8fa3e0` |
| Wordmark logo | 118 × scale 145% |
| Tiêu đề cảnh | 62 Semibold |
| Vào cảnh | blur 25–30 → 0, opacity 0 → 100, 0,4–0,45 s, ease snap |
| Ra cảnh | blur 0 → 40, tối dần, 0,2–0,25 s |
| Camera | trôi chậm, scale 100 → 103–104% trong cả cảnh |
| So le phần tử phụ | 0,07–0,4 s |
| Glow | threshold ≥ 70, intensity ≤ 0,7 (glow toàn cảnh: 82%) |

## Đổi tông theo brand: `H.HUE`
0 = xanh dương (mặc định) · +45 = tím · +90 = hồng-tím · −30 = teal · −80 = xanh ngọc.
Đặt lại sau mỗi lần nạp thư viện. Luôn giữ nền gần đen.

## Nhịp
Có nhạc: đo BPM bằng `tools/beats.py`, đặt mốc cảnh trên lưới nhịp. Không có nhạc: lưới 120 BPM, mỗi cảnh khoảng 1 giây.

## 8 loại cảnh có sẵn hàm dựng
logo-reveal → dashboard-rise → zoom-out-overview → feature-orbit → ai-chat → card-ring → star-morph → end-card

## Thứ gây "rẻ", cần tránh
Nền xanh tươi bão hoà · glow cháy trắng · UI là khối đặc · UI thiếu chi tiết · vật nhỏ, khung trống · cột sáng là "cục" tròn · cross-fade hai bản dựng của cùng một vật.

## Cách dùng lại
1. Tạo `projects/<ten-video>/brief.md` từ `brief-template.md`.
2. Mở After Effects (panel Claude Bridge phải hiện "đã kết nối").
3. Mở Claude Code trong thư mục này và nói: **"dựng video <ten-video>"**.
4. Mẫu chạy thật: `projects/orbiq/build.jsx`.

Cần: After Effects 2026, MCP `after-effects`, ffmpeg, Python 3 + numpy. Font Inter (không có thì dùng Segoe UI).

## Đọc thêm
`CLAUDE.md` (quy trình 9 bước) · `knowledge/01-phong-cach.md` · `knowledge/07-mcp-va-bay-loi.md` (bẫy đã gặp, nên đọc trước khi dựng).

## Lưu ý
- `lib/` nạp bằng đường dẫn tuyệt đối: nạp từ thư mục này thì dùng đường dẫn mới.
- Phong cách "sáng pastel" mới chỉ có mô tả trong `knowledge/01`, chưa có hàm dựng.
