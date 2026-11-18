// Cửa sổ Scope RIÊNG (nổi trong app): kéo bằng thanh tiêu đề, đổi cỡ bằng góc dưới phải; mở cùng lúc với tab Màu để vừa chỉnh vừa xem.
import { useEffect, useRef } from 'react';
import { store, useStore } from '../store';
import { Icon } from './Icon';
import { Scope } from './Scope';

const KEY = 'tool-edit-scope-win';

export function loadScopeWin() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    if (v && [v.x, v.y, v.w, v.h].every(Number.isFinite)) store.set({ scopeWin: { open: false, x: v.x, y: v.y, w: v.w, h: v.h } });
  } catch {
    /* không có bộ nhớ trình duyệt: dùng mặc định */
  }
}
function saveScopeWin() {
  try {
    const { x, y, w, h } = store.get().scopeWin;
    localStorage.setItem(KEY, JSON.stringify({ x, y, w, h }));
  } catch {
    /* bỏ qua */
  }
}
export const toggleScopeWin = (open?: boolean) => {
  const w = store.get().scopeWin;
  store.set({ scopeWin: { ...w, open: open ?? !w.open } });
};

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function ScopeWindow() {
  const win = useStore((s) => s.scopeWin);
  const view = useStore((s) => s.view);
  const box = useRef<HTMLDivElement | null>(null);

  // đổi cỡ bằng góc resize của trình duyệt: ghi lại kích thước
  useEffect(() => {
    const el = box.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => {
      const w = Math.round(el.offsetWidth),
        h = Math.round(el.offsetHeight);
      const cur = store.get().scopeWin;
      if (w > 100 && h > 100 && (Math.abs(w - cur.w) > 1 || Math.abs(h - cur.h) > 1)) {
        store.set({ scopeWin: { ...cur, w, h } });
        saveScopeWin();
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [win.open]);

  if (!win.open || view !== 'editor') return null;
  const down = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    e.preventDefault();
    const sx = e.clientX,
      sy = e.clientY,
      ox = win.x,
      oy = win.y;
    const move = (ev: PointerEvent) => {
      const cur = store.get().scopeWin;
      store.set({ scopeWin: { ...cur, x: clamp(ox + ev.clientX - sx, 0, window.innerWidth - 80), y: clamp(oy + ev.clientY - sy, 0, window.innerHeight - 40) } });
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      saveScopeWin();
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };
  return (
    <div ref={box} className="scopewin" data-testid="scope-float" style={{ left: win.x, top: win.y, width: win.w, height: win.h }}>
      <div className="swh" onPointerDown={down} onDoubleClick={() => store.set({ scopeWin: { ...win, x: Math.max(8, window.innerWidth - 340 - 380), y: 64, w: 360, h: 600 } })} title="Kéo để di chuyển · bấm đúp để về vị trí mặc định">
        <Icon n="activity" size={14} />
        <b>Scope</b>
        <span className="grow" />
        <button className="plain" data-testid="scope-float-dock" title="Đưa về tab Scope bên phải" onClick={() => { toggleScopeWin(false); store.set({ rightTab: 'scope' }); }}><Icon n="minimize" size={13} /></button>
        <button className="plain" data-testid="scope-float-close" title="Đóng cửa sổ Scope" onClick={() => toggleScopeWin(false)}><Icon n="x" size={13} /></button>
      </div>
      <div className="swb"><Scope /></div>
    </div>
  );
}
