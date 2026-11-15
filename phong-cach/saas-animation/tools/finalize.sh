#!/bin/bash
# finalize.sh IN.mp4 OUT.mp4 [LUFS=-14]
# Bước cuối sau ae_render: chuẩn hoá độ to âm thanh (2 lượt loudnorm, đỉnh ≤ -1 dBTP), giữ nguyên hình (copy).
# -14 LUFS = chuẩn YouTube/Instagram/TikTok. Video không có tiếng thì chỉ copy.
set -e
in="$1"; out="$2"; tgt="${3:--14}"
if ! ffprobe -v error -select_streams a -show_entries stream=codec_type -of csv=p=0 "$in" | grep -q audio; then
  cp "$in" "$out"; echo "no audio, copied"; exit 0; fi
j=$(ffmpeg -hide_banner -nostats -i "$in" -af loudnorm=I=$tgt:TP=-1:LRA=11:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p')
g(){ echo "$j" | grep "\"$1\"" | sed 's/.*: "\(.*\)".*/\1/'; }
ffmpeg -v error -y -i "$in" -c:v copy -af "loudnorm=I=$tgt:TP=-1:LRA=11:measured_I=$(g input_i):measured_TP=$(g input_tp):measured_LRA=$(g input_lra):measured_thresh=$(g input_thresh):offset=$(g target_offset):linear=true,aresample=48000" -c:a aac -b:a 192k "$out"
ffmpeg -hide_banner -nostats -i "$out" -af ebur128=peak=true -f null - 2>&1 | grep -E "^\s+(I|Peak):" | tail -2
