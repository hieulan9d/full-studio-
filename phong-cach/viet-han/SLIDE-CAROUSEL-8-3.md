# Cảnh slide "băng chuyền thẻ" (rút từ `Việt Hàn Thiện Trang 8-3.mp4`, giây 27,4–34,4, soi 15 khung/s)

Số đo từ khung 1080×1920 (±5 px), chưa `track`:
- **Nền:** cảnh quay mờ + phủ xanh ngọc tối (teal) kéo toàn khung, dưới khung thương hiệu (tab logo KIH + logo Thiện Trang, thanh xanh dưới có 2 địa chỉ).
- **Thẻ giữa:** video 9:16 bo góc lớn (bán kính ≈ 80 px), rộng ≈ 756 px (x 162–918), cao ≈ 1344 px (y 288–1632).
- **Thẻ hàng xóm lộ hai bên:** thẻ trước/sau cao ≈ 1152 px (y 384–1536) nằm sau, chỉ thấy phần ngoài mép thẻ giữa → hiệu ứng băng chuyền.
- **Chữ:** nhãn trắng đậm viền xanh lá (stroke dày ≈ 8 px), giữa thẻ, sát đáy thẻ (y ≈ 1530); dòng phụ nhỏ hơn màu xanh lá sáng ("BUỒNG TRỨNG") hiện sau ~0,7 s; nhãn mới thay cùng lúc thẻ mới; "SIÊU ÂM VÚ" ... thay bằng cắt.
- **Chuyển thẻ:** thẻ mới **trượt ngang vào từ phải**, thẻ cũ đẩy sang trái, ≈ 0,2 s (khoảng 12 khung 60 fps ở các cặp 28,2→28,3, 29,3→29,45, 30,8→31,0), không mờ; thẻ nằm yên ≈ 1–2 s (27,43–28,2; 28,3–29,3; 29,4–30,9; 31,0–…).
- Hết slide thì cắt cứng về người dẫn.

# Học từ bản người dùng tự làm slide đầu (thien-trang-v2, 2026-11-21) — chưa áp dụng vào script
Đọc từ `draft_content.json`, cảnh băng chuyền A (12–23,5 s):
- **Mask:** `roundCorner` **0,14**, width 0,992, height 0,996 (không phải 0,17).
- **Thẻ giữa:** scale **0,62** tại x 0, y +0,008 (không phải 0,7). **Thẻ hàng xóm:** scale **0,51**, x **±0,709** (phải +0,709, trái -0,708 đến -0,533), y +0,008.
- **Chuyển thẻ rất nhanh, dùng ít keyframe:** hàng xóm phải → giữa trong ≈ **0,1–0,23 s** (x 0,709 → 0,354, scale 0,511 → 0,565), giữa → trái trong ≈ **0,3 s** (x -0,177 → -0,708, scale 0,594 → 0,51). Đường cong `Line`, không thêm điểm ease; thẻ xuất phát ngoài màn từ x ≈ 0,945–1,51 (scale 0,475–0,51) rồi vào x 0,7.
- Mỗi thẻ vẫn tách nhiều đoạn trên các track khác nhau (track giữa trên, hai track hàng xóm dưới); người dùng thay vài clip (C0114, C9933…).
- Zoom clip B-roll 1,0 → 1,1 và hook 1,32 → 1,12 → 1,2: giữ nguyên bản máy; clip C4024 làm chậm ×0,8.
=> Lần sau: dùng số trên, bỏ easing 10 điểm và slide 0,32 s của tôi.
