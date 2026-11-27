import copy, json, math, os, pathlib, re, shutil, subprocess, sys, time, uuid, wave
import numpy as np

sys.stdout.reconfigure(encoding="utf-8")

PROJ_DIR   = r"d:\AI\full studio\output\lt-plus-talking-head"
AROLL_DIR  = os.path.join(PROJ_DIR, "aroll")
MEDIA_DIR  = os.path.join(PROJ_DIR, "media")
CHECK_DIR  = os.path.join(PROJ_DIR, "check")
STEMS_DIR  = os.path.join(PROJ_DIR, "audio_stems_v4")
os.makedirs(STEMS_DIR, exist_ok=True)

TLH_SFX_ROOT = pathlib.Path(r"Z:\Máy tính khác\My Computer\Document HT Media\TLH\Edit\02_Hiệu Ứng Âm Thanh (SFX)")
DRAFTS_DIR   = os.path.expandvars(r"%LOCALAPPDATA%\CapCut\User Data\Projects\com.lveditor.draft")
EXPORT_DIR   = r"E:\XUAT-VIDEO"
MASTER_FINAL_DIR = r"E:\LUU-VIDEO\04_Videos_Final"
GDRIVE_ROOT_OUT  = r"E:\LUU-VIDEO\LT_PLUS_TALKING_HEAD_FINAL.mp4"

RAW_VID   = os.path.join(PROJ_DIR, "_v3_video_only.mp4")
MAIN_CUT  = os.path.join(AROLL_DIR, "main_cut.mp4")
FINAL_MP4 = os.path.join(PROJ_DIR, "lt_plus_talking_head_v4_final.mp4")
MASTER_OUT = os.path.join(MASTER_FINAL_DIR, "LT_PLUS_TALKING_HEAD_FINAL.mp4")

SR = 48000

def find_tlh_sfx(fname: str) -> str:
    """Resolve SFX inside TLH\\Edit\\02_Hiệu Ứng Âm Thanh (SFX) across root or categorized subfolders."""
    direct = TLH_SFX_ROOT / fname
    if direct.exists():
        return str(direct)
    hits = list(TLH_SFX_ROOT.rglob(fname))
    if hits:
        return str(hits[0])
    raise FileNotFoundError(f"Could not find TLH SFX: {fname}")

# Curated Studio/TVC SFX Bank from Z:\Máy tính khác\My Computer\Document HT Media\TLH\Edit\02_Hiệu Ứng Âm Thanh (SFX)
# Exact active trim windows measured at 48kHz to eliminate all leading/trailing dead air!
TLH_SFX_SPECS = {
    "wosh_vshort": ("Whoosh - Hiện chữ siêu ngắn gọn (Chuẩn TVC PIP).mp3", 0.055, 0.165, None),
    "wosh_tvc":    ("Whoosh - Hiện chữ mượt tiêu chuẩn TVC.mp3",           0.075, 0.510, None),
    "wosh_day":    ("Whoosh - Gió lướt chữ dày trầm.mp3",                  0.200, 0.780, None),
    "swoosh_nhe":  ("Whoosh - Gió lướt chữ nhẹ (Swoosh 02).mp3",           0.115, 0.360, None),
    "magic_rev":   ("Mở cảnh - Âm thanh tỏa sáng sang trọng (Magic Reveal).mp3", 0.140, 1.750, None),
    "sao_lunglinh":("Mở cảnh - Tiếng chuông sao lung linh.mp3",            0.085, 1.550, None),
    "pop_tvc1":    ("Pop - Hiện chữ nảy tròn chuẩn TVC 01.mp3",            0.000, 0.195, None),
    "pop_nhe2":    ("Pop - Hiện chữ nảy nhẹ gọn 02.mp3",                   0.035, 0.235, None),
    "riser_metal": ("Riser - Lướt kim loại chuyển phân đoạn TVC (Metallic Riser).mp3", 1.650, 3.050, None),
    "riser_clean": ("Riser - Âm thanh dồn lên chuyển cảnh 01.mp3",         1.700, 3.100, None),
    "warm_hit":    ("Impact - Tiếng nổ trầm căng thẳng (LTK).mp3",         0.170, 1.550, "lowpass=f=1850"),
    "shutter1":    ("Chụp ảnh - Tiếng màn trập máy ảnh 01.mp3",            0.530, 1.450, None),
    "shutter3":    ("Chụp ảnh - Tiếng chụp màn hình gọn 03.mp3",           0.210, 0.690, None),
    "slide_up":    ("Slide - Tiếng trượt chữ bay lên.mp3",                 0.090, 0.750, "highpass=f=180"),
    "slide_ngang": ("Slide - Tiếng trượt chữ ngang mượt.mp3",              0.110, 0.770, None),
    "ting_nhanh":  ("Ting - Chuông Ting nhanh gọn.mp3",                    0.010, 0.850, None),
    "ding_trong":  ("Ding - Tiếng chuông ngân trong trẻo.mp3",             0.130, 1.050, None),
    "correct_ding":("Chính xác - Chuông trả lời đúng (Correct).mp3",       0.050, 0.850, None),
    "noitifi":     ("Thông báo - Chuông hiện chữ tinh tế (Notification).mp3", 0.115, 0.350, None),
    "water_drip":  ("Đời thường - Giọt nước rơi (Water Drip).mp3",         0.070, 0.330, None),
    "ui_plip":     ("UI - Tiếng chạm màn hình cảm ứng Plip Plip.mp3",      0.330, 0.440, "highpass=f=480"),
    "click_net":   ("Click - Tiếng bấm chuột máy tính rõ nét.mp3",         1.015, 1.135, "highpass=f=520"),
}

def decode_stereo_f32(path, dur_limit=None, af=None):
    cmd = ["ffmpeg", "-v", "error", "-i", path]
    if dur_limit:
        cmd += ["-t", f"{dur_limit:.3f}"]
    if af:
        cmd += ["-af", af]
    cmd += ["-ac", "2", "-ar", str(SR), "-f", "f32le", "-"]
    raw = subprocess.check_output(cmd)
    return np.frombuffer(raw, dtype=np.float32).reshape((-1, 2)).copy()

def save_wav_16(path, stereo_arr):
    clipped = np.clip(stereo_arr, -0.99, 0.99)
    pcm16 = (clipped * 32767.0).astype(np.int16)
    with wave.open(path, "wb") as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(SR)
        wf.writeframes(pcm16.tobytes())

def load_tlh_sfx_bank():
    bank = {}
    for key, (fname, t0, t1, extra_af) in TLH_SFX_SPECS.items():
        path = find_tlh_sfx(fname)
        af_parts = [f"atrim={t0:.3f}:{t1:.3f}", "asetpts=PTS-STARTPTS"]
        if extra_af:
            af_parts.append(extra_af)
        arr = decode_stereo_f32(path, af=",".join(af_parts))
        if len(arr) < 64:
            continue
        # Smooth anti-click micro-fades (6ms in, 30ms out)
        n_in = min(len(arr) // 4, int(0.006 * SR))
        n_out = min(len(arr) // 3, int(0.030 * SR))
        if n_in > 2:
            arr[:n_in] *= np.linspace(0.0, 1.0, n_in, dtype=np.float32)[:, None]
        if n_out > 2:
            arr[-n_out:] *= np.linspace(1.0, 0.0, n_out, dtype=np.float32)[:, None]
        pk = float(np.max(np.abs(arr)))
        if pk > 1e-5:
            arr /= pk
        pk_idx = int(np.argmax(np.max(np.abs(arr), axis=1)))
        bank[key] = (arr, pk_idx)
    print(f"Loaded & peak-normalized {len(bank)} curated SFX from TLH\\Edit!")
    return bank

def stamp_sfx(bus, bank, key, target_sec, db, pan=0.0, align_peak=True):
    if key not in bank:
        return
    clip, pk_idx = bank[key]
    gain = 10.0 ** (db / 20.0)
    angle = (max(-1.0, min(1.0, pan)) + 1.0) * (math.pi / 4.0)
    g_l = gain * math.cos(angle) * 1.4142
    g_r = gain * math.sin(angle) * 1.4142

    start_idx = int(round(target_sec * SR)) - (pk_idx if align_peak else 0)
    end_idx = start_idx + len(clip)
    b_s = max(0, start_idx)
    b_e = min(len(bus), end_idx)
    if b_e <= b_s:
        return
    c_s = b_s - start_idx
    c_e = c_s + (b_e - b_s)
    seg = clip[c_s:c_e]
    bus[b_s:b_e, 0] += seg[:, 0] * g_l
    bus[b_s:b_e, 1] += seg[:, 1] * g_r

def build_master_sound_and_video():
    sys.path.insert(0, PROJ_DIR)
    from render_ltplus_v3 import load_timeline_ltplus

    dur_j = json.loads(subprocess.check_output([
        "ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "json", RAW_VID
    ], text=True))
    vid_dur = float(dur_j["format"]["duration"])
    N = int(round(vid_dur * SR))

    # 1. Studio-Polish Pharmacist Voiceover (-14 LUFS clean warm vocal presence)
    vo_af = "highpass=f=80,equalizer=f=3300:t=q:w=1.2:g=1.6,loudnorm=I=-14:TP=-1.2:LRA=9"
    vo = decode_stereo_f32(MAIN_CUT, dur_limit=vid_dur, af=vo_af)
    if len(vo) < N:
        vo = np.vstack([vo, np.zeros((N - len(vo), 2), dtype=np.float32)])
    else:
        vo = vo[:N]

    # 2. Upgraded Modern Wellness 2-Stage BGM (100% Pure Instrumental, Zero Vocals!):
    #    - Stage 1 (0.00 - 37.66s, Empathy & Medical Caution): Coconut Groove Lounge TVC (calm silky intro -> gentle lounge groove)
    #    - Stage 2 (37.66 - 70.37s, LT PLUS Solution & 6 Herbs & CTA): Fresh Wellness Bling TVC (uplifting bright modern confidence)
    bgm_eq = "highpass=f=90,equalizer=f=2150:t=q:w=1.25:g=-4.5,lowpass=f=13000,loudnorm=I=-14:TP=-1.5:LRA=9"
    bgm1_src = r"C:\Users\Hang thu\AppData\Local\CapCut\User Data\Cache\music\952029a0925ce93fb34accba75ebbfb3.mp3"
    bgm2_src = r"C:\Users\Hang thu\AppData\Local\CapCut\User Data\Cache\music\358f869c8ad98d0d8cf11c7ed1ab277d.mp3"
    if not os.path.exists(bgm1_src):
        bgm1_src = r"d:\antigraviti\lt_plus_hang_thu\07_HyperFrames_Project\assets\audio\bgm_coconut_groove.mp3"
    if not os.path.exists(bgm2_src):
        bgm2_src = r"d:\antigraviti\lt_plus_hang_thu\07_HyperFrames_Project\assets\audio\bgm_fresh_bling.mp3"

    # Also archive both upgraded BGMs into Master Cloud Storage on Google Drive!
    drive_bgm_dir = r"Z:\Drive của tôi\AI_Full_Studio\02_Kien_Thuc_Va_Quy_Chuan\BO_KIEN_THUC_TVC_AI_PORTABLE\03_TAI_NGUYEN_DUNG_CHUNG\audio_bgm_sfx"
    if os.path.isdir(drive_bgm_dir):
        shutil.copy2(bgm1_src, os.path.join(drive_bgm_dir, "bgm_coconut_groove_tvc.mp3"))
        shutil.copy2(bgm2_src, os.path.join(drive_bgm_dir, "bgm_fresh_wellness_tvc.mp3"))

    b1_raw = decode_stereo_f32(bgm1_src, af=bgm_eq)
    b2_raw = decode_stereo_f32(bgm2_src, af="atrim=10.0:95.0,asetpts=PTS-STARTPTS," + bgm_eq)

    b1 = np.tile(b1_raw, ((N // len(b1_raw)) + 2, 1))[:N]
    b2 = np.tile(b2_raw, ((N // len(b2_raw)) + 2, 1))[:N]

    t_axis = np.arange(N, dtype=np.float32) / SR
    # Smooth 2.2s musical crossfade right at 37.66s ("GIẢI PHÁP 3: Nếu đang tìm hiểu một loại viên đặt...")
    xfade = np.clip((t_axis - 36.56) / 2.2, 0.0, 1.0)
    xfade = xfade * xfade * (3.0 - 2.0 * xfade)
    bgm = b1 * (1.0 - xfade[:, None]) + b2 * xfade[:, None]

    broll_spans, cap_groups, GOLD_WORDS, PINK_WORDS, STROKE_UP_WORDS = load_timeline_ltplus()

    # Lookahead Speech-Envelope Dynamic Ducking (200ms lookahead, 280ms hold, 380ms Hanning smooth)
    hop = 480  # 10ms
    n_hops = (N + hop - 1) // hop
    vo_pad = np.vstack([vo, np.zeros((n_hops * hop - N, 2), dtype=np.float32)])
    vo_rms = np.sqrt(np.mean(vo_pad.reshape((n_hops, hop, 2)) ** 2, axis=(1, 2)))
    speaking = (vo_rms > 0.022).astype(np.float32)

    sp_dilated = np.zeros_like(speaking)
    for idx_h in range(n_hops):
        if speaking[idx_h] > 0.5:
            sp_dilated[max(0, idx_h - 20):min(n_hops, idx_h + 28)] = 1.0

    win_sm = np.hanning(39).astype(np.float32)
    win_sm /= np.sum(win_sm)
    sp_smooth = np.convolve(np.pad(sp_dilated, (19, 19), mode="edge"), win_sm, mode="valid")[:n_hops]

    # Speech active: 0.255 (-11.9 dB below VO = warm, rhythmic, crystal-clear speech); Pauses/Outro: swells to 0.43 (-7.3 dB)
    gain_hop = 0.43 * (1.0 - sp_smooth) + 0.255 * sp_smooth
    bgm_env = np.interp(np.arange(N, dtype=np.float32), np.arange(n_hops, dtype=np.float32) * hop, gain_hop).astype(np.float32)

    for st, en, _, _, _, _ in broll_spans:
        w_br = np.clip(np.minimum((t_axis - st) / 0.45, (en - t_axis) / 0.45), 0.0, 1.0)
        bgm_env *= (1.0 + 0.16 * w_br)

    bgm_env *= np.clip(t_axis / 0.8, 0.0, 1.0) * np.clip((vid_dur - t_axis) / 1.8, 0.0, 1.0)
    bgm *= bgm_env[:, None]

    # 3. Build 2 Sample-Accurate Stereo SFX Stems Using TLH\Edit SFX Pack!
    bank = load_tlh_sfx_bank()
    sfx_trans = np.zeros((N, 2), dtype=np.float32)
    sfx_ui    = np.zeros((N, 2), dtype=np.float32)
    cue_count = 0

    NUMBERS = [
        ("LƯU Ý",     "1", 10.54, 13.25),
        ("LƯU Ý",     "2", 27.96, 31.25),
        ("GIẢI PHÁP", "3", 37.66, 41.45),
    ]
    KEYWORDS = [
        ("LO LẮNG?",      4.86),
        ("CẦN KIỂM TRA",  17.90),
        ("KHÁM PHỤ KHOA", 31.34),
        ("LT PLUS",       43.74),
        ("3 NGÀY 1 LẦN",  52.56),
        ("HỘP 15 VIÊN",   55.96),
        ("TÌM HIỂU RÕ",   64.28),
    ]
    TILE_PLACES = [
        ("clinic", 0.65,  215, 305),
        ("hook2",  0.83,  540, 240),
        ("ph",     1.01,  865, 305),
        ("clinic", 18.10, 215, 1455),
        ("herbs",  31.40, 215, 1455),
        ("open",   55.96, 215, 1455),
        ("box",    64.35, 215, 1455),
    ]
    RINGS_SPANS = [(52.56, 60.55), (64.28, 70.10)]

    # Layer A: Hook 4.5s Opening
    stamp_sfx(sfx_trans, bank, "wosh_vshort", 0.08, -7.2, pan=0.0);  cue_count += 1
    stamp_sfx(sfx_trans, bank, "magic_rev",   0.12, -10.2, pan=0.0, align_peak=False); cue_count += 1
    stamp_sfx(sfx_ui,    bank, "pop_tvc1",    0.48, -6.8, pan=-0.25); cue_count += 1
    stamp_sfx(sfx_ui,    bank, "pop_nhe2",    0.74, -6.8, pan=+0.25); cue_count += 1
    stamp_sfx(sfx_trans, bank, "swoosh_nhe",  2.74, -8.5, pan=0.0);   cue_count += 1

    # Layer B: 3 Overhead Hook Tiles (Stereo L -> C -> R) + 4 Left Body Tiles
    for idx_t, (ikey, t0, cx, cy) in enumerate(TILE_PLACES):
        pan_t = (cx - 540.0) / 680.0
        if cy < 400:
            stamp_sfx(sfx_ui, bank, "pop_nhe2", t0 + 0.06, -5.5, pan=pan_t); cue_count += 1
        else:
            stamp_sfx(sfx_ui, bank, "slide_up", t0 + 0.12, -10.8, pan=pan_t, align_peak=False); cue_count += 1
            dk = "ting_nhanh" if idx_t % 2 == 0 else "pop_tvc1"
            stamp_sfx(sfx_ui, bank, dk, t0 + 0.14, -7.5, pan=pan_t); cue_count += 1

    # Layer C: Structural Risers Climbing Right Into Major Beats + Numbers 1 / 2 / 3
    riser_targets = [10.54, 22.48, 27.96, 37.66, 47.35, 52.56, 64.28]
    for idx_r, rt in enumerate(riser_targets):
        rk = "riser_metal" if idx_r % 2 == 0 else "riser_clean"
        stamp_sfx(sfx_trans, bank, rk, rt, -9.0, pan=0.0, align_peak=True); cue_count += 1

    for lbl, dig, t0, t1 in NUMBERS:
        stamp_sfx(sfx_trans, bank, "warm_hit",     t0 + 0.04, -9.2, pan=0.0);   cue_count += 1
        stamp_sfx(sfx_ui,    bank, "correct_ding", t0 + 0.08, -8.8, pan=+0.20); cue_count += 1
        stamp_sfx(sfx_trans, bank, "wosh_vshort",  t0 + 0.02, -8.0, pan=-0.20); cue_count += 1

    # Layer D: 7 Giant Behind-Head Keywords (Camera Shutter + Airy Swoosh)
    for idx_k, (kw_txt, t0) in enumerate(KEYWORDS):
        sh_k = "shutter1" if idx_k % 2 == 0 else "shutter3"
        stamp_sfx(sfx_ui, bank, sh_k, t0 + 0.05, -8.5, pan=0.0); cue_count += 1
        if kw_txt == "LT PLUS":
            stamp_sfx(sfx_trans, bank, "sao_lunglinh", t0 + 0.04, -8.8, pan=0.0, align_peak=False); cue_count += 1
        elif idx_k % 2 == 1:
            stamp_sfx(sfx_trans, bank, "swoosh_nhe", t0 + 0.04, -9.5, pan=0.0); cue_count += 1

    # Layer E: Frosted Glass Synergy Bar (41.52s)
    stamp_sfx(sfx_ui, bank, "slide_ngang", 41.58, -7.8, pan=0.0); cue_count += 1
    for i_p in range(4):
        stamp_sfx(sfx_ui, bank, "pop_nhe2", 41.62 + i_p * 0.08, -9.5, pan=-0.3 + i_p * 0.2); cue_count += 1

    # Layer F: 4 Dual-Layer Split B-Roll Cards + Organic Dewdrop & Product Shimmer
    for idx_b, (st, en, _, _, _, _) in enumerate(broll_spans):
        stamp_sfx(sfx_trans, bank, "wosh_day",   st + 0.05, -6.5, pan=0.0); cue_count += 1
        stamp_sfx(sfx_ui,    bank, "pop_nhe2",   st + 0.20, -9.2, pan=0.0); cue_count += 1
        stamp_sfx(sfx_trans, bank, "swoosh_nhe", en - 0.04, -8.2, pan=0.0); cue_count += 1
        if idx_b == 0:
            stamp_sfx(sfx_ui, bank, "water_drip", st + 0.85, -10.5, pan=+0.15); cue_count += 1
        elif idx_b == 3:
            stamp_sfx(sfx_trans, bank, "sao_lunglinh", st + 0.25, -9.5, pan=0.0, align_peak=False); cue_count += 1

    # Layer G: Orbital Rings + CTA Notification
    for r0, r1 in RINGS_SPANS:
        stamp_sfx(sfx_trans, bank, "magic_rev", r0 + 0.02, -7.5, pan=0.0, align_peak=False); cue_count += 1
        stamp_sfx(sfx_trans, bank, "wosh_tvc",  r0 + 0.05, -7.8, pan=0.0); cue_count += 1
    stamp_sfx(sfx_ui,    bank, "noitifi",     64.42, -7.2, pan=-0.20); cue_count += 1
    stamp_sfx(sfx_trans, bank, "riser_clean", vid_dur - 0.55, -10.2, pan=0.0, align_peak=True); cue_count += 1

    # Layer H: Tactile Caption Micro-Ticks & Stroke-Up Hero Word Accents
    last_click_t = -1.0
    rng = np.random.default_rng(2026)
    for g in cap_groups:
        for li, ln in enumerate(g["lines"]):
            for wi, (wtxt, ws, we) in enumerate(ln):
                if wtxt in STROKE_UP_WORDS:
                    stamp_sfx(sfx_ui, bank, "pop_tvc1",   ws + 0.03, -7.8, pan=0.0); cue_count += 1
                    stamp_sfx(sfx_ui, bank, "ding_trong", ws + 0.06, -10.2, pan=0.0); cue_count += 1
                    last_click_t = ws
                elif wi == 0 and (ws - last_click_t) >= 0.28:
                    tk = "ui_plip" if (li % 2 == 0) else "click_net"
                    human_db = -16.8 + float(rng.uniform(-0.7, 0.7))
                    stamp_sfx(sfx_ui, bank, tk, ws + 0.02, human_db, pan=float(rng.uniform(-0.12, 0.12))); cue_count += 1
                    last_click_t = ws

    print(f"Stamped {cue_count} sample-accurate TLH\\Edit stereo SFX cues across {vid_dur:.2f}s!")

    # Soft studio saturation ceiling on SFX buses so Voiceover always leads effortlessly
    sfx_trans = (np.tanh(sfx_trans * 0.95) / 0.95) * 0.84
    sfx_ui    = (np.tanh(sfx_ui * 0.95) / 0.95) * 0.84

    vo_wav    = os.path.join(STEMS_DIR, "01_Voice_Master.wav")
    bgm_wav   = os.path.join(STEMS_DIR, "02_BGM_Wellness_Ducked.wav")
    trans_wav = os.path.join(STEMS_DIR, "03_SFX_TLH_Transitions_Risers.wav")
    ui_wav    = os.path.join(STEMS_DIR, "04_SFX_TLH_Pops_Shutters_UI.wav")
    mix_wav   = os.path.join(STEMS_DIR, "full_mix_pre_lufs.wav")

    save_wav_16(vo_wav, vo)
    save_wav_16(bgm_wav, bgm)
    save_wav_16(trans_wav, sfx_trans)
    save_wav_16(ui_wav, sfx_ui)

    full_mix = vo + bgm + sfx_trans + sfx_ui
    pk_m = float(np.max(np.abs(full_mix)))
    if pk_m > 0.96:
        full_mix *= (0.96 / pk_m)
    save_wav_16(mix_wav, full_mix)

    pre_mov = os.path.join(PROJ_DIR, "_v4_mixed_pre_lufs.mov")
    subprocess.run([
        "ffmpeg", "-y", "-v", "error", "-i", RAW_VID, "-i", mix_wav,
        "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "pcm_s16le",
        pre_mov
    ], check=True)

    # 2-pass EBU R128 loudnorm -> exact -14.0 LUFS!
    p1 = subprocess.run([
        "ffmpeg", "-hide_banner", "-i", pre_mov,
        "-af", "loudnorm=I=-14:TP=-1:LRA=11:print_format=json", "-f", "null", "-"
    ], stderr=subprocess.PIPE, text=True, encoding="utf-8", errors="replace")
    m = re.search(r"\{\s*\"input_i\".*?\}", p1.stderr, re.S)
    if m:
        st_j = json.loads(m.group(0))
        af_str = (
            f"loudnorm=I=-14:TP=-1:LRA=11:"
            f"measured_I={st_j['input_i']}:measured_TP={st_j['input_tp']}:"
            f"measured_LRA={st_j['input_lra']}:measured_thresh={st_j['input_thresh']}:"
            f"offset={st_j['target_offset']}:linear=true"
        )
        print("2-pass loudnorm:", st_j["input_i"], "-> -14.0 LUFS")
    else:
        af_str = "loudnorm=I=-14:TP=-1:LRA=11"

    subprocess.run([
        "ffmpeg", "-y", "-v", "error", "-i", pre_mov,
        "-c:v", "copy", "-af", af_str, "-ar", "48000", "-c:a", "aac", "-b:a", "256k",
        FINAL_MP4
    ], check=True)
    if os.path.exists(pre_mov):
        os.remove(pre_mov)

    # Export to Master Cloud Storage (AI_Full_Studio/04_Videos_Final), E:\LUU-VIDEO root, and E:\XUAT-VIDEO!
    os.makedirs(MASTER_FINAL_DIR, exist_ok=True)
    shutil.copy2(FINAL_MP4, MASTER_OUT)
    shutil.copy2(FINAL_MP4, GDRIVE_ROOT_OUT)
    if os.path.isdir(EXPORT_DIR):
        shutil.copy2(FINAL_MP4, os.path.join(EXPORT_DIR, "LT_PLUS_TALKING_HEAD_FINAL.mp4"))

    print("Exported Master Final ->", MASTER_OUT, f"({os.path.getsize(MASTER_OUT):,} bytes)")

    # Extract updated 20-frame timestamped QC sheet verifying pink box!
    shutil.copy2(
        r"C:\Users\Hang thu\AppData\Local\CapCut\User Data\Cache\effect\7517455788122705168\91d28cfa5e7db054f4872f1ae2417ac2\Montserrat-Bold.otf",
        os.path.join(CHECK_DIR, "_f.otf")
    )
    subprocess.run([
        "ffmpeg", "-y", "-v", "error", "-i", FINAL_MP4,
        "-vf", "fps=1/3.5,scale=270:480,drawtext=fontfile=_f.otf:text='%{pts\\:hms}':fontcolor=yellow:fontsize=20:box=1:boxcolor=black@0.65:x=8:y=8,tile=5x4",
        "-frames:v", "1", os.path.join(CHECK_DIR, "v4_pink_sheet.jpg")
    ], cwd=CHECK_DIR, check=True)

    return vid_dur, vo_wav, bgm_wav, trans_wav, ui_wav

def build_capcut_v4_multitrack(vid_dur, vo_wav, bgm_wav, trans_wav, ui_wav):
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

    aseg_tpl = next(s for tr in T["tracks"] if tr["type"] == "audio" for s in tr["segments"])
    amat_tpl = next(x for x in T["materials"]["audios"] if x["id"] == aseg_tpl["material_id"])
    atrack_tpl = next(tr for tr in T["tracks"] if tr["type"] == "audio")
    a_extra_keys = tuple(k for k in extra_keys if any(x["id"] in aseg_tpl["extra_material_refs"] for x in T["materials"].get(k, [])))
    amat_extra_tpl = {k: next(x for x in T["materials"][k] if x["id"] in aseg_tpl["extra_material_refs"]) for k in a_extra_keys}

    D = copy.deepcopy(T)
    draft_id = uid()
    total_us = us(vid_dur)
    D.update({
        "id": draft_id, "name": out_name, "fps": 30.0, "duration": total_us,
        "tracks": [], "materials": {k: [] for k in T["materials"]},
        "canvas_config": {"ratio": "9:16", "width": 1080, "height": 1920, "background": None}
    })

    # Video Track 0 (muted video stream so user can independently mix the 4 audio stems below in CapCut!)
    vm = copy.deepcopy(vmat_tpl)
    mid_v = uid()
    vm.update({
        "id": mid_v, "type": "video", "path": FINAL_MP4.replace("\\", "/"),
        "material_name": "lt_plus_talking_head_v4_final.mp4",
        "width": 1080, "height": 1920, "duration": total_us, "has_audio": True
    })
    D["materials"]["videos"].append(vm)

    scene_cuts = [
        (0.00,  4.58), (4.58, 10.54), (10.54,13.36), (13.36,17.85),
        (17.85,22.48), (22.48,27.90), (27.90,33.88), (33.88,37.62),
        (37.62,47.35), (47.35,52.52), (52.52,60.52), (60.52,vid_dur)
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
        seg.update({
            "id": uid(), "material_id": mid_v,
            "source_timerange": {"start": us(s0), "duration": dur_u},
            "target_timerange": {"start": us(s0), "duration": dur_u},
            "speed": 1.0, "volume": 0.0, "last_nonzero_volume": 1.0,
            "extra_material_refs": refs, "common_keyframes": [], "keyframe_refs": [], "render_index": 0
        })
        tr0["segments"].append(seg)
    D["tracks"].append(tr0)

    audio_stems = [
        ("01_Voice_Master", vo_wav, 1.0),
        ("02_BGM_Wellness_Ducked", bgm_wav, 1.0),
        ("03_SFX_TLH_Transitions_Risers", trans_wav, 1.0),
        ("04_SFX_TLH_Pops_Shutters_UI", ui_wav, 1.0),
    ]
    for aname, apath, avol in audio_stems:
        am = copy.deepcopy(amat_tpl)
        aid = uid()
        am.update({
            "id": aid, "type": "extract_music", "name": aname,
            "path": apath.replace("\\", "/"), "duration": total_us
        })
        D["materials"]["audios"].append(am)

        atr = copy.deepcopy(atrack_tpl); atr["id"] = uid(); atr["segments"] = []
        aseg = copy.deepcopy(aseg_tpl)
        arefs = []
        for k in a_extra_keys:
            em = copy.deepcopy(amat_extra_tpl[k]); em["id"] = uid()
            if k == "speeds": em["speed"] = 1.0
            D["materials"][k].append(em); arefs.append(em["id"])
        aseg.update({
            "id": uid(), "material_id": aid,
            "source_timerange": {"start": 0, "duration": total_us},
            "target_timerange": {"start": 0, "duration": total_us},
            "speed": 1.0, "volume": avol, "last_nonzero_volume": avol,
            "extra_material_refs": arefs, "common_keyframes": [], "keyframe_refs": []
        })
        atr["segments"].append(aseg)
        D["tracks"].append(atr)

    os.makedirs(out_dir, exist_ok=True)
    for aux in ["draft_settings", "draft_agency_config.json", "draft_biz_config.json", "draft_virtual_store.json", "key_value.json", "performance_opt_info.json", "timeline_layout.json"]:
        sp = os.path.join(tpl_dir, aux)
        if os.path.isfile(sp):
            shutil.copy2(sp, os.path.join(out_dir, aux))

    subprocess.run(["ffmpeg", "-y", "-v", "error", "-ss", "48.0", "-i", FINAL_MP4, "-frames:v", "1", os.path.join(out_dir, "draft_cover.jpg")], check=True)
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
    print("Created 4-Stem Multi-Track CapCut Draft:", out_dir)

if __name__ == "__main__":
    vd, vo_w, bgm_w, tr_w, ui_w = build_master_sound_and_video()
    build_capcut_v4_multitrack(vd, vo_w, bgm_w, tr_w, ui_w)
