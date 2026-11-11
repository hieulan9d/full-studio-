# Phong cách video series "Đạo lý" (tóm tắt đầy đủ để làm tập mới mà không cần video cũ)

Nguồn nội dung: sách "KIM CHỈ NAM SỐNG 'CHẤT'" (Lụa Nguyễn chuyển ngữ, nguyên tác CC BY 4.0). Chia 8 tập, xem `sach-tong-hop-8-tap.md`. Đã làm đủ 8 tập: 1 Trên đường, 2 Cháy/gas/khí độc, 3 Nhà có trẻ nhỏ và người già, 4 Thực phẩm và ngộ độc, 5 Vắc-xin, 6 Kiểm tra sớm/sàng lọc, 7 Dấu hiệu cơ thể và sức khỏe tình dục, 8 Sức khỏe tinh thần (nhạy cảm: đã làm theo quy tắc riêng, cần người có chuyên môn xem trước khi đăng). Sách hết nội dung sau tập 8 (còn 3 mục ngắn: bán thận, vật phóng xạ, máy mài góc).

## 1. Định dạng chung
- Video dọc 9:16, canvas dựng 1080×1920, 30 fps, dài khoảng 60–115s (tập 1 114s, tập 2 103s, tập 3 67s, tập 4 59s).
- Một giọng đọc liền, hình là loạt clip 6–10s hình vẽ tay chuyển động nhẹ, chữ phụ đề cố định ở vùng dưới.
- Cấu trúc nội dung: **mở bằng một câu tóm** ("Có năm việc trong nhà…", "Hai việc nhỏ trong bếp…", "Ba việc nhỏ…") → các mục đánh số **"Một: … Hai: … Ba: …"** → mỗi mục có số liệu/ví dụ Việt Nam/việc nên làm → **kết bằng một lời kêu gọi hành động ngắn** ("Chọn một việc, và làm ngay hôm nay."). Không có câu "Nguồn…" ở cuối lời thoại (ghi nguồn trong phần mô tả video).

## 2. Hình ảnh (tạo trên canvas bằng Flow)
- Phong cách: tranh vẽ tay đen trắng, nét phấn trắng trên nền đen, gạch bóng chéo, kết cấu bút chì thô, không khí đời thường Việt Nam, trầm nhưng bình tĩnh.
- Nhân vật chính: người tối giản đầu hình quả trứng trắng trơn, áo thun trắng, không có mặt. Cảnh không cần nhân vật thì chỉ vẽ đồ vật/nhà cửa (không có người).
- **Mẫu prompt ảnh** (tiếng Anh): `[A simple minimalist character with a round blank egg-shaped white head and a plain white t-shirt, <hành động + bối cảnh Việt Nam>.]` + hậu tố cố định: `Hand-drawn black and white ink sketch on a pure black background, white chalk line art with fine crosshatch shading, rough pencil texture, Vietnamese everyday atmosphere, melancholic but calm mood, scene centered with empty black space at the top and bottom for captions, vertical 9:16 composition, no text, no letters, no logos, no realistic human faces.`
- Model ảnh: `flow::flow-nano-banana-pro`, size `9:16`. Model video: `flow::flow-omni-flash`, `seconds` là chuỗi "6"/"8"/"10", ảnh tham chiếu là node ảnh của cảnh đó.
- **Mẫu prompt video:** `Hand-drawn black and white ink sketch animation on pure black background, white chalk line art with crosshatch shading, same style as the reference image. <một hành động chậm, nhỏ>. Subtle slow camera push-in, chalk lines flicker slightly. No text, no letters, no logos.` Chuyển động nhẹ (hơi thở, khói, nước gợn, đèn nhấp nháy), không hành động mạnh.
- Mỗi cảnh ứng với một đến hai câu lời thoại; 12–14 cảnh một tập.

### Bẫy Flow (đã gặp)
- **Không để trẻ em/bé trong prompt hay ảnh** (kẹt "đang tạo" hoặc lỗi). Thay bằng đồ vật (áo phao, chốt cửa, cửa sổ), người lớn hoặc người cao tuổi. Prompt/ảnh gợi tự tử hoặc nguy hiểm (người đứng sát lan can) cũng bị chặn: thay bằng cảnh đồ vật (thước dây, thanh lan can) và/hoặc tạo video trực tiếp không dùng ảnh tham chiếu.
- Bình gas, khói pin có thể bị chặn: tạo lại ảnh tham chiếu bằng prompt an toàn, rồi sinh video với prompt chuyển động tối giản.
- Lỗi captcha: canvas phải reset/đăng nhập lại; các video đang sinh bị lỗi hàng loạt, phải xóa node lỗi rồi sinh lại. **Khi xóa node chỉ xóa đúng node lỗi, đừng xóa node cha (ảnh tham chiếu).**
- Node "Xuất file" phải nằm trong khung nhìn canvas và `exportRequest` phải là giá trị mới mỗi lần; sau khi canvas reset, node này mất và phải được thêm lại.

## 3. Lời thoại và giọng đọc
- Viết cho TTS đọc đúng: số thứ tự "Một:" có dấu hai chấm; năm viết bằng chữ số ("năm 2021"); số/phần trăm còn lại viết bằng chữ ("sáu mươi phần trăm"); không dấu phẩy thừa; câu ngắn, mỗi câu một ý, không câu cụt một chữ.
- Số khẩn cấp viết "gọi số một một bốn / một một năm". Số lớn: tránh "nghìn không trăm…" (TTS rớt chữ), viết "hơn bốn nghìn người".
- **Từ nhạy cảm phải thay** trong lời thoại, prompt hình và phụ đề: chết/tử vong → "mất mạng", "gặp nạn", "nguy hiểm đến tính mạng"; rượu bia → "đồ uống có cồn".
- Không đưa số liệu Việt Nam chưa được kiểm chứng; giữ đúng giới hạn của sách ("đây là tỷ lệ trong các ca ghi nhận, không phải nguy cơ của một bữa ăn").
- Giọng: VoiceStudio `localhost:3900`, endpoint `/v1/audio/speech` (model omnivoice), profile `70afd348`. Kiểm từng đoạn bằng whisper (`/v1/audio/transcriptions`); whisper viết số bằng chữ số và nghe nhầm một số từ (không phải lỗi giọng).
- **Làm giọng từng đoạn (mỗi câu một đoạn)**, mỗi đoạn tạo lại tới ~4–6 lần cho đến khi whisper nghe đúng; bắt lỗi hay gặp: TTS bỏ chữ "Hai"/"Ba" ở đầu mục, rớt "nghìn", bỏ cả cụm giữa câu.
- **Âm thừa đầu đoạn:** VoiceStudio chèn một tiếng ngắn 0,1–0,2s rồi lặng 0,3–0,5s trước lời, ở MỖI đoạn: phải cắt từng đoạn (tìm điểm cắt năng lượng thấp nhất, kiểm lại bằng whisper 3 chữ đầu), không chỉ cắt lặng đầu file. Cắt cả lặng cuối.
- **Nhịp:** giữa mọi câu nghỉ khoảng 5 khung hình (**0,167s**), kể cả trước "Một:/Hai:/Ba:"; không chèn nghỉ đều 0,5s. Các đoạn xếp sát nhau.
- Đoạn tạo lại thường ra 24000 Hz: đổi về 44100 Hz mono trước khi ghép. Chuẩn âm lượng `loudnorm=I=-16:TP=-1.5:LRA=11`; tránh vỡ tiếng khi tăng âm lượng.

## 4. Dựng (vf)
- Ghép giọng thành một file `voice/voice_all.wav` kèm `voice_marks.json` (mốc đầu/cuối từng đoạn, thuộc cảnh nào).
- **Đổi cảnh ở đầu câu đầu tiên của mỗi cảnh.** Tốc độ clip chủ yếu 0,7–1,25× (kẹp trong khoảng này); cảnh dài hơn clip thì dùng clip hai lần (hai đoạn tốc độ ~0,9, đoạn sau lấy phần cuối clip) thay vì kéo quá chậm; cảnh ngắn hơn clip thì chỉ dùng một phần clip.
- Độ dài clip chọn theo độ dài đoạn giọng của cảnh (sau khi giọng đã cắt): thường 6s, 8s, hoặc 10s cho cảnh dài > 8s. Cảnh chỉ có câu đề mục ngắn (~2s) vẫn cần clip 6s (Flow tối thiểu 6s), dựng cắt bớt.
- Cảnh nên chọn từ ảnh/clip không rung; đã dùng `shake_exempt: ["media/"]` cho clip CGI. Cỡ cảnh với hoạt hình dựng sẵn: `size "SP"`, `alternate_sizes false`.

## 5. Phụ đề
- Kiểu cố định: cỡ 6, chữ trắng, bóng đổ, vị trí y = -0,86 (vùng dưới), style `Sub`, mode câu (`subs.mode: sentence`).
- Mỗi dòng ngắn: tối đa ~40 ký tự (thích hợp ≤30–38). Ngắt dòng theo cụm có nghĩa, không cắt giữa số ("bốn mươi lăm phần / trăm"), không dòng chỉ một chữ nếu tránh được.
- **Số viết bằng chữ số trong phụ đề:** 60%, 41%, 56 người, 12 tháng 9, 115, 18.000, 3.060, 1,1 m, 10 cm, 15 độ, 2.000 người, 2 đến 3 lần, "tầng 11"… (giữ chữ ở lời thoại, đổi chỉ ở phụ đề qua bảng `NUM` trong `build_project.py`). "C O" → "CO". Thứ tự mục: "Một – …", "Hai – …" (dùng gạch ngang, không dấu chấm).
- Căn thời gian chữ theo whisper (khi VoiceStudio chạy); gộp dòng ngắn hơn 0,4s vào dòng trước (tránh nhấp nháy).
- Phụ đề trên ảnh sáng khó đọc: để ý các cảnh nền sáng.

## 6. Canvas và quy trình một tập
1. Đọc mục của tập trong `sach-tong-hop-8-tap.md`; viết lời thoại + 12–14 cảnh (`scenes.json`: id, clip_s, voice, image_prompt).
2. Tạo giọng (`make_voice.py`) rồi cắt âm thừa và ghép (`rebuild_voice.py`) — làm giọng trước để biết độ dài từng cảnh, chọn `clip_s`.
3. Sinh ảnh rồi video trên canvas (`canvas-tools/`), xếp node **MỖI TẬP MỘT CỘT DỌC riêng** (người dùng không thích xếp ngang; canvas tự đặt node mới nằm ngang nên LUÔN chạy `python canvas-tools/ep.py layout N X0` sau khi sinh xong; X0: tập 5=15000, 6=17000, 7=19000, tập tiếp theo cách 2000): trong cột, các node nối tiếp từ trên xuống, cảnh nọ sau cảnh kia (chữ ảnh → cấu hình → ảnh → chữ video → cấu hình → video).
4. Xuất file bằng node "Xuất file" (`exportAll`), dựng bằng `build_project.py`, `vf check`, `vf render`, chép thành phẩm vào `D:\đạo lý\dao-ly-tapN.mp4`.
5. Kiểm: nghe lại (đặc biệt chỗ có số), xem phụ đề trên cảnh sáng, tốc độ cảnh (>1,25× không dùng).

## 7. Điều người dùng dặn (tổng hợp)
- Cắt giọng sát câu, bỏ hơi thở/lặng thừa; nghỉ ~5 khung hình giữa câu.
- Đổi cảnh đúng đầu câu; ưu tiên làm chậm hoặc cắt đôi clip; được bỏ cảnh khi thiếu chỗ.
- Chữ giữ kiểu cũ; số viết bằng chữ số; dòng ngắn.
- Thay từ nhạy cảm; không trẻ em trong prompt; không câu "Nguồn…" trong lời đọc.
- Người dùng tự cắt âm thừa đầu giọng trong CapCut nếu có, nhưng mình nên cắt trước.
- Xếp node canvas: mỗi tập một cột dọc riêng, không xếp ngang. Video thành phẩm để ở `D:\đạo lý`.
- Flow đòi captcha sau khoảng 13–15 video: sinh video theo đợt 3 cái thử trước, rồi 5–6 cái mỗi đợt; nếu lỗi hàng loạt thì dừng, nhờ người dùng xử lý captcha rồi `ep.py clean N` và sinh lại.

## 8. Bài học thêm từ tập 5–8
- **Quy trình tự động:** `canvas-tools/ep.py` (img, waitimg, vid, waitvid, export, layout, clean) + `canvas-tools/clip_s.py N` (chọn 6/8/10s theo giọng). Mỗi tập có `projects/dao-ly-tapN/` (mk_scenes.py, make_voice.py, rebuild_voice.py, build_project.py). Prompt chuyển động từng cảnh nằm trong `scenes.json` (trường `motion`).
- **Giọng:** `rebuild_voice.py` tự tạo lại đoạn bị lỗi (còn âm thừa/rớt chữ đầu, tối đa 6 lần). Chạy MỘT lần một tập (chạy hai tiến trình cùng lúc làm VoiceStudio treo; treo thì tắt hẳn rồi mở lại). TTS hay bỏ chữ lạ như "P r E P", "HIV" đầu mục: viết bằng chữ đầy đủ ("thuốc dự phòng trước phơi nhiễm"), mục số Sáu cần regex có "Sáu".
- **Tiếng thừa còn sót** ("Đúng/Đụng/Động/Nếu" xen giữa câu): nghe lại bằng whisper có mốc từng chữ, tắt tiếng đúng khoảng đó (`volume=0` theo thời gian) để không lệch mốc; giữ bản gốc `voice_all_raw.wav`.
- **Flow:** lỗi captcha và lỗi 502 đều làm video báo lỗi hàng loạt. Đọc `errorDetails` trong node: 502 là lỗi máy chủ, thử lại sau vài phút không cần người dùng; captcha thì nhờ người dùng xử lý. Sinh video theo đợt 3 rồi 5–6 cái.
- **Xếp node:** mỗi tập một cột dọc riêng (`ep.py layout N X0`: tập 5=15000, 6=17000, 7=19000, 8=21000, tập sau +2000).
- **Chủ đề nhạy cảm (tập 7, 8):** dùng thuật ngữ y tế đúng, hình chỉ là đồ vật/người ngồi cạnh nhau, không mô tả cách làm hại, kèm 115 và đường dây hỗ trợ; "làm hại bản thân" thay cho từ nặng hơn.
- **Dựng:** `project.json` dùng `src` tương đối (`media/vNN.mp4`), chạy được ở mọi thư mục; thành phẩm chép vào `D:\đạo lý\dao-ly-tapN.mp4`.
