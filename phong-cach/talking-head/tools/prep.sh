#!/usr/bin/env bash
# Prepare a raw talking-head A-roll for the AE build.
#   bash tools/talking-head/prep.sh <raw.mp4> <outdir> [--lang vi] [--from-words] [--no-matte] [--prompt "names"]
# Writes to <outdir>:
#   raw.json / raw.txt          word transcript of the raw clip
#   aroll.mp4                   silences cut, loudness -14 LUFS
#   aroll.edl.json              kept ranges (raw time -> aroll time)
#   aroll.transcript.json/.txt  words on the aroll timeline  <- plan captions from this
#   aroll_matte.mp4             white person on black (AE: Track Matte -> Luma)
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
raw="$1"; out="$2"; shift 2
lang=vi; cutargs=(); matte=1; prompt=()
while [ $# -gt 0 ]; do
  case "$1" in
    --lang) lang="$2"; shift ;;
    --from-words) cutargs+=(--from-words) ;;
    --no-matte) matte=0 ;;
    --prompt) prompt=(--prompt "$2"); shift ;;
    *) cutargs+=("$1") ;;
  esac
  shift
done
mkdir -p "$out"
python "$here/transcribe.py" "$raw" "$out/raw.json" --lang "$lang" "${prompt[@]}" 2> >(grep -av -e Warning -e symlink -e warnings.warn >&2)
python "$here/cut_silence.py" "$raw" "$out/aroll.mp4" --transcript "$out/raw.json" "${cutargs[@]}"
python - "$out/aroll.transcript.json" <<'EOF'
import json, sys
p = sys.argv[1]; j = json.load(open(p, encoding="utf-8"))
with open(p[:-5] + ".txt", "w", encoding="utf-8") as f:
    for s in j["segments"]:
        f.write(f"[{int(s['start']//60)}:{s['start']%60:05.2f}] {s['text']}\n")
EOF
if [ "$matte" = 1 ]; then
  python "$here/matte.py" "$out/aroll.mp4" "$out/aroll_matte.mp4" 2>&1 | grep -a -e frames -e Error
fi
echo "done: $out"
