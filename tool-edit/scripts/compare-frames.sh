#!/bin/bash
# Xep hang tren = Tool Edit (preview_frame), hang duoi = video mau, de nhin bang mat. Dung: bash scripts/compare-frames.sh ten "t1 t2 t3 ..."
NAME=$1; TS=$2; REF="../phong-cach/talking-head/examples/foodtage/ref/video-mau.mp4"; D=out/gd6/cmp-$NAME; mkdir -p $D
i=0; for t in $TS; do
  curl -s "http://127.0.0.1:17480/preview_frame?t=$t&scale=0.3" -o $D/a$i.png
  ffmpeg -v error -y -ss $t -i "$REF" -frames:v 1 -vf scale=324:576 $D/b$i.png
  i=$((i+1))
done
ffmpeg -v error -y -framerate 1 -i "$D/a%d.png" -vf "tile=${i}x1" -frames:v 1 $D/top.png
ffmpeg -v error -y -framerate 1 -i "$D/b%d.png" -vf "tile=${i}x1" -frames:v 1 $D/bot.png
ffmpeg -v error -y -i $D/top.png -i $D/bot.png -filter_complex vstack out/gd6/cmp-$NAME.png
