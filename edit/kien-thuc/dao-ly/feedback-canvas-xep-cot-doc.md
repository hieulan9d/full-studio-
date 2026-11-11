---
name: feedback-canvas-xep-cot-doc
description: Người dùng muốn node canvas mỗi tập là MỘT CỘT DỌC riêng, không xếp ngang; canvas tự đặt node mới nằm ngang nên phải xếp lại sau khi sinh
metadata:
  type: feedback
---

Người dùng nhắc nhiều lần: đừng để node canvas nằm ngang, mỗi tập một cột dọc riêng (2026-11-05: "từ giờ tạo dọc mỗi tập là 1 dọc riêng").

**Why:** canvas mặc định đặt node mới thành một hàng ngang dài, khó xem.
**How to apply:** sau khi sinh ảnh/video xong luôn chạy `python canvas-tools/ep.py layout N X0` (tập 5=15000, 6=17000, 7=19000, tập sau cách 2000). Liên quan [[project-canvas-den-edit]].
