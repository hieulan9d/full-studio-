// Electron main: ep RTX, giu Session, job nen, HTTP 127.0.0.1 + IPC cho giao dien. Xem CHUC-NANG.md F-01..F-14, F-71.
import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';
import * as http from 'node:http';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as nodeCrypto from 'node:crypto';
import { Session } from '../core/session';
import { migrate, newProject, timelineEnd, validate, type Op, type Project } from '../core/schema';
import { Jobs } from './jobs';
import { buildAudioCache, buildCache, probe } from './media';
import { startFfmpeg, startOverlayFfmpeg, type ExportSession, type LoudnessTarget } from './exporter';
import { buildPlan, overlayFrameCount, TARGETS, type ExportTarget } from '../core/export-plan';
import { writeAeJsx, writeEdl, writeFcpxml, writeXmeml, type OverlayFile } from '../core/export-writers';
import { capcutDraftsDir, findCapcutTemplate, installCapcutDraft, writeCapcutDraft } from './export-capcut';
import { FontIndex } from './fonts';
import { projectWarnings } from '../core/vn';
import { PRESETS } from '../core/presets';
import { detectBeats, matteVideo, detectSilences, measureLoudness, transcribeFile, type WhisperOpts } from './analysis';
import { Library } from './library';
import { planSfx, sfxOps, type SfxRule } from '../core/sfx';
import { silenceGaps, speechRanges, type Range } from '../core/transcript';
import { CAPTION_TAG } from '../core/captions';

// Laptop hai GPU: ep chay bang GPU manh (RTX), khong de Windows chon Intel Iris.
app.commandLine.appendSwitch('force_high_performance_gpu');
// Cong go loi Chromium: CHI khi dev dat bien moi truong (de kiem giao dien bang Playwright). Mac dinh tat.
if (process.env.TOOL_EDIT_CDP_PORT) app.commandLine.appendSwitch('remote-debugging-port', process.env.TOOL_EDIT_CDP_PORT);

const PORT = Number(process.env.TOOL_EDIT_PORT ?? 17480);
// Cac duong "ap dung" (ops truc tiep, duyet, hoan tac, mo/luu, khoi phuc) chi danh cho giao dien qua IPC.
// HTTP mac dinh KHONG co chung, de AI (ke ca co shell) khong tu duyet duoc. Dat TOOL_EDIT_DEV_API=1 cho kiem thu.
const DEV_API = process.env.TOOL_EDIT_DEV_API === '1';
const selftest = process.argv.includes('--selftest');
const session = new Session();
const jobs = new Jobs();
let win: BrowserWindow | null = null;
let gpuInfo: unknown = null;
let nextId = 1;
const pending = new Map<number, { resolve: (v: any) => void; timer: NodeJS.Timeout }>();
const cacheFiles = new Map<string, string>(); // mediaId -> file cache video
const audioFiles = new Map<string, string>(); // mediaId -> file WAV
let projectPath: string | null = null;
let dirty = false;
let fontIndex: FontIndex | null = null;
let library: Library | null = null;
let analysisJob: string | null = null; // whisper/nhan nhip chi chay mot luc (GPU 6GB)
let exportBusy = false;

// ---- de xuat cua AI cho nguoi duyet (F-13) ----
interface Proposal {
  id: string;
  source: string;
  note: string;
  ops: Op[];
  status: 'pending' | 'accepted' | 'rejected' | 'invalid'; // invalid = dry-run that bai, khong the duyet
  errors: string[];
  createdAt: string;
}
const proposals: Proposal[] = [];
let proposalSeq = 0;

// Renderer phai khoi tao xong WebGPU truoc khi nhan yeu cau; neu khong yeu cau dau tien bi mat.
let rendererReady = false;
let markReady: () => void = () => {};
const readyPromise = new Promise<void>((r) => {
  markReady = r;
});

async function requestFrame(project: Project, t: number, scale: number, aspect?: string, mode?: string, scope?: string, roi?: { x0: number; y0: number; x1: number; y1: number }): Promise<any> {
  await Promise.race([readyPromise, new Promise((_, rej) => setTimeout(() => rej(new Error('renderer chua san sang sau 30s')), 30000))]);
  return new Promise((resolve, reject) => {
    if (!win) return reject(new Error('chua co cua so render'));
    const id = nextId++;
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error('render qua 30s'));
    }, 30000);
    pending.set(id, { resolve, timer });
    win.webContents.send('render-request', { id, t, scale, project, aspect, mode, scope, roi });
  });
}

ipcMain.on('render-result', (_e, res) => {
  const p = pending.get(res.id);
  if (!p) return;
  clearTimeout(p.timer);
  pending.delete(res.id);
  p.resolve(res);
});
ipcMain.on('renderer-ready', (_e, info) => {
  gpuInfo = info;
  rendererReady = true;
  markReady();
});

// ---- file cho renderer (chi file thuoc media cua du an) ----
ipcMain.handle('read-cache', (_e, mediaId: string) => {
  const f = cacheFiles.get(mediaId);
  if (!f) throw new Error(`media ${mediaId} chua co cache`);
  return fs.readFileSync(f);
});
ipcMain.handle('read-audio', (_e, mediaId: string) => {
  const f = audioFiles.get(mediaId);
  if (!f) throw new Error(`media ${mediaId} chua co tieng`);
  return fs.readFileSync(f);
});
ipcMain.handle('read-media-file', (_e, mediaId: string) => {
  const m = session.project.media.find((x) => x.id === mediaId);
  if (!m) throw new Error(`khong co media ${mediaId}`);
  return fs.readFileSync(m.path);
});
ipcMain.handle('dialog:media', async () => {
  const r = await dialog.showOpenDialog(win!, { title: 'Nhap media', properties: ['openFile', 'multiSelections'], filters: [{ name: 'Video, am thanh, anh', extensions: ['mp4', 'mov', 'mkv', 'webm', 'avi', 'm4v', 'mp3', 'wav', 'm4a', 'aac', 'flac', 'ogg', 'png', 'jpg', 'jpeg', 'webp'] }] });
  return r.canceled ? [] : r.filePaths;
});
ipcMain.handle('dialog:save', async () => {
  const r = await dialog.showSaveDialog(win!, { title: 'Luu du an', defaultPath: projectPath ?? `${session.project.name}.tedit`, filters: [{ name: 'Du an Tool Edit', extensions: ['tedit'] }] });
  return r.canceled ? null : r.filePath;
});
ipcMain.handle('dialog:open', async () => {
  const r = await dialog.showOpenDialog(win!, { title: 'Mo du an', properties: ['openFile'], filters: [{ name: 'Du an Tool Edit', extensions: ['tedit'] }] });
  return r.canceled ? null : r.filePaths[0];
});
ipcMain.handle('read-library', (_e, id: string) => {
  const it = library?.items.find((x) => x.id === id);
  if (!it) throw new Error('khong co muc nay trong kho');
  return fs.readFileSync(it.path);
});
ipcMain.handle('read-lut', (_e, file: string) => {
  const abs = path.resolve(String(file));
  if (!/\.cube$/i.test(abs)) throw new Error('chi doc file .cube');
  if (fs.statSync(abs).size > 60 * 1024 * 1024) throw new Error('file LUT qua lon');
  return fs.readFileSync(abs, 'utf8');
});
ipcMain.handle('dialog:cube-open', async () => {
  const r = await dialog.showOpenDialog(win!, { title: 'Chon LUT .cube', properties: ['openFile'], filters: [{ name: 'LUT 3D (.cube)', extensions: ['cube'] }] });
  return r.canceled ? null : r.filePaths[0];
});
ipcMain.handle('dialog:cube-save', async (_e, name: string) => {
  const r = await dialog.showSaveDialog(win!, { title: 'Xuat LUT .cube', defaultPath: `${name || 'grade'}.cube`, filters: [{ name: 'LUT 3D (.cube)', extensions: ['cube'] }] });
  return r.canceled ? null : r.filePath;
});
ipcMain.handle('keymap-export', async (_e, text: string) => {
  const r = await dialog.showSaveDialog(win!, { title: 'Xuất bộ phím tắt', defaultPath: 'tool-edit-phim-tat.json', filters: [{ name: 'Bộ phím tắt (JSON)', extensions: ['json'] }] });
  if (r.canceled || !r.filePath) return null;
  fs.writeFileSync(r.filePath, String(text), 'utf8');
  return r.filePath;
});
ipcMain.handle('keymap-import', async () => {
  const r = await dialog.showOpenDialog(win!, { title: 'Nhập bộ phím tắt', properties: ['openFile'], filters: [{ name: 'Bộ phím tắt (JSON)', extensions: ['json'] }] });
  if (r.canceled || !r.filePaths[0]) return null;
  if (fs.statSync(r.filePaths[0]).size > 200_000) throw new Error('file quá lớn');
  return { path: r.filePaths[0], text: fs.readFileSync(r.filePaths[0], 'utf8') };
});
ipcMain.handle('write-text', (_e, file: string, text: string) => {
  const abs = path.resolve(String(file));
  if (!/\.cube$/i.test(abs)) throw new Error('chi ghi file .cube');
  fs.writeFileSync(abs, String(text), 'utf8');
});
ipcMain.handle('dialog:dir', async () => {
  const r = await dialog.showOpenDialog(win!, { title: 'Chon thu muc SFX / nhac', properties: ['openDirectory'] });
  return r.canceled ? null : r.filePaths[0];
});
ipcMain.handle('show-in-folder', (_e, p: string) => shell.showItemInFolder(p));

const sendState = () => win?.webContents.send('state', { project: session.project, meta: { path: projectPath, dirty } });
let autosaveTimer: NodeJS.Timeout | null = null;
const autosaveFile = () => path.join(app.getPath('userData'), 'autosave.tedit');
function notifyProject(changed = false) {
  if (changed) {
    dirty = true;
    ensureNewMediaCaches();
  }
  sendState();
  if (selftest) return;
  if (autosaveTimer) clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(() => {
    try {
      writeProject(autosaveFile());
    } catch {
      /* autosave khong duoc lam hong phien */
    }
  }, 800);
}
const cacheDir = () => path.join(app.getPath('userData'), 'cache');
const exportDir = () => process.env.TOOL_EDIT_EXPORT_DIR ?? path.join(app.getPath('userData'), 'exports');

// ---- cai dat (phim tat, bo cuc) + trang chu: du an gan day ----
const settingsFile = () => path.join(app.getPath('userData'), 'settings.json');
const recentFile = () => path.join(app.getPath('userData'), 'recent.json');
const projectsDir = () => process.env.TOOL_EDIT_PROJECTS_DIR ?? path.join(app.getPath('documents'), 'Tool Edit', 'Du an');
function readSettings(): Record<string, unknown> {
  try {
    return JSON.parse(fs.readFileSync(settingsFile(), 'utf8'));
  } catch {
    return {};
  }
}
function writeSettings(patch: Record<string, unknown>) {
  const cur = { ...readSettings(), ...patch };
  fs.mkdirSync(path.dirname(settingsFile()), { recursive: true });
  fs.writeFileSync(settingsFile(), JSON.stringify(cur, null, 1));
  return cur;
}

// Tu ap dung de xuat cua AI (mac dinh BAT theo yeu cau nguoi dung: AI cu lam, khong can duyet). Tat: settings.json {"autoApplyAi": false}
function autoApplyEnabled(): boolean {
  return readSettings().autoApplyAi !== false;
}
function maybeAutoApply(pr: Proposal): { applied: boolean; seq?: number; errors?: unknown } {
  if (pr.status !== 'pending' || !autoApplyEnabled()) return { applied: false };
  const res = session.apply(pr.ops, pr.source);
  if (!res.ok) return { applied: false, errors: res.errors };
  pr.status = 'accepted';
  notifyProject(true);
  return { applied: true, seq: res.seq };
}
function readRecent(): string[] {
  try {
    return JSON.parse(fs.readFileSync(recentFile(), 'utf8')).files ?? [];
  } catch {
    return [];
  }
}
function writeRecent(files: string[]) {
  fs.mkdirSync(path.dirname(recentFile()), { recursive: true });
  fs.writeFileSync(recentFile(), JSON.stringify({ files: files.slice(0, 200) }, null, 1));
}
function touchRecent(file: string) {
  const f = path.resolve(file);
  writeRecent([f, ...readRecent().filter((x) => x.toLowerCase() !== f.toLowerCase())]);
}
function forgetRecent(file: string) {
  const f = path.resolve(file).toLowerCase();
  writeRecent(readRecent().filter((x) => x.toLowerCase() !== f));
}
/** Thong tin tom tat cua mot file du an (khong nap media). */
function projectInfo(file: string) {
  const st = fs.statSync(file);
  try {
    const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
    const p = raw.project;
    const end = (p.clips ?? []).reduce((m: number, c: { start: number; duration: number }) => Math.max(m, c.start + c.duration), 0);
    return { path: file, name: String(p.name ?? path.basename(file, '.tedit')), mtime: st.mtime.toISOString(), size: st.size, clips: (p.clips ?? []).length, media: (p.media ?? []).length, duration: Math.round(end * 100) / 100, width: p.width, height: p.height, fps: p.fps, ok: true };
  } catch {
    return { path: file, name: path.basename(file, '.tedit'), mtime: st.mtime.toISOString(), size: st.size, clips: 0, media: 0, duration: 0, ok: false };
  }
}
function uniquePath(dir: string, base: string): string {
  const bad = '<>:"/' + String.fromCharCode(92) + '|?*';
  const safe = Array.from(base).map((c) => (bad.includes(c) ? '_' : c)).join('').trim() || 'Du an';
  let f = path.join(dir, safe + '.tedit');
  for (let i = 2; fs.existsSync(f); i++) f = path.join(dir, `${safe} (${i}).tedit`);
  return f;
}

// ---- luu / mo (F-10) ----
function writeProject(file: string) {
  const p: Project = JSON.parse(JSON.stringify(session.project));
  for (const m of p.media) delete m.cache; // cache la du lieu dan xuat, dung lai khi mo
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify({ format: 'tool-edit-project', version: 1, project: p }, null, 1));
  fs.renameSync(tmp, file);
  if (path.resolve(file).toLowerCase() !== path.resolve(autosaveFile()).toLowerCase()) touchRecent(file); // phiên tự lưu không phải một dự án của người dùng
}

function readProject(file: string): Project {
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (raw.format !== 'tool-edit-project') throw new Error('khong phai file du an Tool Edit');
  const p = migrate(raw.project);
  if (path.resolve(file).toLowerCase() !== path.resolve(autosaveFile()).toLowerCase()) touchRecent(file);
  const errs = validate(p);
  if (errs.length) throw new Error('du an khong hop le: ' + errs.slice(0, 3).join('; '));
  return p;
}

// ---- cache media (F-06): video, tieng, anh ----
function startCaches(id: string): { cacheJob: string | null; audioJob: string | null } {
  const out: { cacheJob: string | null; audioJob: string | null } = { cacheJob: null, audioJob: null };
  const m = session.project.media.find((x) => x.id === id);
  if (!m) return out;
  const fps = session.project.fps;
  if (!fs.existsSync(m.path)) {
    session.patchMediaCache(id, { status: 'error', audio: 'none', error: `file khong con: ${m.path}` });
    notifyProject();
    return out;
  }
  if (m.kind === 'image') {
    session.patchMediaCache(id, { status: 'ready', width: m.width, height: m.height, audio: 'none' });
  } else if (m.kind === 'audio') {
    session.patchMediaCache(id, { status: 'ready', audio: 'pending' });
  } else {
    session.patchMediaCache(id, { status: 'pending', fps, audio: m.hasAudio ? 'pending' : 'none' });
    let kill = () => {};
    const job = jobs.create('media_cache', () => kill());
    out.cacheJob = job.id;
    buildCache(m.path, m, fps, cacheDir(), (p) => (job.progress = p), (k) => (kill = k))
      .then((res) => {
        cacheFiles.set(id, res.file);
        session.patchMediaCache(id, { status: 'ready', width: res.width, height: res.height, frames: res.frames, fps });
        jobs.done(job, { mediaId: id, width: res.width, height: res.height, frames: res.frames });
        notifyProject();
      })
      .catch((e) => {
        session.patchMediaCache(id, { status: 'error', error: String(e.message ?? e) });
        jobs.fail(job, String(e.message ?? e));
        notifyProject();
      });
  }
  if (m.kind !== 'image' && m.hasAudio) {
    let kill = () => {};
    const job = jobs.create('media_audio', () => kill());
    out.audioJob = job.id;
    buildAudioCache(m.path, cacheDir(), (k) => (kill = k))
      .then((file) => {
        audioFiles.set(id, file);
        session.patchMediaCache(id, { audio: 'ready' });
        jobs.done(job, { mediaId: id });
        notifyProject();
      })
      .catch((e) => {
        session.patchMediaCache(id, { audio: 'error' });
        jobs.fail(job, String(e.message ?? e));
        notifyProject();
      });
  }
  notifyProject();
  return out;
}

async function importMedia(file: string, source: string) {
  const abs = path.resolve(file);
  const existing = session.project.media.find((m) => m.path === abs);
  if (existing) return { mediaId: existing.id, existing: true, job_id: null, audio_job_id: null };
  const info = await probe(abs);
  const used = session.project.media.map((m) => Number(/^m(\d+)$/.exec(m.id)?.[1] ?? 0));
  const id = `m${Math.max(0, ...used) + 1}`;
  const r = session.apply([{ op: 'add_media', media: { id, ...info, path: abs } }], source);
  if (!r.ok) throw new Error(r.errors.join('; '));
  dirty = true;
  const jobsStarted = startCaches(id);
  return { mediaId: id, existing: false, kind: info.kind, job_id: jobsStarted.cacheJob ?? jobsStarted.audioJob, audio_job_id: jobsStarted.audioJob };
}

// ---- xuat video (F-11) ----
interface ActiveExport {
  ff: ExportSession;
  jobId: string;
  frames: number;
  written: number;
  outPath: string;
  onDone?: () => Promise<void>; // xuat lop phu: sau khi ffmpeg xong thi ghi cac file con lai va chot job
  onFail?: () => void;
}
let activeExport: ActiveExport | null = null;

ipcMain.handle('export-frame', async (_e, ab: ArrayBuffer, jobId: string) => {
  const ex = activeExport;
  if (!ex || ex.jobId !== jobId) return; // khung cua job da huy: bo qua
  try {
    await ex.ff.writeFrame(Buffer.from(ab));
  } catch (e) {
    if (activeExport === ex) throw e;
    return;
  }
  ex.written++;
  const j = jobs.get(ex.jobId);
  if (j) j.progress = Math.min(0.99, ex.written / ex.frames);
});
ipcMain.on('export-end', async (_e, r: { ok: boolean; error?: string; timing?: Record<string, number>; jobId: string }) => {
  const ex = activeExport;
  if (!ex || ex.jobId !== r.jobId) return;
  const job = jobs.get(ex.jobId)!;
  activeExport = null;
  if (!r.ok) {
    // Bao loi TRUOC (neu khong job treo mai o "dang chay"), xoa file do sau khi ffmpeg thoat (Windows khoa file; EPERM khong duoc nem ra ngoai)
    jobs.fail(job, r.error ?? 'loi khong ro');
    ex.onFail?.();
    ex.ff.proc.once('close', () => {
      try {
        fs.rmSync(ex.outPath, { force: true });
      } catch {
        /* file con bi khoa: de lai, khong anh huong */
      }
    });
    ex.ff.kill();
    return;
  }
  try {
    await ex.ff.finish();
    if (ex.onDone) return await ex.onDone();
    const size = fs.statSync(ex.outPath).size;
    jobs.done(job, { path: ex.outPath, frames: ex.frames, bytes: size, seconds: +((Date.now() - job.startedAt) / 1000).toFixed(2), timingMs: r.timing });
  } catch (e) {
    jobs.fail(job, String((e as Error).message ?? e));
  }
});

// ---- media moi xuat hien qua op (vd SFX tu de xuat duoc duyet) can duoc chuan bi cache ----
function ensureNewMediaCaches() {
  for (const m of session.project.media) if (!m.cache) startCaches(m.id);
}

function subsetWithDeps(ops: Op[], idxs: number[]): Op[] {
  const want = new Set(idxs.filter((i) => Number.isInteger(i) && i >= 0 && i < ops.length));
  // moi add_clip duoc chon keo theo add_media / add_track ma de xuat da tao cho no
  for (const i of [...want]) {
    const o = ops[i];
    if (o.op !== 'add_clip') continue;
    ops.forEach((q, j) => {
      if (q.op === 'add_media' && o.clip.src.type === 'media' && q.media.id === o.clip.src.mediaId) want.add(j);
      if (q.op === 'add_track' && q.track.id === o.clip.track) want.add(j);
    });
  }
  return ops.filter((_, i) => want.has(i));
}

const analysisDir = () => path.join(cacheDir(), 'analysis');

function startTranscribe(mediaId: string, o: WhisperOpts) {
  if (analysisJob && jobs.get(analysisJob)?.state === 'running') throw new Error('dang co mot phan tich khac chay (whisper va nhan nhip chi chay mot luc)');
  const m = session.project.media.find((x) => x.id === mediaId);
  if (!m) throw new Error(`khong co media ${mediaId}`);
  if (!m.hasAudio && m.kind !== 'audio') throw new Error(`media ${mediaId} khong co tieng`);
  fs.mkdirSync(analysisDir(), { recursive: true });
  const out = path.join(analysisDir(), `${m.id}-${Date.now()}.json`);
  let kill = () => {};
  const job = jobs.create('transcribe', () => kill());
  analysisJob = job.id;
  transcribeFile(m.path, out, o, (pr) => (job.progress = pr), (k) => (kill = k))
    .then((res) => {
      const tr = { lang: res.lang, model: res.model, duration: res.duration, words: res.words, source: 'whisper' as const };
      const r = session.apply([{ op: 'set_transcript', mediaId, transcript: tr }], 'system:whisper');
      if (!r.ok) throw new Error('loi thoai khong hop le: ' + r.errors.join('; '));
      notifyProject(true);
      jobs.done(job, { mediaId, words: res.words.length, lang: res.lang, device: res.device, seconds: res.seconds });
    })
    .catch((e) => jobs.fail(job, String(e.message ?? e)))
    .finally(() => fs.rmSync(out, { force: true }));
  return { job_id: job.id };
}

function startBeats(mediaId: string) {
  if (analysisJob && jobs.get(analysisJob)?.state === 'running') throw new Error('dang co mot phan tich khac chay');
  const m = session.project.media.find((x) => x.id === mediaId);
  if (!m) throw new Error(`khong co media ${mediaId}`);
  fs.mkdirSync(analysisDir(), { recursive: true });
  const out = path.join(analysisDir(), `${m.id}-beats-${Date.now()}.json`);
  let kill = () => {};
  const job = jobs.create('beats', () => kill());
  analysisJob = job.id;
  detectBeats(m.path, out, (k) => (kill = k))
    .then((res) => {
      const r = session.apply([{ op: 'set_beats', mediaId, beats: { bpm: res.bpm, times: res.times, model: 'numpy-flux' } }], 'system:beats');
      if (!r.ok) throw new Error(r.errors.join('; '));
      notifyProject(true);
      jobs.done(job, { mediaId, bpm: res.bpm, beats: res.times.length, beat0: res.beat0 });
    })
    .catch((e) => jobs.fail(job, String(e.message ?? e)))
    .finally(() => fs.rmSync(out, { force: true }));
  return { job_id: job.id };
}

// ---- tach nen video (F-41) ----
function startMatte(mediaId: string, o: { cpu?: boolean } = {}) {
  if (analysisJob && jobs.get(analysisJob)?.state === 'running') throw new Error('dang co mot phan tich khac chay (whisper, nhan nhip, tach nen chi chay mot luc)');
  const m = session.project.media.find((x) => x.id === mediaId);
  if (!m) throw new Error(`khong co media ${mediaId}`);
  if (m.kind !== 'video') throw new Error(`media ${mediaId} khong phai video`);
  if (m.role === 'matte') throw new Error(`media ${mediaId} la matte, khong tach nen tiep duoc`);
  const dir = path.join(cacheDir(), 'matte');
  fs.mkdirSync(dir, { recursive: true });
  const key = nodeCrypto.createHash('sha1').update(`${m.path}|${fs.statSync(m.path).size}|rvm-mobilenetv3`).digest('hex').slice(0, 12);
  const out = path.join(dir, `${m.id}-${key}.mkv`);
  let kill = () => {};
  const job = jobs.create('matte', () => kill());
  analysisJob = job.id;
  const finish = async (info: { frames?: number; device?: string; seconds?: number; model?: string }) => {
    const abs = path.resolve(out);
    const probed = await probe(abs);
    let mid = session.project.media.find((x) => x.path === abs)?.id;
    if (!mid) {
      const nums = session.project.media.map((x) => Number(/^m(\d+)$/.exec(x.id)?.[1] ?? 0));
      mid = `m${Math.max(0, ...nums) + 1}`;
      const r1 = session.apply([{ op: 'add_media', media: { id: mid, ...probed, path: abs, role: 'matte' } }], 'system:matte');
      if (!r1.ok) throw new Error(r1.errors.join('; '));
    }
    const r2 = session.apply([{ op: 'set_media_matte', mediaId, matteId: mid }], 'system:matte');
    if (!r2.ok) throw new Error(r2.errors.join('; '));
    notifyProject(true);
    jobs.done(job, { mediaId, matteId: mid, ...info });
  };
  if (fs.existsSync(out)) {
    // da tach truoc do (cung file, cung mo hinh): dung lai
    finish({ model: 'rvm (dung lai)' }).catch((e) => jobs.fail(job, String(e.message ?? e)));
  } else {
    matteVideo(m.path, out + '.part.mkv', { cpu: o.cpu }, (pr) => (job.progress = pr), (k) => (kill = k))
      .then(async (res) => {
        fs.renameSync(out + '.part.mkv', out);
        await finish(res);
      })
      .catch((e) => {
        fs.rmSync(out + '.part.mkv', { force: true });
        jobs.fail(job, String(e.message ?? e));
      });
  }
  return { job_id: job.id };
}

// ---- qc_check (F-36) ----
const pendingQc = new Map<number, { resolve: (v: any) => void; timer: NodeJS.Timeout }>();
ipcMain.on('qc-result', (_e, res) => {
  const p = pendingQc.get(res.id);
  if (!p) return;
  clearTimeout(p.timer);
  pendingQc.delete(res.id);
  p.resolve(res);
});
async function requestQc(project: Project): Promise<any> {
  await Promise.race([readyPromise, new Promise((_, rej) => setTimeout(() => rej(new Error('renderer chua san sang')), 30000))]);
  return new Promise((resolve, reject) => {
    if (!win) return reject(new Error('chua co cua so render'));
    const id = nextId++;
    const timer = setTimeout(() => {
      pendingQc.delete(id);
      reject(new Error('qc qua 30s'));
    }, 30000);
    pendingQc.set(id, { resolve, timer });
    win.webContents.send('qc-request', { id, project });
  });
}

async function qcReport() {
  const p = session.project;
  const total = timelineEnd(p);
  const issues: { level: 'error' | 'warn'; code: string; message: string }[] = [];
  for (const w of projectWarnings(p, fontIndex && fontIndex.faces.length ? fontIndex : null)) issues.push({ level: w.level, code: w.code, message: w.message });
  let loud: null | { integrated_lufs: number; true_peak_dbtp: number; lra: number; verdict: string } = null;
  try {
    const m = await measureLoudness(p, total);
    if (m) {
      const verdict = m.input_i > -12 ? 'qua to' : m.input_i < -16 ? 'qua nho' : 'dat';
      loud = { integrated_lufs: m.input_i, true_peak_dbtp: m.input_tp, lra: m.input_lra, verdict };
      if (verdict !== 'dat') issues.push({ level: 'warn', code: 'loudness', message: `am luong tong ${m.input_i.toFixed(1)} LUFS (${verdict}); muc tieu mang xa hoi khoang -14 LUFS (xuat voi loudness_lufs=-14 de chuan hoa)` });
      if (m.input_tp > -1) issues.push({ level: 'warn', code: 'true-peak', message: `dinh am thanh ${m.input_tp.toFixed(1)} dBTP (> -1): co the meo khi nen` });
    }
  } catch (e) {
    issues.push({ level: 'warn', code: 'loudness-failed', message: 'khong do duoc loudness: ' + String((e as Error).message).slice(0, 160) });
  }
  // phu de: bao nhieu giay tieng noi duoc phu de bao phu
  const speech = speechRanges(p);
  const caps = p.clips.filter((c) => c.tag?.startsWith(CAPTION_TAG));
  let speechSec = 0,
    covered = 0;
  for (const r of speech) {
    speechSec += r.e - r.s;
    for (const c of caps) covered += Math.max(0, Math.min(r.e, c.start + c.duration) - Math.max(r.s, c.start));
  }
  covered = Math.min(covered, speechSec);
  const coverage = speechSec > 0 ? covered / speechSec : null;
  if (speechSec > 0 && caps.length === 0) issues.push({ level: 'warn', code: 'no-captions', message: `co ${speechSec.toFixed(1)}s loi thoai nhung chua co phu de` });
  else if (coverage !== null && coverage < 0.9) issues.push({ level: 'warn', code: 'captions-gap', message: `phu de chi phu ${(coverage * 100).toFixed(0)}% loi thoai (tao lai phu de sau khi sua)` });
  // chu tran khung
  let overflow: unknown[] = [];
  try {
    overflow = (await requestQc(p)).overflow ?? [];
  } catch {
    /* khong kiem duoc cung khong chan */
  }
  for (const o of overflow as { clip: string; aspect: string; px: number }[]) issues.push({ level: 'error', code: 'text-overflow', message: `clip ${o.clip}: chu tran khung ${o.aspect} khoang ${Math.round(o.px)}px (thu nho, ngat dong, hoac doi neo)` });
  return { duration: total, loudness: loud, speech: { seconds: +speechSec.toFixed(2), captioned_seconds: +covered.toFixed(2), coverage: coverage === null ? null : +coverage.toFixed(3) }, text_overflow: overflow, issues, ok: !issues.some((i) => i.level === 'error') };
}

async function startExport(preset: string, outArg?: string, loudness?: number | null) {
  if (activeExport || exportBusy) throw new Error('dang co mot job xuat khac');
  exportBusy = true;
  try {
    return await startExportInner(preset, outArg, loudness);
  } finally {
    exportBusy = false;
  }
}

async function startExportInner(preset: string, outArg?: string, loudness?: number | null) {
  const p = session.project;
  const usedBase = p.media.filter((m) => p.clips.some((c) => c.src.type === 'media' && c.src.mediaId === m.id));
  const used = [...usedBase, ...p.media.filter((m) => m.role === 'matte' && usedBase.some((u) => u.matte === m.id) && p.clips.some((c) => c.matte && usedBase.some((u) => u.id === (c.src as { mediaId?: string }).mediaId && u.matte === m.id)))]; // matte cua clip dang dung cung phai san sang
  const notReady = used.filter((m) => m.kind !== 'audio' && m.cache?.status !== 'ready');
  if (notReady.length) throw new Error(`media chua san sang: ${notReady.map((m) => `${m.id} (${m.cache?.status ?? 'chua co cache'})`).join(', ')}`);
  const end = timelineEnd(p);
  const frames = Math.ceil(end * p.fps - 1e-9);
  if (frames <= 0) throw new Error('timeline rong');
  const [w, h] = preset === '16:9' ? [1920, 1080] : preset === '9:16' ? [1080, 1920] : [p.width, p.height];
  const outPath = path.resolve(outArg ?? path.join(exportDir(), `${p.name.replace(/[^\w.-]+/g, '_')}-${preset.replace(':', 'x')}-${Date.now()}.mp4`));
  if (fs.existsSync(outPath)) throw new Error(`file da ton tai (khong ghi de): ${outPath}`);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  const snapshot = JSON.parse(JSON.stringify(p));
  let ln: LoudnessTarget | undefined;
  if (typeof loudness === 'number') {
    const m = await measureLoudness(snapshot, frames / p.fps);
    if (m) ln = { I: loudness, measured: m };
  }
  const ff = startFfmpeg(snapshot, w, h, outPath, frames / p.fps, ln);
  const job = jobs.create('render', () => {
    ff.proc.once('close', () => fs.rmSync(outPath, { force: true })); // Windows: file con bi khoa cho den khi ffmpeg thoat hoan toan
    ff.kill();
    win?.webContents.send('export-cancel', job.id);
    activeExport = null;
  });
  activeExport = { ff, jobId: job.id, frames, written: 0, outPath };
  // Dong ho canh: neu khong co khung moi trong 60 giay (vd giai ma phan cung treo) thi bao loi thay vi treo mai.
  let lastWritten = -1;
  let lastChange = Date.now();
  const dog = setInterval(() => {
    const ex = activeExport;
    if (!ex || ex.jobId !== job.id) return clearInterval(dog);
    if (ex.written !== lastWritten) {
      lastWritten = ex.written;
      lastChange = Date.now();
    } else if (Date.now() - lastChange > 60_000) {
      clearInterval(dog);
      jobs.fail(job, `xuat khong tien trien trong 60 giay (dung o khung ${ex.written}/${ex.frames}); nghi bo giai ma treo`);
      ff.proc.once('close', () => fs.rmSync(outPath, { force: true }));
      ff.kill();
      win?.webContents.send('export-cancel', job.id);
      activeExport = null;
    }
  }, 5000);
  win!.webContents.send('export-start', { project: snapshot, width: w, height: h, frames, jobId: job.id });
  return { job_id: job.id, frames, width: w, height: h, out: outPath, loudness: ln ? { target_lufs: ln.I, measured_lufs: ln.measured.input_i } : null };
}


// ---- xuat timeline sang phan mem khac (F-97) ----
const VERIFIED: Record<ExportTarget, string> = {
  premiere: 'chưa kiểm trên Premiere Pro (chỉ kiểm cấu trúc XML)',
  resolve: 'chưa kiểm trên DaVinci Resolve (chỉ kiểm cấu trúc XML)',
  capcut: 'chưa kiểm trên CapCut (đã kiểm cấu trúc JSON theo khuôn; chưa mở thử bản nháp này trong CapCut)',
  ae: 'chưa kiểm trên After Effects (đã kiểm cú pháp script; chưa chạy trong AE)',
  edl: 'chưa kiểm trên phần mềm đích (chỉ kiểm định dạng)',
};
let exportVerified: Partial<Record<ExportTarget, string>> = {};
const safeName = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').replace(/[^\w.-]+/g, '_').slice(0, 60) || 'du-an';

function writeTimelineFiles(target: ExportTarget, plan: ReturnType<typeof buildPlan>, base: string, overlay: OverlayFile | undefined, extra: { install?: boolean }): { files: string[]; install?: string; capcut?: { template: string } } {
  const name = safeName(plan.name);
  const files: string[] = [];
  const put = (f: string, text: string) => {
    fs.writeFileSync(path.join(base, f), text, 'utf8');
    files.push(path.join(base, f));
  };
  const res: { files: string[]; install?: string; capcut?: { template: string } } = { files };
  if (target === 'premiere') put(`${name}.xml`, writeXmeml(plan, overlay));
  else if (target === 'resolve') {
    put(`${name}.fcpxml`, writeFcpxml(plan, overlay));
    put(`${name}-xmeml.xml`, writeXmeml(plan, overlay));
  } else if (target === 'ae') put(`${name}.jsx`, writeAeJsx(plan, overlay));
  else if (target === 'edl') for (const e of writeEdl(plan)) put(`${name}-${e.file}`, e.text);
  if (overlay) files.push(overlay.path);
  void extra;
  return res;
}

async function startTimelineExport(target: ExportTarget, opt: { aspect?: string; out?: string; install?: boolean; overlay?: boolean }) {
  if (activeExport || exportBusy) throw new Error('dang co mot job xuat khac');
  exportBusy = true;
  try {
    const p = session.project;
    const end = timelineEnd(p);
    if (end <= 0) throw new Error('timeline rong');
    if (!TARGETS.some((t) => t.id === target)) throw new Error('target phai la premiere|resolve|capcut|ae|edl');
    const aspect = opt.aspect === '16:9' || opt.aspect === '9:16' ? opt.aspect : 'project';
    const plan = buildPlan(p, target, aspect);
    const name = safeName(p.name);
    const base = path.resolve(opt.out ?? path.join(exportDir(), `${name}-${target}-${Date.now()}`));
    if (fs.existsSync(base) && fs.readdirSync(base).length) throw new Error(`thu muc da co file (khong ghi de): ${base}`);
    let template: ReturnType<typeof findCapcutTemplate> = null;
    if (target === 'capcut') {
      template = findCapcutTemplate();
      if (!template) throw new Error(`chua tim thay ban nhap CapCut lam khuon trong ${capcutDraftsDir()} (can mot ban nhap doc duoc co ca video va am thanh). Hay tao mot ban nhap CapCut nho co 1 clip video + 1 am thanh roi thu lai.`);
    }
    const missing = [...plan.video, ...plan.audio].flatMap((t) => t.items).filter((i) => !fs.existsSync(i.path));
    if (missing.length) throw new Error(`thieu file nguon: ${[...new Set(missing.map((m) => m.path))].slice(0, 3).join('; ')}`);
    const wantOverlay = plan.overlay.needed && opt.overlay !== false;
    if (wantOverlay) {
      const need = new Set(p.clips.filter((c) => plan.overlay.clipIds.includes(c.id) && c.src.type === 'media').map((c) => (c.src as { mediaId: string }).mediaId));
      const notReady = p.media.filter((m) => need.has(m.id) && m.kind !== 'audio' && m.cache?.status !== 'ready');
      if (notReady.length) throw new Error(`media chua san sang de ve lop phu: ${notReady.map((m) => m.id).join(', ')}`);
    }
    fs.mkdirSync(base, { recursive: true });
    const warnings = [...plan.warnings];
    if (plan.overlay.needed && !wantOverlay) warnings.push('Đã bỏ qua lớp phủ theo yêu cầu: chữ/hình/hiệu ứng KHÔNG có trong bản xuất.');
    const info = TARGETS.find((t) => t.id === target)!;
    const finish = async (overlay?: OverlayFile) => {
      const r = writeTimelineFiles(target, plan, base, overlay, {});
      let draft: { dir: string; template: string } | undefined;
      let installed: string | undefined;
      if (target === 'capcut') {
        const d = await writeCapcutDraft(plan, overlay, base, `ToolEdit-${name}-${Date.now() % 1e6}`, template!);
        draft = { dir: d.dir, template: d.template };
        r.files.push(d.dir);
        if (opt.install) installed = installCapcutDraft(d.dir);
      }
      const verified = exportVerified[target] ?? VERIFIED[target];
      const guide = [`Tool Edit → ${info.label}`, `Dự án: ${p.name}  |  ${plan.width}x${plan.height} @ ${plan.fps} fps  |  ${plan.duration.toFixed(2)} s`, '', `Cách mở: ${info.note}`, `Mức kiểm: ${verified}`, '', 'Cảnh báo:', ...(warnings.length ? warnings.map((w) => '- ' + w) : ['- (không)'])].join('\n');
      fs.writeFileSync(path.join(base, 'HUONG-DAN.txt'), guide, 'utf8');
      r.files.push(path.join(base, 'HUONG-DAN.txt'));
      return { target, out_dir: base, files: r.files, warnings, verified, overlay: overlay ? { path: overlay.path, bytes: fs.statSync(overlay.path).size, frames: overlayFrameCount(plan) } : null, capcut: draft ? { ...draft, installed } : undefined };
    };
    const job = jobs.create('export_timeline', () => {
      if (activeExport?.jobId === job.id) {
        const ex = activeExport;
        ex.ff.proc.once('close', () => fs.rmSync(ex.outPath, { force: true }));
        ex.ff.kill();
        win?.webContents.send('export-cancel', job.id);
        activeExport = null;
      }
    });
    if (!wantOverlay) {
      try {
        jobs.done(job, await finish(undefined));
      } catch (e) {
        jobs.fail(job, String((e as Error).message ?? e));
      }
      return { job_id: job.id, out_dir: base, overlay_frames: 0, warnings };
    }
    const derived: Project = JSON.parse(JSON.stringify(p));
    const only = new Set(plan.overlay.clipIds);
    for (const c of derived.clips) if (!only.has(c.id)) c.disabled = true;
    const frames = Math.ceil(end * p.fps - 1e-9);
    const overlayPath = path.join(base, 'lop-phu.mov');
    const ff = startOverlayFfmpeg(plan.width, plan.height, p.fps, overlayPath);
    activeExport = {
      ff, jobId: job.id, frames, written: 0, outPath: overlayPath,
      onDone: async () => {
        activeExport = null;
        try {
          jobs.done(job, await finish({ path: overlayPath, width: plan.width, height: plan.height, duration: frames / p.fps }));
        } catch (e) {
          jobs.fail(job, String((e as Error).message ?? e));
        }
      },
    };
    win!.webContents.send('export-start', { project: derived, width: plan.width, height: plan.height, frames, jobId: job.id, overlay: { ranges: plan.overlay.ranges } });
    return { job_id: job.id, out_dir: base, overlay_frames: overlayFrameCount(plan), warnings };
  } finally {
    exportBusy = false;
  }
}

// ---- Router dung chung cho HTTP va IPC ----
interface Req {
  method: string;
  path: string;
  query: URLSearchParams;
  body: any;
  trusted: boolean; // true = tu giao dien qua IPC (hoac DEV_API)
}
interface Res {
  status: number;
  json?: unknown;
  buf?: Buffer;
  headers?: Record<string, string>;
}
const ok = (json: unknown, status = 200): Res => ({ status, json });
const err = (status: number, error: string): Res => ({ status, json: { ok: false, error } });

const PRIVILEGED = [/^POST \/ops$/, /^POST \/undo$/, /^POST \/redo$/, /^POST \/project\/(save|load|new|rename)$/, /^POST \/snapshots\/restore$/, /^POST \/settings$/, /^POST \/projects\/(create|duplicate|rename|forget|trash)$/, /^POST \/library\/remove_dir$/, /^POST \/proposals\/p\d+\/(accept|reject)$/];

async function route(r: Req): Promise<Res> {
  const key = `${r.method} ${r.path}`;
  if (!r.trusted && PRIVILEGED.some((re) => re.test(key))) {
    return err(403, 'duong nay chi danh cho giao dien Tool Edit (nguoi duyet). AI dung propose_ops va cho nguoi dung duyet.');
  }
  let mm: RegExpExecArray | null;
  const b = r.body ?? {};

  if (key === 'GET /status') {
    return ok({ ok: true, rendererReady, gpu: gpuInfo, clips: session.project.clips.length, media: session.project.media.length, seq: session.project.history.length, jobsRunning: jobs.list().filter((j) => j.state === 'running').length, proposalsPending: proposals.filter((x) => x.status === 'pending').length, projectPath, dirty });
  }
  if (key === 'GET /project') return ok(session.project);
  // ---- loi thoai / nhip / khoang lang / kho SFX / qc (giai doan 3) ----
  if (key === 'POST /transcribe') {
    try {
      return ok({ ok: true, ...startTranscribe(String(b.media_id), { lang: String(b.lang ?? 'vi'), model: String(b.model ?? 'large-v3-turbo'), prompt: b.prompt ? String(b.prompt) : undefined, cpu: !!b.cpu }) });
    } catch (e) {
      return err(409, String((e as Error).message ?? e));
    }
  }
  if (key === 'GET /transcript') {
    const m = session.project.media.find((x) => x.id === r.query.get('media_id'));
    if (!m) return err(404, 'khong co media nay');
    if (!m.transcript) return err(404, 'media chua co loi thoai (chay transcribe)');
    const from = Number(r.query.get('from') ?? 0),
      to = Number(r.query.get('to') ?? Infinity);
    const words = m.transcript.words.map((w, i) => ({ i, ...w })).filter((w) => w.e >= from && w.s <= to);
    return ok({ ok: true, lang: m.transcript.lang, model: m.transcript.model, duration: m.transcript.duration, source: m.transcript.source, total_words: m.transcript.words.length, text: words.map((w) => w.w).join(' '), words });
  }
  if (key === 'POST /matte') {
    try {
      return ok({ ok: true, ...startMatte(String(b.media_id), { cpu: !!b.cpu }) });
    } catch (e) {
      return err(409, String((e as Error).message ?? e));
    }
  }
  if (key === 'POST /beats') {
    try {
      return ok({ ok: true, ...startBeats(String(b.media_id)) });
    } catch (e) {
      return err(409, String((e as Error).message ?? e));
    }
  }
  if (key === 'GET /silences') {
    const c = session.project.clips.find((x) => x.id === r.query.get('clip_id'));
    if (!c || c.src.type !== 'media') return err(404, 'khong co clip media nay');
    const m = session.project.media.find((x) => x.id === (c.src as { mediaId: string }).mediaId)!;
    const min = Number(r.query.get('min') ?? 0.5),
      keep = Number(r.query.get('keep') ?? 0.12),
      noise = Number(r.query.get('noise') ?? -35);
    const mode = r.query.get('source') ?? 'auto';
    let ranges: Range[];
    let usedSource = 'words';
    if (m.transcript && mode !== 'audio') {
      ranges = silenceGaps(m.transcript.words, { minGap: min, keep, from: c.in, to: c.in + c.duration });
    } else {
      const f = audioFiles.get(m.id);
      if (!f) return err(409, 'chua co loi thoai va am thanh chua giai ma xong; chay transcribe hoac doi giai ma tieng');
      usedSource = 'audio';
      ranges = (await detectSilences(f, noise, min)).map((x) => ({ s: x.s + keep, e: x.e - keep })).filter((x) => x.e - x.s > 0.02);
    }
    ranges = ranges.map((x) => ({ s: Math.max(x.s, c.in), e: Math.min(x.e, c.in + c.duration) })).filter((x) => x.e - x.s > 0.02);
    return ok({ ok: true, source: usedSource, count: ranges.length, total_seconds: +ranges.reduce((a, x) => a + (x.e - x.s), 0).toFixed(3), ranges });
  }
  if (key === 'GET /library') {
    if (!library) return err(503, 'kho chua khoi tao');
    const items = library.list({ kind: r.query.get('kind') ?? undefined, tag: r.query.get('tag') ?? undefined, q: r.query.get('q') ?? undefined });
    return ok({ scanning: library.scanning, dirs: library.dirs, total: items.length, all: library.items.length, items });
  }
  if (key === 'POST /library/scan') {
    if (!library) return err(503, 'kho chua khoi tao');
    if (b.dir) {
      if (!fs.existsSync(String(b.dir))) return err(404, `khong co thu muc ${b.dir}`);
      library.addDir(String(b.dir));
    }
    await library.scanAll();
    return ok({ ok: true, total: library.items.length, dirs: library.dirs });
  }
  if (key === 'POST /library/tags') {
    if (!library?.setTags(String(b.id), Array.isArray(b.tags) ? b.tags.map(String) : [])) return err(404, 'khong co muc nay trong kho');
    return ok({ ok: true });
  }
  if (key === 'POST /suggest_sfx') {
    if (!library) return err(503, 'kho chua khoi tao');
    const rules: SfxRule[] = Array.isArray(b.rules) && b.rules.length ? b.rules : [{ event: 'cut', tag: 'whoosh', volume: 0.5 }, { event: 'text', tag: 'pop', volume: 0.5 }];
    const { plan, missing } = planSfx(session.project, library.items, rules);
    if (!plan.length) return ok({ ok: false, error: 'khong co su kien nao hop (can cat canh giua cac clip lien nhau, clip chu, hoac marker) hoac kho thieu tag', missing }, 409);
    const ops = sfxOps(session.project, plan);
    const errors = session.dryRun(ops);
    const pr: Proposal = { id: `p${++proposalSeq}`, source: b.source ?? 'app:sfx', note: b.note ?? `Goi y ${plan.length} SFX theo su kien (${rules.map((x) => `${x.event}->${x.tag}`).join(', ')})`, ops, status: errors.length ? 'invalid' : 'pending', errors, createdAt: new Date().toISOString() };
    proposals.push(pr);
    const auto = maybeAutoApply(pr);
    return ok({ ok: !errors.length, proposal_id: pr.id, applied: auto.applied, errors, missing, plan: plan.map((x) => ({ t: x.t, sfx: x.item.name, tags: x.item.tags, volume: x.volume, why: x.label })) }, errors.length ? 400 : 200);
  }
  if (key === 'GET /qc') return ok(await qcReport());

  if (key === 'GET /fonts') {
    if (!fontIndex) return err(503, 'chua khoi tao bo quet font');
    const vn = r.query.get('vietnamese') === '1';
    const q = (r.query.get('q') ?? '').toLowerCase();
    const list = fontIndex.families().filter((f) => (!vn || f.vietnamese) && (!q || f.family.toLowerCase().includes(q)));
    return ok({ scanning: fontIndex.scanning, progress: +fontIndex.progress.toFixed(2), total: list.length, fonts: list });
  }
  if (key === 'POST /fonts/rescan') {
    if (fontIndex && !fontIndex.scanning) void fontIndex.scan();
    return ok({ ok: true });
  }
  if (key === 'GET /warnings') return ok(projectWarnings(session.project, fontIndex && fontIndex.faces.length ? fontIndex : null));
  if (key === 'GET /presets') return ok(PRESETS.map((p) => ({ id: p.id, name: p.name, description: p.description, source: p.source, default_content: p.defaultContent, default_duration: p.defaultDuration })));


  if (key === 'POST /ops') {
    const res = session.apply(b.ops, b.source ?? 'human', typeof b.coalesce === 'string' && b.coalesce.length <= 80 ? b.coalesce : undefined);
    if (res.ok) notifyProject(true);
    return ok(res, res.ok ? 200 : 400);
  }
  if (key === 'POST /undo' || key === 'POST /redo') {
    const done = key === 'POST /undo' ? session.undo() : session.redo();
    if (done) notifyProject(true);
    return ok({ ok: done });
  }

  // du an: luu / mo / moi / doi ten / tu luu
  if (key === 'POST /project/save') {
    const file = b.path ?? projectPath;
    if (!file) return err(400, 'chua co duong dan; chon Luu thanh...');
    writeProject(file);
    projectPath = path.resolve(file);
    dirty = false;
    sendState();
    return ok({ ok: true, path: projectPath });
  }
  if (key === 'POST /project/load') {
    const file = b.path === 'autosave' ? autosaveFile() : b.path;
    if (!file || !fs.existsSync(file)) return err(404, `khong thay file: ${file}`);
    const p = readProject(file);
    session.load(p);
    cacheFiles.clear();
    audioFiles.clear();
    projectPath = b.path === 'autosave' ? null : path.resolve(file);
    dirty = b.path === 'autosave';
    proposals.length = 0;
    for (const m of session.project.media) startCaches(m.id);
    notifyProject();
    return ok({ ok: true, path: projectPath, clips: p.clips.length, media: p.media.length });
  }
  if (key === 'POST /project/new') {
    session.load(newProject(b.name ?? 'Chưa đặt tên'));
    cacheFiles.clear();
    audioFiles.clear();
    projectPath = null;
    dirty = false;
    proposals.length = 0;
    notifyProject();
    return ok({ ok: true });
  }
  if (key === 'POST /project/rename') {
    session.project.name = String(b.name ?? 'Chưa đặt tên');
    notifyProject(true);
    return ok({ ok: true });
  }
  if (key === 'GET /project/autosave') {
    const f = autosaveFile();
    if (!fs.existsSync(f)) return ok({ exists: false });
    try {
      const p = readProject(f);
      return ok({ exists: true, mtime: fs.statSync(f).mtime.toISOString(), name: p.name, clips: p.clips.length, media: p.media.length });
    } catch {
      return ok({ exists: false });
    }
  }

  // ---- cai dat va trang chu (quan ly du an) ----
  if (key === 'GET /settings') return ok({ ...readSettings(), projectsDir: projectsDir() });
  if (key === 'POST /settings') {
    const patch: Record<string, unknown> = {};
    for (const k of ['keymap', 'layout', 'autoApplyAi']) if (b[k] !== undefined) patch[k] = b[k];
    return ok({ ok: true, settings: writeSettings(patch) });
  }
  if (key === 'GET /projects') {
    const files = readRecent().filter((f) => fs.existsSync(f)).map((f) => path.resolve(f));
    try {
      for (const e of fs.readdirSync(projectsDir())) if (/\.tedit$/i.test(e)) {
        const f = path.resolve(projectsDir(), e);
        if (!files.some((x) => x.toLowerCase() === f.toLowerCase())) files.push(f);
      }
    } catch {
      /* chua co thu muc du an */
    }
    const uniq = files.filter((f, i) => files.findIndex((x) => x.toLowerCase() === f.toLowerCase()) === i);
    const list = uniq.map((f) => ({ ...projectInfo(f), current: !!projectPath && path.resolve(f).toLowerCase() === path.resolve(projectPath).toLowerCase() }));
    list.sort((a, b2) => b2.mtime.localeCompare(a.mtime));
    return ok({ ok: true, dir: projectsDir(), projects: list, current: projectPath, dirty });
  }
  if (key === 'POST /projects/create') {
    const name = String(b.name ?? '').trim() || 'Du an moi';
    const p = newProject(name);
    if (b.aspect === '16:9') [p.width, p.height] = [1920, 1080];
    if (typeof b.fps === 'number' && b.fps >= 10 && b.fps <= 120) p.fps = b.fps;
    fs.mkdirSync(projectsDir(), { recursive: true });
    const file = uniquePath(projectsDir(), name);
    session.load(p);
    cacheFiles.clear();
    audioFiles.clear();
    proposals.length = 0;
    projectPath = null;
    writeProject(file);
    projectPath = file;
    dirty = false;
    notifyProject();
    return ok({ ok: true, path: file });
  }
  if (key === 'POST /projects/duplicate') {
    const src = String(b.path ?? '');
    if (!fs.existsSync(src)) return err(404, 'khong thay file du an');
    const raw = JSON.parse(fs.readFileSync(src, 'utf8'));
    raw.project.name = `${raw.project.name} (ban sao)`;
    const dst = uniquePath(path.dirname(src), raw.project.name);
    fs.writeFileSync(dst, JSON.stringify(raw, null, 1));
    touchRecent(dst);
    return ok({ ok: true, path: dst });
  }
  if (key === 'POST /projects/rename') {
    const src = String(b.path ?? '');
    const name = String(b.name ?? '').trim();
    if (!fs.existsSync(src)) return err(404, 'khong thay file du an');
    if (!name) return err(400, 'ten khong duoc de trong');
    const isCurrent = !!projectPath && path.resolve(src).toLowerCase() === projectPath.toLowerCase();
    if (isCurrent) {
      session.project.name = name;
      writeProject(src);
    } else {
      const raw = JSON.parse(fs.readFileSync(src, 'utf8'));
      raw.project.name = name;
      fs.writeFileSync(src, JSON.stringify(raw, null, 1));
    }
    let dst = src;
    const want = uniquePath(path.dirname(src), name);
    if (path.basename(src, '.tedit').toLowerCase() !== path.basename(want, '.tedit').toLowerCase() && !fs.existsSync(path.join(path.dirname(src), name + '.tedit'))) {
      dst = want;
      fs.renameSync(src, dst);
      forgetRecent(src);
      touchRecent(dst);
      if (isCurrent) projectPath = dst;
    }
    if (isCurrent) notifyProject();
    return ok({ ok: true, path: dst });
  }
  if (key === 'POST /projects/forget') {
    forgetRecent(String(b.path ?? ''));
    return ok({ ok: true });
  }
  if (key === 'POST /projects/trash') {
    const f = String(b.path ?? '');
    if (!fs.existsSync(f)) return err(404, 'khong thay file du an');
    if (!/\.tedit$/i.test(f)) return err(400, 'chi xoa file .tedit');
    await shell.trashItem(path.resolve(f)); // thung rac: khoi phuc duoc
    forgetRecent(f);
    if (projectPath && path.resolve(f).toLowerCase() === path.resolve(projectPath).toLowerCase()) projectPath = null;
    return ok({ ok: true });
  }
  if (key === 'POST /library/remove_dir') {
    const d = path.resolve(String(b.dir ?? ''));
    if (!library) return err(409, 'kho chua san sang');
    library.removeDir(d);
    void library.scanAll();
    return ok({ ok: true, dirs: library.dirs });
  }

  // snapshot co ten
  if (key === 'POST /snapshots') {
    session.snapshot(String(b.name || `snapshot-${session.listSnapshots().length + 1}`));
    return ok({ ok: true, snapshots: session.listSnapshots() });
  }
  if (key === 'GET /snapshots') return ok(session.listSnapshots());
  if (key === 'POST /snapshots/restore') {
    const done = session.restoreSnapshot(String(b.name));
    if (done) notifyProject(true);
    return done ? ok({ ok: true }) : err(404, 'khong co snapshot nay');
  }

  // de xuat cua AI: khong ap dung cho den khi nguoi duyet
  if (key === 'POST /propose') {
    const errors = session.dryRun(b.ops ?? []);
    const pr: Proposal = { id: `p${++proposalSeq}`, source: b.source ?? 'ai:unknown', note: b.note ?? '', ops: b.ops ?? [], status: errors.length ? 'invalid' : 'pending', errors, createdAt: new Date().toISOString() };
    proposals.push(pr);
    const auto = maybeAutoApply(pr);
    return ok({ ok: !errors.length, proposal_id: pr.id, status: pr.status, errors, applied: auto.applied, seq: auto.seq, applyErrors: auto.errors }, errors.length ? 400 : 200);
  }
  if (key === 'GET /proposals') return ok(proposals);
  if ((mm = /^GET \/proposals\/(p\d+)\/draft$/.exec(key))) {
    const pr = proposals.find((x) => x.id === mm![1]);
    if (!pr) return err(404, 'khong co de xuat nay');
    const d = session.draftOf(pr.ops);
    return d.project ? ok({ ok: true, project: d.project }) : ok({ ok: false, errors: d.errors }, 409);
  }
  if ((mm = /^POST \/proposals\/(p\d+)\/(accept|reject)$/.exec(key))) {
    const pr = proposals.find((x) => x.id === mm![1]);
    if (!pr) return err(404, 'khong co de xuat nay');
    if (pr.status !== 'pending') return err(409, `de xuat da ${pr.status}`);
    if (mm[2] === 'reject') {
      pr.status = 'rejected';
      return ok({ ok: true, status: pr.status });
    }
    const chosen = Array.isArray(b.include) ? subsetWithDeps(pr.ops, b.include as number[]) : pr.ops; // duyet tung muc: chi ap dung cac muc duoc chon (kem phu thuoc)
    if (!chosen.length) return err(400, 'khong chon muc nao de ap dung');
    const res = session.apply(chosen, pr.source); // kiem tra lai tren trang thai hien tai
    if (!res.ok) return ok({ ok: false, errors: res.errors, hint: 'du an da doi tu luc de xuat; de xuat con pending' }, 409);
    pr.status = 'accepted';
    notifyProject(true);
    return ok({ ok: true, status: pr.status, seq: res.seq });
  }

  if (key === 'POST /media_import') {
    try {
      if (b.path && fs.existsSync(b.path) && fs.statSync(b.path).isDirectory()) {
        // nhap ca thu muc (de quy): moi file video/am thanh/anh la mot media
        const EXT = /\.(mp4|mov|mkv|webm|avi|m4v|mp3|wav|m4a|aac|flac|ogg|png|jpg|jpeg|webp)$/i;
        const walk = (d: string): string[] => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : EXT.test(e.name) ? [path.join(d, e.name)] : []));
        const files = walk(b.path).sort();
        if (files.length > 300) return err(400, `thu muc co ${files.length} file media (toi da 300 moi lan); chon thu muc nho hon`);
        const imported: unknown[] = [];
        const failed: string[] = [];
        for (const f of files) {
          try {
            imported.push(await importMedia(f, b.source ?? 'human'));
          } catch (e) {
            failed.push(`${path.basename(f)}: ${String((e as Error).message ?? e)}`);
          }
        }
        return ok({ ok: true, folder: true, count: imported.length, failed });
      }
      return ok({ ok: true, ...(await importMedia(b.path, b.source ?? 'human')) });
    } catch (e) {
      return err(500, String((e as Error).message ?? e));
    }
  }
  if (key === 'GET /jobs') return ok(jobs.list().map((j) => jobs.view(j)));
  if ((mm = /^GET \/jobs\/(job\d+)$/.exec(key))) {
    const j = jobs.get(mm[1]);
    return j ? ok(jobs.view(j)) : err(404, 'khong co job nay');
  }
  if ((mm = /^POST \/jobs\/(job\d+)\/cancel$/.exec(key))) return ok({ ok: jobs.cancel(mm[1]) });

  if (key === 'POST /render_start') {
    try {
      return ok({ ok: true, ...(await startExport(b.preset ?? 'project', b.out, typeof b.loudness_lufs === 'number' ? b.loudness_lufs : null)) });
    } catch (e) {
      return err(500, String((e as Error).message ?? e));
    }
  }

  if (key === 'GET /export_targets') {
    const tpl = findCapcutTemplate();
    return ok({ ok: true, targets: TARGETS.map((t) => ({ ...t, verified: exportVerified[t.id] ?? VERIFIED[t.id], available: t.id !== 'capcut' || !!tpl, unavailable_reason: t.id === 'capcut' && !tpl ? `chưa có bản nháp CapCut làm khuôn trong ${capcutDraftsDir()}` : undefined })) });
  }
  if (key === 'POST /export_timeline') {
    try {
      const out = r.trusted && typeof b.out === 'string' && b.out ? b.out : undefined; // AI khong chon duoc duong dan: luon vao thu muc xuat mac dinh
      return ok({ ok: true, ...(await startTimelineExport(String(b.target) as ExportTarget, { aspect: b.aspect, out, install: r.trusted && !!b.install, overlay: b.overlay !== false })) });
    } catch (e) {
      return err(500, String((e as Error).message ?? e));
    }
  }

  if (key === 'GET /analyze_frame' || key === 'GET /scope_image') {
    const t = Number(r.query.get('t') ?? 0);
    const scale = Math.min(1, Math.max(0.1, Number(r.query.get('scale') ?? 0.4)));
    const clipId = r.query.get('clip_id');
    const graded = r.query.get('graded') !== '0';
    let project = session.project;
    const prId = r.query.get('proposal');
    if (prId) {
      const pr = proposals.find((x) => x.id === prId);
      const dd = pr ? session.draftOf(pr.ops) : null;
      if (!dd?.project) return err(409, 'khong dung duoc de xuat nay de do');
      project = dd.project;
    }
    if (clipId) {
      const c = project.clips.find((x) => x.id === clipId);
      if (!c) return err(404, `khong co clip ${clipId}`);
      // chi giu clip nay (de do rieng), va neu graded=0 thi bo chinh mau de thay mau goc
      const d: Project = JSON.parse(JSON.stringify(project));
      d.clips = d.clips.filter((x) => x.id === clipId);
      if (!graded) delete d.clips[0].grade;
      project = d;
    } else if (!graded) {
      const d: Project = JSON.parse(JSON.stringify(project));
      for (const c of d.clips) delete c.grade;
      project = d;
    }
    const isScope = key === 'GET /scope_image';
    const kind = r.query.get('kind') ?? 'waveform';
    if (isScope && !['waveform', 'parade', 'vectorscope', 'histogram', 'rgbwave'].includes(kind)) return err(400, 'kind phai la waveform|parade|vectorscope|histogram|rgbwave');
    const roiQ = r.query.get('roi');
    let roi: { x0: number; y0: number; x1: number; y1: number } | undefined;
    if (roiQ && roiQ !== 'full') {
      const preset: Record<string, number[]> = { center: [0.25, 0.25, 0.75, 0.75], upper: [0, 0, 1, 0.5], lower: [0, 0.5, 1, 1], left: [0, 0, 0.5, 1], right: [0.5, 0, 1, 1] };
      const v = preset[roiQ] ?? roiQ.split(',').map(Number);
      if (v.length !== 4 || !v.every(Number.isFinite) || v.some((x) => x < 0 || x > 1) || !(v[2] > v[0] + 0.01 && v[3] > v[1] + 0.01)) return err(400, 'roi phai la full|center|upper|lower|left|right hoac x0,y0,x1,y1 (0..1, x1>x0, y1>y0)');
      roi = { x0: v[0], y0: v[1], x1: v[2], y1: v[3] };
    }
    const res = await requestFrame(project, t, scale, r.query.get('aspect') ?? undefined, isScope ? 'scope' : 'stats', kind, roi);
    if (res.error) return err(500, res.error);
    if (!isScope) return ok({ ok: true, t, clip_id: clipId, graded, roi: roiQ ?? 'full', measured_px: res.width && res.height ? `${res.width}x${res.height}` : undefined, ...res.stats });
    return { status: 200, buf: Buffer.from(res.png), headers: { 'Content-Type': 'image/png', 'X-Width': String(res.width), 'X-Height': String(res.height) } };
  }
  if (key === 'GET /preview_frame') {
    const t = Number(r.query.get('t') ?? 0);
    const scale = Math.min(1, Math.max(0.05, Number(r.query.get('scale') ?? 0.5)));
    const prId = r.query.get('proposal');
    let project = session.project;
    if (prId) {
      const pr = proposals.find((x) => x.id === prId);
      const d = pr ? session.draftOf(pr.ops) : null;
      if (!d?.project) return err(409, 'khong dung duoc de xuat nay de xem truoc');
      project = d.project;
    }
    const res = await requestFrame(project, t, scale, r.query.get('aspect') ?? undefined);
    if (res.error) return err(500, res.error);
    return { status: 200, buf: Buffer.from(res.png), headers: { 'Content-Type': 'image/png', 'X-Width': String(res.width), 'X-Height': String(res.height) } };
  }
  return err(404, 'khong co duong dan nay');
}

ipcMain.handle('api', async (_e, method: string, p: string, body: unknown) => {
  const url = new URL(p, 'http://x');
  const res = await route({ method, path: url.pathname, query: url.searchParams, body, trusted: true });
  return { status: res.status, json: res.json, buf: res.buf };
});

// ---- HTTP ----
function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let s = '';
    req.on('data', (c) => {
      s += c;
      if (s.length > 5_000_000) reject(new Error('body qua lon'));
    });
    req.on('end', () => resolve(s));
  });
}

function startServer() {
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? '/', 'http://127.0.0.1');
      const body = req.method === 'POST' ? JSON.parse((await readBody(req)) || '{}') : {};
      const out = await route({ method: req.method ?? 'GET', path: url.pathname, query: url.searchParams, body, trusted: DEV_API });
      if (out.buf) {
        res.writeHead(out.status, out.headers);
        return res.end(out.buf);
      }
      res.writeHead(out.status, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(out.json));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: false, error: String((e as Error).message ?? e) }));
    }
  });
  server.listen(PORT, '127.0.0.1'); // chi nghe localhost
  return server;
}

async function createWindow() {
  win = new BrowserWindow({
    width: 1500,
    height: 920,
    show: !selftest,
    title: 'Tool Edit',
    backgroundColor: '#0f1013',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, sandbox: true, backgroundThrottling: false, autoplayPolicy: 'no-user-gesture-required' },
  });
  win.setMenuBarVisibility(false);
  // kiem thu tu dong (CDP / DEV_API) mo thang trinh dung; dung that mo Trang chu
  const startEditor = (!!process.env.TOOL_EDIT_CDP_PORT || DEV_API) && !process.env.TOOL_EDIT_START_HOME;
  await win.loadFile(path.join(__dirname, 'index.html'), selftest ? { search: 'selftest=1' } : startEditor ? { search: 'start=editor' } : undefined);
}

app.whenReady().then(async () => {
  if (selftest) {
    const outDir = path.join(process.cwd(), 'out');
    fs.mkdirSync(outDir, { recursive: true });
    ipcMain.once('selftest-result', async (_e, data) => {
      const gpuProc = await app.getGPUInfo('basic').catch(() => null);
      if (data.error) {
        console.error('SELFTEST LOI:', data.error);
        fs.writeFileSync(path.join(outDir, 'selftest.json'), JSON.stringify({ error: data.error, gpuProc }, null, 2));
        app.exit(1);
        return;
      }
      fs.writeFileSync(path.join(outDir, 'selftest.json'), JSON.stringify({ ...data.result, gpuProc }, null, 2));
      fs.writeFileSync(path.join(outDir, 'selftest-bars.png'), Buffer.from(data.pngBars));
      fs.writeFileSync(path.join(outDir, 'selftest-ramp.png'), Buffer.from(data.pngRamp));
      console.log(JSON.stringify(data.result, null, 2));
      const r = data.result;
      app.exit(r.ramp.pass && r.bars.pass && r.bt709.pass ? 0 : 2);
    });
    setTimeout(() => {
      console.error('SELFTEST qua han 120s');
      app.exit(3);
    }, 120000);
  } else {
    startServer();
    fontIndex = new FontIndex(cacheDir());
    setTimeout(() => void fontIndex?.scan(), 1500); // quet nen: khong chan giao dien
    library = new Library(path.join(app.getPath('userData'), 'library.json'));
    const defaults = (process.env.TOOL_EDIT_LIBRARY ? process.env.TOOL_EDIT_LIBRARY.split(';') : [path.resolve(app.getAppPath(), '..', '..', 'phong-cach', 'saas-animation', 'audio'), path.resolve(app.getAppPath(), '..', 'phong-cach', 'saas-animation', 'audio')]).filter((d) => d && fs.existsSync(d));
    for (const d of defaults) library.addDir(d);
    setTimeout(() => void library?.scanAll(), 2500);
  }
  await createWindow();
});

app.on('window-all-closed', () => app.quit());
