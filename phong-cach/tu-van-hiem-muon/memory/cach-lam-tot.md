# Cách làm tốt

(Chưa có: chưa dựng video nào bằng kit này.)
- 2026-11-26: Omni 1.2 Flash + 1 ảnh tham chiếu + câu thoại tiếng Việt trong prompt ra giọng Việt, whisper nghe đủ lời (lặp 1 chữ "kỹ"), mặt/áo/bàn giữ giống ảnh. Lời vào ở ~1,1 s: cần cắt đầu. Mỗi clip viết ~35 âm tiết cho 12 s.
- 2026-11-26: dựng nền: tách người bằng `talking-head/tools/matte.py` (RVM, CPU ~60 s cho 12 s), giữ nguyên dải mặt bàn gốc bên dưới (RVM bỏ mất bàn), nền Nano Banana Pro 9:16 đặt vật thể phía trên bên phải, phóng và dịch để vật không bị đầu che. Script mẫu: `output/hiem-muon-v01/build.py`.
- Ảnh Flow tải về phải đổi đuôi URL `=s512-rw` thành `=s0` mới được bản gốc (xem `tools/flowgen.js`).
- Xen phóng 1.70 / 1.84 giữa các clip để chỗ nối trông như đổi cỡ khung giống mẫu.
- 2026-11-26: tạo liền bằng `output/hiem-muon-v01/make_oneshot.py` (1 ảnh người dẫn, prompt tả 2 minh hoạ: nửa đầu / nửa sau) cho nền đổi đúng giữa clip, mặt giữ giống. Nối bằng `build_lien.py`. Tốt hơn tách nền ghép.
- 2026-11-26: `day_chuyen.py --tay <id...>` dựng 10 video một lượt từ clip có sẵn (hook, phụ đề, SFX, 1,1x), không cần sửa tay.
