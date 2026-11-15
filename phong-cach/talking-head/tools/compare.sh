#!/usr/bin/env bash
# So khung bản dựng AE với video tham chiếu ở cùng thời điểm.
#   bash tools/compare.sh <thư-mục-khung> <prefix> <video-tham-chiếu> <t1> <t2> ...
# Khung AE phải có sẵn: <thư-mục-khung>/<prefix>_00.png, _01.png ... (H.saveFrames(comp, [t1,t2..], dir, prefix)).
# Ra: <thư-mục-khung>/<prefix>_cmp.jpg — hàng trên bản dựng, hàng dưới tham chiếu, mỗi ô 360×640.
# saveFrameToPng ghi bất đồng bộ: script tự chờ tới 20 s cho từng file.
set -euo pipefail
d="$1"; p="$2"; ref="$3"; shift 3
n=$#
for i in $(seq 0 $((n - 1))); do
  f="$d/${p}_$(printf %02d $i).png"
  for k in $(seq 1 40); do [ -s "$f" ] && break; sleep 0.5; done
  [ -s "$f" ] || { echo "thiếu $f" >&2; exit 1; }
done
i=0
for t in "$@"; do
  m=$(printf %02d $i)
  ffmpeg -v error -y -ss "$t" -i "$ref" -frames:v 1 -vf "scale=360:640:force_original_aspect_ratio=decrease,pad=360:640:(ow-iw)/2:(oh-ih)/2" "$d/_m$m.png"
  ffmpeg -v error -y -i "$d/${p}_$m.png" -vf "scale=360:640:force_original_aspect_ratio=decrease,pad=360:640:(ow-iw)/2:(oh-ih)/2" "$d/_a$m.png"
  i=$((i + 1))
done
ins=(); for j in $(seq 0 $((n - 1))); do ins+=(-i "$d/_a$(printf %02d $j).png"); done
for j in $(seq 0 $((n - 1))); do ins+=(-i "$d/_m$(printf %02d $j).png"); done
if [ "$n" -gt 1 ]; then
  a=""; b=""; for j in $(seq 0 $((n - 1))); do a+="[$j]"; b+="[$((n + j))]"; done
  fc="${a}hstack=$n[a];${b}hstack=$n[b];[a][b]vstack"
else
  fc="[0][1]vstack"
fi
ffmpeg -v error -y "${ins[@]}" -filter_complex "$fc" -q:v 3 "$d/${p}_cmp.jpg"
rm -f "$d"/_a*.png "$d"/_m*.png
echo "$d/${p}_cmp.jpg"
