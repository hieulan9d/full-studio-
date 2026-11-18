// Loi thoai (transcript tung tu), anh xa moc thoi gian nguon -> timeline, gom nhom phu de, khoang lang, duck nhac. Thuan tuy, co test. Xem F-30..F-36.
import type { Keyframe } from './anim';
import { EASE_PRESETS } from './anim';
import type { Clip, Project } from './schema';

export interface Word {
  w: string; // chu (co the kem dau cau)
  s: number; // giay trong NGUON (media)
  e: number;
  p?: number; // do tin cay 0..1
}

export interface Transcript {
  lang: string;
  model: string;
  duration: number;
  words: Word[];
  source: 'whisper' | 'import' | 'manual';
}

export interface Range {
  s: number;
  e: number;
}

const r6 = (x: number) => Math.round(x * 1e6) / 1e6;

export function validateTranscript(t: Transcript, label: string): string[] {
  const e: string[] = [];
  if (!Array.isArray(t.words)) return [`${label}: words phai la mang`];
  if (t.words.length > 50000) e.push(`${label}: qua nhieu tu (>50000)`);
  let prev = -Infinity;
  t.words.forEach((w, i) => {
    if (typeof w.w !== 'string' || !Number.isFinite(w.s) || !Number.isFinite(w.e) || w.e < w.s - 1e-6 || w.s < 0) e.push(`${label}.words[${i}]: tu/thoi gian khong hop le`);
    if (w.s < prev - 1e-6) e.push(`${label}.words[${i}]: thoi gian phai tang dan`);
    prev = w.s;
  });
  return e.slice(0, 5);
}

/** Moc nguon -> moc timeline cua mot clip. (Toc do 1x; speed ramp o giai doan 4 se sua ham nay.) */
export function srcToTimeline(c: Clip, t: number): number {
  return r6(c.start + (t - c.in));
}

export function mediaTranscript(p: Project, c: Clip): Transcript | undefined {
  if (c.src.type !== 'media') return undefined;
  const id = c.src.mediaId;
  return p.media.find((m) => m.id === id)?.transcript;
}

export interface TlWord {
  w: string;
  s: number; // timeline
  e: number;
  idx: number; // chi so trong transcript.words
}

/** Cac tu cua clip, doi sang thoi gian timeline, cat theo phan clip dang dung (tu co diem giua nam trong cua so nguon). */
export function clipWords(p: Project, c: Clip): TlWord[] {
  const tr = mediaTranscript(p, c);
  if (!tr) return [];
  const lo = c.in,
    hi = c.in + c.duration;
  const out: TlWord[] = [];
  tr.words.forEach((w, idx) => {
    const mid = (w.s + w.e) / 2;
    if (mid < lo - 1e-9 || mid >= hi - 1e-9) return;
    out.push({ w: w.w, s: srcToTimeline(c, Math.max(w.s, lo)), e: srcToTimeline(c, Math.min(w.e, hi)), idx });
  });
  return out;
}

/** Cac khoang CO TIENG NOI tren timeline (gop khoang cach < mergeGap). exclude = clip bo qua (vd clip nhac dang duck). */
export function speechRanges(p: Project, opts: { mergeGap?: number; exclude?: Set<string> } = {}): Range[] {
  const gap = opts.mergeGap ?? 0.35;
  const all: Range[] = [];
  for (const c of p.clips) {
    if (opts.exclude?.has(c.id) || c.volume <= 0) continue;
    for (const w of clipWords(p, c)) all.push({ s: w.s, e: w.e });
  }
  all.sort((a, b) => a.s - b.s);
  const out: Range[] = [];
  for (const r of all) {
    const last = out[out.length - 1];
    if (last && r.s - last.e <= gap) last.e = Math.max(last.e, r.e);
    else out.push({ s: r.s, e: r.e });
  }
  return out;
}

export interface CaptionGroup {
  words: TlWord[];
  start: number;
  end: number;
}

export interface GroupOpts {
  maxWords?: number;
  maxChars?: number;
  maxGap?: number; // ngat nhom neu im lang lau hon
  maxDur?: number;
}

const SENTENCE_END = ['.', '!', '?', '…'];
const CLAUSE_END = [',', ';', ':'];

/** Gom tu thanh nhom phu de: toi da so tu/ky tu, ngat khi im lang lau, ket thuc cau, hoac dai qua. */
export function groupCaptions(words: TlWord[], o: GroupOpts = {}): CaptionGroup[] {
  const maxWords = o.maxWords ?? 4,
    maxChars = o.maxChars ?? 26,
    maxGap = o.maxGap ?? 0.6,
    maxDur = o.maxDur ?? 3.5;
  const groups: CaptionGroup[] = [];
  let cur: TlWord[] = [];
  const flush = () => {
    if (cur.length) groups.push({ words: cur, start: cur[0].s, end: cur[cur.length - 1].e });
    cur = [];
  };
  for (const w of words) {
    const text = cur.map((x) => x.w).join(' ');
    const wouldChars = text.length + (text ? 1 : 0) + w.w.length;
    if (cur.length && (cur.length >= maxWords || wouldChars > maxChars || w.s - cur[cur.length - 1].e > maxGap || w.e - cur[0].s > maxDur)) flush();
    cur.push(w);
    const last = w.w.trim().slice(-1);
    if (SENTENCE_END.includes(last)) flush();
    else if (CLAUSE_END.includes(last) && cur.length >= Math.max(2, maxWords - 1)) flush();
  }
  flush();
  return groups;
}

/** Khoang im lang GIUA cac tu (theo nguon), chi lay khoang >= minGap. Tra ve phan nam giua, tru `keep` o moi dau de tho tu nhien. */
export function silenceGaps(words: Word[], opts: { minGap?: number; keep?: number; from?: number; to?: number } = {}): Range[] {
  const minGap = opts.minGap ?? 0.5,
    keep = opts.keep ?? 0.12;
  const out: Range[] = [];
  for (let i = 0; i + 1 < words.length; i++) {
    const a = words[i].e,
      b = words[i + 1].s;
    if (b - a < minGap) continue;
    const s = a + keep,
      e = b - keep;
    if (e - s <= 0.02) continue;
    if (opts.from !== undefined && e < opts.from) continue;
    if (opts.to !== undefined && s > opts.to) continue;
    out.push({ s: r6(s), e: r6(e) });
  }
  return out;
}

export interface DuckOpts {
  amountDb?: number; // giam bao nhieu dB khi co tieng noi (am)
  attack?: number; // giay ha am luong truoc khi noi
  release?: number; // giay tra am luong sau khi noi
  pad?: number; // giu thap them quanh tieng noi
}

/**
 * Keyframe am luong (clip-local) cho clip nhac: ha xuong `amountDb` duoi tieng noi.
 * base = am luong goc cua clip. ranges = khoang noi tren TIMELINE.
 */
export function duckKeyframes(ranges: Range[], span: { start: number; duration: number }, base: number, o: DuckOpts = {}): Keyframe[] {
  const db = o.amountDb ?? -14,
    atk = o.attack ?? 0.2,
    rel = o.release ?? 0.45,
    pad = o.pad ?? 0.12;
  const lo = r6(base * Math.pow(10, db / 20));
  const lin = EASE_PRESETS.linear;
  // gop cac khoang noi gan nhau hon attack+release (khong kip tra am luong)
  const rs: Range[] = [];
  for (const r of ranges) {
    const s = r.s - pad,
      e = r.e + pad;
    if (e <= span.start || s >= span.start + span.duration) continue;
    const last = rs[rs.length - 1];
    if (last && s - last.e < atk + rel) last.e = Math.max(last.e, e);
    else rs.push({ s, e });
  }
  const keys: Keyframe[] = [];
  const push = (t: number, v: number) => {
    const tt = r6(Math.min(span.duration, Math.max(0, t)));
    const prev = keys[keys.length - 1];
    if (prev && tt <= prev.t + 1e-5) {
      if (Math.abs(prev.v - v) > 1e-9) keys[keys.length - 1] = { t: prev.t, v, ease: lin };
      return;
    }
    keys.push({ t: tt, v, ease: lin });
  };
  const L = (t: number) => t - span.start; // timeline -> clip-local
  if (!rs.length) return [{ t: 0, v: base, ease: lin }];
  push(0, L(rs[0].s) <= 1e-6 ? lo : base);
  for (const r of rs) {
    push(L(r.s) - atk, base);
    push(L(r.s), lo);
    push(L(r.e), lo);
    push(L(r.e) + rel, base);
  }
  return keys;
}
