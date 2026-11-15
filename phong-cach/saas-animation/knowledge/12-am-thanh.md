# 12 — Âm thanh: SFX, nhạc nền, độ to

Đã chạy thật: Orbiq v2 (16:9) và 9:16 — 36 SFX + nhạc nền, chuẩn hoá −14 LUFS.

## 1. Bộ SFX của kit (`audio/sfx/`)

Tự tổng hợp bằng `tools/sfx_gen.py` — không tải, không bản quyền, 48 kHz stereo. 12 loại × 2–3 biến thể:
whoosh, whoosh_fast, swoosh_up, pop, click, tick, typing, riser, impact, sparkle, glitch, shimmer
(mô tả và cách dùng ở đầu file `sfx_gen.py`). Tạo lại / tạo biến thể khác: `python -I tools/sfx_gen.py audio/sfx --seed 11`.

AI không nghe được âm thanh → kiểm tra bằng phổ tần (`ffmpeg … showspectrumpic`) và mức âm (`volumedetect`).

## 2. Mốc SFX tự động

- Mỗi hàm cảnh trong `lib/` gọi `H.cue(comp, t, loại, độ_dài?)` tại các mốc chuyển động của nó
  (cửa sổ vào → whoosh, chip bật → pop, gõ → typing, gửi → swoosh_up, chấm "•••" → tick, sao → riser + impact…).
  Mốc lưu trong **comment của comp cảnh** nên còn nguyên sau khi AE khởi động lại.
- `riser`: `t` là mốc **kết thúc** (đuôi riser trùng lúc chuyển cảnh). Loại khác: `t` là mốc bắt đầu.
- Cảnh dựng tay: tự gọi `H.cue` ở những chuyển động chính.
- `H.buildAudio(main, {sfxDir, music, musicDb})` quét mọi comp cảnh trong MAIN, đổi mốc sang giờ của MAIN
  (bỏ mốc ngoài in/out của layer), chọn biến thể xoay vòng, bỏ trùng loại trong 0,12 s, đặt mức theo `H.SFX_DB`,
  nhạc fade 1,5 s cuối. Chạy lại được (xoá `SFX_`/`MUSIC_` cũ).
- Mức mặc định (dB): impact −6, whoosh −9, riser −10, whoosh_fast/swoosh_up −11, sparkle −12, pop −13, glitch −13,
  click −15, typing −15, shimmer −15, tick −19; nhạc −7. Nhiều SFX dày đặc ở một chỗ → giảm `sfxDb` hoặc bỏ cue.

## 3. Nhạc nền

**Ưu tiên nhạc thật** trong `audio/music/` (8 bài Mixkit, xem `audio/music/INDEX.md`: BPM, điểm cắt, tâm trạng,
giấy phép). Chọn bài trước khi viết storyboard và đặt lưới cảnh theo BPM của bài; `CFG.musicStart` = điểm cắt.
Nhạc tự tạo dưới đây là phương án dự phòng (khi cần đúng một BPM lạ hoặc thư viện không có tâm trạng phù hợp).


- Không có nhạc từ người dùng: `python -I tools/music_gen.py output/<slug>/music_<bpm>.wav --bpm 120 --dur 20 --mood dark --hits <mốc cảnh>`.
  Nhạc tạo đúng BPM (đã đo lại: 120 → 119,5; 95 → 95,2), có intro, beat, build-up 2 phách trước mỗi hit, crash tại hit, outro.
  `--mood dark` (thứ, tối) hợp tông tối; `bright` (trưởng) hợp sáng pastel.
- Đặt mốc cảnh **trên lưới phách** (bội số của 60/BPM) để beat và hình khớp hẳn. Orbiq dùng mốc 3,9 / 9,1 / 13,1…
  lệch 0,1 s so với lưới 0,5 s — chấp nhận được nhưng video sau nên đặt đúng lưới.
- Có nhạc của người dùng: đo bằng `tools/beats.py` → lấy `scene grid` làm mốc storyboard.
- Nhạc thật có bản quyền hay hơn nhạc tổng hợp. Tải nhạc/SFX từ mạng: **hỏi người dùng từng file** (tên, nguồn,
  dung lượng, giấy phép) rồi mới tải; lưu vào `audio/music/` kèm file `LICENSE-<tên>.txt` ghi nguồn + giấy phép.

## 4. Độ to (bước cuối bắt buộc)

AE xuất ~−18 LUFS. Sau render: `bash tools/finalize.sh <in>.mp4 <out>_final.mp4` → −14 LUFS, đỉnh ≤ −1 dBTP
(chuẩn YouTube/Instagram/TikTok), hình copy nguyên. Giao cho người dùng bản `_final`.
