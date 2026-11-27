# Lỗi đã gặp

- 2026-11-27 [chạy thật]: whisper chép "đầy đạn", "sốt gà", "đậu lang" cho "đầy đặn", "sốt cà", "đậu lăng". Đối chiếu kịch bản, nghe lại.
- 2026-11-27 [chạy thật]: in transcript tiếng Việt bằng `python -I` lỗi mã hoá cp1252 (`-I` bỏ qua PYTHONUTF8). Dùng `PYTHONIOENCODING=utf-8 python` hoặc `-X utf8`.
