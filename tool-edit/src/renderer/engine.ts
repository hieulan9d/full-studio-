// Engine trong renderer: giai ma, ghep lop theo timeline, render cho preview / xuat / preview_frame. Xem CHUC-NANG.md F-05, F-07, F-11.
import { Renderer, type Layer } from '../render/renderer';
import { CachedVideo } from '../render/decoder';
import { rasterizeText } from '../render/text-raster';
import { rasterizeShape } from '../render/shape-raster';
import { resolveClip } from '../core/anim';
import { speedAt, srcTimeAt } from '../core/speed';
import { bakeLut, gradeKey, isIdentity, parseCube, toF16, type CubeLut, type Grade } from '../core/grade';
import type { Clip, Project } from '../core/schema';
import { drawScope, statsOf, type ScopeKind } from '../core/scopes';
import type { ExportReq, RenderReq } from './bridge';

export const r = new Renderer();
const videos = new Map<string, CachedVideo>();
const imageFrames = new Map<string, VideoFrame>();
const cancelledJobs = new Set<string>();

export const stats = { previewFrames: 0, lastRenderMs: 0 };
/** Ty le do phan giai cua preview so voi du an (0.5 khi vua khung; len 1 khi zoom vao khung xem). */
export const previewCfg = { scale: 0.5 };

// Khoa tuan tu: preview, anh thu nho, preview_frame cua AI va vong xuat dung chung bo giai ma, ma bo giai ma khong an toan
// khi goi chong nhau (khung dang ghep bi dong/ghim sai). Moi khung (lay lop + ghep) chay tron ven truoc khung khac.
let chain: Promise<unknown> = Promise.resolve();
export function locked<T>(fn: () => Promise<T>): Promise<T> {
  const p = chain.then(fn, fn);
  chain = p.catch(() => {});
  return p;
}

async function getVideo(p: Project, mediaId: string): Promise<CachedVideo> {
  const m = p.media.find((x) => x.id === mediaId);
  if (!m) throw new Error(`khong co media ${mediaId}`);
  if (m.cache?.status !== 'ready') throw new Error(`media ${mediaId} chua san sang (cache: ${m.cache?.status ?? 'chua co'}${m.cache?.error ? ' - ' + m.cache.error : ''})`);
  const key = `${mediaId}:${m.cache.frames}`;
  let v = videos.get(key);
  if (!v) {
    for (const [k, old] of videos) {
      if (k.startsWith(mediaId + ':')) {
        old.dispose();
        videos.delete(k);
      }
    }
    const bytes = await window.toolEdit.readCache(mediaId);
    v = new CachedVideo(bytes, m.cache.width!, m.cache.height!);
    videos.set(key, v);
  }
  return v;
}

const cubes = new Map<string, CubeLut>();
const bakes = new Map<string, { key: string; size: number; data: Uint16Array }>();
/** LUT 3D da nuong cua grade cua clip (nho theo noi dung grade); nap file .cube neu co. */
async function gradeLayer(g: Grade | undefined) {
  if (!g || isIdentity(g)) return undefined;
  const key = gradeKey(g);
  let b = bakes.get(key);
  if (!b) {
    let cube: CubeLut | null = null;
    if (g.lut && g.lut.mix > 0) {
      cube = cubes.get(g.lut.path) ?? null;
      if (!cube) {
        cube = parseCube(await window.toolEdit.readLut(g.lut.path));
        cubes.set(g.lut.path, cube);
      }
    }
    const size = 33;
    b = { key, size, data: toF16(bakeLut(g, cube, size)) };
    bakes.set(key, b);
    if (bakes.size > 24) bakes.delete(bakes.keys().next().value as string);
  }
  return b;
}
/** Quen LUT .cube da nap (sau khi nguoi dung sua file). */
export const forgetCubes = () => cubes.clear();

/** Video matte (tach nen) cua media: bat loi neu chua san sang de khong xuat nham clip chua duoc cat nen. */
async function getMatte(p: Project, m: { id: string; matte?: string }): Promise<CachedVideo> {
  const mm = m.matte ? p.media.find((x) => x.id === m.matte) : undefined;
  if (!mm) throw new Error(`media ${m.id} khong co matte`);
  return getVideo(p, mm.id);
}

/** Anh tinh: tao mot VideoFrame tu ImageBitmap mot lan, dung lai (khong lien quan den bo giai ma phan cung). */
async function getImageFrame(mediaId: string): Promise<VideoFrame> {
  let f = imageFrames.get(mediaId);
  if (!f) {
    const bytes = await window.toolEdit.readMediaFile(mediaId);
    const bmp = await createImageBitmap(new Blob([bytes as BlobPart]));
    f = new VideoFrame(bmp, { timestamp: 0 });
    bmp.close();
    imageFrames.set(mediaId, f);
  }
  return f;
}

/** Anh co kenh alpha (PNG logo...): ve qua canvas (premultiplied) de giu trong suot; VideoFrame ngoai (external texture) bo mat alpha. */
const imageCanvases = new Map<string, { canvas: OffscreenCanvas; w: number; h: number; alpha: boolean }>();
async function getImageCanvas(mediaId: string) {
  let e = imageCanvases.get(mediaId);
  if (!e) {
    const bytes = await window.toolEdit.readMediaFile(mediaId);
    const bmp = await createImageBitmap(new Blob([bytes as BlobPart]));
    const cv = new OffscreenCanvas(bmp.width, bmp.height);
    cv.getContext('2d')!.drawImage(bmp, 0, 0);
    const probe = new OffscreenCanvas(48, 48);
    const pg = probe.getContext('2d', { willReadFrequently: true })!;
    pg.drawImage(bmp, 0, 0, 48, 48);
    const d = pg.getImageData(0, 0, 48, 48).data;
    let alpha = false;
    for (let i = 3; i < d.length; i += 4) if (d[i] < 250) alpha = true;
    e = { canvas: cv, w: bmp.width, h: bmp.height, alpha };
    bmp.close();
    imageCanvases.set(mediaId, e);
  }
  return e;
}

/** Quen cac khung/giai ma cua media khong con trong du an (sau khi mo/new). */
export function pruneMedia(p: Project) {
  const ids = new Set(p.media.map((m) => m.id));
  for (const [k, v] of videos) {
    if (!ids.has(k.split(':')[0])) {
      v.dispose();
      videos.delete(k);
    }
  }
  for (const k of [...imageCanvases.keys()]) if (!ids.has(k)) imageCanvases.delete(k);
  for (const [k, f] of imageFrames) {
    if (!ids.has(k)) {
      f.close();
      imageFrames.delete(k);
    }
  }
}

/** Danh sach lop (duoi len tren) dang hien o thoi diem t. size = kich thuoc khung se ve (de co chu theo khung). */
export async function layersAt(p: Project, t: number, size?: { width: number; height: number }): Promise<Layer[]> {
  for (const v of videos.values()) v.beginFrame(); // bo ghim khung cua lan render truoc
  const frame = size ?? { width: p.width, height: p.height };
  const out: Layer[] = [];
  const eps = 1e-6;
  for (const tr of p.tracks) {
    if (tr.kind !== 'video') continue;
    const c = p.clips.find((x) => !x.disabled && x.track === tr.id && t >= x.start - eps && t < x.start + x.duration - eps);
    if (!c) continue;
    const lt = t - c.start;
    const res = resolveClip(c, lt); // gia tri thuc tai thoi diem nay (da ap keyframe)
    const before = out.length;
    if (c.src.type === 'shape') {
      const r = rasterizeShape(res.shape!, frame.width, frame.height);
      out.push({ type: 'text', canvas: r.canvas, width: r.width, height: r.height, inset: r.pad, transform: res.transform });
    } else if (c.src.type === 'gen') {
      out.push({ type: 'gen', kind: c.src.kind, param: c.src.param, time: t });
    } else if (c.src.type === 'text') {
      const r = rasterizeText({ spec: res.text!, frameW: frame.width, frameH: frame.height, t: lt, duration: c.duration });
      out.push({ type: 'text', canvas: r.canvas, width: r.width, height: r.height, inset: r.pad, transform: res.transform });
    } else {
      const m = p.media.find((x) => x.id === (c.src as { mediaId: string }).mediaId)!;
      if (m.kind === 'video') {
        const v = await getVideo(p, m.id);
        // thoi diem NGUON (co the khac clip.in + lt khi co toc do / speed ramp)
        const fi = srcTimeAt(c, lt) * (m.cache!.fps ?? p.fps) + 1e-6;
        const idx = Math.min(v.frameCount - 1, Math.floor(fi));
        const frac = fi - Math.floor(fi);
        const mv = c.matte ? await getMatte(p, m) : null;
        const gl = await gradeLayer(c.grade);
        const push = async (i: number, opacity: number) => {
          const fr = await v.frame(i);
          const mf = mv ? await mv.frame(Math.min(i, mv.frameCount - 1)) : undefined;
          out.push({ type: 'video', frame: fr, width: m.cache!.width!, height: m.cache!.height!, transform: opacity === res.transform.opacity ? res.transform : { ...res.transform, opacity }, matte: mf, matteOpts: mf ? c.matte : undefined, matteW: mv?.width, matteH: mv?.height, grade: gl });
        };
        await push(idx, res.transform.opacity);
        // cham (toc do < 1): tron hai khung nguon ke nhau theo phan le de khong bi giat (khung nguon sau ve len voi do duc = phan le)
        if (speedAt(c, lt) < 0.999 && frac > 0.03 && idx + 1 < v.frameCount) await push(idx + 1, res.transform.opacity * frac);
      } else if (m.kind === 'image') {
        if (m.cache?.status !== 'ready') throw new Error(`anh ${m.id} chua san sang`);
        const ic = await getImageCanvas(m.id);
        if (ic.alpha && !c.grade) {
          // anh trong suot: ve nhu lop texture premultiplied; tinh ti le "vua khung" thu cong (lop texture khong fit)
          const k = res.transform.fit === 'cover' ? Math.max(frame.width / ic.w, frame.height / ic.h) : Math.min(frame.width / ic.w, frame.height / ic.h);
          out.push({ type: 'text', canvas: ic.canvas, width: ic.w, height: ic.h, inset: 0, transform: { ...res.transform, scale: res.transform.scale * k } });
          for (let i = before; i < out.length; i++) {
            if (res.fx) out[i].fx = res.fx;
            if (c.blend) out[i].blend = c.blend;
          }
          continue;
        }
        const fr = await getImageFrame(m.id);
        out.push({ type: 'video', frame: fr, width: fr.displayWidth, height: fr.displayHeight, transform: res.transform, grade: await gradeLayer(c.grade) });
      }
    }
    for (let i = before; i < out.length; i++) {
      if (res.fx) out[i].fx = res.fx;
      if (c.blend) out[i].blend = c.blend;
    }
  }
  return out;
}

/** QC chu: chu co tran khung 9:16 / 16:9 khong (do khoi chu sau neo, bo qua xoay). */
export function qcTexts(p: Project): { clip: string; aspect: string; px: number }[] {
  const out: { clip: string; aspect: string; px: number }[] = [];
  const frames: [string, number, number][] = [['9:16', 1080, 1920], ['16:9', 1920, 1080]];
  for (const c of p.clips) {
    if (c.src.type !== 'text') continue;
    for (const [aspect, W, H] of frames) {
      const lt = c.duration * 0.6;
      const res = resolveClip(c, lt);
      const rr = rasterizeText({ spec: res.text!, frameW: W, frameH: H, t: lt, duration: c.duration });
      const rect = Renderer.layerRect(W, H, rr.width, rr.height, res.transform, { noFit: true, inset: rr.pad });
      const bw = rr.blockW * res.transform.scale,
        bh = rr.blockH * res.transform.scale;
      const px = Math.max(0, -(rect.cx - bw / 2), -(rect.cy - bh / 2), rect.cx + bw / 2 - W, rect.cy + bh / 2 - H);
      if (px > 2) out.push({ clip: c.id, aspect, px });
    }
  }
  return out;
}

export function sizeFor(p: Project, scale: number, aspect?: string) {
  let w = p.width,
    h = p.height;
  if (aspect === '16:9') [w, h] = [Math.max(p.width, p.height), Math.min(p.width, p.height)];
  else if (aspect === '9:16') [w, h] = [Math.min(p.width, p.height), Math.max(p.width, p.height)];
  const even = (x: number) => Math.max(2, Math.round(x / 2) * 2);
  return { width: even(w * scale), height: even(h * scale) };
}

export function renderPreview(canvas: HTMLCanvasElement, p: Project, t: number, aspect: string, view: 'none' | 'false' | 'clip' = 'none') {
  return locked(async () => {
    const t0 = performance.now();
    const o = sizeFor(p, previewCfg.scale, aspect);
    r.renderToCanvas(canvas, await layersAt(p, t, o), { ...o, view });
    stats.previewFrames++;
    stats.lastRenderMs = performance.now() - t0;
  });
}

/** So lieu scope (compute shader) cua khung tai t. */
export function analyzeAt(p: Project, t: number, scale = 0.5, aspect?: string, roi?: { x0: number; y0: number; x1: number; y1: number }) {
  return locked(async () => {
    const o = sizeFor(p, scale, aspect);
    return r.analyze(await layersAt(p, t, o), { ...o, out: 'srgb' }, 320, roi);
  });
}

/** Anh dai dien (data URL) cua media: khung dau cua video / anh. */
export function thumbnail(p: Project, mediaId: string, w = 96, h = 54): Promise<string | null> {
  return locked(() => thumbnailNow(p, mediaId, w, h));
}

async function thumbnailNow(p: Project, mediaId: string, w: number, h: number): Promise<string | null> {
  const m = p.media.find((x) => x.id === mediaId);
  if (!m || m.cache?.status !== 'ready') return null;
  let frame: VideoFrame | null = null;
  let own = false;
  if (m.kind === 'video') {
    const v = await getVideo(p, mediaId);
    frame = await v.frame(Math.min(5, v.frameCount - 1));
  } else if (m.kind === 'image') {
    frame = await getImageFrame(mediaId);
  }
  if (!frame) return null;
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext('2d')!;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, h);
  const fw = frame.displayWidth,
    fh = frame.displayHeight;
  const k = Math.min(w / fw, h / fh);
  ctx.drawImage(frame, (w - fw * k) / 2, (h - fh * k) / 2, fw * k, fh * k);
  if (own) frame.close();
  return cv.toDataURL('image/jpeg', 0.8);
}

// ---- xu ly yeu cau tu main: preview_frame (MCP/HTTP) va xuat ----
async function toPng(rgba: Uint8ClampedArray, w: number, h: number): Promise<Uint8Array> {
  const cv = new OffscreenCanvas(w, h);
  cv.getContext('2d')!.putImageData(new ImageData(rgba as Uint8ClampedArray<ArrayBuffer>, w, h), 0, 0);
  const blob = await cv.convertToBlob({ type: 'image/png' });
  return new Uint8Array(await blob.arrayBuffer());
}
export { toPng };

export function renderFrameRgba(p: Project, t: number, scale: number, aspect?: string) {
  return locked(async () => {
    const o = sizeFor(p, scale, aspect);
    const rgba = await r.renderToRgba(await layersAt(p, t, o), o);
    return { rgba, ...o };
  });
}

/** Lop phu trong suot: ve moi khung 2 lan (nen den, nen trang) roi tach alpha: a = 1 - (trang - den); mau thang = den / a. Khung ngoai cac khoang co lop phu gui rong. */
async function doOverlayExport(req: ExportReq) {
  const { project: p, width, height, frames, jobId } = req;
  const ranges = req.overlay!.ranges;
  try {
    const inflight: Promise<void>[] = [];
    for (let n = 0; n < frames; n++) {
      if (cancelledJobs.has(jobId)) throw new Error('da huy');
      const t = n / p.fps;
      let buf: ArrayBuffer;
      if (!ranges.some(([a, b]) => t >= a - 1e-6 && t < b - 1e-6)) buf = new ArrayBuffer(0);
      else {
        const [bk, wh] = await locked(async () => {
          const layers = await layersAt(p, t, { width, height });
          const k = await r.renderToRgba(layers, { width, height, out: 'srgb', bg: 0 });
          const w = await r.renderToRgba(layers, { width, height, out: 'srgb', bg: 1 });
          return [k, w];
        });
        const out = new Uint8Array(width * height * 4);
        for (let i = 0; i < out.length; i += 4) {
          const a = 1 - (wh[i] - bk[i] + (wh[i + 1] - bk[i + 1]) + (wh[i + 2] - bk[i + 2])) / 765;
          if (a <= 0.004) continue; // trong suot hoan toan (out da 0)
          const inv = 1 / a;
          out[i] = Math.min(255, Math.round(bk[i] * inv));
          out[i + 1] = Math.min(255, Math.round(bk[i + 1] * inv));
          out[i + 2] = Math.min(255, Math.round(bk[i + 2] * inv));
          out[i + 3] = Math.min(255, Math.round(a * 255));
        }
        buf = out.buffer;
      }
      inflight.push(window.toolEdit.exportFrame(buf, jobId));
      if (inflight.length >= 3) await inflight.shift();
    }
    await Promise.all(inflight);
    window.toolEdit.exportEnd({ ok: true, jobId });
  } catch (e) {
    window.toolEdit.exportEnd({ ok: false, error: String(e), jobId });
  }
}

async function doExport(req: ExportReq) {
  if (req.overlay) return doOverlayExport(req);
  const { project: p, width, height, frames, jobId } = req;
  try {
    // Dua khung di theo cua so 3 khung dang bay de GPU ve khung ke tiep trong khi main ghi vao ffmpeg.
    const inflight: Promise<void>[] = [];
    const tm = { layersMs: 0, renderMs: 0, sendWaitMs: 0 };
    for (let n = 0; n < frames; n++) {
      if (cancelledJobs.has(jobId)) throw new Error('da huy');
      const t = n / p.fps;
      let a = performance.now();
      let b = a;
      const nv12 = await locked(async () => {
        const layers = await layersAt(p, t, { width, height });
        b = performance.now();
        tm.layersMs += b - a;
        return r.renderToNv12(layers, { width, height, out: 'srgb', dither: true });
      });
      a = performance.now();
      tm.renderMs += a - b;
      inflight.push(window.toolEdit.exportFrame(nv12.buffer as ArrayBuffer, jobId));
      if (inflight.length >= 3) await inflight.shift();
      tm.sendWaitMs += performance.now() - a;
    }
    await Promise.all(inflight);
    window.toolEdit.exportEnd({ ok: true, timing: tm, jobId });
  } catch (e) {
    window.toolEdit.exportEnd({ ok: false, error: String(e), jobId });
  }
}

export async function initEngine() {
  const info = await r.init();
  window.toolEdit.onRenderRequest(async (req: RenderReq) => {
    try {
      if (req.mode === 'stats' || req.mode === 'scope') {
        const d = await analyzeAt(req.project, req.t, req.scale, req.aspect, req.roi);
        if (req.mode === 'stats') return window.toolEdit.sendRenderResult({ id: req.id, stats: statsOf(d), width: d.w, height: d.h });
        const im = drawScope(d, (req.scope ?? 'waveform') as ScopeKind);
        return window.toolEdit.sendRenderResult({ id: req.id, png: await toPng(im.rgba, im.width, im.height), width: im.width, height: im.height });
      }
      const { rgba, width, height } = await renderFrameRgba(req.project, req.t, req.scale, req.aspect);
      window.toolEdit.sendRenderResult({ id: req.id, png: await toPng(rgba, width, height), width, height });
    } catch (e) {
      window.toolEdit.sendRenderResult({ id: req.id, error: String(e) });
    }
  });
  window.toolEdit.onQcRequest((req) => window.toolEdit.sendQcResult({ id: req.id, overflow: qcTexts(req.project) }));
  window.toolEdit.onExportStart((req) => void doExport(req));
  window.toolEdit.onExportCancel((id) => cancelledJobs.add(id));
  return info;
}
