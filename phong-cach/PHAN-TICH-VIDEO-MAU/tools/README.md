# refkit.py

Bộ đo video tham chiếu cho AI. Cách dùng đầy đủ: `../PHAN-TICH-VIDEO-MAU.md` mục 2. Chạy không đối số để xem trợ giúp.

Cần: `ffmpeg`, Python 3 + `numpy`, `opencv-python`. Tuỳ chọn: `faster-whisper` (lời nói theo từng từ, mô hình `small`, chạy CPU).
Chạy bằng `python -I tools/refkit.py …` (chữ tiếng Việt in ra đúng dù console Windows dùng cp1252).

| Lệnh | Làm gì |
|---|---|
| `analyze REF OUT [--lang vi\|en\|auto] [--no-words]` | đo toàn bộ → `OUT/ref-auto.md` + ảnh overview/dense/cut + `words.json` |
| `track REF T0 T1 X,Y,W,H OUT` | bám một vật → ease (t50), thời lượng, overshoot, đồ thị |
| `pick REF T X,Y …` | mã màu hex tại điểm |
| `strip REF T0 T1 OUT.jpg [--every N]` | mọi khung trong đoạn |
| `compare REF OURS OUT T …` | ảnh cạnh nhau + bảng số + gợi ý sửa |

Đã kiểm (2026-11-15): NeuraFlow (SaaS 16:9, có nhạc), Foodtage (talking head 9:16, lời tiếng Anh), track trên chuyển động biết trước (sai số 1 khung).
Giới hạn: chuyển cảnh mờ trên nền tối có thể bị sót; "chuyển mềm" có thể là chuyển động camera lớn; BPM có thể lệch ×2.
