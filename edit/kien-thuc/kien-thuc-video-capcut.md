# Kiến thức dựng 3 loại video (rút từ dự án CapCut thật)

Nguồn: 3 dự án CapCut trong `E:\file cap cut\CapCut Drafts`:
- `massage body win2`: một dự án chứa 2 video trải nghiệm dài, tổng khoảng 7,8 phút, canvas 1080×1920 (mỗi video khoảng 3–4 phút).
- `260811 Ánh xám`: một dự án chứa 2 video trải nghiệm dài, tổng khoảng 15,3 phút, canvas 1080×1920 (mỗi video khoảng 7–8 phút).
- `0828`: nhiều video quảng cáo ngắn 20–30 giây nối trong một dự án, tổng khoảng 6,2 phút.

Ghi chú: mỗi dự án dài trải nghiệm chứa 2 video nối nhau, nên tổng thời lượng dự án gấp đôi một video. Các con số lấy từ file `draft_content.json` của CapCut, nên chính xác về thời gian, tên file và loại chuyển cảnh. Nội dung lời thoại lấy từ chữ đã gõ sẵn trong dự án, không phải từ việc nhận dạng giọng nói.

---

## 1. Tổng quan các loại video

| Loại | Thời lượng | Đặc điểm chính |
|---|---|---|
| Trải nghiệm dài | Mỗi dự án chứa 2 video, mỗi video khoảng 3–8 phút | Cắt nhịp ~3 giây, phụ đề theo từng câu thoại, nhạc nền nhỏ, ASMR làm âm chính |
| Quảng cáo ngắn | 20–30 giây mỗi video | Mở đầu bằng logo + slogan, hiệu ứng lấp lánh, chuyển cảnh flash, chữ cỡ lớn hơn |

---

## 2. Nhạc (music)

**Video dài**
- Âm thanh gốc của video (ASMR, giọng nói ghi tại chỗ) là âm chính. Thường để riêng track `video_original_sound`.
- Nhạc nền lấy từ file local (ví dụ "Little Things - Immaterial", "TÂN NHẠC THÍNH PHÒNG No.1") bằng cách `extract_music`, chạy nền suốt đoạn cảnh chờ, kéo dài 40–100 giây.
- Khi muốn tắt âm gốc của một đoạn, chỉnh âm lượng về 0.001 (gần như tắt hoàn toàn). Khi muốn đẩy giọng lên, dùng 2–3.6 lần.

**Quảng cáo ngắn**
- Nhạc trending/remix tiếng Việt (ví dụ "Để Anh Lương Thiện (HUY PT REMIX)", "Cứ ngỡ là giấc ngủ trưa..."), chạy 17–30 giây cho mỗi phần.
- Đoạn ASMR ngắn (cạo mặt, ráy tai, gội đầu) làm nhạc nền và âm thật cùng lúc.

---

## 3. Chuyển cảnh (transitions)

Các chuyển cảnh xuất hiện trong ba dự án:
- **Mờ dần** (fade in/out): phổ biến nhất, dùng cho cả hình và chữ.
- **Mờ dần giao thoa** / **Mờ dần giao thoa 2**: hai cảnh chồng nhẹ lên nhau, dùng khi chuyển giữa các cảnh cùng chủ đề.
- **Mờ dần vào giữa**: chuyển từ giữa khung ra.
- **Camera ánh sáng**: chớp sáng giống máy ảnh (dùng trong video dài và quảng cáo).
- **Mờ chậm**, **Kết hợp**, **Quét chuyển cảnh mờ dần**, **Bảng kỹ thuật số**: dùng ít.
- **Đèn flash cam**, **Nhấp nháy tán sắc**, **Thu phóng nhanh dần**, **Kéo ra**: chỉ có trong quảng cáo ngắn, để tạo nhịp nhanh.

Quy tắc dùng:
- Video dài: ưu tiên mờ dần, tránh chuyển cảnh mạnh để không làm rối người xem.
- Quảng cáo ngắn: chuyển cảnh mạnh ở đầu mỗi phần, mở đầu bằng chớp sáng.

---

## 4. Sắp xếp source (footage)

**Thứ tự cỡ cảnh (quy tắc của bạn)**
- Luân phiên: **toàn cảnh → trung cảnh → cận cảnh → toàn cảnh → trung cảnh → cận cảnh**, lặp lại đến hết video.
- Mục đích: tránh nhàm chán vì mỗi lần đổi cỡ cảnh là một góc nhìn mới.
- Toàn cảnh: thấy cả không gian và người, dùng khi mở đoạn hoặc đổi địa điểm.
- Trung cảnh: thấy người từ thắt lưng trở lên, dùng cho thao tác chính.
- Cận cảnh: chỉ thấy chi tiết (tay, dụng cụ, vùng cần chăm sóc), dùng để nhấn mạnh.

**Xử lý cảnh đứng im**
- Nếu source không chuyển động, zoom nhẹ vào để tạo cảm giác sống động (phóng to dần từ khoảng 100% lên khoảng 110–115% trong suốt đoạn).
- Khi zoom, chủ thể phải nằm chính giữa khung hình, không để lệch sang một bên trong suốt đoạn.

**Tiêu chuẩn chất lượng source**
- Không rung: quay bằng gimbal hoặc giá đỡ, tránh cầm tay.
- Nét, rõ chủ thể: lấy nét vào người hoặc thao tác chính, không bị mờ.
- Sạch khung hình: không có người lạ, không có vật thể lạ (tay người khác, đồ vật không liên quan) lọt vào khung.

**Nhịp cắt**
- Video dài: trung bình ~3 giây một đoạn (134–153 đoạn cho cả dự án gồm 2 video).
- Quảng cáo: trung bình ~2,6 giây một đoạn, mỗi phần 20–30 giây.
- Cắt theo nhịp nhạc: mỗi lần chuyển cảnh nên rơi đúng một điểm nhịp (beat) của nhạc nền, dùng tính năng chia nhịp (beat) của CapCut. Các dự án đã đọc không có dữ liệu beat, nên đây là quy tắc mới của bạn, cần làm thủ công hoặc bật chia nhịp khi dựng.

**Cách ghép**
- Mỗi cảnh quay thường là một file riêng có tên dạng `260929 tấn duyên (N).MP4`, sắp theo thứ tự quay.
- Các đoạn đã ghép sẵn được đặt tên `Clip ghép1`, `Clip ghép2`... trong CapCut.
- Tăng tốc 1,1 lần cho một số đoạn trong video dài. Quảng cáo có đoạn tăng tốc 1,44 lần.

**Quảng cáo nhiều phần trong một dự án**
- Các phần 20–30 giây được đặt nối nhau tại các mốc khoảng 0, 20, 45, 78, 243 giây.
- Mỗi phần chạy độc lập: mở đầu bằng logo và slogan, sau đó là nội dung.

---

## 5. Giọng nói (voice)

- Video dài: giọng nói ghi tại chỗ, gồm lời thoại của nhân viên và khách. Lời thoại mang tính hội thoại, ví dụ "Dạ em chào anh ạ", "Em mời anh ngồi nha".
- Phụ đề bám sát lời thoại, mỗi câu một dòng.
- Quảng cáo: không có lời thoại dài. Thay vào đó là slogan ngắn và chữ dẫn.
- Các câu hỏi/đáp trong video dài được cắt sát từng lời, giữ nhịp tự nhiên.

---

## 6. Chữ (text)

**Quy tắc vị trí chữ (cố định)**
- Chữ không được đặt quá cao trên khung hình, giữ ở vùng dưới hoặc giữa dưới để không che mặt và không bị lệch khi video chuyển cảnh.
- Vị trí chữ cố định xuyên suốt video (cùng một toạ độ cho mọi dòng phụ đề), không nhảy vị trí giữa các cảnh.

**Video dài**
- Phụ đề theo từng câu thoại: khoảng 86–113 dòng cho mỗi video. Mỗi dòng hiện khoảng 1,2 giây.
- Chữ trắng (`#FFFFFF`), cỡ 9–10.
- Hiệu ứng xuất hiện: mờ dần.

**Quảng cáo ngắn**
- Chữ thương hiệu "WIN HAIR SALON" (cỡ 15) hiện đầu mỗi phần, khoảng 2 giây.
- Slogan ngắn viết hoa, cỡ 15, hiện khoảng 2 giây ở đầu mỗi phần: ví dụ "XẢ TÓC SẠCH – XẢ LUÔN STRESS", "RÁY TAI ÊM ÁI – CHILL TRỌN TỪNG PHÚT".
- Dòng cuối: tên salon và địa chỉ ("WIN HAIR SALON / 41 LÝ TỰ TRỌNG"), giá combo ("RÁY TAI CÓ TRONG COMBO 129K").
- Hiệu ứng: mờ dần, và hiệu ứng "Loại 1", "Xung nhịp" cho slogan.

---

## 7. Hiệu ứng âm thanh (SFX)

- **Riser** (`RISER_01`): nâng hơi trước khi chuyển cảnh lớn trong video dài, dài khoảng 1,6 giây, lặp lại 7 lần.
- **Tiếng xịt nước** ("Water Spray Sound Effect"): dùng khi có thao tác xịt trong quảng cáo.
- **Tiếng glitch** (theo logo âm thanh): có trong dự án quảng cáo, vị trí cần kiểm tra lại trong dự án.
- **Tiếng màn trập máy ảnh** ("Camera shutter sound (analog)"): xuất hiện ở khoảng 233 giây trong dự án quảng cáo.

Quy tắc dùng:
- SFX ngắn (0,5–1,9 giây), đặt đúng lúc có chuyển cảnh hoặc chữ mới.
- Âm thanh gốc nên giảm âm lượng khi có SFX để không chồng tiếng.

---

## 8. Hiệu ứng chữ và hình (animation & effect)

- Chữ: mờ dần, xung nhịp (phóng to nhẹ), quét vào (kim tuyến, bụi vàng), phát sáng mờ.
- Hình: hiệu ứng lấp lánh "Hào quang lấp lánh" chỉ thấy trong dự án quảng cáo, không thấy trong video dài.

---

## 9. Checklist khi dựng

1. Đặt đúng nhịp cắt: ~3 giây với video dài, ~2,5 giây với quảng cáo.
2. Phụ đề mỗi câu một dòng, cỡ 9–10 (dài) hoặc 15 (quảng cáo).
3. Chuyển cảnh: mờ dần cho video dài; flash/thu phóng cho quảng cáo.
3b. Cỡ cảnh luân phiên toàn → trung → cận, lặp lại.
3c. Cảnh đứng im thì zoom nhẹ 100% → 110–115%.
3d. Source không rung, nét vào chủ thể, không có người hoặc vật lạ trong khung.
3e. Khi zoom, chủ thể nằm giữa khung hình.
3f. Chữ không quá cao, vị trí cố định xuyên suốt.
3g. Mỗi lần chuyển cảnh rơi đúng nhịp nhạc (beat) của CapCut.
4. Nhạc nền thấp hơn âm gốc, tắt hẳn đoạn ASMR nếu cần nghe rõ.
5. SFX đặt đúng điểm chuyển cảnh và chữ giá.
6. Mở đầu quảng cáo bằng logo + slogan trong 2 giây.

---

## 10. Giới hạn của dữ liệu này

- Chưa có vị trí và kích thước chữ trên màn hình.
- Chưa có độ dài fade và độ mạnh của từng SFX (chỉ có thời lượng).
- Không nhận dạng được lời thoại gốc, chỉ có chữ đã gõ sẵn.

## 11. Căn beat và chọn source (đã kiểm tra trên dự án thật)

**Phương pháp kiểm tra**
- Lấy file nhạc đúng trong dự án `massage body win2` (`nếu lúc đó - tlinh ... LTZ Nguyen.mp3`), phân tích nhịp bằng năng lượng âm (spectral flux).
- Nhạc đo được khoảng 136 BPM, 1 beat ≈ 0,44 giây. Đây là ước lượng từ phân tích âm thanh, chưa phải số CapCut.
- Đối chiếu 63 điểm cắt nằm trong đoạn nhạc này với lưới beat.

**Kết quả**
- Chỉ 16% điểm cắt nằm trong 0,05 giây của một beat. Nếu cắt ngẫu nhiên, con số này khoảng 23%.
- Kết luận: dự án này không căn cắt theo beat. Các điểm cắt theo nội dung và cỡ cảnh, không theo nhạc.
- Trong CapCut, phần nhịp nằm ở nút **Đánh dấu nhịp tự động** (chọn Nhịp 1 hoặc Nhịp 2). Dự án đã lưu chỉ có vài dấu nhịp thủ công, không có lưới nhịp đầy đủ, nên không kiểm tra được từ dữ liệu đã lưu.

**Quy trình căn beat (đề xuất để dùng)**
1. Thêm nhạc vào timeline. Bật **Đánh dấu nhịp tự động** và chọn Nhịp 1 (mỗi beat) hoặc Nhịp 2 (mỗi 2 beat tùy độ dài cảnh).
2. Xác định BPM: 60 chia cho khoảng cách giữa hai dấu nhịp liên tiếp. Với nhạc 136 BPM, 1 beat ≈ 0,44 giây.
3. Chọn độ dài cảnh theo bội số của beat: 4 beat ≈ 1,76 giây, 8 beat ≈ 3,5 giây. Không chọn độ dài lẻ.
4. Đặt điểm cắt đúng dấu nhịp. Điểm bắt đầu cảnh mới phải trùng dấu nhịp.
5. Chọn source sao cho chuyển động chính rơi vào beat: tay chạm, dụng cụ chuyển động, hoặc mở đầu cảnh. Không cắt ngay lúc chủ thể đang ở giữa một thao tác dở dang.
6. Kiểm tra lại: phát thử và nghe, mỗi cú cắt phải "đập" vào nhịp trống.

**Chọn source theo beat**
- Cảnh toàn: dùng ở beat mạnh (đầu bar, beat 1), vì cảnh mở đầu cần chậm để người xem định hướng.
- Cảnh trung và cận: dùng ở beat phụ để tạo nhịp nhanh.
- Mỗi cảnh cận có một chuyển động rõ (chạm, xoay dụng cụ) để cắt đúng lúc có chuyển động.
