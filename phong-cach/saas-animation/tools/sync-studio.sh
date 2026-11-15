#!/bin/bash
# sync-studio.sh [DEST]
# Đồng bộ kit sang thư mục kiến thức của Full studio (mặc định: D:/dự án antigravity/full studio/phong-cach/saas-animation).
# - Chép mọi thứ của kit TRỪ output/ (file render nặng) và file tạm.
# - Không xoá gì ở đích; file riêng của đích (PHONG-CACH.md, mau-tham-chieu/) giữ nguyên.
# - Đổi đường dẫn tuyệt đối của kit trong projects/*/build.jsx sang đường dẫn đích.
# Chạy sau mỗi lần kit thay đổi (bước "Tự học" trong CLAUDE.md), rồi cập nhật PHONG-CACH.md ở đích nếu cần.
set -e
SRC="$(cd "$(dirname "$0")/.." && pwd)"
DEST="${1:-/d/dự án antigravity/full studio/phong-cach/saas-animation}"
mkdir -p "$DEST"
cd "$SRC"
n=0
while IFS= read -r -d '' f; do
  mkdir -p "$DEST/$(dirname "$f")"
  if ! cmp -s "$f" "$DEST/$f" 2>/dev/null; then cp -p "$f" "$DEST/$f"; n=$((n+1)); echo "  cập nhật $f"; fi
done < <(find . -type f ! -path './output/*' ! -name '*.pyc' ! -name '.DS_Store' -print0 | sed -z 's|^\./||')
# đường dẫn kit trong build.jsx → đường dẫn đích (dạng D:/...)
win_src=$(cd "$SRC" && pwd -W 2>/dev/null || pwd); win_dest=$(cd "$DEST" && pwd -W 2>/dev/null || pwd)
for b in "$DEST"/projects/*/build.jsx; do
  [ -f "$b" ] && sed -i "s|var KIT = \"[^\"]*\";|var KIT = \"$win_dest\";|" "$b"
done
mkdir -p "$DEST/output"
echo "xong: $n file cập nhật → $DEST  (KIT trong build.jsx = $win_dest)"
