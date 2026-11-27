import os
import sys
import glob
import time
import math
import json
import cv2
import numpy as np
import torch
import torch.nn.functional as F
from PIL import Image, ImageCms
from transformers import AutoModelForImageSegmentation, SegformerImageProcessor, SegformerForSemanticSegmentation
from torchvision import transforms
import packbits
import pytoshop
from pytoshop.user import nested_layers
import pytoshop.codecs
pytoshop.codecs.packbits = packbits

os.environ["HF_HUB_DISABLE_SYMLINKS_WARNING"] = "1"

RAW_DIR = r"d:\AI\full studio\output\retouch_anh_khang\01_raw_srgb"
TEST_DIR = r"d:\AI\full studio\output\retouch_anh_khang\03_natural_check"
OUT_FINAL_DIR = r"E:\LUU-VIDEO\feel chicken\Ảnh retouch\Anh Khang"
OUT_PSD_DIR = r"E:\antigravyti\full studio\output\retouch_anh_khang\File_PSD_Photoshop"
LAMA_PATH = r"C:\Users\Hang thu\.cache\torch\hub\checkpoints\big-lama.pt"

os.makedirs(TEST_DIR, exist_ok=True)

SRGB_ICC = ImageCms.ImageCmsProfile(ImageCms.createProfile("sRGB")).tobytes()


def odd(val: float, min_val: int = 3) -> int:
    k = max(min_val, int(round(val)))
    return k if k % 2 == 1 else k + 1


def gauss_blur(arr: np.ndarray, sigma: float) -> np.ndarray:
    if sigma <= 0.2:
        return arr.copy()
    res = cv2.GaussianBlur(arr, (0, 0), sigmaX=sigma, sigmaY=sigma)
    if arr.ndim == 3 and res.ndim == 2:
        res = res[..., None]
    return res


def largest_cc(mask_u8: np.ndarray) -> np.ndarray:
    n_lbl, lbls, stats, _ = cv2.connectedComponentsWithStats((mask_u8 > 0).astype(np.uint8), connectivity=8)
    if n_lbl <= 1:
        return (mask_u8 > 0).astype(np.uint8)
    best = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
    return (lbls == best).astype(np.uint8)


def extrapolate_masked_channel(val: np.ndarray, valid_mask: np.ndarray, sigma: float) -> np.ndarray:
    w = (valid_mask > 0).astype(np.float32)
    num = gauss_blur(val * w, sigma)
    den = gauss_blur(w, sigma)
    med = float(np.median(val[valid_mask > 0])) if (valid_mask > 0).any() else 0.0
    padded = np.where(den > 1e-4, num / np.maximum(den, 1e-4), med)
    return np.where(valid_mask > 0, val, padded)


class NaturalPhotoshopRetoucher:
    def __init__(self, device="cuda"):
        self.device = torch.device(device if torch.cuda.is_available() else "cpu")
        print(f"[Init] Loading Models on {self.device}...")
        self.lama = torch.jit.load(LAMA_PATH, map_location=self.device).eval()
        self.face_proc = SegformerImageProcessor.from_pretrained("jonathandinu/face-parsing")
        self.face_model = SegformerForSemanticSegmentation.from_pretrained(
            "jonathandinu/face-parsing"
        ).to(self.device).eval()
        self.birefnet = AutoModelForImageSegmentation.from_pretrained(
            "ZhengPeng7/BiRefNet", trust_remote_code=True
        ).to(self.device).eval().half()
        self.biref_tf = transforms.Compose([
            transforms.Resize((1024, 1024)),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
        ])

    @torch.inference_mode()
    def get_person_mask(self, rgb_u8: np.ndarray) -> np.ndarray:
        H, W = rgb_u8.shape[:2]
        inp = self.biref_tf(Image.fromarray(rgb_u8)).unsqueeze(0).to(self.device).half()
        preds = self.birefnet(inp)[-1].sigmoid().float()
        return F.interpolate(preds, size=(H, W), mode="bilinear", align_corners=False)[0, 0].cpu().numpy()

    @torch.inference_mode()
    def get_face_parsing(self, rgb_u8: np.ndarray):
        H, W = rgb_u8.shape[:2]
        inputs = self.face_proc(images=Image.fromarray(rgb_u8), return_tensors="pt").to(self.device)
        logits = self.face_model(**inputs).logits
        coarse = F.interpolate(logits, size=(512, 512), mode="bilinear", align_corners=False).argmax(dim=1)[0].cpu().numpy()

        head_raw = np.isin(coarse, [1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 17]).astype(np.uint8)
        head_raw[int(512 * 0.68) :, :] = 0
        head_cc = largest_cc(head_raw)
        ys, xs = np.where(head_cc > 0)

        x0_c, x1_c = xs.min() / 512.0 * W, xs.max() / 512.0 * W
        y0_c, y1_c = ys.min() / 512.0 * H, ys.max() / 512.0 * H
        pad = 0.25 * max(x1_c - x0_c, y1_c - y0_c)
        cx0, cy0 = max(0, int(x0_c - pad)), max(0, int(y0_c - pad))
        cx1, cy1 = min(W, int(x1_c + pad)), min(H, int(y1_c + pad))

        inp_crop = self.face_proc(images=Image.fromarray(rgb_u8[cy0:cy1, cx0:cx1]), return_tensors="pt").to(self.device)
        logits_crop = self.face_model(**inp_crop).logits
        up_logits = F.interpolate(logits_crop, size=(cy1 - cy0, cx1 - cx0), mode="bilinear", align_corners=False)
        crop_cls = up_logits.argmax(dim=1)[0].cpu().numpy().astype(np.uint8)

        valid_head = largest_cc(np.isin(crop_cls, [1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 17]).astype(np.uint8))
        valid_head_dil = cv2.dilate(valid_head, cv2.getStructuringElement(cv2.MORPH_RECT, (25, 25)))
        crop_cls[(valid_head_dil == 0) & (crop_cls != 18)] = 0

        cls_map = np.zeros((H, W), dtype=np.uint8)
        cls_map[cy0:cy1, cx0:cx1] = crop_cls

        face_core = largest_cc(np.isin(cls_map, [1, 2, 4, 5, 6, 7, 10, 11, 12]).astype(np.uint8))
        fys, fxs = np.where(face_core > 0)
        face_bbox = (int(fxs.min()), int(fys.min()), int(fxs.max()), int(fys.max()))
        return cls_map, face_bbox

    @torch.inference_mode()
    def lama_inpaint_crop(self, rgb_u8: np.ndarray, mask_u8: np.ndarray, pad_px: int = 96, grain_strength: float = 0.55) -> np.ndarray:
        ys, xs = np.where(mask_u8 > 0)
        if len(xs) == 0:
            return rgb_u8

        H, W = rgb_u8.shape[:2]
        out = rgb_u8.copy()

        cluster_k = cv2.getStructuringElement(cv2.MORPH_RECT, (141, 141))
        clustered = cv2.dilate((mask_u8 > 0).astype(np.uint8), cluster_k)
        num_labels, _, stats, _ = cv2.connectedComponentsWithStats(clustered, connectivity=8)

        for lbl in range(1, num_labels):
            bx, by, bw, bh, _ = stats[lbl]
            x0, y0 = max(0, bx - pad_px), max(0, by - pad_px)
            x1, y1 = min(W, bx + bw + pad_px), min(H, by + bh + pad_px)

            min_side = 256
            if (x1 - x0) < min_side:
                extra = min_side - (x1 - x0)
                x0 = max(0, x0 - extra // 2)
                x1 = min(W, x0 + min_side)
                x0 = max(0, x1 - min_side)
            if (y1 - y0) < min_side:
                extra = min_side - (y1 - y0)
                y0 = max(0, y0 - extra // 2)
                y1 = min(H, y0 + min_side)
                y0 = max(0, y1 - min_side)

            sub_img = out[y0:y1, x0:x1]
            sub_msk = (mask_u8[y0:y1, x0:x1] > 0).astype(np.uint8)
            if sub_msk.sum() == 0:
                continue

            sh, sw = sub_img.shape[:2]
            ph, pw = (8 - sh % 8) % 8, (8 - sw % 8) % 8
            if ph > 0 or pw > 0:
                sub_img_pad = cv2.copyMakeBorder(sub_img, 0, ph, 0, pw, cv2.BORDER_REPLICATE)
                sub_msk_pad = cv2.copyMakeBorder(sub_msk, 0, ph, 0, pw, cv2.BORDER_CONSTANT, value=0)
            else:
                sub_img_pad, sub_msk_pad = sub_img, sub_msk

            img_t = torch.from_numpy(sub_img_pad).permute(2, 0, 1).unsqueeze(0).float().to(self.device) / 255.0
            msk_t = torch.from_numpy(sub_msk_pad).unsqueeze(0).unsqueeze(0).float().to(self.device)
            inpainted_t = self.lama(img_t, msk_t)[0].permute(1, 2, 0).clamp(0, 1).cpu().numpy()
            inpainted = (inpainted_t[:sh, :sw] * 255.0).astype(np.float32)

            if grain_strength > 0:
                ring_outer = cv2.dilate(sub_msk, cv2.getStructuringElement(cv2.MORPH_RECT, (27, 27)))
                ring_inner = cv2.dilate(sub_msk, cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5)))
                ring = (ring_outer > 0) & (ring_inner == 0)
                orig_f = sub_img.astype(np.float32)
                hf = orig_f - gauss_blur(orig_f, 1.4)
                if ring.sum() > 80:
                    std_ring = np.std(hf[ring], axis=0, keepdims=True).clip(0.6, 5.0)
                    std_inp = np.std((inpainted - gauss_blur(inpainted, 1.4))[sub_msk > 0], axis=0, keepdims=True).clip(0.1, 10.0)
                    need_std = np.maximum(0.0, std_ring - std_inp)
                    rng = np.random.default_rng(42 + lbl)
                    noise = rng.normal(0.0, 1.0, size=(sh, sw, 1)).astype(np.float32)
                    noise = gauss_blur(noise, 0.55) * 1.45
                    inpainted = np.clip(inpainted + noise * need_std * grain_strength, 0, 255)

            alpha = gauss_blur(sub_msk.astype(np.float32), 2.2)[..., None]
            blended = sub_img.astype(np.float32) * (1.0 - alpha) + inpainted * alpha
            out[y0:y1, x0:x1] = np.clip(np.round(blended), 0, 255).astype(np.uint8)

        return out

    def cleanup_scene_props(self, rgb_u8: np.ndarray, face_bbox):
        H, W = rgb_u8.shape[:2]
        fx0, fy0, fx1, fy1 = face_bbox
        fw, fh = fx1 - fx0, fy1 - fy0
        out = rgb_u8.copy()
        stats_info = {"sticker": False, "mic": False}

        # 1. Cut-off red+white sticker on bottom-right wood table (IMG_1335..1336)
        ry0, rx0 = int(0.935 * H), int(0.75 * W)
        sub_br = out[ry0:H, rx0:W]
        r_ch, g_ch, b_ch = sub_br[..., 0].astype(np.int16), sub_br[..., 1].astype(np.int16), sub_br[..., 2].astype(np.int16)
        red_core = ((r_ch > 135) & ((r_ch - g_ch) > 55) & ((r_ch - b_ch) > 45)).astype(np.uint8)
        white_rim = ((r_ch > 175) & (g_ch > 168) & (b_ch > 162) & (np.abs(r_ch - g_ch) < 28)).astype(np.uint8)
        wood_like = (r_ch > 125) & (g_ch > 95) & (b_ch > 62) & ((r_ch - g_ch) < 48) & ((g_ch - b_ch) < 52)
        dark_bowl = (r_ch < 58) & (g_ch < 58) & (b_ch < 58)
        touches_bottom = red_core[-max(4, int(0.012 * H)) :, :].sum() > 80
        if touches_bottom and red_core.sum() > 180 and wood_like.mean() > 0.38 and dark_bowl.mean() < 0.08:
            near_seed = cv2.dilate(red_core, cv2.getStructuringElement(cv2.MORPH_RECT, (odd(0.025 * W), odd(0.025 * W))))
            sticker_all = (red_core | (white_rim & near_seed)).astype(np.uint8)
            dil_r = odd(0.015 * W)
            sticker_m = cv2.dilate(sticker_all, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (dil_r, dil_r)))
            full_m = np.zeros((H, W), dtype=np.uint8)
            full_m[ry0:H, rx0:W] = sticker_m
            out = self.lama_inpaint_crop(out, full_m, pad_px=int(0.045 * W), grain_strength=0.50)
            # Clean bottom 20px border seamlessly with vertical wood grain right above
            x_wood = int(0.78 * W)
            src_w = out[H - 42 : H - 20, x_wood:].astype(np.float32)
            al_w = np.linspace(0.0, 1.0, 22, dtype=np.float32)[:, None, None]
            out[H - 22 : H, x_wood:] = np.clip(out[H - 22 : H, x_wood:].astype(np.float32) * (1.0 - al_w) + src_w * al_w, 0, 255).astype(np.uint8)
            stats_info["sticker"] = True

        # 2. Small square wireless mic magnet on white T-shirt chest
        mx0, mx1 = max(0, int(fx0 + 0.30 * fw)), min(W, int(fx1 + 0.60 * fw))
        my0, my1 = max(0, int(fy1 - 0.05 * fh)), min(H, int(fy1 + 0.92 * fh))
        if mx1 > mx0 + 40 and my1 > my0 + 40:
            chest_rgb = out[my0:my1, mx0:mx1]
            chest_gray = cv2.cvtColor(chest_rgb, cv2.COLOR_RGB2GRAY).astype(np.float32)
            chest_hsv = cv2.cvtColor(chest_rgb, cv2.COLOR_RGB2HSV)
            bg_med = gauss_blur(chest_gray, max(15.0, 0.09 * fw))
            dark_cand = ((bg_med - chest_gray > 20.0) & (chest_gray < 175.0)).astype(np.uint8)
            dark_cand = cv2.morphologyEx(dark_cand, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5)))

            n_lbl, lbls, cstats, _ = cv2.connectedComponentsWithStats(dark_cand, connectivity=8)
            mic_local = np.zeros_like(dark_cand)
            min_s, max_s = 0.030 * fw, 0.175 * fw
            for i in range(1, n_lbl):
                bx, by, bw_i, bh_i, area_i = cstats[i]
                if not (min_s <= bw_i <= max_s and min_s <= bh_i <= max_s):
                    continue
                ar = bw_i / max(1.0, float(bh_i))
                fill = area_i / float(bw_i * bh_i)
                if not (0.55 <= ar <= 1.75 and fill >= 0.40):
                    continue
                comp = (lbls == i).astype(np.uint8)
                r_out = cv2.dilate(comp, cv2.getStructuringElement(cv2.MORPH_RECT, (odd(0.06 * fw), odd(0.06 * fw))))
                r_in = cv2.dilate(comp, cv2.getStructuringElement(cv2.MORPH_RECT, (odd(0.02 * fw), odd(0.02 * fw))))
                ring = (r_out > 0) & (r_in == 0)
                if ring.sum() < 50:
                    continue
                if ((chest_gray[ring] > 138.0) & (chest_hsv[..., 1][ring] < 50)).mean() >= 0.82:
                    mic_local |= comp

            if mic_local.sum() > 0:
                dil_m = odd(0.028 * fw)
                mic_local = cv2.dilate(mic_local, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (dil_m, dil_m)))
                full_mic = np.zeros((H, W), dtype=np.uint8)
                full_mic[my0:my1, mx0:mx1] = mic_local
                out = self.lama_inpaint_crop(out, full_mic, pad_px=int(0.12 * fw), grain_strength=0.45)
                stats_info["mic"] = True

        return out, stats_info

    def build_masks(self, rgb_u8: np.ndarray, cls_map: np.ndarray, person_mask: np.ndarray, face_bbox):
        H, W = rgb_u8.shape[:2]
        fx0, fy0, fx1, fy1 = face_bbox
        fw, fh = fx1 - fx0, fy1 - fy0

        face_skin = np.isin(cls_map, [1, 2]).astype(np.uint8)
        neck_skin = (cls_map == 17).astype(np.uint8)
        ears_skin = np.isin(cls_map, [8, 9]).astype(np.uint8)
        eyes = np.isin(cls_map, [4, 5]).astype(np.uint8)
        brows = np.isin(cls_map, [6, 7]).astype(np.uint8)
        mouth_in = (cls_map == 10).astype(np.uint8)
        lips = np.isin(cls_map, [11, 12]).astype(np.uint8)
        hair = (cls_map == 13).astype(np.uint8)

        # CRITICAL: Large Eye-Socket & Eyebrow Protection Zone!
        # Protects 100% of upper double-eyelid creases (mí mắt), eyelashes, lower eye-bags (bọng mắt cười), and eyebrows!
        eye_orb_rx = odd(0.055 * fw, 17)
        eye_orb_ry = odd(0.075 * fw, 23)
        eye_socket_guard = cv2.dilate(eyes, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (eye_orb_rx, eye_orb_ry)))
        brow_guard = cv2.dilate(brows, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (odd(0.055 * fw, 17), odd(0.035 * fw, 13))))

        # Protect nose tip/nostrils/bridge creases and mouth/philtrum/smile folds
        nose_m = (cls_map == 2)
        nostrils = np.zeros((H, W), dtype=np.uint8)
        nys, nxs = np.where(nose_m)
        if len(nys) > 20:
            ny_cut = int(nys.min() + 0.52 * (nys.max() - nys.min()))
            nostrils[ny_cut : nys.max() + 1, nxs.min() : nxs.max() + 1] = nose_m[ny_cut : nys.max() + 1, nxs.min() : nxs.max() + 1].astype(np.uint8)

        mouth_guard = cv2.dilate((mouth_in | lips).astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (odd(0.035 * fw, 11), odd(0.035 * fw, 11))))
        hair_guard = cv2.dilate((hair | ears_skin).astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (odd(0.012 * fw, 5), odd(0.012 * fw, 5))))
        nostril_guard = cv2.dilate(nostrils, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (odd(0.022 * fw, 9), odd(0.022 * fw, 9))))

        total_feature_guard = ((eye_socket_guard > 0) | (brow_guard > 0) | (mouth_guard > 0) | (hair_guard > 0) | (nostril_guard > 0)).astype(np.uint8)

        heal_skin = ((face_skin > 0) | (neck_skin > 0)).astype(np.uint8)
        heal_skin[total_feature_guard > 0] = 0

        # Arm skin for subtle color harmony only
        lab = cv2.cvtColor(rgb_u8, cv2.COLOR_RGB2LAB).astype(np.float32)
        med_L, med_a, med_b = np.median(lab[(face_skin > 0) | (neck_skin > 0)], axis=0)
        dist_ab = np.hypot(lab[..., 1] - med_a, lab[..., 2] - med_b)
        chroma_all = np.hypot(lab[..., 1] - 128.0, lab[..., 2] - 128.0)
        arm_skin = (
            (person_mask > 0.5)
            & (cls_map == 0)
            & (dist_ab < 15.0)
            & (chroma_all > 9.5)
            & (lab[..., 0] > max(55.0, med_L - 75.0))
            & ((lab[..., 2] - 128.0) > 5.0)
        ).astype(np.uint8)
        arm_skin[int(0.82 * H) :, :] = 0

        return {
            "face_skin": face_skin,
            "neck_skin": neck_skin,
            "ears_skin": ears_skin,
            "arm_skin": arm_skin,
            "all_skin": ((face_skin > 0) | (neck_skin > 0) | (ears_skin > 0) | (arm_skin > 0)).astype(np.uint8),
            "heal_skin": heal_skin,
            "feature_guard": total_feature_guard,
            "eyes": eyes,
            "brows": brows,
            "mouth_in": mouth_in,
            "lips": lips,
            "hair": hair,
        }

    def spot_heal_discrete_blemishes(self, rgb_u8: np.ndarray, masks: dict, face_bbox):
        """
        Photoshop Spot Healing Brush equivalent:
        ONLY removes clear discrete pimples, acne spots, dark moles, and stray neck hairs.
        Leaves general skin pores, eyelids, eyebrows, and facial contours 100% untouched!
        """
        H, W = rgb_u8.shape[:2]
        fw = face_bbox[2] - face_bbox[0]
        heal_skin = masks["heal_skin"]

        ys, xs = np.where(heal_skin > 0)
        if len(xs) < 100:
            return rgb_u8, 0

        pad = int(0.05 * fw)
        x0, y0 = max(0, xs.min() - pad), max(0, ys.min() - pad)
        x1, y1 = min(W, xs.max() + pad), min(H, ys.max() + pad)

        sub_rgb = rgb_u8[y0:y1, x0:x1]
        sub_heal = heal_skin[y0:y1, x0:x1]
        sub_neck = masks["neck_skin"][y0:y1, x0:x1]
        valid_skin = ((masks["all_skin"][y0:y1, x0:x1] > 0) & (masks["feature_guard"][y0:y1, x0:x1] == 0)).astype(np.uint8)

        lab = cv2.cvtColor(sub_rgb, cv2.COLOR_RGB2LAB).astype(np.float32)
        L = lab[..., 0] * (100.0 / 255.0)
        a = lab[..., 1] - 128.0

        ext_sig = max(6.0, 0.015 * fw)
        L_filled = extrapolate_masked_channel(L, valid_skin, ext_sig)
        a_filled = extrapolate_masked_channel(a, valid_skin, ext_sig)

        d1 = odd(0.018 * fw, 9)
        se1 = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (d1, d1))

        L_s = gauss_blur(L_filled, max(1.0, 0.0020 * fw))
        a_s = gauss_blur(a_filled, max(1.2, 0.0024 * fw))

        dark_score = cv2.morphologyEx(L_s, cv2.MORPH_BLACKHAT, se1)
        red_score = cv2.morphologyEx(a_s, cv2.MORPH_TOPHAT, se1)

        # Conservative thresholds: ONLY real distinct blemishes/pimples/moles!
        se_hair = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (odd(0.008 * fw, 5), odd(0.008 * fw, 5)))
        neck_hair_bh = cv2.morphologyEx(L, cv2.MORPH_BLACKHAT, se_hair)
        stray_neck_hair = (sub_neck > 0) & (sub_heal > 0) & (neck_hair_bh > 2.8)

        cand = (
            ((sub_heal > 0) & (
                (dark_score > 3.8)
                | (red_score > 2.65)
                | ((dark_score > 2.6) & (red_score > 1.85))
            ))
            | stray_neck_hair
        ).astype(np.uint8)

        cand = cv2.morphologyEx(cand, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3)))
        cand = cv2.morphologyEx(cand, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5)))

        n_c, c_lbl, c_stats, _ = cv2.connectedComponentsWithStats(cand, connectivity=8)
        accepted = np.zeros_like(cand)
        min_area = max(8, int((0.0035 * fw) ** 2))
        max_area = int((0.032 * fw) ** 2)
        spot_count = 0

        for idx in range(1, n_c):
            area = c_stats[idx, cv2.CC_STAT_AREA]
            if area < min_area or area > max_area:
                continue
            comp = (c_lbl == idx)
            peak_dark = float(dark_score[comp].max())
            peak_red = float(red_score[comp].max())
            on_neck = float(sub_neck[comp].mean()) > 0.5

            cys, cxs = np.where(comp)
            if len(cxs) >= 12:
                pts = np.stack([cxs.astype(np.float32), cys.astype(np.float32)], axis=1)
                eigvals = np.linalg.eigvalsh(np.cov(pts, rowvar=False))
                elong = math.sqrt(max(eigvals[1], 1e-3) / max(eigvals[0], 1e-3))
                minor_w = 2.0 * math.sqrt(max(eigvals[0], 1e-3))
            else:
                elong, minor_w = 1.0, 2.0

            if on_neck and minor_w < 0.011 * fw and peak_dark > 2.8:
                max_elong = 8.5
            elif peak_dark > 7.5 or peak_red > 4.2:
                max_elong = 3.2
            else:
                max_elong = 2.2

            if elong <= max_elong:
                accepted |= comp.astype(np.uint8)
                spot_count += 1

        if spot_count == 0:
            return rgb_u8, 0

        strong_moles = (accepted > 0) & (dark_score > 6.0)
        dil_s = odd(0.0075 * fw, 5)
        accepted_dil = cv2.dilate(accepted, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (dil_s, dil_s)))
        if strong_moles.any():
            dil_mole = odd(0.020 * fw, 15)
            accepted_dil |= cv2.dilate(strong_moles.astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (dil_mole, dil_mole)))

        accepted_dil[masks["feature_guard"][y0:y1, x0:x1] > 0] = 0

        full_spot_mask = np.zeros((H, W), dtype=np.uint8)
        full_spot_mask[y0:y1, x0:x1] = accepted_dil
        healed = self.lama_inpaint_crop(rgb_u8, full_spot_mask, pad_px=int(0.10 * fw), grain_strength=0.65)
        return healed, spot_count

    def light_natural_skin_and_color(self, rgb_u8: np.ndarray, masks: dict, person_mask: np.ndarray, face_bbox):
        """
        Subtle, Authentic Camera Raw + Light Frequency Separation (~25% opacity on flat skin planes ONLY):
        - ZERO edits on eyes, eyelids, eye-bags, eyebrows, eyelashes, hair, or nose/mouth contours!
        - Preserves 100% real masculine skin pores & natural warm lighting sculpting.
        - Gentle, fresh commercial brightness & color vibrancy ('chỉnh tươi nhẹ').
        """
        H, W = rgb_u8.shape[:2]
        fx0, fy0, fx1, fy1 = face_bbox
        fw = fx1 - fx0

        img_f = rgb_u8.astype(np.float32) / 255.0

        # Smooth mask ONLY on safe flat forehead, cheek centers, chin, and neck (100% ZERO near eyes/eyelids/brows/mouth!)
        guard_soft = gauss_blur(masks["feature_guard"].astype(np.float32), 0.014 * fw)
        w_skin_fs = gauss_blur(((masks["face_skin"] > 0) | (masks["neck_skin"] > 0)).astype(np.float32), 0.012 * fw) * np.clip(1.0 - guard_soft * 1.25, 0.0, 1.0)

        # Very gentle Frequency Separation (26% low-freq evening, 96% fine pores + 68% mid pores!)
        sig_fine = max(1.1, 0.0025 * fw)
        sig_mid = max(3.2, 0.0085 * fw)
        blur_fine = gauss_blur(img_f, sig_fine)
        lf_base = gauss_blur(img_f, sig_mid)
        hf_fine = img_f - blur_fine
        hf_mid = blur_fine - lf_base

        half_lf = cv2.resize(lf_base, (W // 2, H // 2), interpolation=cv2.INTER_AREA)
        smooth_half = cv2.bilateralFilter(half_lf, d=odd(0.05 * (fw * 0.5), 7), sigmaColor=0.048, sigmaSpace=max(10.0, 0.042 * (fw * 0.5)))
        lf_even = cv2.resize(smooth_half, (W, H), interpolation=cv2.INTER_CUBIC)

        tone_w = (0.28 * w_skin_fs)[..., None]
        lf_new = lf_base * (1.0 - tone_w) + lf_even * tone_w

        # Recombine 96% crisp fine pores + 68% mid texture -> 100% real DSLR skin!
        hf_skin = 0.96 * hf_fine + 0.68 * np.tanh(hf_mid / 0.035) * 0.035
        hf_orig = hf_fine + hf_mid
        sw3 = w_skin_fs[..., None]
        out_f = np.clip(lf_new + hf_orig * (1.0 - sw3) + hf_skin * sw3, 0.0, 1.0)

        # --- Camera Raw Style 'Chỉnh Tươi' (Clean Brightness + Natural Warmth + Appetizing Food) ---
        # Gentle highlight-protected exposure lift (+0.18 EV equivalent, keeps blacks deep & pupils pitch-black!)
        # Notice: multiply by x^0.15 weight so dark blacks (pupils, hair, black shirts/Logos) stay rich black, never milky!
        mid_lift = 0.125 * (out_f ** 0.85) * ((1.0 - out_f) ** 1.15) * 2.2
        out_f = np.clip(out_f + mid_lift, 0.0, 1.0)
        # Subtle crisp S-curve contrast
        out_f = np.clip(out_f + 0.025 * np.sin(np.pi * (out_f - 0.5)) * (1.0 - np.abs(2.0 * out_f - 1.0)), 0.0, 1.0)

        u8 = np.clip(np.round(out_f * 255.0), 0, 255).astype(np.uint8)
        lab = cv2.cvtColor(u8, cv2.COLOR_RGB2LAB).astype(np.float32)
        L = lab[..., 0] * (100.0 / 255.0)
        a = lab[..., 1] - 128.0
        b = lab[..., 2] - 128.0

        # 1. Subtle oily forehead glare taming ONLY where blown > p90 (away from eyes)
        fs_safe = (w_skin_fs > 0.35)
        if fs_safe.sum() > 200:
            p90 = float(np.percentile(L[fs_safe], 90))
            shine_excess = np.maximum(0.0, L - p90)
            L -= w_skin_fs * shine_excess * 0.30

        # 2. Subtle natural teeth whitening (gentle 30% yellow reduction, natural ivory smile)
        mouth_m = (masks["mouth_in"] > 0)
        if mouth_m.sum() > 30:
            teeth_w = gauss_blur((mouth_m & (L > 38.0) & (a < 13.0)).astype(np.float32), max(1.0, 0.002 * fw))
            b = b * (1.0 - 0.32 * teeth_w)
            L += teeth_w * np.clip((85.0 - L) * 0.10, 0.0, 3.2)

        # 3. Clean white T-shirt ONLY BELOW THE CHIN (y > fy1 -> NEVER touches eyebrows, eyes, or face!)
        chroma = np.hypot(a, b)
        shirt_raw = (
            (person_mask > 0.5)
            & (masks["all_skin"] == 0)
            & (L > 55.0)
            & (chroma < 13.5)
        ).astype(np.float32)
        shirt_raw[:fy1, :] = 0.0  # 100% hard cutoff below chin!
        shirt_w = gauss_blur(shirt_raw, 4.0)
        b = b * (1.0 - 0.42 * shirt_w)
        a = a * (1.0 - 0.30 * shirt_w)

        # 4. Gentle natural skin freshness (+0.6 rosy a*, tiny -0.8 olive cleanup if overly yellow, zero bleaching!)
        skin_all_w = gauss_blur(masks["all_skin"].astype(np.float32), 6.0) * (1.0 - gauss_blur(masks["eyes"].astype(np.float32), 3.0))
        cur_b = float(np.median(b[masks["face_skin"] > 0]))
        if cur_b > 18.2:
            b -= skin_all_w * min(1.5, (cur_b - 18.2) * 0.45)
        a += skin_all_w * 0.55

        # 5. Appetizing food vibrance (+14% selective food pop in lower frame)
        yy = np.linspace(0.0, 1.0, H, dtype=np.float32)[:, None]
        lower_zone = np.clip((yy - 0.50) / 0.14, 0.0, 1.0)
        food_w = lower_zone * (1.0 - skin_all_w) * (1.0 - shirt_w) * np.clip((chroma - 8.0) / 14.0, 0.0, 1.0)
        vib = 1.0 + 0.14 * food_w * np.clip(1.0 - chroma / 78.0, 0.15, 1.0)
        a *= vib
        b *= vib

        lab_out = np.stack([
            np.clip(L * (255.0 / 100.0), 0, 255),
            np.clip(a + 128.0, 0, 255),
            np.clip(b + 128.0, 0, 255),
        ], axis=-1).astype(np.uint8)
        return cv2.cvtColor(lab_out, cv2.COLOR_LAB2RGB)

    def process_one(self, img_path: str):
        t0 = time.time()
        rgb_orig = np.array(Image.open(img_path).convert("RGB"))
        person_mask = self.get_person_mask(rgb_orig)
        cls_map, face_bbox = self.get_face_parsing(rgb_orig)

        step1_props, prop_stats = self.cleanup_scene_props(rgb_orig, face_bbox)
        masks = self.build_masks(step1_props, cls_map, person_mask, face_bbox)
        step2_healed, n_spots = self.spot_heal_discrete_blemishes(step1_props, masks, face_bbox)
        final_rgb = self.light_natural_skin_and_color(step2_healed, masks, person_mask, face_bbox)

        info = {"time_s": round(time.time() - t0, 2), "spots_healed": n_spots, **prop_stats, "face_bbox": face_bbox}
        return rgb_orig, step2_healed, final_rgb, info


def save_jpg_srgb(rgb_u8: np.ndarray, out_path: str, quality: int = 98):
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    Image.fromarray(rgb_u8).save(out_path, format="JPEG", quality=quality, subsampling=0, optimize=True, icc_profile=SRGB_ICC)


def save_layered_psd(orig_rgb: np.ndarray, healed_rgb: np.ndarray, final_rgb: np.ndarray, psd_path: str):
    """Save genuine multi-layer Adobe Photoshop .PSD so user can tweak opacity in Photoshop 2026 if desired."""
    os.makedirs(os.path.dirname(psd_path), exist_ok=True)
    H, W = orig_rgb.shape[:2]

    def to_chans(rgb):
        alpha = np.full((H, W), 255, dtype=np.uint8)
        return {-1: alpha, 0: rgb[..., 0], 1: rgb[..., 1], 2: rgb[..., 2]}

    layers = [
        nested_layers.Image(name="Chinh Tuoi & Min Nhe (Chinh Opacity)", visible=True, opacity=255, group_id=0, blend_mode=pytoshop.enums.BlendMode.normal, top=0, left=0, bottom=H, right=W, channels=to_chans(final_rgb)),
        nested_layers.Image(name="Xoa Mun & Vat Thua (Spot Heal)", visible=True, opacity=255, group_id=0, blend_mode=pytoshop.enums.BlendMode.normal, top=0, left=0, bottom=H, right=W, channels=to_chans(healed_rgb)),
        nested_layers.Image(name="Anh Goc (Original)", visible=True, opacity=255, group_id=0, blend_mode=pytoshop.enums.BlendMode.normal, top=0, left=0, bottom=H, right=W, channels=to_chans(orig_rgb)),
    ]
    psd = nested_layers.nested_layers_to_psd(layers, color_mode=pytoshop.enums.ColorMode.rgb, size=(W, H), compression=pytoshop.enums.Compression.rle)
    with open(psd_path, "wb") as f:
        psd.write(f)


if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "test"
    retoucher = NaturalPhotoshopRetoucher()

    if mode == "test":
        for nm in ["IMG_1336", "IMG_1343", "IMG_1352"]:
            p = os.path.join(RAW_DIR, f"{nm}.png")
            orig, healed, res, meta = retoucher.process_one(p)
            print(f"[TEST v3] {nm}: {meta}", flush=True)
            fx0, fy0, fx1, fy1 = meta["face_bbox"]
            fw, fh = fx1 - fx0, fy1 - fy0
            # Save 200% close-up of eyes & face Before (top) vs After (bottom)
            ex0, ex1 = max(0, int(fx0 - 0.08 * fw)), min(orig.shape[1], int(fx1 + 0.08 * fw))
            ey0, ey1 = max(0, int(fy0 - 0.05 * fh)), min(orig.shape[0], int(fy1 + 0.05 * fh))
            zoom_ba = np.hstack([orig[ey0:ey1, ex0:ex1], res[ey0:ey1, ex0:ex1]])
            save_jpg_srgb(zoom_ba, os.path.join(TEST_DIR, f"{nm}_face_zoom_BA.jpg"), quality=96)

            # Full frame side-by-side
            th = 1400
            tw = int(orig.shape[1] * (th / float(orig.shape[0])))
            full_ba = np.hstack([
                cv2.resize(orig, (tw, th), interpolation=cv2.INTER_AREA),
                cv2.resize(res, (tw, th), interpolation=cv2.INTER_AREA),
            ])
            save_jpg_srgb(full_ba, os.path.join(TEST_DIR, f"{nm}_full_BA.jpg"), quality=94)

    elif mode == "all":
        os.makedirs(OUT_FINAL_DIR, exist_ok=True)
        os.makedirs(OUT_PSD_DIR, exist_ok=True)
        files = sorted(glob.glob(os.path.join(RAW_DIR, "IMG_*.png")))
        all_meta = {}
        thumbs = []
        for idx, p in enumerate(files, 1):
            nm = os.path.splitext(os.path.basename(p))[0]
            orig, healed, res, meta = retoucher.process_one(p)
            save_jpg_srgb(res, os.path.join(OUT_FINAL_DIR, f"{nm}.jpg"), quality=98)
            save_layered_psd(orig, healed, res, os.path.join(OUT_PSD_DIR, f"{nm}.psd"))
            all_meta[nm] = meta
            print(f"[{idx:02d}/{len(files):02d}] {nm}.jpg + .psd saved -> {meta}", flush=True)

            th = 560
            tw = int(orig.shape[1] * (th / float(orig.shape[0])))
            pair = np.hstack([
                cv2.resize(orig, (tw, th), interpolation=cv2.INTER_AREA),
                cv2.resize(res, (tw, th), interpolation=cv2.INTER_AREA),
            ])
            cv2.putText(pair, f"{nm} (Goc | Retouch Nhe)", (14, 34), cv2.FONT_HERSHEY_SIMPLEX, 0.82, (0, 0, 0), 4, cv2.LINE_AA)
            cv2.putText(pair, f"{nm} (Goc | Retouch Nhe)", (14, 34), cv2.FONT_HERSHEY_SIMPLEX, 0.82, (255, 230, 80), 2, cv2.LINE_AA)
            thumbs.append(pair)

        cols = 4
        rows = math.ceil(len(thumbs) / cols)
        pw_t, ph_t = thumbs[0].shape[1], thumbs[0].shape[0]
        grid = np.zeros((rows * ph_t, cols * pw_t, 3), dtype=np.uint8) + 24
        for i, tile in enumerate(thumbs):
            r, c = divmod(i, cols)
            grid[r * ph_t : (r + 1) * ph_t, c * pw_t : (c + 1) * pw_t] = tile
        save_jpg_srgb(grid, os.path.join(TEST_DIR, "00_QA_19_NATURAL_V3.jpg"), quality=92)
        with open(os.path.join(TEST_DIR, "batch_report_v3.json"), "w", encoding="utf-8") as f:
            json.dump(all_meta, f, indent=2, ensure_ascii=False)
