// Preset chu/chuyen dong. Cac so do lay tu kit (th-lib.jsx: T.keyword, T.number, T.capGroup, T.punchIn, T.glow, T.shadow). Xem F-26.
import { EASE_PRESETS, easeFromName, type Keyframe, type KeyframeMap } from './anim';
import { mergeText, type DeepPartialText, type TextSpec } from './text';
import type { Clip, Transform } from './schema';

const F = 1 / 30; // 1 khung o 30 fps (so do cua kit)

export interface PresetKey {
  t: number; // giay tu dau clip (hoac tu CUOI clip neu fromEnd)
  v: number;
  ease: string; // ten trong EASE_PRESETS
  fromEnd?: boolean;
}

export interface Preset {
  id: string;
  name: string;
  description: string;
  source: string; // nguon so do
  text: DeepPartialText;
  transform?: Partial<Transform>;
  keys?: Record<string, PresetKey[]>;
  defaultContent?: string;
  defaultDuration?: number;
}

const STRONG_FONT = 'Segoe UI Black';

export const PRESETS: Preset[] = [
  {
    id: 'keyword-gradient',
    name: 'Từ khóa gradient',
    description: 'Chữ to, gradient dọc tím → oải hương, bóng nhẹ; vào bằng scale 135% → 100% trong 5 khung, tắt trong 3 khung cuối.',
    source: 'kit talking-head: T.keyword (gradient #7563ff -> #dcd3ff, shadow 40% dist 6 soft 20, punchIn 135 trong 5 khung, cut 3 khung)',
    text: { font: STRONG_FONT, size: 260, weight: 900, lineHeight: 0.98, fill: { type: 'linear', angle: 90, offset: 0, stops: [{ pos: 0, color: '#7563ff' }, { pos: 1, color: '#dcd3ff' }] }, shadow: { color: '#000000', opacity: 0.4, blur: 20, x: 0, y: 6 } },
    keys: {
      'transform.scale': [{ t: 0, v: 1.35, ease: 'snap' }, { t: 5 * F, v: 1, ease: 'linear' }],
      'transform.opacity': [{ t: 0, v: 0, ease: 'linear' }, { t: 2 * F, v: 1, ease: 'linear' }, { t: -3 * F, v: 1, ease: 'linear', fromEnd: true }, { t: 0, v: 0, ease: 'linear', fromEnd: true }],
    },
    defaultContent: 'Từ khoá',
    defaultDuration: 2.5,
  },
  {
    id: 'neon-number',
    name: 'Số neon',
    description: 'Số lớn màu tím, viền cyan 12px đè lên nền chữ, glow cyan; vào bằng scale 150% → 100% và xoay −14° → 0 trong 8 khung.',
    source: 'kit talking-head: T.number (digit #9a82ff, stroke #8ff8ff 12 strokeOver, glow #5ff4ff r30 x0.9; scale 150->100, rot -14->0 trong 8 khung, opacity 0->100 trong 2 khung)',
    text: { font: STRONG_FONT, size: 700, weight: 900, italic: true, fill: { type: 'solid', color: '#9a82ff' }, stroke: { color: '#8ff8ff', width: 12, over: true }, glow: { color: '#5ff4ff', radius: 30, strength: 0.9 } },
    keys: {
      'transform.scale': [{ t: 2 * F, v: 1.5, ease: 'snap' }, { t: 10 * F, v: 1, ease: 'linear' }],
      'transform.rotation': [{ t: 2 * F, v: -14, ease: 'snap' }, { t: 10 * F, v: 0, ease: 'linear' }],
      'transform.opacity': [{ t: 0, v: 0, ease: 'linear' }, { t: 2 * F + 2 * F, v: 1, ease: 'linear' }, { t: -3 * F, v: 1, ease: 'linear', fromEnd: true }, { t: 0, v: 0, ease: 'linear', fromEnd: true }],
    },
    defaultContent: '1',
    defaultDuration: 2.5,
  },
  {
    id: 'neon-label',
    name: 'Nhãn neon xanh',
    description: 'Nhãn chữ xanh dương có glow, vào bằng punch-in 140% trong 5 khung.',
    source: 'kit talking-head: T.number (label #1f4fff size 190, glow #2a5cff r20 x0.9, punchIn 140 trong 5 khung)',
    text: { font: STRONG_FONT, size: 190, weight: 900, align: 'left', fill: { type: 'solid', color: '#1f4fff' }, glow: { color: '#2a5cff', radius: 20, strength: 0.9 } },
    keys: {
      'transform.scale': [{ t: 0, v: 1.4, ease: 'snap' }, { t: 5 * F, v: 1, ease: 'linear' }],
      'transform.opacity': [{ t: 0, v: 0, ease: 'linear' }, { t: 2 * F, v: 1, ease: 'linear' }, { t: -3 * F, v: 1, ease: 'linear', fromEnd: true }, { t: 0, v: 0, ease: 'linear', fromEnd: true }],
    },
    defaultContent: 'Number',
    defaultDuration: 2.5,
  },
  {
    id: 'caption-word',
    name: 'Phụ đề từng từ',
    description: 'Chữ cỡ 112 màu ngọc lam, glow; mỗi từ trượt lên 30px và hết mờ trong 5 khung, các từ cách nhau theo nhịp nói.',
    source: 'kit talking-head: T.capGroup (size 112, mau #5cf7e0, glow r14 x1.0, tu truot len 30px trong 5 khung kem blurIn 18)',
    text: { font: 'Segoe UI', size: 112, weight: 700, italic: true, fill: { type: 'solid', color: '#5cf7e0' }, glow: { color: '#5cf7e0', radius: 14, strength: 1 }, animator: { preset: 'slide-up', unit: 'word', duration: 5 * F, stagger: 0.18, delay: 0, distance: 30, blur: 18, out: false } },
    transform: { anchorV: 'bottom', y: -0.22 },
    defaultContent: 'Phụ đề từng từ hiện đúng nhịp nói',
    defaultDuration: 3,
  },
  {
    id: 'title-white',
    name: 'Tiêu đề trắng',
    description: 'Tiêu đề trắng, bóng mềm, hiện dần (fade) trong 0,4 giây.',
    source: 'chuẩn chung (không lấy từ một video cũ thẻ)',
    text: { font: 'Segoe UI', size: 150, weight: 800, fill: { type: 'solid', color: '#ffffff' }, shadow: { color: '#000000', opacity: 0.5, blur: 24, x: 0, y: 8 } },
    keys: { 'transform.opacity': [{ t: 0, v: 0, ease: 'ease-out' }, { t: 0.4, v: 1, ease: 'linear' }, { t: -0.3, v: 1, ease: 'linear', fromEnd: true }, { t: 0, v: 0, ease: 'linear', fromEnd: true }] },
    defaultContent: 'Tiêu đề',
    defaultDuration: 3,
  },
  {
    id: 'gradient-sunset',
    name: 'Gradient hoàng hôn',
    description: 'Chữ gradient chéo cam → đỏ thẫm, viền mỏng tối, gradient tự chạy chậm.',
    source: 'chuẩn chung (gradient animate bằng transform fill.offset)',
    text: { font: STRONG_FONT, size: 200, weight: 900, fill: { type: 'linear', angle: 35, offset: 0, stops: [{ pos: 0, color: '#ff9a2e' }, { pos: 0.5, color: '#ff3d71' }, { pos: 1, color: '#7b2dff' }] }, stroke: { color: '#20103a', width: 6, over: false }, shadow: { color: '#000000', opacity: 0.45, blur: 18, x: 0, y: 6 } },
    keys: { 'text.fill.offset': [{ t: 0, v: 0, ease: 'linear' }, { t: 3, v: 0.5, ease: 'linear' }] },
    defaultContent: 'Gradient',
    defaultDuration: 3,
  },
  {
    id: 'typewriter',
    name: 'Máy đánh chữ',
    description: 'Chữ hiện từng ký tự như máy đánh chữ, nền tối, viền mỏng.',
    source: 'chuẩn chung',
    text: { font: 'Consolas', size: 96, weight: 600, align: 'left', fill: { type: 'solid', color: '#e8ffe8' }, glow: { color: '#7dff9a', radius: 10, strength: 0.5 }, animator: { preset: 'typewriter', unit: 'char', duration: 0.001, stagger: 0.05, delay: 0.2, distance: 0, blur: 0, out: false } },
    defaultContent: 'Đang gỡ từng chữ một...',
    defaultDuration: 3,
  },
  {
    id: 'bounce-words',
    name: 'Từ nảy nhún',
    description: 'Mỗi từ nảy vào theo nhịp, màu vàng, viền đen.',
    source: 'chuẩn chung',
    text: { font: STRONG_FONT, size: 140, weight: 900, fill: { type: 'solid', color: '#ffd166' }, stroke: { color: '#1a1305', width: 10, over: false }, animator: { preset: 'bounce', unit: 'word', duration: 0.45, stagger: 0.15, delay: 0, distance: 70, blur: 0, out: false } },
    defaultContent: 'Này lên nào',
    defaultDuration: 3,
  },
];

export function getPreset(id: string): Preset | undefined {
  return PRESETS.find((p) => p.id === id);
}

/** Tao KeyframeMap tu preset cho clip dai `duration` giay. */
export function presetKeys(p: Preset, duration: number): KeyframeMap {
  const out: KeyframeMap = {};
  for (const [prop, ks] of Object.entries(p.keys ?? {})) {
    const list: Keyframe[] = ks.map((k) => ({ t: Math.round((k.fromEnd ? duration + k.t : k.t) * 1e6) / 1e6, v: k.v, ease: easeFromName(k.ease) ?? { ...EASE_PRESETS.linear } }));
    list.sort((a, b) => a.t - b.t);
    // bo khung bi trung thoi diem (clip qua ngan)
    out[prop] = list.filter((k, i) => i === 0 || k.t > list[i - 1].t + 1e-4);
  }
  return out;
}

/** Ap preset len clip chu: gop text, transform, THAY cac track keyframe ma preset dinh nghia. Tra loi neu khong phai clip chu. */
export function applyPresetToClip(c: Clip, id: string): string | null {
  const p = getPreset(id);
  if (!p) return `khong co preset "${id}" (co: ${PRESETS.map((x) => x.id).join(', ')})`;
  if (c.src.type !== 'text') return `preset chi ap dung cho clip chu (clip ${c.id} khong phai)`;
  c.src.text = mergeText(c.src.text as TextSpec, p.text);
  if (p.transform) Object.assign(c.transform, p.transform);
  c.keyframes = c.keyframes ?? {};
  for (const [prop, keys] of Object.entries(presetKeys(p, c.duration))) c.keyframes[prop] = keys;
  return null;
}
