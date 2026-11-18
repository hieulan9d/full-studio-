// Toan thuan tuy cua timeline (khong DOM): snap, keo, trim, chen clip, dinh dang thoi gian. Co test.
import type { Clip, Media, Project, Track } from '../core/schema';

export const MIN_DURATION_FRAMES = 1;

export interface ClipRect {
  start: number;
  duration: number;
  in: number;
  track: string;
}

/** Cac moc de bam dinh: 0, playhead, mep cac clip khac. */
export function snapPoints(p: Project, excludeIds: Set<string>, playhead: number): number[] {
  const pts = new Set<number>([0, playhead]);
  for (const c of p.clips) {
    if (excludeIds.has(c.id)) continue;
    pts.add(round(c.start));
    pts.add(round(c.start + c.duration));
  }
  for (const m of p.markers ?? []) pts.add(round(m.t)); // marker (nhip, SFX) cung la diem bam
  return [...pts];
}

const round = (x: number) => Math.round(x * 1e6) / 1e6;

/** Bam gia tri vao moc gan nhat neu trong nguong. */
export function snapValue(v: number, points: number[], threshold: number): { value: number; snapped: boolean } {
  let best = v,
    bd = threshold + 1e-12,
    hit = false;
  for (const p of points) {
    const d = Math.abs(p - v);
    if (d < bd) {
      bd = d;
      best = p;
      hit = true;
    }
  }
  return { value: best, snapped: hit };
}

/** Keo mot nhom clip: bam theo mep trai HOAC mep phai cua bat ky clip nao trong nhom. Tra ve dt cuoi cung. */
export function snapMoveDelta(group: ClipRect[], dt: number, points: number[], threshold: number): { dt: number; snapped: boolean } {
  let bestDt = dt,
    bd = threshold + 1e-12,
    hit = false;
  for (const g of group) {
    for (const edge of [g.start, g.start + g.duration]) {
      for (const p of points) {
        const d = Math.abs(p - (edge + dt));
        if (d < bd) {
          bd = d;
          bestDt = p - edge;
          hit = true;
        }
      }
    }
  }
  // khong cho keo quanh nhom ra truoc 0
  const minStart = Math.min(...group.map((g) => g.start));
  if (minStart + bestDt < 0) bestDt = -minStart;
  return { dt: round(bestDt), snapped: hit };
}

/** Trim canh trai: doi `start`, giu mep phai, `in` tang cung luong. Gioi han: in>=0, duration>=1 khung. */
export function trimLeft(c: ClipRect, newStart: number, fps: number, speed = 1): ClipRect {
  const minDur = MIN_DURATION_FRAMES / fps;
  const end = c.start + c.duration;
  let s = Math.min(newStart, end - minDur);
  s = Math.max(s, c.start - c.in / speed); // khong keo qua dau nguon (in >= 0); co toc do: 1 giay timeline = `speed` giay nguon
  s = Math.max(s, 0);
  return { ...c, start: round(s), duration: round(end - s), in: round(Math.max(0, c.in + (s - c.start) * speed)) };
}

/** Trim canh phai. maxDuration = do dai nguon con lai tinh tu `in` (Infinity voi anh). */
export function trimRight(c: ClipRect, newEnd: number, fps: number, maxDuration: number): ClipRect {
  const minDur = MIN_DURATION_FRAMES / fps;
  let d = Math.max(minDur, newEnd - c.start);
  d = Math.min(d, maxDuration);
  return { ...c, duration: round(d) };
}

export function mediaOf(p: Project, c: Clip): Media | undefined {
  return c.src.type === 'media' ? p.media.find((m) => m.id === (c.src as { mediaId: string }).mediaId) : undefined;
}

/** Do dai nguon con lai de trim canh phai (in + duration <= duration nguon). */
export function maxDurationFor(p: Project, c: Clip): number {
  const m = mediaOf(p, c);
  if (!m || m.kind === 'image') return Infinity;
  if (c.keyframes?.speed?.length) return c.duration; // speed ramp: khong keo dai (se vuot nguon); xoa keyframe toc do neu muon doi
  return Math.max(0, (m.duration - c.in) / (c.speed ?? 1));
}

/** Vi tri dat som nhat >= start sao cho [pos, pos+duration] khong chong clip nao tren track. */
export function findFreeStart(p: Project, trackId: string, start: number, duration: number, excludeIds: Set<string> = new Set()): number {
  const cs = p.clips.filter((c) => c.track === trackId && !excludeIds.has(c.id)).sort((a, b) => a.start - b.start);
  let pos = Math.max(0, start);
  for (const c of cs) {
    if (pos + duration <= c.start + 1e-9) break; // vua truoc clip nay
    if (pos < c.start + c.duration - 1e-9) pos = c.start + c.duration;
  }
  return round(pos);
}

/** Track hop le cho mot media: video/anh -> track video; am thanh -> track audio. */
export function trackKindForMedia(m: Media): Track['kind'] {
  return m.kind === 'audio' ? 'audio' : 'video';
}

/** n id moi chua dung, khong trung nhau. */
export function freshIds(p: Project, prefix: string, n: number): string[] {
  const used = new Set([...p.clips.map((c) => c.id), ...p.media.map((m) => m.id), ...p.tracks.map((t) => t.id)]);
  const out: string[] = [];
  let k = 1;
  while (out.length < n) {
    const id = prefix + k++;
    if (!used.has(id)) out.push(id);
  }
  return out;
}

export function formatTime(t: number, fps: number): string {
  const total = Math.max(0, t);
  const m = Math.floor(total / 60);
  const s = Math.floor(total % 60);
  const f = Math.floor((total - Math.floor(total)) * fps + 1e-6);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}:${String(f).padStart(2, '0')}`;
}

/** Buoc vach chia thuoc (giay) de moi vach cach nhau >= minPx pixel. */
export function rulerStep(pxPerSec: number, minPx = 70): number {
  const steps = [1 / 30, 1 / 15, 1 / 6, 0.25, 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300, 600];
  for (const s of steps) if (s * pxPerSec >= minPx) return s;
  return 600;
}

/** Cac clip bi cat boi playhead (de split). Neu co chon: chi trong so da chon; khong thi clip tren cung (track video cao nhat). */
export function splitTargets(p: Project, selection: string[], t: number): Clip[] {
  const hit = (c: Clip) => t > c.start + 1e-6 && t < c.start + c.duration - 1e-6;
  if (selection.length) return p.clips.filter((c) => selection.includes(c.id) && hit(c));
  const order = new Map(p.tracks.map((tr, i) => [tr.id, i]));
  const under = p.clips.filter(hit).sort((a, b) => (order.get(b.track) ?? 0) - (order.get(a.track) ?? 0));
  return under.slice(0, 1);
}

/** Mo rong tap clip duoc chon: clip thuoc mot nhom (clip ghep) keo theo ca nhom. */
export function expandGroups(p: Project, ids: string[]): string[] {
  const groups = new Set(p.clips.filter((c) => ids.includes(c.id) && c.group).map((c) => c.group!));
  if (!groups.size) return ids;
  const out = new Set(ids);
  for (const c of p.clips) if (c.group && groups.has(c.group)) out.add(c.id);
  return [...out];
}

/** id nhom moi chua dung. */
export function newGroupId(p: Project): string {
  const used = new Set(p.clips.map((c) => c.group).filter(Boolean));
  let k = 1;
  while (used.has('g' + k)) k++;
  return 'g' + k;
}

/** Tên track mới: số nhỏ nhất chưa dùng ("Video 2", "Audio 3"…), tránh trùng khi track giữa đã bị xóa. */
export function nextTrackName(p: Project, kind: 'video' | 'audio', extra: string[] = []): string {
  const base = kind === 'video' ? 'Video' : 'Audio';
  const used = new Set([...p.tracks.map((t) => t.name), ...extra]);
  let n = 1;
  while (used.has(`${base} ${n}`)) n++;
  return `${base} ${n}`;
}
