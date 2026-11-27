import os
import sys
import time
import math
import glob
import traceback
from concurrent.futures import ThreadPoolExecutor
import cv2
import rawpy
import numpy as np
import torch
import torch.nn.functional as F
from PIL import Image, ImageCms
from transformers import AutoModelForImageSegmentation, SegformerImageProcessor, SegformerForSemanticSegmentation

os.environ["HF_HUB_DISABLE_SYMLINKS_WARNING"] = "1"

SRC_FOLDER = r"G:\Drive của tôi\Hữu\Mùng 5"
LOCAL_OUT_DIR = r"E:\XUAT-VIDEO\Mùng 5 - Đã Chỉnh Mizuki"
DRIVE_OUT_DIR = r"E:\LUU-VIDEO\Mùng 5\00_ANH_DA_CHINH_MIZUKI"
DRIVE_BA_DIR = r"E:\LUU-VIDEO\Mùng 5\00_ANH_DA_CHINH_MIZUKI\00_SO_SANH_TRUOC_SAU"
LOCAL_BA_DIR = r"E:\XUAT-VIDEO\Mùng 5 - Đã Chỉnh Mizuki\00_SO_SANH_TRUOC_SAU"

LAMA_PATH = r"C:\Users\Hang thu\.cache\torch\hub\checkpoints\big-lama.pt"
LUT_CACHE = r"d:\AI\full studio\output\mung5_inspect\acr_adobe_portrait_lut.npz"

for d in [LOCAL_OUT_DIR, DRIVE_OUT_DIR, DRIVE_BA_DIR, LOCAL_BA_DIR]:
    os.makedirs(d, exist_ok=True)

SRGB_ICC = ImageCms.ImageCmsProfile(ImageCms.createProfile("sRGB")).tobytes()


def odd(val: float, min_val: int = 3) -> int:
    k = max(min_val, int(round(val)))
    return k if k % 2 == 1 else k + 1


def decode_arw_u16(arw_path: str) -> np.ndarray:
    """Thread-safe C++ LibRaw 16-bit decode via Unicode memory buffer + retry."""
    import io
    last_err = None
    for attempt in range(3):
        try:
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
                    demosaic_algorithm=rawpy.DemosaicAlgorithm.PPG,
                )
            break
        except Exception as e:
            last_err = e
            time.sleep(1.0)
    else:
        raise last_err
    H, W = rgb16.shape[:2]
    if W >= H and W >= 6000 and H >= 4000:
        y0, x0 = (H - 4000) // 2, (W - 6000) // 2
        rgb16 = rgb16[y0:y0 + 4000, x0:x0 + 6000]
    elif H > W and H >= 6000 and W >= 4000:
        y0, x0 = (H - 6000) // 2, (W - 4000) // 2
        rgb16 = rgb16[y0:y0 + 6000, x0:x0 + 4000]
    return np.ascontiguousarray(rgb16)


def apply_poly_cuda(rgb_t: torch.Tensor, W_t: torch.Tensor) -> torch.Tensor:
    r, g, b = rgb_t[0], rgb_t[1], rgb_t[2]
    ones = torch.ones_like(r)
    feats = torch.stack([
        ones, r, g, b,
        r*r, g*g, b*b, r*g, r*b, g*b,
        r*r*r, g*g*g, b*b*b,
        r*r*g, r*r*b, g*g*r, g*g*b, b*b*r, b*b*g, r*g*b
    ], dim=-1)
    out = torch.matmul(feats, W_t)
    return out.permute(2, 0, 1).clamp(0.0, 1.0)


class CurveLUTCache:
    def __init__(self, device):
        self.device = device
        self.cache = {}

    def apply(self, x: torch.Tensor, pts) -> torch.Tensor:
        key = tuple((p[0], p[1]) for p in pts)
        lut = self.cache.get(key)
        if lut is None:
            xs = np.array([p[0] / 255.0 for p in pts], dtype=np.float32)
            ys = np.array([p[1] / 255.0 for p in pts], dtype=np.float32)
            grid = np.linspace(0.0, 1.0, 4096, dtype=np.float32)
            lut_np = np.interp(grid, xs, ys)
            lut_np = cv2.GaussianBlur(lut_np.reshape(1, -1), (0, 0), 38.0).reshape(-1)
            lut_np[0], lut_np[-1] = ys[0], ys[-1]
            lut = torch.from_numpy(lut_np).to(self.device)
            self.cache[key] = lut
        idx = x.clamp(0.0, 1.0) * 4095.0
        i0 = idx.long().clamp(0, 4094)
        frac = idx - i0.float()
        return lut[i0] * (1.0 - frac) + lut[i0 + 1] * frac


def gauss_blur_cuda(t: torch.Tensor, sigma: float) -> torch.Tensor:
    if sigma <= 0.25:
        return t
    squeeze = False
    if t.ndim == 3:
        t = t.unsqueeze(0)
        squeeze = True
    _, C, H, W = t.shape
    if sigma > 12.0:
        scale = min(8, max(2, int(sigma // 6.0)))
        sh, sw = max(8, H // scale), max(8, W // scale)
        small = F.interpolate(t, size=(sh, sw), mode="bilinear", align_corners=False)
        s_sig = sigma / float(scale)
        rad = max(2, int(math.ceil(3.0 * s_sig)))
        coords = torch.arange(-rad, rad + 1, device=t.device, dtype=t.dtype)
        k1d = torch.exp(-0.5 * (coords / s_sig) ** 2)
        k1d = k1d / k1d.sum()
        kx = k1d.view(1, 1, 1, -1).expand(C, 1, 1, -1)
        ky = k1d.view(1, 1, -1, 1).expand(C, 1, -1, 1)
        small = F.pad(small, (rad, rad, rad, rad), mode="reflect")
        small = F.conv2d(small, kx, groups=C)
        small = F.conv2d(small, ky, groups=C)
        out = F.interpolate(small, size=(H, W), mode="bilinear", align_corners=False)
    else:
        rad = max(1, int(math.ceil(3.0 * sigma)))
        coords = torch.arange(-rad, rad + 1, device=t.device, dtype=t.dtype)
        k1d = torch.exp(-0.5 * (coords / sigma) ** 2)
        k1d = k1d / k1d.sum()
        kx = k1d.view(1, 1, 1, -1).expand(C, 1, 1, -1)
        ky = k1d.view(1, 1, -1, 1).expand(C, 1, -1, 1)
        out = F.pad(t, (rad, rad, rad, rad), mode="reflect")
        out = F.conv2d(out, kx, groups=C)
        out = F.conv2d(out, ky, groups=C)
    return out[0] if squeeze else out


class TurboMizukiBatchEngine:
    def __init__(self, W_poly: np.ndarray, device="cuda"):
        self.device = torch.device(device if torch.cuda.is_available() else "cpu")
        self.W_t = torch.from_numpy(W_poly).to(self.device)
        self.curves = CurveLUTCache(self.device)
        self.mean_biref = torch.tensor([0.485, 0.456, 0.406], device=self.device).view(1, 3, 1, 1).half()
        self.std_biref = torch.tensor([0.229, 0.224, 0.225], device=self.device).view(1, 3, 1, 1).half()

        print(f"[Init] Loading GPU Models on {self.device}...", flush=True)
        self.lama = torch.jit.load(LAMA_PATH, map_location=self.device).eval()
        self.face_proc = SegformerImageProcessor.from_pretrained("jonathandinu/face-parsing")
        self.face_model = SegformerForSemanticSegmentation.from_pretrained(
            "jonathandinu/face-parsing"
        ).to(self.device).eval()
        self.birefnet = AutoModelForImageSegmentation.from_pretrained(
            "ZhengPeng7/BiRefNet", trust_remote_code=True
        ).to(self.device).eval().half()

    @torch.inference_mode()
    def get_person_mask_cuda(self, acr_t: torch.Tensor) -> torch.Tensor:
        """Pure GPU BiRefNet inference from (3, H, W) float tensor without CPU PIL roundtrip!"""
        H, W = acr_t.shape[1], acr_t.shape[2]
        inp = F.interpolate(acr_t.unsqueeze(0), size=(1024, 1024), mode="bilinear", align_corners=False).half()
        inp = (inp - self.mean_biref) / self.std_biref
        preds = self.birefnet(inp)[-1].sigmoid().float()
        return F.interpolate(preds, size=(H, W), mode="bilinear", align_corners=False)[0, 0]

    @torch.inference_mode()
    def parse_all_faces_cuda(self, acr_t: torch.Tensor):
        """Fast multi-face parsing using small GPU downsample for coarse pass + full-res GPU slices for crops."""
        H, W = acr_t.shape[1], acr_t.shape[2]
        small_t = F.interpolate(acr_t.unsqueeze(0), size=(512, 512), mode="bilinear", align_corners=False)[0]
        small_u8 = (small_t.permute(1, 2, 0).clamp(0.0, 1.0) * 255.0 + 0.5).byte().cpu().numpy()

        inputs = self.face_proc(images=Image.fromarray(small_u8), return_tensors="pt").to(self.device)
        logits = self.face_model(**inputs).logits
        coarse = F.interpolate(logits, size=(512, 512), mode="bilinear", align_corners=False).argmax(dim=1)[0].cpu().numpy()

        face_seeds = np.isin(coarse, [1, 2, 4, 5, 6, 7, 10, 11, 12]).astype(np.uint8)
        n_lbl, _, stats, _ = cv2.connectedComponentsWithStats(face_seeds, connectivity=8)

        faces = []
        cls_full = np.zeros((H, W), dtype=np.uint8)
        valid_ids = [i for i in range(1, n_lbl) if stats[i, cv2.CC_STAT_AREA] >= 50]
        valid_ids.sort(key=lambda i: stats[i, cv2.CC_STAT_AREA], reverse=True)

        for i in valid_ids[:5]:
            bx, by, bw, bh, _ = stats[i]
            x0_c, x1_c = bx / 512.0 * W, (bx + bw) / 512.0 * W
            y0_c, y1_c = by / 512.0 * H, (by + bh) / 512.0 * H
            fw_est, fh_est = x1_c - x0_c, y1_c - y0_c
            pad_x = 0.50 * max(fw_est, fh_est)
            pad_top = 0.55 * max(fw_est, fh_est)
            pad_bot = 0.75 * max(fw_est, fh_est)
            cx0, cy0 = max(0, int(x0_c - pad_x)), max(0, int(y0_c - pad_top))
            cx1, cy1 = min(W, int(x1_c + pad_x)), min(H, int(y1_c + pad_bot))
            if (cx1 - cx0) < 70 or (cy1 - cy0) < 70:
                continue

            crop_u8 = (acr_t[:, cy0:cy1, cx0:cx1].permute(1, 2, 0).clamp(0.0, 1.0) * 255.0 + 0.5).byte().cpu().numpy()
            inp_crop = self.face_proc(images=Image.fromarray(crop_u8), return_tensors="pt").to(self.device)
            logits_crop = self.face_model(**inp_crop).logits
            up_logits = F.interpolate(logits_crop, size=(cy1 - cy0, cx1 - cx0), mode="bilinear", align_corners=False)
            crop_cls = up_logits.argmax(dim=1)[0].cpu().numpy().astype(np.uint8)

            if np.isin(crop_cls, [2, 4, 5, 6, 7, 11, 12]).sum() < 80 or np.isin(crop_cls, [1, 2]).sum() < 400:
                continue

            sub_existing = cls_full[cy0:cy1, cx0:cx1]
            cls_full[cy0:cy1, cx0:cx1] = np.where(crop_cls > 0, crop_cls, sub_existing)

            f_core = np.isin(crop_cls, [1, 2, 4, 5, 6, 7, 10, 11, 12])
            fys, fxs = np.where(f_core)
            if len(fxs) > 50:
                faces.append({
                    "bbox": (cx0 + int(fxs.min()), cy0 + int(fys.min()), cx0 + int(fxs.max()), cy0 + int(fys.max())),
                    "crop_box": (cx0, cy0, cx1, cy1),
                })

        return cls_full, faces

    @torch.inference_mode()
    def heal_pimples_crop_cuda(self, img_t: torch.Tensor, cls_map: np.ndarray, faces):
        """Fast crop-only 16-bit pimple healing directly on face crops (30x less memory transfer!)."""
        H, W = img_t.shape[1], img_t.shape[2]
        if not faces:
            return img_t, np.zeros((H, W), dtype=np.uint8), np.zeros((H, W), dtype=np.uint8), np.zeros((H, W), dtype=np.uint8), int(0.12 * min(H, W))

        avg_fw = int(np.mean([f["bbox"][2] - f["bbox"][0] for f in faces]))
        eyes = np.isin(cls_map, [4, 5]).astype(np.uint8)
        brows = np.isin(cls_map, [6, 7]).astype(np.uint8)
        lips_mouth = np.isin(cls_map, [10, 11, 12]).astype(np.uint8)
        hair_ears = np.isin(cls_map, [8, 9, 13]).astype(np.uint8)

        eye_guard = cv2.dilate(eyes, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (odd(0.060 * avg_fw, 15), odd(0.080 * avg_fw, 21))))
        brow_guard = cv2.dilate(brows, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (odd(0.055 * avg_fw, 15), odd(0.038 * avg_fw, 11))))
        mouth_guard = cv2.dilate(lips_mouth, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (odd(0.035 * avg_fw, 9), odd(0.035 * avg_fw, 9))))
        hair_guard_fs = cv2.dilate(hair_ears, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (odd(0.014 * avg_fw, 5), odd(0.014 * avg_fw, 5))))
        hair_guard_spot = cv2.dilate(hair_ears, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3)))

        nostril_guard = np.zeros((H, W), dtype=np.uint8)
        for f in faces:
            cx0, cy0, cx1, cy1 = f["crop_box"]
            nose_sub = (cls_map[cy0:cy1, cx0:cx1] == 2)
            nys, nxs = np.where(nose_sub)
            if len(nys) > 20:
                ny_cut = int(nys.min() + 0.52 * (nys.max() - nys.min()))
                n_tmp = np.zeros_like(nose_sub, dtype=np.uint8)
                n_tmp[ny_cut:nys.max()+1, nxs.min():nxs.max()+1] = nose_sub[ny_cut:nys.max()+1, nxs.min():nxs.max()+1]
                nostril_guard[cy0:cy1, cx0:cx1] |= cv2.dilate(n_tmp, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (odd(0.025 * avg_fw, 7), odd(0.025 * avg_fw, 7))))

        base_guard = (eye_guard > 0) | (brow_guard > 0) | (mouth_guard > 0) | (nostril_guard > 0)
        fs_skin_u8 = (np.isin(cls_map, [1, 2, 17]) & (~base_guard) & (~(hair_guard_fs > 0))).astype(np.uint8)
        spot_skin_u8 = (np.isin(cls_map, [1, 2, 17]) & (~base_guard) & (~(hair_guard_spot > 0))).astype(np.uint8)

        # Process pimple healing per face crop directly!
        for idx_f, f in enumerate(faces):
            fx0, fy0, fx1, fy1 = f["bbox"]
            fw = max(60, fx1 - fx0)
            cx0, cy0, cx1, cy1 = f["crop_box"]
            sub_skin = spot_skin_u8[cy0:cy1, cx0:cx1]
            if sub_skin.sum() < 100:
                continue

            sub16 = img_t[:, cy0:cy1, cx0:cx1].permute(1, 2, 0).cpu().numpy()
            sub8 = np.clip(np.round(sub16 * 255.0), 0, 255).astype(np.uint8)
            lab = cv2.cvtColor(sub8, cv2.COLOR_RGB2LAB).astype(np.float32)
            sub_L, sub_a = lab[..., 0], lab[..., 1]

            sig = max(6.0, 0.028 * fw)
            w_f = sub_skin.astype(np.float32)
            den = np.maximum(cv2.GaussianBlur(w_f, (0, 0), sig), 1e-4)
            loc_L = cv2.GaussianBlur(sub_L * w_f, (0, 0), sig) / den
            loc_a = cv2.GaussianBlur(sub_a * w_f, (0, 0), sig) / den

            diff_dark = (loc_L - sub_L) * w_f
            diff_red = (sub_a - loc_a) * w_f
            std_L = max(2.2, float(np.std(diff_dark[sub_skin > 0])))
            std_a = max(1.3, float(np.std(diff_red[sub_skin > 0])))

            cand = ((sub_skin > 0) & ((diff_red > max(2.3, 2.15 * std_a)) | (diff_dark > max(7.0, 2.80 * std_L)))).astype(np.uint8)
            n_lbl, lbls, cstats, _ = cv2.connectedComponentsWithStats(cand, connectivity=8)
            max_spot_side = max(14, int(0.055 * fw))
            min_spot_area = max(4, int((0.0028 * fw) ** 2))
            face_spots = np.zeros_like(cand)
            for k in range(1, n_lbl):
                bw_k, bh_k, area_k = cstats[k, cv2.CC_STAT_WIDTH], cstats[k, cv2.CC_STAT_HEIGHT], cstats[k, cv2.CC_STAT_AREA]
                if min_spot_area <= area_k <= (max_spot_side * max_spot_side * 0.65) and bw_k <= max_spot_side and bh_k <= max_spot_side:
                    ar = bw_k / max(1.0, float(bh_k))
                    if 0.30 <= ar <= 3.3:
                        face_spots[lbls == k] = 1

            if face_spots.sum() == 0:
                continue

            dil_r = odd(max(5, 0.011 * fw))
            face_spots = cv2.dilate(face_spots, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (dil_r, dil_r)))
            face_spots[sub_skin == 0] = 0
            if face_spots.sum() == 0:
                continue

            sh, sw = sub16.shape[:2]
            ph, pw = (8 - sh % 8) % 8, (8 - sw % 8) % 8
            s16_pad = cv2.copyMakeBorder(sub16, 0, ph, 0, pw, cv2.BORDER_REPLICATE) if (ph or pw) else sub16
            sm_pad = cv2.copyMakeBorder(face_spots, 0, ph, 0, pw, cv2.BORDER_CONSTANT, value=0) if (ph or pw) else face_spots

            crop_t = torch.from_numpy(s16_pad).permute(2, 0, 1).unsqueeze(0).to(self.device)
            msk_t = torch.from_numpy(sm_pad).unsqueeze(0).unsqueeze(0).float().to(self.device)
            inp_np = self.lama(crop_t, msk_t)[0].permute(1, 2, 0).clamp(0.0, 1.0).cpu().numpy()[:sh, :sw]

            ring_o = cv2.dilate(face_spots, cv2.getStructuringElement(cv2.MORPH_RECT, (23, 23)))
            ring_i = cv2.dilate(face_spots, cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5)))
            ring = (ring_o > 0) & (ring_i == 0)
            if ring.sum() > 60:
                hf = sub16 - cv2.GaussianBlur(sub16, (0, 0), 1.3)
                std_r = np.std(hf[ring], axis=0).clip(0.002, 0.020).reshape(1, 1, 3)
                rng = np.random.default_rng(200 + idx_f)
                ns = cv2.GaussianBlur(rng.normal(0.0, 1.0, size=(sh, sw)).astype(np.float32), (0, 0), 0.55)[..., None] * 1.4
                inp_np = np.clip(inp_np + ns * std_r * 0.60, 0.0, 1.0)

            alpha = cv2.GaussianBlur(face_spots.astype(np.float32), (0, 0), 2.2)[..., None]
            blended16 = sub16 * (1.0 - alpha) + inp_np * alpha
            img_t[:, cy0:cy1, cx0:cx1] = torch.from_numpy(blended16).permute(2, 0, 1).to(self.device)

        return img_t, fs_skin_u8, eye_guard, mouth_guard, avg_fw

    @torch.inference_mode()
    def process_u16_array(self, rgb16_u16: np.ndarray, need_raw_preview: bool = False):
        H, W = rgb16_u16.shape[:2]
        rgb_t = torch.from_numpy(rgb16_u16).to(self.device, non_blocking=True).permute(2, 0, 1).float() / 65535.0
        raw_u8 = (rgb_t.permute(1, 2, 0).clamp(0.0, 1.0) * 255.0 + 0.5).byte().cpu().numpy() if need_raw_preview else None

        # 1. 16-bit Adobe Camera Raw (Adobe Portrait) Polynomial Profile
        acr_t = apply_poly_cuda(rgb_t, self.W_t)
        del rgb_t

        # 2. GPU Segmentation & Multi-Face Parsing
        subj_t = self.get_person_mask_cuda(acr_t)
        cls_map, faces = self.parse_all_faces_cuda(acr_t)

        # 3. Highlight-Safe Adaptive Exposure for Dark Indoor Shots
        face_skin_bool = np.isin(cls_map, [1, 2])
        exp_gain = 1.0
        acr_lum = 0.2126 * acr_t[0] + 0.7152 * acr_t[1] + 0.0722 * acr_t[2]
        if face_skin_bool.sum() > 500:
            skin_mask_gpu = torch.from_numpy(face_skin_bool).to(self.device)
            skin_vals = acr_lum[skin_mask_gpu]
            med_skin = float(skin_vals.median().item())
            p85_skin = float(torch.quantile(skin_vals[::4], 0.85).item())
            if med_skin < 0.48 and p85_skin < 0.74:
                max_safe_gain = 0.78 / max(0.20, p85_skin)
                want_gain = (0.51 / max(0.12, med_skin)) ** 0.72
                exp_gain = float(np.clip(min(want_gain, max_safe_gain), 1.0, 1.48))
            elif p85_skin > 0.90 and med_skin > 0.66:
                exp_gain = float(np.clip(0.87 / p85_skin, 0.86, 1.0))
        else:
            # Scenery / non-face shot: gentle check if severely underexposed indoor
            med_all = float(acr_lum[::8, ::8].median().item())
            p90_all = float(torch.quantile(acr_lum[::16, ::16].reshape(-1), 0.90).item())
            if med_all < 0.22 and p90_all < 0.68:
                exp_gain = float(np.clip((0.28 / max(0.08, med_all)) ** 0.60, 1.0, 1.30))

        if abs(exp_gain - 1.0) > 0.015:
            k_sh = max(0.0, exp_gain - 1.0)
            acr_t = ((acr_t * exp_gain) / (1.0 + acr_t * k_sh * 0.75)).clamp(0.0, 1.0)

        # 4. 16-Bit Discrete Pimple Healing + Native 16-Bit Frequency Separation
        img_t, fs_skin_u8, eye_guard, mouth_guard, avg_fw = self.heal_pimples_crop_cuda(acr_t, cls_map, faces)

        if fs_skin_u8.sum() > 200:
            fs_mask_t = gauss_blur_cuda(torch.from_numpy(fs_skin_u8.astype(np.float32)).unsqueeze(0).to(self.device), max(4.0, 0.018 * avg_fw))
            low_base = gauss_blur_cuda(img_t, 5.2)
            high_pores = img_t - low_base
            low_broad = gauss_blur_cuda(low_base, max(10.0, 0.042 * avg_fw))
            diff_mag = torch.sqrt(((low_base - low_broad) ** 2).mean(dim=0, keepdim=True) + 1e-6)
            edge_w = torch.exp(-((diff_mag / 0.055) ** 2))
            low_surf = low_base * (1.0 - edge_w) + low_broad * edge_w
            img_t = (low_base * (1.0 - 0.40 * fs_mask_t) + low_surf * (0.40 * fs_mask_t) + high_pores).clamp(0.0, 1.0)

        # 5. Mizuki Color & Gentle Harmonious Masking ("Background vừa thôi")
        subj_soft = gauss_blur_cuda(subj_t.unsqueeze(0), 16.0)[0]
        bg_mask = (1.0 - subj_soft).clamp(0.0, 1.0)

        yy = torch.linspace(0.0, 1.0, H, device=self.device).view(H, 1).expand(H, W)
        xx = torch.linspace(0.0, 1.0, W, device=self.device).view(1, W).expand(H, W)

        # A. Gentle Background Minus Subject (-14% sat, -0.11 EV midtone, subtle cool airiness)
        mean_rgb = img_t.mean(dim=0, keepdim=True)
        bg_desat = mean_rgb + (img_t - mean_rgb) * 0.86
        bg_crv = torch.stack([
            self.curves.apply(bg_desat[0], [[0, 0], [48, 45], [136, 126], [215, 206], [255, 248]]),
            self.curves.apply(bg_desat[1], [[0, 0], [48, 46], [136, 128], [215, 208], [255, 250]]),
            self.curves.apply(bg_desat[2], [[0, 2], [48, 48], [136, 131], [215, 211], [255, 252]]),
        ], dim=0)
        img_t = img_t * (1.0 - bg_mask.unsqueeze(0) * 0.85) + bg_crv * (bg_mask.unsqueeze(0) * 0.85)

        # B. Mizuki Pine-Emerald Foliage
        R, G, B = img_t[0], img_t[1], img_t[2]
        lum = 0.2126 * R + 0.7152 * G + 0.0722 * B
        foliage_raw = ((G > B * 1.06) & (G >= R * 0.93) & ((G - B) > 0.025) & (lum < 0.62) & (lum > 0.025)).float()
        foliage_mask = gauss_blur_cuda((foliage_raw * (1.0 - subj_soft * 0.95)).unsqueeze(0), 6.0)[0].clamp(0.0, 1.0)
        if float(foliage_mask[::8, ::8].mean().item()) > 0.002:
            pine_t = torch.stack([
                self.curves.apply(R, [[0, 0], [75, 52], [150, 118], [255, 240]]),
                self.curves.apply(G, [[0, 0], [85, 88], [170, 172], [255, 255]]),
                self.curves.apply(B, [[0, 2], [75, 84], [155, 164], [255, 255]]),
            ], dim=0)
            pine_lum = torch.stack([
                self.curves.apply(pine_t[c], [[0, 0], [95, 76], [185, 164], [255, 255]]) for c in range(3)
            ], dim=0)
            img_t = img_t * (1.0 - foliage_mask.unsqueeze(0) * 0.88) + pine_lum * (foliage_mask.unsqueeze(0) * 0.88)

        # C. Mizuki Lycoris RedContrast on Red-Gold Garments
        R, G, B = img_t[0], img_t[1], img_t[2]
        skin_any = torch.from_numpy(np.isin(cls_map, [1, 2, 8, 9, 11, 12, 17]).astype(np.float32)).to(self.device)
        skin_guard = gauss_blur_cuda(skin_any.unsqueeze(0), 12.0)[0]
        red_dom = (((R - 0.55 * G - 0.45 * B) - 0.15) / 0.16).clamp(0.0, 1.0)
        red_mask = gauss_blur_cuda((subj_soft * red_dom * (1.0 - skin_guard).clamp(0.0, 1.0)).unsqueeze(0), 6.0)[0]
        if float(red_mask[::8, ::8].mean().item()) > 0.003:
            lycoris_t = torch.stack([
                self.curves.apply(R, [[0, 0], [65, 54], [150, 148], [220, 226], [255, 255]]),
                self.curves.apply(G, [[0, 0], [85, 72], [165, 155], [235, 233], [255, 255]]),
                self.curves.apply(B, [[0, 2], [75, 82], [160, 166], [255, 255]]),
            ], dim=0)
            img_t = img_t * (1.0 - red_mask.unsqueeze(0) * 0.82) + lycoris_t * (red_mask.unsqueeze(0) * 0.82)

        # D. Auto-Directional Gentle Mask 1 (-Shadow) & Mask 2 (Sunlight Glow)
        lum = 0.2126 * img_t[0] + 0.7152 * img_t[1] + 0.0722 * img_t[2]
        up_left = float(lum[:H // 2:8, :W // 2:8].mean().item())
        up_right = float(lum[:H // 2:8, W // 2::8].mean().item())
        sun_x = 0.82 if up_right >= up_left else 0.18
        shad_x = 0.08 if up_right >= up_left else 0.92

        dx_s = (xx - shad_x) * (1.0 if shad_x < 0.5 else -1.0)
        diag_shadow = (((1.0 - dx_s) * 0.45 + yy * 0.65 - 0.42) / 0.62).clamp(0.0, 1.0)
        diag_shadow = diag_shadow * diag_shadow * (3.0 - 2.0 * diag_shadow)
        subj_broad = gauss_blur_cuda(subj_t.unsqueeze(0), 90.0)[0]
        mask1_shad = (diag_shadow * (1.0 - 0.80 * subj_broad)).clamp(0.0, 1.0)

        shad_t = torch.stack([
            self.curves.apply(img_t[0], [[0, 0], [64, 52], [145, 125], [215, 194], [255, 236]]),
            self.curves.apply(img_t[1], [[0, 0], [64, 53], [145, 126], [215, 195], [255, 237]]),
            self.curves.apply(img_t[2], [[0, 2], [64, 55], [145, 128], [215, 197], [255, 239]]),
        ], dim=0)
        img_t = img_t * (1.0 - mask1_shad.unsqueeze(0) * 0.80) + shad_t * (mask1_shad.unsqueeze(0) * 0.80)

        dist2_glow = ((xx - sun_x) / 0.56) ** 2 + ((yy - 0.14) / 0.48) ** 2
        mask2_glow = torch.exp(-1.15 * dist2_glow)
        glow_t = torch.stack([
            self.curves.apply(img_t[c], [[0, 0], [70, 74], [145, 157], [215, 226], [255, 255]]) for c in range(3)
        ], dim=0)
        img_t = img_t * (1.0 - mask2_glow.unsqueeze(0) * 0.72) + glow_t * (mask2_glow.unsqueeze(0) * 0.72)

        # E. Tight Facial Luminance & Clean Toumeikan Skin for All Faces
        if faces:
            face_rad_all = torch.zeros((H, W), device=self.device)
            for f in faces:
                fx0, fy0, fx1, fy1 = f["bbox"]
                fcx, fcy = 0.5 * (fx0 + fx1) / W, 0.5 * (fy0 + fy1) / H
                frx = max(0.06, 0.85 * (fx1 - fx0) / W)
                fry = max(0.08, 0.95 * (fy1 - fy0) / H)
                fr = torch.exp(-(((xx - fcx) / frx) ** 2 + ((yy - fcy) / fry) ** 2))
                face_rad_all = torch.maximum(face_rad_all, fr)
            face_rad_all = face_rad_all * subj_soft

            face_lift_t = torch.stack([
                self.curves.apply(img_t[c], [[0, 0], [38, 40], [115, 127], [185, 193], [232, 234], [255, 255]])
                for c in range(3)
            ], dim=0)
            img_t = img_t * (1.0 - face_rad_all.unsqueeze(0) * 0.80) + face_lift_t * (face_rad_all.unsqueeze(0) * 0.80)

            skin_clean_np = (np.isin(cls_map, [1, 2, 17]) & (~(eye_guard > 0)) & (~(mouth_guard > 0))).astype(np.float32)
            skin_clean_t = gauss_blur_cuda(torch.from_numpy(skin_clean_np).unsqueeze(0).to(self.device), 14.0)[0]
            toumeikan_t = torch.stack([
                img_t[0],
                self.curves.apply(img_t[1], [[0, 0], [125, 129], [225, 226], [255, 255]]),
                self.curves.apply(img_t[2], [[0, 0], [125, 133], [225, 226], [255, 255]]),
            ], dim=0)
            img_t = img_t * (1.0 - skin_clean_t.unsqueeze(0) * 0.52) + toumeikan_t * (skin_clean_t.unsqueeze(0) * 0.52)

        # F. Subtle Black Mist 1/4 Highlight Softening + Mizuki All Days Clear Master Film Toe
        lum = 0.2126 * img_t[0] + 0.7152 * img_t[1] + 0.0722 * img_t[2]
        eye_guard_t = torch.from_numpy((eye_guard > 0).astype(np.float32)).to(self.device)
        hl_mask = (((lum - 0.72) / 0.24).clamp(0.0, 1.0) ** 2) * (1.0 - eye_guard_t)
        blur_hl = gauss_blur_cuda(img_t, 36.0)
        screen_hl = 1.0 - (1.0 - img_t) * (1.0 - blur_hl)
        img_t = img_t * (1.0 - hl_mask.unsqueeze(0) * 0.09) + screen_hl * (hl_mask.unsqueeze(0) * 0.09)

        img_t = torch.stack([
            self.curves.apply(img_t[c], [[0, 3], [38, 35], [128, 131], [216, 219], [255, 252]])
            for c in range(3)
        ], dim=0)

        out_u8 = (img_t.permute(1, 2, 0).clamp(0.0, 1.0) * 255.0 + 0.5).byte().cpu().numpy()
        return out_u8, raw_u8, len(faces), exp_gain


def save_outputs_worker(stem: str, out_u8: np.ndarray, raw_u8):
    pil_im = Image.fromarray(out_u8)
    local_jpg = os.path.join(LOCAL_OUT_DIR, f"{stem}.jpg")
    drive_jpg = os.path.join(DRIVE_OUT_DIR, f"{stem}.jpg")
    pil_im.save(local_jpg, "JPEG", quality=96, subsampling=0, icc_profile=SRGB_ICC)
    # Copy bytes directly to Google Drive folder (avoids encoding JPEG twice!)
    with open(local_jpg, "rb") as fs, open(drive_jpg, "wb") as fd:
        fd.write(fs.read())

    if raw_u8 is not None:
        H, W = out_u8.shape[:2]
        if W >= H:
            tw, th = 1600, int(H * 1600 / W)
        else:
            th, tw = 1600, int(W * 1600 / H)
        b_sm = cv2.resize(raw_u8[:, :, ::-1], (tw, th), interpolation=cv2.INTER_AREA)
        a_sm = cv2.resize(out_u8[:, :, ::-1], (tw, th), interpolation=cv2.INTER_AREA)
        div = np.full((th, 6, 3), 255, dtype=np.uint8)
        cv2.putText(b_sm, f"{stem} TRUOC (RAW)", (26, 48), cv2.FONT_HERSHEY_SIMPLEX, 1.05, (255, 255, 255), 2, cv2.LINE_AA)
        cv2.putText(a_sm, f"{stem} SAU (Mizuki 16-Bit)", (26, 48), cv2.FONT_HERSHEY_SIMPLEX, 1.05, (120, 230, 255), 2, cv2.LINE_AA)
        ba_rgb = np.hstack([b_sm, div, a_sm])[:, :, ::-1]
        local_ba = os.path.join(LOCAL_BA_DIR, f"{stem}_So_Sanh.jpg")
        drive_ba = os.path.join(DRIVE_BA_DIR, f"{stem}_So_Sanh.jpg")
        Image.fromarray(ba_rgb).save(local_ba, "JPEG", quality=95, subsampling=0, icc_profile=SRGB_ICC)
        with open(local_ba, "rb") as fs, open(drive_ba, "wb") as fd:
            fd.write(fs.read())


def main():
    t_start = time.time()
    W_poly = np.load(LUT_CACHE)["W"]
    engine = TurboMizukiBatchEngine(W_poly)

    all_arws = sorted(glob.glob(os.path.join(SRC_FOLDER, "*.ARW")))
    total = len(all_arws)
    todo = []
    for idx, fp in enumerate(all_arws):
        stem = os.path.splitext(os.path.basename(fp))[0]
        drive_jpg = os.path.join(DRIVE_OUT_DIR, f"{stem}.jpg")
        if os.path.exists(drive_jpg) and os.path.getsize(drive_jpg) > 500_000:
            continue
        todo.append((idx, fp, stem))

    done_already = total - len(todo)
    print(f"[Batch] Total ARW: {total} | Already completed: {done_already} | Remaining: {len(todo)}", flush=True)
    if not todo:
        print("[Batch] All 305 photos already completed!", flush=True)
        return

    # Sliding window of 8 parallel ARW readers/decoders + 4 async JPEG writers
    MAX_PREFETCH = 8
    decode_pool = ThreadPoolExecutor(max_workers=MAX_PREFETCH)
    save_pool = ThreadPoolExecutor(max_workers=4)

    inflight = []
    next_submit = 0
    while next_submit < min(MAX_PREFETCH, len(todo)):
        idx, fp, stem = todo[next_submit]
        fut = decode_pool.submit(decode_arw_u16, fp)
        inflight.append((idx, fp, stem, fut))
        next_submit += 1

    save_futs = []
    processed = 0
    errors = 0

    while inflight:
        idx, fp, stem, fut = inflight.pop(0)
        if next_submit < len(todo):
            n_idx, n_fp, n_stem = todo[next_submit]
            n_fut = decode_pool.submit(decode_arw_u16, n_fp)
            inflight.append((n_idx, n_fp, n_stem, n_fut))
            next_submit += 1

        try:
            rgb16_u16 = fut.result()
            # Generate Before/After showcase every 20th photo + key shots
            need_ba = (idx % 20 == 0) or (stem in ("DSC01702", "DSC01733", "DSC01821", "DSC01869", "DSC01923", "DSC02070"))
            out_u8, raw_u8, n_faces, gain = engine.process_u16_array(rgb16_u16, need_raw_preview=need_ba)
            del rgb16_u16

            # Throttle save_futs so RAM stays < 2GB
            save_futs = [sf for sf in save_futs if not sf.done()]
            while len(save_futs) >= 8:
                save_futs[0].result()
                save_futs.pop(0)
            save_futs.append(save_pool.submit(save_outputs_worker, stem, out_u8, raw_u8))

            processed += 1
            done_now = done_already + processed
            if processed == 1 or processed % 10 == 0 or done_now == total:
                elapsed = time.time() - t_start
                rate = processed / max(0.1, elapsed)
                eta_s = (len(todo) - processed) / max(0.01, rate)
                print(
                    f"[{done_now:3d}/{total}] {stem}.jpg ({out_u8.shape[1]}x{out_u8.shape[0]}, faces={n_faces}, gain={gain:.2f}) "
                    f"| {rate:.2f} img/s | Elapsed: {elapsed/60:.1f}m | ETA: {eta_s/60:.1f}m",
                    flush=True,
                )
        except Exception as e:
            errors += 1
            print(f"[ERROR] {stem}: {e}", flush=True)
            traceback.print_exc()

    for sf in save_futs:
        sf.result()
    decode_pool.shutdown(wait=True)
    save_pool.shutdown(wait=True)

    total_time = time.time() - t_start
    print(f"[DONE] Completed {processed} photos ({errors} errors) in {total_time/60:.2f} minutes!", flush=True)


if __name__ == "__main__":
    main()
