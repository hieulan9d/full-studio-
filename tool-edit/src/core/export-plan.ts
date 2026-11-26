// Ke hoach xuat timeline sang phan mem khac (Premiere, DaVinci Resolve, CapCut, After Effects, EDL). Thuan tuy, khong dung file/GPU.
// Phan chuyen duoc nguyen ban (clip video/anh/am thanh + vi tri/ti le/xoay/do duc + keyframe) di thang; phan KHONG co tuong ung
// (chu gradient/animator, hinh vector, hieu ung lop, chinh mau, matte, che do tron, doi toc do ma phan mem dich khong co) duoc dua vao
// MOT lop video trong suot ("lop phu") do Tool Edit render san. Xem CHUC-NANG.md F-97.
import { resolveClip } from './anim';
import type { Clip, Media, Project, Transform } from './schema';
import { timelineEnd } from './schema';
import { isIdentity } from './grade';
import { isVariableSpeed } from './speed';

export type ExportTarget = 'premiere' | 'resolve' | 'capcut' | 'ae' | 'edl';
export const TARGETS: { id: ExportTarget; label: string; files: string; note: string }[] = [
  { id: 'premiere', label: 'Premiere Pro', files: '.xml (Final Cut Pro 7 XML / xmeml) + lớp phủ .mov', note: 'Premiere: File → Import, chọn file .xml.' },
  { id: 'resolve', label: 'DaVinci Resolve', files: '.fcpxml + .xml + lớp phủ .mov', note: 'Resolve: File → Import → Timeline…, chọn .fcpxml (hoặc .xml).' },
  { id: 'capcut', label: 'CapCut (bản nháp)', files: 'thư mục bản nháp (draft_content.json) + lớp phủ .mov', note: 'Cần có sẵn một bản nháp CapCut trên máy làm khuôn. Đóng CapCut, chép thư mục bản nháp vào thư mục Drafts, mở lại CapCut.' },
  { id: 'ae', label: 'After Effects', files: 'script .jsx + lớp phủ .mov', note: 'After Effects: File → Scripts → Run Script File…, chọn .jsx (dựng lại comp).' },
  { id: 'edl', label: 'EDL (CMX3600)', files: '.edl', note: 'Chỉ có điểm cắt của clip video + âm thanh (không biến đổi, không lớp phủ). Dùng cho mọi phần mềm.' },
];

/** Mot mau bien doi (da giai keyframe) tai thoi diem t tu dau clip. cx,cy = tam hop (px khung); s = ti le tong so voi px nguon (fit*scale). */
export interface Sample {
  t: number;
  cx: number;
  cy: number;
  s: number;
  rot: number;
  op: number;
}

export interface PlanItem {
  id: string;
  name: string;
  path: string;
  kind: 'video' | 'image' | 'audio';
  track: string; // id track trong Tool Edit
  start: number; // giay tren timeline
  dur: number; // giay tren timeline
  srcIn: number; // giay trong nguon
  speed: number;
  volume: number;
  hasAudio: boolean;
  mediaW: number;
  mediaH: number;
  mediaDur: number;
  transform: Transform;
  fitContain: number; // ti le "vua khung" (contain) px nguon -> px khung: phan mem dich tinh scale 100% theo day
  samples: Sample[]; // 1 mau neu khong keyframe; nhieu mau (tai moi moc keyframe cua x/y/scale/rotation/opacity) neu co
  animated: boolean;
  volumeKf: boolean;
  easing: boolean; // co keyframe dung duong cong khac tuyen tinh (phan mem dich chi nhan tuyen tinh)
}

export interface PlanTrack {
  id: string;
  name: string;
  items: PlanItem[];
}

export interface Plan {
  target: ExportTarget;
  name: string;
  fps: number;
  width: number;
  height: number;
  aspect: string;
  duration: number;
  video: PlanTrack[]; // duoi len tren
  audio: PlanTrack[];
  overlay: { needed: boolean; clipIds: string[]; ranges: [number, number][]; usesOnTop: boolean };
  warnings: string[];
}

const NAME = (p: string) => p.split(/[\\/]/).pop() ?? p;
const TF_KEYS = ['x', 'y', 'scale', 'rotation', 'opacity'] as const;

function fitFor(tf: Transform, W: number, H: number, mw: number, mh: number): number {
  if (!mw || !mh) return 1;
  return tf.fit === 'cover' ? Math.max(W / mw, H / mh) : Math.min(W / mw, H / mh);
}

/** Cung cong thuc voi Renderer.layerRect (lop media, khong inset): tam hop + ti le tong. */
export function mediaPlacement(tf: Transform, W: number, H: number, mw: number, mh: number) {
  const s = fitFor(tf, W, H, mw, mh) * tf.scale;
  const sw = mw * s,
    sh = mh * s;
  const m = (tf.margin ?? 0.06) * Math.min(W, H);
  const ah = tf.anchorH ?? 'center',
    av = tf.anchorV ?? 'middle';
  const ax = ah === 'left' ? m : ah === 'right' ? W - m : W / 2;
  const ay = av === 'top' ? m : av === 'bottom' ? H - m : H / 2;
  const cx = ax + tf.x * W + (ah === 'left' ? sw / 2 : ah === 'right' ? -sw / 2 : 0);
  const cy = ay + tf.y * H + (av === 'top' ? sh / 2 : av === 'bottom' ? -sh / 2 : 0);
  return { cx, cy, s, sw, sh };
}

function samplesOf(c: Clip, W: number, H: number, mw: number, mh: number): { samples: Sample[]; animated: boolean } {
  const times = new Set<number>();
  for (const k of TF_KEYS) for (const q of c.keyframes?.[`transform.${k}`] ?? []) times.add(Math.round(q.t * 1e6) / 1e6);
  const ts = times.size ? [...times].sort((a, b) => a - b) : [0];
  const samples = ts.map((t) => {
    const tf = resolveClip(c, Math.min(c.duration, Math.max(0, t))).transform;
    const pl = mediaPlacement(tf, W, H, mw, mh);
    return { t, cx: pl.cx, cy: pl.cy, s: pl.s, rot: tf.rotation, op: tf.opacity };
  });
  return { samples, animated: times.size > 0 };
}

/** Lý do clip video/anh KHONG chuyen nguyen ban duoc sang phan mem dich (null = chuyen duoc). */
export function nonNativeReason(c: Clip, m: Media | undefined, target: ExportTarget): string | null {
  if (c.src.type === 'text') return 'chữ';
  if (c.src.type === 'shape') return 'hình vector';
  if (c.src.type === 'chart') return 'biểu đồ';
  if (c.src.type === 'gen') return 'nền sinh tự động';
  if (!m) return 'thiếu media';
  if (target === 'edl' && m.kind === 'image') return 'ảnh';
  if (c.matte) return 'tách nền (matte)';
  if (c.grade && !isIdentity(c.grade)) return 'chỉnh màu';
  if (c.fx && Object.keys(c.fx).length) return 'hiệu ứng lớp';
  if (c.blend && c.blend !== 'normal') return 'chế độ trộn';
  if (c.transition) return 'chuyển cảnh';
  if (c.transform.rotX || c.transform.rotY) return 'xoay 3D';
  if (isVariableSpeed(c)) return 'speed ramp';
  if (Math.abs((c.speed ?? 1) - 1) > 1e-9 && target !== 'capcut') return 'đổi tốc độ';
  if (Object.keys(c.keyframes ?? {}).some((k) => k.startsWith('fx.') || k.startsWith('text.') || k.startsWith('shape.'))) return 'keyframe hiệu ứng';
  if (target === 'capcut' && m.kind === 'image') return 'ảnh (CapCut: ghi vào lớp phủ)';
  return null;
}

export function buildPlan(p: Project, target: ExportTarget, aspect: '9:16' | '16:9' | 'project' = 'project'): Plan {
  const big = Math.max(p.width, p.height),
    small = Math.min(p.width, p.height);
  const [W, H] = aspect === '16:9' ? [big, small] : aspect === '9:16' ? [small, big] : [p.width, p.height];
  const warnings: string[] = [];
  const media = new Map(p.media.map((m) => [m.id, m]));
  const video: PlanTrack[] = [];
  const audio: PlanTrack[] = [];
  const overlayIds: string[] = [];
  const overlayReasons = new Map<string, number>();
  let hasEase = false;
  let volKf = false;

  for (const tr of p.tracks) {
    const clips = p.clips.filter((c) => c.track === tr.id && !c.disabled).sort((a, b) => a.start - b.start);
    const pt: PlanTrack = { id: tr.id, name: tr.name, items: [] };
    for (const c of clips) {
      if (tr.kind === 'video') {
        const m = c.src.type === 'media' ? media.get(c.src.mediaId) : undefined;
        const why = nonNativeReason(c, m, target);
        if (why) {
          overlayIds.push(c.id);
          overlayReasons.set(why, (overlayReasons.get(why) ?? 0) + 1);
          continue;
        }
        const med = m!;
        const speed = c.speed ?? 1;
        let ease = false;
        for (const k of TF_KEYS) {
          const ks = c.keyframes?.[`transform.${k}`];
          if (ks?.length && ks.some((q, i) => i < ks.length - 1 && q.ease && !isLinear(q.ease))) ease = true;
        }
        const sm = samplesOf(c, W, H, med.width, med.height);
        if (ease) hasEase = true;
        pt.items.push({
          id: c.id, name: NAME(med.path), path: med.path, kind: med.kind === 'image' ? 'image' : 'video', track: tr.id, start: c.start, dur: c.duration, srcIn: c.in, speed, volume: c.volume,
          hasAudio: med.hasAudio, mediaW: med.width, mediaH: med.height, mediaDur: med.duration, transform: c.transform, fitContain: fitFor({ ...c.transform, fit: 'contain' }, W, H, med.width, med.height), samples: sm.samples, animated: sm.animated,
          volumeKf: !!c.keyframes?.volume?.length, easing: ease,
        });
        if (c.keyframes?.volume?.length) volKf = true;
      } else {
        const med = c.src.type === 'media' ? media.get(c.src.mediaId) : undefined;
        if (!med) continue;
        if (c.keyframes?.volume?.length) volKf = true;
        pt.items.push({
          id: c.id, name: NAME(med.path), path: med.path, kind: 'audio', track: tr.id, start: c.start, dur: c.duration, srcIn: c.in, speed: c.speed ?? 1, volume: c.volume, hasAudio: true,
          mediaW: 0, mediaH: 0, mediaDur: med.duration, transform: c.transform, fitContain: 1, samples: [], animated: false, volumeKf: !!c.keyframes?.volume?.length, easing: false,
        });
      }
    }
    if (pt.items.length) (tr.kind === 'video' ? video : audio).push(pt);
  }

  // lop phu: cac khoang thoi gian co clip khong chuyen duoc
  const ranges: [number, number][] = [];
  for (const id of overlayIds) {
    const c = p.clips.find((x) => x.id === id)!;
    ranges.push([c.start, c.start + c.duration]);
  }
  ranges.sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  for (const r of ranges) {
    const last = merged[merged.length - 1];
    if (last && r[0] <= last[1] + 1e-6) last[1] = Math.max(last[1], r[1]);
    else merged.push([r[0], r[1]]);
  }
  // co clip chuyen duoc nam TREN clip phu (track cao hon) cung luc: lop phu se de len tren no
  let usesOnTop = false;
  const order = new Map(p.tracks.map((t, i) => [t.id, i]));
  for (const id of overlayIds) {
    const oc = p.clips.find((x) => x.id === id)!;
    for (const tr of video)
      for (const it of tr.items)
        if ((order.get(it.track) ?? 0) > (order.get(oc.track) ?? 0) && it.start < oc.start + oc.duration && it.start + it.dur > oc.start) usesOnTop = true;
  }

  if (overlayIds.length) {
    const why = [...overlayReasons].map(([k, n]) => `${k}: ${n}`).join('; ');
    warnings.push(`${overlayIds.length} clip không có tương ứng nguyên bản trong ${TARGETS.find((t) => t.id === target)!.label} (${why}) → được vẽ sẵn thành MỘT lớp video trong suốt đặt trên cùng; không sửa được nội dung/hiệu ứng ở phần mềm đích.`);
  }
  if (usesOnTop) warnings.push('Có clip video nằm TRÊN clip chữ/hiệu ứng cùng lúc: ở phần mềm đích lớp phủ luôn nằm trên cùng nên thứ tự chồng lớp có thể khác.');
  if (hasEase) warnings.push('Một số keyframe dùng đường cong ease/Bezier: phần mềm đích chỉ nhận nội suy tuyến tính (hoặc đường cong riêng của nó) nên chuyển động có thể khác nhẹ.');
  if (volKf) warnings.push('Keyframe âm lượng không được chuyển: dùng âm lượng cố định của clip.');
  if (target === 'edl' && (video.length || audio.length)) warnings.push('EDL chỉ có điểm cắt: không có biến đổi, keyframe, chữ, lớp phủ.');
  const noAudioSpeed = p.clips.some((c) => !c.disabled && c.src.type === 'media' && Math.abs((c.speed ?? 1) - 1) > 1e-9 && target !== 'capcut' && !isVariableSpeed(c));
  if (noAudioSpeed) warnings.push('Clip đổi tốc độ được vẽ vào lớp phủ (hình) và KHÔNG có tiếng của clip đó trong bản xuất.');

  const end = timelineEnd(p);
  return {
    target, name: p.name, fps: p.fps, width: W, height: H, aspect: W > H ? '16:9' : '9:16', duration: end, video, audio,
    overlay: { needed: overlayIds.length > 0 && target !== 'edl', clipIds: overlayIds, ranges: merged, usesOnTop },
    warnings,
  };
}

function isLinear(e: unknown): boolean {
  return !e || (e as { kind?: string }).kind === 'linear';
}

/** So khung cua lop phu can render (cac khoang co clip phu), de uoc tinh thoi gian. */
export function overlayFrameCount(plan: Plan): number {
  return plan.overlay.ranges.reduce((n, [a, b]) => n + Math.ceil((b - a) * plan.fps), 0);
}
