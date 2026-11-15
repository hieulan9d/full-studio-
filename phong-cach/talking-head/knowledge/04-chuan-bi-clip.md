# 04. Chuẩn bị clip (ngoài AE)

Một lệnh làm cả ba việc: phiên âm từng từ, cắt khoảng lặng kèm chuẩn hoá âm lượng, tách người khỏi nền.

```bash
bash tools/prep.sh <raw.mp4> <outdir> [--lang vi] [--from-words] [--no-matte] [--prompt "tên riêng"] [--noise -35] [--min-silence 0.35] [--pad 0.08]
```

| File ra | Dùng để |
|---|---|
| `raw.json`, `raw.txt` | lời của clip gốc, mốc từng từ |
| `aroll.mp4` | đã cắt lặng, −14 LUFS. **Đây là A-roll đưa vào AE** |
| `aroll.edl.json` | các đoạn giữ lại (thời gian gốc → thời gian mới) |
| `aroll.transcript.json/.txt` | từng từ trên timeline của `aroll.mp4`. **Lập plan và đặt keyframe theo file này** |
| `aroll_matte.mp4` | người trắng trên nền đen, cùng kích thước, fps và số khung với aroll |

## Từng script

- `transcribe.py <in> <out.json> [--lang vi] [--model large-v3-turbo] [--cpu] [--prompt "..."]`
  - faster-whisper, `word_timestamps`, có VAD. JSON gồm segments → words {start, end, word, p}. Kèm file `.txt` mỗi dòng `[m:ss.ss] câu`.
  - `--prompt`: liệt kê tên thương hiệu, sản phẩm, thuật ngữ (ví dụ "lộ tuyến, nấm Candida, pH âm đạo") để Whisper viết đúng.
  - Tiếng Việt: đọc lại file `.txt`, sửa trực tiếp các từ sai trong JSON (giữ nguyên mốc).
- `cut_silence.py <in> <out> [--transcript t.json] [--from-words] [--noise -35] [--min-silence 0.35] [--pad 0.08] [--lufs -14] [--dry]`
  - Dò im lặng bằng `silencedetect`, chừa `pad` mỗi đầu, làm tròn điểm cắt theo khung, fade âm 10 ms ở mỗi chỗ cắt, loudnorm.
  - `--from-words`: dò khoảng nghỉ theo transcript, dùng khi có nhạc nền hoặc phòng ồn.
  - `--dry`: chỉ in ra những đoạn sẽ cắt.
- `matte.py <in> <matte.mp4> [--cutout person.mov] [--ratio auto]`
  - RobustVideoMatting (mobilenetv3, ONNX) giữ trạng thái qua các khung nên viền không nhấp nháy.
  - `--cutout`: xuất ProRes 4444 có alpha (chỉ người).
  - `--ratio auto`: khoảng 270 px ở cạnh ngắn (0,25 cho 1080p).
  - **Clip 4K: hạ về 1080 trước.**
- `_cuda.py`: tự thêm DLL của gói pip `nvidia-*` vào đường dẫn trên Windows.

## Cài đặt và tốc độ (đã đo trên RTX 3060 Laptop 6 GB)

| Bước | Tốc độ |
|---|---|
| Phiên âm `large-v3-turbo` trên GPU | 60 s âm thanh ≈ 3 s. CPU int8 chạy xấp xỉ bằng thời lượng clip |
| Cắt lặng | khoảng 3× thời gian thực |
| Matte 1080p trên GPU | khoảng 8 khung/giây (60 s 30 fps ≈ 4 phút). CPU khoảng 2 khung/giây |

Các bẫy khi cài:
- faster-whisper thiếu `cublas64_12.dll`: cài `nvidia-cublas-cu12` và `nvidia-cudnn-cu12` qua pip. `_cuda.py` lo phần đường dẫn.
- **onnxruntime-gpu ≥ 1.24 cần CUDA 13** (`cublasLt64_13.dll`), dù tên gói giống nhau. Ghim bản `1.23.*`.
  Gỡ `onnxruntime` (bản CPU) trước khi cài bản GPU, vì hai gói dùng chung tên module.
- `av.open(... metadata_errors)` báo TypeError: đừng để faster-whisper tự đọc file. Script đã tự giải mã bằng ffmpeg thành numpy.
- Đường dẫn có ký tự tiếng Việt: curl không ghi được, AE và ffmpeg thì đọc được. Khi tải file, `cd` vào thư mục đích rồi ghi tên ngắn.
- Mô hình `tools/models/rvm_mobilenetv3_fp32.onnx` (15 MB). Nếu mất, tải lại từ GitHub PeterL1n/RobustVideoMatting, bản phát hành v1.0.0.

## Giới hạn của matte

- Matte tách cả mic và vật người đang cầm. Thường đó lại là điều mong muốn: mic nằm trước chữ.
- Tay cử động nhanh bị mờ cạnh vài khung. Chữ sau lưng nên nằm phía trên đầu và vai.
- Nền rối hoặc cùng màu áo: kiểm tra matte bằng cách ghép cạnh nhau trước khi dựng:
  `ffmpeg -ss 5 -i aroll.mp4 -ss 5 -i aroll_matte.mp4 -filter_complex "[0]scale=360:-2[a];[1]scale=360:-2,format=rgb24[b];[a][b]hstack" -frames:v 1 check.jpg`
- Nếu matte xấu: chỉ dùng hiệu ứng sau lưng cho đoạn ngắn, hoặc nhờ người dùng tách một lần bằng Roto Brush trong AE.
