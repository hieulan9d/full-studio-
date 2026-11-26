// Clip biểu đồ / số đếm (cột, cột ngang, đường, tròn, vành khuyên, số tăng dần): dữ liệu + hoạt họa vào, thuần túy, có test.
// Vẽ bằng Canvas 2D ở render/chart-raster.ts rồi đi chung đường GPU với clip chữ/hình. Xem CHUC-NANG.md F-96.

export type ChartKind = 'bar' | 'hbar' | 'line' | 'pie' | 'donut' | 'number';
export const CHART_KINDS: ChartKind[] = ['bar', 'hbar', 'line', 'pie', 'donut', 'number'];
export const CHART_LABEL: Record<ChartKind, string> = { bar: 'Cột', hbar: 'Cột ngang', line: 'Đường', pie: 'Tròn', donut: 'Vành khuyên', number: 'Số đếm' };

export interface ChartDatum {
  label: string;
  value: number;
  color?: string; // #rrggbb; mặc định lấy theo bảng màu
}

export type ChartEase = 'out' | 'inout' | 'linear';

export interface ChartSpec {
  kind: ChartKind;
  title: string;
  data: ChartDatum[]; // number: data[0].value = giá trị đích, data[0].label = chú thích dưới số
  from: number; // number: đếm từ giá trị này
  prefix: string;
  suffix: string;
  decimals: number; // số chữ số thập phân của nhãn giá trị và số đếm
  max: number; // trục tối đa (0 = tự động theo dữ liệu)
  w: number; // px @ cạnh ngắn 1080
  h: number;
  bg: string; // nền thẻ
  bgOpacity: number; // 0 = trong suốt
  radius: number; // bo góc thẻ (px @1080)
  textColor: string;
  font: string;
  fontSize: number; // px @1080
  palette: string[];
  grid: boolean;
  valueLabels: boolean;
  duration: number; // giây: thời gian hoạt họa vào
  stagger: number; // giây: lệch giữa các cột
  delay: number; // giây: chờ trước khi bắt đầu
  ease: ChartEase;
}

export const DEFAULT_PALETTE = ['#5aa9ff', '#8c6cff', '#3ecf8e', '#f5a623', '#ff5d6c', '#66d9e8'];

export function defaultChart(kind: ChartKind = 'bar'): ChartSpec {
  const number = kind === 'number';
  return {
    kind,
    title: number ? '' : 'Doanh thu theo quý',
    data: number ? [{ label: 'Khách hàng mới', value: 12500 }] : [{ label: 'Q1', value: 42 }, { label: 'Q2', value: 58 }, { label: 'Q3', value: 71 }, { label: 'Q4', value: 96 }],
    from: 0,
    prefix: '',
    suffix: '',
    decimals: 0,
    max: 0,
    w: number ? 760 : 900,
    h: number ? 420 : 620,
    bg: '#0b0e1a',
    bgOpacity: 0.88,
    radius: 36,
    textColor: '#f5f7ff',
    font: 'Segoe UI',
    fontSize: 34,
    palette: [...DEFAULT_PALETTE],
    grid: true,
    valueLabels: true,
    duration: 1.2,
    stagger: 0.12,
    delay: 0.15,
    ease: 'out',
  };
}

export type DeepPartialChart = Partial<Omit<ChartSpec, 'data' | 'palette'>> & { data?: ChartDatum[]; palette?: string[] };

export function mergeChart(base: ChartSpec, patch: DeepPartialChart): ChartSpec {
  const out: ChartSpec = { ...base, ...patch, data: patch.data ? patch.data.map((d) => ({ ...d })) : base.data.map((d) => ({ ...d })), palette: patch.palette ? [...patch.palette] : [...base.palette] };
  // đổi sang số đếm / từ số đếm mà chưa chỉnh kích thước: theo mặc định của kiểu mới
  return out;
}

const HEX = /^#[0-9a-fA-F]{6}$/;

export function validateChart(c: ChartSpec, where: string): string[] {
  const e: string[] = [];
  if (!c || typeof c !== 'object') return [`${where}: chart phai la object`];
  if (!CHART_KINDS.includes(c.kind)) e.push(`${where}: kind phai la ${CHART_KINDS.join('|')}`);
  if (typeof c.title !== 'string' || c.title.length > 120) e.push(`${where}: title phai la chuoi <= 120 ky tu`);
  if (!Array.isArray(c.data) || c.data.length < 1 || c.data.length > 24) e.push(`${where}: data can 1..24 muc`);
  else {
    c.data.forEach((d, i) => {
      if (typeof d?.label !== 'string' || d.label.length > 60) e.push(`${where}.data[${i}]: label phai la chuoi <= 60 ky tu`);
      if (!Number.isFinite(d?.value)) e.push(`${where}.data[${i}]: value phai la so huu han`);
      else if (d.value < 0 && (c.kind === 'pie' || c.kind === 'donut' || c.kind === 'bar' || c.kind === 'hbar')) e.push(`${where}.data[${i}]: value am khong ve duoc o kieu ${c.kind}`);
      if (d?.color !== undefined && !HEX.test(d.color)) e.push(`${where}.data[${i}]: color phai la #rrggbb`);
    });
    if ((c.kind === 'pie' || c.kind === 'donut') && c.data.every((d) => d.value === 0)) e.push(`${where}: bieu do tron can tong > 0`);
  }
  for (const k of ['from', 'max', 'decimals', 'w', 'h', 'bgOpacity', 'radius', 'fontSize', 'duration', 'stagger', 'delay'] as const) if (!Number.isFinite(c[k])) e.push(`${where}.${k}: phai la so huu han`);
  if (!(c.w >= 100 && c.w <= 4000 && c.h >= 100 && c.h <= 4000)) e.push(`${where}: w, h phai trong 100..4000`);
  if (!(c.decimals >= 0 && c.decimals <= 6 && Number.isInteger(c.decimals))) e.push(`${where}.decimals: so nguyen 0..6`);
  if (!(c.bgOpacity >= 0 && c.bgOpacity <= 1)) e.push(`${where}.bgOpacity: 0..1`);
  if (!(c.fontSize >= 8 && c.fontSize <= 400)) e.push(`${where}.fontSize: 8..400`);
  if (!(c.duration >= 0 && c.duration <= 20 && c.stagger >= 0 && c.stagger <= 5 && c.delay >= 0 && c.delay <= 20)) e.push(`${where}: duration 0..20, stagger 0..5, delay 0..20 giay`);
  if (!(c.max >= 0)) e.push(`${where}.max: >= 0`);
  if (!HEX.test(c.bg) || !HEX.test(c.textColor)) e.push(`${where}: bg, textColor phai la #rrggbb`);
  if (typeof c.font !== 'string' || !c.font.trim()) e.push(`${where}.font: rong`);
  if (!Array.isArray(c.palette) || c.palette.length < 1 || c.palette.length > 16 || !c.palette.every((x) => HEX.test(x))) e.push(`${where}.palette: 1..16 mau #rrggbb`);
  if (!['out', 'inout', 'linear'].includes(c.ease)) e.push(`${where}.ease: out|inout|linear`);
  if (typeof c.prefix !== 'string' || typeof c.suffix !== 'string' || c.prefix.length > 12 || c.suffix.length > 12) e.push(`${where}: prefix/suffix la chuoi <= 12 ky tu`);
  return e;
}

/** Làm mượt tiến độ 0..1 theo kiểu ease. */
export function chartEase(x: number, ease: ChartEase): number {
  const u = Math.min(1, Math.max(0, x));
  if (ease === 'linear') return u;
  if (ease === 'inout') return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
  return 1 - Math.pow(1 - u, 3); // out: nhanh trước, chậm dần
}

/** Tiến độ của mục thứ i (so le theo stagger) tại thời điểm clip lt. */
export function itemProgress(c: ChartSpec, i: number, lt: number): number {
  if (c.duration <= 0) return 1;
  return chartEase((lt - c.delay - i * c.stagger) / c.duration, c.ease);
}
/** Tiến độ chung (đường, tròn, số đếm). */
export function chartProgress(c: ChartSpec, lt: number): number {
  return itemProgress(c, 0, lt);
}

/** Thời điểm (giây từ đầu clip) hoạt họa xong. */
export function chartEnd(c: ChartSpec): number {
  const n = c.kind === 'bar' || c.kind === 'hbar' ? c.data.length : 1;
  return c.delay + c.duration + (n - 1) * c.stagger;
}

/** Trần trục "đẹp": 1, 2, 2.5, 5 × 10^n lớn hơn hoặc bằng giá trị. */
export function niceMax(v: number): number {
  if (!(v > 0)) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const m = v / p;
  const nice = m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10;
  return nice * p;
}

/** Định dạng kiểu Việt: dấu chấm ngăn nghìn, dấu phẩy thập phân; không phụ thuộc locale máy. */
export function formatNumber(v: number, decimals: number, prefix = '', suffix = ''): string {
  const neg = v < 0;
  const s = Math.abs(v).toFixed(decimals);
  const [ip, fp] = s.split('.');
  const grouped = ip.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${neg ? '-' : ''}${prefix}${grouped}${fp ? ',' + fp : ''}${suffix}`;
}

/** "Nhãn: giá trị" mỗi dòng một mục (giá trị là phần sau dấu hai chấm CUỐI; có thể viết 1.250,5 hoặc 1250.5). */
export function parseChartData(txt: string): ChartDatum[] {
  const out: ChartDatum[] = [];
  for (const line of txt.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const i = line.lastIndexOf(':');
    const label = (i >= 0 ? line.slice(0, i) : line).trim();
    const raw = (i >= 0 ? line.slice(i + 1) : '0').trim();
    const norm = raw.includes(',') ? raw.replace(/\./g, '').replace(',', '.') : /^\d{1,3}(\.\d{3})+$/.test(raw) ? raw.replace(/\./g, '') : raw;
    const v = Number(norm.replace(/[^0-9.\-]/g, ''));
    out.push({ label, value: Number.isFinite(v) ? v : 0 });
  }
  return out;
}

