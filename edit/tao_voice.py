# tao_voice.py - tạo giọng đọc từ file kịch bản bằng VoiceStudio đang chạy (localhost:3900)
# Cách dùng (PowerShell/CMD, cần Python 3):
#   python tao_voice.py --list
#   python tao_voice.py --script "..\voice studio\42_kich_ban_viral_hang_thu_daily.txt" --voice <voice_id> --only 01 02
import argparse, json, re, urllib.request, os

BASE = "http://localhost:3900"


def list_voices():
    with urllib.request.urlopen(BASE + "/v1/audio/voices", timeout=30) as r:
        print(json.dumps(json.load(r), ensure_ascii=False, indent=2))


def parse_blocks(path):
    blocks, cur = [], None
    with open(path, encoding="utf-8") as f:
        for raw in f:
            line = raw.rstrip("\n")
            m = re.match(r"^(\d{2})\.\s+(.*)$", line)
            if m:
                if cur:
                    blocks.append(cur)
                cur = {"num": m.group(1), "title": m.group(2).strip(), "body": []}
            elif line.startswith("--- ") or line.startswith("==="):
                if cur:
                    blocks.append(cur)
                cur = None
            elif cur is not None and line.strip():
                cur["body"].append(line.strip())
    if cur:
        blocks.append(cur)
    return blocks


def speak(text, voice, model, fmt, out_path):
    body = json.dumps({"model": model, "input": text, "voice": voice, "response_format": fmt}).encode("utf-8")
    req = urllib.request.Request(BASE + "/v1/audio/speech", data=body, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=900) as r, open(out_path, "wb") as f:
        f.write(r.read())


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--list", action="store_true", help="liệt kê voice có sẵn")
    ap.add_argument("--script", help="file kịch bản .txt")
    ap.add_argument("--voice", help="voice id (lấy từ --list)")
    ap.add_argument("--model", default="tts-1", help="model/engine id")
    ap.add_argument("--format", default="wav", choices=["wav", "mp3"])
    ap.add_argument("--out", default="voice", help="thư mục lưu file")
    ap.add_argument("--only", nargs="*", help="chỉ tạo các số thứ tự, ví dụ: 01 02")
    a = ap.parse_args()

    if a.list:
        return list_voices()
    if not a.script or not a.voice:
        ap.error("cần --script và --voice (hoặc --list)")

    os.makedirs(a.out, exist_ok=True)
    blocks = parse_blocks(a.script)
    print(f"Đọc được {len(blocks)} đoạn")
    for b in blocks:
        if a.only and b["num"] not in a.only:
            continue
        text = " ".join(b["body"]).strip()
        if not text:
            continue
        slug = re.sub(r'[\\/:*?"<>|]', "", b["title"])[:50].strip()
        out = os.path.join(a.out, f"{b['num']}_{slug}.{a.format}")
        print("->", out)
        speak(text, a.voice, a.model, a.format, out)
    print("Xong.")


if __name__ == "__main__":
    main()
