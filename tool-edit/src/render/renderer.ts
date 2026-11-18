// Bo render WebGPU: lop -> RGBA16F tuyen tinh -> Output Transform -> 8-bit. Xem CHUC-NANG.md F-02, F-08.
import type { OutputTransform } from '../core/color';
import type { GenKind, MatteOpts, Transform } from '../core/schema';
import { hexToRgb01 } from './color-util';
import type { BlendMode, Fx } from '../core/fx';

const SCENE_ID: Record<GenKind, number> = { ramp: 0, bars: 1, stress: 2 };
const OUT_ID: Record<OutputTransform, number> = { srgb: 0, bt709: 1, gamma24: 2 };

const WGSL = /* wgsl */ `
struct U { size: vec2f, time: f32, scene: f32, param: f32, outMode: f32, dither: f32, pad: f32 };
@group(0) @binding(0) var<uniform> u: U;
@group(0) @binding(1) var src: texture_2d<f32>;

struct VO { @builtin(position) pos: vec4f, @location(0) uv: vec2f };

@vertex fn vs(@builtin(vertex_index) i: u32) -> VO {
  var p = array<vec2f, 3>(vec2f(-1.0, -1.0), vec2f(3.0, -1.0), vec2f(-1.0, 3.0));
  var o: VO;
  o.pos = vec4f(p[i], 0.0, 1.0);
  o.uv = vec2f((p[i].x + 1.0) * 0.5, (1.0 - p[i].y) * 0.5);
  return o;
}

fn srgb_eotf(c: f32) -> f32 { return select(pow((c + 0.055) / 1.055, 2.4), c / 12.92, c <= 0.04045); }
fn srgb_oetf(l: f32) -> f32 { let x = max(l, 0.0); return select(1.055 * pow(x, 1.0 / 2.4) - 0.055, x * 12.92, x <= 0.0031308); }
fn bt709_oetf(l: f32) -> f32 { let x = max(l, 0.0); return select(1.099 * pow(x, 0.45) - 0.099, 4.5 * x, x < 0.018); }
fn g24_oetf(l: f32) -> f32 { return pow(max(l, 0.0), 1.0 / 2.4); }

@fragment fn fs_scene(in: VO) -> @location(0) vec4f {
  let s = i32(u.scene);
  var c = vec3f(0.0);
  if (s == 0) {
    let l = srgb_eotf(in.uv.x);
    c = vec3f(l, l, l);
  } else if (s == 1) {
    var cols = array<vec3f, 7>(vec3f(1.0, 1.0, 1.0), vec3f(1.0, 1.0, 0.0), vec3f(0.0, 1.0, 1.0), vec3f(0.0, 1.0, 0.0), vec3f(1.0, 0.0, 1.0), vec3f(1.0, 0.0, 0.0), vec3f(0.0, 0.0, 1.0));
    let idx = clamp(i32(floor(in.uv.x * 7.0)), 0, 6);
    let d = cols[idx] * 0.75;
    c = vec3f(srgb_eotf(d.x), srgb_eotf(d.y), srgb_eotf(d.z));
  } else {
    let n = i32(u.param);
    var acc = vec3f(0.0);
    let p = in.uv * vec2f(u.size.x / u.size.y, 1.0) * 3.0;
    for (var i = 0; i < n; i = i + 1) {
      let fi = f32(i);
      acc = acc + (0.5 + 0.5 * cos(vec3f(0.0, 2.0, 4.0) + (p.x * sin(fi * 1.3 + u.time) + p.y * cos(fi * 0.7)) * 3.0 + fi));
    }
    c = (acc / f32(max(n, 1)));
    c = c * c;
  }
  return vec4f(c, 1.0);
}

@fragment fn fs_out(in: VO) -> @location(0) vec4f {
  let l = textureLoad(src, vec2i(in.pos.xy), 0).rgb;
  var c: vec3f;
  if (u.outMode < 0.5) {
    c = vec3f(srgb_oetf(l.r), srgb_oetf(l.g), srgb_oetf(l.b));
  } else if (u.outMode < 1.5) {
    c = vec3f(bt709_oetf(l.r), bt709_oetf(l.g), bt709_oetf(l.b));
  } else {
    c = vec3f(g24_oetf(l.r), g24_oetf(l.g), g24_oetf(l.b));
  }
  if (u.pad > 0.5) {
    let y = dot(c, vec3f(0.2126, 0.7152, 0.0722));
    if (u.pad < 1.5) {
      // mau gia (gan dung): tim = den ep, xanh duong = toi, xanh la = da/giua, vang/cam = sang, do = chay sang
      var f = vec3f(y);
      if (y < 0.02) { f = vec3f(0.45, 0.0, 0.65); }
      else if (y < 0.10) { f = vec3f(0.0, 0.25, 0.9); }
      else if (y >= 0.38 && y < 0.50) { f = vec3f(0.1, 0.75, 0.2); }
      else if (y >= 0.70 && y < 0.85) { f = vec3f(0.95, 0.9, 0.1); }
      else if (y >= 0.85 && y < 0.97) { f = vec3f(1.0, 0.5, 0.0); }
      else if (y >= 0.97) { f = vec3f(1.0, 0.0, 0.0); }
      c = f;
    } else {
      // canh bao clip: kenh >= 99% -> mau hong (vach ke), <= 1% -> xanh lo
      let st = select(0.0, 1.0, (u32(in.pos.x) + u32(in.pos.y)) / 4u % 2u == 0u);
      if (max(c.r, max(c.g, c.b)) >= 0.99) { c = mix(c, vec3f(1.0, 0.0, 0.8), 0.5 + 0.5 * st); }
      else if (max(c.r, max(c.g, c.b)) <= 0.01) { c = mix(c, vec3f(0.0, 0.7, 1.0), 0.5 + 0.5 * st); }
    }
  }
  if (u.dither > 0.5) {
    let h = fract(sin(dot(in.pos.xy, vec2f(12.9898, 78.233))) * 43758.5453);
    let h2 = fract(sin(dot(in.pos.xy, vec2f(39.3468, 11.135))) * 24634.6345);
    c = c + vec3f((h + h2 - 1.0) / 255.0);
  }
  return vec4f(clamp(c, vec3f(0.0), vec3f(1.0)), 1.0);
}
`;

const NV12_WGSL = /* wgsl */ `
@group(0) @binding(1) var src: texture_2d<f32>;
struct VO { @builtin(position) pos: vec4f, @location(0) uv: vec2f };
@vertex fn vs(@builtin(vertex_index) i: u32) -> VO {
  var p = array<vec2f, 3>(vec2f(-1.0, -1.0), vec2f(3.0, -1.0), vec2f(-1.0, 3.0));
  var o: VO;
  o.pos = vec4f(p[i], 0.0, 1.0);
  o.uv = vec2f((p[i].x + 1.0) * 0.5, (1.0 - p[i].y) * 0.5);
  return o;
}
fn luma(c: vec3f) -> f32 { return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b; }
@fragment fn fs_y(in: VO) -> @location(0) vec4f {
  let c = textureLoad(src, vec2i(in.pos.xy), 0).rgb;
  return vec4f((16.0 + 219.0 * luma(c)) / 255.0, 0.0, 0.0, 1.0);
}
@fragment fn fs_uv(in: VO) -> @location(0) vec4f {
  let p = vec2i(in.pos.xy) * 2;
  var c = textureLoad(src, p, 0).rgb + textureLoad(src, p + vec2i(1, 0), 0).rgb + textureLoad(src, p + vec2i(0, 1), 0).rgb + textureLoad(src, p + vec2i(1, 1), 0).rgb;
  c = c * 0.25;
  let y = luma(c);
  let cb = (c.b - y) / 1.8556;
  let cr = (c.r - y) / 1.5748;
  return vec4f((128.0 + 224.0 * cb) / 255.0, (128.0 + 224.0 * cr) / 255.0, 0.0, 1.0);
}
`;

// Lop video: ve mot hinh chu nhat (da fit/scale/xoay) lay mau tu VideoFrame, doi sang tuyen tinh, tron theo opacity.
// Bien the: matte (alpha tu video xam, co muc den/trang va lam mem 9 mau) va LUT 3D (chinh mau: ma hoa video -> ma hoa sRGB da chinh).
function layerWgsl(matte: boolean, lut: boolean): string {
  return /* wgsl */ `
struct L { center: vec2f, size: vec2f, canvas: vec2f, cs: vec2f, opacity: f32, lo: f32, hi: f32, feather: f32, texel: vec2f, lutk: vec2f, ex: vec4f, ex2: vec4f };
@group(0) @binding(0) var<uniform> l: L;
@group(0) @binding(1) var vtex: texture_external;
@group(0) @binding(2) var samp: sampler;
${matte ? '@group(0) @binding(3) var mtex: texture_external;' : ''}
${lut ? '@group(0) @binding(4) var glut: texture_3d<f32>;\n@group(0) @binding(5) var gsamp: sampler;' : ''}

struct VO { @builtin(position) pos: vec4f, @location(0) uv: vec2f };

@vertex fn vs_layer(@builtin(vertex_index) i: u32) -> VO {
  var q = array<vec2f, 6>(vec2f(-0.5, -0.5), vec2f(0.5, -0.5), vec2f(-0.5, 0.5), vec2f(-0.5, 0.5), vec2f(0.5, -0.5), vec2f(0.5, 0.5));
  let c = q[i];
  let d = c * l.size;
  // xoay theo chieu kim dong ho tren man hinh (truc y huong xuong)
  let r = vec2f(d.x * l.cs.x - d.y * l.cs.y, d.x * l.cs.y + d.y * l.cs.x);
  let px = l.center + r;
  var o: VO;
  o.pos = vec4f(px.x / l.canvas.x * 2.0 - 1.0, 1.0 - px.y / l.canvas.y * 2.0, 0.0, 1.0);
  o.uv = c + vec2f(0.5, 0.5);
  return o;
}

fn srgb_eotf(c: f32) -> f32 { return select(pow((c + 0.055) / 1.055, 2.4), c / 12.92, c <= 0.04045); }
${matte ? 'fn m(uv: vec2f) -> f32 { return textureSampleBaseClampToEdge(mtex, samp, uv).r; }' : ''}

@fragment fn fs_layer(in: VO) -> @location(0) vec4f {
  var c = textureSampleBaseClampToEdge(vtex, samp, in.uv).rgb;
  ${lut ? 'c = max(textureSampleLevel(glut, gsamp, clamp(c, vec3f(0.0), vec3f(1.0)) * l.lutk.x + vec3f(l.lutk.y), 0.0).rgb, vec3f(0.0));' : ''}
  var a = 1.0;
  ${matte ? `a = m(in.uv);
  if (l.feather > 0.01) {
    let o = l.texel * l.feather;
    a = (a * 4.0 + m(in.uv + vec2f(o.x, 0.0)) + m(in.uv - vec2f(o.x, 0.0)) + m(in.uv + vec2f(0.0, o.y)) + m(in.uv - vec2f(0.0, o.y))
      + (m(in.uv + o) + m(in.uv - o) + m(in.uv + vec2f(o.x, -o.y)) + m(in.uv + vec2f(-o.x, o.y))) * 0.5) / 10.0;
  }
  a = clamp((a - l.lo) / max(l.hi - l.lo, 0.0001), 0.0, 1.0);
  a = a * a * (3.0 - 2.0 * a);` : ''}
  if (l.ex.x > 0.0 || l.ex.y + l.ex.z + l.ex.w + l.ex2.x > 0.0) {
    // cat khung (ex.yzw + ex2.x = trai, tren, phai, duoi) + bo goc (ex.x): do phu = 0.5 - khoang cach co dau toi hinh chu nhat bo tron (px)
    let lo = vec2f(l.ex.y, l.ex.z);
    let hi = vec2f(1.0 - l.ex.w, 1.0 - l.ex2.x);
    let rs = (hi - lo) * l.size;
    let ctr = (lo + hi) * 0.5;
    let rr = min(l.ex.x * min(l.size.x, l.size.y), min(rs.x, rs.y) * 0.5);
    let pp = (in.uv - ctr) * l.size;
    let qq = abs(pp) - rs * 0.5 + vec2f(rr);
    let dd = length(max(qq, vec2f(0.0))) + min(max(qq.x, qq.y), 0.0) - rr;
    a = a * clamp(0.5 - dd, 0.0, 1.0);
  }
  return vec4f(srgb_eotf(c.r), srgb_eotf(c.g), srgb_eotf(c.b), l.opacity * a);
}
`;
}


// Scope bang compute shader: dem so diem vao histogram, waveform (luma, R, G, B theo cot), vectorscope Cb/Cr tren anh sau Output Transform.
const SCOPE_WGSL = /* wgsl */ `
struct P { w: u32, h: u32, cols: u32, pad: u32, ox: u32, oy: u32, pad2: u32, pad3: u32 }; // w,h = kich thuoc VUNG DO; ox,oy = goc vung do
@group(0) @binding(0) var<uniform> p: P;
@group(0) @binding(1) var src: texture_2d<f32>;
@group(0) @binding(2) var<storage, read_write> hist: array<atomic<u32>>;
@group(0) @binding(3) var<storage, read_write> wave: array<atomic<u32>>;
@group(0) @binding(4) var<storage, read_write> vect: array<atomic<u32>>;

fn q(v: f32) -> u32 { return u32(clamp(v, 0.0, 1.0) * 255.0 + 0.5); }

@compute @workgroup_size(8, 8) fn main(@builtin(global_invocation_id) id: vec3u) {
  if (id.x >= p.w || id.y >= p.h) { return; }
  let c = textureLoad(src, vec2i(i32(id.x + p.ox), i32(id.y + p.oy)), 0).rgb;
  let y = 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
  var lv = array<u32, 4>(q(c.r), q(c.g), q(c.b), q(y));
  let col = id.x * p.cols / p.w;
  for (var ch = 0u; ch < 4u; ch = ch + 1u) {
    atomicAdd(&hist[ch * 256u + lv[ch]], 1u);
    atomicAdd(&wave[(ch * p.cols + col) * 256u + lv[ch]], 1u);
  }
  let cb = (c.b - y) / 1.8556;
  let cr = (c.r - y) / 1.5748;
  let vx = u32(clamp((cb + 0.5) * 255.0 + 0.5, 0.0, 255.0));
  let vy = 255u - u32(clamp((cr + 0.5) * 255.0 + 0.5, 0.0, 255.0));
  atomicAdd(&vect[vy * 256u + vx], 1u);
}
`;

export interface ScopeData {
  w: number;
  h: number;
  cols: number;
  hist: Uint32Array; // 4*256: R, G, B, luma
  wave: Uint32Array; // 4*cols*256: kenh, cot, muc
  vect: Uint32Array; // 256*256 (hang tren = Cr cao, phai = Cb cao)
}


// Hieu ung lop (premultiplied): blur tach 2 pass, nguong glow, to bong, vignette, wipe, ghep len khung theo che do tron.
const FX_WGSL = /* wgsl */ `
struct FP { a: vec4f, b: vec4f, c: vec4f };
@group(0) @binding(0) var<uniform> fp: FP;
@group(0) @binding(1) var t0: texture_2d<f32>;
@group(0) @binding(2) var t1: texture_2d<f32>;
@group(0) @binding(3) var sm: sampler;

struct VO { @builtin(position) pos: vec4f, @location(0) uv: vec2f };
@vertex fn vs(@builtin(vertex_index) i: u32) -> VO {
  var p = array<vec2f, 3>(vec2f(-1.0, -1.0), vec2f(3.0, -1.0), vec2f(-1.0, 3.0));
  var o: VO;
  o.pos = vec4f(p[i], 0.0, 1.0);
  o.uv = vec2f((p[i].x + 1.0) * 0.5, (1.0 - p[i].y) * 0.5);
  return o;
}
fn s0(uv: vec2f) -> vec4f { return textureSampleLevel(t0, sm, uv, 0.0); }

// a.xy = huong (don vi texel), a.z = ban kinh px (da nhan ti le), a.w = so tap moi ben
@fragment fn fs_blur(in: VO) -> @location(0) vec4f {
  let r = fp.a.z;
  if (r < 0.3) { return s0(in.uv); }
  let sigma = max(r * 0.5, 0.5);
  let taps = 16;
  let step = max(1.0, sigma * 3.0 / f32(taps));
  var acc = vec4f(0.0);
  var wsum = 0.0;
  for (var i = -taps; i <= taps; i = i + 1) {
    let off = f32(i) * step;
    let w = exp(-(off * off) / (2.0 * sigma * sigma));
    acc = acc + s0(in.uv + fp.a.xy * off) * w;
    wsum = wsum + w;
  }
  return acc / wsum;
}

// nguong glow: a.x = nguong
@fragment fn fs_thresh(in: VO) -> @location(0) vec4f {
  let c = s0(in.uv);
  let lum = dot(c.rgb, vec3f(0.2126, 0.7152, 0.0722)) / max(c.a, 0.0001);
  let k = smoothstep(fp.a.x, fp.a.x + 0.2, lum);
  return c * k;
}

// glow ghep: t0 = goc, t1 = glow mo. a.x = cuong do, b.rgb = mau (b.w > 0.5: dung mau tinh chinh)
@fragment fn fs_glow(in: VO) -> @location(0) vec4f {
  let base = s0(in.uv);
  var g = textureSampleLevel(t1, sm, in.uv, 0.0);
  if (fp.b.w > 0.5) { g = vec4f(fp.b.rgb * g.a, g.a); }
  let add = g * fp.a.x;
  return vec4f(base.rgb + add.rgb, clamp(max(base.a, add.a), 0.0, 1.0));
}

// bong do: t0 = goc, t1 = alpha da mo; a.xy = lech (don vi uv), a.z = do duc, b.rgb = mau
@fragment fn fs_shadow(in: VO) -> @location(0) vec4f {
  let base = s0(in.uv);
  let m = textureSampleLevel(t1, sm, in.uv - fp.a.xy, 0.0).a * fp.a.z;
  let sh = vec4f(fp.b.rgb * m, m);
  return base + sh * (1.0 - base.a);
}

// vignette: a.x = luong toi, a.y = do mem
@fragment fn fs_vig(in: VO) -> @location(0) vec4f {
  let c = s0(in.uv);
  let d = length(in.uv - vec2f(0.5)) * 1.41421;
  let inner = 1.0 - fp.a.y * 0.95;
  let k = 1.0 - fp.a.x * smoothstep(inner, 1.0, d);
  return vec4f(c.rgb * k, c.a);
}

// wipe: a.x = tien do, a.yz = huong, a.w = do mem
@fragment fn fs_wipe(in: VO) -> @location(0) vec4f {
  let c = s0(in.uv);
  let dir = fp.a.yz;
  let t = dot(in.uv - vec2f(0.5), dir) / max(abs(dir.x) + abs(dir.y), 0.0001) + 0.5;
  let f = max(fp.a.w, 0.0001);
  let edge = fp.a.x * (1.0 + f);
  let m = 1.0 - smoothstep(edge - f, edge, t);
  return c * m;
}

@fragment fn fs_comp(in: VO) -> @location(0) vec4f { return s0(in.uv); }
`;

// Lop chu: texture RGBA premultiplied (tu Canvas 2D), ma hoa sRGB; doi sang tuyen tinh roi tron kieu premultiplied.
const TEXT_WGSL = /* wgsl */ `
struct L { center: vec2f, size: vec2f, canvas: vec2f, cs: vec2f, opacity: f32, p0: f32, p1: f32, p2: f32 };
@group(0) @binding(0) var<uniform> l: L;
@group(0) @binding(1) var ttex: texture_2d<f32>;
@group(0) @binding(2) var samp: sampler;

struct VO { @builtin(position) pos: vec4f, @location(0) uv: vec2f };

@vertex fn vs_text(@builtin(vertex_index) i: u32) -> VO {
  var q = array<vec2f, 6>(vec2f(-0.5, -0.5), vec2f(0.5, -0.5), vec2f(-0.5, 0.5), vec2f(-0.5, 0.5), vec2f(0.5, -0.5), vec2f(0.5, 0.5));
  let c = q[i];
  let d = c * l.size;
  let r = vec2f(d.x * l.cs.x - d.y * l.cs.y, d.x * l.cs.y + d.y * l.cs.x);
  let px = l.center + r;
  var o: VO;
  o.pos = vec4f(px.x / l.canvas.x * 2.0 - 1.0, 1.0 - px.y / l.canvas.y * 2.0, 0.0, 1.0);
  o.uv = c + vec2f(0.5, 0.5);
  return o;
}

fn srgb_eotf(c: f32) -> f32 { return select(pow((c + 0.055) / 1.055, 2.4), c / 12.92, c <= 0.04045); }

@fragment fn fs_text(in: VO) -> @location(0) vec4f {
  let t = textureSample(ttex, samp, in.uv);
  let a = t.a;
  var rgb = vec3f(0.0);
  if (a > 0.0001) { rgb = t.rgb / a; }
  let lin = vec3f(srgb_eotf(rgb.r), srgb_eotf(rgb.g), srgb_eotf(rgb.b));
  let o = l.opacity;
  return vec4f(lin * a * o, a * o);
}
`;

export interface GpuInfo {
  vendor: string;
  architecture: string;
  device: string;
  description: string;
  features: string[];
}

/** 3D LUT da nuong (float16 RGBA, r nhanh nhat): ma hoa video -> ma hoa sRGB da chinh mau. */
export interface GradeLutData {
  key: string;
  size: number;
  data: Uint16Array;
}

export interface LayerFx {
  fx?: Fx;
  blend?: BlendMode;
}

export type Layer = LayerFx &
  (
  | { type: 'gen'; kind: GenKind; param: number; time: number }
  | { type: 'video'; frame: VideoFrame; width: number; height: number; transform: Transform; matte?: VideoFrame; matteOpts?: MatteOpts; matteW?: number; matteH?: number; grade?: GradeLutData }
  | { type: 'text'; canvas: OffscreenCanvas; width: number; height: number; inset: number; transform: Transform }
  );

export interface FrameOpts {
  width: number;
  height: number;
  out?: OutputTransform;
  dither?: boolean;
  view?: 'none' | 'false' | 'clip'; // che do xem (chi preview): mau gia / canh bao clip
  bg?: number; // mau nen khi chua co lop (0 den, 1 trang): dung de tach alpha lop phu (xuat sang phan mem khac)
}

interface Targets {
  hdr: GPUTexture; // rgba16float tuyen tinh
  ldr: GPUTexture; // rgba8unorm doc ve duoc
  y?: GPUTexture; // r8unorm (NV12 mat do)
  uv?: GPUTexture; // rg8unorm (NV12 mau, nua do phan giai)
}

export class Renderer {
  private device!: GPUDevice;
  private module!: GPUShaderModule;
  private ubuf!: GPUBuffer;
  private scenePipe!: GPURenderPipeline;
  private layerPipes = new Map<string, GPURenderPipeline>();
  private lutTex = new Map<string, GPUTexture>();
  private scopePipe: GPUComputePipeline | null = null;
  private fxMod: GPUShaderModule | null = null;
  private fxLayout: { bgl: GPUBindGroupLayout; pl: GPUPipelineLayout } | null = null;
  private fxPipes = new Map<string, GPURenderPipeline>();
  private fxPool = new Map<string, { tex: GPUTexture; used: boolean }[]>();
  private textPipe!: GPURenderPipeline;
  private textPool = new Map<string, { tex: GPUTexture; used: boolean }[]>();
  private yPipe!: GPURenderPipeline;
  private uvPipe!: GPURenderPipeline;
  private sampler!: GPUSampler;
  private outPipes = new Map<GPUTextureFormat, GPURenderPipeline>();
  private targets = new Map<string, Targets>();
  private configured = new WeakSet<HTMLCanvasElement>();
  private temps: GPUBuffer[] = []; // uniform tam cua khung hien tai, huy sau khi GPU chay xong
  info!: GpuInfo;

  async init(): Promise<GpuInfo> {
    if (!navigator.gpu) throw new Error('WebGPU khong co trong moi truong nay');
    const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
    if (!adapter) throw new Error('Khong lay duoc GPU adapter');
    this.device = await adapter.requestDevice();
    this.device.addEventListener('uncapturederror', (e) => console.error('WebGPU loi:', (e as GPUUncapturedErrorEvent).error.message));
    this.device.lost.then((i) => console.error('GPU device lost:', i.message));
    const ai = adapter.info;
    this.info = { vendor: ai.vendor, architecture: ai.architecture, device: ai.device, description: ai.description, features: [...adapter.features] };
    this.module = this.device.createShaderModule({ code: WGSL });
    this.ubuf = this.device.createBuffer({ size: 32, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    this.scenePipe = this.device.createRenderPipeline({
      layout: 'auto',
      vertex: { module: this.module, entryPoint: 'vs' },
      fragment: { module: this.module, entryPoint: 'fs_scene', targets: [{ format: 'rgba16float' }] },
      primitive: { topology: 'triangle-list' },
    });
    const nm = this.device.createShaderModule({ code: NV12_WGSL });
    this.yPipe = this.device.createRenderPipeline({ layout: 'auto', vertex: { module: nm, entryPoint: 'vs' }, fragment: { module: nm, entryPoint: 'fs_y', targets: [{ format: 'r8unorm' }] }, primitive: { topology: 'triangle-list' } });
    this.uvPipe = this.device.createRenderPipeline({ layout: 'auto', vertex: { module: nm, entryPoint: 'vs' }, fragment: { module: nm, entryPoint: 'fs_uv', targets: [{ format: 'rg8unorm' }] }, primitive: { topology: 'triangle-list' } });
    const tm = this.device.createShaderModule({ code: TEXT_WGSL });
    this.textPipe = this.device.createRenderPipeline({
      layout: 'auto',
      vertex: { module: tm, entryPoint: 'vs_text' },
      fragment: {
        module: tm,
        entryPoint: 'fs_text',
        targets: [
          {
            format: 'rgba16float',
            blend: {
              color: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' }, // premultiplied
              alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
            },
          },
        ],
      },
      primitive: { topology: 'triangle-list' },
    });
    this.sampler = this.device.createSampler({ magFilter: 'linear', minFilter: 'linear' });
    return this.info;
  }

  private getLayerPipe(matte: boolean, lut: boolean): GPURenderPipeline {
    const key = `${matte ? 'm' : ''}${lut ? 'l' : ''}`;
    let p = this.layerPipes.get(key);
    if (!p) {
      const mod = this.device.createShaderModule({ code: layerWgsl(matte, lut) });
      p = this.device.createRenderPipeline({
        layout: 'auto',
        vertex: { module: mod, entryPoint: 'vs_layer' },
        fragment: {
          module: mod,
          entryPoint: 'fs_layer',
          targets: [{ format: 'rgba16float', blend: { color: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha', operation: 'add' }, alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' } } }],
        },
        primitive: { topology: 'triangle-list' },
      });
      this.layerPipes.set(key, p);
    }
    return p;
  }

  /** Texture 3D cua LUT chinh mau (nho theo khoa, toi da 12). */
  private getLutTexture(g: GradeLutData): GPUTexture {
    let t = this.lutTex.get(g.key);
    if (t) return t;
    t = this.device.createTexture({ size: [g.size, g.size, g.size], dimension: '3d', format: 'rgba16float', usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST });
    this.device.queue.writeTexture({ texture: t }, g.data as unknown as BufferSource, { bytesPerRow: g.size * 8, rowsPerImage: g.size }, [g.size, g.size, g.size]);
    this.lutTex.set(g.key, t);
    if (this.lutTex.size > 12) {
      const [k0, t0] = this.lutTex.entries().next().value as [string, GPUTexture];
      this.lutTex.delete(k0);
      this.device.queue.onSubmittedWorkDone().then(() => t0.destroy());
    }
    return t;
  }

  private outPipe(format: GPUTextureFormat): GPURenderPipeline {
    let p = this.outPipes.get(format);
    if (!p) {
      p = this.device.createRenderPipeline({
        layout: 'auto',
        vertex: { module: this.module, entryPoint: 'vs' },
        fragment: { module: this.module, entryPoint: 'fs_out', targets: [{ format }] },
        primitive: { topology: 'triangle-list' },
      });
      this.outPipes.set(format, p);
    }
    return p;
  }

  private getTargets(w: number, h: number): Targets {
    const key = `${w}x${h}`;
    let t = this.targets.get(key);
    if (!t) {
      t = {
        hdr: this.device.createTexture({ size: [w, h], format: 'rgba16float', usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING }),
        ldr: this.device.createTexture({ size: [w, h], format: 'rgba8unorm', usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC | GPUTextureUsage.TEXTURE_BINDING }),
      };
      this.targets.set(key, t);
    }
    return t;
  }

  /**
   * Hinh chu nhat cua mot lop: fit + scale + neo + dich + xoay (pixel tren canvas).
   * Neo: diem tren khung (trai/giua/phai x tren/giua/duoi, co le an toan `margin`) ma canh/tam tuong ung cua lop bam vao;
   * x, y la dich tu diem neo. Mac dinh giua/giua nen video khong doi hanh vi.
   * opts.noFit: lop chu (kich thuoc la pixel that, khong fit theo khung). opts.inset: le (px goc) quanh khoi chu khong tinh vao neo.
   */
  static layerRect(canvasW: number, canvasH: number, mw: number, mh: number, t: Transform, opts: { noFit?: boolean; inset?: number } = {}) {
    const fit = opts.noFit ? 1 : t.fit === 'cover' ? Math.max(canvasW / mw, canvasH / mh) : Math.min(canvasW / mw, canvasH / mh);
    const sw = mw * fit * t.scale,
      sh = mh * fit * t.scale;
    const inset = (opts.inset ?? 0) * t.scale;
    const m = (t.margin ?? 0.06) * Math.min(canvasW, canvasH);
    const ah = t.anchorH ?? 'center',
      av = t.anchorV ?? 'middle';
    const ax = ah === 'left' ? m : ah === 'right' ? canvasW - m : canvasW / 2;
    const ay = av === 'top' ? m : av === 'bottom' ? canvasH - m : canvasH / 2;
    const cx = ax + t.x * canvasW + (ah === 'left' ? sw / 2 - inset : ah === 'right' ? -(sw / 2 - inset) : 0);
    const cy = ay + t.y * canvasH + (av === 'top' ? sh / 2 - inset : av === 'bottom' ? -(sh / 2 - inset) : 0);
    const rad = (t.rotation * Math.PI) / 180;
    return { cx, cy, sw, sh, cos: Math.cos(rad), sin: Math.sin(rad) };
  }

  /** Texture RGBA 8-bit tai su dung theo kich thuoc (moi lop chu trong mot khung lay mot texture rieng). */
  private acquireTextTexture(w: number, h: number): GPUTexture {
    const key = `${w}x${h}`;
    let list = this.textPool.get(key);
    if (!list) this.textPool.set(key, (list = []));
    let e = list.find((x) => !x.used);
    if (!e) {
      e = { tex: this.device.createTexture({ size: [w, h], format: 'rgba8unorm', usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT }), used: false };
      list.push(e);
      if (this.textPool.size > 40) {
        // gioi han bo nho: bo nhom kich thuoc cu nhat
        const oldest = this.textPool.keys().next().value as string;
        if (oldest !== key) {
          for (const x of this.textPool.get(oldest)!) x.tex.destroy();
          this.textPool.delete(oldest);
        }
      }
    }
    e.used = true;
    return e.tex;
  }

  private fxPipe(entry: string, blend?: BlendMode): GPURenderPipeline {
    const key = entry + (blend ?? '');
    let p = this.fxPipes.get(key);
    if (p) return p;
    this.fxMod ??= this.device.createShaderModule({ code: FX_WGSL });
    if (!this.fxLayout) {
      // bind group layout co dinh (layout:'auto' bo binding khong dung -> bind group day du bi loi)
      const bgl = this.device.createBindGroupLayout({
        entries: [
          { binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
          { binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float' } },
          { binding: 2, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float' } },
          { binding: 3, visibility: GPUShaderStage.FRAGMENT, sampler: { type: 'filtering' } },
        ],
      });
      this.fxLayout = { bgl, pl: this.device.createPipelineLayout({ bindGroupLayouts: [bgl] }) };
    }
    let bl: GPUBlendState | undefined;
    if (blend) {
      const f: Record<BlendMode, [GPUBlendFactor, GPUBlendFactor]> = { normal: ['one', 'one-minus-src-alpha'], add: ['one', 'one'], screen: ['one-minus-dst', 'one'], multiply: ['dst', 'one-minus-src-alpha'] };
      const [src, dst] = f[blend];
      bl = { color: { srcFactor: src, dstFactor: dst, operation: 'add' }, alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' } };
    }
    p = this.device.createRenderPipeline({ layout: this.fxLayout.pl, vertex: { module: this.fxMod, entryPoint: 'vs' }, fragment: { module: this.fxMod, entryPoint: entry, targets: [{ format: 'rgba16float', blend: bl }] }, primitive: { topology: 'triangle-list' } });
    this.fxPipes.set(key, p);
    return p;
  }

  private acquireFxTex(w: number, h: number): GPUTexture {
    const key = `${w}x${h}`;
    let list = this.fxPool.get(key);
    if (!list) this.fxPool.set(key, (list = []));
    let e = list.find((x) => !x.used);
    if (!e) {
      e = { tex: this.device.createTexture({ size: [w, h], format: 'rgba16float', usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING }), used: false };
      list.push(e);
      if (this.fxPool.size > 6) {
        const oldest = this.fxPool.keys().next().value as string;
        if (oldest !== key) {
          for (const x of this.fxPool.get(oldest)!) x.tex.destroy();
          this.fxPool.delete(oldest);
        }
      }
    }
    e.used = true;
    return e.tex;
  }

  /** Mot pass toan khung: doc t0 (va t1), ghi vao `target`. clear = xoa truoc (ghi de), nguoc lai ghep (blend pipeline). */
  private fxPass(enc: GPUCommandEncoder, pipe: GPURenderPipeline, t0: GPUTexture, t1: GPUTexture, target: GPUTextureView, params: number[], clear: boolean) {
    const ub = this.device.createBuffer({ size: 48, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    this.temps.push(ub);
    const f = new Float32Array(12);
    f.set(params.slice(0, 12));
    this.device.queue.writeBuffer(ub, 0, f);
    const pass = enc.beginRenderPass({ colorAttachments: [{ view: target, loadOp: clear ? 'clear' : 'load', storeOp: 'store', clearValue: [0, 0, 0, 0] }] });
    pass.setPipeline(pipe);
    pass.setBindGroup(0, this.device.createBindGroup({ layout: this.fxLayout!.bgl, entries: [{ binding: 0, resource: { buffer: ub } }, { binding: 1, resource: t0.createView() }, { binding: 2, resource: t1.createView() }, { binding: 3, resource: this.sampler }] }));
    pass.draw(3);
    pass.end();
  }

  /** Ve mot lop: truc tiep neu khong co hieu ung/blend, nguoc lai ve rieng ra texture premultiplied, chay chuoi hieu ung, roi ghep theo blend. */
  private drawWithFx(enc: GPUCommandEncoder, hview: GPUTextureView, layer: Layer, o: FrameOpts) {
    const fx = layer.fx;
    const blend = layer.blend ?? 'normal';
    const chain = !!fx && (!!fx.blur || !!fx.glow || !!fx.shadow || !!fx.vignette || !!fx.wipe);
    if (!chain && blend === 'normal') return this.drawLayer(enc, hview, layer, o);
    const { width: w, height: h } = o;
    const k = Math.min(w, h) / 1080; // px @1080 -> px that
    let cur = this.acquireFxTex(w, h);
    enc.beginRenderPass({ colorAttachments: [{ view: cur.createView(), loadOp: 'clear', storeOp: 'store', clearValue: [0, 0, 0, 0] }] }).end();
    this.drawLayer(enc, cur.createView(), layer, o);
    const swap = (fn: (src: GPUTexture, dst: GPUTexture) => void) => {
      const dst = this.acquireFxTex(w, h);
      fn(cur, dst);
      cur = dst;
    };
    const blur = (src: GPUTexture, radius: number): GPUTexture => {
      const a = this.acquireFxTex(w, h),
        b = this.acquireFxTex(w, h);
      this.fxPass(enc, this.fxPipe('fs_blur'), src, src, a.createView(), [1 / w, 0, radius, 0], true);
      this.fxPass(enc, this.fxPipe('fs_blur'), a, a, b.createView(), [0, 1 / h, radius, 0], true);
      return b;
    };
    if (fx?.blur && fx.blur.radius > 0) {
      const src = cur;
      const out = blur(src, fx.blur.radius * k);
      cur = out;
    }
    if (fx?.glow && fx.glow.intensity > 0) {
      const th = this.acquireFxTex(w, h);
      this.fxPass(enc, this.fxPipe('fs_thresh'), cur, cur, th.createView(), [fx.glow.threshold, 0, 0, 0], true);
      const g = blur(th, fx.glow.radius * k);
      const rgb = fx.glow.color ? hexToRgb01(fx.glow.color) : [1, 1, 1];
      swap((src, dst) => this.fxPass(enc, this.fxPipe('fs_glow'), src, g, dst.createView(), [fx.glow!.intensity, 0, 0, 0, rgb[0], rgb[1], rgb[2], fx.glow!.color ? 1 : 0], true));
    }
    if (fx?.shadow && fx.shadow.opacity > 0) {
      const m = blur(cur, fx.shadow.blur * k);
      const rgb = hexToRgb01(fx.shadow.color);
      swap((src, dst) => this.fxPass(enc, this.fxPipe('fs_shadow'), src, m, dst.createView(), [(fx.shadow!.x * k) / w, (fx.shadow!.y * k) / h, fx.shadow!.opacity, 0, rgb[0], rgb[1], rgb[2], 0], true));
    }
    if (fx?.vignette && fx.vignette.amount > 0) swap((src, dst) => this.fxPass(enc, this.fxPipe('fs_vig'), src, src, dst.createView(), [fx.vignette!.amount, fx.vignette!.softness, 0, 0], true));
    if (fx?.wipe && fx.wipe.progress < 1) {
      const rad = (fx.wipe.angle * Math.PI) / 180;
      swap((src, dst) => this.fxPass(enc, this.fxPipe('fs_wipe'), src, src, dst.createView(), [fx.wipe!.progress, Math.cos(rad), Math.sin(rad), fx.wipe!.feather], true));
    }
    this.fxPass(enc, this.fxPipe('fs_comp', blend), cur, cur, hview, [], false);
    for (const list of this.fxPool.values()) for (const e of list) e.used = false; // lenh da xep thu tu: lop sau dung lai duoc texture
  }

  /** Ghi cac lenh ve cho tat ca lop vao encoder. Phai goi dong bo trong cung mot tac vu voi submit (external texture het han). */
  private encodeLayers(enc: GPUCommandEncoder, hdr: GPUTexture, layers: Layer[], o: FrameOpts) {
    for (const list of this.textPool.values()) for (const e of list) e.used = false;
    for (const list of this.fxPool.values()) for (const e of list) e.used = false;
    const hview = hdr.createView();
    let first = true;
    const clear = () => {
      enc.beginRenderPass({ colorAttachments: [{ view: hview, loadOp: 'clear', storeOp: 'store', clearValue: [o.bg ?? 0, o.bg ?? 0, o.bg ?? 0, 1] }] }).end();
      first = false;
    };
    if (!layers.length) clear();
    for (const layer of layers) {
      if (first) clear();
      this.drawWithFx(enc, hview, layer, o);
    }
  }

  /** Ve mot lop vao `hview` (loadOp load). */
  private drawLayer(enc: GPUCommandEncoder, hview: GPUTextureView, layer: Layer, o: FrameOpts) {
      if (layer.type === 'gen') {
        // moi lop gen co uniform rieng (uniform chung se bi ghi de boi lop sau / pass output truoc khi lenh chay)
        const gb = this.device.createBuffer({ size: 32, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
        this.temps.push(gb);
        this.device.queue.writeBuffer(gb, 0, new Float32Array([o.width, o.height, layer.time, SCENE_ID[layer.kind], layer.param || 64, 0, 0, 0]));
        const pass = enc.beginRenderPass({ colorAttachments: [{ view: hview, loadOp: 'load', storeOp: 'store' }] });
        pass.setPipeline(this.scenePipe);
        pass.setBindGroup(0, this.device.createBindGroup({ layout: this.scenePipe.getBindGroupLayout(0), entries: [{ binding: 0, resource: { buffer: gb } }] }));
        pass.draw(3);
        pass.end();
      } else if (layer.type === 'video') {
        const r = Renderer.layerRect(o.width, o.height, layer.width, layer.height, layer.transform);
        const mo = layer.matteOpts ?? { lo: 0, hi: 1, feather: 0 };
        const g = layer.grade;
        const ub = this.device.createBuffer({ size: 96, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
        this.temps.push(ub);
        const k = g ? (g.size - 1) / g.size : 1;
        this.device.queue.writeBuffer(ub, 0, new Float32Array([r.cx, r.cy, r.sw, r.sh, o.width, o.height, r.cos, r.sin, layer.transform.opacity, mo.lo, mo.hi, mo.feather, 1 / (layer.matteW ?? 1080), 1 / (layer.matteH ?? 1920), k, g ? 0.5 / g.size : 0, layer.fx?.round?.radius ?? 0, layer.fx?.crop?.left ?? 0, layer.fx?.crop?.top ?? 0, layer.fx?.crop?.right ?? 0, layer.fx?.crop?.bottom ?? 0, 0, 0, 0]));
        const ext = this.device.importExternalTexture({ source: layer.frame, colorSpace: 'srgb' });
        const pipe = this.getLayerPipe(!!layer.matte, !!g);
        const entries: GPUBindGroupEntry[] = [
          { binding: 0, resource: { buffer: ub } },
          { binding: 1, resource: ext },
          { binding: 2, resource: this.sampler },
        ];
        if (layer.matte) entries.push({ binding: 3, resource: this.device.importExternalTexture({ source: layer.matte, colorSpace: 'srgb' }) });
        if (g) entries.push({ binding: 4, resource: this.getLutTexture(g).createView({ dimension: '3d' }) }, { binding: 5, resource: this.sampler });
        const pass = enc.beginRenderPass({ colorAttachments: [{ view: hview, loadOp: 'load', storeOp: 'store' }] });
        pass.setPipeline(pipe);
        pass.setBindGroup(0, this.device.createBindGroup({ layout: pipe.getBindGroupLayout(0), entries }));
        pass.draw(6);
        pass.end();
      } else {
        // lop chu: ve canvas -> texture (premultiplied) -> tron
        const r = Renderer.layerRect(o.width, o.height, layer.width, layer.height, layer.transform, { noFit: true, inset: layer.inset });
        const tex = this.acquireTextTexture(layer.width, layer.height);
        this.device.queue.copyExternalImageToTexture({ source: layer.canvas }, { texture: tex, premultipliedAlpha: true }, [layer.width, layer.height]);
        const ub = this.device.createBuffer({ size: 48, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
        this.temps.push(ub);
        this.device.queue.writeBuffer(ub, 0, new Float32Array([r.cx, r.cy, r.sw, r.sh, o.width, o.height, r.cos, r.sin, layer.transform.opacity, 0, 0, 0]));
        const pass = enc.beginRenderPass({ colorAttachments: [{ view: hview, loadOp: 'load', storeOp: 'store' }] });
        pass.setPipeline(this.textPipe);
        pass.setBindGroup(
          0,
          this.device.createBindGroup({
            layout: this.textPipe.getBindGroupLayout(0),
            entries: [
              { binding: 0, resource: { buffer: ub } },
              { binding: 1, resource: tex.createView() },
              { binding: 2, resource: this.sampler },
            ],
          }),
        );
        pass.draw(6);
        pass.end();
      }
  }

  private submit(enc: GPUCommandEncoder) {
    this.device.queue.submit([enc.finish()]);
    const t = this.temps;
    this.temps = [];
    if (t.length) this.device.queue.onSubmittedWorkDone().then(() => t.forEach((b) => b.destroy()));
  }

  private encodeOutput(enc: GPUCommandEncoder, hdr: GPUTexture, target: GPUTextureView, format: GPUTextureFormat, o: FrameOpts) {
    this.device.queue.writeBuffer(this.ubuf, 0, new Float32Array([o.width, o.height, 0, 0, 0, OUT_ID[o.out ?? 'srgb'], o.dither ? 1 : 0, o.view === 'false' ? 1 : o.view === 'clip' ? 2 : 0]));
    const pipe = this.outPipe(format);
    const out = enc.beginRenderPass({ colorAttachments: [{ view: target, loadOp: 'clear', storeOp: 'store', clearValue: [0, 0, 0, 1] }] });
    out.setPipeline(pipe);
    out.setBindGroup(
      0,
      this.device.createBindGroup({
        layout: pipe.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: this.ubuf } },
          { binding: 1, resource: hdr.createView() },
        ],
      }),
    );
    out.draw(3);
    out.end();
  }

  /** Do scope tren khung da ghep (sau Output Transform sRGB, khong che do xem). cols = so cot waveform. */
  async analyze(layers: Layer[], o: FrameOpts, cols = 320, roi?: { x0: number; y0: number; x1: number; y1: number }): Promise<ScopeData> {
    const { width: fw, height: fh } = o;
    // vung do (ty le 0..1 cua khung): mac dinh ca khung; thu hep de bo vien den / chi do vung quan tam
    const rx = roi ? Math.min(fw - 1, Math.max(0, Math.floor(roi.x0 * fw))) : 0;
    const ry = roi ? Math.min(fh - 1, Math.max(0, Math.floor(roi.y0 * fh))) : 0;
    const w = roi ? Math.max(1, Math.min(fw - rx, Math.round((roi.x1 - roi.x0) * fw))) : fw;
    const h = roi ? Math.max(1, Math.min(fh - ry, Math.round((roi.y1 - roi.y0) * fh))) : fh;
    const t = this.getTargets(fw, fh);
    this.scopePipe ??= this.device.createComputePipeline({ layout: 'auto', compute: { module: this.device.createShaderModule({ code: SCOPE_WGSL }), entryPoint: 'main' } });
    const enc = this.device.createCommandEncoder();
    this.encodeLayers(enc, t.hdr, layers, o);
    this.encodeOutput(enc, t.hdr, t.ldr.createView(), 'rgba8unorm', { ...o, view: 'none', dither: false, out: o.out ?? 'srgb' });
    const mk = (size: number, usage: number) => this.device.createBuffer({ size, usage });
    const ST = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC;
    const hist = mk(4 * 256 * 4, ST),
      wave = mk(4 * cols * 256 * 4, ST),
      vect = mk(256 * 256 * 4, ST);
    const pb = mk(32, GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST);
    this.device.queue.writeBuffer(pb, 0, new Uint32Array([w, h, cols, 0, rx, ry, 0, 0]));
    const pass = enc.beginComputePass();
    pass.setPipeline(this.scopePipe);
    pass.setBindGroup(0, this.device.createBindGroup({ layout: this.scopePipe.getBindGroupLayout(0), entries: [{ binding: 0, resource: { buffer: pb } }, { binding: 1, resource: t.ldr.createView() }, { binding: 2, resource: { buffer: hist } }, { binding: 3, resource: { buffer: wave } }, { binding: 4, resource: { buffer: vect } }] }));
    pass.dispatchWorkgroups(Math.ceil(w / 8), Math.ceil(h / 8));
    pass.end();
    const rd = (b: GPUBuffer) => {
      const r = mk(b.size, GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ);
      enc.copyBufferToBuffer(b, 0, r, 0, b.size);
      return r;
    };
    const rh = rd(hist),
      rw = rd(wave),
      rv = rd(vect);
    this.submit(enc);
    await Promise.all([rh.mapAsync(GPUMapMode.READ), rw.mapAsync(GPUMapMode.READ), rv.mapAsync(GPUMapMode.READ)]);
    const out: ScopeData = { w, h, cols, hist: new Uint32Array(rh.getMappedRange().slice(0)), wave: new Uint32Array(rw.getMappedRange().slice(0)), vect: new Uint32Array(rv.getMappedRange().slice(0)) };
    for (const b of [rh, rw, rv, hist, wave, vect, pb]) b.destroy();
    return out;
  }

  /** Ve cac lop va doc ve RGBA 8-bit (khong dem). */
  async renderToRgba(layers: Layer[], o: FrameOpts): Promise<Uint8ClampedArray> {
    const { width: w, height: h } = o;
    const t = this.getTargets(w, h);
    const enc = this.device.createCommandEncoder();
    this.encodeLayers(enc, t.hdr, layers, o);
    this.encodeOutput(enc, t.hdr, t.ldr.createView(), 'rgba8unorm', o);
    const bpr = Math.ceil((w * 4) / 256) * 256;
    const buf = this.device.createBuffer({ size: bpr * h, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
    enc.copyTextureToBuffer({ texture: t.ldr }, { buffer: buf, bytesPerRow: bpr }, [w, h]);
    this.submit(enc);
    await buf.mapAsync(GPUMapMode.READ);
    const src = new Uint8Array(buf.getMappedRange());
    const out = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y++) out.set(src.subarray(y * bpr, y * bpr + w * 4), y * w * 4);
    buf.unmap();
    buf.destroy();
    return out;
  }

  /** Ve cac lop, doi sang NV12 (BT.709 limited) tren GPU roi doc ve: [Y w*h][UV w*h/2]. Can w, h chan. */
  async renderToNv12(layers: Layer[], o: FrameOpts): Promise<Uint8Array> {
    const { width: w, height: h } = o;
    if (w % 2 || h % 2) throw new Error('NV12 can kich thuoc chan');
    const t = this.getTargets(w, h);
    t.y ??= this.device.createTexture({ size: [w, h], format: 'r8unorm', usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC });
    t.uv ??= this.device.createTexture({ size: [w / 2, h / 2], format: 'rg8unorm', usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC });
    const enc = this.device.createCommandEncoder();
    this.encodeLayers(enc, t.hdr, layers, o);
    this.encodeOutput(enc, t.hdr, t.ldr.createView(), 'rgba8unorm', o);
    const ldrView = t.ldr.createView();
    const plane = (pipe: GPURenderPipeline, target: GPUTexture) => {
      const pass = enc.beginRenderPass({ colorAttachments: [{ view: target.createView(), loadOp: 'clear', storeOp: 'store', clearValue: [0, 0, 0, 1] }] });
      pass.setPipeline(pipe);
      pass.setBindGroup(0, this.device.createBindGroup({ layout: pipe.getBindGroupLayout(0), entries: [{ binding: 1, resource: ldrView }] }));
      pass.draw(3);
      pass.end();
    };
    plane(this.yPipe, t.y);
    plane(this.uvPipe, t.uv);
    const bprY = Math.ceil(w / 256) * 256;
    const bprUV = Math.ceil(w / 256) * 256; // (w/2 texel) * 2 byte = w byte moi hang
    const bufY = this.device.createBuffer({ size: bprY * h, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
    const bufUV = this.device.createBuffer({ size: bprUV * (h / 2), usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
    enc.copyTextureToBuffer({ texture: t.y }, { buffer: bufY, bytesPerRow: bprY }, [w, h]);
    enc.copyTextureToBuffer({ texture: t.uv }, { buffer: bufUV, bytesPerRow: bprUV }, [w / 2, h / 2]);
    this.submit(enc);
    await Promise.all([bufY.mapAsync(GPUMapMode.READ), bufUV.mapAsync(GPUMapMode.READ)]);
    const out = new Uint8Array((w * h * 3) / 2);
    const sy = new Uint8Array(bufY.getMappedRange());
    const su = new Uint8Array(bufUV.getMappedRange());
    for (let y = 0; y < h; y++) out.set(sy.subarray(y * bprY, y * bprY + w), y * w);
    for (let y = 0; y < h / 2; y++) out.set(su.subarray(y * bprUV, y * bprUV + w), w * h + y * w);
    bufY.unmap();
    bufUV.unmap();
    bufY.destroy();
    bufUV.destroy();
    return out;
  }

  /** Ve len canvas (preview trong cua so). */
  renderToCanvas(canvas: HTMLCanvasElement, layers: Layer[], o: FrameOpts) {
    const ctx = canvas.getContext('webgpu')!;
    const format = navigator.gpu.getPreferredCanvasFormat();
    if (!this.configured.has(canvas)) {
      ctx.configure({ device: this.device, format, alphaMode: 'opaque' });
      this.configured.add(canvas);
    }
    if (canvas.width !== o.width || canvas.height !== o.height) {
      canvas.width = o.width;
      canvas.height = o.height;
    }
    const t = this.getTargets(o.width, o.height);
    const enc = this.device.createCommandEncoder();
    this.encodeLayers(enc, t.hdr, layers, o);
    this.encodeOutput(enc, t.hdr, ctx.getCurrentTexture().createView(), format, o);
    this.submit(enc);
  }

  /** Do toc do canh gen. serial = cho GPU xong tung khung; pipelined = day het roi cho. */
  async benchmark(o: FrameOpts & { kind: GenKind; param?: number }, frames: number): Promise<{ serialMs: number[]; pipelinedAvgMs: number }> {
    const t = this.getTargets(o.width, o.height);
    const view = t.ldr.createView();
    const run = (time: number) => {
      const enc = this.device.createCommandEncoder();
      this.encodeLayers(enc, t.hdr, [{ type: 'gen', kind: o.kind, param: o.param ?? 64, time }], o);
      this.encodeOutput(enc, t.hdr, view, 'rgba8unorm', o);
      this.submit(enc);
    };
    for (let i = 0; i < 10; i++) run(i);
    await this.device.queue.onSubmittedWorkDone();
    const serialMs: number[] = [];
    for (let i = 0; i < frames; i++) {
      const t0 = performance.now();
      run(i / 30);
      await this.device.queue.onSubmittedWorkDone();
      serialMs.push(performance.now() - t0);
    }
    const t1 = performance.now();
    for (let i = 0; i < frames; i++) run(i / 30);
    await this.device.queue.onSubmittedWorkDone();
    return { serialMs, pipelinedAvgMs: (performance.now() - t1) / frames };
  }
}
