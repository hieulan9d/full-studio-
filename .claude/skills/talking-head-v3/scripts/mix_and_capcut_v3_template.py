import copy, json, os, re, shutil, subprocess, sys, time, uuid

sys.stdout.reconfigure(encoding="utf-8")

PROJ_DIR   = r"d:\AI\full studio\output\lt-plus-talking-head"
AROLL_DIR  = os.path.join(PROJ_DIR, "aroll")
MEDIA_DIR  = os.path.join(PROJ_DIR, "media")
CHECK_DIR  = os.path.join(PROJ_DIR, "check")
SFX_DIR    = r"D:\AI\full studio\BO_KIEN_THUC_TVC_AI_PORTABLE\03_TAI_NGUYEN_DUNG_CHUNG\audio_bgm_sfx"
DRAFTS_DIR = os.path.expandvars(r"%LOCALAPPDATA%\CapCut\User Data\Projects\com.lveditor.draft")
EXPORT_DIR = r"E:\XUAT-VIDEO"
GDRIVE_DIR = r"E:\LUU-VIDEO"

RAW_VID     = os.path.join(PROJ_DIR, "_v3_video_only.mp4")
MAIN_CUT    = os.path.join(AROLL_DIR, "main_cut.mp4")
VO_SFX_MP4  = os.path.join(PROJ_DIR, "_v3_vo_sfx_stem.mp4")
BGM_STEM    = os.path.join(PROJ_DIR, "_v3_bgm_balanced.mp3")
MIX_RAW     = os.path.join(PROJ_DIR, "_v3_mixed_pre_lufs.mp4")
FINAL_V3    = os.path.join(PROJ_DIR, "lt_plus_talking_head_v3_final.mp4")
GDRIVE_OUT  = os.path.join(GDRIVE_DIR, "LT_PLUS_TALKING_HEAD_FINAL.mp4")

def measure_lufs(path):
    p = subprocess.run(
        ["ffmpeg", "-hide_banner", "-i", path, "-af", "loudnorm=I=-14:TP=-1:LRA=11:print_format=json", "-f", "null", "-"],
        stderr=subprocess.PIPE, text=True, encoding="utf-8", errors="replace"
    )
    m = re.search(r"\{\s*\"input_i\".*?\}", p.stderr, re.S)
    return json.loads(m.group(0)) if m else None

def build_audio_mix():
    dur_j = json.loads(subprocess.check_output([
        "ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "json", RAW_VID
    ], text=True))
    vid_dur = float(dur_j["format"]["duration"])

    # 1. Build 2-Half C-Major BGM stem (0..38.2s Warm Fretless -> 1.6s smooth crossfade -> 38.2..70.37s Bright Riley when introducing LT PLUS!)
    # Both normalized to -17 LUFS first, sculpted with EQ Voice Pocket (-4.5 dB @ 1750 Hz) so voice stays crystal clear!
    bgm1 = os.path.join(SFX_DIR, "bgm_warm_fretless.mp3")
    bgm2 = os.path.join(SFX_DIR, "bgm_bright_riley.mp3")
    split_t = 38.20
    rem_t = max(2.0, vid_dur - split_t + 1.6)

    bgm_filter = (
        f"[0:a]atrim=0:{split_t + 0.8:.2f},asetpts=PTS-STARTPTS,loudnorm=I=-17:TP=-1.5:LRA=11,afade=t=in:st=0:d=1.0[b1];"
        f"[1:a]atrim=0:{rem_t:.2f},asetpts=PTS-STARTPTS,loudnorm=I=-17:TP=-1.5:LRA=11,afade=t=out:st={max(0.1, rem_t - 2.2):.2f}:d=2.2[b2];"
        f"[b1][b2]acrossfade=d=1.6:c1=tri:c2=tri,"
        f"atrim=0:{vid_dur:.2f},highpass=f=75,equalizer=f=1750:t=q:w=1.25:g=-4.5[bgm_clean]"
    )
    subprocess.run([
        "ffmpeg", "-y", "-v", "error",
        "-stream_loop", "-1", "-i", bgm1,
        "-stream_loop", "-1", "-i", bgm2,
        "-filter_complex", bgm_filter,
        "-map", "[bgm_clean]", "-ar", "48000", "-ac", "2", "-c:a", "libmp3lame", "-b:a", "192k",
        BGM_STEM
    ], check=True)

    # 2. Build clean Voiceover (2-pass normalized to -14.0 LUFS + gentle presence EQ) + 20 synced Studio SFX -> VO_SFX_MP4
    vo_stats = measure_lufs(MAIN_CUT)
    if vo_stats:
        vo_norm = (
            f"highpass=f=80,loudnorm=I=-14:TP=-1:LRA=11:"
            f"measured_I={vo_stats['input_i']}:measured_TP={vo_stats['input_tp']}:"
            f"measured_LRA={vo_stats['input_lra']}:measured_thresh={vo_stats['input_thresh']}:"
            f"offset={vo_stats['target_offset']}:linear=true"
        )
    else:
        vo_norm = "highpass=f=80,loudnorm=I=-14:TP=-1:LRA=11"

    sfx_cues = [
        ("sfx_whoosh_soft.mp3",        0.08, -12),
        ("sfx_pop_clean.mp3",          0.65,  -9),
        ("sfx_pop_clean.mp3",          0.83,  -9),
        ("sfx_pop_clean.mp3",          1.01,  -9),
        ("sfx_sparkle_shine.mp3",      4.86, -13),
        ("sfx_chime_warm.mp3",        10.54, -10),
        ("sfx_whoosh_transition.mp3", 13.36, -11),
        ("sfx_ping_glass.mp3",        17.90, -11),
        ("sfx_whoosh_transition.mp3", 22.48, -11),
        ("sfx_chime_warm.mp3",        27.96, -10),
        ("sfx_ping_glass.mp3",        31.34, -11),
        ("sfx_whoosh_transition.mp3", 33.88, -11),
        ("sfx_chime_warm.mp3",        37.66, -10),
        ("sfx_whoosh_soft.mp3",       41.52, -11),
        ("sfx_sparkle_shine.mp3",     43.74, -12),
        ("sfx_whoosh_transition.mp3", 47.35, -11),
        ("sfx_crystal_shimmer.mp3",   52.56, -11),
        ("sfx_ping_glass.mp3",        55.96, -11),
        ("sfx_crystal_shimmer.mp3",   64.28, -11),
        ("sfx_notification_cta.mp3",  64.45, -10),
    ]

    # Mix VO (-14 LUFS) + Sidechain-Ducked Balanced BGM (~ -29.5 LUFS under speech, blooming gently to -25 LUFS in pauses/tail!) + Studio SFX
    inputs = ["-i", RAW_VID, "-i", MAIN_CUT, "-i", BGM_STEM]
    flines = [
        f"[1:a]{vo_norm},asplit=2[vo_main][vo_sc]",
        # Base BGM at 0.28 (-11.0 dB from -17 LUFS => -28.0 LUFS), plus smooth sidechain ducking (~3.0 dB duck when Pharmacist speaks -> -31 LUFS under speech, -28 LUFS in pauses!)
        "[2:a]volume=0.28[bgm_pre]",
        "[bgm_pre][vo_sc]sidechaincompress=threshold=0.025:ratio=3.2:attack=35:release=380:makeup=1.0[bgm_ducked]"
    ]

    sfx_refs = []
    idx = 3
    for fname, t_sec, db in sfx_cues:
        fp = os.path.join(SFX_DIR, fname)
        if not os.path.exists(fp):
            continue
        inputs += ["-i", fp]
        ms = int(round(t_sec * 1000))
        lin = 10.0 ** (db / 20.0)
        lbl = f"s{idx}"
        flines.append(f"[{idx}:a]atrim=0:2.5,volume={lin:.4f},adelay={ms}|{ms}[{lbl}]")
        sfx_refs.append(f"[{lbl}]")
        idx += 1

    # Create VO+SFX stem & full VO+BGM+SFX master in a single clean pass
    flines.append("[vo_main]" + "".join(sfx_refs) + f"amix=inputs={1 + len(sfx_refs)}:duration=first:dropout_transition=0:normalize=0,asplit=2[vosfx_capcut][vosfx_mix]")
    flines.append("[vosfx_mix][bgm_ducked]amix=inputs=2:duration=first:dropout_transition=0:normalize=0[aout]")

    fgraph = os.path.join(PROJ_DIR, "_v3_audio_filter.txt")
    with open(fgraph, "w", encoding="utf-8") as f:
        f.write(";\n".join(flines))

    # Save BOTH VO+SFX stem video AND pre-loudnorm full mix in one single ffmpeg invocation!
    subprocess.run([
        "ffmpeg", "-y", "-v", "error", *inputs,
        "-/filter_complex", fgraph,
        "-map", "0:v", "-map", "[vosfx_capcut]", "-c:v", "copy", "-ar", "48000", "-ac", "2", "-c:a", "aac", "-b:a", "256k", VO_SFX_MP4,
        "-map", "0:v", "-map", "[aout]",         "-c:v", "copy", "-ar", "48000", "-ac", "2", "-c:a", "aac", "-b:a", "256k", MIX_RAW
    ], check=True)

    # 3. 2-Pass EBU R128 Loudnorm to exact -14.0 LUFS
    stats = measure_lufs(MIX_RAW)
    if stats:
        af_str = (
            f"loudnorm=I=-14:TP=-1:LRA=11:"
            f"measured_I={stats['input_i']}:measured_TP={stats['input_tp']}:"
            f"measured_LRA={stats['input_lra']}:measured_thresh={stats['input_thresh']}:"
            f"offset={stats['target_offset']}:linear=true"
        )
        print("2-pass loudnorm measured_I:", stats["input_i"], "-> normalizing to -14.0 LUFS")
    else:
        af_str = "loudnorm=I=-14:TP=-1:LRA=11"

    subprocess.run([
        "ffmpeg", "-y", "-v", "error", "-i", MIX_RAW,
        "-c:v", "copy", "-af", af_str, "-ar", "48000", "-ac", "2", "-c:a", "aac", "-b:a", "224k",
        FINAL_V3
    ], check=True)
    print("Saved FINAL LT PLUS V3:", FINAL_V3)

    # Copy to E:\XUAT-VIDEO and E:\LUU-VIDEO!
    if os.path.isdir(EXPORT_DIR):
        exp_copy = os.path.join(EXPORT_DIR, "LT_PLUS_TALKING_HEAD_FINAL.mp4")
        shutil.copy2(FINAL_V3, exp_copy)
        print("Copied to E:\\XUAT-VIDEO:", exp_copy)

    os.makedirs(GDRIVE_DIR, exist_ok=True)
    shutil.copy2(FINAL_V3, GDRIVE_OUT)
    print("Exported FINAL to Google Drive:", GDRIVE_OUT, f"({os.path.getsize(GDRIVE_OUT):,} bytes)")

    final_stats = measure_lufs(GDRIVE_OUT)
    print("Verified Google Drive Final LUFS:", final_stats)
    return vid_dur

def build_capcut_v3_draft(vid_dur):
    """Build CapCut Draft with Track 0 = 12-scene VO+SFX video + Track 1 = Separate Balanced BGM Track (vol=0.28) per CapCut Pro Editor DNA!"""
    tpl_dir = os.path.join(DRAFTS_DIR, "LT PLUS HẰNG THU - Video Mẫu")
    out_name = "LT_PLUS_HangThu_TalkingHead_Final"
    out_dir = os.path.join(DRAFTS_DIR, out_name)
    if os.path.exists(out_dir):
        shutil.rmtree(out_dir)

    T = json.load(open(os.path.join(tpl_dir, "draft_content.json"), encoding="utf-8"))
    TM = json.load(open(os.path.join(tpl_dir, "draft_meta_info.json"), encoding="utf-8"))
    def uid(): return str(uuid.uuid4()).upper()
    def us(sec): return int(round(sec * 30.0) / 30.0 * 1_000_000)

    vseg_tpl = next(s for tr in T["tracks"] if tr["type"] == "video" for s in tr["segments"])
    extra_keys = ("speeds", "placeholder_infos", "canvases", "sound_channel_mappings", "material_colors", "vocal_separations")
    tmat_tpl = {k: next(x for x in T["materials"][k] if x["id"] in vseg_tpl["extra_material_refs"]) for k in extra_keys}
    vmat_tpl = next(x for x in T["materials"]["videos"] if x["id"] == vseg_tpl["material_id"])
    vtrack_tpl = next(tr for tr in T["tracks"] if tr["type"] == "video")

    # Template audio segment & material from template draft
    atrack_tpl = next(tr for tr in T["tracks"] if tr["type"] == "audio")
    aseg_tpl = atrack_tpl["segments"][0]
    amat_tpl = next(x for x in T["materials"]["audios"] if x["id"] == aseg_tpl["material_id"])
    aextra_keys = ("speeds", "sound_channel_mappings", "vocal_separations")
    amat_extra_tpl = {k: next(x for x in T["materials"][k] if x["id"] in aseg_tpl["extra_material_refs"]) for k in aextra_keys if any(x["id"] in aseg_tpl["extra_material_refs"] for x in T["materials"][k])}

    D = copy.deepcopy(T)
    draft_id = uid()
    total_us = us(vid_dur)
    D.update({
        "id": draft_id, "name": out_name, "fps": 30.0, "duration": total_us,
        "tracks": [], "materials": {k: [] for k in T["materials"]},
        "canvas_config": {"ratio": "9:16", "width": 1080, "height": 1920, "background": None}
    })

    # Video material (VO + SFX stem so BGM track in CapCut doesn't double up!)
    norm_p = VO_SFX_MP4.replace("\\", "/")
    vm = copy.deepcopy(vmat_tpl)
    mid = uid()
    vm.update({
        "id": mid, "type": "video", "path": norm_p, "material_name": "_v3_vo_sfx_stem.mp4",
        "width": 1080, "height": 1920, "duration": total_us, "has_audio": True
    })
    D["materials"]["videos"].append(vm)

    scene_cuts = [
        (0.00,  4.58),
        (4.58, 10.54),
        (10.54,13.36),
        (13.36,17.85),
        (17.85,22.48),
        (22.48,27.90),
        (27.90,33.88),
        (33.88,37.62),
        (37.62,47.35),
        (47.35,52.52),
        (52.52,60.52),
        (60.52,vid_dur)
    ]
    tr0 = copy.deepcopy(vtrack_tpl); tr0["id"] = uid(); tr0["segments"] = []
    for s0, s1 in scene_cuts:
        dur_u = us(s1 - s0)
        seg = copy.deepcopy(vseg_tpl)
        refs = []
        for k in extra_keys:
            em = copy.deepcopy(tmat_tpl[k]); em["id"] = uid()
            if k == "speeds": em["speed"] = 1.0
            D["materials"][k].append(em); refs.append(em["id"])
        fid = uid()
        D["materials"]["audio_fades"].append({
            "id": fid, "type": "audio_fade", "fade_type": 0,
            "fade_in_duration": 16666, "fade_out_duration": 16666
        })
        refs.append(fid)
        seg.update({
            "id": uid(), "material_id": mid,
            "source_timerange": {"start": us(s0), "duration": dur_u},
            "target_timerange": {"start": us(s0), "duration": dur_u},
            "speed": 1.0, "volume": 1.12, "last_nonzero_volume": 1.12,
            "extra_material_refs": refs, "common_keyframes": [], "keyframe_refs": [], "render_index": 0
        })
        tr0["segments"].append(seg)
    D["tracks"].append(tr0)

    # Separate BGM Audio Track (volume = 0.28 per CapCut Pro Editor DNA!)
    am = copy.deepcopy(amat_tpl)
    amid = uid()
    am.update({
        "id": amid, "type": "extract_music", "path": BGM_STEM.replace("\\", "/"),
        "name": "BGM_LT_Plus_Balanced.mp3", "duration": total_us
    })
    D["materials"]["audios"].append(am)

    atr = copy.deepcopy(atrack_tpl); atr["id"] = uid(); atr["segments"] = []
    aseg = copy.deepcopy(aseg_tpl)
    arefs = []
    for k, etpl in amat_extra_tpl.items():
        em = copy.deepcopy(etpl); em["id"] = uid()
        if k == "speeds": em["speed"] = 1.0
        D["materials"][k].append(em); arefs.append(em["id"])
    afid = uid()
    D["materials"]["audio_fades"].append({
        "id": afid, "type": "audio_fade", "fade_type": 0,
        "fade_in_duration": 1000000, "fade_out_duration": 2000000
    })
    arefs.append(afid)
    aseg.update({
        "id": uid(), "material_id": amid,
        "source_timerange": {"start": 0, "duration": total_us},
        "target_timerange": {"start": 0, "duration": total_us},
        "speed": 1.0, "volume": 0.28, "last_nonzero_volume": 0.28,
        "extra_material_refs": arefs, "common_keyframes": [], "keyframe_refs": []
    })
    atr["segments"].append(aseg)
    D["tracks"].append(atr)

    os.makedirs(out_dir, exist_ok=True)
    for aux in ["draft_settings", "draft_agency_config.json", "draft_biz_config.json", "draft_virtual_store.json", "key_value.json", "performance_opt_info.json", "timeline_layout.json"]:
        sp = os.path.join(tpl_dir, aux)
        if os.path.isfile(sp):
            shutil.copy2(sp, os.path.join(out_dir, aux))

    subprocess.run(["ffmpeg", "-y", "-v", "error", "-ss", "1.5", "-i", FINAL_V3, "-frames:v", "1", os.path.join(out_dir, "draft_cover.jpg")], check=True)
    with open(os.path.join(out_dir, "draft_content.json"), "w", encoding="utf-8") as f:
        json.dump(D, f, ensure_ascii=False)

    tl_root = os.path.join(out_dir, "Timelines")
    tl_id = uid()
    tl_sub = os.path.join(tl_root, tl_id)
    os.makedirs(tl_sub, exist_ok=True)
    shutil.copy2(os.path.join(out_dir, "draft_content.json"), os.path.join(tl_sub, "draft_content.json"))
    shutil.copy2(os.path.join(out_dir, "draft_cover.jpg"), os.path.join(tl_sub, "draft_cover.jpg"))

    tp_src = os.path.join(tpl_dir, "Timelines", "project.json")
    if os.path.isfile(tp_src):
        tp = json.load(open(tp_src, encoding="utf-8"))
        now_us = int(time.time() * 1_000_000)
        tp["id"] = uid(); tp["create_time"] = now_us; tp["update_time"] = now_us; tp["main_timeline_id"] = tl_id
        if tp.get("timelines"):
            tp["timelines"] = [tp["timelines"][0]]
            tp["timelines"][0]["id"] = tl_id
            tp["timelines"][0]["create_time"] = now_us; tp["timelines"][0]["update_time"] = now_us
        with open(os.path.join(tl_root, "project.json"), "w", encoding="utf-8") as f:
            json.dump(tp, f, ensure_ascii=False)

    now_us = int(time.time() * 1_000_000)
    M = copy.deepcopy(TM)
    M.update({
        "draft_id": draft_id, "draft_name": out_name,
        "draft_fold_path": out_dir.replace("\\", "/"),
        "draft_root_path": DRAFTS_DIR.replace("\\", "/"),
        "draft_cover": "draft_cover.jpg", "tm_duration": total_us,
        "tm_draft_create": now_us, "tm_draft_modified": now_us, "draft_timeline_materials_size_": 0
    })
    with open(os.path.join(out_dir, "draft_meta_info.json"), "w", encoding="utf-8") as f:
        json.dump(M, f, ensure_ascii=False)
    print("Updated CapCut Draft with separate BGM track:", out_dir)

if __name__ == "__main__":
    vd = build_audio_mix()
    build_capcut_v3_draft(vd)
