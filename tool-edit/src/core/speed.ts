// Thoi gian lai (time remap) / speed ramp: toc do theo keyframe -> thoi diem NGUON. Thuan tuy, co test. Xem CHUC-NANG.md F-43.
import { easeFromName, evalTrack, type Keyframe } from './anim';
import type { Clip } from './schema';

export const SPEED_MIN = 0.05;
export const SPEED_MAX = 16;
const STEP = 1 / 120; // buoc tich phan (s)

export const isVariableSpeed = (c: Clip): boolean => !!c.keyframes?.speed?.length;
export const baseSpeed = (c: Clip): number => c.speed ?? 1;
export const hasSpeed = (c: Clip): boolean => isVariableSpeed(c) || Math.abs(baseSpeed(c) - 1) > 1e-9;

/** Toc do tai thoi diem clip-local lt. */
export function speedAt(c: Clip, lt: number): number {
  const ks = c.keyframes?.speed;
  return ks?.length ? evalTrack(ks, lt) : baseSpeed(c);
}

/** Thoi diem NGUON (giay trong media) tai thoi diem clip-local lt = in + tich phan toc do tu 0 den lt. */
export function srcTimeAt(c: Clip, lt: number): number {
  if (lt <= 0) return c.in;
  const ks: Keyframe[] | undefined = c.keyframes?.speed;
  if (!ks?.length) return c.in + lt * baseSpeed(c);
  const n = Math.max(1, Math.ceil(lt / STEP));
  const h = lt / n;
  let acc = 0;
  let prev = evalTrack(ks, 0);
  for (let i = 1; i <= n; i++) {
    const cur = evalTrack(ks, i * h);
    acc += ((prev + cur) / 2) * h;
    prev = cur;
  }
  return c.in + acc;
}

/** Do dai doan nguon ma clip tieu thu (giay nguon). */
export const srcSpan = (c: Clip): number => srcTimeAt(c, c.duration) - c.in;

/** Cac "tốc độ" cho preset speed ramp: danh sach (t chuan hoa 0..1 theo do dai clip, toc do, ease). */
export interface SpeedPreset {
  id: string;
  name: string;
  description: string;
  points: { t: number; v: number; ease: string }[];
}
export const SPEED_PRESETS: SpeedPreset[] = [
  { id: 'hero-time', name: 'Hero time', description: 'Bình thường, chậm dần về 25% ở giữa rồi tăng tốc trở lại', points: [{ t: 0, v: 1, ease: 'ease-in-out' }, { t: 0.35, v: 0.25, ease: 'ease-in-out' }, { t: 0.65, v: 0.25, ease: 'ease-in-out' }, { t: 1, v: 1, ease: 'linear' }] },
  { id: 'bullet-time', name: 'Bullet time', description: 'Rất chậm (10%) ở đoạn giữa, vào/ra nhanh', points: [{ t: 0, v: 1.5, ease: 'ease-out' }, { t: 0.3, v: 0.1, ease: 'linear' }, { t: 0.7, v: 0.1, ease: 'ease-in' }, { t: 1, v: 1.5, ease: 'linear' }] },
  { id: 'speed-up-end', name: 'Tăng tốc cuối', description: 'Bình thường rồi tăng dần lên 3x', points: [{ t: 0, v: 1, ease: 'ease-in' }, { t: 1, v: 3, ease: 'linear' }] },
  { id: 'slow-start', name: 'Chậm đầu', description: 'Bắt đầu chậm 30% rồi về bình thường', points: [{ t: 0, v: 0.3, ease: 'ease-out' }, { t: 1, v: 1, ease: 'linear' }] },
  { id: 'pulse', name: 'Nhấp nháy nhanh – chậm', description: 'Xen kẽ 2x và 0.5x (tính theo độ dài clip)', points: [{ t: 0, v: 2, ease: 'ease-in-out' }, { t: 0.25, v: 0.5, ease: 'ease-in-out' }, { t: 0.5, v: 2, ease: 'ease-in-out' }, { t: 0.75, v: 0.5, ease: 'ease-in-out' }, { t: 1, v: 2, ease: 'linear' }] },
];

/** Keyframe toc do cua mot preset, co gian theo do dai clip (giay tren timeline). */
export function speedPresetKeys(preset: SpeedPreset, duration: number): Keyframe[] {
  return preset.points.map((q) => ({ t: Math.round(q.t * duration * 1e6) / 1e6, v: q.v, ease: easeFromName(q.ease)! }));
}
