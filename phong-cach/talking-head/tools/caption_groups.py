"""Tạo nháp nhóm phụ đề từng từ (định dạng D.caps của build.jsx) từ transcript.

    python tools/caption_groups.py <transcript.json> [--skip 0-2.45,12-14.73] [--max-chars 12]
           [--max-words 2] [--max-lines 3] [--pause 0.35] [--end 22.2]

Luật (lấy từ video mẫu Foodtage):
  - một dòng ≤ max-words từ và ≤ max-chars ký tự; một nhóm ≤ max-lines dòng;
  - ngắt nhóm ở dấu câu (. , ? ! …) hoặc khi người nói ngừng ≥ pause giây;
  - nhóm tắt (t1) đúng lúc từ đầu tiên của nhóm sau bắt đầu (hoặc từ cuối + 0,4 s nếu có khoảng nghỉ);
  - bỏ các từ rơi vào --skip (đoạn đã có chữ to/hook/B-roll — không chồng phụ đề lên).
In ra mảng JS dán thẳng vào D.caps. Sau đó SỬA TAY: thêm {k:1.3} cho từ nhấn, {c:'#màu'} đổi màu,
{su:1} cho từ Stroke Up, xoá nhóm thừa. Từ có dấu tiếng Việt giữ nguyên.
"""
import argparse, json, re, sys


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser()
    ap.add_argument("transcript")
    ap.add_argument("--skip", default="")
    ap.add_argument("--max-chars", type=int, default=12)
    ap.add_argument("--max-words", type=int, default=2)
    ap.add_argument("--max-lines", type=int, default=3)
    ap.add_argument("--pause", type=float, default=0.35)
    ap.add_argument("--end", type=float, default=None)
    a = ap.parse_args()
    tr = json.load(open(a.transcript, encoding="utf-8"))
    skip = []
    for part in filter(None, a.skip.split(",")):
        s, e = part.split("-"); skip.append((float(s), float(e)))
    words = [w for s in tr["segments"] for w in s["words"]
             if not any(s0 <= (w["start"] + w["end"]) / 2 < e0 for s0, e0 in skip)]
    end = a.end or tr.get("duration") or (words[-1]["end"] + 0.5 if words else 0)

    groups, cur, line = [], [], []
    def flush_line():
        nonlocal line
        if line: cur.append(line); line = []
    def flush_group():
        nonlocal cur
        flush_line()
        if cur: groups.append(cur); cur = []
    prev = None
    for w in words:
        txt = w["word"].strip()
        if not txt: continue
        if prev is not None and w["start"] - prev["end"] >= a.pause: flush_group()
        if line and (len(line) >= a.max_words or len(" ".join(x[0] for x in line)) + 1 + len(txt) > a.max_chars): flush_line()
        if len(cur) >= a.max_lines and not line: flush_group()
        line.append((txt, round(w["start"], 2), w["end"]))
        prev = w
        if re.search(r"[.,?!…:;]$", txt): flush_group()
    flush_group()

    out = []
    for i, g in enumerate(groups):
        last_end = g[-1][-1][2]
        nxt = groups[i + 1][0][0][1] if i + 1 < len(groups) else end
        t1 = round(min(nxt, last_end + 0.4) if nxt - last_end > 0.6 else nxt, 2)
        lines = ", ".join("[" + ", ".join(json.dumps([x[0], x[1]], ensure_ascii=False) for x in ln) + "]" for ln in g)
        out.append(f"    {{ t1: {t1}, lines: [{lines}] }}")
    print("[\n" + ",\n".join(out) + "\n]")


if __name__ == "__main__":
    main()
