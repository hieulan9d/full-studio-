// Cau noi toi tien trinh chinh (preload). Kieu cho window.toolEdit va ham api().
import type { Project } from '../core/schema';

export interface RenderReq {
  id: number;
  t: number;
  scale: number;
  project: Project;
  aspect?: string;
  mode?: 'png' | 'stats' | 'scope'; // png (mac dinh), so lieu scope (thong ke), hoac anh scope
  roi?: { x0: number; y0: number; x1: number; y1: number }; // vung do scope (ty le khung); mac dinh ca khung
  scope?: string; // waveform | parade | vectorscope | histogram (mode=scope)
}
export interface ExportReq {
  project: Project;
  width: number;
  height: number;
  frames: number;
  jobId: string;
  overlay?: { ranges: [number, number][] }; // co = xuat LOP PHU trong suot (RGBA) thay vi video
}
export interface JobView {
  id: string;
  type: string;
  state: 'running' | 'done' | 'error' | 'cancelled';
  progress: number;
  error?: string;
  result?: any;
  startedAt: number;
}
export interface ProposalView {
  id: string;
  source: string;
  note: string;
  ops: any[];
  status: 'pending' | 'accepted' | 'rejected' | 'invalid';
  errors: string[];
  createdAt: string;
}
export interface Meta {
  path: string | null;
  dirty: boolean;
}

declare global {
  interface Window {
    toolEdit: {
      onRenderRequest(cb: (r: RenderReq) => void): void;
      onExportStart(cb: (r: ExportReq) => void): void;
      onExportCancel(cb: (jobId: string) => void): void;
      onQcRequest(cb: (r: { id: number; project: Project }) => void): void;
      sendQcResult(r: unknown): void;
      sendRenderResult(r: unknown): void;
      sendSelftest(r: unknown): void;
      ready(info: unknown): void;
      exportFrame(buf: ArrayBuffer, jobId: string): Promise<void>;
      exportEnd(r: { ok: boolean; error?: string; timing?: Record<string, number>; jobId: string }): void;
      readCache(mediaId: string): Promise<Uint8Array>;
      readAudio(mediaId: string): Promise<Uint8Array>;
      readMediaFile(mediaId: string): Promise<Uint8Array>;
      onState(cb: (s: { project: Project; meta: Meta }) => void): void;
      api(method: string, path: string, body?: unknown): Promise<{ status: number; json?: any; buf?: Uint8Array }>;
      readLibrary(id: string): Promise<Uint8Array>;
      keymapExport(text: string): Promise<string | null>;
      keymapImport(): Promise<{ path: string; text: string } | null>;
      readLut(file: string): Promise<string>;
      dialogCubeOpen(): Promise<string | null>;
      dialogCubeSave(name: string): Promise<string | null>;
      writeText(file: string, text: string): Promise<void>;
      dialogDir(): Promise<string | null>;
      dialogMedia(): Promise<string[]>;
      dialogSave(): Promise<string | null>;
      dialogOpen(): Promise<string | null>;
      showInFolder(p: string): Promise<void>;
      pathForFile(f: File): string;
    };
    __te?: Record<string, unknown>; // diem do/kiem thu (chi doc)
  }
}

export const api = (method: string, path: string, body?: unknown) => window.toolEdit.api(method, path, body);
