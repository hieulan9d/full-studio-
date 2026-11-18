// SFX theo su kien: phat hien su kien (cat canh, chu vao, marker), lap ke hoach tu kho co tag, tao op. Chi la DE XUAT. Thuan tuy, co test. Xem F-33.
import { DEFAULT_TRANSFORM, nextId, type Clip, type Media, type Op, type Project, type Track } from './schema';
import { CAPTION_TAG } from './captions';

export interface LibItem {
  id: string; // on dinh theo duong dan
  name: string;
  kind: 'sfx' | 'music';
  path: string;
  tags: string[];
  duration: number;
  bpm?: number;
  note?: string; // giay phep / nguon
}

export type SfxEventKind = 'cut' | 'text' | 'marker' | 'beat';

export interface SfxRule {
  event: SfxEventKind;
  tag: string;
  volume?: number; // 0..1+ (mac dinh 0.6)
  offset?: number; // giay so voi su kien (mac dinh -0.04: SFX dung truoc cu cat mot chut)
  min_gap?: number; // khoang cach toi thieu giua hai SFX cung quy tac (mac dinh 0.3)
  max?: number; // toi da so SFX cua quy tac (mac dinh 40)
}

export interface SfxEvent {
  t: number;
  kind: SfxEventKind;
  label: string;
}

export interface PlannedSfx {
  t: number;
  item: LibItem;
  volume: number;
  rule: SfxEventKind;
  label: string;
}

const r6 = (x: number) => Math.round(x * 1e6) / 1e6;

export function detectEvents(p: Project): SfxEvent[] {
  const ev: SfxEvent[] = [];
  const frame = 1.5 / p.fps;
  const kindOf = (c: Clip) => (c.src.type === 'text' ? 'text' : 'visual');
  for (const t of p.tracks) {
    if (t.kind !== 'video') continue;
    const cs = p.clips.filter((c) => c.track === t.id && kindOf(c) === 'visual').sort((a, b) => a.start - b.start);
    for (let i = 1; i < cs.length; i++) {
      const prevEnd = cs[i - 1].start + cs[i - 1].duration;
      if (cs[i].start > 0.05 && Math.abs(cs[i].start - prevEnd) <= frame) ev.push({ t: r6(cs[i].start), kind: 'cut', label: `cat canh ${cs[i - 1].id} -> ${cs[i].id}` });
    }
  }
  for (const c of p.clips) if (c.src.type === 'text' && !c.tag?.startsWith(CAPTION_TAG)) ev.push({ t: r6(c.start), kind: 'text', label: `chu "${c.src.text.content.split(String.fromCharCode(10))[0].slice(0, 24)}"` });
  for (const m of p.markers ?? []) ev.push({ t: r6(m.t), kind: m.kind === 'beat' ? 'beat' : 'marker', label: m.label ?? `marker ${m.t.toFixed(2)}s` });
  ev.sort((a, b) => a.t - b.t);
  return ev;
}

export function planSfx(p: Project, lib: LibItem[], rules: SfxRule[]): { plan: PlannedSfx[]; missing: string[] } {
  const events = detectEvents(p);
  const plan: PlannedSfx[] = [];
  const missing: string[] = [];
  for (const rule of rules) {
    const cands = lib.filter((i) => i.kind === 'sfx' && i.tags.includes(rule.tag.toLowerCase()));
    if (!cands.length) {
      missing.push(rule.tag);
      continue;
    }
    const gap = rule.min_gap ?? 0.3,
      max = rule.max ?? 40;
    let lastT = -Infinity,
      n = 0,
      k = 0;
    for (const e of events.filter((x) => x.kind === rule.event)) {
      if (n >= max) break;
      const t = Math.max(0, r6(e.t + (rule.offset ?? -0.04)));
      if (t - lastT < gap) continue;
      plan.push({ t, item: cands[k % cands.length], volume: rule.volume ?? 0.6, rule: rule.event, label: `${rule.tag} @ ${e.label}` });
      lastT = t;
      n++;
      k++;
    }
  }
  plan.sort((a, b) => a.t - b.t);
  return { plan, missing };
}

export const SFX_TAG = 'sfx:';

/** Tao op: add_media (neu chua co) + add_clip tren cac track audio "SFX" (them track neu chong). */
export function sfxOps(p: Project, plan: PlannedSfx[]): Op[] {
  const ops: Op[] = [];
  const mediaIdByPath = new Map(p.media.map((m) => [m.path, m.id]));
  const used = new Set([...p.clips.map((c) => c.id), ...p.media.map((m) => m.id), ...p.tracks.map((t) => t.id)]);
  const fresh = (prefix: string) => {
    let n = 1;
    while (used.has(prefix + n)) n++;
    used.add(prefix + n);
    return prefix + n;
  };
  const tracks: { id: string; end: number }[] = [];
  for (const t of p.tracks.filter((x) => x.kind === 'audio' && x.name.startsWith('SFX'))) {
    tracks.push({ id: t.id, end: Math.max(0, ...p.clips.filter((c) => c.track === t.id).map((c) => c.start + c.duration)) });
  }
  const clipsOn = (id: string) => p.clips.filter((c) => c.track === id);
  for (const it of plan) {
    let mid = mediaIdByPath.get(it.item.path);
    if (!mid) {
      mid = fresh('m');
      const media: Media = { id: mid, path: it.item.path, kind: 'audio', duration: it.item.duration, width: 0, height: 0, fps: 0, hasAudio: true };
      ops.push({ op: 'add_media', media });
      mediaIdByPath.set(it.item.path, mid);
    }
    const dur = Math.min(4, it.item.duration);
    let tr = tracks.find((x) => x.end <= it.t + 1e-6 && !clipsOn(x.id).some((c) => it.t < c.start + c.duration && c.start < it.t + dur));
    if (!tr) {
      const id = fresh('a');
      const track: Track = { id, kind: 'audio', name: tracks.length ? `SFX ${tracks.length + 1}` : 'SFX' };
      ops.push({ op: 'add_track', track });
      tr = { id, end: 0 };
      tracks.push(tr);
    }
    tr.end = it.t + dur;
    const id = fresh('c');
    ops.push({ op: 'add_clip', clip: { id, track: tr.id, src: { type: 'media', mediaId: mid }, start: it.t, duration: dur, in: 0, volume: it.volume, transform: { ...DEFAULT_TRANSFORM }, keyframes: {}, tag: SFX_TAG + it.rule } });
  }
  void nextId;
  return ops;
}
