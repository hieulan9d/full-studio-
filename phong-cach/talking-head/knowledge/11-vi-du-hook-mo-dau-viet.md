# 11. Ví dụ tiếng Việt: "Cách mở đầu video thu hút hơn" (phong cách chuyên gia tối-xanh, ít chữ)

Phân tích bằng `PHAN-TICH-VIDEO-MAU/tools/refkit.py` (2026-11-16), mức giống 2–3 (cấu trúc, nhịp, bố cục; chưa đo ease từng chuyển động).
Nguồn: `PHAN-TICH-VIDEO-MAU/mau/hook-talking-head/ref.mp4` (+ `out/` có ảnh khung, `words.json`) **chỉ có trên máy người dùng, không đưa lên git** (video của người khác, bản quyền). Muốn xem lại: tải video về và chạy `refkit.py analyze`. Video **tiếng Việt đầu tiên** của kit, nội dung là chính video dạy về "chữ + hình trong 3 giây đầu".
(đo) = từ số đo của máy; (mắt) = xem ảnh khung; (ước) = suy luận, chưa kiểm.

## 1. Thông số
1080×1920 · 30 fps · 39,91 s · tiếng Việt, **4,6 từ/s** (đo) · −14,1 LUFS (đo) · **0 chuyển mềm, 14 cắt cứng, đoạn TB 2,66 s** (đo).
Xương sống là **lời**, nhưng chỉ 7/14 chỗ cắt trúng đầu từ (±100 ms) = 50%, thấp hơn Foodtage (11/16): cắt có thể trễ/sớm 0,1–0,3 s so với từ. Không phát hiện nhạc (độ rõ nhịp 0,04, BPM 113 là nhiễu); mình không nghe được nên **chưa biết có nhạc nền hay SFX không**.

## 2. Phong cách (khác Foodtage)
| Lớp | Giá trị |
|---|---|
| Nền | phòng tối, rèm lá sách xanh cobalt: `#214d8a` ở rèm (đo), góc tối `#121013`, đen 5–60% khung tuỳ cảnh |
| Người | áo đen, da `#b19088` (đo), mic cài áo; camera cố định cận ngực, mặt chiếm ~45–50% bề ngang (mắt) |
| Độ sáng / bão hoà | TB 54/255 / 99/255 (đo): tối, xanh, bão hoà cao hơn Foodtage |
| Chữ | **chỉ từ khoá, không phụ đề từng từ** (mắt, soi 5 khung/s suốt 40 s). Hai cấp: dòng nhỏ chữ thường ("mình đã", "cách để", "video", "yếu tố") + dòng **to đậm nghiêng chữ hoa/thường** ("HỌC HỎI", "mở đầu", "thu hút", "ĐƠN GIẢN"). Màu trắng ánh xanh có bóng đổ; **có dấu tiếng Việt đủ** (HỌC HỎI, ĐƠN GIẢN). Font chưa nhận ra tên (sans đậm nghiêng) → kiểm bằng `fonts_vi.py` |
| Đồ hoạ | thẻ điện thoại trắng bo góc, khung nét đứt sáng quanh vùng nhấn, bong bóng emoji, đường kẻ trắng chỉ từ emoji |
| Chi tiết | cạnh 3–9%: ít chi tiết hơn video SaaS |

## 3. Bảng cảnh (đo: giây và độ dài; mắt: nội dung)
| # | Giây | Loại | Hình + chữ |
|---|---|---|---|
| 1 | 0,0–1,3 | mặt người | "mình đã / HỌC HỎI" blur-in ở ngực (từ 0,2–0,6 s) |
| 2 | 1,3–2,3 | **cắt sang người được nhắc tên** | mặt người khác + tên 2 dòng ("DEVIN / JATHO") ở ngực, vào mờ-rồi-nét trong ~0,4 s |
| 3 | 2,3–3,6 | như 2 | người thứ hai + tên ("IMAN / GADZHI") |
| 4 | 3,6–5,7 | mặt người | **zoom giật có nhoè** lúc vào (khung 3,6 nhoè, mặt to hơn hẳn), "cách để / mở đầu" ở đỉnh đầu, "video / thu hút" ở ngực |
| 5 | 5,7–6,1 | **nháy trắng** | thẻ trắng 0,43 s, chữ đen nghiêng "chỉ với" bên phải (độ sáng TB nhảy 49 → 151, đo) |
| 6 | 6,1–7,1 | mặt người | "MỘT" **rất to sau lưng đầu** (ánh kim, mắt), "yếu tố / ĐƠN GIẢN" ở ngực |
| 7 | 7,1–11,5 | **chia đôi màn hình** | nửa trên (~0–46% chiều cao): 2 thẻ trắng bay vào xoay nghiêng rồi dừng, có số lượt xem (178K / 145K); nửa dưới: người nói cận hơn. Nền gradient xanh đậm |
| 8 | 11,5–14,6 | người + dải thẻ | dải thumbnail video cuộn ngang ở nửa dưới 11,6–14,1 s |
| 9 | 14,6–16,5 | mặt người | zoom vào (cận hơn) |
| 10 | 16,5–20,6 | **B-roll thẻ dọc, tối đi** | khung hình dọc bo góc giữa màn hình, nền đen; sáng tụt từ 57 → 18/255 trong ~1,5 s (đo); khung nét đứt sáng quanh chữ "If you have / inflamed gums" + ảnh minh hoạ + emoji |
| 11 | 20,6–22,3 | mặt người | |
| 12 | 22,3–25,1 | B-roll thẻ dọc (lặp cảnh 10, sáng 22,2 s rồi tối) | |
| 13 | 25,1–29,6 | mặt người | |
| 14 | 29,6–35,4 | **chia đôi ngược** | nửa trên: cận ảnh B-roll (chữ + ảnh + emoji + đường kẻ trắng); nửa dưới: người nói. Không đổi suốt 5,8 s |
| 15 | 35,4–39,9 | mặt người | zoom giật có nhoè lúc vào, rồi giữ tới hết. Không có thẻ CTA hay logo cuối (mắt) |

## 4. Luật rút ra (để làm video tiếng Việt cùng kiểu)
1. **Không phụ đề từng từ.** Chỉ chữ từ khoá ở những chỗ cần nhấn; phần còn lại người nói một mình trên nền.
2. **Chữ hai cấp**: một dòng nhỏ làm "nhãn", một dòng to đậm làm từ khoá; đặt ở ngực (dưới cằm) hoặc đỉnh đầu, **không che mặt**; vào bằng mờ-nhoè rồi nét ~0,3–0,4 s (mắt, khung 0,2–0,6 s).
3. **Nhắc tên người thì cắt sang mặt người đó + thẻ tên** (1–1,3 s; cắt trong khoảng ±0,25 s quanh lúc nói tên). Video mới dùng người thật khác: phải có phép của họ.
4. **Nháy trắng 0,4 s** làm bản lề giữa hai ý, kèm chữ đen nghiêng trên nền trắng.
5. **Chia đôi màn hình** (đồ hoạ trên ~46%, người dưới ~54%) để người nói vẫn xuất hiện khi cho xem ví dụ: dùng 4,4 s và 5,8 s liền, không cắt.
6. **B-roll thẻ dọc**: làm tối nền hết cỡ (đen 63%) để thẻ nổi, khung nét đứt sáng chỉ vào chỗ cần nhìn; dùng 2 lần (4 s + 2,8 s) cho cùng một ví dụ, lần sau sáng lên trước khi tối lại.
7. **Zoom giật có nhoè** ở đầu đoạn 4 và 15 (cú nhấn mở và đóng). Cận dần theo đoạn: 9 (14,6 s) cận hơn 8.
8. Nhịp: **cảnh mới mỗi 2,7 s** (TB), có một cú đột phá mỗi 4–5 s; đây là nhịp **trung bình**, giữa Foodtage (0,3–0,7 s) và minimal premium (2–4 s).

## 5. Chưa đo / chưa kiểm
- Ease, thời lượng từng chuyển động (chưa chạy `track`; lệnh này chậm trên máy này, đã bỏ ở lần phân tích khác).
- Tên font, SFX, nhạc nền, hiệu ứng "MỘT" ánh kim (3D? bevel? mắt thấy gradient trắng-xám có viền sáng).
- Cách nhoè khi zoom: chưa biết do quay hay hậu kỳ (mắt: khung 3,6 và 35,4 nhoè rõ).
- Cảnh 2–3 dùng **người thật khác**: kit không có cách làm tự động; cần ảnh/clip có phép.

## 6. Whisper trên tiếng Việt (bằng chứng cho CON-THIEU A2)
Bản whisper trong `refkit.py` (không phải bản large-v3-turbo của kit) nhận **kém tên riêng và từ mượn**: "Devin Jatho" thành "Devon / Jethro", "Iman Gadzhi" thành "Imang Gaji", "text" thành "tét", "đoạn" thành "đàn". Phần tiếng Việt thường ngày nhận khá (các câu đầu: "Mình đã học hỏi từ…", "mở đầu một video thu hút" đúng) nhưng cuối đoạn 10 trở đi có nhiều từ sai ("đàn tét", "kiểu phép", "rác phép"). → **Bắt buộc đọc lại transcript và sửa tên riêng/thuật ngữ trước khi lập plan.** Mốc từng từ dùng được để đặt keyframe: chữ trên màn hình vào trong khoảng ±0,3 s quanh mốc của từ (mắt, lấy mẫu 0,2 s; "học hỏi" 0,5–0,84 s so với chữ hiện ở 0,4–0,6 s; "đơn giản" 6,48–6,74 s so với chữ hiện ở 6,8 s). Cắt sang người được nhắc cũng lệch cùng cỡ: "Devon" bắt đầu 1,08 s, cắt ở 1,30 s; "Imang" bắt đầu 2,54 s, cắt ở 2,30 s.
