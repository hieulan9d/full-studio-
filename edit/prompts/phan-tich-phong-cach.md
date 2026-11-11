# Prompt phân tích & học phong cách video

Cách dùng: dán nội dung trong khối dưới vào AI, đính kèm video (mp4) hoặc đường dẫn draft CapCut. Có từ 3 video của cùng một người dựng thì kết quả "Cốt lõi" đáng tin hơn nhiều.

````text
VAI TRÒ
Bạn là biên tập viên video kiêm nhà phân tích phong cách dựng. Nhiệm vụ: xem kỹ (các) video hoặc project CapCut tôi cung cấp, rồi tạo HỒ SƠ PHONG CÁCH đủ chi tiết để một người hoặc AI khác dựng lại đúng "chất" đó cho nội dung hoàn toàn khác, mà không cần xem lại video gốc.

7 NGUYÊN TẮC BẮT BUỘC
1. Học QUY LUẬT, không chép NỘI DUNG. Đừng kể "cảnh 1 là..., cảnh 2 là...". Hãy trả lời "người dựng quyết định theo quy tắc nào?".
2. Dùng SỐ LIỆU thay cho cảm tính. Cấm "nhịp nhanh", "đẹp", "cuốn" khi chưa kèm con số hoặc mốc thời gian.
3. Mọi nhận định phải kèm MỐC THỜI GIAN (giây) và ĐỘ TIN CẬY (cao/vừa/thấp), ghi rõ nguồn: đọc từ project hay ước lượng từ hình/âm.
4. KHÔNG BỊA. Không biết tên font, tên bài nhạc, tên LUT, tên hiệu ứng thì ghi "không xác định" và mô tả đặc điểm (ví dụ "sans-serif đậm, bo tròn", "lo-fi 80 BPM"). Chỉ gọi tên khi đọc được từ project hoặc chắc chắn.
5. Tách rõ cái nào là PHONG CÁCH, cái nào là ĐẶC THÙ NỘI DUNG của riêng video này.
6. Chỗ không thấy/không nghe rõ: ghi "không xác định", không đoán.
7. Một video chỉ cho thấy một lần ngẫu nhiên: nếu chỉ có 1 video, nêu rõ giới hạn đó trong phần kết luận.

BƯỚC 0 – NHẬN DIỆN THỂ LOẠI (bảng trọng số)
Chấm mức độ khớp (0–100%) với 9 thể loại: vlog, explainer (giải thích), short (video ngắn dọc), cinematic, tutorial (hướng dẫn), quảng cáo, gaming, podcast, motion graphics. Có thể là lai, ví dụ 60% explainer + 40% short.
Ghi thêm: nền tảng đích, tỷ lệ khung, fps, độ phân giải, thời lượng, mục tiêu video, đối tượng xem. Nếu là project CapCut: số track, loại track, số đoạn mỗi track.
Dùng bảng sau để chọn lớp nào cần soi KỸ (●), soi thường (○), soi lướt (·):

| Lớp | vlog | explainer | short | cinematic | tutorial | quảng cáo | gaming | podcast | motion gfx |
|---|---|---|---|---|---|---|---|---|---|
| A Cấu trúc | ○ | ● | ● | ○ | ● | ● | ○ | ● | ○ |
| B Nhịp | ● | ○ | ● | ● | ○ | ● | ● | · | ● |
| C Cỡ cảnh/góc | ○ | ○ | ○ | ● | ○ | ● | · | ○ | · |
| D Chuyển động | ○ | · | ● | ● | · | ● | ● | · | ● |
| E Bố cục | ○ | ○ | ● | ● | ● | ● | ○ | ○ | ● |
| F Màu | ○ | ○ | ○ | ● | · | ● | ○ | · | ● |
| G Chữ | ○ | ● | ● | · | ● | ● | ○ | ○ | ● |
| H Đồ họa | · | ● | ○ | · | ● | ● | ○ | · | ● |
| I Chuyển cảnh | ○ | ○ | ● | ● | · | ● | ○ | · | ● |
| J Giọng/lời | ● | ● | ● | ○ | ● | ● | ○ | ● | ○ |
| K Nhạc | ○ | ○ | ● | ● | · | ● | ○ | · | ● |
| L SFX & mix | ○ | ○ | ● | ● | ○ | ● | ● | ○ | ● |

BƯỚC 1 – SHOT LOG (bảng từng shot)
Lập bảng, mỗi dòng một shot:
| # | bắt đầu (s) | kết thúc (s) | dài (s) | loại hình (người nói/b-roll/màn hình/đồ họa/ảnh tĩnh) | cỡ (toàn/trung/cận) | chuyển động máy | zoom/pan | tốc độ | chữ trên màn hình | cắt vào bằng gì |
Sau bảng, tính: số shot, độ dài trung bình/trung vị/min/max/độ lệch chuẩn, phân bố theo nhóm (<1s, 1–2s, 2–4s, >4s), số shot mỗi 10 giây theo từng phần của video, % cắt trùng beat nhạc hoặc đầu/cuối câu nói (đo độ lệch ms).
Nếu là project CapCut: lấy số liệu thẳng từ file JSON của draft (thời điểm, độ dài, tốc độ, keyframe, chữ, hiệu ứng, âm lượng), ưu tiên hơn mọi ước lượng. Nếu chỉ có file video: tách cảnh tự động, dò beat, trích khung hình đại diện mỗi shot, và đánh dấu mọi số liệu là ước lượng.

BƯỚC 2 – PHÂN TÍCH 12 LỚP (A → L)
Soi theo mức ● ○ · của thể loại ở Bước 0. Mỗi lớp trả lời đúng các câu hỏi sau, mỗi câu kèm số đo hoặc ví dụ có mốc giây.

A. Cấu trúc & kịch bản
- Các phần (hook, mở, thân, cao trào, kết, CTA) với mốc giây. Hook dùng kỹ thuật gì, dài bao lâu, dùng cả hình + chữ + âm thế nào?
- Mỗi ý chiếm bao nhiêu giây; kiểu triển khai (vấn đề→giải pháp, liệt kê, kể chuyện, trước/sau...). Cách kết (CTA, kết mở, quay vòng về hook).

B. Nhịp dựng
- Số liệu từ Shot Log. Nhịp thay đổi theo cấu trúc ra sao (dồn ở đâu, thưa ở đâu).
- Có J-cut/L-cut (tiếng đi trước/sau hình)? Jump cut để bỏ khoảng chết? Cắt vào giữa chuyển động (match cut)? Tần suất mỗi loại.

C. Cỡ cảnh & góc máy
- Tỷ lệ toàn/trung/cận; có luật luân phiên không (ví dụ không hai cảnh cùng cỡ liền nhau: kiểm tra trên Shot Log và báo số lần vi phạm).
- Góc máy (ngang mắt, thấp, cao, top-down), máy cố định/cầm tay/gimbal/drone, mức rung chấp nhận được.

D. Chuyển động trong khung
- Cảnh đứng im xử lý thế nào: zoom (từ x% đến y%, tốc độ, vào/ra, easing), pan, hay để yên.
- Speed ramp, slow-mo, tua nhanh: khi nào, tốc độ bao nhiêu.

E. Bố cục
- Vị trí chủ thể (giữa, 1/3, lệch), khoảng trống đầu, vùng dành cho chữ, nền sạch hay đông; xử lý khung dọc/ngang (nền mờ, letterbox).

F. Màu & hoàn thiện hình
- Tông chủ đạo (mã màu gần đúng), bão hòa, tương phản, nhiệt độ màu, vùng tối/sáng; có LUT/filter đồng nhất không (tên + cường độ nếu đọc được từ project); grain, glow, vignette, blur; độ đồng đều màu giữa các cảnh.

G. Chữ & phụ đề
- Hiện cả câu hay từng chữ/cụm; số chữ tối đa mỗi dòng; số dòng; xuất hiện sớm/trùng/trễ bao nhiêu ms so với lời.
- Font (mô tả đặc điểm nếu không biết tên), độ đậm, cỡ (% chiều cao khung), màu, viền, bóng, nền chữ, chữ hoa/thường; vị trí (% tọa độ), có cố định không.
- Chữ nhấn mạnh: từ nào được nhấn, nhấn bằng cách nào (đổi màu, phóng to, rung, highlight), quy tắc chọn từ.
- Tiêu đề, lower third, emoji, icon, sticker, logo/watermark: khi nào, tần suất, hoạt ảnh vào–ra (loại, thời lượng, easing).

H. Đồ họa & lớp phủ
- Biểu đồ, sơ đồ, mũi tên, khung, highlight vùng, màn hình ghi, overlay: loại nào, khi nào, độ dài, phong cách vẽ.

I. Chuyển cảnh & hiệu ứng nhấn
- % cắt thẳng so với chuyển cảnh có hiệu ứng; liệt kê từng loại hiệu ứng, thời lượng, khi nào dùng.
- Hiệu ứng nhấn (shake, flash, glitch, zoom punch...): khi nào, bao lâu.

J. Giọng & lời
- Người thật hay giọng AI; tốc độ (từ/phút); độ dài khoảng lặng giữa câu; giọng điệu và cách xưng hô; mức xử lý (khử ồn, EQ, nén, reverb).
- Cấu trúc câu: dài hay ngắn, có câu hỏi tu từ, từ khóa lặp lại không.

K. Nhạc
- Thể loại, tempo (BPM), tâm trạng (không bịa tên bài); vào lúc nào, thay đổi theo cấu trúc ra sao; có cắt nhạc đúng điểm chuyển ý không; chuyển cảnh có rơi đúng beat không (% và độ lệch).

L. SFX & cân bằng âm thanh
- Loại SFX (whoosh, pop, click, riser, impact...), đi kèm sự kiện nào, tần suất, độ to.
- Mức nhạc so với giọng (dB), có ducking không, loudness tổng thể (LUFS nếu đo được), khoảng lặng có chủ ý, fade đầu–cuối.

BƯỚC 3 – CHỌN LỌC (phân loại và giới hạn)
Xếp MỌI điểm đã tìm được vào đúng một nhóm:
- CỐT LÕI: tạo nên chất của người dựng; lặp lại ở hầu hết các shot/video. TỐI ĐA 8 QUY TẮC. Mỗi quy tắc viết dạng kiểm tra được bằng máy nếu có thể (ví dụ "độ dài shot ∈ [1.2, 3.0]s trong ≥90% shot").
- CHỮ KÝ: chi tiết nhận diện riêng (kiểu nhấn chữ, kiểu chuyển cảnh quen dùng...), xuất hiện thường xuyên nhưng không bắt buộc.
- LINH HOẠT: có xu hướng nhưng thay đổi theo nội dung (ghi khoảng giá trị).
- NGẪU NHIÊN: chỉ xuất hiện một lần hoặc do nội dung quyết định. Bỏ qua khi dựng lại.
Nhiều video: chỉ đưa vào CỐT LÕI những gì lặp lại ở hầu hết các video (nêu "xuất hiện ở n/N video"). Điểm chỉ có ở một video thì xuống CHỮ KÝ hoặc NGẪU NHIÊN.

BƯỚC 4 – TỰ KIỂM TRA
Chỉ dựa vào hồ sơ vừa lập (không nhìn lại video), làm 3 việc:
1. Chọn một chủ đề hoàn toàn khác (ví dụ: nếu video mẫu về nấu ăn thì chọn công nghệ). Viết nhanh kế hoạch dựng 30 giây theo hồ sơ: số shot, độ dài từng shot, cỡ cảnh, chữ, nhạc.
2. Đọc lại kế hoạch đó và trả lời: một người xem video mẫu có nhận ra "cùng phong cách" không? Chỗ nào hồ sơ chưa đủ để dựng (thiếu thông số, mơ hồ)?
3. Sửa hồ sơ ở những chỗ thiếu rồi mới xuất kết quả.

ĐẦU RA CỐ ĐỊNH
A. TÓM TẮT PHONG CÁCH (5–8 dòng): kiểu dựng, cảm giác tổng thể, điểm nhận diện.
B. KẾT QUẢ BƯỚC 0 (thể loại + trọng số + thông tin chung).
C. SHOT LOG (bảng) và bảng thống kê nhịp.
D. PHÂN TÍCH 12 LỚP (chỉ các lớp ● ○, lớp · chỉ cần 1–2 dòng).
E. PHÂN LOẠI: Cốt lõi (≤8), Chữ ký, Linh hoạt, Ngẫu nhiên.
F. STYLE TOKENS (JSON, đúng 11 mục như dưới).
G. CÔNG THỨC DỰNG LẠI từng bước cho tư liệu thô bất kỳ (chọn cảnh, cắt ở đâu, đặt chữ, chọn nhạc, chỉnh màu).
H. CHECKLIST 10–15 câu có/không để kiểm tra một video mới có đúng phong cách chưa.
I. KẾT QUẢ TỰ KIỂM TRA (Bước 4) và HẠN CHẾ: điều chưa chắc, cần thêm video hay thông tin gì.

STYLE TOKENS (schema cố định, 11 mục; mục không áp dụng để null)
{
  "meta":        {"genre_weights": {}, "platform": "", "aspect": "", "fps": 0, "duration": 0, "sources": 0},
  "structure":   {"hook": {"type": "", "sec": 0}, "sections": [{"name": "", "start": 0, "end": 0}], "ending": ""},
  "pacing":      {"shot_len": {"avg": 0, "median": 0, "min": 0, "max": 0}, "cuts_per_10s": [], "on_beat_pct": 0, "on_speech_pct": 0, "j_cut": false, "jump_cut": false},
  "shots":       {"size_ratio": {"wide": 0, "medium": 0, "close": 0}, "no_same_size_adjacent": null, "angles": [], "camera": "", "type_ratio": {"talking": 0, "broll": 0, "screen": 0, "graphic": 0}},
  "motion":      {"static_zoom": {"from": 1.0, "to": 1.0, "easing": ""}, "pan": "", "speed": []},
  "color":       {"palette": [], "saturation": "", "contrast": "", "temperature": "", "lut": null, "effects": []},
  "text":        {"mode": "", "font_desc": "", "size_pct": 0, "position_pct": [0, 0], "colors": [], "outline": "", "emphasis": "", "anim_in": "", "anim_out": "", "lead_ms": 0, "max_chars_line": 0},
  "graphics":    {"types": [], "style": "", "frequency": ""},
  "transitions": {"cut_pct": 0, "types": [], "accent_fx": []},
  "audio":       {"voice": {"kind": "", "wpm": 0, "pause_s": 0}, "music": {"genre": "", "bpm": 0, "vs_voice_db": 0, "ducking": null}, "sfx": [], "loudness_lufs": null},
  "rules":       {"core": [], "signature": [], "flexible": [], "never": []}
}
````

## Ghi chú dùng trong hệ thống `vf`
- Phần `shots.size_ratio`, `shots.no_same_size_adjacent`, `pacing.shot_len` và `text.position_pct` có thể chuyển thành luật cho `check`.
- Style Tokens lưu cạnh dự án (ví dụ `projects/<tên>/style.json`) để các lần dựng sau so với profile.
