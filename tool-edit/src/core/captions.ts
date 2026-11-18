// Phu de tu loi thoai: moi nhom tu -> mot clip chu; moc vao cua tung tu khop dung loi noi. Thuan tuy, co test. Xem F-31.
import { mergeText, defaultText, type DeepPartialText } from './text';
import { clipWords, groupCaptions, type CaptionGroup } from './transcript';
import { DEFAULT_TRANSFORM, nextId, type Clip, type Project, type Track } from './schema';

export type CaptionStyleId = 'karaoke' | 'word-pop' | 'line-fade';

export interface CaptionOpts {
  style: CaptionStyleId;
  maxWords?: number;
  maxChars?: number;
  maxGap?: number;
  track?: string; // id track video; bo trong = tu chon/tao
  font?: string;
  size?: number;
  color?: string; // mau chu
  highlight?: string; // mau tu dang noi (karaoke)
  y?: number; // dich doc tu diem neo (ty le chieu cao khung)
  hold?: number; // giu nhom them sau tu cuoi (giay)
  weight?: number; // 100..900 (mac dinh theo kieu)
  maxWidth?: number; // ti le chieu rong khung; hep -> xuong dong nhieu (xep chong tung tu)
  lineHeight?: number;
}

export const CAPTION_STYLES: Record<CaptionStyleId, { name: string; description: string }> = {
  karaoke: { name: 'Karaoke', description: 'Cả nhóm hiện sẵn (mờ), từ đang nói sáng lên màu nhấn và nảy nhẹ; kế đến từ nói rồi trở về trắng.' },
  'word-pop': { name: 'Từng từ hiện', description: 'Mỗi từ trượt lên và hiện đúng lúc được nói (kiểu kit talking-head).' },
  'line-fade': { name: 'Cả dòng mờ dần', description: 'Cả nhóm hiện dần một lần khi từ đầu tiên được nói.' },
};

function styleText(o: CaptionOpts, times: number[]): DeepPartialText {
  const base: DeepPartialText = { font: o.font ?? 'Segoe UI Black', size: o.size ?? 96, weight: o.weight ?? 900, maxWidth: o.maxWidth ?? 0.88, lineHeight: o.lineHeight ?? 1.1 };
  const color = o.color ?? '#ffffff';
  if (o.style === 'karaoke') {
    return { ...base, fill: { type: 'solid', color }, stroke: { color: '#000000', width: 9, over: false }, shadow: { color: '#000000', opacity: 0.45, blur: 14, x: 0, y: 6 }, animator: { preset: 'karaoke', unit: 'word', duration: 0.12, stagger: 0, delay: 0, distance: 0, blur: 0, out: false, color: o.highlight ?? '#ffd166', times } };
  }
  if (o.style === 'word-pop') {
    return { ...base, italic: true, weight: o.weight ?? 700, size: o.size ?? 112, fill: { type: 'solid', color: o.color ?? '#5cf7e0' }, glow: { color: o.color ?? '#5cf7e0', radius: 14, strength: 1 }, animator: { preset: 'slide-up', unit: 'word', duration: 5 / 30, stagger: 0, delay: 0, distance: 30, blur: 12, out: false, color: '#ffd166', times } };
  }
  return { ...base, fill: { type: 'solid', color }, stroke: { color: '#000000', width: 8, over: false }, shadow: { color: '#000000', opacity: 0.45, blur: 14, x: 0, y: 6 }, animator: { preset: 'fade', unit: 'line', duration: 0.18, stagger: 0, delay: 0, distance: 0, blur: 0, out: false, color: '#ffd166', times: [0] } };
}

export const CAPTION_TAG = 'captions:';

export function captionClipsOf(p: Project, srcId: string): Clip[] {
  return p.clips.filter((c) => c.tag === CAPTION_TAG + srcId);
}

/** Chon track video cho phu de: track chi chua phu de (tai su dung), neu khong thi can tao moi. */
function pickTrack(p: Project, o: CaptionOpts, span: { s: number; e: number }, pending: Clip[]): { track: string; create?: Track } {
  const busy = (id: string) => [...p.clips.filter((c) => c.track === id), ...pending.filter((c) => c.track === id)].some((c) => span.s < c.start + c.duration - 1e-6 && c.start < span.e - 1e-6);
  if (o.track) return { track: o.track };
  for (const t of [...p.tracks].reverse()) {
    if (t.kind !== 'video') continue;
    const cs = p.clips.filter((c) => c.track === t.id);
    // tai su dung track chi chua phu de, hoac track "Phụ đề" dang trong (sau khi xoa phu de cu)
    if ((cs.length ? cs.every((c) => c.tag?.startsWith(CAPTION_TAG)) : t.name === 'Phụ đề' || t.name === 'Phu de') && !busy(t.id)) return { track: t.id };
  }
  const id = nextId(p, 'v');
  return { track: id, create: { id, kind: 'video', name: 'Phụ đề' } };
}

/**
 * Tao cac clip phu de cho clip nguon `src` (da co loi thoai). p KHONG co san clip phu de cu cua src (hay xoa truoc).
 * Tra loi neu khong the.
 */
export function buildCaptions(p: Project, src: Clip, o: CaptionOpts): { clips: Clip[]; track?: Track } | string {
  const words = clipWords(p, src);
  if (!words.length) return `clip ${src.id}: chua co loi thoai trong doan dang dung (chay transcribe, hoac clip khong chua tieng noi)`;
  const groups: CaptionGroup[] = groupCaptions(words, { maxWords: o.maxWords, maxChars: o.maxChars, maxGap: o.maxGap });
  const hold = o.hold ?? 0.35;
  const clips: Clip[] = [];
  let created: Track | undefined;
  let track: string | undefined = o.track;
  const used = new Set(p.clips.map((c) => c.id));
  let n = 0;
  const newId = () => {
    let id: string;
    do id = 'c' + ++n;
    while (used.has(id));
    used.add(id);
    return id;
  };
  groups.forEach((g, i) => {
    const nextStart = i + 1 < groups.length ? groups[i + 1].start : Infinity;
    const end = Math.min(nextStart - 1e-3, g.end + hold);
    const start = g.start;
    const duration = Math.max(0.1, end - start);
    const times = g.words.map((w) => Math.round((w.s - start) * 1e6) / 1e6);
    const text = mergeText(defaultText(), { ...styleText(o, times), content: g.words.map((w) => w.w).join(' ') });
    if (!track) {
      const pick = pickTrack(p, o, { s: groups[0].start, e: groups[groups.length - 1].end + hold }, clips);
      track = pick.track;
      created = pick.create;
    }
    clips.push({
      id: newId(),
      track,
      src: { type: 'text', text },
      start: Math.round(start * 1e6) / 1e6,
      duration: Math.round(duration * 1e6) / 1e6,
      in: 0,
      volume: 1,
      transform: { ...DEFAULT_TRANSFORM, anchorV: 'bottom', y: o.y ?? -0.2 },
      keyframes: {},
      tag: CAPTION_TAG + src.id,
      captionOpts: { ...o, track: undefined },
    });
  });
  return { clips, track: created };
}
