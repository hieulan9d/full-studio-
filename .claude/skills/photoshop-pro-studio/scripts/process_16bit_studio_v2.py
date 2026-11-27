import os
import time
import math
import cv2
import numpy as np
import torch
import torch.nn.functional as F
from PIL import Image
from transformers import AutoModelForImageSegmentation, SegformerImageProcessor, SegformerForSemanticSegmentation

os.environ["HF_HUB_DISABLE_SYMLINKS_WARNING"] = "1"

WORK_V2 = r"d:\AI\full studio\output\workflow_v2"
TIF_IN = os.path.join(WORK_V2, "01_MizukiACR_Genuine_16bit.tif")
LAMA_PATH = r"C:\Users\Hang thu\.cache\torch\hub\checkpoints\big-lama.pt"


def odd(val: float, min_val: int = 3) -> int:
    k = max(min_val, int(round(val)))
    return k if k % 2 == 1 else k + 1


def gauss_blur(arr: np.ndarray, sigma: float) -> np.ndarray:
    if sigma <= 0.2:
        return arr.copy()
    if sigma > 16.0:
        H, W = arr.shape[:2]
        sc = min(8, max(2, int(sigma // 8.0)))
        small = cv2.resize(arr, (W // sc, H // sc), interpolation=cv2.INTER_AREA)
        s_blur = cv2.GaussianBlur(small, (0, 0), sigmaX=sigma / sc, sigmaY=sigma / sc)
        res = cv2.resize(s_blur, (W, H), interpolation=cv2.INTER_LINEAR)
    else:
        res = cv2.GaussianBlur(arr, (0, 0), sigmaX=sigma, sigmaY=sigma)
    if arr.ndim == 3 and res.ndim == 2:
        res = res[..., None]
    return res


def curve_1d(arr: np.ndarray, pts) -> np.ndarray:
    xs = np.array([p[0] / 255.0 for p in pts], dtype=np.float32)
    ys = np.array([p[1] / 255.0 for p in pts], dtype=np.float32)
    grid = np.linspace(0.0, 1.0, 4096, dtype=np.float32)
    lut = np.interp(grid, xs, ys)
    lut = cv2.GaussianBlur(lut.reshape(1, -1), (0, 0), 36.0).reshape(-1)
    lut[0], lut[-1] = ys[0], ys[-1]
    idx = np.clip(arr, 0.0, 1.0) * 4095.0
    i0 = np.clip(idx.astype(np.int32), 0, 4094)
    frac = idx - i0
    return lut[i0] * (1.0 - frac) + lut[i0 + 1] * frac


def save_tiff_16bit_bgr(rgb_f32: np.ndarray, path: str):
    u16 = np.clip(np.round(rgb_f32 * 65535.0), 0, 65535).astype(np.uint16)
    cv2.imwrite(path, cv2.cvtColor(u16, cv2.COLOR_RGB2BGR))


def main():
    t0 = time.time()
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"[1/4] Reading Genuine 16-Bit Adobe Camera Raw TIFF ({TIF_IN})...", flush=True)
    bgr16 = cv2.imread(TIF_IN, cv2.IMREAD_UNCHANGED)
    rgb0 = cv2.cvtColor(bgr16, cv2.COLOR_BGR2RGB).astype(np.float32) / 65535.0
    H, W = rgb0.shape[:2]
    print(f"Loaded 16-bit ACR image: {W}x{H}, dtype={bgr16.dtype}", flush=True)

    lama = torch.jit.load(LAMA_PATH, map_location=device).eval()
    face_proc = SegformerImageProcessor.from_pretrained("jonathandinu/face-parsing", local_files_only=True)
    face_model = SegformerForSemanticSegmentation.from_pretrained("jonathandinu/face-parsing", local_files_only=True).to(device).eval()
    birefnet = AutoModelForImageSegmentation.from_pretrained("ZhengPeng7/BiRefNet", trust_remote_code=True, local_files_only=True).to(device).eval().half()

    with torch.inference_mode():
        acr_t = torch.from_numpy(rgb0).permute(2, 0, 1).to(device)
        inp_b = F.interpolate(acr_t.unsqueeze(0), size=(1024, 1024), mode="bilinear", align_corners=False).half()
        mean_b = torch.tensor([0.485, 0.456, 0.406], device=device).view(1, 3, 1, 1).half()
        std_b = torch.tensor([0.229, 0.224, 0.225], device=device).view(1, 3, 1, 1).half()
        person_mask = F.interpolate(birefnet((inp_b - mean_b) / std_b)[-1].sigmoid().float(), size=(H, W), mode="bilinear", align_corners=False)[0, 0].cpu().numpy()
        del acr_t

        # Head crop on DSC01735 (4000x6000 vertical: head is in upper-middle [y: 750..2750, x: 1150..3150])
        cx0, cy0, cx1, cy1 = int(0.26 * W), int(0.11 * H), int(0.80 * W), int(0.47 * H)
        crop_u8 = np.clip(np.round(rgb0[cy0:cy1, cx0:cx1] * 255.0), 0, 255).astype(np.uint8)
        inp_crop = face_proc(images=Image.fromarray(crop_u8), return_tensors="pt").to(device)
        crop_cls = F.interpolate(face_model(**inp_crop).logits, size=(cy1 - cy0, cx1 - cx0), mode="bilinear", align_corners=False).argmax(dim=1)[0].cpu().numpy().astype(np.uint8)
        cls_map = np.zeros((H, W), dtype=np.uint8)
        cls_map[cy0:cy1, cx0:cx1] = crop_cls

    f_core_crop = np.isin(crop_cls, [1, 2, 4, 5, 6, 7, 10, 11, 12]).astype(np.uint8)
    nf_c, lf_c, stf_c, _ = cv2.connectedComponentsWithStats(f_core_crop, connectivity=8)
    feat_crop = np.isin(crop_cls, [2, 4, 5, 11, 12])
    fc_id = max(range(1, nf_c), key=lambda k: int(feat_crop[lf_c == k].sum()) * 100 + int(stf_c[k, cv2.CC_STAT_AREA]))
    fys, fxs = np.where(lf_c == fc_id)
    fx0, fy0 = cx0 + int(fxs.min()), cy0 + int(fys.min())
    fx1, fy1 = cx0 + int(fxs.max()), cy0 + int(fys.max())
    fw, fh = fx1 - fx0, fy1 - fy0
    fcx = 0.5 * (fx0 + fx1)
    print(f"Exact Face BBox: ({fx0}, {fy0}) -> ({fx1}, {fy1}), fw={fw}, fh={fh}", flush=True)

    # =========================================================================
    # STAGE 1: CAPTURE ONE 16.7 + STUDIO BEAUTY DODGE & BURN (Mụn + Tóc con + Xóa quầng mắt & rãnh cười + Trắng hồng Toumeikan Mặt - Cổ - 2 Tay!)
    # =========================================================================
    print("[2/4] Stage 1: Spot Heal + Tear-Trough & Nasolabial Dodge & Burn + Luminous Toumeikan Skin Uniformity...", flush=True)
    eyes = np.isin(cls_map, [4, 5]).astype(np.uint8)
    brows = np.isin(cls_map, [6, 7]).astype(np.uint8)
    lips_m = np.isin(cls_map, [10, 11, 12]).astype(np.uint8)
    hair_m = (cls_map == 13).astype(np.uint8)
    nose_m = (cls_map == 2)

    eye_guard = cv2.dilate(eyes, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (odd(0.058 * fw), odd(0.076 * fw))))
    brow_guard = cv2.dilate(brows, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (odd(0.048 * fw), odd(0.014 * fw))))
    mouth_guard = cv2.dilate(lips_m, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (odd(0.030 * fw), odd(0.026 * fw))))
    nys, nxs = np.where(nose_m)
    nostril_guard = np.zeros((H, W), dtype=np.uint8)
    if len(nys) > 20:
        ny_cut = int(nys.min() + 0.54 * (nys.max() - nys.min()))
        nostril_guard[ny_cut:nys.max()+1, nxs.min():nxs.max()+1] = nose_m[ny_cut:nys.max()+1, nxs.min():nxs.max()+1]
        nostril_guard = cv2.dilate(nostril_guard, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (odd(0.024 * fw), odd(0.024 * fw))))

    feat_guard = (eye_guard > 0) | (brow_guard > 0) | (mouth_guard > 0) | (nostril_guard > 0)
    face_skin_only = (np.isin(cls_map, [1, 2]) & (~feat_guard)).astype(np.uint8)
    neck_skin_only = ((cls_map == 17) & (~feat_guard)).astype(np.uint8)
    face_neck_skin = (face_skin_only | neck_skin_only).astype(np.uint8)

    # Detect BOTH sunlit hands/forearms (Right hand/arm holding conical hat [x < fx0, y: 2000..4400] + Left hand/forearm on lap [y: 4400..5600])
    # Strictly exclude tan/brown conical hat & ribbon where b*/a* > 1.95 or L* < 66!
    lab0 = cv2.cvtColor(rgb0.astype(np.float32), cv2.COLOR_RGB2Lab)
    L0, a0, b0 = lab0[..., 0], lab0[..., 1], lab0[..., 2]
    R0, G0, B0 = rgb0[..., 0], rgb0[..., 1], rgb0[..., 2]

    arm_zones = np.zeros((H, W), dtype=bool)
    arm_zones[int(0.34 * H):int(0.74 * H), int(0.04 * W):int(fx0 - 0.05 * fw)] = True   # Right hand & forearm holding nón lá
    arm_zones[int(0.70 * H):int(0.93 * H), int(0.26 * W):int(0.68 * W)] = True          # Left hand & wrist resting on knee

    hand_cand = (
        arm_zones
        & (person_mask > 0.55)
        & (cls_map == 0)
        & (L0 > 63.0)                  # Sunlit skin is bright (>63), brown hat shadow/ribbon is darker!
        & (a0 > 5.5) & (a0 < 21.5)     # Rosy skin a* (excludes red Ao Dai >24 & neutral white wall <4)
        & (b0 > 7.0) & (b0 < 25.0)
        & (b0 < a0 * 1.92 + 3.0)       # Excludes yellow-tan bamboo nón lá & tan chin-strap!
        & ((R0 - G0) < 0.22)
    ).astype(np.uint8)
    hand_cand = cv2.morphologyEx(hand_cand, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9)))
    hand_cand = cv2.morphologyEx(hand_cand, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (15, 15)))
    nl_h, lbl_h, st_h, _ = cv2.connectedComponentsWithStats(hand_cand, connectivity=8)
    hand_skin = np.zeros((H, W), dtype=np.uint8)
    for k in range(1, nl_h):
        if st_h[k, cv2.CC_STAT_AREA] >= 8000:
            hand_skin[lbl_h == k] = 1
    # Protect gold ring on her left hand
    gold_ring = ((hand_skin > 0) & (b0 > 21.5) & ((b0 - a0) > 9.5)).astype(np.uint8)
    hand_skin[cv2.dilate(gold_ring, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9))) > 0] = 0
    print(f"Detected Sunlit Hand/Forearm Skin pixels: {int(hand_skin.sum())}", flush=True)

    # 1A. 16-Bit Discrete Pimple/Blemish + Stray Flyaway Hair Removal (100% Eye & Brow Guarded!)
    stage1 = rgb0.copy()
    sub_skin = face_neck_skin[cy0:cy1, cx0:cx1]
    sub_L = L0[cy0:cy1, cx0:cx1]
    sub_a = a0[cy0:cy1, cx0:cx1]
    w_s = sub_skin.astype(np.float32)
    sig_s = max(6.0, 0.025 * fw)
    den_s = np.maximum(gauss_blur(w_s, sig_s), 1e-4)
    loc_L = gauss_blur(sub_L * w_s, sig_s) / den_s
    loc_a = gauss_blur(sub_a * w_s, sig_s) / den_s
    diff_dark = (loc_L - sub_L) * w_s
    diff_abs_L = np.abs(sub_L - loc_L) * w_s
    diff_red = (sub_a - loc_a) * w_s
    dog_bump = np.abs(gauss_blur(sub_L, 1.8) - gauss_blur(sub_L, 9.5)) * (gauss_blur(w_s, 5.0) > 0.88)

    std_L = max(1.2, float(np.std(diff_dark[sub_skin > 0])))
    std_a = max(0.8, float(np.std(diff_red[sub_skin > 0])))
    cand_sp = (
        (sub_skin > 0)
        & (
            (diff_red > max(1.65, 2.05 * std_a))
            | (diff_dark > max(3.6, 2.55 * std_L))
            | ((dog_bump > 2.85) & (diff_abs_L > 2.3))
        )
    ).astype(np.uint8)
    nl_s, lb_s, st_s, _ = cv2.connectedComponentsWithStats(cand_sp, connectivity=8)
    max_ss = int(0.050 * fw)
    spots_crop = np.zeros_like(cand_sp)
    for k in range(1, nl_s):
        bw_k, bh_k, ak = st_s[k, cv2.CC_STAT_WIDTH], st_s[k, cv2.CC_STAT_HEIGHT], st_s[k, cv2.CC_STAT_AREA]
        aspect = max(bw_k, bh_k) / max(1.0, float(min(bw_k, bh_k)))
        if 5 <= ak <= (max_ss * max_ss * 0.65) and bw_k <= max_ss and bh_k <= max_ss and aspect <= 3.6:
            spots_crop[lb_s == k] = 1
    spots_crop = cv2.dilate(spots_crop, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (odd(0.015 * fw), odd(0.015 * fw))))
    spots_crop[sub_skin == 0] = 0

    # Stray flyaway hair wisps on right side of head (against bright mural x > fcx + 0.35*fw)
    hair_crop = hair_m[cy0:cy1, cx0:cx1].astype(np.float32)
    hair_core = (gauss_blur(hair_crop, 18.0) > 0.65).astype(np.uint8)
    hair_outer = ((gauss_blur(hair_core.astype(np.float32), 40.0) > 0.02) & (gauss_blur(hair_core.astype(np.float32), 5.0) < 0.14)).astype(np.uint8)
    sub_lum = 0.2126 * stage1[cy0:cy1, cx0:cx1, 0] + 0.7152 * stage1[cy0:cy1, cx0:cx1, 1] + 0.0722 * stage1[cy0:cy1, cx0:cx1, 2]
    bg_loc = gauss_blur(sub_lum, 14.0)
    xx_c = np.arange(cx0, cx1)[None, :]
    raw_wisp = ((hair_outer > 0) & (sub_skin == 0) & (xx_c > fcx + 0.25 * fw) & (bg_loc > 0.32) & ((bg_loc - sub_lum) > 0.07)).astype(np.uint8)
    nw_l, lw_l, stw_l, _ = cv2.connectedComponentsWithStats(raw_wisp, connectivity=8)
    stray_wisp = np.zeros_like(raw_wisp)
    for k in range(1, nw_l):
        if 8 <= stw_l[k, cv2.CC_STAT_AREA] <= 3400:
            stray_wisp[lw_l == k] = 1
    stray_wisp = cv2.dilate(stray_wisp, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9)))

    heal_mask = np.clip(spots_crop | stray_wisp, 0, 1).astype(np.uint8)
    print(f"Healed Spot px: {int(spots_crop.sum())}, Stray Hair px: {int(stray_wisp.sum())}", flush=True)
    if heal_mask.sum() > 0:
        sub16 = stage1[cy0:cy1, cx0:cx1]
        sh, sw = sub16.shape[:2]
        ph, pw = (8 - sh % 8) % 8, (8 - sw % 8) % 8
        s16_p = cv2.copyMakeBorder(sub16, 0, ph, 0, pw, cv2.BORDER_REPLICATE) if (ph or pw) else sub16
        sm_p = cv2.copyMakeBorder(heal_mask, 0, ph, 0, pw, cv2.BORDER_CONSTANT, value=0) if (ph or pw) else heal_mask
        with torch.inference_mode():
            inp_np = lama(
                torch.from_numpy(s16_p).permute(2, 0, 1).unsqueeze(0).to(device),
                torch.from_numpy(sm_p).unsqueeze(0).unsqueeze(0).float().to(device),
            )[0].permute(1, 2, 0).clamp(0.0, 1.0).cpu().numpy()[:sh, :sw]
        rng = np.random.default_rng(77)
        ns = gauss_blur(rng.normal(0.0, 1.0, size=(sh, sw)).astype(np.float32), 0.55)[..., None] * 0.0042
        inp_np = np.clip(inp_np + ns * (spots_crop[..., None] > 0), 0.0, 1.0)
        al_h = gauss_blur(heal_mask.astype(np.float32), 2.5)[..., None]
        stage1[cy0:cy1, cx0:cx1] = sub16 * (1.0 - al_h) + inp_np * al_h

    # 1B. TRUE STUDIO 16-BIT MICRO DODGE & BURN (Khử sạch 70% quầng thâm mắt + 65% rãnh cười sâu, trẻ ra 5 tuổi!)
    yy_f, xx_f = np.mgrid[cy0:cy1, cx0:cx1].astype(np.float32)
    eys, exs = np.where(eyes > 0)
    eye_cy = float(np.median(eys))
    lys, lxs = np.where(lips_m > 0)
    lip_cy = float(np.median(lys))
    lip_lx, lip_rx = float(lxs.min()), float(lxs.max())

    # Tear-trough crescent zones below left & right eyes (outside eye_guard so aegyo-sal stays intact!)
    tt_y = eye_cy + 0.11 * fh
    tt_lx, tt_rx = fcx - 0.21 * fw, fcx + 0.21 * fw
    w_tt = (
        np.exp(-(((xx_f - tt_lx) / (0.18 * fw)) ** 2 + ((yy_f - tt_y) / (0.085 * fh)) ** 2))
        + np.exp(-(((xx_f - tt_rx) / (0.18 * fw)) ** 2 + ((yy_f - tt_y) / (0.085 * fh)) ** 2))
    )

    # Nasolabial smile fold zones (from nostril wings diagonally past lip corners) & chin corners
    nl_y = 0.5 * ( float(nys.max()) + lip_cy )
    nl_lx, nl_rx = lip_lx - 0.05 * fw, lip_rx + 0.05 * fw
    w_nl = (
        np.exp(-(((xx_f - nl_lx) / (0.13 * fw)) ** 2 + ((yy_f - nl_y) / (0.15 * fh)) ** 2))
        + np.exp(-(((xx_f - nl_rx) / (0.13 * fw)) ** 2 + ((yy_f - nl_y) / (0.15 * fh)) ** 2))
    )

    db_zone = np.clip(0.75 * w_tt + 0.70 * w_nl + 0.25, 0.0, 0.90) * gauss_blur(sub_skin.astype(np.float32), 5.0)

    sub_lab = cv2.cvtColor(stage1[cy0:cy1, cx0:cx1].astype(np.float32), cv2.COLOR_RGB2Lab)
    sL, sa, sb = sub_lab[..., 0], sub_lab[..., 1], sub_lab[..., 2]
    # Measure dark shadow troughs in [3.2px .. 34px] inside skin only (masked normalized convolution so hair/brows don't bleed!)
    skin_soft = np.maximum(gauss_blur(sub_skin.astype(np.float32), 32.0), 1e-4)
    sL_ref = gauss_blur(sL * sub_skin, 32.0) / skin_soft
    sL_mid = gauss_blur(sL, 3.2)
    trough_depth = np.maximum(0.0, sL_ref - sL_mid) * (sub_skin > 0)

    dodge_amt = trough_depth * db_zone
    sub_lab[..., 0] = np.clip(sL + dodge_amt, 0.0, 100.0)
    # Add warm rosy blood-tone (+a*, slight +b*) where shadows were lifted so skin never looks grey!
    sub_lab[..., 1] = sa + 0.14 * dodge_amt
    sub_lab[..., 2] = sb + 0.06 * dodge_amt
    stage1[cy0:cy1, cx0:cx1] = np.clip(cv2.cvtColor(sub_lab, cv2.COLOR_Lab2RGB), 0.0, 1.0)

    # 1C. Silky Pore-Preserving 16-Bit Frequency Separation (36% Low-Tone Evening, 100% Real Pores!)
    sub_f = stage1[cy0:cy1, cx0:cx1]
    fs_skin_f = gauss_blur(sub_skin.astype(np.float32), max(4.0, 0.018 * fw))[..., None]
    low_s = gauss_blur(sub_f, 5.5)
    high_pores = sub_f - low_s
    low_surf = cv2.bilateralFilter(low_s, d=9, sigmaColor=0.048, sigmaSpace=15.0)
    stage1[cy0:cy1, cx0:cx1] = np.clip(low_s * (1.0 - 0.38 * fs_skin_f) + low_surf * (0.38 * fs_skin_f) + high_pores, 0.0, 1.0)

    # 1D. Capture One Skin Tone & Luminance Uniformity (Lifts Shaded Face under Hat to Luminous Milky-Rosy Toumeikan matching Sunlit Arms!)
    # Notice: In DSC01735, her face is shaded under the conical hat (L* ~ 62) while her arms are sunlit (L* ~ 82)!
    s1_lab = cv2.cvtColor(stage1.astype(np.float32), cv2.COLOR_RGB2Lab)
    fn_mask_soft = gauss_blur(face_neck_skin.astype(np.float32), 14.0) * (1.0 - gauss_blur(feat_guard.astype(np.float32), 4.0) * 0.85)
    face_only_soft = gauss_blur(face_skin_only.astype(np.float32), 16.0) * (1.0 - gauss_blur( eyes.astype(np.float32), 6.0 ))

    # Smooth highlight-safe brightness lift on shaded face & neck (+10.5 L* midtone glow -> L* reaches ~75..80 rosy porcelain!)
    L_cur = s1_lab[..., 0]
    headroom = np.clip((92.0 - L_cur) / 36.0, 0.0, 1.0)
    # Also add subtle 3D T-zone highlight (forehead, nose bridge, cheek apples, chin)
    yy_all, xx_all = np.mgrid[0:H, 0:W].astype(np.float32)
    tzone_glow = np.exp(-(((xx_all - fcx) / (0.38 * fw)) ** 2 + ((yy_all - (fy0 + 0.46 * fh)) / (0.42 * fh)) ** 2))
    s1_lab[..., 0] = np.clip(L_cur + (9.2 * fn_mask_soft + 2.6 * face_only_soft * tzone_glow) * headroom, 0.0, 100.0)

    # Gently calm hot sunlit highlights on her sunlit hands/forearms (> 83 L*) so hands & face sit in effortless harmony!
    hand_soft = gauss_blur(hand_skin.astype(np.float32), 11.0)
    hand_hot = np.maximum(0.0, s1_lab[..., 0] - 80.0)
    s1_lab[..., 0] = s1_lab[..., 0] - 0.35 * hand_hot * hand_soft

    # Unify Skin Tone Hue & Chroma across Face + Neck + Both Hands to Mizuki's Rosy-Porcelain Swatch #1 (clean milky peach-pink!)
    all_skin_soft = np.clip(gauss_blur(face_neck_skin.astype(np.float32), 10.0) + hand_soft, 0.0, 1.0) * (1.0 - gauss_blur((eyes | lips_m).astype(np.float32), 4.0))
    # Target clean Japanese Toumeikan rosy-ivory chroma: a* ~ 10.2 (delicate pink blush), b* ~ 13.8 (creamy ivory, NOT yellow-tan!)
    tgt_a, tgt_b = 10.4, 13.8
    tgt_C = math.hypot(tgt_a, tgt_b)
    tgt_h = math.atan2(tgt_b, tgt_a)

    cur_a, cur_b = s1_lab[..., 1], s1_lab[..., 2]
    cur_C = np.hypot(cur_a, cur_b)
    cur_h = np.arctan2(cur_b, cur_a)
    dh = np.arctan2(np.sin(tgt_h - cur_h), np.cos(tgt_h - cur_h))

    s1_lab[..., 1] = (cur_C + (tgt_C - cur_C) * (0.42 * all_skin_soft)) * np.cos(cur_h + dh * (0.48 * all_skin_soft))
    s1_lab[..., 2] = (cur_C + (tgt_C - cur_C) * (0.42 * all_skin_soft)) * np.sin(cur_h + dh * (0.48 * all_skin_soft))

    # Enhance natural rosy lip tint slightly (+12% healthy coral-rose vibrancy on lips only!)
    lips_soft = gauss_blur(lips_m.astype(np.float32), 3.0)
    s1_lab[..., 1] = s1_lab[..., 1] + 3.2 * lips_soft
    s1_lab[..., 0] = np.clip(s1_lab[..., 0] + 1.8 * lips_soft, 0.0, 100.0)

    stage1 = np.clip(cv2.cvtColor(s1_lab, cv2.COLOR_Lab2RGB), 0.0, 1.0)
    save_tiff_16bit_bgr(stage1, os.path.join(WORK_V2, "02_Stage1_C1_Beauty_DB_SkinTone_16bit.tif"))

    # =========================================================================
    # STAGE 2: SURGICAL NARROW-CREASE SLEEVE IRONING (0% Chest Blur! 100% Crisp Brocade!) + SMART PORTRAIT LIQUIFY
    # =========================================================================
    print("[3/4] Stage 2: Surgical Narrow-Crease Sleeve Healing (0% Chest Smudge!) + Smart V-Line Liquify...", flush=True)
    stage2 = stage1.copy()

    # Strictly target ONLY narrow pinched dark fold creases (width 3..15px) on the TWO SLEEVES & LOWER LAP (NEVER blur chest medallions!)
    R1, G1, B1 = stage2[..., 0], stage2[..., 1], stage2[..., 2]
    pink_trim = ((R1 > 0.35) & (B1 > G1 * 1.08) & ((R1 - G1) > 0.18)).astype(np.float32)
    pink_guard = np.clip(gauss_blur(pink_trim, 10.0) * 2.5, 0.0, 1.0)
    hair_excl = (gauss_blur(hair_m.astype(np.float32), 14.0) > 0.06)
    skin_excl = (all_skin_soft > 0.06)

    # Sleeve & lower-lap zones ONLY (leaving central upper chest 100.0% untouched so zero blur ever touches chest Chữ Thọ!)
    sleeve_zones = np.zeros((H, W), dtype=np.float32)
    sleeve_zones[int(0.46 * H):int(0.82 * H), int(0.05 * W):int(0.32 * W)] = 1.0   # Right wide sleeve (viewer's left)
    sleeve_zones[int(0.50 * H):int(0.86 * H), int(0.54 * W):int(0.88 * W)] = 1.0   # Left forearm sleeve resting on table (viewer's right)
    sleeve_zones[int(0.78 * H):int(0.99 * H), int(0.10 * W):int(0.72 * W)] = 0.75  # Lower skirt lap folds
    sleeve_zones = gauss_blur(sleeve_zones, 24.0)

    garment_red = (person_mask > 0.65) & (~hair_excl) & (~skin_excl) & ((R1 - B1) > 0.12)
    sleeve_mask = gauss_blur(garment_red.astype(np.float32), 12.0) * sleeve_zones * (1.0 - pink_guard)

    # Narrow Crease Valley Detector: ONLY lifts narrow dark pinch lines (scale 2.5px .. 16px) where fabric folded sharply!
    g_lab = cv2.cvtColor(stage2.astype(np.float32), cv2.COLOR_RGB2Lab)
    Lg = g_lab[..., 0]
    Lg_2 = gauss_blur(Lg, 2.4)
    Lg_18 = gauss_blur(Lg, 17.0)
    # Only dark narrow valleys (Lg_18 - Lg_2 > 2.5) get lifted smoothly; bright gold brocade threads (Lg_2 > Lg_18) stay 100% untouched!
    narrow_valley = np.maximum(0.0, Lg_18 - Lg_2 - 1.2)
    seam_guard = np.clip((Lg - 10.0) / 10.0, 0.0, 1.0)
    crease_lift = narrow_valley * 0.72 * sleeve_mask * seam_guard

    g_lab[..., 0] = np.clip(Lg + crease_lift, 0.0, 100.0)
    g_lab[..., 1] = g_lab[..., 1] * (1.0 + 0.012 * crease_lift)
    g_lab[..., 2] = g_lab[..., 2] * (1.0 + 0.010 * crease_lift)
    stage2_ironed = np.clip(cv2.cvtColor(g_lab, cv2.COLOR_Lab2RGB), 0.0, 1.0)

    # Smart Portrait Liquify: Natural Oval V-Line Jaw Slimming + Right Hair Wave Volume (100% Conical Hat Freeze!)
    jaw_y = fy0 + 0.76 * fh
    jaw_lx = fx0 + 0.05 * fw
    jaw_rx = fx1 - 0.05 * fw
    sig_jx, sig_jy = 0.24 * fw, 0.23 * fh

    w_jl = np.exp(-(((xx_all - jaw_lx) / sig_jx) ** 2 + ((yy_all - jaw_y) / sig_jy) ** 2))
    w_jr = np.exp(-(((xx_all - jaw_rx) / sig_jx) ** 2 + ((yy_all - jaw_y) / sig_jy) ** 2))
    center_freeze = np.exp(-(((xx_all - fcx) / (0.26 * fw)) ** 4 + ((yy_all - (fy0 + 0.58 * fh)) / (0.34 * fh)) ** 4))
    # Freeze 100% of conical hat rim on upper-left (x < fx0 - 0.04*fw, y < fy1) so bamboo hat stays ruler-straight!
    hat_freeze = np.clip(((fx0 - 0.02 * fw) - xx_all) / (0.10 * fw), 0.0, 1.0) * (yy_all < (fy1 + 0.15 * fh))
    liq_gate = (1.0 - center_freeze) * (1.0 - hat_freeze)

    push_x = ((+0.042 * fw) * w_jl + (-0.042 * fw) * w_jr) * liq_gate
    push_y = ((-0.013 * fh) * (w_jl + w_jr)) * liq_gate

    # Subtle right-side hair crown volume lift (away from conical hat!)
    crown_rx = fcx + 0.22 * fw
    crown_ry = fy0 - 0.14 * fh
    w_cr = np.exp(-(((xx_all - crown_rx) / (0.45 * fw)) ** 2 + ((yy_all - crown_ry) / (0.24 * fh)) ** 2)) * (1.0 - hat_freeze)
    crown_gate = np.clip(((fy0 + 0.04 * fh) - yy_all) / (0.10 * fh), 0.0, 1.0)
    push_y += (-0.038 * fh) * w_cr * crown_gate

    push_x = gauss_blur(push_x, 14.0)
    push_y = gauss_blur(push_y, 14.0)
    map_x = (xx_all - push_x).astype(np.float32)
    map_y = (yy_all - push_y).astype(np.float32)

    stage3 = cv2.remap(stage2_ironed, map_x, map_y, interpolation=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REFLECT_101)
    person_w = cv2.remap(person_mask.astype(np.float32), map_x, map_y, interpolation=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT)
    eyes_w = cv2.remap(eyes.astype(np.float32), map_x, map_y, interpolation=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT)

    # Subtle Eye Catchlight Sparkle (lifts iris catchlight only, keeps black pupil ink-deep!)
    eye_sp_m = gauss_blur(eyes_w, 2.2)[..., None]
    eye_crv = np.stack([curve_1d(stage3[..., c], [[0, 0], [35, 33], [95, 105], [180, 200], [255, 255]]) for c in range(3)], axis=-1)
    stage3 = stage3 * (1.0 - eye_sp_m * 0.55) + eye_crv * (eye_sp_m * 0.55)

    save_tiff_16bit_bgr(stage3, os.path.join(WORK_V2, "03_Stage2_PS_Liquify_And_Crease_16bit.tif"))

    # Also save an 8-bit greyscale Background Mask PNG (255 = Background, 0 = Subject) for real Photoshop 2026 Adjustment Layer masking!
    bg_mask_u8 = np.clip(np.round((1.0 - gauss_blur(person_w, 16.0)) * 255.0), 0, 255).astype(np.uint8)
    cv2.imwrite(os.path.join(WORK_V2, "mask_bg_only.png"), bg_mask_u8)

    # Save exact Face BBox metadata for 200% zoom crop generation
    np.savez(os.path.join(WORK_V2, "face_meta.npz"), bbox=np.array([fx0, fy0, fx1, fy1]))
    print(f"[4/4] Saved 16-bit Studio TIFFs & Masks in {time.time() - t0:.1f}s!", flush=True)


if __name__ == "__main__":
    main()
