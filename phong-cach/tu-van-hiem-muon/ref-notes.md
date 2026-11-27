# Ref-notes: 20 reel tư vấn hiếm muộn

## 0. Tóm tắt
- Nguồn: `E:\video mẫu để clone` (20 mp4) · 540×960 (1), 720×1280, 1080×1920 · 30 fps · 26–97 s · thể loại: người tư vấn nói + nền đồ hoạ · mức giống: 3 (mặc định, chưa hỏi)
- Xương sống thời gian: **lời** (đo: độ rõ nhịp nhạc 0,02–0,10; ~4,8 âm tiết/s)
- Số đo máy và bản chép lời từng video: `output/ref-phu-khoa/NN/` (`ref-auto.md`, `loi.txt`, `words.json`); tên theo số ở `output/ref-phu-khoa/index.json`.
  Whisper large-v3-turbo trên CPU; chữ y khoa còn sai ("dụng trứng" = rụng trứng, "xảy" = sảy). `NN/` đo bằng `--no-words` nên `ref-auto.md` không có phần lời.

## 1. Phong cách chung
| Lớp | Giá trị |
|---|---|
| Khung | độ sáng TB 101–148/255, bão hoà 95–127, chi tiết 7,2–8,6% (đo) |
| Người dẫn | một người ở cả 20 video; scrub xanh đậm (đa số), xanh nhạt (video 03, 19), xanh cổ vịt có bảng tên (13) (nhìn) |
| Nền | đổi trung vị 3,4 s, p25 2,4, p75 4,6 (đo máy theo màu hai góc trên, 295 đoạn, gần đúng) |
| Chuyển nền | dissolve ~12–15 khung, người dẫn không bị bóng đôi (đo: video 03, 6,9–7,4 s) |
| Chuyển người | đa số liền; có chỗ cắt cứng đổi cỡ khung (video 02, 2,5 s) và dissolve cả người (15 ở 42 s, 20 ở 56 s) (nhìn) |
| Hook | thẻ trắng chữ đỏ `#d50921`, mất sau ~3–5 s (đo máy 9/20 video, còn lại nhìn ảnh) |
| Phụ đề | ~3 từ/cụm, từ đang đọc `#59ff41` (đo), trắng viền đen |
| Âm thanh | −14 LUFS cả 20 video (đo) |

## 2. Danh sách video
| # | Đề tài | Dài (s) |
|---|---|---|
| 01 | 3 sai lầm làm giảm khả năng thụ thai | 56 |
| 02 | 3 điều kiện vàng nhanh có bầu | 60 |
| 03 | 4 không khi tới tháng | 60 |
| 04 | 42 tuổi, kinh ít, thả mãi chưa có | 61 |
| 05 | 6 ngày vàng | 41 |
| 06 | Biểu hiện trứng lép | 44 |
| 07 | Chu kỳ 29 ngày, kinh 12/11 | 54 |
| 08 | Chu kỳ đều 27 ngày | 41 |
| 09 | Có kinh 15/11 | 60 |
| 10 | Viêm lộ tuyến nặng | 80 |
| 11 | Kinh chỉ có 2 ngày | 55 |
| 12 | Liên tục sảy thai sớm | 63 |
| 13 | Mong con đã lâu (bán combo) | 97 |
| 14 | Niêm mạc 6 mm dày hay mỏng | 46 |
| 15 | Niêm mạc 6 mm nên ăn gì (đuôi `words.json` có câu whisper bịa "subscribe kênh La La School") | 78 |
| 16 | Bồi bổ khí huyết | 49 |
| 17 | Thực phẩm kích trứng | 26 |
| 18 | Vô sinh thứ phát | 54 |
| 19 | Yêu không lên đỉnh | 43 |
| 20 | Đã sinh con, mong bé tiếp | 66 |

## 3. Tài sản cần cho video mới
Người dẫn (quay mới hoặc AI mới), tên và chữ ký của kênh mình, giọng, font script có dấu tiếng Việt, ~14–16 nền/video.

## 4. Thay đổi bắt buộc so với mẫu
Không dùng mặt, giọng, tên "Thùy Eva", chữ ký, hình nền, kịch bản nguyên văn của mẫu (trừ khi người dùng có quyền). Không chép cách viết né bộ lọc.
