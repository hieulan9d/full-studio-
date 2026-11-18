// Chinh mau "song": khi dang keo thanh truot, ap tam gia tri vao clip de preview va scope doi NGAY; tha chuot moi ghi that (mot buoc hoan tac).
import { mergeGrade, type DeepPartialGrade } from '../core/grade';
import type { Project } from '../core/schema';
import { store, type State } from './store';

/** Du an dung de ve: ban goc (hoac ban xem thu de xuat) + chinh mau dang keo. Tra lai chinh `base` khi khong keo (giu nguyen tham chieu). */
export function applyLive(base: Project, live: State['live']): Project {
  if (!live) return base;
  const i = base.clips.findIndex((c) => c.id === live.clipId);
  if (i < 0) return base;
  const clips = base.clips.slice();
  clips[i] = { ...clips[i], grade: mergeGrade(clips[i].grade, live.grade) };
  return { ...base, clips };
}

let onChange: () => void = () => {};
export function bindLive(cb: () => void) {
  onChange = cb;
}

export function setLive(clipId: string, grade: DeepPartialGrade) {
  store.set({ live: { clipId, grade } });
  onChange();
}

export function clearLive() {
  if (!store.get().live) return;
  store.set({ live: null });
  onChange();
}

/** Sau khi ghi that: giu gia tri tam den khi du an moi ve (tranh nhay ve mau cu), toi da 600ms; khong xoa neu da bat dau keo lan khac. */
export function settleLive() {
  const cur = store.get().live;
  if (!cur) return;
  setTimeout(() => {
    if (store.get().live === cur) clearLive();
  }, 600);
}
