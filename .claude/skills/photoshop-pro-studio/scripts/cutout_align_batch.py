"""
Photoshop Pro Studio — Tách nền chủ thể sắc nét (BiRefNet FP16) + Khử viền màu + Căn tỷ lệ đồng nhất + Xuất PNG & PSD đa layer.
Chạy bằng:
  "D:\AI\full studio\voice-studio\.venv\Scripts\python.exe" cutout_align_batch.py --input "path/to/in" --output "path/to/out" --width 1080 --height 1920
"""
import os
import glob
import argparse
import cv2
import numpy as np
import torch
import torch.nn.functional as F
from PIL import Image, ImageOps, ImageCms
from torchvision import transforms
from transformers import AutoModelForImageSegmentation
import pillow_heif
import packbits
import pytoshop
from pytoshop.user import nested_layers
import pytoshop.codecs

pillow_heif.register_heif_opener()
pytoshop.codecs.packbits = packbits
SRGB_PROF = ImageCms.createProfile("sRGB")
SRGB_ICC = ImageCms.ImageCmsProfile(SRGB_PROF).tobytes()


def load_image_srgb(path: str) -> np.ndarray:
    im = Image.open(path)
    im = ImageOps.exif_transpose(im)
    icc = im.info.get("icc_profile")
    im = im.convert("RGB")
    if icc:
        try:
            from io import BytesIO
            src_prof = ImageCms.ImageCmsProfile(BytesIO(icc))
            im = ImageCms.profileToProfile(im, src_prof, SRGB_PROF, outputMode="RGB")
        except Exception:
            pass
    return np.array(im)


def decontaminate_edges(rgb: np.ndarray, alpha_f: np.ndarray) -> np.ndarray:
    core = (alpha_f > 0.92).astype(np.float32)
    edge = (alpha_f > 0.02) & (alpha_f <= 0.92)
    rgb_f = rgb.astype(np.float32)
    num = cv2.GaussianBlur(rgb_f * core[..., None], (0, 0), 7.0)
    den = cv2.GaussianBlur(core, (0, 0), 7.0)[..., None]
    clean_rgb = np.where(den > 1e-4, num / np.maximum(den, 1e-4), rgb_f)
    out = rgb_f.copy()
    w = ((0.92 - alpha_f) / 0.90).clip(0.0, 1.0)[..., None] * 0.75
    out[edge] = (rgb_f * (1.0 - w) + clean_rgb * w)[edge]
    return np.clip(np.round(out), 0, 255).astype(np.uint8)


def save_cutout_psd(rgba: np.ndarray, orig_canvas_rgb: np.ndarray, psd_path: str):
    H, W = rgba.shape[:2]
    cut_chans = {-1: rgba[..., 3], 0: rgba[..., 0], 1: rgba[..., 1], 2: rgba[..., 2]}
    bg_chans = {-1: np.full((H, W), 255, dtype=np.uint8), 0: orig_canvas_rgb[..., 0], 1: orig_canvas_rgb[..., 1], 2: orig_canvas_rgb[..., 2]}
    layers = [
        nested_layers.Image(name="Chu The Da Tach Nen (Cutout)", visible=True, opacity=255, group_id=0, blend_mode=pytoshop.enums.BlendMode.normal, top=0, left=0, bottom=H, right=W, channels=cut_chans),
        nested_layers.Image(name="Anh Goc Tham Chieu (An)", visible=False, opacity=255, group_id=0, blend_mode=pytoshop.enums.BlendMode.normal, top=0, left=0, bottom=H, right=W, channels=bg_chans),
    ]
    psd = nested_layers.nested_layers_to_psd(layers, color_mode=pytoshop.enums.ColorMode.rgb, size=(W, H), compression=pytoshop.enums.Compression.rle)
    os.makedirs(os.path.dirname(psd_path), exist_ok=True)
    with open(psd_path, "wb") as f:
        psd.write(f)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", required=True)
    ap.add_argument("--output", required=True)
    ap.add_argument("--width", type=int, default=1080)
    ap.add_argument("--height", type=int, default=1920)
    ap.add_argument("--target-fill", type=float, default=0.80, help="Subject height ratio in canvas")
    ap.add_argument("--bottom-margin", type=float, default=0.06, help="Bottom baseline margin ratio")
    ap.add_argument("--export-psd", action="store_true", default=True)
    args = ap.parse_args()

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = AutoModelForImageSegmentation.from_pretrained("ZhengPeng7/BiRefNet", trust_remote_code=True).to(device).eval().half()
    tf = transforms.Compose([
        transforms.Resize((1024, 1024)),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
    ])

    exts = ("*.heic", "*.HEIC", "*.jpg", "*.JPG", "*.jpeg", "*.png", "*.PNG")
    files = sorted({p for ext in exts for p in glob.glob(os.path.join(args.input, ext))})
    os.makedirs(os.path.join(args.output, "PNG"), exist_ok=True)
    if args.export_psd:
        os.makedirs(os.path.join(args.output, "PSD"), exist_ok=True)

    CW, CH = args.width, args.height
    target_h = int(CH * args.target_fill)
    base_y = int(CH * (1.0 - args.bottom_margin))

    for idx, p in enumerate(files, 1):
        nm = os.path.splitext(os.path.basename(p))[0]
        rgb = load_image_srgb(p)
        H, W = rgb.shape[:2]
        with torch.inference_mode():
            inp = tf(Image.fromarray(rgb)).unsqueeze(0).to(device).half()
            pred = model(inp)[-1].sigmoid().float()
            alpha = F.interpolate(pred, size=(H, W), mode="bilinear", align_corners=False)[0, 0].cpu().numpy()

        ys, xs = np.where(alpha > 0.25)
        if len(xs) < 50:
            continue
        x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
        cx_mass = float(np.average(np.arange(x0, x1), weights=alpha[y0:y1, x0:x1].sum(axis=0) + 1e-5))

        clean_rgb = decontaminate_edges(rgb, alpha)
        scale = min(target_h / float(y1 - y0), (CW * 0.90) / float(x1 - x0))
        nw, nh = max(1, int(round(W * scale))), max(1, int(round(H * scale)))
        s_rgb = cv2.resize(clean_rgb, (nw, nh), interpolation=cv2.INTER_AREA if scale < 1 else cv2.INTER_CUBIC)
        s_alp = cv2.resize((alpha * 255.0).clip(0, 255).astype(np.uint8), (nw, nh), interpolation=cv2.INTER_AREA if scale < 1 else cv2.INTER_CUBIC)
        s_orig = cv2.resize(rgb, (nw, nh), interpolation=cv2.INTER_AREA if scale < 1 else cv2.INTER_CUBIC)

        dx = int(round(CW * 0.5 - cx_mass * scale))
        dy = int(round(base_y - y1 * scale))

        canvas_rgba = np.zeros((CH, CW, 4), dtype=np.uint8)
        canvas_orig = np.full((CH, CW, 3), 240, dtype=np.uint8)

        sx0, sy0 = max(0, -dx), max(0, -dy)
        tx0, ty0 = max(0, dx), max(0, dy)
        cp_w, cp_h = min(nw - sx0, CW - tx0), min(nh - sy0, CH - ty0)
        if cp_w > 0 and cp_h > 0:
            canvas_rgba[ty0 : ty0 + cp_h, tx0 : tx0 + cp_w, :3] = s_rgb[sy0 : sy0 + cp_h, sx0 : sx0 + cp_w]
            canvas_rgba[ty0 : ty0 + cp_h, tx0 : tx0 + cp_w, 3] = s_alp[sy0 : sy0 + cp_h, sx0 : sx0 + cp_w]
            canvas_orig[ty0 : ty0 + cp_h, tx0 : tx0 + cp_w] = s_orig[sy0 : sy0 + cp_h, sx0 : sx0 + cp_w]

        Image.fromarray(canvas_rgba).save(os.path.join(args.output, "PNG", f"{nm}.png"), icc_profile=SRGB_ICC)
        if args.export_psd:
            save_cutout_psd(canvas_rgba, canvas_orig, os.path.join(args.output, "PSD", f"{nm}.psd"))
        print(f"[{idx:02d}/{len(files):02d}] Saved {nm}.png + .psd ({CW}x{CH})")


if __name__ == "__main__":
    main()
