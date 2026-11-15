"""Jump-cut the silences out of an A-roll clip and normalise loudness.

    python tools/talking-head/cut_silence.py <input.mp4> <out.mp4> [--transcript t.json]
        [--noise -35] [--min-silence 0.35] [--pad 0.08] [--lufs -14] [--from-words] [--dry]

Finds silences with ffmpeg silencedetect, keeps everything else plus --pad seconds on each
side, snaps cut points to the frame grid and renders one mp4 (10 ms audio fades at each cut,
loudnorm to --lufs). Writes next to <out>:
  <out>.edl.json          kept ranges: [{src_start, src_end, out_start}] — map old -> new time
  <out>.transcript.json   (with --transcript) the word timestamps moved onto the new timeline
--dry only prints what would be cut.
"""
import argparse, json, os, re, subprocess, sys


def probe(path):
    r = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
                        "stream=r_frame_rate:format=duration", "-of", "json", path],
                       stdout=subprocess.PIPE, check=True, text=True)
    j = json.loads(r.stdout)
    n, d = j["streams"][0]["r_frame_rate"].split("/")
    return float(n) / float(d), float(j["format"]["duration"])


def silences(path, noise, mind):
    r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", path, "-vn", "-af",
                        f"silencedetect=noise={noise}dB:d={mind}", "-f", "null", "-"],
                       stderr=subprocess.PIPE, text=True, encoding="utf-8", errors="replace")
    starts = [float(x) for x in re.findall(r"silence_start: (-?[\d.]+)", r.stderr)]
    ends = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", r.stderr)]
    return list(zip(starts, ends + [None] * (len(starts) - len(ends))))


def word_gaps(transcript, dur, mind):
    words = [w for s in json.load(open(transcript, encoding="utf-8"))["segments"] for w in s["words"]]
    out, prev = [], 0.0
    for w in words:
        if w["start"] - prev >= mind:
            out.append((prev, w["start"]))
        prev = max(prev, w["end"])
    if dur - prev >= mind:
        out.append((prev, None))
    return out


def keep_ranges(sil, dur, pad, fps, min_keep):
    snap = lambda t: round(round(t * fps) / fps, 6)
    keep, cur = [], 0.0
    for s, e in sil:
        e = dur if e is None else e
        a, b = cur, min(dur, s + pad)
        if b - a >= min_keep:
            keep.append([a, b])
        cur = max(0.0, e - pad)
    if dur - cur >= min_keep:
        keep.append([cur, dur])
    out = []
    for a, b in keep:
        a, b = snap(a), snap(b)
        if out and a <= out[-1][1]:
            out[-1][1] = max(out[-1][1], b)
        elif b > a:
            out.append([a, b])
    return out


def remap(t, edl):
    for r in edl:
        if r["src_start"] <= t <= r["src_end"]:
            return round(t - r["src_start"] + r["out_start"], 3)
    return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("input")
    ap.add_argument("out")
    ap.add_argument("--transcript")
    ap.add_argument("--noise", type=float, default=-35, help="dB below which audio counts as silence")
    ap.add_argument("--min-silence", type=float, default=0.35, help="only cut pauses longer than this (s)")
    ap.add_argument("--pad", type=float, default=0.08, help="audio kept on each side of speech (s)")
    ap.add_argument("--min-keep", type=float, default=0.2, help="drop kept pieces shorter than this (s)")
    ap.add_argument("--lufs", type=float, default=-14)
    ap.add_argument("--crf", type=int, default=16)
    ap.add_argument("--from-words", action="store_true",
                    help="find pauses from the transcript's word gaps instead of the audio level "
                         "(for clips with music under the voice or a noisy room); needs --transcript")
    ap.add_argument("--dry", action="store_true")
    a = ap.parse_args()

    fps, dur = probe(a.input)
    if a.from_words:
        if not a.transcript:
            sys.exit("--from-words needs --transcript")
        sil = word_gaps(a.transcript, dur, a.min_silence)
    else:
        sil = silences(a.input, a.noise, a.min_silence)
    keep = keep_ranges(sil, dur, a.pad, fps, a.min_keep)
    edl, t = [], 0.0
    for s, e in keep:
        edl.append({"src_start": s, "src_end": e, "out_start": round(t, 6)})
        t += e - s
    print(f"{dur:.2f}s -> {t:.2f}s ({dur - t:.2f}s cut, {len(keep)} pieces, {len(keep) - 1} cuts)")
    if a.dry:
        for r in edl:
            print(f"  keep {r['src_start']:8.2f} - {r['src_end']:8.2f}")
        return

    fade = 0.01
    parts, labels = [], []
    for i, (s, e) in enumerate(keep):
        d = e - s
        parts.append(f"[0:v]trim=start={s}:end={e},setpts=PTS-STARTPTS[v{i}];")
        parts.append(f"[0:a]atrim=start={s}:end={e},asetpts=PTS-STARTPTS,"
                     f"afade=t=in:d={fade},afade=t=out:st={max(0, d - fade):.6f}:d={fade}[a{i}];")
        labels.append(f"[v{i}][a{i}]")
    parts.append("".join(labels) + f"concat=n={len(keep)}:v=1:a=1[v][ac];")
    parts.append(f"[ac]loudnorm=I={a.lufs}:TP=-1:LRA=11,aresample=48000[a]")
    graph = os.path.splitext(a.out)[0] + ".filter.txt"
    os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
    with open(graph, "w", encoding="utf-8") as f:
        f.write("\n".join(parts))
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", a.input, "-/filter_complex", graph,
                    "-map", "[v]", "-map", "[a]", "-c:v", "libx264", "-crf", str(a.crf), "-preset", "medium",
                    "-pix_fmt", "yuv420p", "-r", f"{fps:g}", "-c:a", "aac", "-b:a", "192k", a.out], check=True)
    os.remove(graph)

    base = os.path.splitext(a.out)[0]
    with open(base + ".edl.json", "w", encoding="utf-8") as f:
        json.dump({"fps": fps, "src_duration": dur, "out_duration": round(t, 3), "keep": edl}, f, indent=1)
    if a.transcript:
        tr = json.load(open(a.transcript, encoding="utf-8"))
        segs = []
        for s in tr["segments"]:
            words = []
            for w in s["words"]:
                mid = (w["start"] + w["end"]) / 2
                if remap(mid, edl) is None:
                    continue
                ns = remap(w["start"], edl)
                ne = remap(w["end"], edl)
                nm = remap(mid, edl)
                words.append({**w, "start": ns if ns is not None else nm, "end": ne if ne is not None else nm})
            if words:
                segs.append({"start": words[0]["start"], "end": words[-1]["end"],
                             "text": " ".join(w["word"] for w in words), "words": words})
        with open(base + ".transcript.json", "w", encoding="utf-8") as f:
            json.dump({"lang": tr.get("lang"), "duration": round(t, 3), "segments": segs},
                      f, ensure_ascii=False, indent=1)
    print("->", a.out)


if __name__ == "__main__":
    main()
