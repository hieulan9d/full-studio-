# Kit: UGC AI một cú máy (thời trang / sản phẩm) + giọng AI

Thể loại **mới, làm thử để kiểm tra hệ thống** (rút từ `ref-notes.md`, một video mẫu duy nhất). Mọi mục [chưa kiểm] chưa chạy trọn vẹn.
Không cần After Effects: sinh clip ở canvas, giọng ở Voice Studio, ghép bằng ffmpeg / `vf`.

## 1. Là gì
Video dọc 9:16, 10–15 s. **Một người mẫu AI đứng trước camera cố định**, nói trực tiếp với người xem bằng giọng AI, khoe sản phẩm
(váy, túi, phụ kiện…). Không cắt, không chữ, không nhạc bắt buộc. Cảm giác: video UGC quay điện thoại.

## 2. Công thức lời (13–14 s, ~55–60 từ, 4 từ/s)
1. **Hook 0–2 s**: gọi người xem ("Ê, mấy bà ơi, dừng lại xíu coi") — vào lời ngay giây 0.
2. **Lợi ích sản phẩm 3–8 s**: 2–3 ý ngắn (chất liệu, cảm giác mặc).
3. **Neo giá / đối chiếu 8–11 s**: "nhìn sang lắm, tưởng bộ này 400–500k" — *chỉ ghi giá thật của sản phẩm, đừng bịa*.
4. **CTA 11–14 s**: đối tượng + "chốt em này liền nha".
Viết cho TTS: câu ngắn, số bằng chữ ("bốn trăm đến năm trăm nghìn"), theo `edit/kien-thuc/dao-ly/feedback-viet-loi-thoai-cho-voice.md`.

## 3. Prompt clip (Omni, một cú máy)
- Khung: full-body, camera **cố định** (không zoom, không pan), 9:16, ánh sáng tự nhiên mềm, phòng khách ấm.
- Hành động theo lời, ghi theo mốc: vẫy tay chào (0–1 s) → khoe váy, kéo vạt (5–7 s) → tay vào túi, nghiêng nhẹ (8–11 s) → vẫy chốt (12 s+).
- Thêm: "realistic phone-shot UGC, handheld-free tripod, natural skin, no text overlays, no captions, no logo, no watermark".
- Khoá sản phẩm bằng **ảnh tham chiếu thật**. Không đưa trẻ em. Bỏ khung 0 giây nếu trắng (cắt ~0,3 s).
- Bẫy theo `HUONG-DAN-AI.md` mục 6: tạo tuần tự, đợt nhỏ, không che cửa sổ Flow.

## 4. Âm thanh
- Giọng AI qua Voice Studio (model `omnivoice`), **giọng do người dùng chọn** (mẫu: "Adam"), **không đổi khi chưa hỏi**.
- Dựng: cắt lặng đầu/cuối, whisper lấy mốc, chuẩn âm ~-14 LUFS (mẫu: -14,1), gắn vào clip bằng ffmpeg.
- Nhạc nền / SFX: **không đặt khi chưa được dạy** (xem `HUONG-DAN-AI.md` mục 8).
- Khớp môi: model có thể tự phát âm theo prompt; nếu dùng giọng ghép sau, lệch môi → [chưa kiểm]: thử một clip trước khi sinh số lượng.

## 5. QC (tự kiểm trước khi giao)
- [ ] Thời lượng ≈ độ dài giọng (±0,5 s), không để đuôi câm > 0,7 s.
- [ ] Sản phẩm giống ảnh tham chiếu ở ≥ 3 khung (đầu/giữa/cuối); không méo tay/chân/túi.
- [ ] Camera không trôi; nền không đổi qua clip.
- [ ] Không chữ/logo/watermark thừa trên khung.
- [ ] Mọi câu khẳng định (chất liệu, giá, "mát/mềm") đúng sự thật sản phẩm — liệt kê trong báo cáo để chủ shop duyệt.
- [ ] Ghi rõ **không kiểm được**: khớp môi, cảm xúc giọng, âm thanh (tôi không nghe được).

## 6. Quy trình cho subagent
`content` (lời + bảng hành động theo giây + số clip: **1–2 clip Omni**, chờ duyệt) → `tao-asset` (giọng, clip, xuất file) →
`edit` (ghép, cắt lặng, chuẩn âm; `vf` hoặc ffmpeg). Nếu cần phụ đề: dùng kit `talking-head` (khác thể loại, mẫu gốc **không** có phụ đề).

## 6b. Bài học từ lần chạy thử đầu (2026-11-15) — người dùng xác nhận "ổn"
Chạy thật: ảnh mẫu → 1 clip `flow::flow-omni-1.2-flash` (9:16, 15 s, 720×1280) → giọng Voice Studio → ghép ffmpeg → `output/ugc-thu/ugc_thu_v1.mp4` (1080×1920, 30 fps, 13 s).
1. **Flow chặn prompt có chữ về tuổi/giới tính** ("young", "woman", "adult … in her twenties", "no children"): báo "trẻ vị thành niên", 2 lần liền (credit được hoàn). Prompt chỉ gọi **"the fashion model from the reference image"**, không nêu tuổi/giới/trẻ em → qua. Đừng thêm "no children".
2. **Kết nối canvas**: agent (cổng 17371) chạy nhưng gọi tool lỗi 500 "không có canvas kết nối" tới khi người dùng **tự dán Connection token** vào panel Agent và bấm Connect (tự khám phá token không chạy được). AI không được nhập token. Kiểm bằng `canvas_get_state` trước khi sinh.
3. **Lấy file ra đĩa**: node "Xuất file" phải **nối từ node video** (`canvas_connect_nodes`), rồi `canvas_apply_ops` đặt `exportRequest` giá trị mới. File ra ở `fullstudio/canvas/exports/` (không phải `E:\...` như tài liệu cũ).
4. **Omni vẫn trả kênh âm thanh** dù `generateAudio:"false"` (mean −26,9 dB). Bỏ bằng `-an`/không map, chỉ dùng giọng mình.
5. **Omni không theo sát từng mốc giây trong prompt**, nhưng hành động đại ý đúng (vẫy tay, kéo vạt, tay vào túi/chống hông, vẫy kết). Miệng cử động tự do, không khớp lời: nên dùng cho lời voice-over, đừng hứa khớp môi.
6. Giọng: Voice Studio máy này chỉ có `demo0001` (Demo Voice) + alias OpenAI; **không có "Adam"**. `POST /v1/audio/speech` (model `tts-1`, voice `demo0001`, wav) chạy được: 50 từ → ~11,8 s. Whisper của Voice Studio trả mốc từng từ **sai** (từ cuối ở 4,2 s trên file 11,4 s) → chỉ dùng để kiểm lời, không dùng căn giờ.
7. **Công thức ghép đã chạy**: video giữ 0–13 s, scale lanczos 1080×1920, 30 fps; giọng trễ 0,3 s, `loudnorm` I=−14, đệm im lặng tới 13 s (đuôi ~1,3 s cho cử chỉ vẫy cuối).
8. Thời gian: tạo clip ~2 phút; mỗi lần bị chặn tốn ~1 phút.

## 7. Còn thiếu / chưa kiểm
- Đã chạy thử **1 lần** (mục 6b). Chưa thử Muse; chưa thử giọng "Adam"; khớp môi vẫn **không** có (miệng tự cử động).
- Mới có **1 video mẫu**; luật có thể không đúng với nhiều video khác.
- Camera cố định chỉ kiểm bằng mắt (lệnh `track` chạy quá chậm trên máy này, đã dừng).
- Giới hạn Omni: 1.1 = 10 s, 1.2 = 15 s (theo `HUONG-DAN-AI.md`); mẫu 13,8 s nên có thể dùng 1.2.
