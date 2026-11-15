#!/bin/bash
# compare.sh REF.mp4 OURS.mp4 OUT_PREFIX t1 t2 t3 ...
# Đặt khung của video tham chiếu (trái) và bản dựng (phải) cạnh nhau ở cùng mốc giây.
# Mỗi 4 mốc ra 1 ảnh OUT_PREFIX_N.jpg (lưới 2 cột × 4 hàng, mỗi ô 800×450).
set -e
ref="$1"; ours="$2"; pre="$3"; shift 3
F="fontfile='C\:/Windows/Fonts/arial.ttf'"
[ -f "C:/Windows/Fonts/arial.ttf" ] || F="fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
tmp=$(mktemp -d); i=0
for t in "$@"; do
  ffmpeg -v error -y -ss "$t" -i "$ref"  -frames:v 1 -vf "scale=800:450,drawtext=$F:text='REF $t':x=8:y=8:fontsize=24:fontcolor=yellow:box=1:boxcolor=black" "$tmp/r$i.png"
  ffmpeg -v error -y -ss "$t" -i "$ours" -frames:v 1 -vf "scale=800:450,drawtext=$F:text='OURS $t':x=8:y=8:fontsize=24:fontcolor=yellow:box=1:boxcolor=black" "$tmp/o$i.png"
  i=$((i+1))
done
n=$i; page=0
for ((s=0; s<n; s+=4)); do
  args=(); lay=""; k=0
  for ((j=s; j<s+4 && j<n; j++)); do args+=(-i "$tmp/r$j.png" -i "$tmp/o$j.png"); lay+="0_$((k*450))|800_$((k*450))|"; k=$((k+1)); done
  ffmpeg -v error -y "${args[@]}" -filter_complex "xstack=inputs=$((k*2)):layout=${lay%|}" -q:v 3 "${pre}_${page}.jpg"
  echo "${pre}_${page}.jpg"; page=$((page+1))
done
rm -rf "$tmp"
