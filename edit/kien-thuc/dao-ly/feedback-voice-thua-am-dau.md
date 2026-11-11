---
name: feedback-voice-thua-am-dau
description: Giọng VoiceStudio/canvas đôi khi thừa 1 âm lạ ở đầu file; người dùng tự cắt khi edit CapCut
metadata:
  node_type: memory
  type: feedback
  originSessionId: 3a80aab5-b3d4-4bbc-826f-da41da313caf
  modified: 2026-11-03T01:07:41.281Z
---

Giọng đọc tạo từ canvas/VoiceStudio đôi khi bị thừa một âm ngắn ở đầu file (thấy trên waveform CapCut là một nhịp nhỏ trước đoạn nói chính). Người dùng tự cắt khi edit, chỉ báo để mình biết.

**Why:** lỗi sinh giọng, không phải lỗi dựng; người dùng không yêu cầu mình sửa.
**How to apply:** khi đọc draft CapCut người dùng đã chỉnh, nếu thấy đoạn voice bị cắt/dời ở đầu thì đó là sửa lỗi này, không phải phong cách dựng. Có thể kiểm tra và tự cắt phần thừa đầu file giọng ở tập sau (xem [[project-canvas-den-edit]]), nhưng nên báo người dùng.

**Chi tiết kỹ thuật (tập 2, 2026-11-03):** VoiceStudio chèn tiếng thừa ~0,1-0,2s ở đầu MỖI đoạn, rồi lặng 0,3-0,5s mới tới lời → phải cắt từng đoạn (không chỉ cắt lặng đầu). Đoạn mục liệt kê "Hai:" đôi khi bị bỏ mất chữ "Hai" ngay từ giọng → phải nghe lại bằng whisper và tạo lại. Đọc "ba nghìn không trăm sáu mươi" có thể rớt "nghìn" (whisper vẫn ra 3060, không phân biệt được; thêm dấu phẩy sau "nghìn"). Số khẩn cấp phải viết "gọi số một một bốn". Đoạn giọng tạo lại ra 24000 Hz: phải đổi về 44100 mono trước khi ghép, nếu không giọng ngắn đi. Whisper nghe "Ngửi" thành "người", số thành chữ số: không phải lỗi. Cắt kiểm bằng so 3 chữ đầu, đừng chỉ so 1 chữ.
