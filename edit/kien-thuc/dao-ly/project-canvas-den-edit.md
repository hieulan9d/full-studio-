---
name: project-canvas-den-edit
description: Quy trình canvas (Infinity Studio) tạo ảnh/video/voice rồi xuất file sang vf dựng; các bẫy đã gặp
metadata:
  node_type: memory
  type: project
  originSessionId: 3a80aab5-b3d4-4bbc-826f-da41da313caf
  modified: 2026-11-02T05:09:19.383Z
---

Quy trình tập 1 "Đạo lý" (projects/dao-ly-tap1): giọng đọc tạo sẵn trên canvas, chia ~13 cảnh 6-10s theo câu, sinh ảnh khung đầu (Nano Banana Pro 9:16) rồi video Omni (seconds 6/8/10) từ ảnh, xuất file qua node "Xuất file", dựng bằng `vf render` (canvas 1080x1920, giọng 1 file voice_all.wav, phụ đề chia đoạn <=38 ký tự theo thời gian chữ từ whisper VoiceStudio). Script: `projects/dao-ly-tap1/build_project.py`.

**Cách điều khiển canvas khi phiên Claude không có MCP:** POST http://127.0.0.1:17371/api/tools, header `x-canvas-agent-token` (token trong %USERPROFILE%\.infinite-canvas\canvas-agent.json, không in ra), body {name,input}. Xuất file: đặt `metadata.exportRequest` mới (`canvas_apply_ops` update_node) cho node `export:folder`; đọc E:\antigravyti\infinite-canvas\exports\manifest.json (items có path, order, durationMs).

**Why / bẫy:**
- Flow chặn prompt nhắc trẻ em/bé ("child", "baby") làm video kẹt "Đang tạo" mãi. Dùng ghế an toàn + gấu bông, không có người nhỏ.
- Node "Xuất file" nên nằm trong khung nhìn canvas, nếu không có thể không xuất.
- Video mới sinh nằm lệch hàng; xếp lại bằng `canvas_move_nodes` (mỗi cảnh một hàng dọc, giọng ở cột trái).
- Tốn credit Flow: thử 1 cảnh trước khi sinh hàng loạt; người dùng thích xếp node dọc cho dễ nhìn.

**How to apply:** tập tiếp theo làm lại đúng quy trình trên, tránh từ về trẻ em trong prompt.

**Tập 2 (Cháy, gas, khí độc) — 2026-11-03:** nguồn sách ở `D:\download\KIM CHỈ NAM SỐNG _CHẤT__LỤA NGUYỄN-…\` (C01_Tong_hop_cho_video.md có bảng chia 8 tập). Làm trong `projects/dao-ly-tap2/` (scenes.json, make_voice.py tạo giọng từng đoạn + whisper kiểm tra, build_project.py, tap2.mp4 116,9s). Người dùng bảo mình tự tạo giọng. Bẫy mới: `canvas_delete_nodes` nhận `ids` (không phải nodeIds); Flow lỗi ảnh nền có bình gas / pin khói → tạo lại ảnh tham chiếu an toàn rồi mới sinh video; đọc số khẩn cấp phải viết "gọi số một một bốn"; node Xuất file phải nằm trong viewport (dùng canvas_set_viewport) mới xuất; manifest gộp cả tập 1, nhận video theo nodeId (video_nodes.json). Tập 2 nằm cùng canvas "đạo lý", cột x≥3400.
