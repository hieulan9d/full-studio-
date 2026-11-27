# Học từ bản người dùng tự chỉnh trong CapCut (v9 -> "Clip ghép", 2026-11-19)

Đọc từ `draft_content.json` (clip ghép lồng nhau: `materials.drafts[].draft`). Danh sách animation CapCut người dùng chọn (kèm resource_id, path) lưu ở `capcut-animations.json`, dùng lại để gán animation native khi dựng.

## Việc người dùng GIỮ nguyên từ bản máy dựng
- Cỡ chữ (quy đổi px/6,5 đúng), nền pill vàng `#FFE003` bo 0,5, nền thẻ giá `#FBFBEC` bo 0,3, nhãn dưới ô (vị trí x -0,633/0/0,633; y 0,006 và -0,525), cấu trúc track chữ, keyframe pop, khung PNG của họ (`khung dọc FACEBOOK.png`).

## Việc người dùng SỬA (máy phải làm theo lần sau)
1. **Gán animation CapCut cho mọi chữ** (vào 0,33–0,53 s; ra bằng keyframe alpha): pill tiêu đề = "Sóng âm", "Bật lên", "Loại 1", "Ép đỏ-I"; **dòng gõ/thẻ giá = "Con trỏ mở ra"**; từ khoá = "Máy đánh chữ retro", "Xe điện đụng"; chip phụ = "Trượt hoạt hình", "Bật thẳng lên", "Sóng nảy"; "Nhiễu sóng" cho dòng phụ hook; "Hình chiếu đập thẳng" cho chữ trắng viền trắng "Nha Trang"; "Phép màu dưới trăng" cho dòng đỏ khung hạn chế. **Loop "Phóng to chữ" (nhịp thở) cho các pill lớn** (hook, "DẪN CẢ GIA ĐÌNH", "GỌI NGAY"), "Lắc lư 2" cho "BAO GỒM".
2. **Vị trí pill hạ thấp khỏi tab logo:** tiêu đề bảng 0,712 (≈277 px, máy đặt 200), hook 0,584 (≈400 px), CTA hạ xuống y -0,17…-0,34 (≈1120–1290 px) vì người dẫn được phóng to.
3. **Người dẫn phóng 112% (đầu) / 116% (cuối)** kèm keyframe vị trí/scale/rotation (đẩy nhẹ 105% → 112% ở cuối): chống cảm giác tĩnh, thêm vào kit.
4. **Thêm chữ hook "Nha Trang"** (0–1,17 s, to 17,2, scale 1,41, viền trắng 0,06) trước pill MIỄN PHÍ; pill "Đa Khoa Quốc Tế Việt Hàn" riêng (0,509).
5. Chữ đổi lời: dòng cuối = **`NHẮN TIN "SỨC KHỎE" ĐỂ ĐĂNG KÝ`** (không phải "HOẶC NHẮN TIN…"), hiện lúc 50,83; "CUỐI NĂM RỒI" giữ.
6. **Clip B-roll thay:** X-quang dùng `IMG_9217.MOV` + `261119 may anh (37).MP4` thay `siêu âm bụng cổ (10)`; nhãn giữ dài hơn (không cắt ở mốc từ kế).
7. Chữ nhãn giữ cả đoạn tới khi nhãn mới thay; tiêu đề bảng giữ tới hết bảng.
8. Tất cả gộp thành "Clip ghép" để dễ di chuyển.

# Bổ sung (bản v9 lưu 16:47): cách người dùng làm animation chữ + SFX (chỉ học, không sửa)

## Animation chữ
- **Hai tầng:** (1) keyframe máy dựng giữ nguyên: scale 50% → 108% (0,1 s) → 100% (0,22 s), alpha 0 → 1 (0,1 s), ra: alpha → 0 trong 0,13 s cuối; (2) **animation CapCut gán thêm chỉ cho chữ "anh hùng"**, nhãn/tiêu đề bảng chỉ dùng keyframe, không gán animation.
- **Chữ nào gán gì:** pill hook = "Sóng âm" 0,33 s + loop "Phóng to chữ"; dòng phụ hook = "Nhiễu sóng"; chữ trắng "Nha Trang" = "Hình chiếu đập thẳng"; từ khoá = "Máy đánh chữ retro"/"Xe điện đụng"; thẻ giá + dòng "ĐẾN HẾT 31/12" = "Con trỏ mở ra" (thay gõ chữ); khung hạn chế đỏ = "Phép màu dưới trăng"; CTA: "Ép đỏ-I", "Bật lên" + loop, "Loại 1" + loop (sau 0,5 s), chip phụ = "Trượt hoạt hình", "Bật thẳng lên", "Sóng nảy".
- Thời lượng animation **vào 0,33–0,53 s** (đa số 0,5 s); loop "Phóng to chữ" chạy cả đoạn. Khi đã gán animation vào, người dùng **bỏ keyframe scale** của máy ở một số đoạn (tránh chồng), giữ alpha.
- Pill nhịp thở: người dùng giữ keyframe "thở" máy dựng cho "GỌI NGAY" (1,0 ↔ 1,07 mỗi 0,7 s) **và** thêm loop CapCut.
- Chữ đẩy sớm/lệch: tiêu đề bảng A hiện trễ 0,07 s sau mốc cảnh.

## SFX (người dùng tự thêm trên nền `sfx_bed.wav` của máy, không xoá bed)
- **Mỗi lần chữ vào có 1 SFX riêng đặt trước chữ 0–0,2 s** (nhãn ô: SFX ở 8,13 / 9,17 / 10,03 / 11,27 / 12,83 / 14,30 cho chữ ở 8,27 / 9,33 / 10,23 / 11,37 / 13,07 / 14,43). Các loại khác khớp mốc chữ ±0,1 s (25,37 / 29,20 / 30,23 / 31,20 / 32,43 / 34,30 / 35,83 / 37,90 / 40,57 / 41,43 / 43,50 / 45,40).
- **Gán theo loại, cùng loại dùng cùng file:** nhãn bảng A = 1 tiếng (0,53 s, mức 100%); nhãn bảng B = tiếng khác nhẹ (0,57 s, mức **33%**); từ khoá X-quang/Siêu âm = tiếng ngắn 0,37 s; thẻ giá = 0,63 s; hook/khung hạn chế dùng tiếng dài ~2 s (mức 95–100%); CTA dùng tiếng riêng, "DẪN CẢ GIA ĐÌNH" dùng lại tiếng nhãn B ở 100%.
- **Không phải chữ nào cũng có SFX:** các pill tiêu đề bảng (15,63; 23,63; 27,67) không gắn tiếng riêng, chỉ có tiếng ở các ô con.
- **Thêm nhạc nền vui** ("Happy and Fun Pop…") mức **33%** chạy suốt từ giây 0 (cắt từ giây 10 của file) dưới giọng.
- Mức gợi ý lần sau: nhãn lặp nhiều lần (bảng B) 33%, tiếng chính 95–100%, nhạc nền 33%.
