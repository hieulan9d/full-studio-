# Ref-notes: "Thời Trang AI – one shot + giọng AI" (mức giống 2: cấu trúc + nhịp + phong cách)

## 0. Tóm tắt
- Nguồn: `PHAN-TICH-VIDEO-MAU/mau/thoi-trang-ai/ref.mp4` (bản sao file tải về, **chỉ trên máy người dùng, không đưa lên git**, video của người khác) · 1076×1942 (≈9:16) · 30 fps · 13,77 s · có tiếng · thể loại: **UGC quảng cáo thời trang, clip AI một cú máy (one-shot) + giọng AI**.
- Nguồn gốc (suy từ tiêu đề file, ước): người làm nói đây là clip tạo bằng model **Omni** (~20 credit / video 10 s) ghép với giọng "Adam". Chưa kiểm được model nào thật sự tạo ra clip.
- Một câu: **cô gái đứng yên giữa phòng khách, camera cố định, vừa nói vừa vẫy tay / khoe váy, không chữ, không cắt, không đồ hoạ — trông như quay điện thoại thật.**
- Xương sống thời gian: **lời** (4,1 từ/s, nói liên tục, nghỉ giữa các câu ~0,3–0,5 s). Nhạc không phát hiện (độ rõ nhịp 0,07 → đừng ép lưới phách). Cắt cảnh: **0** (1 cú máy).
- Luật rút ra:
  1. Một cú máy liền, camera **cố định** (nền tường/rèm/sofa không đổi qua 13 s — xem overview, chưa `track` do công cụ chạy chậm).
  2. Không chữ, không phụ đề, không logo, không icon (đo bằng mắt trên overview + 3 dense).
  3. Hành động theo lời: vẫy "Ê ê" → khoe váy (kéo vạt, tay vào túi, xoay nhẹ) → vẫy tay cuối câu chốt (12,4–13,6 s).
  4. Lời **hook ngay 0 s** ("Ê, ê, mấy bà ơi, dừng lại xíu coi") — không logo, không intro.
  5. Cấu trúc lời: gọi → chất liệu (mềm mượt, mát, rơi nhẹ) → "nhìn sang, tưởng 400–500k" (neo giá) → "ai đang kiếm bộ mặc hàng ngày thì chốt em này liền nha" (CTA).
  6. Giọng nói tiếng Việt miền Nam, thân mật, xưng hô "mấy bà".

## 1. Phong cách chung
| Lớp | Giá trị |
|---|---|
| Nền | tường kem-hồng `#b3a8a6` (đo, 6 s), sàn gạch trắng; sofa nâu đỏ `#271013` + đèn cam `#9c4132` góc phải (đo) |
| Nhân vật | da `#cd9385` (đo ở mặt), váy xanh nhạt sọc `#c4cddb` (đo), túi đeo chéo nâu |
| Độ sáng TB | 136/255, bão hoà 48/255 (đo); không cháy trắng (0,0%), đen 0,6–1,1% |
| Ánh sáng | ánh sáng tự nhiên mềm từ phía trước, không bóng gắt (mắt) |
| Chi tiết | cạnh 8,1–9,7% (đo) — đều, không đổi theo giây |
| Camera | cố định, khung full-body, đầu cách mép trên ~3%, chân cách mép dưới ~0% (mắt) |
| Hậu kỳ | không grade rõ, không vignette, không chữ (mắt) |
| Âm thanh | -14,1 LUFS (đo); giọng nói là chính |

## 2. Bảng cảnh
| # | Giây | Dài | Loại | Nội dung | Vào | Ra |
|---|---|---|---|---|---|---|
| 1 | 0,00–13,77 | 13,77 | one-shot full-body | người mẫu AI nói + khoe váy | — | — |
(Máy báo "chuyển mềm" ở 13,10 s: **báo nhầm** — đó là tay vẫy nhanh, xem `cut_00.jpg`. Các ứng viên 5,4 / 6,8 / 10,2 / 11,5 s cũng chỉ là đổi tư thế.)

## 3. Nhịp hành động theo lời (mắt, từ overview + dense_02)
| Giây | Lời (ASR, có lỗi) | Hành động |
|---|---|---|
| 0,0–1,2 | Ê, ê, ê mấy bà ơi | đứng thẳng, nhìn camera, tay buông |
| 1,5–2,5 | dừng lại xíu coi | đứng yên |
| 3,5–5,0 | Bộ này mặc lên mê liền luôn á | giơ tay trái, dấu chữ V (3,5–5,5) |
| 5,0–7,7 | chất lụa mềm mượt, mặc vô mát rơi nhẹ tênh | tay đặt lên bụng → vuốt/kéo vạt váy (6,0–7,0) |
| 8,2–11,9 | nhìn sang lắm, ai cũng tưởng bộ này 400–500k, ai đang kiếm… | tay trái cho vào túi áo, nghiêng người nhẹ, đứng yên |
| 12,4–13,7 | thì chốt em này liền nha | vung tay trái ra sau rồi lên vẫy (12,4–13,2), giữ tư thế |

ASR (whisper tiếng Việt) nhận sai nhiều ("lước, lua, mước, tên…" = "xíu, lụa, mượt, tênh"…): **không dùng `words.json` làm lời, chỉ dùng mốc thời gian.** "sinh sáng" ở 11,86 s chưa rõ (có thể "sinh hoạt"): chưa kiểm.

## 4. Âm thanh
- Giọng: AI, nhịp nhanh 4,1 từ/s, ngắt ~0,3–0,5 s giữa câu. Tôi không nghe được: chưa xác nhận giới tính/cảm xúc/độ khớp môi.
- Nhạc: không phát hiện. SFX: không đo. Nếu thêm nhạc nền, theo `HUONG-DAN-AI.md` mục 8 phải hỏi người dùng.

## 5. Cần tài sản (khi làm video mới theo thể loại này)
- Ảnh sản phẩm thật (mặc trên người/trải phẳng) làm tham chiếu — **có thể thiếu: hỏi người dùng**.
- Ảnh tham chiếu người mẫu AI (hoặc để model tự sinh) — thiếu.
- Giọng: người dùng chỉ định (mẫu dùng "Adam"; mã giọng trong Voice Studio khác theo máy).

## 6. Khó / không làm được
- Khớp môi tự nhiên với lời tiếng Việt: Omni/Flow tạo clip có thể có miệng cử động nhưng khớp lời là **chưa kiểm** → cần thử trước.
- Chi tiết hoa văn váy/túi/chữ trên sản phẩm hay lệch qua các khung (vẫy tay, xoay) → kiểm từng clip.
- Clip dài 13,8 s vượt Omni 1.1 (10 s); dùng `flow-omni-1.2-flash` (≤15 s) hoặc ghép 2 clip (sẽ có mối nối, **chưa kiểm**).

## 7. Thay đổi so với mẫu (bản quyền)
- Không dùng lại người mẫu, giọng, lời thoại, sản phẩm của mẫu; chỉ học cấu trúc kể + kỹ thuật one-shot.
