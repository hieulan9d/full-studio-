// Trang thai giao dien (mot store nho, khong thu vien). Du an that nam o tien trinh chinh; day chi la ban sao + trang thai UI.
import { useSyncExternalStore } from 'react';
import { newProject, type Project } from '../core/schema';
import type { JobView, Meta, ProposalView } from './bridge';
import { defaultKeymap, type Keymap } from './keymap';

export interface FontView {
  family: string;
  vietnamese: boolean;
  weights: number[];
  italic: boolean;
  user: boolean;
}

export interface Toast {
  id: number;
  text: string;
  kind: 'info' | 'error' | 'ok';
  action?: { label: string; run: () => void };
}

export type Modal =
  | { kind: 'text'; title: string; value: string; ok: (v: string) => void; cancel: () => void }
  | { kind: 'pick'; title: string; items: { label: string; value: string }[]; ok: (v: string) => void; cancel: () => void };

export interface Layout {
  left: number; // px, bề rộng khung media
  right: number; // px, bề rộng khung thuộc tính
  tl: number; // px, chiều cao timeline
  trackH: number; // 0.6..2.2, hệ số chiều cao mỗi track
  maxed: 'none' | 'timeline' | 'preview'; // phóng to tạm một khung
}
export const DEFAULT_LAYOUT: Layout = { left: 290, right: 340, tl: 310, trackH: 1, maxed: 'none' };

export interface State {
  view: 'home' | 'editor';
  keymap: Keymap;
  autoApplyAi: boolean;
  layout: Layout;
  settingsOpen: boolean;
  exportOpen: boolean; // hop thoai "Xuat sang..."
  modal: Modal | null;
  project: Project;
  meta: Meta;
  selection: string[];
  playhead: number;
  playing: boolean;
  zoom: number; // pixel / giay
  aspect: '9:16' | '16:9';
  toast: Toast | null;
  draft: { id: string; project: Project } | null; // xem thu de xuat cua AI
  live: { clipId: string; grade: import('../core/grade').DeepPartialGrade } | null; // chinh mau DANG KEO (chua ghi vao du an): preview/scope doi theo ngay
  scopeWin: { open: boolean; x: number; y: number; w: number; h: number }; // cua so Scope roi (noi trong app)
  jobs: JobView[];
  proposals: ProposalView[];
  thumbs: Record<string, string>;
  rightTab: 'props' | 'color' | 'scope' | 'graph' | 'transcript' | 'library' | 'qc' | 'proposals';
  viewMode: 'none' | 'false' | 'clip'; // che do xem cua preview: mau gia / canh bao clip (khong anh huong xuat)
  fonts: FontView[];
  fontsScanning: boolean;
  graphProp: string | null; // thuoc tinh dang xem trong graph editor
  graphKey: number | null; // chi so keyframe dang chon
  clipboard: { prop: string; keys: { dt: number; v: number; ease: unknown }[] } | null;
  autosave: { exists: boolean; name?: string; clips?: number; mtime?: string } | null;
  previewError: string | null;
  snapGuide: number | null; // moc dang bam khi keo (giay)
  peaksVersion: number;
  pv: PreviewView; // zoom / keo (pan) khung xem
  safeGuides: boolean; // hien vung an toan + duong giua tren khung xem
  snapOn: boolean; // bam (snap) khi keo clip tren khung xem
  guides: { v: number[]; h: number[] } | null; // duong gioi dang bam (px khung) khi keo
}

export interface PreviewView {
  fit: boolean; // true = vua khung (tu tinh), bo qua zoom/x/y
  zoom: number; // px man hinh moi px khung du an (1 = 100%)
  x: number; // dich tam khung khoi tam vung xem (px man hinh)
  y: number;
  sw: number; // kich thuoc vung xem (do ResizeObserver)
  sh: number;
}

const initial: State = {
  view: 'editor',
  keymap: defaultKeymap(),
  autoApplyAi: true,
  layout: { ...DEFAULT_LAYOUT },
  settingsOpen: false,
  exportOpen: false,
  modal: null,
  project: newProject(),
  meta: { path: null, dirty: false },
  selection: [],
  playhead: 0,
  playing: false,
  zoom: 100,
  aspect: '9:16',
  toast: null,
  draft: null,
  live: null,
  scopeWin: { open: false, x: Math.max(8, (typeof window !== 'undefined' ? window.innerWidth : 1400) - 340 - 380), y: 64, w: 360, h: 600 },
  jobs: [],
  proposals: [],
  thumbs: {},
  rightTab: 'props',
  viewMode: 'none',
  fonts: [],
  fontsScanning: false,
  graphProp: null,
  graphKey: null,
  clipboard: null,
  autosave: null,
  previewError: null,
  snapGuide: null,
  peaksVersion: 0,
  pv: { fit: true, zoom: 1, x: 0, y: 0, sw: 0, sh: 0 },
  safeGuides: false,
  snapOn: true,
  guides: null,
};

type Listener = () => void;
class Store {
  state: State = initial;
  private ls = new Set<Listener>();
  get = () => this.state;
  set(patch: Partial<State>) {
    this.state = { ...this.state, ...patch };
    this.ls.forEach((l) => l());
  }
  subscribe = (l: Listener) => {
    this.ls.add(l);
    return () => this.ls.delete(l);
  };
}

export const store = new Store();

/** Chon mot phan cua state. Selector phai tra gia tri on dinh (nguyen thuy hoac tham chieu cu khi khong doi). */
export function useStore<T>(sel: (s: State) => T): T {
  return useSyncExternalStore(store.subscribe, () => sel(store.state));
}
