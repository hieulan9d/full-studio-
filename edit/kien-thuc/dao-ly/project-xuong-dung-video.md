---
name: project-xuong-dung-video
description: Hệ thống dựng video kiểu VideoFlow người dùng yêu cầu (vf + app web), vị trí và cách chạy
metadata:
  type: project
---

Người dùng (Hiếu) yêu cầu làm hệ thống edit video giống video mẫu D:\download\Facebook.mp4 (quảng cáo VideoFlow: AI dựng video qua chat). Đã xây: bộ lệnh `vf` (E:\antigravyti\edit video toàn diện\vf), file dự án JSON `projects/<tên>/project.json`, app web `app/server.py` (cổng 5180, `chay-app.bat`) có timeline + xem trước + khung chat gọi `claude -p` (stream-json, dùng gói Claude Code, không cần API key). CLAUDE.md ở thư mục gốc hướng dẫn Claude trong chat. Dự án mẫu: An Vượng Pharma TVC 3 phút; giọng "thanh thanh tvc" id d00dc307 trong VoiceStudio (localhost:3900).

**Why:** người dùng muốn "hệ thống của chúng ta như video", không chỉ vài script.
**How to apply:** khi dựng video mới, tạo project.json mới trong projects/, dùng vf; luật dựng xem [[feedback-chon-va-lap-source]]. Xuất CapCut: track giọng đọc từng không mở được (chưa rõ nguyên nhân), dùng `--audio none` mặc định.
