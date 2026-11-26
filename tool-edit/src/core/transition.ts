// Chuyển cảnh giữa hai clip liền nhau trên cùng track (hoặc "vào" từ nền nếu không có clip trước): thuần túy, có test.
// Không có shader riêng: mỗi kiểu chỉ là một bộ tham số (độ đục, dịch, tỉ lệ, xoay, xoay 3D, mờ, quét) áp lên lớp ra (A) và lớp vào (B),
// nên chạy chung đường GPU với xem trước và xuất. Xem CHUC-NANG.md F-94.

export type TransitionKind =
  | 'dissolve' | 'fadeblack' | 'fadewhite'
  | 'slideleft' | 'slideright' | 'slideup' | 'slidedown'
  | 'wipeleft' | 'wiperight' | 'wipeup' | 'wipedown'
  | 'zoomin' | 'zoomout' | 'blur' | 'spin' | 'flip' | 'cube' | 'glitch';

export interface Transition {
  kind: TransitionKind;
  duration: number; // giây; chuyển cảnh nằm ở ĐẦU clip (clip trước kéo dài thêm phần đuôi nếu nguồn còn)
}

export const TRANSITION_KINDS: TransitionKind[] = [
  'dissolve', 'fadeblack', 'fadewhite', 'slideleft', 'slideright', 'slideup', 'slidedown', 'wipeleft', 'wiperight', 'wipeup', 'wipedown',
  'zoomin', 'zoomout', 'blur', 'spin', 'flip', 'cube', 'glitch',
];
export const TRANSITION_LABEL: Record<TransitionKind, string> = {
  dissolve: 'Hòa tan', fadeblack: 'Mờ qua đen', fadewhite: 'Chớp trắng',
  slideleft: 'Trượt sang trái', slideright: 'Trượt sang phải', slideup: 'Trượt lên', slidedown: 'Trượt xuống',
  wipeleft: 'Quét sang trái', wiperight: 'Quét sang phải', wipeup: 'Quét lên', wipedown: 'Quét xuống',
  zoomin: 'Phóng vào', zoomout: 'Thu ra', blur: 'Mờ chuyển', spin: 'Xoay', flip: 'Lật 3D', cube: 'Khối lập phương 3D', glitch: 'Rung (glitch)',
};
export const TRANSITION_MAX = 5;
export const DEFAULT_TRANSITION: Transition = { kind: 'dissolve', duration: 0.5 };

export function validateTransition(t: Transition, clipDuration: number, where: string): string[] {
  const errs: string[] = [];
  if (!t || typeof t !== 'object') return [`${where}: transition phai la object`];
  if (!TRANSITION_KINDS.includes(t.kind)) errs.push(`${where}: kind phai la ${TRANSITION_KINDS.join('|')}`);
  if (!(Number.isFinite(t.duration) && t.duration > 0 && t.duration <= TRANSITION_MAX)) errs.push(`${where}: duration phai trong (0, ${TRANSITION_MAX}] giay`);
  else if (t.duration > clipDuration + 1e-6) errs.push(`${where}: duration (${t.duration}s) dai hon clip (${clipDuration.toFixed(3)}s)`);
  return errs;
}

/** Tham số áp lên MỘT lớp ở tiến độ p (0..1). Số "nhân" mặc định 1, số "cộng" mặc định 0. */
export interface LayerPatch {
  opacity?: number; // nhân
  dx?: number; // cộng, tỉ lệ chiều rộng khung
  dy?: number; // cộng, tỉ lệ chiều cao khung
  scale?: number; // nhân
  rot?: number; // cộng, độ (xoay phẳng)
  rotX?: number; // đặt, độ (3D)
  rotY?: number;
  blur?: number; // px @ cạnh ngắn 1080
  wipe?: { progress: number; angle: number; feather: number };
  hide?: boolean; // hoàn toàn không thấy: bỏ qua không vẽ
}
export interface TransitionPlan {
  out: LayerPatch;
  in: LayerPatch;
  flash?: number; // lớp trắng phủ toàn khung, độ đục 0..1
}

/** Làm mượt tiến độ (ease in-out bậc ba). */
export const smooth = (p: number) => {
  const x = Math.min(1, Math.max(0, p));
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
};

/** Kế hoạch cho kiểu `kind` tại tiến độ p đã làm mượt. */
export function planTransition(kind: TransitionKind, p: number): TransitionPlan {
  const q = 1 - p;
  const half = p < 0.5;
  switch (kind) {
    case 'dissolve':
      return { out: {}, in: { opacity: p } };
    case 'fadeblack':
      return { out: half ? { opacity: 1 - 2 * p } : { hide: true }, in: half ? { hide: true } : { opacity: 2 * p - 1 } };
    case 'fadewhite':
      return { out: { opacity: q }, in: { opacity: p }, flash: 0.85 * (1 - Math.abs(2 * p - 1)) };
    case 'slideleft':
      return { out: { dx: -p }, in: { dx: q } };
    case 'slideright':
      return { out: { dx: p }, in: { dx: -q } };
    case 'slideup':
      return { out: { dy: -p }, in: { dy: q } };
    case 'slidedown':
      return { out: { dy: p }, in: { dy: -q } };
    case 'wiperight':
      return { out: {}, in: { wipe: { progress: p, angle: 0, feather: 0.08 } } };
    case 'wipeleft':
      return { out: {}, in: { wipe: { progress: p, angle: 180, feather: 0.08 } } };
    case 'wipedown':
      return { out: {}, in: { wipe: { progress: p, angle: 90, feather: 0.08 } } };
    case 'wipeup':
      return { out: {}, in: { wipe: { progress: p, angle: 270, feather: 0.08 } } };
    case 'zoomin':
      return { out: { scale: 1 + 0.8 * p, opacity: q }, in: { scale: 0.85 + 0.15 * p, opacity: p } };
    case 'zoomout':
      return { out: { scale: 1 - 0.3 * p, opacity: q }, in: { scale: 1.4 - 0.4 * p, opacity: p } };
    case 'blur':
      return { out: { blur: 40 * p, opacity: q }, in: { blur: 40 * q, opacity: p } };
    case 'spin':
      return { out: { rot: -90 * p, scale: 1 - 0.5 * p, opacity: q }, in: { rot: 90 * q, scale: 0.5 + 0.5 * p, opacity: p } };
    case 'flip':
      return half ? { out: { rotY: 180 * p }, in: { hide: true } } : { out: { hide: true }, in: { rotY: -180 * q } };
    case 'cube':
      return { out: { rotY: -90 * p, dx: -0.5 * p }, in: { rotY: 90 * q, dx: 0.5 * q } };
    case 'glitch': {
      // rung ngang giả ngẫu nhiên nhưng xác định theo p (mọi lần xuất đều giống nhau)
      const j = (k: number) => Math.sin(p * k) * Math.sin(p * k * 1.7 + 1.3);
      const amp = Math.sin(Math.PI * p);
      return { out: { dx: 0.06 * amp * j(61), opacity: p < 0.5 ? 1 : 0.5 + 0.5 * Math.abs(j(37)) }, in: { dx: -0.06 * amp * j(53), opacity: p < 0.4 ? 0.2 + 0.8 * Math.abs(j(29)) * p : p } };
    }
  }
}
