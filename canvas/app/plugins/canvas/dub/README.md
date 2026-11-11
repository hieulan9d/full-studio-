# Lồng tiếng (VoiceStudio)

Node canvas: nối một node **video** vào, chọn ngôn ngữ đích / chế độ căn thời gian / khớp giọng, bấm **Lồng tiếng**.
Plugin chạy cả quy trình của VoiceStudio (tải lên, nhận dạng, dịch, tạo giọng, xuất) rồi thêm node video kết quả.

Cần VoiceStudio chạy ở `127.0.0.1:3900` và Proxy cục bộ (`127.0.0.1:23210`) của canvas.

```bash
npm install && npm run build   # -> web/public/plugins/dub.js
```
