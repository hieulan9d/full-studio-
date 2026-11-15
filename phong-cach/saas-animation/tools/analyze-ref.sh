#!/bin/bash
# analyze-ref.sh REF.mp4 OUT_DIR [fps]
# Phân tích video tham chiếu SaaS:
#   - thông số (kích thước, fps, thời lượng)
#   - sheet khung hình dày (mặc định 5 khung/giây, lưới 4×5, có mốc giờ) → OUT_DIR/ref_NN.jpg
#   - nhịp nhạc + các tiếng nhấn → OUT_DIR/beats.txt (cần python + numpy)
# Sau đó AI đọc các sheet và beats.txt để viết ref-notes.md (cảnh, mốc giây, layer, chuyển động).
set -e
ref="$1"; out="$2"; fps="${3:-5}"
here="$(cd "$(dirname "$0")" && pwd)"
mkdir -p "$out"
ffprobe -v error -show_entries format=duration:stream=codec_type,width,height,r_frame_rate -of compact "$ref" | tee "$out/info.txt"
F="fontfile='C\:/Windows/Fonts/arial.ttf'"
[ -f "C:/Windows/Fonts/arial.ttf" ] || F="fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
ffmpeg -v error -y -i "$ref" -vf "fps=$fps,scale=480:-1,drawtext=$F:text='%{pts\:hms}':x=6:y=6:fontsize=22:fontcolor=yellow:box=1:boxcolor=black,tile=4x5" "$out/ref_%02d.jpg"
ls "$out"/ref_*.jpg | wc -l | xargs echo "sheets:"
if ffprobe -v error -select_streams a -show_entries stream=codec_type -of csv=p=0 "$ref" | grep -q audio; then
  ffmpeg -v error -y -i "$ref" -ac 1 -ar 22050 "$out/audio.wav"
  python -I "$here/beats.py" "$out/audio.wav" | tee "$out/beats.txt"
else
  echo "no audio" | tee "$out/beats.txt"
fi
