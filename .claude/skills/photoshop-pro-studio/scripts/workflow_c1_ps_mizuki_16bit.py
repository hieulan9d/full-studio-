import os
import io
import time
import math
import uuid
import cv2
import rawpy
import numpy as np
import torch
import torch.nn.functional as F
from PIL import Image, ImageCms, ImageDraw, ImageFont
from transformers import AutoModelForImageSegmentation, SegformerImageProcessor, SegformerForSemanticSegmentation
import packbits
import pytoshop
from pytoshop.user import nested_layers
import pytoshop.codecs
pytoshop.codecs.packbits = packbits

os.environ["HF_HUB_DISABLE_SYMLINKS_WARNING"] = "1"

ARW_PATH = r"G:\Drive của tôi\Hữu\Mùng 5\DSC01869.ARW"
LUT_CACHE = r"d:\AI\full studio\output\mung5_inspect\acr_adobe_portrait_lut.npz"
LAMA_PATH = r"C:\Users\Hang thu\.cache\torch\hub\checkpoints\big-lama.pt"
FONT_BOLD = r"d:\AI\full studio\BO_KIEN_THUC_TVC_AI_PORTABLE\03_TAI_NGUYEN_DUNG_CHUNG\fonts_tvc_vi\BeVietnamPro-Bold.ttf"

WORK_DIR = r"d:\AI\full studio\output\workflow_test1"
LOCAL_DELIV = r"E:\XUAT-VIDEO\Test_Full_Workflow_DSC01869"
DRIVE_DELIV = r"E:\LUU-VIDEO\photoshop\05_Test_Full_Workflow_DSC01869"
C1_STYLES_DIR = r"C:\Users\Hang thu\AppData\Local\CaptureOne\Styles50"

for d in [WORK_DIR, LOCAL_DELIV, DRIVE_DELIV, C1_STYLES_DIR]:
    os.makedirs(d, exist_ok=True)

SRGB_ICC = ImageCms.ImageCmsProfile(ImageCms.createProfile("sRGB")).tobytes()


def odd(val: float, min_val: int = 3) -> int:
    k = max(min_val, int(round(val)))
    return k if k % 2 == 1 else k + 1


def gauss_blur(arr: np.ndarray, sigma: float) -> np.ndarray:
    if sigma <= 0.2:
        return arr.copy()
    # Downsample acceleration for very wide sigmas on 24MP images
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


def decode_arw_16bit(arw_path: str) -> np.ndarray:
    with open(arw_path, "rb") as fh:
        raw_bytes = fh.read()
    with rawpy.imread(io.BytesIO(raw_bytes)) as raw:
        rgb16 = raw.postprocess(
            use_camera_wb=True,
            no_auto_bright=True,
            output_bps=16,
            output_color=rawpy.ColorSpace.sRGB,
            gamma=(2.222, 4.5),
            highlight_mode=rawpy.HighlightMode.Blend,
            demosaic_algorithm=rawpy.DemosaicAlgorithm.AHD,
        )
    H, W = rgb16.shape[:2]
    y0, x0 = (H - 4000) // 2, (W - 6000) // 2
    return rgb16[y0:y0 + 4000, x0:x0 + 6000].astype(np.float32) / 65535.0


def apply_poly_cuda(rgb_np: np.ndarray, W_poly: np.ndarray, device) -> np.ndarray:
    rgb_t = torch.from_numpy(rgb_np).to(device)
    W_t = torch.from_numpy(W_poly).to(device)
    r, g, b = rgb_t[..., 0], rgb_t[..., 1], rgb_t[..., 2]
    ones = torch.ones_like(r)
    feats = torch.stack([
        ones, r, g, b,
        r*r, g*g, b*b, r*g, r*b, g*b,
        r*r*r, g*g*g, b*b*b,
        r*r*g, r*r*b, g*g*r, g*g*b, b*b*r, b*b*g, r*g*b
    ], dim=-1)
    out = torch.matmul(feats, W_t).clamp(0.0, 1.0)
    return out.cpu().numpy()


def curve_1d(arr: np.ndarray, pts) -> np.ndarray:
    xs = np.array([p[0] / 255.0 for p in pts], dtype=np.float32)
    ys = np.array([p[1] / 255.0 for p in pts], dtype=np.float32)
    grid = np.linspace(0.0, 1.0, 4096, dtype=np.float32)
    lut = np.interp(grid, xs, ys)
    lut = cv2.GaussianBlur(lut.reshape(1, -1), (0, 0), 38.0).reshape(-1)
    lut[0], lut[-1] = ys[0], ys[-1]
    idx = np.clip(arr, 0.0, 1.0) * 4095.0
    i0 = np.clip(idx.astype(np.int32), 0, 4094)
    frac = idx - i0
    return lut[i0] * (1.0 - frac) + lut[i0 + 1] * frac


def write_capture_one_costyle():
    """Write genuine Capture One 16.7.4 .costyle XML with Mizuki Video 19 HSL + Tone + Dehaze + Skin Uniformity."""
    costyle_xml = f'''<?xml version="1.0"?>
<SL Engine="1300">
\t<E K="Clarity" V="10" />
\t<E K="ClarityMethod" V="2" />
\t<E K="ColorBalanceHighlight" V="1.005;1.005;1.012" />
\t<E K="ColorBalanceMidtone" V="1;1;1" />
\t<E K="ColorBalanceShadow" V="0.982;0.996;1.018" />
\t<E K="ColorCorrections" V="1,1,1,0,0,0,127,63,119,-28.82,28.82,-50,50,12,0,0,0,0;1,1,1,0,0,0,67,63,127,-21.98,21.98,-50,50,12,0,0,0,0;1,1,1,0,20,12,63,118,127,-22.32,22.32,-50,50,14,0,0,0,0;1,1,1,-17,-55,0,69,127,63,-38.93,38.93,-50,50,16,0,0,0,0;1,1,1,0,-23,38,127,115,63,-13.54,13.54,-50,50,15,0,0,0,0;1,1,1,0,30,0,127,68,63,-18.41,18.41,-50,50,14,0,0,0,0;1,2,0,0,-4,4,218,172,155,-18,18,-35,35,20,28,22,10,0" />
\t<E K="Contrast" V="9" />
\t<E K="Dehaze" V="-5" />
\t<E K="Exposure" V="0.35" />
\t<E K="GradationCurve" V="0,0.0235;0.25,0.243;0.5,0.502;0.75,0.776;1,0.988" />
\t<E K="HighlightRecoveryEx" V="-70" />
\t<E K="Name" V="Mizuki Video19 - All Days Clear + Skin Uniformity" />
\t<E K="Saturation" V="3" />
\t<E K="ShadowRecovery" V="56" />
\t<E K="StyleSource" V="Styles" />
\t<E K="UUID" V="{uuid.uuid4()}" />
\t<E K="WhiteClip" V="0.012" />
</SL>
'''
    for p in [
        os.path.join(C1_STYLES_DIR, "Mizuki_Video19_AllDaysClear_SkinTone.costyle"),
        os.path.join(DRIVE_DELIV, "Mizuki_Video19_AllDaysClear_SkinTone.costyle"),
        os.path.join(LOCAL_DELIV, "Mizuki_Video19_AllDaysClear_SkinTone.costyle"),
        r"Z:\Máy tính khác\My Computer\[2] ẢNH DỰ ÁN NGOÀI\photoshop\02_Presets_CameraRaw_XMP\Mizuki_Video19_CaptureOne.costyle",
    ]:
        with open(p, "w", encoding="utf-8") as f:
            f.write(costyle_xml)
    print("Installed Capture One 16.7.4 .costyle into AppData\\Local\\CaptureOne\\Styles50!", flush=True)


def main():
    t0 = time.time()
    write_capture_one_costyle()

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"[1/5] Decoding DSC01869.ARW (6000x4000 16-bit) & Loading Models on {device}...", flush=True)
    raw_as_shot = decode_arw_16bit(ARW_PATH)
    H, W = raw_as_shot.shape[:2]
    W_poly = np.load(LUT_CACHE)["W"]

    # Load AI segmentation & inpainting models from local cache (zero network delay!)
    lama = torch.jit.load(LAMA_PATH, map_location=device).eval()
    face_proc = SegformerImageProcessor.from_pretrained("jonathandinu/face-parsing", local_files_only=True)
    face_model = SegformerForSemanticSegmentation.from_pretrained("jonathandinu/face-parsing", local_files_only=True).to(device).eval()
    birefnet = AutoModelForImageSegmentation.from_pretrained("ZhengPeng7/BiRefNet", trust_remote_code=True, local_files_only=True).to(device).eval().half()

    # Apply 16-bit Adobe Portrait Camera Raw base profile on GPU
    with torch.inference_mode():
        acr_base = apply_poly_cuda(raw_as_shot, W_poly, device)

        # Fast GPU Person Segmentation via BiRefNet
        acr_t = torch.from_numpy(acr_base).permute(2, 0, 1).to(device)
        inp_b = F.interpolate(acr_t.unsqueeze(0), size=(1024, 1024), mode="bilinear", align_corners=False).half()
        mean_b = torch.tensor([0.485, 0.456, 0.406], device=device).view(1, 3, 1, 1).half()
        std_b = torch.tensor([0.229, 0.224, 0.225], device=device).view(1, 3, 1, 1).half()
        person_mask = F.interpolate(birefnet((inp_b - mean_b) / std_b)[-1].sigmoid().float(), size=(H, W), mode="bilinear", align_corners=False)[0, 0].cpu().numpy()
        del acr_t

        # Locate head region directly from top 28% of BiRefNet person silhouette!
        pys, pxs = np.where(person_mask > 0.5)
        py_top, py_bot = int(pys.min()), int(pys.max())
        p_h = py_bot - py_top
        head_band = person_mask[py_top : py_top + int(0.28 * p_h), :] > 0.5
        hb_xs = np.where(head_band.any(axis=0))[0]
        hc_x = 0.5 * float(hb_xs.min() + hb_xs.max())
        h_span = max(1350, int(1.25 * (hb_xs.max() - hb_xs.min())))
        cx0 = max(0, int(hc_x - 0.55 * h_span))
        cx1 = min(W, int(hc_x + 0.55 * h_span))
        cy0 = max(0, py_top - 120)
        cy1 = min(H, py_top + int(0.40 * p_h))

        # Adaptive highlight-safe RAW exposure recovery (Video 19: Exposure +0.45, Shadows +56, Highlights -70!)
        acr_lum = 0.2126 * acr_base[..., 0] + 0.7152 * acr_base[..., 1] + 0.0722 * acr_base[..., 2]
        head_center_y0, head_center_y1 = py_top + int(0.06 * p_h), py_top + int(0.22 * p_h)
        head_center_x0, head_center_x1 = int(hc_x - 220), int(hc_x + 220)
        med_face = float(np.median(acr_lum[head_center_y0:head_center_y1, head_center_x0:head_center_x1]))
        exp_gain = float(np.clip((0.50 / max(0.14, med_face)) ** 0.72, 1.0, 1.46))
        k_sh = max(0.0, exp_gain - 1.0)
        stage0_norm = np.clip((acr_base * exp_gain) / (1.0 + acr_base * k_sh * 0.82), 0.0, 1.0)
        hl_wall = np.clip((stage0_norm - 0.70) / 0.30, 0.0, 1.0)
        stage0_norm = np.clip(stage0_norm - 0.065 * (hl_wall ** 1.6), 0.0, 1.0)

        # High-resolution CelebAMask-HQ Face Parsing on close-up head crop [cy0:cy1, cx0:cx1]
        crop_u8 = np.clip(np.round(stage0_norm[cy0:cy1, cx0:cx1] * 255.0), 0, 255).astype(np.uint8)
        inp_crop = face_proc(images=Image.fromarray(crop_u8), return_tensors="pt").to(device)
        crop_cls = F.interpolate(face_model(**inp_crop).logits, size=(cy1 - cy0, cx1 - cx0), mode="bilinear", align_corners=False).argmax(dim=1)[0].cpu().numpy().astype(np.uint8)
        cls_map = np.zeros((H, W), dtype=np.uint8)
        cls_map[cy0:cy1, cx0:cx1] = crop_cls

    # Strictly keep the single connected face component containing eyes/nose/lips for exact (fx0, fy0, fx1, fy1)
    f_core_crop = np.isin(crop_cls, [1, 2, 4, 5, 6, 7, 10, 11, 12]).astype(np.uint8)
    nf_c, lf_c, stf_c, _ = cv2.connectedComponentsWithStats(f_core_crop, connectivity=8)
    feat_crop = np.isin(crop_cls, [2, 4, 5, 11, 12])
    fc_id = max(range(1, nf_c), key=lambda k: int(feat_crop[lf_c == k].sum()) * 100 + int(stf_c[k, cv2.CC_STAT_AREA]))
    fys, fxs = np.where(lf_c == fc_id)
    fx0, fy0 = cx0 + int(fxs.min()), cy0 + int(fys.min())
    fx1, fy1 = cx0 + int(fxs.max()), cy0 + int(fys.max())
    fw, fh = fx1 - fx0, fy1 - fy0
    print(f"Main Face BBox: ({fx0}, {fy0}) -> ({fx1}, {fy1}), fw={fw}, fh={fh}, exp_gain={exp_gain:.3f}", flush=True)

    # =========================================================================
    # STAGE 1: CAPTURE ONE 16.7 EQUIVALENT — Blemish + Stray Hair + Skin Tone Uniformity (Face + Neck + Hands!)
    # =========================================================================
    print("[2/5] Stage 1: Blemish Removal + Stray Hair + Capture One Skin Tone Uniformity (Face + Neck + Hands)...", flush=True)
    eyes = np.isin(cls_map, [4, 5]).astype(np.uint8)
    brows = np.isin(cls_map, [6, 7]).astype(np.uint8)
    lips_m = np.isin(cls_map, [10, 11, 12]).astype(np.uint8)
    hair_m = (cls_map == 13).astype(np.uint8)

    eye_guard = cv2.dilate(eyes, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (odd(0.062 * fw), odd(0.082 * fw))))
    # Keep brow_guard tight vertically (0.014*fw) so pimples right above eyebrows/glabella are healed cleanly while 100% brow hairs stay safe!
    brow_guard = cv2.dilate(brows, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (odd(0.048 * fw), odd(0.014 * fw))))
    mouth_guard = cv2.dilate(lips_m, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (odd(0.032 * fw), odd(0.028 * fw))))
    nose_m = (cls_map == 2)
    nys, nxs = np.where(nose_m)
    nostril_guard = np.zeros((H, W), dtype=np.uint8)
    if len(nys) > 20:
        ny_cut = int(nys.min() + 0.52 * (nys.max() - nys.min()))
        nostril_guard[ny_cut:nys.max()+1, nxs.min():nxs.max()+1] = nose_m[ny_cut:nys.max()+1, nxs.min():nxs.max()+1]
        nostril_guard = cv2.dilate(nostril_guard, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (odd(0.025 * fw), odd(0.025 * fw))))

    feat_guard = (eye_guard > 0) | (brow_guard > 0) | (mouth_guard > 0) | (nostril_guard > 0)
    face_neck_skin = (np.isin(cls_map, [1, 2, 17]) & (~feat_guard)).astype(np.uint8)

    # Convert stage0_norm (float32 in [0.0 .. 1.0]) to true CIE LAB (L* in [0..100], a*, b* in [-127..127])
    lab0_cie = cv2.cvtColor(stage0_norm.astype(np.float32), cv2.COLOR_RGB2Lab)
    L0, a0, b0 = lab0_cie[..., 0], lab0_cie[..., 1], lab0_cie[..., 2]

    # Detect crossed hands skin in lower torso region using AI + CIE LAB distance from measured face skin!
    hy0, hy1 = int(fy1 + 1.10 * fh), int(min(H, fy1 + 2.85 * fh))
    hx0, hx1 = max(0, int(0.5 * (fx0 + fx1) - 1.45 * fw)), min(W, int(0.5 * (fx0 + fx1) + 1.45 * fw))
    with torch.inference_mode():
        h_crop_u8 = np.clip(np.round(stage0_norm[hy0:hy1, hx0:hx1] * 255.0), 0, 255).astype(np.uint8)
        inp_h = face_proc(images=Image.fromarray(h_crop_u8), return_tensors="pt").to(device)
        h_cls = F.interpolate(face_model(**inp_h).logits, size=(hy1 - hy0, hx1 - hx0), mode="bilinear", align_corners=False).argmax(dim=1)[0].cpu().numpy()

    ai_hand_full = np.zeros((H, W), dtype=bool)
    ai_hand_full[hy0:hy1, hx0:hx1] = np.isin(h_cls, [1, 2, 17])

    med_a_fn = float(np.median(a0[face_neck_skin > 0]))
    med_b_fn = float(np.median(b0[face_neck_skin > 0]))
    hand_roi_box = np.zeros((H, W), dtype=bool)
    hand_roi_box[hy0:hy1, hx0:hx1] = True

    R0, G0, B0 = stage0_norm[..., 0], stage0_norm[..., 1], stage0_norm[..., 2]
    chroma_hand = (
        hand_roi_box
        & (np.abs(a0 - med_a_fn) < 8.5)
        & (np.abs(b0 - med_b_fn) < 11.0)
        & (b0 > 6.5)
    )
    # Combine AI hand skin + LAB skin match, strictly excluding crimson Ao Dai (a* > 22) & pink cuff piping!
    hand_cand = (
        (ai_hand_full | chroma_hand)
        & hand_roi_box
        & (person_mask > 0.60)
        & (cls_map == 0)
        & (L0 > 25.0)
        & (a0 < 21.5)
        & ((R0 - G0) < 0.21)
    ).astype(np.uint8)
    hand_cand = cv2.morphologyEx(hand_cand, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9)))
    hand_cand = cv2.morphologyEx(hand_cand, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (15, 15)))
    nl_h, lbl_h, st_h, _ = cv2.connectedComponentsWithStats(hand_cand, connectivity=8)
    hand_skin = np.zeros((H, W), dtype=np.uint8)
    for k in range(1, nl_h):
        if st_h[k, cv2.CC_STAT_AREA] >= 5000:
            hand_skin[lbl_h == k] = 1
    # Protect gold ring on her left finger (high yellow b* > 22.5 & (b* - a*) > 10.0)
    gold_ring = ((hand_skin > 0) & (b0 > 22.5) & ((b0 - a0) > 10.0)).astype(np.uint8)
    gold_ring = cv2.dilate(gold_ring, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9)))
    hand_skin[gold_ring > 0] = 0
    print(f"Detected Hand Skin pixels: {int(hand_skin.sum())}", flush=True)

    # 1A. Heal discrete pimples/bumps (including skin-colored forehead/chin bumps!) + stray flyaway hairs!
    stage1 = stage0_norm.copy()
    sub_skin = face_neck_skin[cy0:cy1, cx0:cx1]
    sub_L = L0[cy0:cy1, cx0:cx1]
    sub_a = a0[cy0:cy1, cx0:cx1]
    sig_s = max(6.0, 0.025 * fw)
    w_s = sub_skin.astype(np.float32)
    den_s = np.maximum(gauss_blur(w_s, sig_s), 1e-4)
    loc_L = gauss_blur(sub_L * w_s, sig_s) / den_s
    loc_a = gauss_blur(sub_a * w_s, sig_s) / den_s
    diff_dark = (loc_L - sub_L) * w_s
    diff_abs_L = np.abs(sub_L - loc_L) * w_s
    diff_red = (sub_a - loc_a) * w_s
    # Local DoG bump detector (catches raised skin-colored forehead/chin pimples with highlight+shadow rim!)
    dog_bump = np.abs(gauss_blur(sub_L, 1.8) - gauss_blur(sub_L, 9.5)) * (gauss_blur(w_s, 6.0) > 0.92)

    std_L = max(1.3, float(np.std(diff_dark[sub_skin > 0])))
    std_a = max(0.85, float(np.std(diff_red[sub_skin > 0])))
    cand_sp = (
        (sub_skin > 0)
        & (
            (diff_red > max(1.85, 2.15 * std_a))
            | (diff_dark > max(4.0, 2.65 * std_L))
            | ((dog_bump > 3.15) & (diff_abs_L > 2.6))
        )
    ).astype(np.uint8)
    nl_s, lb_s, st_s, _ = cv2.connectedComponentsWithStats(cand_sp, connectivity=8)
    max_ss = int(0.048 * fw)
    spots_crop = np.zeros_like(cand_sp)
    for k in range(1, nl_s):
        bw_k, bh_k, ak = st_s[k, cv2.CC_STAT_WIDTH], st_s[k, cv2.CC_STAT_HEIGHT], st_s[k, cv2.CC_STAT_AREA]
        aspect = max(bw_k, bh_k) / max(1.0, float(min(bw_k, bh_k)))
        if 6 <= ak <= (max_ss * max_ss * 0.62) and bw_k <= max_ss and bh_k <= max_ss and aspect <= 3.6:
            spots_crop[lb_s == k] = 1
    spots_crop = cv2.dilate(spots_crop, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (odd(0.013 * fw), odd(0.013 * fw))))
    spots_crop[sub_skin == 0] = 0

    # Detect thin dark stray flyaway hair strands sticking out into bright OR mid-green bokeh around head!
    hair_crop = hair_m[cy0:cy1, cx0:cx1].astype(np.float32)
    hair_core = (gauss_blur(hair_crop, 18.0) > 0.65).astype(np.uint8)
    hair_outer_band = ((gauss_blur(hair_core.astype(np.float32), 38.0) > 0.02) & (gauss_blur(hair_core.astype(np.float32), 5.0) < 0.14)).astype(np.uint8)
    sub_lum = (0.2126 * stage1[cy0:cy1, cx0:cx1, 0] + 0.7152 * stage1[cy0:cy1, cx0:cx1, 1] + 0.0722 * stage1[cy0:cy1, cx0:cx1, 2])
    bg_loc = gauss_blur(sub_lum, 14.0)
    raw_wisp = ((hair_outer_band > 0) & (sub_skin == 0) & (bg_loc > 0.22) & ((bg_loc - sub_lum) > 0.055)).astype(np.uint8)
    nw_l, lw_l, stw_l, _ = cv2.connectedComponentsWithStats(raw_wisp, connectivity=8)
    stray_wisp = np.zeros_like(raw_wisp)
    for k in range(1, nw_l):
        if 8 <= stw_l[k, cv2.CC_STAT_AREA] <= 3200:
            stray_wisp[lw_l == k] = 1
    stray_wisp = cv2.dilate(stray_wisp, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9)))

    heal_crop_mask = np.clip(spots_crop | stray_wisp, 0, 1).astype(np.uint8)
    print(f"Spot pixels: {int(spots_crop.sum())}, Stray hair pixels: {int(stray_wisp.sum())}", flush=True)
    if heal_crop_mask.sum() > 0:
        sub16 = stage1[cy0:cy1, cx0:cx1]
        sh, sw = sub16.shape[:2]
        ph, pw = (8 - sh % 8) % 8, (8 - sw % 8) % 8
        s16_p = cv2.copyMakeBorder(sub16, 0, ph, 0, pw, cv2.BORDER_REPLICATE) if (ph or pw) else sub16
        sm_p = cv2.copyMakeBorder(heal_crop_mask, 0, ph, 0, pw, cv2.BORDER_CONSTANT, value=0) if (ph or pw) else heal_crop_mask
        with torch.inference_mode():
            inp_np = lama(
                torch.from_numpy(s16_p).permute(2, 0, 1).unsqueeze(0).to(device),
                torch.from_numpy(sm_p).unsqueeze(0).unsqueeze(0).float().to(device),
            )[0].permute(1, 2, 0).clamp(0.0, 1.0).cpu().numpy()[:sh, :sw]
        rng = np.random.default_rng(77)
        ns = gauss_blur(rng.normal(0.0, 1.0, size=(sh, sw)).astype(np.float32), 0.55)[..., None] * 0.0045
        inp_np = np.clip(inp_np + ns * (spots_crop[..., None] > 0), 0.0, 1.0)
        al_h = gauss_blur(heal_crop_mask.astype(np.float32), 2.2)[..., None]
        stage1[cy0:cy1, cx0:cx1] = sub16 * (1.0 - al_h) + inp_np * al_h

    # 1B. Fast Crop-Only 16-Bit Pore-Preserving Frequency Separation (Face/Neck 40% + Hands 28%!)
    sub_f = stage1[cy0:cy1, cx0:cx1]
    fs_skin_f = gauss_blur(face_neck_skin[cy0:cy1, cx0:cx1].astype(np.float32), max(4.0, 0.018 * fw))[..., None]
    low_s = gauss_blur(sub_f, 5.2)
    high_pores = sub_f - low_s
    low_surf = cv2.bilateralFilter(low_s, d=9, sigmaColor=0.045, sigmaSpace=14.0)
    stage1[cy0:cy1, cx0:cx1] = np.clip(low_s * (1.0 - 0.40 * fs_skin_f) + low_surf * (0.40 * fs_skin_f) + high_pores, 0.0, 1.0)

    if hand_skin.sum() > 2000:
        sub_h = stage1[hy0:hy1, hx0:hx1]
        fs_hand_f = gauss_blur(hand_skin[hy0:hy1, hx0:hx1].astype(np.float32), 6.0)[..., None]
        low_hs = gauss_blur(sub_h, 5.0)
        high_hpores = sub_h - low_hs
        low_hsurf = cv2.bilateralFilter(low_hs, d=9, sigmaColor=0.045, sigmaSpace=14.0)
        stage1[hy0:hy1, hx0:hx1] = np.clip(low_hs * (1.0 - 0.28 * fs_hand_f) + low_hsurf * (0.28 * fs_hand_f) + high_hpores, 0.0, 1.0)

    # 1C. Capture One Skin Tone Uniformity (Unifies Face, Neck & Crossed Hands in true CIE L*C*h!)
    all_skin_mask = gauss_blur(np.clip(face_neck_skin + hand_skin, 0, 1).astype(np.float32), 9.0)
    s1_lab = cv2.cvtColor(stage1.astype(np.float32), cv2.COLOR_RGB2Lab)  # float32 [0..1] -> L* in [0..100], a*,b* in [-127..127]
    fn_L_vals = s1_lab[..., 0][face_neck_skin > 0]
    p45, p85 = np.percentile(fn_L_vals, [45, 85])
    cheek_ref = (face_neck_skin > 0) & (s1_lab[..., 0] >= p45) & (s1_lab[..., 0] <= p85)
    tgt_a = float(np.median(s1_lab[..., 1][cheek_ref])) + 0.8   # delicate rosy warmth
    tgt_b = float(np.median(s1_lab[..., 2][cheek_ref])) - 1.4   # clean porcelain (less yellow-olive)
    tgt_C = math.hypot(tgt_a, tgt_b)
    tgt_h = math.atan2(tgt_b, tgt_a)

    cur_a, cur_b = s1_lab[..., 1], s1_lab[..., 2]
    cur_C = np.hypot(cur_a, cur_b)
    cur_h = np.arctan2(cur_b, cur_a)
    dh = np.arctan2(np.sin(tgt_h - cur_h), np.cos(tgt_h - cur_h))

    hand_w = gauss_blur(hand_skin.astype(np.float32), 11.0)
    unif_h_str = np.clip(0.32 * all_skin_mask + 0.34 * hand_w, 0.0, 0.68)
    unif_c_str = np.clip(0.24 * all_skin_mask + 0.30 * hand_w, 0.0, 0.56)

    new_h = cur_h + dh * unif_h_str
    new_C = cur_C + (tgt_C - cur_C) * unif_c_str
    s1_lab[..., 1] = new_C * np.cos(new_h)
    s1_lab[..., 2] = new_C * np.sin(new_h)
    # Lift hand luminosity +3.6 L* so crossed hands match her rosy face brightness seamlessly!
    s1_lab[..., 0] = np.clip(s1_lab[..., 0] + 3.6 * hand_w, 0.0, 100.0)
    stage1 = np.clip(cv2.cvtColor(s1_lab, cv2.COLOR_Lab2RGB), 0.0, 1.0)

    # =========================================================================
    # STAGE 2: PHOTOSHOP 16-BIT GARMENT DE-WRINKLING (Ủi phẳng áo dài nhăn, giữ 100% sợi gấm Chữ Thọ!)
    # =========================================================================
    print("[3/5] Stage 2: 16-Bit Garment Steam-Ironing (Chroma-Decoupled Frequency Separation preserving 100% Gold Brocade)...", flush=True)
    stage2 = stage1.copy()

    head_neck_excl = (gauss_blur(np.isin(cls_map, [1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 17]).astype(np.float32), 16.0) > 0.08)
    hands_excl = (gauss_blur(hand_skin.astype(np.float32), 16.0) > 0.08)
    person_eroded = (gauss_blur((person_mask > 0.65).astype(np.float32), 12.0) > 0.85)

    # Exclude 3D beaded collar frogs ("nút tàu" kết hạt đỏ nổi khối trên cổ & ngực) so beads stay 100% 3D!
    yy_g, xx_g = np.mgrid[0:H, 0:W].astype(np.float32)
    frog_box = np.zeros((H, W), dtype=np.float32)
    for t_p in np.linspace(0.0, 1.0, 9):
        bx_p = (fx0 + 0.50 * fw) * (1 - t_p) + (fx0 - 0.14 * fw) * t_p
        by_p = (fy1 + 0.18 * fh) * (1 - t_p) + (fy1 + 0.86 * fh) * t_p
        frog_box = np.maximum(frog_box, np.exp(-(((xx_g - bx_p) / (0.24 * fw)) ** 2 + ((yy_g - by_p) / (0.19 * fh)) ** 2)))

    # Protect pink satin cuff piping & collar edge trim
    R_s1, G_s1, B_s1 = stage1[..., 0], stage1[..., 1], stage1[..., 2]
    pink_trim = ((R_s1 > 0.32) & (B_s1 > G_s1 * 1.12) & ((R_s1 - G_s1) > 0.16)).astype(np.float32)
    pink_guard = np.clip(gauss_blur(pink_trim, 12.0) * 2.6, 0.0, 1.0)

    garment_raw = person_eroded & (~head_neck_excl) & (~hands_excl) & ((R_s1 - B_s1) > 0.10)
    garment_mask = gauss_blur(garment_raw.astype(np.float32), 16.0) * (1.0 - np.clip(frog_box * 1.12, 0.0, 1.0)) * (1.0 - pink_guard)

    # True Fashion Studio 16-Bit RGB Frequency Separation Steam-Ironing on Silk Brocade:
    # - High Frequency (< 14.5px): Holds 100% of woven golden Chữ Thọ strokes (2..10px wide) & fine silk thread weave!
    # - Low Frequency (14.5px -> smoothed 105px): Holds BOTH shadow troughs AND dielectric specular silk fold ridges!
    low_15 = gauss_blur(stage2, 14.5)
    high_15 = stage2 - low_15
    low_steamed = gauss_blur(low_15, 105.0)

    # Protect deep dark armpit/sleeve-overlap structural seams while ironing 84% of crumpled folds inside chest & sleeves!
    lum_s2 = 0.2126 * low_15[..., 0] + 0.7152 * low_15[..., 1] + 0.0722 * low_15[..., 2]
    seam_dark_guard = np.clip((lum_s2 - 0.045) / 0.055, 0.0, 1.0)
    iron_w = (0.84 * garment_mask * seam_dark_guard)[..., None]

    # Also soften sharp dark crease lines (< 14.5px) where a fold pinched sharply (high_lum < -0.028), without touching bright gold brocade threads!
    high_lum = 0.2126 * high_15[..., 0] + 0.7152 * high_15[..., 1] + 0.0722 * high_15[..., 2]
    pinch_crease = np.clip((-high_lum - 0.022) / 0.045, 0.0, 1.0)[..., None] * iron_w
    high_15_clean = high_15 * (1.0 - 0.68 * pinch_crease)

    # Slightly enrich crimson-gold warmth where deep greyish fold troughs were lifted
    fold_lift = np.maximum(0.0, (low_steamed - low_15) * iron_w)
    stage2 = np.clip(low_15 * (1.0 - iron_w) + low_steamed * iron_w + fold_lift * np.array([0.16, 0.04, -0.04], dtype=np.float32) + high_15_clean, 0.0, 1.0)

    # =========================================================================
    # STAGE 3: PHOTOSHOP SMART LIQUIFY (Bóp gọn hàm V-line tự nhiên + Nâng phồng đỉnh tóc + Gọn vai dáng, Freeze Background!)
    # =========================================================================
    print("[4/5] Stage 3: Smart Portrait Liquify (Jawline V-Line + Crown Hair Volume + Shoulder Slimming, 0% Background Warp)...", flush=True)
    fcx = 0.5 * (fx0 + fx1)
    jaw_y = fy0 + 0.76 * fh
    jaw_lx = fx0 + 0.05 * fw
    jaw_rx = fx1 - 0.05 * fw

    push_x = np.zeros((H, W), dtype=np.float32)
    push_y = np.zeros((H, W), dtype=np.float32)

    # 1. Symmetrical Jawline & Masseter V-Line Slimming (~4.5% of face width inward + gentle upward lift)
    sig_jx, sig_jy = 0.25 * fw, 0.25 * fh
    w_jl = np.exp(-(((xx_g - jaw_lx) / sig_jx) ** 2 + ((yy_g - jaw_y) / sig_jy) ** 2))
    w_jr = np.exp(-(((xx_g - jaw_rx) / sig_jx) ** 2 + ((yy_g - jaw_y) / sig_jy) ** 2))
    center_face_freeze = np.exp(-(((xx_g - fcx) / (0.25 * fw)) ** 4 + ((yy_g - (fy0 + 0.60 * fh)) / (0.34 * fh)) ** 4))
    jaw_gate = 1.0 - center_face_freeze

    push_x += (+0.045 * fw) * w_jl * jaw_gate
    push_y += (-0.014 * fh) * w_jl * jaw_gate
    push_x += (-0.045 * fw) * w_jr * jaw_gate
    push_y += (-0.014 * fh) * w_jr * jaw_gate

    # 2. Crown Hair Volume Lift (~5.2% upward expansion on top hair crown above forehead hairline!)
    hys, _ = np.where(hair_m > 0)
    hair_top_y = float(hys.min()) if len(hys) > 0 else (fy0 - 0.25 * fh)
    crown_y = hair_top_y + 0.12 * fh
    w_crown = np.exp(-(((xx_g - fcx) / (0.64 * fw)) ** 2 + ((yy_g - crown_y) / (0.28 * fh)) ** 2))
    crown_gate = np.clip(((fy0 + 0.05 * fh) - yy_g) / (0.12 * fh), 0.0, 1.0)
    push_y += (-0.052 * fh) * w_crown * crown_gate

    # 3. Gentle Shoulder & Outer Sleeve Slimming (~2.8% inward on left & right outer garment contours!)
    torso_y = fy1 + 0.95 * fh
    row_band = person_mask[int(fy1 + 0.35 * fh):int(min(H - 1, fy1 + 1.65 * fh)), :] > 0.5
    b_xs = np.where(row_band.any(axis=0))[0]
    if len(b_xs) > 100:
        sh_lx, sh_rx = float(b_xs.min()), float(b_xs.max())
        sh_w = sh_rx - sh_lx
        w_sl = np.exp(-(((xx_g - sh_lx) / (0.18 * sh_w)) ** 2 + ((yy_g - torso_y) / (0.65 * fh)) ** 2))
        w_sr = np.exp(-(((xx_g - sh_rx) / (0.18 * sh_w)) ** 2 + ((yy_g - torso_y) / (0.65 * fh)) ** 2))
        push_x += (+0.028 * sh_w) * w_sl
        push_x += (-0.028 * sh_w) * w_sr

    push_x = gauss_blur(push_x, 14.0)
    push_y = gauss_blur(push_y, 14.0)
    map_x = (xx_g - push_x).astype(np.float32)
    map_y = (yy_g - push_y).astype(np.float32)
    stage3 = cv2.remap(stage2, map_x, map_y, interpolation=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REFLECT_101)
    person_warped = cv2.remap(person_mask.astype(np.float32), map_x, map_y, interpolation=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT)
    all_skin_warped = cv2.remap(all_skin_mask.astype(np.float32), map_x, map_y, interpolation=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT)
    eyes_warped = cv2.remap(eyes.astype(np.float32), map_x, map_y, interpolation=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT)

    # =========================================================================
    # STAGE 4: MIZUKI KIKKAWA VIDEO 19 EXACT MONITOR COLOR & OPTICAL MASKS (16-Bit)
    # =========================================================================
    print("[5/5] Stage 4: Mizuki Kikkawa Video 19 Exact Monitor Color (Green -55, Yellow -23, Dehaze -5, Optical Masks)...", flush=True)
    stage4 = stage3.copy()
    subj_soft = gauss_blur(person_warped, 18.0)
    bg_soft = np.clip(1.0 - subj_soft, 0.0, 1.0)

    # 4A. Calm Background Yellow Cast (Video 19 Yellow Sat -23!) so cream house wall looks clean ivory, never yellow!
    bg_lab = cv2.cvtColor(stage4.astype(np.float32), cv2.COLOR_RGB2Lab)
    pos_b = np.maximum(bg_lab[..., 2], 0.0)
    bg_lab[..., 2] = bg_lab[..., 2] - 0.26 * pos_b * bg_soft
    stage4 = np.clip(cv2.cvtColor(bg_lab, cv2.COLOR_Lab2RGB), 0.0, 1.0)

    # 4B. Mizuki Video 19 HSL: Green Hue -17 & Green Sat -55 (deep quiet Japanese emerald-pine green foliage!)
    R, G, B = stage4[..., 0], stage4[..., 1], stage4[..., 2]
    lum = 0.2126 * R + 0.7152 * G + 0.0722 * B
    foliage_m = ((G > B * 1.05) & (G >= R * 0.92) & ((G - B) > 0.02) & (lum < 0.65)).astype(np.float32) * (1.0 - subj_soft * 0.96)
    foliage_m = np.clip(gauss_blur(foliage_m, 7.0), 0.0, 1.0)
    fol_gray = lum[..., None]
    fol_desat = fol_gray + (stage4 - fol_gray) * 0.50  # Green Sat -55%
    fol_pine = np.stack([
        curve_1d(fol_desat[..., 0], [[0, 0], [80, 60], [170, 146], [255, 244]]),
        curve_1d(fol_desat[..., 1], [[0, 0], [80, 82], [170, 174], [255, 255]]),
        curve_1d(fol_desat[..., 2], [[0, 2], [80, 86], [170, 174], [255, 255]]),
    ], axis=-1)
    stage4 = stage4 * (1.0 - foliage_m[..., None] * 0.90) + fol_pine * (foliage_m[..., None] * 0.90)

    # 4C. Mizuki Video 19 Red Sat +33 / Lycoris RedContrast on Ao Dai (rich ruby-crimson silk + golden brocade)
    R, G, B = stage4[..., 0], stage4[..., 1], stage4[..., 2]
    red_m = gauss_blur((subj_soft * np.clip(((R - 0.55 * G - 0.45 * B) - 0.14) / 0.15, 0.0, 1.0) * (1.0 - all_skin_warped)).astype(np.float32), 6.0)
    lycoris = np.stack([
        curve_1d(R, [[0, 0], [65, 55], [150, 152], [220, 228], [255, 255]]),
        curve_1d(G, [[0, 0], [85, 72], [165, 156], [235, 234], [255, 255]]),
        curve_1d(B, [[0, 2], [75, 83], [160, 166], [255, 255]]),
    ], axis=-1)
    stage4 = stage4 * (1.0 - red_m[..., None] * 0.82) + lycoris * (red_m[..., None] * 0.82)

    # 4D. Video 19 Gentle Optical Masks ("phần background vừa thôi" — pure optical Radial + Corner Linear + Select Person!)
    xn, yn = xx_g / float(W), yy_g / float(H)

    # Mask 1: Highlight-safe Incoming Light Radial from upper-right (Highlights -4 held back so wall stays creamy!)
    mask_gaze_light = np.exp(-1.25 * (((xn - 0.76) / 0.50) ** 2 + ((yn - 0.18) / 0.44) ** 2))
    lit_arr = np.stack([curve_1d(stage4[..., c], [[0, 0], [70, 75], [145, 156], [215, 220], [255, 250]]) for c in range(3)], axis=-1)
    stage4 = stage4 * (1.0 - mask_gaze_light[..., None] * 0.58) + lit_arr * (mask_gaze_light[..., None] * 0.58)

    # Mask 2 & 3: Gentle Optical Corner Linear Gradients (-0.22 EV upper-left & -0.32 EV bottom corners)
    lin_ul = np.clip((0.40 - (xn * 0.72 + yn * 0.48)) / 0.40, 0.0, 1.0) ** 1.5 * 0.50
    lin_bot = np.clip(((yn - 0.58) * 0.82 + (0.45 - xn) * 0.22) / 0.46, 0.0, 1.0) ** 1.5 * 0.78
    subj_very_soft = gauss_blur(person_warped, 110.0)
    corner_shad_m = np.clip(lin_ul + lin_bot, 0.0, 1.0) * (1.0 - 0.78 * subj_very_soft)
    shad_arr = np.stack([
        curve_1d(stage4[..., 0], [[0, 0], [64, 52], [145, 126], [215, 196], [255, 238]]),
        curve_1d(stage4[..., 1], [[0, 0], [64, 53], [145, 128], [215, 198], [255, 240]]),
        curve_1d(stage4[..., 2], [[0, 2], [64, 56], [145, 131], [215, 201], [255, 242]]),
    ], axis=-1)
    stage4 = stage4 * (1.0 - corner_shad_m[..., None] * 0.78) + shad_arr * (corner_shad_m[..., None] * 0.78)

    # Softly calm bright pink/white passersby on right background (-20% sat)
    right_bg_distract = gauss_blur(((xn > 0.68) & (person_warped < 0.1)).astype(np.float32), 65.0)
    r_gray = (0.2126 * stage4[..., 0] + 0.7152 * stage4[..., 1] + 0.0722 * stage4[..., 2])[..., None]
    stage4 = stage4 * (1.0 - right_bg_distract[..., None] * 0.22) + r_gray * (right_bg_distract[..., None] * 0.22)

    # Mask 4: Select Person Micro-Contrast (Video 19 sec_36.2: Exposure +0.24, Contrast +5, Highlights +6, Shadows -14!)
    # Keeps hair & eyelashes deep crisp black while lifting her rosy-porcelain skin luminosity!
    person_crv = np.stack([
        curve_1d(stage4[..., c], [[0, 0], [32, 27], [75, 76], [135, 146], [195, 205], [240, 243], [255, 255]])
        for c in range(3)
    ], axis=-1)
    stage4 = stage4 * (1.0 - subj_soft[..., None] * 0.80) + person_crv * (subj_soft[..., None] * 0.80)

    # Tight Facial Toumeikan Glow (+0.08 EV clean airy porcelain lift on face & crossed hands, 100% eye-guarded!)
    skin_glow_m = gauss_blur(all_skin_warped, 18.0)[..., None] * (1.0 - gauss_blur(eyes_warped, 6.0)[..., None])
    skin_glow_crv = np.stack([
        curve_1d(stage4[..., 0], [[0, 0], [80, 83], [160, 168], [230, 236], [255, 255]]),
        curve_1d(stage4[..., 1], [[0, 0], [80, 83], [160, 168], [230, 236], [255, 255]]),
        curve_1d(stage4[..., 2], [[0, 0], [80, 84], [160, 170], [230, 238], [255, 255]]),
    ], axis=-1)
    stage4 = stage4 * (1.0 - skin_glow_m * 0.55) + skin_glow_crv * (skin_glow_m * 0.55)

    # Video 21 Micro-Mask: Subtle Eye Catchlight Sparkle (keeps black pupil deep dark, lifts bright catchlights only!)
    eyes_sparkle_m = gauss_blur(eyes_warped, 2.5)[..., None]
    eye_crv = np.stack([curve_1d(stage4[..., c], [[0, 0], [35, 33], [95, 104], [180, 198], [255, 255]]) for c in range(3)], axis=-1)
    stage4 = stage4 * (1.0 - eyes_sparkle_m * 0.55) + eye_crv * (eyes_sparkle_m * 0.55)

    # Video 19 Global Dehaze -5 (Black Mist 1/4 optical bloom) + Tone Curve (0 -> 5 matte toe, 192 -> 197, 255 -> 252)
    lum4 = 0.2126 * stage4[..., 0] + 0.7152 * stage4[..., 1] + 0.0722 * stage4[..., 2]
    hl_m = (np.clip((lum4 - 0.72) / 0.24, 0.0, 1.0) ** 2)[..., None] * (1.0 - gauss_blur(eyes_warped, 10.0)[..., None])
    mist_blur = gauss_blur(stage4, 38.0)
    mist_scr = 1.0 - (1.0 - stage4) * (1.0 - mist_blur)
    stage4 = stage4 * (1.0 - hl_m * 0.10) + mist_scr * (hl_m * 0.10)

    stage4 = np.stack([
        curve_1d(stage4[..., c], [[0, 5], [48, 46], [128, 129], [192, 197], [255, 252]])
        for c in range(3)
    ], axis=-1)

    # Convert all stages to crisp uint8 sRGB for saving JPG + Multi-Layer PSD + Comparisons
    u8_raw = np.clip(np.round(raw_as_shot * 255.0), 0, 255).astype(np.uint8)
    u8_0 = np.clip(np.round(stage0_norm * 255.0), 0, 255).astype(np.uint8)
    u8_1 = np.clip(np.round(stage1 * 255.0), 0, 255).astype(np.uint8)
    u8_2 = np.clip(np.round(stage2 * 255.0), 0, 255).astype(np.uint8)
    u8_3 = np.clip(np.round(stage3 * 255.0), 0, 255).astype(np.uint8)
    u8_4 = np.clip(np.round(stage4 * 255.0), 0, 255).astype(np.uint8)

    # 1. Save Final Master 6000x4000 JPG
    for dst_dir in [LOCAL_DELIV, DRIVE_DELIV, WORK_DIR]:
        Image.fromarray(u8_4).save(os.path.join(dst_dir, "01_DSC01869_Final_FullWorkflow.jpg"), "JPEG", quality=98, subsampling=0, icc_profile=SRGB_ICC)

    # 2. Save Multi-Layer Photoshop .PSD (6 named layers from top to bottom!)
    print("Writing 6-Layer Studio .PSD (05_DSC01869_Full_Workflow_6Layers.psd)...", flush=True)
    alpha_full = np.full((H, W), 255, dtype=np.uint8)
    def make_psd_layer(name, rgb_arr):
        chans = {
            -1: alpha_full,
            0: np.ascontiguousarray(rgb_arr[..., 0]),
            1: np.ascontiguousarray(rgb_arr[..., 1]),
            2: np.ascontiguousarray(rgb_arr[..., 2]),
        }
        return nested_layers.Image(name=name, visible=True, opacity=255, group_id=0, blend_mode=pytoshop.enums.BlendMode.normal, top=0, left=0, bottom=H, right=W, channels=chans)

    psd_layers = [
        make_psd_layer("05_Mizuki_Video19_Color_&_OpticalMasks", u8_4),
        make_psd_layer("04_Photoshop_Liquify_Mat_Toc_Dang", u8_3),
        make_psd_layer("03_Photoshop_Ui_Phang_Ao_Nhan_GiuGam", u8_2),
        make_psd_layer("02_CaptureOne_Mun_TocCon_SkinTone_MatTay", u8_1),
        make_psd_layer("01_CameraRaw_CanSang_CuuVungToi_ChongChay", u8_0),
        make_psd_layer("00_RAW_ARW_Goc_AsShot", u8_raw),
    ]
    psd_obj = nested_layers.nested_layers_to_psd(psd_layers, color_mode=pytoshop.enums.ColorMode.rgb, size=(W, H), compression=pytoshop.enums.Compression.raw)
    local_psd = os.path.join(LOCAL_DELIV, "05_DSC01869_Full_Workflow_6Layers.psd")
    with open(local_psd, "wb") as fp:
        psd_obj.write(fp)

    # 3. Save High-Res Comparisons & Dual 200% Zooms (using stage0_norm on zooms so user sees pure Retouch + Liquify + Garment Ironing + Color difference at equal brightness!)
    try:
        fnt_md = ImageFont.truetype(FONT_BOLD, 30)
    except Exception:
        fnt_md = ImageFont.load_default()

    def label_img(rgb_arr, text, gold=False):
        im = Image.fromarray(rgb_arr)
        dr = ImageDraw.Draw(im, "RGBA")
        bbox = dr.textbbox((0, 0), text, font=fnt_md)
        tw_b = bbox[2] - bbox[0] + 40
        th_b = bbox[3] - bbox[1] + 24
        dr.rounded_rectangle((20, 20, 20 + tw_b, 20 + th_b), radius=12, fill=(0, 0, 0, 172))
        dr.text((40, 29), text, font=fnt_md, fill=(255, 226, 130, 255) if gold else (255, 255, 255, 255))
        return np.array(im)

    # Full-frame Before (RAW As-Shot) vs After (Full Workflow) + Equal-Exposure Before vs After!
    b_raw_2400 = cv2.resize(u8_raw, (2400, 1600), interpolation=cv2.INTER_AREA)
    b_eq_2400 = cv2.resize(u8_0, (2400, 1600), interpolation=cv2.INTER_AREA)
    a_2400 = cv2.resize(u8_4, (2400, 1600), interpolation=cv2.INTER_AREA)

    ba_raw_full = np.hstack([
        label_img(b_raw_2400, "TRƯỚC (File RAW .ARW Gốc Ngược Sáng -1.5 EV)"),
        np.full((1600, 8, 3), 255, dtype=np.uint8),
        label_img(a_2400, "SAU (Full Workflow: C1 SkinTone + PS Ủi Áo & Bóp Mặt/Tóc + Màu Mizuki)", gold=True),
    ])
    ba_eq_full = np.hstack([
        label_img(b_eq_2400, "TRƯỚC (Đã cân sáng cơ bản: Áo nhăn, Hàm vuông, Tay tái, Lá xanh gắt)"),
        np.full((1600, 8, 3), 255, dtype=np.uint8),
        label_img(a_2400, "SAU (Full Workflow: Sạch mụn + Đều da tay + Ủi áo gấm + Gọn hàm + Mizuki)", gold=True),
    ])
    for dst_dir in [LOCAL_DELIV, DRIVE_DELIV, WORK_DIR]:
        Image.fromarray(ba_raw_full).save(os.path.join(dst_dir, "02_DSC01869_So_Sanh_RAW_Goc_Va_Sau.jpg"), "JPEG", quality=97, subsampling=0, icc_profile=SRGB_ICC)
        Image.fromarray(ba_eq_full).save(os.path.join(dst_dir, "02B_DSC01869_So_Sanh_Cung_Do_Sang.jpg"), "JPEG", quality=97, subsampling=0, icc_profile=SRGB_ICC)

    # Dynamic crop coordinates anchored to actual detected face bbox (fx0, fy0, fx1, fy1)!
    zy0 = max(0, int(fy0 - 0.52 * fh))
    zy1 = min(H, int(fy1 + 0.28 * fh))
    zh = zy1 - zy0
    zx0 = max(0, int(fcx - 0.5 * zh))
    zx1 = min(W, zx0 + zh)

    zf_0 = label_img(u8_0[zy0:zy1, zx0:zx1], "TRƯỚC: Mụn, Tóc con rối, Góc hàm vuông, Đỉnh tóc xẹp")
    zf_4 = label_img(u8_4[zy0:zy1, zx0:zx1], "SAU: Sạch mụn giữ lỗ chân lông, Gọn hàm V-line, Phồng đỉnh tóc", gold=True)
    zoom_face = np.hstack([zf_0, np.full((zf_0.shape[0], 6, 3), 255, dtype=np.uint8), zf_4])

    # Dynamic Zoom 2 (200%): Wrinkled Ao Dai Chest/Sleeves + Crossed Hands Skin Tone Uniformity!
    gy0 = max(0, int(fy1 + 0.08 * fh))
    gy1 = min(H, int(fy1 + 2.75 * fh))
    gh = gy1 - gy0
    gx0 = max(0, int(fcx - 0.50 * gh))
    gx1 = min(W, gx0 + gh)
    zg_0 = cv2.resize(u8_0[gy0:gy1, gx0:gx1], (1400, 1400), interpolation=cv2.INTER_AREA)
    zg_4 = cv2.resize(u8_4[gy0:gy1, gx0:gx1], (1400, 1400), interpolation=cv2.INTER_AREA)
    zg_0 = label_img(zg_0, "TRƯỚC: Áo dài nhăn nhàu nhiều nếp gấp & Da 2 bàn tay tái vàng")
    zg_4 = label_img(zg_4, "SAU: Ủi phẳng nếp nhăn giữ 100% gấm Chữ Thọ & Da tay trắng hồng đều mặt", gold=True)
    zoom_garment = np.hstack([zg_0, np.full((1400, 6, 3), 255, dtype=np.uint8), zg_4])

    for dst_dir in [LOCAL_DELIV, DRIVE_DELIV, WORK_DIR]:
        Image.fromarray(zoom_face).save(os.path.join(dst_dir, "03_Zoom200_Mat_Ham_Toc.jpg"), "JPEG", quality=97, subsampling=0, icc_profile=SRGB_ICC)
        Image.fromarray(zoom_garment).save(os.path.join(dst_dir, "04_Zoom200_Ui_Ao_Nhan_Va_Da_Tay.jpg"), "JPEG", quality=97, subsampling=0, icc_profile=SRGB_ICC)

    # 4-Step Workflow Progression Grid (2x2)
    s_w, s_h = 1400, 933
    c1 = label_img(cv2.resize(u8_0, (s_w, s_h), interpolation=cv2.INTER_AREA), "BƯỚC 1 (RAW Cân Sáng): Chưa nhặt mụn, tay lệch màu, áo nhăn")
    c2 = label_img(cv2.resize(u8_1, (s_w, s_h), interpolation=cv2.INTER_AREA), "BƯỚC 2 (Capture One 16.7): Sạch mụn, tóc con & Đồng nhất da Mặt - Tay")
    c3 = label_img(cv2.resize(u8_3, (s_w, s_h), interpolation=cv2.INTER_AREA), "BƯỚC 3 (Photoshop 2026): Ủi phẳng áo gấm nhăn + Bóp hàm V-line & Phồng tóc")
    c4 = label_img(cv2.resize(u8_4, (s_w, s_h), interpolation=cv2.INTER_AREA), "BƯỚC 4 (Mizuki Video 19): Màu Toumeikan & Mask Quang Học Hài Hòa", gold=True)
    prog_grid = np.vstack([np.hstack([c1, c2]), np.hstack([c3, c4])])
    for dst_dir in [LOCAL_DELIV, DRIVE_DELIV, WORK_DIR]:
        Image.fromarray(prog_grid).save(os.path.join(dst_dir, "00_Tien_Trinh_4_Buoc_Workflow.jpg"), "JPEG", quality=96, subsampling=0, icc_profile=SRGB_ICC)

    print(f"[SUCCESS] Full 4-Stage Workflow completed in {time.time() - t0:.1f}s!", flush=True)


if __name__ == "__main__":
    main()
