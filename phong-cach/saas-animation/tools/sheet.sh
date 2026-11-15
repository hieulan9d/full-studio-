#!/bin/bash
# sheet.sh OUT.jpg A.png [B.png ...]
# Ghép các ảnh thành 1 lưới JPG (2 cột, mỗi ô rộng 800) để xem nhanh, nhẹ.
# Một ảnh thì chỉ thu nhỏ.
set -e
out="$1"; shift; n=$#
[ $n -ge 1 ] || { echo "usage: sheet.sh out.jpg a.png [b.png ...]"; exit 1; }
if [ $n -eq 1 ]; then ffmpeg -v error -y -i "$1" -vf scale=800:-1 -q:v 3 "$out"; exit 0; fi
args=(); fc=""; inp=""; lay=""
i=0; for f in "$@"; do args+=(-i "$f"); fc+="[$i:v]scale=800:450:force_original_aspect_ratio=decrease,pad=800:450:(ow-iw)/2:(oh-ih)/2[v$i];"; inp+="[v$i]"; lay+="$(( (i%2)*800 ))_$(( (i/2)*450 ))|"; i=$((i+1)); done
ffmpeg -v error -y "${args[@]}" -filter_complex "${fc}${inp}xstack=inputs=$n:layout=${lay%|}:fill=black" -q:v 3 "$out"
