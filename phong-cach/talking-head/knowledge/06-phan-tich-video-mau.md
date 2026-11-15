# 06. Phân tích video mẫu (tham chiếu)

AI không xem được video liên tục, nên "xem" bằng ba thứ: **lưới khung có mốc giờ**, **transcript** và **âm thanh tách lớp**.
Kết quả cần có: `ref-notes.md` với bảng **giây | lời | hình | âm thanh**, như `09-vi-du-foodtage.md`.

## Các bước

1. **Thông số**: `ffprobe -v error -show_entries format=duration:stream=codec_type,width,height,r_frame_rate -of csv=p=0 ref.mp4`
2. **Lưới khung**: `bash tools/sheet.sh ref.mp4 out/sheet.jpg 3`, tức 3 khung mỗi giây, 11 cột.
   Video dài thì cắt từng đoạn 10–15 s, nếu không ảnh quá dày để đọc.
   Chỗ cần soi kỹ: xuất 4–10 khung rời ở 396×704, ghép ngang bằng `hstack` rồi đọc.
3. **Transcript**: `python tools/transcribe.py ref.mp4 out/ref.json --lang vi`. Ghép mốc từ với khung hình để biết hiệu ứng nào vào đúng từ nào.
4. **So với clip gốc** (nếu có, như bộ Foodtage):
   - Cùng thời lượng và âm thanh lệch 0 ms nghĩa là mẫu **không cắt**, chỉ thêm grade, đồ hoạ và SFX.
   - So lưới khung clip gốc với mẫu để thấy grade (độ tương phản, độ bão hoà) và zoom (đầu to hơn bao nhiêu).
5. **SFX**: `python tools/sfx_match.py ref.mp4 raw.mp4 sfx/` (knowledge/05). Không có clip gốc: nghe theo lưới và đoán theo bảng SFX ở knowledge/05.
6. **Preset của người dựng** (`.setting` của DaVinci Fusion, `.ffx` của AE, `.mogrt`):
   - `.setting` là văn bản. Tìm các khối `KeyFrames = { [khung] = { giá trị ... } }` (đường cong theo khung), `Value =` (hằng số) và tên tool (`Transform`, `SoftGlow`, `sOutline`, `Merge`, `PolyPath`).
   - Ví dụ: `Merge1Size` key [10]=1, [20]=2,5 nghĩa là scale 100 → 250% ở khung 10–20 (Stroke Up).
   - `.ffx` và `.mogrt` là nhị phân: nhờ người dùng áp thử trong AE, hoặc dựng lại theo mắt.
7. **Light leak / file chuyển cảnh tổng hợp**: đo độ sáng theo thời gian để tìm các đoạn loé.
   ```bash
   ffmpeg -i leak.mp4 -vf "fps=5,scale=32:18,format=gray" -f rawvideo - | python -c "import sys,numpy as n;a=n.frombuffer(sys.stdin.buffer.read(),n.uint8).reshape(-1,576).mean(1);print(' '.join(f'{i/5:.1f}:{v:.0f}' for i,v in enumerate(a)))"
   ```
   Sau đó **xem khung** ở từng đỉnh và chỉ giữ đoạn ánh sáng mềm (trắng, cam, vàng). Bỏ đoạn nhiễu, glitch hay loé đỏ phủ kín khung (lỗi của bản v1 Foodtage).
8. **Font**: nếu thư mục mẫu có `Fonts/`, cài vào máy rồi `T.fontList()` để lấy PostScript name. Ghép từng font với chữ trong mẫu.
   Không có thì so hình chữ: chữ đậm hẹp → Impact/Anton/Bebas; serif nghiêng → Playfair Italic/Pensum; viết tay → script.

## Đo bố cục từ khung

Ở lưới, một ô 396 px tương ứng 1080 px thật (nhân 2,727). Ghi lại toạ độ tâm và kích thước ước lượng cho: chữ hook, từ khoá, phụ đề (thường ở y ≈ 0,5–0,55 chiều cao), tile (y ≈ 0,76), nhãn số (y ≈ 0,1).
Những số này là khối DATA của build.

## Bảng nhịp

Từ bảng giây, đếm:
- Bao nhiêu giây thì có một thứ mới.
- Những gì đi kèm mỗi ý chính (zoom, SFX, số, icon, từ khoá).
- Bao nhiêu % thời lượng là đồ hoạ thay mặt người.
- Màu chủ đạo, font chữ.
Viết thành 5–8 luật ngắn ở đầu `ref-notes.md`. Kế hoạch sẽ tuân theo các luật này.
