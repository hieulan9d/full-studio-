import argparse
import json
import os
import shutil
import statistics
import uuid
from datetime import datetime

CAPCUT_DRAFTS_DIR = os.path.expandvars(r"%LOCALAPPDATA%\CapCut\User Data\Projects\com.lveditor.draft")

def new_id():
    return str(uuid.uuid4()).upper()

def load_project(proj_name):
    proj_dir = os.path.join(CAPCUT_DRAFTS_DIR, proj_name)
    dc_path = os.path.join(proj_dir, "draft_content.json")
    if not os.path.exists(dc_path):
        raise FileNotFoundError(f"Không tìm thấy draft_content.json tại: {dc_path}")
    with open(dc_path, "r", encoding="utf-8") as f:
        return json.load(f), dc_path

def audit_project(proj_name):
    data, dc_path = load_project(proj_name)
    tracks = data.get("tracks", [])
    mats = data.get("materials", {})
    mat_audios = {m["id"]: m for m in mats.get("audios", [])}
    mat_fades = {m["id"]: m for m in mats.get("audio_fades", [])}
    mat_anims = {m["id"]: m for m in mats.get("material_animations", [])}

    print(f"=== BÁO CÁO AUDIT & ĐỀ XUẤT NÂNG CẤP: {proj_name} ===")
    print(f"Tổng thời lượng: {data.get('duration', 0)/1e6:.2f}s | FPS: {data.get('fps')}")

    # 1. Check static long shots on Track 0 (> 2.3s without keyframes or B-roll cover)
    v_tracks = [t for t in tracks if t.get("type") == "video"]
    static_long_shots = []
    monotone_runs = []
    if v_tracks:
        main_segs = v_tracks[0].get("segments", [])
        prev_durs = []
        for idx, s in enumerate(main_segs):
            st = s["target_timerange"]["start"] / 1e6
            dur = s["target_timerange"]["duration"] / 1e6
            kfs = s.get("common_keyframes", [])
            sc = s.get("clip", {}).get("scale", {}).get("x", 1.0)
            if dur >= 2.3 and not kfs and abs(sc - 1.0) < 0.01:
                static_long_shots.append((idx, st, dur))
            prev_durs.append((idx, st, dur))
            if len(prev_durs) >= 4:
                window = [x[2] for x in prev_durs[-4:]]
                if max(window) - min(window) < 0.25:
                    monotone_runs.append((prev_durs[-4][1], prev_durs[-1][1] + prev_durs[-1][2], statistics.mean(window)))

    # 2. Check chopped voiceover segments missing micro-fades
    vo_missing_fade = 0
    vo_total_short = 0
    for t in tracks:
        if t.get("type") == "audio":
            for s in t.get("segments", []):
                dur = s["target_timerange"]["duration"] / 1e6
                if 0.3 <= dur <= 12.0:
                    vo_total_short += 1
                    refs = s.get("extra_material_refs", [])
                    has_fade = any(r in mat_fades for r in refs)
                    if not has_fade:
                        vo_missing_fade += 1

    # 3. Check text segments missing smooth in/out animations
    text_missing_anim = 0
    text_total = 0
    for t in tracks:
        if t.get("type") == "text":
            for s in t.get("segments", []):
                text_total += 1
                refs = s.get("extra_material_refs", [])
                has_anim = any(r in mat_anims and mat_anims[r].get("animations") for r in refs)
                if not has_anim:
                    text_missing_anim += 1

    print(f"\n[1] Khung hình & Nhịp cắt (Visual & Wave Pacing):")
    print(f"  - Số shot trên Track 0 dài >= 2.3s đang đứng tĩnh (chưa có Micro-Zoom/Keyframe): {len(static_long_shots)} shots")
    if static_long_shots[:5]:
        print("    Ví dụ:", ", ".join([f"{st:.1f}s ({dur:.1f}s)" for _, st, dur in static_long_shots[:5]]))
    print(f"  - Số cụm >= 4 shots liên tiếp bị đều nhịp (chênh lệch < 0.25s): {len(monotone_runs)} cụm")

    print(f"\n[2] Âm thanh & Voiceover (Audio & Micro-Fade):")
    print(f"  - Số đoạn Audio/Voiceover cắt ngắn chưa gắn Micro-Fade (dễ bị click/pop ở vết cắt): {vo_missing_fade}/{vo_total_short} đoạn")

    print(f"\n[3] Typography & Phụ đề (Text Animation):")
    print(f"  - Số đoạn Text chưa gắn hiệu ứng vào/ra mượt: {text_missing_anim}/{text_total} đoạn")

def upgrade_project(proj_name, micro_fade=False, micro_zoom=False, text_fade=False):
    data, dc_path = load_project(proj_name)
    bak_path = f"{dc_path}.bak_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    shutil.copy2(dc_path, bak_path)
    print(f"Đã tạo bản sao lưu an toàn: {bak_path}")

    tracks = data.get("tracks", [])
    mats = data.get("materials", {})
    mat_fades = {m["id"]: m for m in mats.get("audio_fades", [])}
    mat_anims = {m["id"]: m for m in mats.get("material_animations", [])}

    fade_added = 0
    zoom_added = 0
    text_anim_added = 0

    if micro_fade:
        for t in tracks:
            if t.get("type") == "audio":
                for s in t.get("segments", []):
                    dur_us = s["target_timerange"]["duration"]
                    if 300000 <= dur_us <= 15000000:
                        refs = s.setdefault("extra_material_refs", [])
                        if not any(r in mat_fades for r in refs):
                            fid = new_id()
                            fade_obj = {
                                "id": fid,
                                "type": "audio_fade",
                                "fade_type": 0,
                                "fade_in_duration": 33333,
                                "fade_out_duration": 66666
                            }
                            mats.setdefault("audio_fades", []).append(fade_obj)
                            mat_fades[fid] = fade_obj
                            refs.append(fid)
                            fade_added += 1

    if micro_zoom:
        v_tracks = [t for t in tracks if t.get("type") == "video"]
        if v_tracks:
            toggle = False
            for s in v_tracks[0].get("segments", []):
                dur_us = s["target_timerange"]["duration"]
                kfs = s.setdefault("common_keyframes", [])
                sc = s.get("clip", {}).get("scale", {}).get("x", 1.0)
                if dur_us >= 2300000 and not kfs and abs(sc - 1.0) < 0.01:
                    start_val, end_val = (1.0, 1.06) if not toggle else (1.06, 1.0)
                    toggle = not toggle
                    for prop in ["KFTypeScaleX", "KFTypeScaleY"]:
                        kfs.append({
                            "id": new_id(),
                            "material_id": "",
                            "property_type": prop,
                            "keyframe_list": [
                                {
                                    "id": new_id(),
                                    "curveType": "Line",
                                    "time_offset": 0,
                                    "left_control": {"x": 0.0, "y": 0.0},
                                    "right_control": {"x": 0.0, "y": 0.0},
                                    "values": [start_val],
                                    "string_value": "",
                                    "graphID": ""
                                },
                                {
                                    "id": new_id(),
                                    "curveType": "Line",
                                    "time_offset": dur_us,
                                    "left_control": {"x": 0.0, "y": 0.0},
                                    "right_control": {"x": 0.0, "y": 0.0},
                                    "values": [end_val],
                                    "string_value": "",
                                    "graphID": ""
                                }
                            ]
                        })
                    zoom_added += 1

    if text_fade:
        for t in tracks:
            if t.get("type") == "text":
                for s in t.get("segments", []):
                    refs = s.setdefault("extra_material_refs", [])
                    anim_ref = next((r for r in refs if r in mat_anims), None)
                    if anim_ref and not mat_anims[anim_ref].get("animations"):
                        mat_anims[anim_ref]["animations"] = [
                            {
                                "id": "6923135604519604737",
                                "resource_id": "6923135604519604737",
                                "type": "in",
                                "name": "Mờ",
                                "category_id": "text",
                                "category_name": "text",
                                "duration": 500000,
                                "start": 0,
                                "path": "C:/Users/Hang thu/AppData/Local/CapCut/User Data/Cache/effect/6923135604519604737/a5f4d3998c0648ec65c03251506bd0a0",
                                "platform": "all",
                                "material_type": "sticker"
                            },
                            {
                                "id": "6798320902548230669",
                                "resource_id": "6798320902548230669",
                                "type": "out",
                                "name": "Mờ dần",
                                "category_id": "out",
                                "category_name": "out",
                                "duration": 400000,
                                "start": max(0, s["target_timerange"]["duration"] - 400000),
                                "path": "C:/Users/Hang thu/AppData/Local/CapCut/User Data/Cache/effect/6798320902548230669/c6f05ce62355b537be762550040bfc08",
                                "platform": "all",
                                "material_type": "sticker"
                            }
                        ]
                        text_anim_added += 1

    with open(dc_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False)

    print(f"Hoàn tất nâng cấp {proj_name}:")
    print(f"  + Đã thêm Micro-Fade (chống click/pop) cho {fade_added} đoạn Audio/Voiceover")
    print(f"  + Đã thêm Micro-Zoom (Ken Burns 1.00<->1.06) cho {zoom_added} shot dài tĩnh")
    print(f"  + Đã thêm hiệu ứng Mờ Vào/Ra cho {text_anim_added} đoạn Text")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="CapCut Pro Editor Engine")
    sub = parser.add_subparsers(dest="cmd", required=True)
    p_audit = sub.add_parser("audit")
    p_audit.add_argument("project", help="Tên thư mục dự án CapCut")

    p_up = sub.add_parser("upgrade")
    p_up.add_argument("project", help="Tên thư mục dự án CapCut")
    p_up.add_argument("--micro-fade", action="store_true")
    p_up.add_argument("--micro-zoom", action="store_true")
    p_up.add_argument("--text-fade", action="store_true")

    args = parser.parse_args()
    if args.cmd == "audit":
        audit_project(args.project)
    elif args.cmd == "upgrade":
        upgrade_project(args.project, args.micro_fade, args.micro_zoom, args.text_fade)
