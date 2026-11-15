#!/usr/bin/env bash
# Lưới khung hình có in mốc thời gian, để AI "xem" một video mà không phải xem liên tục.
#   bash tools/sheet.sh <video> <ảnh-ra.jpg> [fps=3] [cột=11] [rộng-ô=270]
# 22 giây ở fps 3 = 66 ô → nên tách nhiều ảnh: dùng -ss/-t trước khi gọi, hoặc giảm fps.
set -euo pipefail
v="$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"; out="$2"; fps="${3:-3}"; cols="${4:-11}"; w="${5:-270}"
dir="$(dirname "$out")"; mkdir -p "$dir"
# drawtext cần file font cạnh lệnh (Fontconfig trên Windows hay lỗi): chép tạm một font hệ thống
font="$dir/_f.ttf"
for c in /c/Windows/Fonts/arial.ttf /usr/share/fonts/truetype/dejavu/DejaVuSans.ttf /System/Library/Fonts/Supplemental/Arial.ttf; do
  [ -f "$c" ] && { cp "$c" "$font"; break; }
done
dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$v")
rows=$(python -c "import math;print(max(1,math.ceil(float('$dur')*$fps/$cols)))")
( cd "$dir" && ffmpeg -v error -y -i "$v" -vf "fps=$fps,scale=$w:-2,drawtext=fontfile=_f.ttf:text='%{pts\:hms}':x=4:y=4:fontsize=20:fontcolor=yellow:box=1:boxcolor=black@0.6,tile=${cols}x${rows}" -frames:v 1 -q:v 3 "$(basename "$out")" )
rm -f "$font"
echo "$out"
