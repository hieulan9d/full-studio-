# Việt Hàn: animation chữ + SFX (rút từ 2 video mẫu, 2026-11-19)

Mẫu: `260606 Gói Tầm soát sức khỏe DQ.mp4` (32 s, 98,6 BPM không theo nhạc) và `Việt hàn-GÓI KHÁM FREE 2.mp4` (59 s, 60 fps).
Soi bằng `refkit.py strip` (mỗi 2 khung = 15 khung/s). Số liệu dưới đây là **đọc từ ảnh khung** (độ chính xác ±1 khung), chưa `track`.
Mọi ý tưởng là **kỹ thuật**: không chép chữ/hình của mẫu.

## 1. Chữ vào (6 kiểu)
| Kiểu | Mô tả đo được | Dùng cho |
|---|---|---|
| **Pill pop + vệt sáng** | 0–0,1 s: pill thành **vệt ngang mỏng** (scaleY ~0,12), trắng-vàng cháy sáng + quầng; 0,1–0,3 s: bung ra **overshoot ~106%**, quầng vàng tan dần trong ~0,6 s; 0,3–0,45 s lắng về 100% | tiêu đề cảnh, "MIỄN PHÍ 100%", "ƯU ĐÃI THÊM" |
| **Sóng chữ trong pill** | sau khi pop: một chữ to ~115–125% **chạy từ trái sang phải** từng chữ (~0,03–0,07 s/chữ) trong ~1 s; sóng chỉ chạy lần đầu | tiêu đề trong pill |
| **Typewriter có con trỏ** | mỗi ký tự ~0,07–0,1 s, **con trỏ khối trắng** nhảy theo; **màu lúc gõ = đỏ**, gõ xong đổi sang màu cuối trong ~0,2 s; pill/khung **giãn ra** khi dòng 2 bắt đầu gõ | dòng phụ "NHẬN ĐẶC QUYỀN NÀY", số "100%", hook gõ chữ |
| **Từ khoá pop** | chữ xanh/trắng viền trắng-xanh, vào từ **nhỏ 50% → 115% → 100%** trong ~0,2 s; từ cũ **thu nhỏ rồi biến**, từ mới pop ngay (hỗ trợ → kiểm tra) | chữ nhấn dưới người dẫn, danh sách |
| **Thẻ trắng/giá pop** | thẻ bật ngay (1–2 khung), nhãn vàng nhạt trên, số **gõ từng ký tự màu đỏ** (ký tự to hơn khi vào) | giá, "100%" |
| **Bảng/lưới slide** | nền xanh dương hoa văn ống + pill tiêu đề; **ô ảnh bo góc 3×2** vào lần lượt; **nhãn dưới ô hiện đúng theo mốc lời** và có thể **đổi chữ** khi lời thêm ý ("Nội khoa" → "Nội – Ngoại khoa") | liệt kê hạng mục, chuyên khoa |

## 2. Chữ ra
- Typewriter ra: chữ **giãn khoảng cách chữ + mờ** trong ~0,13 s (4 khung) rồi mất (đo ở "BẠN CÓ CHẮC RẰNG?").
- Pill ra: cắt hoặc thu nhẹ + mờ ~0,1 s. Từ khoá ra: thu nhỏ khi từ mới pop.
- Pill có thể **nhảy vị trí** (giữa → trên) trong 1 khung khi sang cảnh khác.

## 3. Nhấn màu
- Nền pill vàng `#ffe003`, chữ xanh `#239555`; **dòng phụ đỏ-cam** khi cần nhấn; chữ gõ **đỏ** lúc đang gõ.
- Từ khoá trong câu: đổi màu **đỏ / vàng / xanh** (ví dụ "Không" đỏ, "Khám bệnh" vàng) có viền trắng. Mỗi dòng nhấn 1 cụm.
- Số then chốt (100%, giá): **đỏ** trên thẻ trắng.

## 4. Khung hạn chế (cả 2 mẫu)
Nền mờ + **đồng hồ** + dòng đỏ "CHỈ ... SUẤT" + dòng xanh/đỏ phụ; mẫu 2 thêm **bộ đếm số suất** (199→196→194 kiểu odometer) và đồng hồ về 12:00 kèm "HẾT SUẤT / Chương trình kết thúc".

## 5. SFX (cách làm trong dự án này)
- **Không trích SFX từ video mẫu** (bản quyền). Dùng kho đã duyệt `saas-animation/audio/sfx/` (tổng hợp, không vướng bản quyền).
- Nghe mẫu bằng số: phát hiện onset tần số cao ngoài lời — tick/gõ phím lặp **~0,15 s** trong lúc typewriter (0,42 / 0,58 / 0,73 / 0,89 s), bật ở lúc pill pop (1,49 s), mỗi từ khoá pop (2,09 / 2,24 s), gõ "100%" (3,63 s). **Chỉ suy từ mốc, chưa nghe được âm sắc.**
- Bảng gán (mức so với đỉnh file đã chuẩn hoá −3 dBFS, giọng ~−14 LUFS):
| Hiệu ứng | SFX | Mức |
|---|---|---|
| Pill pop + vệt sáng | `whoosh_fast_a` tại 0 s, `pop_b` tại +0,12 s | −10 / −7 dB |
| Typewriter | `tick_a` mỗi 2 ký tự | −20 dB |
| Từ khoá pop | `pop_a`/`pop_c` luân phiên | −10 dB |
| Ô lưới vào | `pop_c` | −12 dB |
| Nhãn đổi/hiện | `click_a` | −16 dB |
| Thẻ giá, số đỏ | `shimmer_a` + `pop_b` | −12 / −8 dB |
| Đồng hồ vào | `whoosh_a` | −14 dB; dòng gõ `typing_b` −16 dB |
| CTA hotline | `sparkle_a` | −12 dB |
- **Video y tế: không dùng impact/riser lớn** (nghe như phim hành động). Không nhạc nền khi chưa được duyệt.
- Sau khi trộn: 2 lượt `loudnorm` về −14 LUFS (`talking-head/knowledge/05-am-thanh.md`).
- **Chưa kiểm**: tai người dùng có thấy SFX vừa mức không — hỏi người dùng nghe thử và chỉnh dB.
