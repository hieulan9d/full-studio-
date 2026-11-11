# vf — bộ lệnh dựng video (kiểu VideoFlow, chạy cục bộ)

Trung tâm là **file dự án JSON** (`projects/<tên>/project.json`). Mọi lệnh đều đọc/ghi file này. Claude dựng bằng cách sửa file đó rồi chạy lệnh.

Chạy từ thư mục `E:\antigravyti\edit video toàn diện`:

| Lệnh | Việc |
|---|---|
| `python -m vf scan <thư mục>` | Đo thông tin + độ rung từng clip (có cache) |
| `python -m vf stable <clip>` | Liệt kê các đoạn êm để lấy cảnh |
| `python -m vf look <clip> <t0> <t1>` | Ghép ảnh xem nhanh để chọn cảnh / gán cỡ cảnh |
| `python -m vf scenes <clip>` | Điểm cắt cảnh của video dựng sẵn |
| `python -m vf beats <nhạc>` | BPM + vị trí beat (ước lượng) |
| `python -m vf check <project>` | Kiểm tra luật: không rung, toàn-trung-cận xen kẽ, không vượt độ dài nguồn |
| `python -m vf voice <project> [--only s5 s6]` | Tạo giọng (VoiceStudio), tự nghe lại bắt lỗi, chỉnh khớp khung |
| `python -m vf render <project> <out.mp4> [--vertical] [--sub-mode word]` | Dựng MP4; `--vertical` ra 9:16; `word` = phụ đề hiện từng chữ |
| `python -m vf capcut <project> <tên> [--audio none\|mp3\|full\|one\|min]` | Xuất dự án CapCut để sửa tay |

## File dự án
- `clips`: nối tiếp nhau. Mỗi clip `{src, in, dur, speed?, size, label, zoom?, inset?, focus_x?}` hoặc `{gap: giây}`.
  `size`: `T` toàn, `Tr` trung, `C` cận (chịu luật xen kẽ); `SP`/`L` không tính.
- `sections`: mỗi mục có `script` (lời đọc), `start/end` (khung giọng) và `onscreen` (chữ trên màn hình).
- `voice`: `profile` (id giọng VoiceStudio) và `pron` (cách đọc tên riêng).
- `rules`: `shake_max`, `alternate_sizes`, `shake_exempt` (clip dựng sẵn không đo rung).

## Giới hạn hiện tại
- Chưa tự tìm/tải cảnh trên YouTube, Pexels, Pixabay (cần khóa API và quyền tải).
- Cỡ cảnh (T/Tr/C) do Claude xem ảnh rồi gán, chưa có công cụ tự nhận.
- Dò beat là ước lượng; `music.snap()` có sẵn nhưng chưa tự áp vào cắt cảnh.
- Xuất CapCut chưa mang theo zoom; track giọng đọc đang thử nghiệm (xem `--audio`).
- Chưa có tách nền, tạo hình AI.
