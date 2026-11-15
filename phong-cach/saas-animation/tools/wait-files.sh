#!/bin/bash
# wait-files.sh SECONDS FILE [FILE ...]
# Chờ tới khi mọi file tồn tại và không đổi dung lượng trong 2 giây (comp.saveFrameToPng ghi BẤT ĐỒNG BỘ).
# Thoát mã 1 nếu hết giờ.
lim="$1"; shift; end=$(( $(date +%s) + lim ))
while [ "$(date +%s)" -lt "$end" ]; do
  ok=1
  for f in "$@"; do [ -s "$f" ] || { ok=0; break; }; done
  if [ $ok -eq 1 ]; then
    s1=$(for f in "$@"; do stat -c %s "$f"; done | tr '\n' ' '); sleep 2
    s2=$(for f in "$@"; do stat -c %s "$f"; done | tr '\n' ' ')
    [ "$s1" = "$s2" ] && { echo "ready"; exit 0; }
  fi
  sleep 1
done
echo "timeout"; exit 1
