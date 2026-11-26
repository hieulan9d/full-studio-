// Thư viện MẪU DỰNG SẴN: mỗi mẫu là một nhóm clip (hình, chữ, biểu đồ) đặt vào timeline bằng một lệnh, có biến để thay chữ / số / màu.
// Mẫu là dữ liệu thuần (không phải mã chạy): AI và người dùng điền biến, `expandTemplate` sinh các op add_clip (cùng một nhóm = clip ghép).
// Trong mẫu, vị trí (dx, dy) và keyframe transform.x/y tính bằng px @ cạnh ngắn 1080; khi đặt vào dự án mới đổi sang tỉ lệ khung (đúng cho cả 9:16 và 16:9).
// Xem CHUC-NANG.md F-97.
import { EASE_PRESETS, type Ease, type Keyframe, type KeyframeMap } from './anim';
import { parseChartData } from './chart';
import { DEFAULT_TRANSFORM, nextId, type Clip, type Op, type Project, type Transform } from './schema';

export type TemplateVarType = 'text' | 'number' | 'color' | 'data';
export interface TemplateVar {
  id: string;
  label: string;
  type: TemplateVarType; // data = nhiều dòng "Nhãn: giá trị" (biểu đồ)
  default: string | number;
}

export interface TemplateClip {
  layer: number; // thứ tự lớp trong mẫu: 0 = dưới cùng
  name?: string;
  src: Record<string, unknown>; // Source (một phần) — chuỗi có thể chứa {{biến}}
  start: number; // giây từ đầu mẫu
  duration: number;
  dx?: number; // px @1080 lệch X so với điểm neo
  dy?: number;
  transform?: Partial<Transform>;
  fx?: Record<string, unknown>;
  keyframes?: KeyframeMap; // transform.x / transform.y tính bằng px @1080
  blend?: Clip['blend'];
}

export interface Template {
  id: string;
  name: string;
  category: 'tieu-de' | 'kinh' | 'so-lieu' | 'nut' | 'bieu-do' | 'app';
  description: string;
  duration: number;
  vars: TemplateVar[];
  clips: TemplateClip[];
}

// ---------- hàm dựng nhanh ----------
const kf = (t: number, v: number, ease: keyof typeof EASE_PRESETS = 'snap'): Keyframe => ({ t, v, ease: { ...EASE_PRESETS[ease] } as Ease });
const fadeIn = (t0 = 0, d = 0.4): Keyframe[] => [kf(t0, 0, 'ease-out'), kf(t0 + d, 1, 'ease-out')];
const popIn = (t0 = 0, d = 0.45): Keyframe[] => [kf(t0, 0.88, 'overshoot'), kf(t0 + d, 1, 'overshoot')];
const fadeOut = (dur: number, d = 0.35): Keyframe[] => [kf(dur - d, 1, 'ease-in'), kf(dur, 0, 'ease-in')];
const slide = (base: number, from: number, t0 = 0, d = 0.5, ease: keyof typeof EASE_PRESETS = 'snap'): Keyframe[] => [kf(t0, base + from, ease), kf(t0 + d, base, ease)];

const text = (content: string, size: number, weight: number, extra: Record<string, unknown> = {}) => ({ type: 'text', text: { content, size, weight, maxWidth: 0.9, ...extra } });
const shape = (kind: string, w: number, h: number, extra: Record<string, unknown> = {}) => ({ type: 'shape', shape: { kind, w, h, ...extra } });
const glass = (w: number, h: number, radius = 44) => ({ src: shape('rect', w, h, { radius, fill: '#ffffff', fillOpacity: 0.12, stroke: { color: '#ffffff', width: 2 } }), fx: { backdrop: { radius: 30 }, shadow: { x: 0, y: 18, blur: 40, opacity: 0.45, color: '#000000' } } });

export const TEMPLATES: Template[] = [
  {
    id: 'glass-card',
    name: 'Thẻ kính',
    category: 'kinh',
    description: 'Thẻ kính mờ (làm mờ nền phía sau), viền sáng, bóng mềm; tiêu đề + dòng phụ hiện lần lượt.',
    duration: 4,
    vars: [
      { id: 'title', label: 'Tiêu đề', type: 'text', default: 'Tính năng mới' },
      { id: 'subtitle', label: 'Dòng phụ', type: 'text', default: 'Làm mờ nền phía sau, viền sáng, bóng mềm' },
      { id: 'accent', label: 'Màu nhấn', type: 'color', default: '#8c6cff' },
    ],
    clips: [
      { layer: 0, name: 'Thẻ', ...glass(820, 360), start: 0, duration: 4, keyframes: { 'transform.opacity': fadeIn(0, 0.4), 'transform.scale': popIn(0, 0.5) } },
      { layer: 1, name: 'Vạch nhấn', src: shape('rect', 110, 10, { radius: 5, fill: '{{accent}}', fillOpacity: 1, stroke: { color: '#ffffff', width: 0 } }), start: 0.25, duration: 3.75, dy: -112, keyframes: { 'transform.opacity': fadeIn(0, 0.3) } },
      { layer: 2, name: 'Tiêu đề', src: text('{{title}}', 66, 800, { animator: { preset: 'slide-up', unit: 'word', duration: 0.35, stagger: 0.06, delay: 0, distance: 30 } }), start: 0.3, duration: 3.7, dy: -38 },
      { layer: 3, name: 'Dòng phụ', src: text('{{subtitle}}', 34, 500, { fill: { type: 'solid', color: '#e7ebf7' }, animator: { preset: 'fade', unit: 'line', duration: 0.4, stagger: 0, delay: 0.15, distance: 0 } }), start: 0.55, duration: 3.45, dy: 52 },
    ],
  },
  {
    id: 'lower-third',
    name: 'Tên + chức danh (lower third)',
    category: 'tieu-de',
    description: 'Vạch màu, tên và chức danh ở góc dưới trái; trượt vào rồi mờ ra cuối.',
    duration: 4,
    vars: [
      { id: 'name', label: 'Tên', type: 'text', default: 'Nguyễn Văn An' },
      { id: 'role', label: 'Chức danh', type: 'text', default: 'Giám đốc sản phẩm' },
      { id: 'accent', label: 'Màu nhấn', type: 'color', default: '#5aa9ff' },
    ],
    clips: [
      { layer: 0, name: 'Vạch', src: shape('rect', 10, 118, { radius: 5, fill: '{{accent}}', fillOpacity: 1, stroke: { color: '#ffffff', width: 0 } }), start: 0, duration: 4, transform: { anchorH: 'left', anchorV: 'bottom' }, dx: 0, dy: -130, keyframes: { 'transform.opacity': [kf(0, 0, 'ease-out'), kf(0.3, 1, 'ease-out'), kf(3.65, 1, 'ease-in'), kf(4, 0, 'ease-in')] } },
      { layer: 1, name: 'Tên', src: text('{{name}}', 54, 800, { align: 'left', maxWidth: 0.8 }), start: 0.1, duration: 3.9, transform: { anchorH: 'left', anchorV: 'bottom' }, dx: 34, dy: -168, keyframes: { 'transform.x': slide(34, -60, 0, 0.5), 'transform.opacity': [kf(0, 0, 'ease-out'), kf(0.4, 1, 'ease-out'), kf(3.65, 1, 'ease-in'), kf(4, 0, 'ease-in')] } },
      { layer: 2, name: 'Chức danh', src: text('{{role}}', 32, 500, { align: 'left', maxWidth: 0.8, fill: { type: 'solid', color: '#cfd6e6' } }), start: 0.22, duration: 3.78, transform: { anchorH: 'left', anchorV: 'bottom' }, dx: 34, dy: -112, keyframes: { 'transform.x': slide(34, -60, 0, 0.5), 'transform.opacity': [kf(0, 0, 'ease-out'), kf(0.4, 1, 'ease-out'), kf(3.5, 1, 'ease-in'), kf(3.78, 0, 'ease-in')] } },
    ],
  },
  {
    id: 'title-card',
    name: 'Tiêu đề lớn',
    category: 'tieu-de',
    description: 'Chữ lớn tô gradient, vạch gạch chân kéo dài ra, dòng phụ hiện sau.',
    duration: 4,
    vars: [
      { id: 'title', label: 'Tiêu đề', type: 'text', default: 'TIÊU ĐỀ CHÍNH' },
      { id: 'subtitle', label: 'Dòng phụ', type: 'text', default: 'Một câu mô tả ngắn gọn' },
      { id: 'color1', label: 'Màu đầu', type: 'color', default: '#5aa9ff' },
      { id: 'color2', label: 'Màu cuối', type: 'color', default: '#8c6cff' },
    ],
    clips: [
      { layer: 0, name: 'Tiêu đề', src: text('{{title}}', 150, 900, { fill: { type: 'linear', angle: 0, stops: [{ pos: 0, color: '{{color1}}' }, { pos: 1, color: '{{color2}}' }] }, animator: { preset: 'blur-in', unit: 'word', duration: 0.5, stagger: 0.12, delay: 0, blur: 24 } }), start: 0, duration: 4, dy: -40 },
      { layer: 1, name: 'Gạch chân', src: shape('rect', 420, 12, { radius: 6, fill: '{{color1}}', fillOpacity: 1, stroke: { color: '#ffffff', width: 0 } }), start: 0.3, duration: 3.7, dy: 100, keyframes: { 'shape.w': [kf(0, 2, 'ease-out'), kf(0.6, 420, 'ease-out')] } },
      { layer: 2, name: 'Dòng phụ', src: text('{{subtitle}}', 44, 500, { fill: { type: 'solid', color: '#e7ebf7' }, animator: { preset: 'fade', unit: 'line', duration: 0.5, stagger: 0, delay: 0 } }), start: 0.7, duration: 3.3, dy: 190 },
    ],
  },
  {
    id: 'stat-counter',
    name: 'Số liệu nổi bật',
    category: 'so-lieu',
    description: 'Thẻ kính với số đếm tăng dần và chú thích.',
    duration: 4,
    vars: [
      { id: 'value', label: 'Giá trị đích', type: 'number', default: 12500 },
      { id: 'label', label: 'Chú thích', type: 'text', default: 'Khách hàng mới' },
      { id: 'suffix', label: 'Hậu tố', type: 'text', default: '+' },
      { id: 'color', label: 'Màu số', type: 'color', default: '#3ecf8e' },
    ],
    clips: [
      { layer: 0, name: 'Thẻ', ...glass(760, 400), start: 0, duration: 4, keyframes: { 'transform.opacity': fadeIn(0, 0.35), 'transform.scale': popIn(0, 0.45) } },
      { layer: 1, name: 'Số đếm', src: { type: 'chart', chart: { kind: 'number', bgOpacity: 0, w: 760, h: 400, data: [{ label: '{{label}}', value: '{{value}}' }], suffix: '{{suffix}}', palette: ['{{color}}'], textColor: '#e7ebf7', delay: 0.3, duration: 1.4, ease: 'out' } }, start: 0, duration: 4 },
    ],
  },
  {
    id: 'cta-button',
    name: 'Nút kêu gọi hành động',
    category: 'nut',
    description: 'Nút bo tròn có bóng, nhịp đập nhẹ để kéo ánh nhìn.',
    duration: 3,
    vars: [
      { id: 'text', label: 'Chữ trên nút', type: 'text', default: 'ĐĂNG KÝ NGAY' },
      { id: 'color', label: 'Màu nút', type: 'color', default: '#ff5d6c' },
    ],
    clips: [
      { layer: 0, name: 'Nút', src: shape('rect', 640, 150, { radius: 75, fill: '{{color}}', fillOpacity: 1, stroke: { color: '#ffffff', width: 0 } }), fx: { shadow: { x: 0, y: 14, blur: 30, opacity: 0.5, color: '#000000' } }, start: 0, duration: 3, keyframes: { 'transform.scale': [kf(0, 0.85, 'overshoot'), kf(0.4, 1, 'overshoot'), kf(0.9, 1.06, 'ease-in-out'), kf(1.4, 1, 'ease-in-out'), kf(1.9, 1.06, 'ease-in-out'), kf(2.4, 1, 'ease-in-out'), kf(2.9, 1.06, 'ease-in-out')], 'transform.opacity': fadeIn(0, 0.25) } },
      { layer: 1, name: 'Chữ', src: text('{{text}}', 52, 800, { letterSpacing: 2 }), start: 0, duration: 3, keyframes: { 'transform.scale': [kf(0, 0.85, 'overshoot'), kf(0.4, 1, 'overshoot'), kf(0.9, 1.06, 'ease-in-out'), kf(1.4, 1, 'ease-in-out'), kf(1.9, 1.06, 'ease-in-out'), kf(2.4, 1, 'ease-in-out'), kf(2.9, 1.06, 'ease-in-out')], 'transform.opacity': fadeIn(0.05, 0.25) } },
    ],
  },
  {
    id: 'price-tag',
    name: 'Thẻ giá',
    category: 'nut',
    description: 'Thẻ màu nổi bật: nhãn ưu đãi, giá mới lớn, giá gốc.',
    duration: 4,
    vars: [
      { id: 'label', label: 'Nhãn', type: 'text', default: 'Ưu đãi hôm nay' },
      { id: 'price', label: 'Giá mới', type: 'text', default: '299.000đ' },
      { id: 'old', label: 'Giá gốc', type: 'text', default: '499.000đ' },
      { id: 'color', label: 'Màu thẻ', type: 'color', default: '#f5a623' },
    ],
    clips: [
      { layer: 0, name: 'Thẻ', src: shape('rect', 720, 330, { radius: 40, fill: '{{color}}', fillOpacity: 1, stroke: { color: '#ffffff', width: 0 } }), fx: { shadow: { x: 0, y: 16, blur: 36, opacity: 0.45, color: '#000000' } }, start: 0, duration: 4, keyframes: { 'transform.scale': popIn(0, 0.5), 'transform.opacity': fadeIn(0, 0.25) } },
      { layer: 1, name: 'Nhãn', src: text('{{label}}', 34, 700, { fill: { type: 'solid', color: '#3a2606' } }), start: 0.2, duration: 3.8, dy: -105, keyframes: { 'transform.opacity': fadeIn(0, 0.3) } },
      { layer: 2, name: 'Giá mới', src: text('{{price}}', 104, 900, { fill: { type: 'solid', color: '#1a1204' }, animator: { preset: 'pop', unit: 'char', duration: 0.3, stagger: 0.04, delay: 0 } }), start: 0.3, duration: 3.7, dy: 0 },
      { layer: 3, name: 'Giá gốc', src: text('Giá gốc {{old}}', 32, 600, { fill: { type: 'solid', color: '#5a3d08' } }), start: 0.6, duration: 3.4, dy: 112, keyframes: { 'transform.opacity': fadeIn(0, 0.3) } },
    ],
  },
  {
    id: 'bar-chart-card',
    name: 'Biểu đồ cột',
    category: 'bieu-do',
    description: 'Biểu đồ cột có tiêu đề, lưới, nhãn; các cột mọc lên lần lượt.',
    duration: 5,
    vars: [
      { id: 'title', label: 'Tiêu đề', type: 'text', default: 'Doanh thu theo quý' },
      { id: 'data', label: 'Dữ liệu (mỗi dòng "Nhãn: giá trị")', type: 'data', default: 'Q1: 42\nQ2: 58\nQ3: 71\nQ4: 96' },
      { id: 'color', label: 'Màu chính', type: 'color', default: '#5aa9ff' },
    ],
    clips: [{ layer: 0, name: 'Biểu đồ', src: { type: 'chart', chart: { kind: 'bar', title: '{{title}}', data: '{{data}}', palette: ['{{color}}', '#8c6cff', '#3ecf8e', '#f5a623', '#ff5d6c', '#66d9e8'] } }, start: 0, duration: 5, keyframes: { 'transform.opacity': fadeIn(0, 0.3) } }],
  },
  {
    id: 'app-toast',
    name: 'Thông báo kiểu ứng dụng',
    category: 'app',
    description: 'Thông báo kính trượt từ trên xuống có biểu tượng tròn, tiêu đề và nội dung.',
    duration: 4,
    vars: [
      { id: 'title', label: 'Tiêu đề', type: 'text', default: 'Thanh toán thành công' },
      { id: 'body', label: 'Nội dung', type: 'text', default: 'Đơn #2048 đã được xác nhận' },
      { id: 'accent', label: 'Màu biểu tượng', type: 'color', default: '#3ecf8e' },
    ],
    clips: [
      { layer: 0, name: 'Thẻ', ...glass(880, 190, 48), start: 0, duration: 4, dy: -420, keyframes: { 'transform.y': slide(-420, -260, 0, 0.6, 'overshoot'), 'transform.opacity': [...fadeIn(0, 0.3), kf(3.6, 1, 'ease-in'), kf(4, 0, 'ease-in')] } },
      { layer: 1, name: 'Biểu tượng', src: shape('ellipse', 100, 100, { fill: '{{accent}}', fillOpacity: 1, stroke: { color: '#ffffff', width: 0 } }), start: 0, duration: 4, dx: -330, dy: -420, keyframes: { 'transform.y': slide(-420, -260, 0, 0.6, 'overshoot'), 'transform.opacity': [...fadeIn(0, 0.3), kf(3.6, 1, 'ease-in'), kf(4, 0, 'ease-in')] } },
      { layer: 2, name: 'Dấu tích', src: text('✓', 64, 800), start: 0, duration: 4, dx: -330, dy: -420, keyframes: { 'transform.y': slide(-420, -260, 0, 0.6, 'overshoot'), 'transform.opacity': [...fadeIn(0, 0.3), kf(3.6, 1, 'ease-in'), kf(4, 0, 'ease-in')] } },
      { layer: 3, name: 'Tiêu đề', src: text('{{title}}', 42, 700, { align: 'left', maxWidth: 0.6 }), start: 0, duration: 4, dx: 40, dy: -445, keyframes: { 'transform.y': slide(-445, -260, 0, 0.6, 'overshoot'), 'transform.opacity': [...fadeIn(0, 0.3), kf(3.6, 1, 'ease-in'), kf(4, 0, 'ease-in')] } },
      { layer: 4, name: 'Nội dung', src: text('{{body}}', 30, 500, { align: 'left', maxWidth: 0.6, fill: { type: 'solid', color: '#d9deec' } }), start: 0, duration: 4, dx: 40, dy: -392, keyframes: { 'transform.y': slide(-392, -260, 0, 0.6, 'overshoot'), 'transform.opacity': [...fadeIn(0, 0.3), kf(3.6, 1, 'ease-in'), kf(4, 0, 'ease-in')] } },
    ],
  },
];

export function findTemplate(id: string): Template | undefined {
  return TEMPLATES.find((t) => t.id === id);
}

const HEX6 = /^#[0-9a-fA-F]{6}$/;

/** Kiểm giá trị biến theo kiểu; trả về lỗi hoặc null. */
export function checkVar(v: TemplateVar, val: unknown): string | null {
  if (v.type === 'number') return typeof val === 'number' && Number.isFinite(val) ? null : `${v.id}: phai la so`;
  if (v.type === 'color') return typeof val === 'string' && HEX6.test(val) ? null : `${v.id}: phai la mau #rrggbb`;
  if (typeof val !== 'string') return `${v.id}: phai la chuoi`;
  if (v.type === 'text' && val.length > 400) return `${v.id}: qua dai (>400 ky tu)`;
  if (v.type === 'data' && parseChartData(val).length < 1) return `${v.id}: can it nhat 1 dong "Nhan: gia tri"`;
  return null;
}

/** Thay {{biến}} trong mọi chuỗi con; chuỗi đúng bằng "{{id}}" thì lấy nguyên giá trị (số, mảng dữ liệu). */
function subst(node: unknown, vars: Record<string, string | number>, types: Map<string, TemplateVarType>): unknown {
  if (typeof node === 'string') {
    const whole = /^\{\{(\w+)\}\}$/.exec(node);
    if (whole) {
      const v = vars[whole[1]];
      if (v === undefined) return node;
      return types.get(whole[1]) === 'data' ? parseChartData(String(v)) : v;
    }
    return node.replace(/\{\{(\w+)\}\}/g, (_m, id: string) => (vars[id] === undefined ? `{{${id}}}` : String(vars[id])));
  }
  if (Array.isArray(node)) return node.map((x) => subst(x, vars, types));
  if (node && typeof node === 'object') return Object.fromEntries(Object.entries(node as Record<string, unknown>).map(([k, v]) => [k, subst(v, vars, types)]));
  return node;
}

export interface ExpandResult {
  ops: Op[];
  clipIds: string[];
  group: string;
  duration: number;
}

/** Sinh op thêm mẫu vào dự án tại `at` giây. vars = giá trị người dùng (thiếu thì dùng mặc định). Lỗi: ném chuỗi tiếng Việt không dấu giống phần core. */
export function expandTemplate(t: Template, userVars: Record<string, string | number>, p: Project, at: number): ExpandResult | { error: string } {
  const vars: Record<string, string | number> = {};
  const types = new Map<string, TemplateVarType>();
  for (const v of t.vars) {
    types.set(v.id, v.type);
    vars[v.id] = userVars[v.id] ?? v.default;
    const bad = checkVar(v, vars[v.id]);
    if (bad) return { error: `bien ${bad}` };
  }
  for (const k of Object.keys(userVars)) if (!types.has(k)) return { error: `mau "${t.id}" khong co bien "${k}" (co: ${t.vars.map((v) => v.id).join(', ')})` };
  if (!(Number.isFinite(at) && at >= 0)) return { error: 'at phai >= 0' };

  const k = Math.min(p.width, p.height) / 1080;
  const layers = [...new Set(t.clips.map((c) => c.layer))].sort((a, b) => a - b);
  // chọn track: các track video còn trống suốt thời lượng mẫu (cao nhất trước), thiếu thì tạo mới ở trên cùng; thứ tự lớp giữ đúng
  const free = (trId: string) => !p.clips.some((c) => c.track === trId && at < c.start + c.duration - 1e-6 && c.start < at + t.duration - 1e-6);
  const freeTracks = p.tracks.map((tr, i) => ({ tr, i })).filter((x) => x.tr.kind === 'video' && free(x.tr.id)).sort((a, b) => a.i - b.i);
  const ops: Op[] = [];
  const picked = freeTracks.slice(Math.max(0, freeTracks.length - layers.length)).map((x) => x.tr.id);
  const trackFor = new Map<number, string>();
  const used = new Set([...p.tracks.map((x) => x.id), ...p.clips.map((c) => c.id), ...p.media.map((m) => m.id)]);
  const nextTrack = () => {
    let n = 1;
    while (used.has('v' + n)) n++;
    used.add('v' + n);
    return 'v' + n;
  };
  const vnames = new Set(p.tracks.map((x) => x.name));
  layers.forEach((layer, i) => {
    let id = picked[i];
    if (!id) {
      id = nextTrack();
      let n = 1;
      while (vnames.has(`Video ${n}`)) n++;
      vnames.add(`Video ${n}`);
      ops.push({ op: 'add_track', track: { id, kind: 'video', name: `Video ${n}` } });
    }
    trackFor.set(layer, id);
  });
  // id clip và nhóm mới
  const cids: string[] = [];
  let cn = Number(nextId(p, 'c').slice(1));
  for (let i = 0; i < t.clips.length; i++) cids.push('c' + cn++);
  const groups = new Set(p.clips.map((c) => c.group).filter(Boolean));
  let gk = 1;
  while (groups.has('g' + gk)) gk++;
  const group = 'g' + gk;

  t.clips.forEach((tc, i) => {
    const src = subst(tc.src, vars, types) as Clip['src'];
    const tf: Transform = { ...DEFAULT_TRANSFORM, ...(tc.transform ?? {}) };
    tf.x = ((tc.dx ?? 0) * k) / p.width;
    tf.y = ((tc.dy ?? 0) * k) / p.height;
    const keyframes: KeyframeMap = {};
    for (const [prop, keys] of Object.entries(tc.keyframes ?? {})) {
      keyframes[prop] = keys.map((key) => ({ ...key, ease: { ...key.ease }, v: prop === 'transform.x' ? (key.v * k) / p.width : prop === 'transform.y' ? (key.v * k) / p.height : key.v }));
    }
    const dur = Math.min(tc.duration, t.duration - tc.start);
    const clip: Clip = { id: cids[i], track: trackFor.get(tc.layer)!, src, start: Math.round((at + tc.start) * 1e6) / 1e6, duration: Math.round(dur * 1e6) / 1e6, in: 0, volume: 1, transform: tf, keyframes, group, tag: `tpl:${t.id}` };
    if (tc.fx) clip.fx = JSON.parse(JSON.stringify(tc.fx));
    if (tc.blend) clip.blend = tc.blend;
    ops.push({ op: 'add_clip', clip });
  });
  return { ops, clipIds: cids, group, duration: t.duration };
}
