import json, os, pathlib, shutil, subprocess, sys, time
from PIL import Image, ImageDraw

sys.stdout.reconfigure(encoding="utf-8")
sys.path.insert(0, r"d:\AI\full studio\edit\canvas-tools")
import cv

MEDIA = pathlib.Path(r"d:\AI\full studio\output\lt-plus-talking-head\media")
CHECK = pathlib.Path(r"d:\AI\full studio\output\lt-plus-talking-head\check")

st = cv.call("canvas_get_state", {})["result"]
nodes = {n["id"]: n for n in st["nodes"]}
conns = st["connections"]

TARGETS = {
    "LT-ic-hook1":  ("image", "OUT_LT_hook1",  "hook_01_clean.png"),
    "LT-ic-hook2":  ("image", "OUT_LT_hook2",  "hook_02_clean.png"),
    "LT-ic-clinic": ("image", "OUT_LT_clinic", "icon_clinic_clean.png"),
    "LT-ic-herbs":  ("image", "OUT_LT_herbs",  "icon_herbs_clean.png"),
    "LT-ic-ph":     ("image", "OUT_LT_ph",     "icon_ph_clean.png"),
    "LT-v-1a2":     ("video", "OUT_LT_v1a",    "broll_1a_calendar.mp4"),
    "LT-v-1b":      ("video", "OUT_LT_v1b",    "broll_1b_droplet.mp4"),
    "LT-v-2a":      ("video", "OUT_LT_v2a",    "broll_2a_consult.mp4"),
    "LT-v-2b":      ("video", "OUT_LT_v2b",    "broll_2b_barrier.mp4"),
    "LT-v-3a":      ("video", "OUT_LT_v3a",    "broll_3a_lab.mp4"),
    "LT-v-3b":      ("video", "OUT_LT_v3b",    "broll_3b_shield.mp4"),
    "LT-v-4a":      ("video", "OUT_LT_v4a",    "broll_4a_herbs.mp4"),
}

out_node_map = {}
ops = []
for cfg_prefix, (ntype, uniq_title, dst_file) in TARGETS.items():
    cfgs = [n for n in nodes.values() if n["type"] == "config" and (n.get("title") or "").startswith(cfg_prefix)]
    if not cfgs:
        print("WARN missing cfg:", cfg_prefix)
        continue
    cid = cfgs[-1]["id"]
    outs = [nodes[c["toNodeId"]] for c in conns if c["fromNodeId"] == cid and nodes[c["toNodeId"]]["type"] == ntype]
    ok_outs = [o for o in outs if o.get("metadata", {}).get("status") == "success"]
    if not ok_outs:
        print("WARN no success output for:", cfg_prefix)
        continue
    oid = ok_outs[-1]["id"]
    out_node_map[oid] = (ntype, uniq_title, dst_file)
    ops.append({"type": "update_node", "id": oid, "patch": {"title": uniq_title}})

if ops:
    cv.call("canvas_apply_ops", {"ops": ops})
    time.sleep(1.5)

ex_id = [n["id"] for n in st["nodes"] if n.get("type") == "export:folder"][0]
req_id = f"ltplus-uniq-{int(time.time()*1000)}"
cv.call("canvas_apply_ops", {
    "ops": [{"type": "update_node", "id": ex_id, "metadata": {"exportAll": True, "exportRequest": req_id}}]
})
time.sleep(8)

mf = json.loads(pathlib.Path(r"d:\AI\full studio\canvas\exports\manifest.json").read_text(encoding="utf-8"))
print("Manifest exportedAt:", mf.get("exportedAt"), "items:", len(mf.get("items", [])))
mf_by_node = {it["nodeId"]: it for it in mf.get("items", [])}

for oid, (ntype, uniq_title, dst_file) in out_node_map.items():
    if oid not in mf_by_node:
        print("MISSING in manifest:", uniq_title, oid)
        continue
    src_p = mf_by_node[oid]["path"]
    print(f"  Mapped {uniq_title} ({oid}) -> {os.path.basename(src_p)} ({mf_by_node[oid].get('bytes')} B)")
    if ntype == "image":
        im = Image.open(src_p).convert("RGBA")
        w, h = im.size
        mx, my = int(w * 0.05), int(h * 0.05)
        im = im.crop((mx, my, w - mx, h - my)).resize((600, 600), Image.Resampling.LANCZOS)
        im.save(MEDIA / dst_file)
    else:
        subprocess.run([
            "ffmpeg", "-y", "-v", "error", "-ss", "0.25", "-i", src_p,
            "-vf", "scale=1134:2016:flags=lanczos,crop=1080:1920,fps=30",
            "-an", "-c:v", "libx264", "-crf", "16", "-preset", "fast", "-pix_fmt", "yuv420p",
            str(MEDIA / dst_file)
        ], check=True)

# Build combined visual QC sheet of hook_01_clean.png + all 8 B-roll videos!
brolls = [
    "broll_1a_calendar.mp4", "broll_1b_droplet.mp4",
    "broll_2a_consult.mp4",  "broll_2b_barrier.mp4",
    "broll_3a_lab.mp4",      "broll_3b_shield.mp4",
    "broll_4a_herbs.mp4",    "broll_4b_ltplus.mp4",
]
grid = Image.new("RGB", (5 * 220, 2 * 390), (18, 18, 18))
dr = ImageDraw.Draw(grid)

# Slot 0: hook_01_clean.png
h1 = Image.open(MEDIA / "hook_01_clean.png").convert("RGB").resize((200, 200))
grid.paste(h1, (10, 40))
dr.text((10, 15), "hook_01_clean.png", fill=(255, 230, 80))

for idx, bname in enumerate(brolls):
    bp = MEDIA / bname
    if not bp.exists():
        continue
    tmp_f = CHECK / f"_bqc_{idx}.jpg"
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-ss", "2.0", "-i", str(bp), "-frames:v", "1", str(tmp_f)], check=True)
    bim = Image.open(tmp_f).convert("RGB").resize((200, 355))
    slot = idx + 1
    gx = (slot % 5) * 220 + 10
    gy = (slot // 5) * 390 + 30
    grid.paste(bim, (gx, gy))
    dr.text((gx, gy - 20), bname[:22], fill=(120, 255, 220))

grid.save(CHECK / "brolls_and_hook1_qc.jpg", quality=88)
print("Saved brolls_and_hook1_qc.jpg!")
