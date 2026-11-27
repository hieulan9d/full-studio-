# Kit: Việt Hàn (KIH) / Thiện Trang — video bán hàng phòng khám

Rút từ **9 video thật** của khách (tháng 11/2025 → 1/2026), đo bằng `refkit.py analyze` (số liệu từng video ở `phan-tich/`) và xem ảnh
tổng quan từng video. Mức giống: **2 (cấu trúc + nhịp) + khung thương hiệu đo tay**. Chưa đo ease/keyframe từng chuyển động (mức 3) —
mục nào ghi (ước) là nhìn bằng mắt trên ảnh thưa 1,4–2 s/khung.
Không cần After Effects: nền talking head + chữ pill + B-roll, ghép bằng `vf`/ffmpeg hoặc CapCut; kit `talking-head` dùng khi cần chữ sau lưng người.

> Đây là sản phẩm của **khách** (Việt Hàn – Thiện Trang): dùng để làm tiếp cho chính khách, không phải học lỏm. Người, logo, địa chỉ,
> hotline trong clip là của khách; video mới phải đổi theo từng chiến dịch.

## 1. Là gì
Video dọc 1080×1920 (một video 4K 2160×3840), **45–90 s**, 30 fps (một video 60 fps), có tiếng, **một người dẫn (nữ, nhân viên phòng khám) nói
thẳng vào máy** xen **B-roll thật quay trong phòng khám** và **bảng chữ pill vàng/xanh**. Mục tiêu: bán gói khám (miễn phí / giảm giá / suất giới hạn) → CTA gọi hotline.
Đóng **khung thương hiệu cố định** suốt video (mục 3).

## 2. Xương sống thời gian: **lời nói**, không phải nhạc
| Video | cắt trúng đầu từ | cắt trúng phách | đoạn TB |
|---|---|---|---|
| 251108 ĐK | 11/22 | độ rõ nhịp 0,06 | 2,98 s |
| 251122 sau bão | 10/17 | 0,10 | 1,98 s |
| 251128 tổng quát | 11/23 | 0,05 | 4,20 s |
| 251129 Thiện Trang | **20/31** | 0,15 | 2,22 s |
| 70% ung thư | 10/25 | 0,08 | 3,24 s |
| Quỳnh cơ xương khớp | **16/24** | 0,09 | 3,00 s |
| bảo lãnh viện phí | 10/16 | 0,10 | 3,36 s |
| 251118 remind (không có lời đo) | — | 5/33 (0,24) | 2,69 s |
| 260129 Tết | — | 6/14 (0,31) | 4,11 s |

- Lời: **3,4–4,4 từ/s** (TB ~3,7). Cảnh đổi theo **ý của câu** (mỗi gói dịch vụ / mỗi khoa = một cảnh), không theo nhạc.
- Chỉ video Tết (144,7 BPM) và video 20-11 có nhạc rõ nhịp, và cũng chỉ ~20–40% cắt trúng phách ⇒ nhạc là **nền**, không là lưới cắt.
- Độ to: -10,4 … -14,8 LUFS (video "sau bão" -19,4: nhỏ hơn, đừng lấy làm chuẩn). Mục tiêu dựng: **-12 LUFS**.
- Độ dài đoạn: B-roll 1,5–3 s; người dẫn 4–8 s/lần; khoảng 20–33 đoạn/video.

## 3. Khung thương hiệu cố định (đo trên 251108, 1080×1920, px gốc)
| Phần | Vị trí | Giá trị |
|---|---|---|
| **Tab logo trên** | giữa, y 0–135, rộng ~590 (x 240–830), bo góc dưới | nền xanh `#249a55`, logo sao vàng "KIH" + chữ trắng "PHÒNG KHÁM ĐA KHOA QUỐC TẾ VIỆT HÀN" ~26 px |
| **Thanh dưới** | y ~1640–1920, cạnh trên **cong lên về phải** (đường chéo, có viền xanh nhạt `#72bb3d`) | gradient xanh lá `#36a24e`→`#34a14d`; chữ trắng đậm |
| Dòng 1 thanh dưới | y ~1815 | "CHĂM SÓC SỨC KHỎE GIA ĐÌNH BẠN" in hoa, ~44 px, trắng |
| Dòng 2 | y ~1880 | địa chỉ: "36 Phan Chu Trình, P. Nha Trang, Khánh Hòa" ~34 px |
| **Pill hotline** | phải, y ~1665–1730, x 685–1055, trắng bo tròn | icon điện thoại xanh + "0779.36.36.79" xanh `#008c60`, ~40 px |
| Vùng an toàn | giữa | nội dung chính nằm y 135–1640 (cao ~1500) |

Biến thể:
- **Thiện Trang (251129, 260129)**: tab trên có **hai logo** (KIH + "ĐA KHOA THIỆN TRANG"); thanh dưới 2 dòng địa chỉ (36 Phan Chu Trình + 85 Nguyễn Trãi).
- **251118 (20-11)** và **bảo lãnh viện phí (4K)**: **không có thanh dưới/tab trên** — full-bleed, chỉ chữ pill + CTA pill riêng. Dùng khi muốn cảm giác "vlog".
- Khung phủ **cả B-roll lẫn cảnh người dẫn** (người dẫn đứng ở vùng giữa, B-roll cắt full khung trong tab/thanh).

## 4. Bảng màu (đo + ước)
| Vai trò | Hex |
|---|---|
| Xanh thương hiệu (tab, thanh dưới, chữ nhấn) | `#249a55` / `#239555` / `#1e9851` |
| Xanh lá sáng (viền thanh dưới) | `#72bb3d` |
| Xanh hotline | `#008c60` |
| **Vàng pill nhấn** | `#ffe003` (chữ xanh đậm trên nền vàng) |
| Vàng nhạt (nhãn "TRỊ GIÁ GÓI") | `#fee284` |
| Trắng thẻ giá | `#fbfbec` / `#fefefe` |
| Đỏ (Tết, "MIỄN PHÍ" chữ đỏ, "BỎ LỠ CƠ HỘI") | `#ac2433` |
| Nền infographic tối (bảo lãnh viện phí) | `#080912` + lưới xanh/tím |
Độ sáng TB 134–170/255, bão hoà 80–99/255, chi tiết 11–15% (tươi, sáng, nhiều chi tiết thật). Nền phòng khám xanh–vàng–gỗ ấm.

## 5. Chữ & đồ hoạ
- **Font**: sans đậm, bo, có dấu (giống Be Vietnam Pro / Nunito / SVN-Gilroy Bold — (ước), chưa xác minh tên font; kiểm bằng `talking-head/tools/fonts_vi.py`).
- **Pill vàng** `#ffe003`, góc bo ~40 px, chữ xanh `#239555` in hoa, có viền/bóng nhẹ: tiêu đề gói ("KHÁM TỔNG QUÁT VÀ TẦM SOÁT ĐỘT QUỴ" ~56 px) + dòng phụ nhỏ trắng/xám "(20 suất/ngày)". Rộng ~720 px, đặt **y ~830–1100 (ngực người dẫn)**.
- **Thẻ giá** (trắng viền xanh, rộng ~430): nhãn vàng nhạt "TRỊ GIÁ GÓI" + số xanh đậm "2.100.000" → số **gạch/đổi** thành "CHỈ CÒN 0Đ" (nhãn vàng). Mẫu neo giá dùng ở mọi video.
- **Chữ cảnh B-roll**: phụ đề xanh lá nhạt đậm (`#61b343`-xanh nhạt) hoặc trắng viền xanh, **ngay giữa-dưới ảnh**, 1–2 dòng; nhãn mục dạng **pill xanh** góc trên trái ("KHÁM NGOẠI KHOA", "Xét nghiệm chuyên sâu"); danh sách tick (✓ xanh) cho dặn dò ("Nhịn ăn 8 tiếng…").
- **Chữ hook** to ở đầu: "MIỄN PHÍ 100%", "ƯU ĐÃI / GIẢM ĐẾN 70%", "BỎ LỠ CƠ HỘI" (đỏ trên trắng, vào trượt từ trái), "20-11" vàng to — thường **chữ cực lớn, 1–3 từ**.
- **Chữ CTA cuối**: "GỌI NGAY HOTLINE 0779 36 79" trên pill vàng, hoặc "ĐẶT LỊCH NGAY 0779.363.679" chữ xanh/vàng viền trắng to đè lên ảnh toà nhà.
- Đồ hoạ phụ: sticker hoạt hình (thầy/cô giáo cho 20-11, hộp quà, đồng hồ đếm "CHỈ 30 SUẤT/NGÀY"), **nhân vật bác sĩ 3D** chỉ tay, mạch máu 3D (stock), **lưới 2×3 ảnh bo góc trên nền mờ** (liệt kê chuyên khoa), icon phẳng trên nền tối có lưới (giải thích bảo lãnh).

## 6. Chuyển cảnh & chuyển động
- **Gần như toàn cắt cứng** (90–100% chỗ cắt; video Tết 6/15 mềm = dissolve/xoay). Không bay, không glitch.
- Chữ vào: **bật/scale nhẹ hoặc trượt** (ước 6–10 khung); mỗi dòng danh sách hiện lần lượt cùng lời. Sticker "pop".
- Nền B-roll khi dùng ảnh/ảnh chụp màn hình/infographic: **nền ảnh mờ blur + ảnh thật bo góc ở giữa** (lưới 2×3, cảnh thiết bị) — mẫu lặp lại ở 5/9 video.
- Zoom-in chậm nhẹ trên B-roll (ước, 3–5%/cảnh); người dẫn **không zoom giật**.

## 7. Người dẫn (nhân viên thật, không phải AI)
- Nữ, 3 người khác nhau trong 9 video (áo sơ mi xanh, polo trắng-vàng đồng phục, blazer hồng, áo dài đỏ Tết). **Giữ đồng phục theo chiến dịch.**
- Đứng trước tường/cửa phòng khám (cây xanh, bảng hiệu, quầy lễ tân KIH), khung **trung → cận ngực**, tay ra dấu; nói tự nhiên, nhanh (3,7 từ/s).
- Quay điện thoại dọc, ánh sáng tự nhiên; **đổi nền 2–3 lần/video** (cửa → quầy → ngoài sảnh) để không đơn điệu.
- Dùng người thật trong B-roll (bác sĩ, bệnh nhân): cần **đồng ý hình ảnh** của họ (chưa kiểm).

## 8. Cấu trúc kịch bản (rút lặp lại ở cả 9 video)
1. **0–3 s Hook ưu đãi** — chữ to ("MIỄN PHÍ 100%", "GIẢM ĐẾN 70%", "BỎ LỠ CƠ HỘI") + người dẫn gọi thẳng đối tượng ("Dành tặng thầy cô nhân 20/11", "Bà con Khánh Hòa sau bão").
2. **3–15 s Ưu đãi cụ thể**: tên gói + **neo giá** (trị giá 2.100.000 → chỉ còn 0Đ / giảm 4.000.000) + **khan hiếm** ("20 suất/ngày", "30 suất/ngày", "đến hết 28/2").
3. **15–50 s "Gói khám gồm"**: B-roll quay thật theo từng hạng mục (xét nghiệm máu, siêu âm, X-quang, nội soi…), chữ pill phụ đề hạng mục; có thể chèn **ảnh/infographic danh mục** và lưới chuyên khoa.
4. **Dặn dò / yên tâm**: nhịn ăn 8 tiếng, thủ tục nhanh, không cần tạm ứng, đội ngũ bác sĩ.
5. **50–70 s CTA**: người dẫn nhắc lại ưu đãi + hạn → **ảnh trang Facebook phòng khám** (mũi tên đỏ chỉ nút) → **ảnh mặt tiền toà nhà + chữ "ĐẶT LỊCH NGAY / ĐỊA CHỈ"** → hotline.
6. Đuôi 0,4 s đen (video 251108 có).
Biến thể: **sau bão (35 s)**: hook cảm xúc (cảnh lũ, xe cứu trợ, "như một lời sẻ chia") rồi mới vào ưu đãi — video ngắn nhất, 1,98 s/đoạn. **Bảo lãnh viện phí**: giáo dục dịch vụ (không giảm giá), infographic nền tối giải thích 3 bên (bệnh nhân – bảo hiểm – viện).

## 9. Âm thanh
- Giọng người dẫn thu trực tiếp; **nhạc nền nhẹ** dưới giọng (tên bài chưa nghe được — bạn là AI không nghe được). **Chưa có quy tắc SFX/nhạc được duyệt cho thể loại này**: hỏi người dùng (`HUONG-DAN-AI.md` mục 8).
- Whisper `small`/mặc định nhận sai nhiều tiếng Việt y khoa ("khảm sức quả" = "khám sức khoẻ"): **không dùng transcript tự động làm phụ đề**; dùng kịch bản gốc rồi chỉ lấy mốc từ.

## 10. Nội dung y tế — cảnh báo (đọc `talking-head/knowledge/10`)
Các video mẫu có câu **"tầm soát 11 loại ung thư", "tầm soát nguy cơ đột quỵ", "giảm đến 70%", "miễn phí 100%", "khám phát hiện sớm"**. Khi viết mới:
- tránh khẳng định chữa khỏi/phát hiện 100%; dùng "hỗ trợ tầm soát/phát hiện sớm nguy cơ";
- mọi con số giá/suất/thời hạn **phải do khách cung cấp**, không tự bịa; ghi điều kiện áp dụng (ngày, số suất);
- liệt kê các câu khẳng định sức khoẻ trong báo cáo để người chuyên môn duyệt.

## 11. Thứ cần từ khách khi làm video mới
Logo KIH/Thiện Trang (file), hotline & địa chỉ hiện hành, tên gói + giá + suất + hạn, clip B-roll quay thật (xét nghiệm, siêu âm, X-quang, nội soi, quầy…), clip người dẫn quay dọc, ảnh mặt tiền, ảnh chụp trang Facebook, font thương hiệu (nếu có).

## 12. Chưa kiểm / còn thiếu
- Font chính xác; ease và thời lượng chữ (mức 3) chưa `track`.
- Tên/giấy phép nhạc nền; bản gốc dự án (CapCut?) không có — **nhiều khả năng dựng bằng CapCut** (bố cục pill, nền blur đặc trưng CapCut): nên ưu tiên xuất bản nháp CapCut hơn AE.
- **Animation chữ + SFX (đọc `ANIMATION-CHU-VA-SFX.md`)**: bản v2 dựng bằng `build_base2.py` (bảng lưới), `overlay2.py` (pop + vệt sáng, sóng chữ, typewriter, từ khoá pop, thẻ giá, nhãn lưới theo mốc lời, danh sách SFX), `mix_sfx.py` (trộn SFX từ kho SaaS, −14 LUFS), `build_capcut3.py` (nháp CapCut có khung + đồ hoạ động + track SFX riêng).
- **Đã dựng thử 1 video (2026-11-19)**: `output/viet-han-kham-mien-phi/` (`build_base.py` cắt B-roll theo mốc lời, `overlay.py` vẽ khung + pill + thẻ giá + đồng hồ bằng PIL rồi ghép ffmpeg, `build_capcut.py` xuất nháp CapCut). Font dùng Segoe UI Black (có sẵn Windows, đủ dấu Việt), chưa phải font gốc của mẫu. Mẫu "khung hạn chế" = nền blur + đồng hồ kim quay rồi dừng + chữ đỏ hiện mờ + dòng xanh gõ từ trái sang. Bản CapCut chỉ có clip, giọng và chữ đơn giản (không có khung/pill/thẻ giá).
- Thư mục `phan-tich/`: số đo máy từng video (lời whisper sai nhiều, chỉ dùng cấu trúc/mốc).
- Học từ bản người dùng tự chỉnh trong CapCut (animation CapCut gán, vị trí pill, câu cuối đúng lời): `HOC-TU-CAPCUT.md`, `capcut-animations.json`.
- Phân tích chi tiết bản CapCut v9 hoàn chỉnh (công thức chữ, SFX theo tên, màu, cảnh thẻ trượt có mask): `PHAN-TICH-CAPCUT-V9.md`, `capcut-mask-rect.json`.
