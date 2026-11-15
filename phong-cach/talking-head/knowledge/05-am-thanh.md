# 05. Âm thanh và SFX

## Thứ tự

1. Giọng được chuẩn hoá trước, ở bước chuẩn bị clip (`cut_silence.py` đưa về −14 LUFS).
2. SFX là layer audio trong MAIN, tên `SFX_<file>@<giây>`, xếp cuối stack (`T.sfx`).
3. Sau khi render: chạy **2 lượt loudnorm** cho cả bản mix. Một lượt chỉ đạt khoảng −15,5 LUFS, như bản v1 Foodtage.

```bash
# lượt 1: đo
ffmpeg -i raw.mp4 -af loudnorm=I=-14:TP=-1:LRA=11:print_format=json -f null - 2>&1 | tail -12
# lượt 2: áp số đo được (input_i, input_tp, input_lra, input_thresh, target_offset)
ffmpeg -i raw.mp4 -c:v copy -af loudnorm=I=-14:TP=-1:LRA=11:measured_I=<input_i>:measured_TP=<input_tp>:measured_LRA=<input_lra>:measured_thresh=<input_thresh>:offset=<target_offset>:linear=true -ar 48000 -c:a aac -b:a 192k out.mp4
# kiểm tra
ffmpeg -i out.mp4 -af ebur128 -f null - 2>&1 | grep -A1 Integrated
```

## Bảng SFX theo hiệu ứng (HD1, đã dùng trong Foodtage)

| Hình | SFX (file trong examples/foodtage/assets/SFX) | Mức | Ghi chú |
|---|---|---|---|
| Mở video, hook | `Tiktok SFX 2.mp3` (0–1,2 s) | −4 dB | |
| Icon tile bật ra | `pop sound.MP3` mỗi tile | −3 dB | lệch nhau 0,15 s như tile |
| Tile vào trên mic | `ping.MP3` | −6 dB | |
| "Number 1/2/3", số neon + zoom giật | `MUI IMPACT SWEETENER Space Impact.wav` (từ 0,05 s, dài 2,4 s) + `2. Lightsaber.mp3` (+0,05 s) | −2 / −8 dB | đúng khung zoom |
| Từ khoá to vào | `Camera Shutter Sound Effect.mp3` | −6 đến −8 dB | |
| Mỗi từ phụ đề | `click-for transitions.MP3` | −14 dB | nhỏ, chỉ tạo nhịp |
| Trước một cú chốt | `riser long classique.mp3` (đoạn 0,8–2,7 s trong file là đoạn dâng) | −4 dB | **đỉnh riser rơi đúng khung impact** |
| B-roll meme đổi cảm xúc | `Tiktok SFX 2.mp3` | −6 dB | |
| Vào nền vòng tròn | `Gears 1.wav` | −4 dB | |
| Đoạn kết | `riser long classique.mp3` từ đầu tới hết video | −6 dB | |
| Light leak / chuyển cảnh | `film camera flash.mp3`, `Camera Shutter…` (chỉ lấy phần đầu) | | |

Luật:
- SFX không được át giọng. Mức nghe vừa trong lúc dựng thường sẽ to khi xuất.
- Không có nhạc nền trong Foodtage, đã kiểm bằng `sfx_match.py`: phần thêm vào giữa các SFX ở mức khoảng −50 dB.
  Video bán hàng hoặc tư vấn có thể thêm nhạc nền nhẹ ở −20 đến −24 dB dưới giọng.
- Video y tế: bỏ impact và lightsaber (nghe như phim hành động). Dùng pop, click, ping, whoosh nhẹ, riser ngắn.

## Tìm SFX trong video mẫu

`python tools/sfx_match.py <video-mẫu> <clip-gốc> <thư-mục-SFX>`. Cách làm: lấy âm thanh bản edit trừ âm thanh clip gốc, phần còn lại là phần được thêm vào. Sau đó so từng đoạn 0,75 s của mỗi file SFX với phần còn lại. Ví dụ Foodtage:
- Khớp chắc chắn (≥ 0,88): click ở 5,7 s, Tiktok SFX ở 0,0 s và 13,5 s, Gears ở 17,9 s, riser ở 18,3 s.
- Ba impact lớn ở 2,6 / 9,2 / 15,1 s **không khớp file nào** vì đã bị chỉnh âm lượng hoặc pitch. Chỉ thấy trong bảng mức dB: một đỉnh khoảng −3 dB rồi tắt dần trong khoảng 1,5 s.
- Riser 7,3 → 9,2 s thể hiện trong bảng dB là mức tăng dần từ −44 lên −16 dB.
