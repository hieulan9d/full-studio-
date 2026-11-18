// Doi #rrggbb sang [r,g,b] 0..1 (ma hoa sRGB; fx dung truc tiep tren khong gian tuyen tinh la du cho bong/glow don sac).
import { srgbEotf } from '../core/color';

export function hexToRgb01(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', '').slice(0, 6), 16);
  return [srgbEotf(((n >> 16) & 255) / 255), srgbEotf(((n >> 8) & 255) / 255), srgbEotf((n & 255) / 255)];
}
