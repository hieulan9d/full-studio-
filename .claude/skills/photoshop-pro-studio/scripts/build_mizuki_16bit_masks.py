import os
import cv2
import numpy as np

BASE_DIR = r"d:\AI\full studio\output\beauty_dsc01733"
MASK_DIR = os.path.join(BASE_DIR, "mizuki_masks")
os.makedirs(MASK_DIR, exist_ok=True)


def guided_filter_gray(I, p, r, eps):
    """Fast edge-aware guided filter in float32 [0..1]."""
    mean_I = cv2.boxFilter(I, cv2.CV_32F, (2 * r + 1, 2 * r + 1))
    mean_p = cv2.boxFilter(p, cv2.CV_32F, (2 * r + 1, 2 * r + 1))
    mean_Ip = cv2.boxFilter(I * p, cv2.CV_32F, (2 * r + 1, 2 * r + 1))
    cov_Ip = mean_Ip - mean_I * mean_p
    mean_II = cv2.boxFilter(I * I, cv2.CV_32F, (2 * r + 1, 2 * r + 1))
    var_I = mean_II - mean_I * mean_I
    a = cov_Ip / (var_I + eps)
    b = mean_p - a * mean_I
    mean_a = cv2.boxFilter(a, cv2.CV_32F, (2 * r + 1, 2 * r + 1))
    mean_b = cv2.boxFilter(b, cv2.CV_32F, (2 * r + 1, 2 * r + 1))
    return np.clip(mean_a * I + mean_b, 0.0, 1.0)


def save_u16_mask(name, arr_f32):
    arr_u16 = np.clip(np.round(arr_f32 * 65535.0), 0, 65535).astype(np.uint16)
    out_path = os.path.join(MASK_DIR, name)
    cv2.imwrite(out_path, arr_u16)
    print(f"Saved {name}: min={arr_f32.min():.3f}, max={arr_f32.max():.3f}, mean={arr_f32.mean():.3f}")
    return out_path


def main():
    print("Loading 16-bit ACR base image (6000x4000)...")
    bgr16 = cv2.imread(os.path.join(BASE_DIR, "30_clean_acr_16bit.png"), cv2.IMREAD_UNCHANGED)
    H, W = bgr16.shape[:2]
    rgb = bgr16[:, :, ::-1].astype(np.float32) / 65535.0
    R, G, B = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    lum = 0.2126 * R + 0.7152 * G + 0.0722 * B

    bg_raw = cv2.imread(os.path.join(BASE_DIR, "21_dualraw_bg_mask.png"), cv2.IMREAD_GRAYSCALE).astype(np.float32) / 255.0
    fs_skin = cv2.imread(os.path.join(BASE_DIR, "12_native_fs_mask.png"), cv2.IMREAD_GRAYSCALE).astype(np.float32) / 255.0
    full_skin_raw = cv2.imread(os.path.join(BASE_DIR, "20_dualraw_skin_mask.png"), cv2.IMREAD_GRAYSCALE).astype(np.float32) / 255.0
    subject_mask = 1.0 - bg_raw

    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    xn = xx / float(W)
    yn = yy / float(H)

    # -------------------------------------------------------------------------
    # Exact flower stems & blossoms in vase (strictly above bottom frame y < 2360)
    # -------------------------------------------------------------------------
    vase_roi = np.zeros((H, W), dtype=np.float32)
    vase_roi[860:2460, 3160:4440] = 1.0
    # True green stems/leaves: G >= R*0.97 and G > B*1.06 (excludes red/blue/white painting & brown lines)
    vase_green_bool = (vase_roi > 0) & (G >= R * 0.96) & (G > B * 1.06) & (lum < 0.52) & (lum > 0.05)
    # Remove tiny isolated specks
    vase_green_u8 = cv2.morphologyEx(vase_green_bool.astype(np.uint8), cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    stem_prox = cv2.dilate(vase_green_u8, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (29, 29))) > 0
    # Purple blossoms directly attached to stems
    vase_petal_bool = stem_prox & (B > G * 1.02) & (R > G * 0.98) & (lum < 0.66) & (np.abs(R - B) < 0.14)
    vase_plant = cv2.GaussianBlur((vase_green_u8 > 0 | vase_petal_bool).astype(np.float32), (0, 0), 2.5)
    vase_plant = np.clip(vase_plant * 1.25, 0.0, 1.0)

    # -------------------------------------------------------------------------
    # 1. MASK 3 (Mizuki Background Minus Subject — Guided on Subject Silhouette Only, 0% Halo)
    # -------------------------------------------------------------------------
    lum_half = cv2.resize(lum, (W // 2, H // 2), interpolation=cv2.INTER_AREA)
    bg_half = cv2.resize(bg_raw, (W // 2, H // 2), interpolation=cv2.INTER_AREA)
    bg_guided = cv2.resize(guided_filter_gray(lum_half, bg_half, r=18, eps=2e-4), (W, H), interpolation=cv2.INTER_CUBIC)
    # Subtract delicate flower stems cleanly and gently taper on wooden tabletop
    table_top = np.exp(-(((xx - 3820.0) / 1080.0) ** 4 + ((yy - 3430.0) / 230.0) ** 4))
    mask3_bg = np.clip(bg_guided - vase_plant - 0.65 * table_top, 0.0, 1.0)
    save_u16_mask("mask3_bg_minus_subject_16bit.png", mask3_bg)

    # -------------------------------------------------------------------------
    # 2. MASK 1 (Mizuki -Shadow / +影を暗くする: Pure Buttery Optical Diagonal Linear Gradient)
    # -------------------------------------------------------------------------
    # Wide diagonal Linear Gradient from bottom-right (1.0, 1.0) -> (0.42, 0.40) like step_30_shot_1 & step_71_shot_4
    proj_br = (xn - 0.40) * 0.64 + (yn - 0.42) * 0.77
    diag_br = np.clip(proj_br / 0.62, 0.0, 1.0)
    diag_br = diag_br * diag_br * (3.0 - 2.0 * diag_br)

    # Soft away-from-light left edge & bottom edge falloff
    left_edge = (np.clip((0.24 - xn) / 0.24, 0.0, 1.0) ** 1.8) * 0.55
    bottom_edge = (np.clip((yn - 0.74) / 0.26, 0.0, 1.0) ** 1.6) * 0.40

    mask1_optical = np.clip(diag_br + left_edge + bottom_edge, 0.0, 1.0)
    # Soft, ultra-broad subject protection (blurred 160px so there is ZERO silhouette cutout look — pure optical light!)
    subj_soft = cv2.GaussianBlur(subject_mask, (0, 0), 140.0)
    face_halo_free = np.exp(-(((xx - 2280.0) / 1150.0) ** 2 + ((yy - 1180.0) / 1200.0) ** 2))
    mask1_shadow = mask1_optical * (1.0 - 0.68 * subj_soft) * (1.0 - 0.92 * face_halo_free)
    save_u16_mask("mask1_shadow_diagonal_16bit.png", mask1_shadow)

    # -------------------------------------------------------------------------
    # 3. MASK 2 (Mizuki Directional Sunlight Glow + Black Mist 1/4 Highlight Diffusion)
    # -------------------------------------------------------------------------
    dx = xx - 4900.0
    dy = yy - 420.0
    ang = np.deg2rad(-22.0)
    rx = dx * np.cos(ang) - dy * np.sin(ang)
    ry = dx * np.sin(ang) + dy * np.cos(ang)
    mask2_glow = np.exp(-1.10 * ((rx / 2950.0) ** 2 + (ry / 1820.0) ** 2)).astype(np.float32)
    save_u16_mask("mask2_glow_sunlight_16bit.png", mask2_glow)

    # Black Mist 1/4 optical highlight diffusion mask (only bright highlights L > 0.72, 0% on eyes/brows)
    hl_ramp = np.clip((lum - 0.70) / 0.25, 0.0, 1.0)
    hl_ramp = hl_ramp * hl_ramp * (3.0 - 2.0 * hl_ramp)
    eye_box = np.zeros((H, W), dtype=np.float32)
    eye_box[760:1160, 1960:2620] = 1.0
    eye_guard = cv2.GaussianBlur(eye_box * np.clip(1.0 - fs_skin, 0.0, 1.0), (0, 0), 22.0)
    mask2b_mist = hl_ramp * (1.0 - np.clip(eye_guard * 1.6, 0.0, 1.0)) * (0.40 + 0.60 * mask2_glow + 0.40 * subject_mask)
    mask2b_mist = np.clip(cv2.GaussianBlur(mask2b_mist, (0, 0), 14.0), 0.0, 1.0)
    save_u16_mask("mask2b_blackmist_highlights_16bit.png", mask2b_mist)

    # -------------------------------------------------------------------------
    # 4. MASK 4 (Mizuki +顔の明るさを上げる: Seamless Tight Facial Radial — ZERO Eye Holes!)
    # -------------------------------------------------------------------------
    # Pure seamless elliptical radial over her face & upper neck, just like step_71_shot_3.png!
    face_radial = np.exp(-(((xx - 2285.0) / 520.0) ** 2 + ((yy - 1090.0) / 680.0) ** 2)).astype(np.float32)
    # Smoothly restrict to subject silhouette so background painting next to hair isn't brightened
    subj_guided = 1.0 - bg_guided
    mask4_face_lum = face_radial * cv2.GaussianBlur(subj_guided, (0, 0), 12.0)
    save_u16_mask("mask4_face_luminance_16bit.png", mask4_face_lum)

    # Clean Porcelain Skin Tone Clarifier Mask (skin only, soft transitions, excludes lips & eyes)
    lip_box = np.zeros((H, W), dtype=np.float32)
    lip_box[1140:1320, 2200:2520] = 1.0
    is_lip = lip_box * np.clip(((R - G) - 0.22) / 0.12, 0.0, 1.0)
    skin_clean = np.maximum(fs_skin, full_skin_raw * subj_guided)
    skin_clean = skin_clean * (1.0 - cv2.GaussianBlur(is_lip, (0, 0), 14.0))
    skin_clean = skin_clean * (1.0 - np.clip(eye_guard * 1.2, 0.0, 1.0))
    skin_clean = cv2.GaussianBlur(skin_clean, (0, 0), 18.0)
    save_u16_mask("mask4b_porcelain_skin_tone_16bit.png", skin_clean)

    # -------------------------------------------------------------------------
    # 5. MASK 5 (Mizuki All Days Clear: True Foliage ONLY — Vase Stems + Bush, 0% Wood Table!)
    # -------------------------------------------------------------------------
    bush_roi = np.zeros((H, W), dtype=np.float32)
    bush_roi[3020:4000, 2700:6000] = 1.0
    # Strictly exclude the round wooden tabletop & its pedestal!
    table_excl = np.exp(-(((xx - 3800.0) / 1140.0) ** 6 + ((yy - 3440.0) / 270.0) ** 6))
    pedestal_excl = np.exp(-(((xx - 3780.0) / 360.0) ** 4 + ((yy - 3820.0) / 260.0) ** 4))
    bush_zone = np.clip(bush_roi - table_excl - pedestal_excl, 0.0, 1.0)
    bush_zone = cv2.GaussianBlur(bush_zone, (0, 0), 25.0)

    is_bush = (bush_zone > 0.05) & (bg_raw > 0.4) & (G > B * 1.05) & (R < G * 1.25) & (lum < 0.38) & (lum > 0.025)
    bush_mask = cv2.GaussianBlur(is_bush.astype(np.float32), (0, 0), 10.0) * bush_zone

    # Vase green stems/leaves strictly inside vase plant region (exclude frame line y > 2350 unless stem)
    vase_stem_zone = np.zeros((H, W), dtype=np.float32)
    vase_stem_zone[860:2345, 3160:4440] = 1.0
    vase_stem_zone[2345:2480, 3580:4020] = 1.0  # narrow neck of vase only
    vase_green_clean = (vase_stem_zone > 0) & (vase_green_u8 > 0)
    vase_green_mask = cv2.GaussianBlur(vase_green_clean.astype(np.float32), (0, 0), 4.5)

    mask5_foliage = np.clip(bush_mask * 1.3 + vase_green_mask * 1.25, 0.0, 1.0) * (1.0 - skin_clean)
    save_u16_mask("mask5_foliage_pine_16bit.png", mask5_foliage)

    # -------------------------------------------------------------------------
    # 6. MASK 6 (Mizuki Mask4 - RedContrast: Áo Dài + Tết Red Basket ONLY, 0% Hat Flag/Face)
    # -------------------------------------------------------------------------
    red_dom = np.clip(((R - 0.55 * G - 0.45 * B) - 0.14) / 0.16, 0.0, 1.0)
    # Exclude conical hat & face upper region (y < 1560 and x < 2750 except collar below y=1480)
    upper_head_excl = np.exp(-(((xx - 1950.0) / 920.0) ** 4 + ((yy - 920.0) / 640.0) ** 4))
    mask6_red = subj_guided * red_dom * (1.0 - np.clip(skin_clean * 1.5, 0.0, 1.0)) * (1.0 - upper_head_excl)
    mask6_red = np.clip(cv2.GaussianBlur(mask6_red, (0, 0), 8.0), 0.0, 1.0)
    save_u16_mask("mask6_subject_redcontrast_16bit.png", mask6_red)

    # Contact sheet
    thumbs = []
    titles = [
        ("Mask1 Shadow (-Shadow)", mask1_shadow),
        ("Mask2 Sunlight Glow", mask2_glow),
        ("Mask3 BG Minus Subject", mask3_bg),
        ("Mask4 Face Luminance", mask4_face_lum),
        ("Mask5 Pine Foliage", mask5_foliage),
        ("Mask6 RedContrast AoDai", mask6_red),
    ]
    for title, m in titles:
        small = cv2.resize((m * 255.0).astype(np.uint8), (600, 400), interpolation=cv2.INTER_AREA)
        vis = cv2.cvtColor(small, cv2.COLOR_GRAY2BGR)
        cv2.putText(vis, title, (18, 38), cv2.FONT_HERSHEY_SIMPLEX, 0.85, (0, 180, 255), 2, cv2.LINE_AA)
        thumbs.append(vis)
    grid = np.vstack([np.hstack(thumbs[:3]), np.hstack(thumbs[3:])])
    cv2.imwrite(os.path.join(MASK_DIR, "00_mizuki_masks_sheet.jpg"), grid, [cv2.IMWRITE_JPEG_QUALITY, 92])
    print("Updated mizuki_masks/00_mizuki_masks_sheet.jpg")


if __name__ == "__main__":
    main()
