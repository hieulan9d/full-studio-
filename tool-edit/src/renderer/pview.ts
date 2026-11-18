// Zoom / keo (pan) khung xem. zoom = px man hinh tren moi px khung du an (1 = 100%). Xem CHUC-NANG.md F-94.
import { frameSize } from './clip-geom';
import { store } from './store';

export const PV_MIN = 0.1;
export const PV_MAX = 8;
const PAD = 28; // le quanh khung khi "vua khung"

export function fitZoom(): number {
  const s = store.get();
  const { W, H } = frameSize(s.project, s.aspect);
  const { sw, sh } = s.pv;
  if (!sw || !sh) return 0.3;
  return Math.max(0.02, Math.min((sw - PAD) / W, (sh - PAD) / H));
}

/** Zoom dang dung thuc te (da tinh che do vua khung). */
export function effZoom(): number {
  const pv = store.get().pv;
  return pv.fit ? fitZoom() : pv.zoom;
}

export function clampPan(x: number, y: number, z: number): { x: number; y: number } {
  const s = store.get();
  const { W, H } = frameSize(s.project, s.aspect);
  const lx = (W * z) / 2 + s.pv.sw / 2 - 48,
    ly = (H * z) / 2 + s.pv.sh / 2 - 48;
  return { x: Math.max(-lx, Math.min(lx, x)), y: Math.max(-ly, Math.min(ly, y)) };
}

/** Dat zoom, giu diem (mx,my) (px man hinh so voi tam vung xem) dung yen duoi con tro. */
export function pvZoomTo(z: number, mx = 0, my = 0) {
  const s = store.get();
  const cur = effZoom();
  const fz = fitZoom();
  z = Math.max(PV_MIN, Math.min(PV_MAX, z));
  const curX = s.pv.fit ? 0 : s.pv.x,
    curY = s.pv.fit ? 0 : s.pv.y;
  const ux = (mx - curX) / cur,
    uy = (my - curY) / cur; // diem duoi con tro, tinh theo px khung (tu tam khung)
  const p = clampPan(mx - ux * z, my - uy * z, z);
  if (Math.abs(z - fz) / fz < 0.015) return store.set({ pv: { ...s.pv, fit: true, zoom: fz, x: 0, y: 0 } });
  store.set({ pv: { ...s.pv, fit: false, zoom: z, x: p.x, y: p.y } });
}

export const pvZoomBy = (f: number, mx = 0, my = 0) => pvZoomTo(effZoom() * f, mx, my);
export function pvFit() {
  const s = store.get();
  store.set({ pv: { ...s.pv, fit: true, zoom: fitZoom(), x: 0, y: 0 } });
}
export const pvActual = () => pvZoomTo(1);

export function pvPanBy(dx: number, dy: number) {
  const s = store.get();
  const z = effZoom();
  const p = clampPan((s.pv.fit ? 0 : s.pv.x) + dx, (s.pv.fit ? 0 : s.pv.y) + dy, z);
  store.set({ pv: { ...s.pv, fit: false, zoom: z, x: p.x, y: p.y } });
}

/** Do phan giai render preview hop voi zoom (nho khi vua khung, sac net khi zoom vao): 0.5 / 0.75 / 1. */
export function previewScaleFor(z: number, dpr = window.devicePixelRatio || 1): number {
  const need = z * dpr;
  return need <= 0.5 ? 0.5 : need <= 0.75 ? 0.75 : 1;
}
