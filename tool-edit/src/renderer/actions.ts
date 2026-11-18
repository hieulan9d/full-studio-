// Hanh dong cua giao dien: moi thay doi du an di qua op (POST /ops qua IPC), khong sua truc tiep.
import { DEFAULT_TRANSFORM, timelineEnd, type Clip, type Op, type Project } from '../core/schema';
import { api } from './bridge';
import { player } from './player';
import { store, type Toast } from './store';
import { expandGroups, nextTrackName, findFreeStart, freshIds, newGroupId, splitTargets, trackKindForMedia } from './timeline-math';
import { thumbnail } from './engine';
import { EASE_PRESETS, easeFromName, findKeyAt, textPatchFor, valueAt, type Ease } from '../core/anim';
import { getPreset } from '../core/presets';
import { defaultText, type DeepPartialText } from '../core/text';
import { SPEED_PRESETS, speedPresetKeys } from '../core/speed';
import { personCutoutPlan } from '../core/behind';
import type { MatteOpts } from '../core/schema';
import { defaultShape, type BlendMode, type DeepPartialFx, type ShapeKind } from '../core/fx';
import { defaultKeymap, mergeKeymap, parseKeymapJson } from './keymap';
import { viText } from './vi-runtime';
import { DEFAULT_LAYOUT, type Layout } from './store';
import { bakeLut, parseCube, writeCube, type DeepPartialGrade } from '../core/grade';
import type { FontView } from './store';

let toastSeq = 0;
export function toast(text: string, kind: Toast['kind'] = 'info', action?: Toast['action']) {
  text = viText(text); // thông báo từ lõi/tiến trình chính chưa có dấu: khôi phục dấu khi hiển thị
  const id = ++toastSeq;
  store.set({ toast: { id, text, kind, action } });
  setTimeout(() => {
    if (store.get().toast?.id === id) store.set({ toast: null });
  }, kind === 'error' ? 7000 : 4000);
}

/** Track vừa bị làm trống bởi các op này (trước có clip, sau không còn) -> op remove_track; luôn giữ lại ít nhất 1 track mỗi loại. */
function emptiedTrackOps(ops: Op[]): Op[] {
  if (!ops.some((o) => o.op === 'remove_clip' || o.op === 'ripple_delete' || (o.op === 'set_clip' && o.patch.track !== undefined))) return [];
  const p = store.get().project;
  const where = new Map(p.clips.map((c) => [c.id, c.track as string | null]));
  const touched = new Set<string>();
  for (const o of ops) {
    if (o.op === 'add_clip') where.set(o.clip.id, o.clip.track);
    else if (o.op === 'remove_clip' || o.op === 'ripple_delete') {
      if (where.get(o.id)) touched.add(where.get(o.id)!);
      where.set(o.id, null);
    } else if (o.op === 'set_clip' && o.patch.track !== undefined) {
      if (where.get(o.id)) touched.add(where.get(o.id)!);
      where.set(o.id, o.patch.track);
    }
  }
  const used = new Set([...where.values()].filter(Boolean) as string[]);
  const added = new Set(ops.filter((o): o is Extract<Op, { op: 'add_track' }> => o.op === 'add_track').map((o) => o.track.id));
  const kinds = new Map(p.tracks.map((t) => [t.id, t.kind]));
  for (const o of ops) if (o.op === 'add_track') kinds.set(o.track.id, o.track.kind);
  const out: Op[] = [];
  for (const id of touched) {
    if (used.has(id) || added.has(id)) continue;
    const kind = kinds.get(id);
    const sameKindLeft = [...kinds].filter(([tid, k]) => k === kind && tid !== id && !out.some((q) => q.op === 'remove_track' && q.id === tid)).length;
    if (kind && sameKindLeft >= 1) out.push({ op: 'remove_track', id });
  }
  return out;
}

// Cu chi lien tuc (go vao o, keo chuot tren khung xem): moi lan doi di thang vao du an (preview doi ngay) nhung CUNG KHOA
// nen lich su hoan tac chi them MOT buoc. Khoa dat khi bat dau cu chi, xoa khi ket thuc.
let gestureKey: string | null = null;
let gestureSeq = 0;
export function beginGesture(prefix = 'g'): string {
  gestureKey = `${prefix}:${++gestureSeq}`;
  return gestureKey;
}
export function endGesture() {
  gestureKey = null;
}

export async function commit(ops: Op[], source = 'human'): Promise<boolean> {
  if (source === 'human') ops = [...ops, ...emptiedTrackOps(ops)]; // hàng trống thì tự mất (như CapCut), cùng một bước hoàn tác
  const r = await api('POST', '/ops', { ops, source, coalesce: source === 'human' ? gestureKey ?? undefined : undefined });
  if (r.status !== 200) {
    toast((r.json?.errors ?? [r.json?.error ?? 'lỗi không rõ']).join('; '), 'error');
    return false;
  }
  return true;
}

export const undo = () => api('POST', '/undo').then((r) => r.json?.ok || toast('Không còn gì để hoàn tác'));
export const redo = () => api('POST', '/redo').then((r) => r.json?.ok || toast('Không còn gì để làm lại'));

export function select(ids: string[], additive = false) {
  const cur = store.get().selection;
  const p = store.get().project;
  ids = expandGroups(p, ids);
  if (!additive) return store.set({ selection: ids });
  const set = new Set(cur);
  for (const id of ids) set.has(id) ? set.delete(id) : set.add(id);
  store.set({ selection: [...set] });
}

export function setZoom(z: number) {
  store.set({ zoom: Math.min(600, Math.max(8, z)) });
}

// ---- media ----
export async function importPaths(paths: string[]) {
  if (!paths.length) return;
  let okN = 0;
  for (const p of paths) {
    const r = await api('POST', '/media_import', { path: p, source: 'human' });
    if (r.status === 200) okN += r.json?.folder ? r.json.count : 1; // thư mục: nhập cả các file media bên trong
    else toast(`Không nhập được ${p.split(/[\\/]/).pop()}: ${r.json?.error}`, 'error');
    if (r.status === 200 && r.json?.failed?.length) toast(`${r.json.failed.length} file trong thư mục không nhập được: ${r.json.failed[0]}`, 'error');
  }
  if (okN) toast(`Đã nhập ${okN} file`, 'ok');
}

export async function importFolderDialog() {
  const d = await window.toolEdit.dialogDir();
  if (d) await importPaths([d]);
}

export async function importDialog() {
  await importPaths(await window.toolEdit.dialogMedia());
}

/** Them media vao timeline. start = undefined -> o playhead. Tu day sang phai neu bi chong. */
export async function addMediaToTimeline(mediaId: string, opts: { track?: string; start?: number } = {}) {
  let p = store.get().project;
  let m = p.media.find((x) => x.id === mediaId);
  if (!m) return toast('Không có media này', 'error');
  if (m.kind !== 'audio' && m.cache?.status !== 'ready') {
    // Media vừa nhập còn đang tạo cache (vài giây): tự chờ rồi thêm, không bắt người dùng thử lại.
    if (m.cache?.status === 'error') return toast(`Media lỗi: ${m.cache.error ?? 'không tạo được cache'}`, 'error');
    toast('Media đang chuẩn bị, sẽ tự thêm vào timeline khi xong…', 'info');
    const t0 = Date.now();
    while (Date.now() - t0 < 120000) {
      await new Promise((r) => setTimeout(r, 250));
      m = store.get().project.media.find((x) => x.id === mediaId);
      if (!m) return;
      if (m.cache?.status === 'ready') break;
      if (m.cache?.status === 'error') return toast(`Media lỗi: ${m.cache.error ?? 'không tạo được cache'}`, 'error');
    }
    if (m.cache?.status !== 'ready') return toast('Media chuẩn bị quá lâu, thử lại sau', 'error');
    p = store.get().project;
  }
  const kind = trackKindForMedia(m);
  // Tự vào đúng loại track: thả lên track sai loại (hoặc ngoài track) thì chuyển sang track cùng loại; chưa có thì tạo mới.
  const ops: Op[] = [];
  let track = opts.track && p.tracks.find((t) => t.id === opts.track)?.kind === kind ? opts.track : p.tracks.find((t) => t.kind === kind)?.id;
  if (!track) {
    track = freshIds(p, kind === 'video' ? 'v' : 'a', 1)[0];
    ops.push({ op: 'add_track', track: { id: track, kind, name: `${kind === 'video' ? 'Video' : 'Audio'} 1` } });
  }
  const duration = m.kind === 'image' ? 5 : m.duration;
  const start = findFreeStart(p, track, opts.start ?? store.get().playhead, duration);
  const [id] = freshIds(p, 'c', 1);
  const clip: Clip = { id, track, src: { type: 'media', mediaId }, start, duration, in: 0, volume: 1, transform: { ...DEFAULT_TRANSFORM }, keyframes: {} };
  ops.push({ op: 'add_clip', clip });
  if (await commit(ops)) store.set({ selection: [id] });
}

export async function addTrack(kind: 'video' | 'audio') {
  const p = store.get().project;
  const prefix = kind === 'video' ? 'v' : 'a';
  const [id] = freshIds(p, prefix, 1);
  await commit([{ op: 'add_track', track: { id, kind, name: nextTrackName(p, kind) } }]);
}

// ---- chinh sua timeline ----
export async function splitAtPlayhead() {
  const s = store.get();
  const targets = splitTargets(s.project, s.selection, s.playhead);
  if (!targets.length) return toast('Đặt con trỏ lên một clip (không ở mép) để cắt');
  const ids = freshIds(s.project, 'c', targets.length);
  const ops: Op[] = targets.map((c, i) => ({ op: 'split_clip', id: c.id, at: s.playhead, newId: ids[i] }));
  await commit(ops);
}

export async function deleteSelection(ripple: boolean) {
  const s = store.get();
  if (!s.selection.length) return;
  const sel = s.project.clips.filter((c) => s.selection.includes(c.id));
  // xoa tu clip o sau ve truoc de ripple khong lam lech vi tri cua clip con lai
  sel.sort((a, b) => b.start - a.start);
  const ops: Op[] = sel.map((c) => (ripple ? { op: 'ripple_delete', id: c.id } : { op: 'remove_clip', id: c.id }));
  if (await commit(ops)) store.set({ selection: [] });
}

// ---- vô hiệu hóa clip (như CapCut): bấm lần nữa để bật lại ----
export async function toggleDisableSelection(ids?: string[]) {
  const s = store.get();
  const sel = s.project.clips.filter((c) => (ids ?? s.selection).includes(c.id));
  if (!sel.length) return toast('Chọn clip để vô hiệu hóa / bật lại');
  const disable = sel.some((c) => !c.disabled); // còn clip đang bật -> tắt hết; tất cả đã tắt -> bật lại hết
  await commit(sel.map((c) => ({ op: 'set_clip' as const, id: c.id, patch: { disabled: disable } })));
}

// ---- clip ghép (nhóm) và tách âm thanh ----
export async function groupSelection() {
  const s = store.get();
  const sel = s.project.clips.filter((c) => s.selection.includes(c.id));
  if (sel.length < 2) return toast('Chọn từ 2 clip trở lên để ghép');
  const group = newGroupId(s.project);
  if (await commit([{ op: 'group_clips', ids: sel.map((c) => c.id), group }])) toast(`Đã ghép ${sel.length} clip (hủy ghép: Ctrl+Shift+G)`);
}

export async function ungroupSelection() {
  const s = store.get();
  const groups = [...new Set(s.project.clips.filter((c) => s.selection.includes(c.id) && c.group).map((c) => c.group!))];
  if (!groups.length) return toast('Clip đang chọn không thuộc clip ghép nào');
  await commit(groups.map((g) => ({ op: 'ungroup' as const, group: g })));
}

/** Tách tiếng của (các) clip video đã chọn ra một clip trên track audio; clip video được tắt tiếng. */
export async function separateAudio(clipIds?: string[]) {
  const s = store.get();
  const p = s.project;
  const ids = clipIds ?? s.selection;
  const targets = p.clips.filter((c) => ids.includes(c.id) && c.src.type === 'media' && p.tracks.find((t) => t.id === c.track)?.kind === 'video').filter((c) => {
    const m = p.media.find((x) => x.id === (c.src as { mediaId: string }).mediaId);
    return m?.kind === 'video' && m.hasAudio;
  });
  if (!targets.length) return toast('Không có clip video nào có tiếng để tách');
  const ops: Op[] = [];
  const newIds = freshIds(p, 'c', targets.length);
  const planned: { track: string; start: number; end: number }[] = [];
  const audioTracks = p.tracks.filter((t) => t.kind === 'audio').map((t) => t.id);
  const newNames: string[] = [];
  targets.forEach((c, i) => {
    const free = (tr: string) => !p.clips.some((x) => x.track === tr && c.start < x.start + x.duration - 1e-6 && x.start < c.start + c.duration - 1e-6) && !planned.some((q) => q.track === tr && c.start < q.end - 1e-6 && q.start < c.start + c.duration - 1e-6);
    let tr = audioTracks.find(free);
    if (!tr) {
      const taken = new Set([...p.tracks.map((t) => t.id), ...audioTracks]);
      let k = 1;
      while (taken.has('a' + k)) k++;
      tr = 'a' + k;
      audioTracks.push(tr);
      const nm = nextTrackName(p, 'audio', newNames);
      newNames.push(nm);
      ops.push({ op: 'add_track', track: { id: tr, kind: 'audio', name: nm } });
    }
    planned.push({ track: tr, start: c.start, end: c.start + c.duration });
    const a: Clip = { id: newIds[i], track: tr, src: JSON.parse(JSON.stringify(c.src)), start: c.start, duration: c.duration, in: c.in, volume: c.volume, transform: { ...DEFAULT_TRANSFORM }, keyframes: {} };
    if (c.speed !== undefined) a.speed = c.speed;
    for (const k of ['volume', 'speed']) if (c.keyframes?.[k]?.length) a.keyframes[k] = JSON.parse(JSON.stringify(c.keyframes[k]));
    ops.push({ op: 'add_clip', clip: a });
    ops.push({ op: 'set_clip', id: c.id, patch: { volume: 0 } });
    if (c.keyframes?.volume?.length) ops.push({ op: 'set_keyframes', id: c.id, prop: 'volume', keys: [] });
  });
  if (await commit(ops)) {
    store.set({ selection: [...ids, ...newIds] });
    toast(`Đã tách tiếng của ${targets.length} clip sang track audio`);
  }
}

// ---- sao chép / dán / nhân đôi clip ----
let clipClipboard: Clip[] = [];
const r6c = (x: number) => Math.round(x * 1e6) / 1e6;

export async function copyClips(cut = false) {
  const s = store.get();
  const sel = s.project.clips.filter((c) => s.selection.includes(c.id));
  if (!sel.length) return toast('Chọn clip để sao chép');
  clipClipboard = JSON.parse(JSON.stringify(sel));
  toast(cut ? `Đã cắt ${sel.length} clip (dán lại bằng phím Dán)` : `Đã sao chép ${sel.length} clip`);
  if (cut) await deleteSelection(false);
}

/** Dán nhóm clip: giữ nguyên khoảng cách giữa các clip, tới `at` giây; dịch cả nhóm nếu vướng clip khác. */
async function placeClips(src: Clip[], at: number) {
  const s = store.get();
  const p = s.project;
  const base = Math.min(...src.map((c) => c.start));
  const trackOf = (c: Clip) => {
    if (p.tracks.some((t) => t.id === c.track)) return c.track;
    const kind = p.tracks.find((t) => t.id === c.track)?.kind ?? (c.src.type === 'media' && p.media.find((m) => m.id === (c.src as { mediaId: string }).mediaId)?.kind === 'audio' ? 'audio' : 'video');
    return p.tracks.find((t) => t.kind === kind)?.id ?? c.track;
  };
  let d = at - base;
  for (let k = 0; k < 40; k++) {
    let moved = false;
    for (const c of src) {
      const want = c.start + d;
      const fit = findFreeStart(p, trackOf(c), want, c.duration);
      if (fit > want + 1e-6) {
        d += fit - want;
        moved = true;
      }
    }
    if (!moved) break;
  }
  const ids = freshIds(p, 'c', src.length);
  // nhóm (clip ghép) của bản sao là nhóm MỚI, không chung với bản gốc
  const groupMap = new Map<string, string>();
  const used = new Set(p.clips.map((c) => c.group).filter(Boolean) as string[]);
  let gk = 1;
  for (const c of src) if (c.group && !groupMap.has(c.group)) {
    while (used.has('g' + gk)) gk++;
    groupMap.set(c.group, 'g' + gk);
    used.add('g' + gk);
  }
  const ops: Op[] = src.map((c, i) => {
    const n: Clip = JSON.parse(JSON.stringify(c));
    n.id = ids[i];
    n.track = trackOf(c);
    n.start = r6c(Math.max(0, c.start + d));
    if (n.group) n.group = groupMap.get(n.group);
    delete n.tag; // phụ đề/SFX sinh tự động: bản sao là clip thường
    delete n.captionOpts;
    return { op: 'add_clip', clip: n };
  });
  if (await commit(ops)) store.set({ selection: ids });
}

export async function pasteClips() {
  if (!clipClipboard.length) return toast('Chưa có clip nào được sao chép');
  await placeClips(clipClipboard, store.get().playhead);
}

export async function duplicateClips() {
  const s = store.get();
  const sel = s.project.clips.filter((c) => s.selection.includes(c.id));
  if (!sel.length) return toast('Chọn clip để nhân đôi');
  await placeClips(sel, Math.max(...sel.map((c) => c.start + c.duration)));
}

// ---- du an ----
async function confirmDiscard(): Promise<boolean> {
  const m = store.get().meta;
  return !m.dirty || window.confirm('Dự án có thay đổi chưa lưu. Bỏ thay đổi?');
}

export async function newProjectAction() {
  if (!(await confirmDiscard())) return;
  await api('POST', '/project/new', {});
  store.set({ selection: [], playhead: 0, draft: null });
}

export async function openProjectAction() {
  if (!(await confirmDiscard())) return;
  const f = await window.toolEdit.dialogOpen();
  if (!f) return;
  const r = await api('POST', '/project/load', { path: f });
  if (r.status !== 200) return toast(`Không mở được: ${r.json?.error}`, 'error');
  store.set({ selection: [], playhead: 0, draft: null });
  toast('Đã mở dự án', 'ok');
}

export async function restoreAutosave() {
  const r = await api('POST', '/project/load', { path: 'autosave' });
  if (r.status !== 200) return toast(`Không khôi phục được: ${r.json?.error}`, 'error');
  store.set({ selection: [], playhead: 0, autosave: null });
  toast('Đã khôi phục phiên trước (chưa lưu)', 'ok');
}

export async function saveProjectAction(as = false) {
  let file = store.get().meta.path;
  if (as || !file) {
    file = await window.toolEdit.dialogSave();
    if (!file) return;
  }
  const r = await api('POST', '/project/save', { path: file });
  if (r.status !== 200) return toast(`Không lưu được: ${r.json?.error}`, 'error');
  toast('Đã lưu ' + (file.split(/[\\/]/).pop() ?? ''), 'ok');
}

export async function renameProject(name: string) {
  await api('POST', '/project/rename', { name });
}

export async function exportPreset(preset: '9:16' | '16:9', loudness?: number) {
  const p = store.get().project;
  if (timelineEnd(p) <= 0) return toast('Timeline đang trống', 'error');
  const r = await api('POST', '/render_start', { preset, loudness_lufs: loudness });
  if (r.status !== 200) return toast(`Không xuất được: ${r.json?.error}`, 'error');
  toast(`Đang xuất ${preset} (${r.json.frames} khung)...`);
}

// Electron KHONG ho tro window.prompt: dung hop thoai rieng trong app.
export function askText(title: string, value: string): Promise<string | null> {
  return new Promise((resolve) => {
    store.set({ modal: { kind: 'text', title, value, ok: (v) => { store.set({ modal: null }); resolve(v); }, cancel: () => { store.set({ modal: null }); resolve(null); } } });
  });
}
export function askPick(title: string, items: { label: string; value: string }[]): Promise<string | null> {
  return new Promise((resolve) => {
    store.set({ modal: { kind: 'pick', title, items, ok: (v) => { store.set({ modal: null }); resolve(v); }, cancel: () => { store.set({ modal: null }); resolve(null); } } });
  });
}

export async function snapshotCreate() {
  const name = await askText('Tên snapshot', `snapshot-${new Date().toLocaleTimeString().replace(/[^0-9]/g, '')}`);
  if (!name) return;
  await api('POST', '/snapshots', { name });
  toast(`Đã lưu snapshot "${name}"`, 'ok');
}

export async function snapshotRestore() {
  const r = await api('GET', '/snapshots');
  const list: { name: string; time: string; clips: number }[] = r.json ?? [];
  if (!list.length) return toast('Chưa có snapshot nào');
  const name = await askPick('Khôi phục snapshot nào? (hoàn tác được bằng Ctrl+Z)', [...list].reverse().map((x) => ({ label: `${x.name}  ·  ${x.clips} clip  ·  ${new Date(x.time).toLocaleTimeString()}`, value: x.name })));
  if (!name) return;
  const rr = await api('POST', '/snapshots/restore', { name });
  toast(rr.status === 200 ? `Đã khôi phục "${name}" (hoàn tác được)` : `Không có snapshot "${name}"`, rr.status === 200 ? 'ok' : 'error');
}

// ---- de xuat cua AI ----
export async function decideProposal(id: string, accept: boolean, include?: number[]) {
  const r = await api('POST', `/proposals/${id}/${accept ? 'accept' : 'reject'}`, include ? { include } : undefined);
  if (store.get().draft?.id === id) store.set({ draft: null });
  if (r.status !== 200) toast(`${r.json?.errors?.join('; ') ?? r.json?.error}`, 'error');
  else toast(accept ? 'Đã chấp nhận đề xuất' : 'Đã từ chối đề xuất', accept ? 'ok' : 'info');
  await refreshProposals();
  player.projectChanged();
}

export async function toggleDraft(id: string) {
  if (store.get().draft?.id === id) {
    store.set({ draft: null });
    player.requestRender();
    return;
  }
  const r = await api('GET', `/proposals/${id}/draft`);
  if (!r.json?.ok) return toast(`Không xem thử được: ${r.json?.errors?.join('; ') ?? ''}`, 'error');
  store.set({ draft: { id, project: r.json.project as Project } });
  player.requestRender();
}

// ---- poll job / de xuat ----
let lastJobs = '';
let lastProps = '';
let proposalsLoaded = false;
const announced = new Set<string>();
export async function refreshProposals() {
  const r = await api('GET', '/proposals');
  const list = (r.json ?? []) as typeof store.state.proposals;
  const sig = JSON.stringify(list.map((x) => [x.id, x.status]));
  if (sig === lastProps) return;
  lastProps = sig;
  store.set({ proposals: list });
  const firstLoad = !proposalsLoaded;
  proposalsLoaded = true;
  for (const p of list) {
    if (p.status === 'accepted' && p.source.startsWith('ai:') && !announced.has(p.id)) {
      announced.add(p.id);
      if (!firstLoad) toast(`AI vừa áp dụng${p.note ? ': ' + p.note : ' ' + p.ops.length + ' thay đổi'}`, 'ok', { label: 'Hoàn tác', run: () => void undo() });
    }
    if (p.status === 'pending' && !announced.has(p.id)) {
      announced.add(p.id);
      toast(`${p.source} gửi đề xuất ${p.id}${p.note ? ': ' + p.note : ''}`, 'info', { label: 'Xem', run: () => store.set({ rightTab: 'proposals' }) });
    }
  }
}

const doneAnnounced = new Set<string>();
export async function refreshJobs() {
  const r = await api('GET', '/jobs');
  const list = (r.json ?? []) as typeof store.state.jobs;
  const running = list.filter((j) => j.state === 'running').map((j) => [j.id, Math.round(j.progress * 100)]);
  const sig = JSON.stringify([running, list.length, list.filter((j) => j.state !== 'running').length]);
  for (const j of list) {
    if ((j.type === 'render' || j.type === 'export_timeline') && j.state !== 'running' && !doneAnnounced.has(j.id)) {
      doneAnnounced.add(j.id);
      if (j.type === 'export_timeline' && Date.now() - j.startedAt < 30 * 60_000) {
        if (j.state === 'done') toast(`Đã xuất sang ${j.result?.target}: ${j.result?.out_dir}`, 'ok', { label: 'Mở thư mục', run: () => void window.toolEdit.showInFolder(j.result.files[0]) });
        else if (j.state === 'error') toast(`Xuất sang phần mềm khác thất bại: ${j.error}`, 'error');
      } else if (Date.now() - j.startedAt < 30 * 60_000) {
        if (j.state === 'done') toast(`Xuất xong: ${j.result?.path}`, 'ok', { label: 'Mở thư mục', run: () => void window.toolEdit.showInFolder(j.result.path) });
        else if (j.state === 'error') toast(`Xuất thất bại: ${j.error}`, 'error');
      }
    }
  }
  if (sig === lastJobs) return;
  lastJobs = sig;
  store.set({ jobs: list });
}

// ---- thumbnail ----
const thumbBusy = new Set<string>();
export async function ensureThumbs(p: Project) {
  for (const m of p.media) {
    const t = store.get().thumbs;
    if (t[m.id] || thumbBusy.has(m.id) || m.cache?.status !== 'ready' || m.kind === 'audio') continue;
    thumbBusy.add(m.id);
    try {
      const url = await thumbnail(p, m.id);
      if (url) store.set({ thumbs: { ...store.get().thumbs, [m.id]: url } });
    } catch {
      /* khong co thumbnail cung duoc */
    } finally {
      thumbBusy.delete(m.id);
    }
  }
}


// ---------------- chu + keyframe ----------------
const r6 = (x: number) => Math.round(x * 1e6) / 1e6;

/** Them clip chu tai con tro, tren track video cao nhat con trong cho do (khong co thi tao track moi). */
export async function addTextClip(presetId?: string) {
  const s = store.get();
  const p = s.project;
  const pr = presetId ? getPreset(presetId) : undefined;
  const dur = pr?.defaultDuration ?? 3;
  const start = s.playhead;
  const vtracks = [...p.tracks.filter((t) => t.kind === 'video')].reverse();
  let track = vtracks.find((t) => findFreeStart(p, t.id, start, dur) === r6(start))?.id;
  const ops: Op[] = [];
  if (!track) {
    const [tid] = freshIds(p, 'v', 1);
    ops.push({ op: 'add_track', track: { id: tid, kind: 'video', name: `Video ${vtracks.length + 1}` } });
    track = tid;
  }
  const [cid] = freshIds(p, 'c', 1);
  const spec = { ...defaultText(), content: pr?.defaultContent ?? 'Chữ mới' };
  ops.push({ op: 'add_clip', clip: { id: cid, track, src: { type: 'text', text: spec }, start, duration: dur, in: 0, volume: 1, transform: { ...DEFAULT_TRANSFORM }, keyframes: {} } });
  if (presetId) ops.push({ op: 'apply_preset', id: cid, preset: presetId });
  if (await commit(ops)) {
    store.set({ selection: [cid], rightTab: 'props' });
  }
}

export const clipLocal = (c: Clip) => r6(store.get().playhead - c.start);

export async function setText(clip: Clip, patch: DeepPartialText) {
  await commit([{ op: 'set_text', id: clip.id, patch }]);
}

export async function applyPresetAction(clip: Clip, preset: string) {
  if (Object.keys(clip.keyframes).length && !window.confirm('Preset se THAY các keyframe cùng thuộc tính (vd tỉ lệ, độ đục). Tiếp tục?')) return;
  await commit([{ op: 'apply_preset', id: clip.id, preset }]);
}

/** Dat gia tri: neu thuoc tinh dang co keyframe thi ghi keyframe tai con tro (kieu CapCut), khong thi doi gia tri nen. */
export async function setProp(clip: Clip, prop: string, v: number) {
  const keys = clip.keyframes[prop];
  if (keys?.length) {
    const lt = clipLocal(clip);
    if (lt < -1e-6 || lt > clip.duration + 1e-6) return toast('Đưa con trỏ vào trong clip để sửa keyframe', 'error');
    await commit([{ op: 'set_keyframe', id: clip.id, prop, t: Math.min(clip.duration, Math.max(0, lt)), v }]);
    return;
  }
  const head = prop.split('.')[0];
  if (head === 'transform') await commit([{ op: 'set_transform', id: clip.id, patch: { [prop.split('.')[1]]: v } as never }]);
  else if (head === 'volume') await commit([{ op: 'set_clip', id: clip.id, patch: { volume: v } }]);
  else if (head === 'speed') await commit([{ op: 'set_speed', id: clip.id, speed: v }]);
  else if (head === 'shape') await commit([{ op: 'set_shape', id: clip.id, patch: textPatchFor(prop, v) as never }]);
  else if (head === 'fx') {
    const [, name, field] = prop.split('.');
    await commit([{ op: 'set_fx', id: clip.id, fx: { [name]: { [field]: v } } as never }]);
  }
  else await commit([{ op: 'set_text', id: clip.id, patch: textPatchFor(prop, v) as DeepPartialText }]);
}

export async function toggleKeyframe(clip: Clip, prop: string) {
  const lt = clipLocal(clip);
  if (lt < -1e-6 || lt > clip.duration + 1e-6) return toast('Đưa con trỏ vào trong clip để thêm keyframe', 'error');
  const keys = clip.keyframes[prop];
  const at = findKeyAt(keys, lt);
  if (at) await commit([{ op: 'remove_keyframe', id: clip.id, prop, t: at.t }]);
  else await commit([{ op: 'set_keyframe', id: clip.id, prop, t: Math.min(clip.duration, Math.max(0, lt)), v: valueAt(clip, prop, lt) }]);
}

export function gotoKeyframe(clip: Clip, prop: string, dir: -1 | 1) {
  const keys = clip.keyframes[prop];
  if (!keys?.length) return;
  const lt = clipLocal(clip);
  const k = dir > 0 ? keys.find((x) => x.t > lt + 1e-4) : [...keys].reverse().find((x) => x.t < lt - 1e-4);
  if (k) player.seek(clip.start + k.t);
}

export async function setKeyEase(clip: Clip, prop: string, index: number, ease: Ease | string) {
  const k = clip.keyframes[prop]?.[index];
  if (!k) return;
  const op: Op = typeof ease === 'string' ? { op: 'set_keyframe', id: clip.id, prop, t: k.t, v: k.v, ease_preset: ease } : { op: 'set_keyframe', id: clip.id, prop, t: k.t, v: k.v, ease };
  await commit([op]);
}

/** Ease nhanh (Ease In / Ease Out / Easy Ease / Linear): indexes = keyframe da chon; null = moi doan (tru keyframe cuoi, khong co doan sau). */
export async function setEaseMany(clip: Clip, prop: string, indexes: number[] | null, preset: string) {
  const keys = clip.keyframes[prop] ?? [];
  const idx = (indexes ?? keys.map((_, i) => i).slice(0, -1)).filter((i) => keys[i] && i < keys.length - 1);
  if (!idx.length) return toast(keys.length < 2 ? 'Cần ít nhất 2 keyframe để có đường cong' : 'Keyframe cuối không có đoạn sau; chọn keyframe khác');
  await commit(idx.map((i) => ({ op: 'set_keyframe', id: clip.id, prop, t: keys[i].t, v: keys[i].v, ease_preset: preset }) as Op));
}

export async function moveKey(clip: Clip, prop: string, index: number, t: number, v: number) {
  const k = clip.keyframes[prop]?.[index];
  if (!k) return;
  const nt = Math.round(Math.max(0, t) * 1e4) / 1e4;
  const ops: Op[] = [];
  if (Math.abs(nt - k.t) > 1e-5) ops.push({ op: 'remove_keyframe', id: clip.id, prop, t: k.t });
  ops.push({ op: 'set_keyframe', id: clip.id, prop, t: nt, v, ease: k.ease });
  await commit(ops);
}

export async function removeKey(clip: Clip, prop: string, index: number) {
  const k = clip.keyframes[prop]?.[index];
  if (k) await commit([{ op: 'remove_keyframe', id: clip.id, prop, t: k.t }]);
}

export function copyKeys(clip: Clip, prop: string, onlyIndex?: number | null) {
  const all = clip.keyframes[prop] ?? [];
  const keys = onlyIndex != null && all[onlyIndex] ? [all[onlyIndex]] : all;
  if (!keys.length) return toast('Không có keyframe để sao chép');
  const t0 = keys[0].t;
  store.set({ clipboard: { prop, keys: keys.map((k) => ({ dt: r6(k.t - t0), v: k.v, ease: k.ease })) } });
  toast(`Đã sao chép ${keys.length} keyframe (${prop})`, 'ok');
}

export async function pasteKeys(clip: Clip) {
  const cb = store.get().clipboard;
  if (!cb) return toast('Chưa sao chép keyframe nào');
  const lt = clipLocal(clip);
  const ops: Op[] = cb.keys.map((k) => ({ op: 'set_keyframe', id: clip.id, prop: cb.prop, t: Math.max(0, r6(lt + k.dt)), v: k.v, ease: k.ease as Ease }));
  await commit(ops);
}

export async function loadFonts() {
  const r = await api('GET', '/fonts');
  if (r.status !== 200) return;
  store.set({ fonts: r.json.fonts as FontView[], fontsScanning: !!r.json.scanning });
}
export { EASE_PRESETS, easeFromName };

// ---------------- loi thoai, phu de, khoang lang, duck, kho, nhip (GD3) ----------------
import type { CaptionOpts } from '../core/captions';
import type { LibItem } from '../core/sfx';
import { srcToTimeline } from '../core/transcript';

export async function transcribeMedia(mediaId: string, lang: string, model: string) {
  const r = await api('POST', '/transcribe', { media_id: mediaId, lang, model });
  if (r.status !== 200) return toast(r.json?.error ?? 'không chạy được', 'error');
  toast('Đang nhận dạng lời thoại (GPU)...');
}

export async function editWord(mediaId: string, index: number, text: string) {
  await commit([{ op: 'edit_word', mediaId, index, text }]);
}

/** Cat doan loi thoai [wordFrom..wordTo] (chi so trong transcript) khoi clip: xoa chu = xoa doan. */
export async function cutWords(clip: Clip, mediaId: string, from: number, to: number) {
  const tr = store.get().project.media.find((m) => m.id === mediaId)?.transcript;
  if (!tr) return;
  const a = tr.words[Math.min(from, to)],
    b = tr.words[Math.max(from, to)];
  if (!a || !b) return;
  if (await commit([{ op: 'remove_ranges', id: clip.id, ranges: [{ s: a.s, e: b.e }] }])) toast('Đã cắt đoạn lời thoại (Ctrl+Z để hoàn tác)', 'ok');
}

export async function generateCaptionsAction(clip: Clip, opts: CaptionOpts) {
  if (await commit([{ op: 'generate_captions', id: clip.id, opts }])) toast('Đã tạo phụ đề', 'ok');
}

export async function removeCaptionsAction(clip: Clip) {
  await commit([{ op: 'remove_captions', id: clip.id }]);
}

export async function findSilences(clipId: string, min: number, keep: number) {
  const r = await api('GET', `/silences?clip_id=${encodeURIComponent(clipId)}&min=${min}&keep=${keep}`);
  if (r.status !== 200) {
    toast(r.json?.error ?? 'không tìm được', 'error');
    return null;
  }
  return r.json as { source: string; count: number; total_seconds: number; ranges: { s: number; e: number }[] };
}

export async function cutRanges(clip: Clip, ranges: { s: number; e: number }[]) {
  if (await commit([{ op: 'remove_ranges', id: clip.id, ranges }])) toast(`Đã cắt ${ranges.length} doan`, 'ok');
}

export async function duckClip(clip: Clip, amountDb: number) {
  if (await commit([{ op: 'duck_clip', id: clip.id, opts: { amountDb } }])) toast('Đã hạ âm lượng nhạc dưới tiếng nói (keyframe âm lượng, sửa được)', 'ok');
}

export async function libraryAdd(item: LibItem) {
  const p = store.get().project;
  const t = store.get().playhead;
  const ops: Op[] = [];
  let mid = p.media.find((m) => m.path === item.path)?.id;
  if (!mid) {
    [mid] = freshIds(p, 'm', 1);
    ops.push({ op: 'add_media', media: { id: mid, path: item.path, kind: 'audio', duration: item.duration, width: 0, height: 0, fps: 0, hasAudio: true } });
  }
  const name = item.kind === 'music' ? 'Nhạc' : 'SFX';
  let track = p.tracks.find((x) => x.kind === 'audio' && x.name.startsWith(name))?.id;
  const dur = item.kind === 'music' ? item.duration : Math.min(4, item.duration);
  if (track && p.clips.some((c) => c.track === track && t < c.start + c.duration && c.start < t + dur)) track = undefined;
  if (!track) {
    [track] = freshIds(p, 'a', 1);
    ops.push({ op: 'add_track', track: { id: track, kind: 'audio', name } });
  }
  const [cid] = freshIds(p, 'c', 1);
  ops.push({ op: 'add_clip', clip: { id: cid, track, src: { type: 'media', mediaId: mid }, start: t, duration: dur, in: 0, volume: item.kind === 'music' ? 0.5 : 0.7, transform: { ...DEFAULT_TRANSFORM }, keyframes: {}, tag: item.kind === 'sfx' ? 'sfx:manual' : undefined } });
  if (await commit(ops)) store.set({ selection: [cid] });
}

export async function suggestSfx(rules: { event: string; tag: string; volume: number }[]) {
  const r = await api('POST', '/suggest_sfx', { rules, source: 'app:sfx' });
  if (r.status !== 200) return toast(r.json?.error ? `${r.json.error}${r.json.missing?.length ? ' (thiếu tag: ' + r.json.missing.join(', ') + ')' : ''}` : 'không tạo được đề xuất', 'error');
  store.set({ rightTab: 'proposals' });
  await refreshProposals();
  toast(`Đã tạo đề xuất ${r.json.plan.length} SFX: duyệt từng mục trong tab Đề xuất`, 'ok');
}

export async function detectBeatsAction(mediaId: string) {
  const r = await api('POST', '/beats', { media_id: mediaId });
  if (r.status !== 200) return toast(r.json?.error ?? 'không chạy được', 'error');
  toast('Đang nhận nhịp...');
}

export async function placeBeatMarkers(clip: Clip, every: number) {
  const p = store.get().project;
  if (clip.src.type !== 'media') return;
  const mid = clip.src.mediaId;
  const beats = p.media.find((m) => m.id === mid)?.beats;
  if (!beats) return toast('Clip này chưa có nhịp: bấm "Nhận nhịp" trước', 'error');
  const markers = beats.times.filter((t, i) => i % every === 0 && t >= clip.in && t < clip.in + clip.duration).map((t) => ({ t: srcToTimeline(clip, t), kind: 'beat' as const }));
  if (!markers.length) return toast('Không có nhịp nào trong phần clip đang dùng', 'error');
  if (await commit([{ op: 'add_markers', markers }])) toast(`Đã đặt ${markers.length} marker nhịp (${beats.bpm} BPM)`, 'ok');
}

export async function runQc() {
  const r = await api('GET', '/qc');
  return r.status === 200 ? r.json : null;
}


// ---------------- toc do + tach nen (giai doan 4) ----------------
export async function applySpeedPreset(clip: Clip, presetId: string) {
  const pr = SPEED_PRESETS.find((x) => x.id === presetId);
  if (!pr) return toast('Không có preset tốc độ này', 'error');
  await commit([{ op: 'set_speed', id: clip.id, speed: 1 }, { op: 'set_keyframes', id: clip.id, prop: 'speed', keys: speedPresetKeys(pr, clip.duration) }]);
}

export async function clearSpeed(clip: Clip) {
  await commit([{ op: 'set_speed', id: clip.id, speed: 1 }]);
}

export async function removeBackground(mediaId: string) {
  const r = await api('POST', '/matte', { media_id: mediaId });
  if (r.status !== 200) return toast(String(r.json?.error ?? 'không tách nền được'), 'error');
  toast('Đang tách nền bằng GPU (khoảng 10 khung/giây)…');
}

export async function setClipMatte(clip: Clip, matte: MatteOpts | null) {
  await commit([{ op: 'set_clip_matte', id: clip.id, matte }]);
}

/** Chu sau lung nguoi: nhan doi clip len track tren cung (chi nguoi), chu o track giua. */
export async function textBehindPerson(clip: Clip, content: string) {
  const p = store.get().project;
  const plan = personCutoutPlan(p, clip.id, true);
  if (typeof plan === 'string') return toast(plan, 'error');
  const [cid] = freshIds({ ...p, clips: [...p.clips, { id: plan.overlayId } as Clip] }, 'c', 1);
  const ops: Op[] = [...plan.ops, { op: 'add_clip', clip: { id: cid, track: plan.textTrack!, src: { type: 'text', text: { ...defaultText(), content } }, start: clip.start, duration: clip.duration, in: 0, volume: 1, transform: { ...DEFAULT_TRANSFORM }, keyframes: {} } }];
  if (await commit(ops)) store.set({ selection: [cid], rightTab: 'props' });
}


// ---------------- chinh mau (giai doan 5) ----------------
export async function setGrade(clip: Clip, patch: DeepPartialGrade | null) {
  await commit([{ op: 'set_grade', id: clip.id, grade: patch }]);
}

/** Chon file .cube va gan vao grade cua clip (kiem tra doc duoc truoc). */
export async function pickLut(clip: Clip) {
  const f = await window.toolEdit.dialogCubeOpen();
  if (!f) return;
  try {
    parseCube(await window.toolEdit.readLut(f));
  } catch (e) {
    return toast('LUT không dùng được: ' + String((e as Error).message ?? e), 'error');
  }
  await setGrade(clip, { lut: { path: f, name: f.split(/[\\/]/).pop() ?? f, mix: 1 } });
}

/** Xuat grade cua clip (da gom LUT dang gan) thanh file .cube 33^3: nhap duoc vao DaVinci/Premiere. */
export async function exportCube(clip: Clip) {
  const g = clip.grade;
  if (!g) return toast('Clip chưa có chỉnh màu', 'error');
  const f = await window.toolEdit.dialogCubeSave(`${clip.id}-grade`);
  if (!f) return;
  try {
    const cube = g.lut && g.lut.mix > 0 ? parseCube(await window.toolEdit.readLut(g.lut.path)) : null;
    const size = 33;
    const data = bakeLut(g, cube, size);
    const txt = writeCube(size, (r, gg, b) => {
      const i = (Math.round(b * (size - 1)) * size * size + Math.round(gg * (size - 1)) * size + Math.round(r * (size - 1))) * 4;
      return [Math.min(1, Math.max(0, data[i])), Math.min(1, Math.max(0, data[i + 1])), Math.min(1, Math.max(0, data[i + 2]))];
    }, `Tool Edit ${clip.id}`);
    await window.toolEdit.writeText(f, txt);
    toast('Đã xuất ' + f.split(/[\\/]/).pop(), 'ok');
  } catch (e) {
    toast('Không xuất được LUT: ' + String((e as Error).message ?? e), 'error');
  }
}


// ---------------- hieu ung lop, blend, hinh vector (giai doan 6) ----------------
export async function setFx(clip: Clip, patch: DeepPartialFx | null) {
  await commit([{ op: 'set_fx', id: clip.id, fx: patch }]);
}
export async function setBlend(clip: Clip, blend: BlendMode) {
  await commit([{ op: 'set_blend', id: clip.id, blend }]);
}
/** Them hinh vector tai con tro tren track video cao nhat con trong. */
export async function addShapeClip(kind: ShapeKind) {
  const s = store.get();
  const p = s.project;
  const dur = 3;
  const start = s.playhead;
  const vtracks = [...p.tracks.filter((t) => t.kind === 'video')].reverse();
  let track = vtracks.find((t) => findFreeStart(p, t.id, start, dur) === r6(start))?.id;
  const ops: Op[] = [];
  if (!track) {
    const [tid] = freshIds(p, 'v', 1);
    ops.push({ op: 'add_track', track: { id: tid, kind: 'video', name: `Video ${vtracks.length + 1}` } });
    track = tid;
  }
  const [cid] = freshIds(p, 'c', 1);
  ops.push({ op: 'add_clip', clip: { id: cid, track, src: { type: 'shape', shape: defaultShape(kind) }, start, duration: dur, in: 0, volume: 1, transform: { ...DEFAULT_TRANSFORM }, keyframes: {} } });
  if (await commit(ops)) store.set({ selection: [cid], rightTab: 'props' });
}


// ---------------- trang chủ, cài đặt, bố cục (phiên bản giao diện mới) ----------------
export interface ProjectCard {
  path: string;
  name: string;
  mtime: string;
  size: number;
  clips: number;
  media: number;
  duration: number;
  width?: number;
  height?: number;
  fps?: number;
  ok: boolean;
  current: boolean;
}

export async function loadProjects(): Promise<{ dir: string; projects: ProjectCard[]; dirty: boolean }> {
  const r = await api('GET', '/projects');
  return { dir: r.json?.dir ?? '', projects: r.json?.projects ?? [], dirty: !!r.json?.dirty };
}

export const goHome = () => store.set({ view: 'home', settingsOpen: false });
export const goEditor = () => store.set({ view: 'editor' });

export async function createProject(name: string, aspect: '9:16' | '16:9', fps = 30) {
  if (!(await confirmDiscard())) return;
  const r = await api('POST', '/projects/create', { name, aspect, fps });
  if (r.status !== 200) return toast(`Không tạo được dự án: ${r.json?.error}`, 'error');
  store.set({ selection: [], playhead: 0, draft: null, aspect, view: 'editor' });
  toast('Đã tạo dự án mới', 'ok');
}

export async function openProjectFile(path: string) {
  if (!(await confirmDiscard())) return;
  const r = await api('POST', '/project/load', { path });
  if (r.status !== 200) return toast(`Không mở được: ${r.json?.error}`, 'error');
  store.set({ selection: [], playhead: 0, draft: null, view: 'editor' });
  toast('Đã mở dự án', 'ok');
}

export async function renameProjectFile(card: ProjectCard) {
  const name = await askText('Đổi tên dự án', card.name);
  if (!name || name === card.name) return false;
  const r = await api('POST', '/projects/rename', { path: card.path, name });
  if (r.status !== 200) toast(`Không đổi được tên: ${r.json?.error}`, 'error');
  return r.status === 200;
}

export async function duplicateProjectFile(card: ProjectCard) {
  const r = await api('POST', '/projects/duplicate', { path: card.path });
  if (r.status !== 200) toast(`Không nhân bản được: ${r.json?.error}`, 'error');
  else toast('Đã nhân bản dự án', 'ok');
  return r.status === 200;
}

export async function forgetProjectFile(card: ProjectCard) {
  await api('POST', '/projects/forget', { path: card.path });
}

export async function trashProjectFile(card: ProjectCard) {
  if (!window.confirm(`Chuyển "${card.name}" vào Thùng rác?

File: ${card.path}
Bạn có thể khôi phục từ Thùng rác của Windows.`)) return false;
  const r = await api('POST', '/projects/trash', { path: card.path });
  if (r.status !== 200) toast(`Không xóa được: ${r.json?.error}`, 'error');
  return r.status === 200;
}

/** Nạp cài đặt (phím tắt, bố cục) lúc khởi động. */
export async function loadSettings() {
  const r = await api('GET', '/settings');
  const j = r.json ?? {};
  store.set({ autoApplyAi: j.autoApplyAi !== false, keymap: mergeKeymap(j.keymap), layout: { ...DEFAULT_LAYOUT, ...(j.layout ?? {}), maxed: 'none' } });
}

let settingsTimer: ReturnType<typeof setTimeout> | null = null;
/** Lưu (trễ 400 ms) cài đặt hiện tại xuống đĩa. */
export function saveSettingsSoon() {
  if (settingsTimer) clearTimeout(settingsTimer);
  settingsTimer = setTimeout(() => {
    const s = store.get();
    const km: Record<string, string> = {};
    const def = defaultKeymap();
    for (const [id, k] of Object.entries(s.keymap)) if (def[id] !== k) km[id] = k; // chỉ lưu phần khác mặc định
    void api('POST', '/settings', { keymap: km, layout: { ...s.layout, maxed: 'none' } });
  }, 400);
}

/** Bật/tắt chế độ AI tự áp dụng (tắt = thay đổi của AI vào hàng đề xuất chờ duyệt). */
export function setAutoApplyAi(v: boolean) {
  store.set({ autoApplyAi: v });
  void api('POST', '/settings', { autoApplyAi: v });
}

export function setLayout(patch: Partial<Layout>, persist = true) {
  store.set({ layout: { ...store.get().layout, ...patch } });
  if (persist) saveSettingsSoon();
}

export function setKey(id: string, combo: string) {
  store.set({ keymap: { ...store.get().keymap, [id]: combo } });
  saveSettingsSoon();
}
export function resetKeys() {
  store.set({ keymap: defaultKeymap() });
  saveSettingsSoon();
}

/** Xuất bộ phím hiện tại ra file JSON (chỉ phần khác mặc định). */
export async function exportKeymap() {
  const def = defaultKeymap();
  const diff: Record<string, string> = {};
  for (const [id, k] of Object.entries(store.get().keymap)) if (def[id] !== k) diff[id] = k;
  const f = await window.toolEdit.keymapExport(JSON.stringify({ format: 'tool-edit-keymap', version: 1, keymap: diff }, null, 1));
  if (f) toast(`Đã xuất bộ phím (${Object.keys(diff).length} phím khác mặc định)`, 'ok');
}

/** Nhập bộ phím từ file JSON: thay toàn bộ bộ phím hiện tại (phím không có trong file về mặc định). */
export async function importKeymap() {
  try {
    const r = await window.toolEdit.keymapImport();
    if (!r) return;
    const { keymap, applied, ignored } = parseKeymapJson(r.text);
    store.set({ keymap });
    saveSettingsSoon();
    toast(`Đã nhập ${applied} phím${ignored ? `, bỏ qua ${ignored} mục không nhận ra` : ''}`, ignored ? 'info' : 'ok');
  } catch (e) {
    toast('Không nhập được bộ phím: ' + String((e as Error).message ?? e), 'error');
  }
}
