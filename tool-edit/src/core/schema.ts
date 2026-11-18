// Schema du an Tool Edit, phien ban 6 (giai doan 6: hieu ung lop, blend, hinh vector). Xem CHUC-NANG.md F-03.
import { validateKeyframes, type Ease, type Keyframe, type KeyframeMap } from './anim';
import { mergeFx, validateFx, validateShape, type BlendMode, BLEND_MODES, type DeepPartialFx, type Fx, type ShapeSpec } from './fx';
import { mergeGrade, validateGrade, type DeepPartialGrade, type Grade } from './grade';
import { SPEED_MAX, SPEED_MIN, srcSpan } from './speed';
import type { CaptionOpts } from './captions';
import { validateText, type DeepPartialText, type TextSpec } from './text';
import { validateTranscript, type DuckOpts, type Range, type Transcript } from './transcript';

export const SCHEMA_VERSION = 6;

export type GenKind = 'ramp' | 'bars' | 'stress';
export const GEN_KINDS: GenKind[] = ['ramp', 'bars', 'stress'];

export type AnchorH = 'left' | 'center' | 'right';
export type AnchorV = 'top' | 'middle' | 'bottom';

export interface Transform {
  x: number; // dich ngang so voi diem neo, don vi = ty le chieu rong khung
  y: number; // dich doc so voi diem neo, ty le chieu cao khung
  scale: number; // 1 = vua khung theo fit (video/anh) hoac kich thuoc goc (chu)
  rotation: number; // do
  opacity: number; // 0..1
  fit: 'contain' | 'cover';
  anchorH: AnchorH; // diem neo tren khung (tu co theo 9:16 / 16:9)
  anchorV: AnchorV;
  margin: number; // le an toan (ty le canh ngan) khi neo vao canh/goc
}
export const DEFAULT_TRANSFORM: Transform = { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1, fit: 'contain', anchorH: 'center', anchorV: 'middle', margin: 0.06 };

export interface MediaCache {
  status: 'pending' | 'ready' | 'error';
  width?: number;
  height?: number;
  frames?: number;
  fps?: number; // fps cua cache (= fps du an luc nhap)
  audio?: 'pending' | 'ready' | 'error' | 'none'; // WAV 48k stereo da giai ma san de phat/waveform
  error?: string;
}

export interface Beats {
  bpm: number;
  times: number[]; // giay trong NGUON
  model: string;
}

export type MarkerKind = 'beat' | 'user' | 'sfx';
export interface Marker {
  t: number; // giay tren timeline
  kind: MarkerKind;
  label?: string;
}

export interface Media {
  id: string;
  path: string;
  kind: 'video' | 'audio' | 'image';
  duration: number; // giay
  width: number;
  height: number;
  fps: number;
  hasAudio: boolean;
  cache?: MediaCache; // du lieu dan xuat, khong vao lich su hoan tac
  transcript?: Transcript; // loi thoai tung tu (whisper / nhap / sua tay), moc theo NGUON
  beats?: Beats; // nhip nhac (phan tich)
  role?: 'matte'; // media phu: video xam la matte alpha cua mot media khac (an khoi kho media)
  matte?: string; // id media matte (tach nen) cua media nay
}

/** Cach ap matte len mot clip: lo/hi = muc den/trang (cat bot vien mo), feather = lam mem vien (texel matte). */
export interface MatteOpts {
  lo: number;
  hi: number;
  feather: number;
}
export const DEFAULT_MATTE: MatteOpts = { lo: 0, hi: 1, feather: 0 };

export interface Track {
  id: string;
  kind: 'video' | 'audio';
  name: string;
}

export type Source = { type: 'media'; mediaId: string } | { type: 'gen'; kind: GenKind; param: number } | { type: 'text'; text: TextSpec } | { type: 'shape'; shape: ShapeSpec };

export interface Clip {
  id: string;
  track: string;
  src: Source;
  start: number; // giay tren timeline
  duration: number; // giay tren timeline
  in: number; // giay trong nguon (trim dau)
  volume: number; // 0..1+ (am thanh cua clip)
  transform: Transform;
  keyframes: KeyframeMap; // thoi gian tinh tu DAU CLIP
  tag?: string; // 'captions:<clipId>' (phu de sinh tu clip) | 'sfx:<su kien>' (SFX tu goi y)
  captionOpts?: CaptionOpts; // tuy chon da dung de sinh phu de (de tao lai)
  speed?: number; // toc do phat co dinh (1 = binh thuong); co the keyframe thuoc tinh 'speed' de lam speed ramp
  matte?: MatteOpts; // co = chi hien phan nguoi (matte cua media), nen trong suot
  grade?: Grade; // chinh mau (clip video/anh)
  fx?: Fx; // hieu ung lop: blur, glow, bong, bo goc, vignette, wipe
  blend?: BlendMode; // che do tron voi lop duoi (mac dinh normal)
  disabled?: boolean; // vo hieu hoa (nhu CapCut): giu tren timeline nhung khong hien hinh, khong phat tieng, khong xuat
  group?: string; // clip ghep: cac clip cung `group` duoc chon / keo / xoa cung nhau (huy ghep = go truong nay)
}

export interface HistoryEntry {
  seq: number;
  source: string; // 'human' hoac 'ai:<ten>'
  time: string;
  ops: Op[];
}

export interface Project {
  schema: number;
  name: string;
  fps: number;
  width: number;
  height: number;
  colorSpace: 'rec709';
  media: Media[];
  tracks: Track[]; // thu tu: phan tu dau = lop duoi cung
  clips: Clip[];
  markers: Marker[]; // danh dau tren timeline (nhip, SFX, nguoi dung): cung la diem bam (snap)
  history: HistoryEntry[];
}

export type ClipPatch = Partial<Pick<Clip, 'track' | 'start' | 'duration' | 'in' | 'volume' | 'disabled'>>;

export type Op =
  | { op: 'add_media'; media: Media }
  | { op: 'add_track'; track: Track }
  | { op: 'remove_track'; id: string } // chi go duoc track da trong (khong con clip)
  | { op: 'add_clip'; clip: Clip }
  | { op: 'remove_clip'; id: string }
  | { op: 'set_clip'; id: string; patch: ClipPatch }
  | { op: 'set_transform'; id: string; patch: Partial<Transform> }
  | { op: 'split_clip'; id: string; at: number; newId: string }
  | { op: 'ripple_delete'; id: string }
  | { op: 'set_text'; id: string; patch: DeepPartialText }
  | { op: 'set_keyframes'; id: string; prop: string; keys: Keyframe[] }
  | { op: 'set_keyframe'; id: string; prop: string; t: number; v: number; ease?: Ease; ease_preset?: string }
  | { op: 'remove_keyframe'; id: string; prop: string; t: number }
  | { op: 'apply_preset'; id: string; preset: string }
  | { op: 'set_transcript'; mediaId: string; transcript: Transcript }
  | { op: 'edit_word'; mediaId: string; index: number; text: string }
  | { op: 'remove_ranges'; id: string; ranges: Range[] } // cat cac doan (giay trong NGUON) khoi clip va keo lien
  | { op: 'generate_captions'; id: string; opts: CaptionOpts }
  | { op: 'remove_captions'; id: string }
  | { op: 'set_beats'; mediaId: string; beats: Beats }
  | { op: 'add_markers'; markers: Marker[] }
  | { op: 'clear_markers'; kind?: MarkerKind }
  | { op: 'duck_clip'; id: string; opts: DuckOpts }
  | { op: 'set_speed'; id: string; speed: number } // toc do co dinh; xoa keyframe speed neu co
  | { op: 'set_media_matte'; mediaId: string; matteId: string | null }
  | { op: 'set_clip_matte'; id: string; matte: MatteOpts | null }
  | { op: 'set_fx'; id: string; fx: DeepPartialFx | null } // gop; fx[ten] = null go mot hieu ung; fx = null go het
  | { op: 'set_blend'; id: string; blend: BlendMode }
  | { op: 'set_shape'; id: string; patch: import('./fx').DeepPartialShape }
  | { op: 'set_grade'; id: string; grade: DeepPartialGrade | null } // gop vao grade hien co; null = go grade
  | { op: 'group_clips'; ids: string[]; group: string } // ghep >= 2 clip thanh mot nhom (clip ghep)
  | { op: 'ungroup'; group: string }; // huy ghep: go nhom khoi moi clip

export function newProject(name = 'Chưa đặt tên'): Project {
  return {
    schema: SCHEMA_VERSION,
    name,
    fps: 30,
    width: 1080,
    height: 1920,
    colorSpace: 'rec709',
    media: [],
    tracks: [
      { id: 'v1', kind: 'video', name: 'Video 1' },
      { id: 'a1', kind: 'audio', name: 'Audio 1' },
    ],
    clips: [],
    markers: [],
    history: [],
  };
}

/** Chuyen du an cu len schema hien tai. v0 -> v1 (clip gen tren track v1) -> v2 (keyframe, neo vi tri, chu). */
export function migrate(raw: any): Project {
  if (raw.schema === SCHEMA_VERSION) return raw as Project;
  let p: any = raw;
  if (p.schema === 0) {
    const q = newProject(p.name);
    q.fps = p.fps;
    q.width = p.width;
    q.height = p.height;
    q.clips = (p.clips ?? []).map((c: any) => ({
      id: c.id,
      track: 'v1',
      src: { type: 'gen', kind: c.kind, param: c.param ?? 0 },
      start: c.start,
      duration: c.duration,
      in: 0,
      volume: 1,
      transform: { ...DEFAULT_TRANSFORM },
    }));
    q.history = p.history ?? [];
    p = q;
    p.schema = 1;
  }
  if (p.schema === 1) {
    for (const c of p.clips) {
      c.keyframes = c.keyframes ?? {};
      c.transform = { ...DEFAULT_TRANSFORM, ...(c.transform ?? {}) };
    }
    p.schema = 2;
  }
  if (p.schema === 2) {
    p.markers = p.markers ?? [];
    p.schema = 3;
  }
  if (p.schema === 3) p.schema = 4; // v4: chi them truong tuy chon (speed, matte, role)
  if (p.schema === 4) p.schema = 5; // v5: chi them truong tuy chon (grade)
  if (p.schema === 5) {
    p.schema = 6; // v6: chi them truong tuy chon (fx, blend, shape)
    return p as Project;
  }
  throw new Error(`schema ${raw.schema} khong ho tro (hien tai ${SCHEMA_VERSION})`);
}

const EPS = 1e-6;

export function validate(p: Project): string[] {
  const errs: string[] = [];
  if (p.schema !== SCHEMA_VERSION) errs.push(`schema ${p.schema} khong khop ${SCHEMA_VERSION}`);
  if (!(p.fps > 0)) errs.push('fps phai > 0');
  if (!(p.width > 0 && p.height > 0)) errs.push('kich thuoc phai > 0');

  const mediaIds = new Set<string>();
  for (const m of p.media) {
    if (mediaIds.has(m.id)) errs.push(`media id trung: ${m.id}`);
    mediaIds.add(m.id);
  }
  const trackKind = new Map<string, Track['kind']>();
  for (const t of p.tracks) {
    if (trackKind.has(t.id)) errs.push(`track id trung: ${t.id}`);
    trackKind.set(t.id, t.kind);
  }

  const seen = new Set<string>();
  for (const c of p.clips) {
    if (seen.has(c.id)) errs.push(`clip id trung: ${c.id}`);
    seen.add(c.id);
    if (!trackKind.has(c.track)) errs.push(`clip ${c.id}: khong co track ${c.track}`);
    if (!(c.duration > 0)) errs.push(`clip ${c.id}: duration phai > 0`);
    if (!(c.start >= 0)) errs.push(`clip ${c.id}: start phai >= 0`);
    if (!(c.in >= 0)) errs.push(`clip ${c.id}: in phai >= 0`);
    const tf = c.transform;
    if (![tf.x, tf.y, tf.scale, tf.rotation, tf.opacity, tf.margin].every(Number.isFinite)) errs.push(`clip ${c.id}: transform phai la so huu han`);
    if (!['left', 'center', 'right'].includes(tf.anchorH) || !['top', 'middle', 'bottom'].includes(tf.anchorV)) errs.push(`clip ${c.id}: anchorH/anchorV khong hop le`);
    if (c.disabled !== undefined && typeof c.disabled !== 'boolean') errs.push(`clip ${c.id}: disabled phai la true/false`);
    if (c.group !== undefined && (typeof c.group !== 'string' || !c.group)) errs.push(`clip ${c.id}: group phai la chuoi khong rong`);
    if (c.fx) errs.push(...validateFx(c.fx, `clip ${c.id}.fx`));
    if (c.blend !== undefined && !BLEND_MODES.includes(c.blend)) errs.push(`clip ${c.id}: blend phai la ${BLEND_MODES.join('|')}`);
    if (c.src.type === 'shape') {
      if (trackKind.get(c.track) === 'audio') errs.push(`clip ${c.id}: clip hinh phai nam tren track video`);
      errs.push(...validateShape(c.src.shape, `clip ${c.id}.shape`));
    } else if (c.src.type === 'gen') {
      if (!GEN_KINDS.includes(c.src.kind)) errs.push(`clip ${c.id}: kind la ${c.src.kind}`);
    } else if (c.src.type === 'text') {
      if (trackKind.get(c.track) === 'audio') errs.push(`clip ${c.id}: clip chu phai nam tren track video`);
      errs.push(...validateText(c.src.text, `clip ${c.id}.text`));
    } else {
      const m = p.media.find((x) => x.id === (c.src as { mediaId: string }).mediaId);
      if (!m) errs.push(`clip ${c.id}: khong co media ${(c.src as { mediaId: string }).mediaId}`);
      else if (m.kind !== 'image' && c.in + c.duration > m.duration + 0.5 / p.fps) errs.push(`clip ${c.id}: in+duration (${(c.in + c.duration).toFixed(3)}s) vuot do dai media (${m.duration.toFixed(3)}s)`);
    }
    errs.push(...validateKeyframes(c));
    if (c.speed !== undefined && !(Number.isFinite(c.speed) && c.speed >= SPEED_MIN && c.speed <= SPEED_MAX)) errs.push(`clip ${c.id}: speed phai trong ${SPEED_MIN}..${SPEED_MAX}`);
    if (c.src.type === 'media' && (c.speed !== undefined || c.keyframes?.speed?.length)) {
      const m = p.media.find((x) => x.id === (c.src as { mediaId: string }).mediaId);
      if (m && m.kind !== 'image' && c.in + srcSpan(c) > m.duration + 0.5 / p.fps) errs.push(`clip ${c.id}: voi toc do hien tai clip dung toi giay ${(c.in + srcSpan(c)).toFixed(3)} cua nguon, vuot do dai media (${m.duration.toFixed(3)}s)`);
    }
    if (c.grade) {
      if (c.src.type !== 'media') errs.push(`clip ${c.id}: chi clip video/anh moi chinh mau duoc`);
      else errs.push(...validateGrade(c.grade, `clip ${c.id}.grade`));
    }
    if (c.matte) {
      const mo = c.matte;
      if (![mo.lo, mo.hi, mo.feather].every(Number.isFinite) || !(mo.lo >= 0 && mo.hi <= 1 && mo.lo < mo.hi) || mo.feather < 0 || mo.feather > 16) errs.push(`clip ${c.id}: matte can 0 <= lo < hi <= 1 va feather 0..16`);
      const mm = c.src.type === 'media' ? p.media.find((x) => x.id === (c.src as { mediaId: string }).mediaId) : undefined;
      if (!mm?.matte) errs.push(`clip ${c.id}: co matte nhung media chua duoc tach nen`);
    }
  }
  for (const m of p.media) if (m.transcript) errs.push(...validateTranscript(m.transcript, `media ${m.id}.transcript`));
  for (const m of p.media) {
    if (m.matte) {
      const mm = p.media.find((x) => x.id === m.matte);
      if (!mm || mm.role !== 'matte') errs.push(`media ${m.id}: matte ${m.matte} khong ton tai hoac khong phai media matte`);
    }
  }
  for (const mk of p.markers ?? []) if (!Number.isFinite(mk.t) || mk.t < 0 || !['beat', 'user', 'sfx'].includes(mk.kind)) errs.push(`marker khong hop le: ${JSON.stringify(mk)}`);
  // khong cho clip chong len nhau tren cung mot track
  for (const t of p.tracks) {
    const cs = p.clips.filter((c) => c.track === t.id).sort((a, b) => a.start - b.start);
    for (let i = 1; i < cs.length; i++) {
      if (cs[i].start < cs[i - 1].start + cs[i - 1].duration - EPS) errs.push(`track ${t.id}: clip ${cs[i - 1].id} va ${cs[i].id} chong nhau`);
    }
  }
  return errs;
}

/** id ke tiep dang `<prefix><so>` chua dung trong du an (clip: 'c', media: 'm', track: 'v'/'a'). */
export function nextId(p: Project, prefix: string): string {
  const all = [...p.clips.map((c) => c.id), ...p.media.map((m) => m.id), ...p.tracks.map((t) => t.id)];
  let max = 0;
  for (const id of all) {
    const rest = id.startsWith(prefix) ? id.slice(prefix.length) : '';
    if (rest !== '' && /^[0-9]+$/.test(rest)) max = Math.max(max, Number(rest));
  }
  return prefix + (max + 1);
}

export function timelineEnd(p: Project): number {
  return p.clips.reduce((m, c) => Math.max(m, c.start + c.duration), 0);
}
