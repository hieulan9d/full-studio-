// Ghi ban nhap CapCut (draft_content.json) tu Plan. Lay KHUON tu mot ban nhap CapCut that cua nguoi dung (cau truc CapCut doi theo phien ban,
// khong co schema cong khai): nhan ban nhap co ca video lan am thanh, nhan doi cac material/segment mau. Xem CHUC-NANG.md F-97.
import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { Plan, PlanItem } from '../core/export-plan';
import { audioItems, type OverlayFile } from '../core/export-writers';
import { FFMPEG } from './media';

/* eslint-disable @typescript-eslint/no-explicit-any */
const U = () => randomUUID().toUpperCase();
const hex = () => randomUUID().replace(/-/g, '');
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));

export function capcutDraftsDir(): string {
  return process.env.TOOL_EDIT_CAPCUT_DRAFTS ?? path.join(process.env.LOCALAPPDATA ?? path.join(os.homedir(), 'AppData', 'Local'), 'CapCut', 'User Data', 'Projects', 'com.lveditor.draft');
}

export interface Template {
  dir: string;
  content: any;
  meta: any;
  settings: string;
}

/** Tim ban nhap CapCut moi nhat doc duoc (JSON thuong) va co ca video + am thanh de lam khuon. */
export function findCapcutTemplate(draftsDir = capcutDraftsDir()): Template | null {
  if (!fs.existsSync(draftsDir)) return null;
  const dirs = fs
    .readdirSync(draftsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => path.join(draftsDir, d.name))
    .map((d) => ({ d, m: fs.existsSync(path.join(d, 'draft_content.json')) ? fs.statSync(path.join(d, 'draft_content.json')).mtimeMs : 0 }))
    .filter((x) => x.m > 0)
    .sort((a, b) => b.m - a.m);
  for (const { d } of dirs) {
    try {
      const content = JSON.parse(fs.readFileSync(path.join(d, 'draft_content.json'), 'utf8'));
      const meta = JSON.parse(fs.readFileSync(path.join(d, 'draft_meta_info.json'), 'utf8'));
      const hasV = content.tracks?.some((t: any) => t.type === 'video' && t.segments?.length);
      const hasA = content.tracks?.some((t: any) => t.type === 'audio' && t.segments?.length);
      if (!hasV || !hasA) continue;
      const settingsPath = path.join(d, 'draft_settings');
      return { dir: d, content, meta, settings: fs.existsSync(settingsPath) ? fs.readFileSync(settingsPath, 'utf8') : '' };
    } catch {
      /* ban nhap ma hoa / hong: thu cai khac */
    }
  }
  return null;
}

const us = (fps: number, sec: number) => Math.round(Math.round(sec * fps) / fps * 1_000_000);

function kf(fps: number, prop: string, pts: { t: number; v: number }[]) {
  return {
    id: U(), material_id: '', property_type: prop,
    keyframe_list: pts.map((p) => ({ id: U(), curveType: 'Line', time_offset: us(fps, p.t), left_control: { x: 0, y: 0 }, right_control: { x: 0, y: 0 }, values: [p.v], string_value: '', graphID: '' })),
  };
}

export interface CapcutResult {
  dir: string;
  videos: number;
  audios: number;
  template: string;
}

/** Ghi ban nhap vao outRoot/<name>/. Nem loi neu chua co khuon. */
export async function writeCapcutDraft(plan: Plan, overlay: OverlayFile | undefined, outRoot: string, name: string, template: Template): Promise<CapcutResult> {
  const T = template.content;
  const fps = plan.fps;
  const vseg = T.tracks.find((t: any) => t.type === 'video' && t.segments?.length).segments[0];
  const aseg = T.tracks.find((t: any) => t.type === 'audio' && t.segments?.length).segments[0];
  const pick = (keys: string[], seg: any) => Object.fromEntries(keys.map((k) => [k, (T.materials[k] ?? []).find((x: any) => seg.extra_material_refs.includes(x.id))]));
  const vref = pick(['speeds', 'placeholder_infos', 'canvases', 'sound_channel_mappings', 'material_colors', 'vocal_separations'], vseg);
  const aref = pick(['speeds', 'placeholder_infos', 'beats', 'sound_channel_mappings', 'vocal_separations'], aseg);
  const vmat = T.materials.videos.find((x: any) => x.id === vseg.material_id);
  const amat = T.materials.audios.find((x: any) => x.id === aseg.material_id);
  if (!vmat || !amat) throw new Error('ban nhap khuon CapCut thieu material video/am thanh');

  const D: any = clone(T);
  Object.assign(D, {
    id: U(), name: '', tracks: [], materials: Object.fromEntries(Object.keys(T.materials).map((k) => [k, []])), time_marks: null, keyframe_graph_list: [], relationships: [], lyrics_effects: [], fps,
    canvas_config: { ratio: 'original', width: plan.width, height: plan.height, background: null }, extra_info: { text_to_video: null, track_info: null, subtitle_fragment_info_list: [] },
  });
  D.config = { ...D.config, subtitle_taskinfo: [], attachment_info: [] };
  const M = D.materials;
  const vmats = new Map<string, any>();
  const amats = new Map<string, any>();

  const vmaterial = (p: string, w: number, h: number, dur: number, hasAudio: boolean, image: boolean) => {
    const key = path.resolve(p);
    let m = vmats.get(key);
    if (m) return m;
    m = clone(vmat);
    Object.assign(m, { id: U(), unique_id: hex(), path: p.replace(/\\/g, '/'), material_name: path.basename(p), duration: us(fps, dur), width: w, height: h, has_audio: hasAudio, local_material_id: randomUUID() });
    if (image) m.type = 'photo';
    M.videos.push(m);
    vmats.set(key, m);
    return m;
  };
  const amaterial = (p: string, dur: number) => {
    const key = path.resolve(p);
    let m = amats.get(key);
    if (m) return m;
    m = clone(amat);
    Object.assign(m, { id: U(), unique_id: hex(), type: 'extract_music', name: path.basename(p), path: p.replace(/\\/g, '/'), duration: Math.floor(dur * fps) / fps * 1_000_000, wave_points: [] });
    M.audios.push(m);
    amats.set(key, m);
    return m;
  };
  const refs = (set: Record<string, any>, speed: number) => {
    const ids: string[] = [];
    for (const [k, tp] of Object.entries(set)) {
      if (!tp) continue;
      const x = clone(tp);
      x.id = U();
      if (k === 'speeds') x.speed = speed;
      M[k].push(x);
      ids.push(x.id);
    }
    return ids;
  };
  const range = (it: { start: number; dur: number; srcIn: number; speed: number }) => ({
    source: { start: us(fps, it.srcIn), duration: us(fps, it.dur * it.speed) },
    target: { start: us(fps, it.start), duration: us(fps, it.dur) },
  });

  const vsegment = (mat: any, it: { start: number; dur: number; srcIn: number; speed: number; volume: number }, desc: string) => {
    const s = clone(vseg);
    Object.assign(s, { id: U(), material_id: mat.id, extra_material_refs: refs(vref, it.speed), speed: it.speed, volume: it.volume, last_nonzero_volume: 1, render_index: 0, track_render_index: 0, keyframe_refs: [], common_keyframes: [], desc });
    const r = range(it);
    s.source_timerange = r.source;
    s.target_timerange = r.target;
    return s;
  };
  const asegment = (mat: any, it: PlanItem, desc: string) => {
    const s = clone(aseg);
    Object.assign(s, { id: U(), material_id: mat.id, extra_material_refs: refs(aref, it.speed), speed: it.speed, volume: it.volume, last_nonzero_volume: it.volume || 1, keyframe_refs: [], common_keyframes: [], desc });
    const r = range(it);
    s.source_timerange = r.source;
    s.target_timerange = r.target;
    return s;
  };
  const track = (kind: string, nm: string, segs: any[]) => ({ id: U(), type: kind, flag: 0, attribute: 0, name: nm, is_default_name: false, segments: segs });

  for (const tr of plan.video) {
    const segs: any[] = [];
    for (const it of tr.items) {
      const mat = vmaterial(it.path, it.mediaW, it.mediaH, it.mediaDur, it.hasAudio, it.kind === 'image');
      const s = vsegment(mat, { ...it, volume: it.hasAudio ? it.volume : 0 }, `${tr.name} ${it.id}`);
      const posX = (c: { cx: number }) => ((c.cx - plan.width / 2) / plan.width) * 2;
      const posY = (c: { cy: number }) => (-(c.cy - plan.height / 2) / plan.height) * 2;
      const scl = (c: { s: number }) => c.s / it.fitContain;
      const s0 = it.samples[0];
      s.clip = { ...(s.clip ?? {}), alpha: s0.op, rotation: s0.rot, scale: { x: scl(s0), y: scl(s0) }, transform: { x: posX(s0), y: posY(s0) }, flip: s.clip?.flip ?? { horizontal: false, vertical: false } };
      if (it.animated) {
        const sm = it.samples;
        s.common_keyframes = [
          kf(fps, 'KFTypeScaleX', sm.map((c) => ({ t: c.t, v: scl(c) }))),
          kf(fps, 'KFTypeScaleY', sm.map((c) => ({ t: c.t, v: scl(c) }))),
          kf(fps, 'KFTypePositionX', sm.map((c) => ({ t: c.t, v: posX(c) }))),
          kf(fps, 'KFTypePositionY', sm.map((c) => ({ t: c.t, v: posY(c) }))),
          kf(fps, 'KFTypeRotation', sm.map((c) => ({ t: c.t, v: c.rot }))),
          kf(fps, 'KFTypeAlpha', sm.map((c) => ({ t: c.t, v: c.op }))),
        ];
      }
      segs.push(s);
    }
    if (segs.length) D.tracks.push(track('video', tr.name, segs));
  }
  if (overlay) {
    const mat = vmaterial(overlay.path, overlay.width, overlay.height, overlay.duration, false, false);
    D.tracks.push(track('video', 'Lớp phủ (chữ, hình, hiệu ứng)', [vsegment(mat, { start: 0, dur: overlay.duration, srcIn: 0, speed: 1, volume: 0 }, 'Lớp phủ')]));
  }
  for (const tr of audioItems(plan)) {
    const segs = tr.items.map((it) => asegment(amaterial(it.path, it.mediaDur), it, `${tr.name} ${it.id}`));
    if (segs.length) D.tracks.push(track('audio', tr.name, segs));
  }
  D.duration = us(fps, plan.duration);
  D.tracks.forEach((tr: any, i: number) => tr.segments.forEach((s: any) => (s.track_render_index = i)));

  const out = path.join(outRoot, name);
  if (fs.existsSync(out)) throw new Error(`da co: ${out}`);
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'draft_content.json'), JSON.stringify(D));

  const drafts = path.dirname(template.dir);
  const now = Date.now() * 1000;
  const meta = clone(template.meta);
  Object.assign(meta, {
    draft_fold_path: `${drafts.replace(/\\/g, '/')}/${name}`, draft_id: U(), draft_name: name, draft_root_path: drafts.replace(/\\/g, '/'), tm_duration: D.duration, tm_draft_create: now, tm_draft_modified: now,
    draft_timeline_materials_size_: 0, draft_segment_extra_info: [], draft_removable_storage_device: drafts.slice(0, 2), cloud_package_completed_time: '', tm_draft_cloud_completed: '0',
    tm_draft_cloud_entry_id: -1, tm_draft_cloud_modified: 0, tm_draft_cloud_parent_entry_id: -1, tm_draft_cloud_space_id: -1, tm_draft_cloud_user_id: -1,
  });
  const tpl = template.meta.draft_materials?.[0]?.value?.[0];
  const vals = tpl
    ? M.videos.map((m: any) => ({ ...clone(tpl), duration: m.duration, extra_info: m.material_name, file_Path: m.path, height: m.height, width: m.width, id: U(), roughcut_time_range: { duration: m.duration, start: 0 } }))
    : [];
  meta.draft_materials = (template.meta.draft_materials ?? []).map((t: any) => ({ type: t.type, value: t.type === 0 ? vals : [] }));
  fs.writeFileSync(path.join(out, 'draft_meta_info.json'), JSON.stringify(meta));
  if (template.settings) fs.writeFileSync(path.join(out, 'draft_settings'), template.settings);

  // anh bia: khung dau cua clip video dau tien (that bai thi bo qua)
  const first = plan.video.flatMap((t) => t.items).find((i) => i.kind === 'video');
  if (first)
    await new Promise<void>((res) => execFile(FFMPEG, ['-y', '-loglevel', 'error', '-ss', String(first.srcIn), '-i', first.path, '-frames:v', '1', '-vf', 'scale=640:-2', path.join(out, 'draft_cover.jpg')], () => res()));
  return { dir: out, videos: M.videos.length, audios: M.audios.length, template: path.basename(template.dir) };
}

/** Chep thu muc ban nhap vao thu muc Drafts cua CapCut (CapCut nen DONG khi chep). */
export function installCapcutDraft(draftDir: string, draftsDir = capcutDraftsDir()): string {
  const dest = path.join(draftsDir, path.basename(draftDir));
  if (fs.existsSync(dest)) throw new Error(`CapCut da co ban nhap ten nay: ${dest}`);
  fs.cpSync(draftDir, dest, { recursive: true });
  return dest;
}
