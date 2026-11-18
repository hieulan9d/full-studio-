// So sanh hai du an de hien thi diff cua mot de xuat. Xem CHUC-NANG.md F-13.
import type { Clip, Project } from './schema';

export interface ClipChange {
  id: string;
  fields: { key: string; from: unknown; to: unknown }[];
}

export interface ProjectDiff {
  addedClips: Clip[];
  removedClips: Clip[];
  changedClips: ClipChange[];
  addedTracks: string[];
  addedMedia: string[];
}

const flat = (c: Clip): Record<string, unknown> => ({
  track: c.track,
  start: round(c.start),
  duration: round(c.duration),
  in: round(c.in),
  volume: c.volume,
  ...Object.fromEntries(Object.entries(c.transform).map(([k, v]) => ['transform.' + k, typeof v === 'number' ? round(v) : v])),
});
const round = (n: number) => Math.round(n * 1000) / 1000;

export function diffProjects(a: Project, b: Project): ProjectDiff {
  const am = new Map(a.clips.map((c) => [c.id, c]));
  const bm = new Map(b.clips.map((c) => [c.id, c]));
  const changedClips: ClipChange[] = [];
  for (const [id, cb] of bm) {
    const ca = am.get(id);
    if (!ca) continue;
    const fa = flat(ca),
      fb = flat(cb);
    const fields = Object.keys(fb)
      .filter((k) => JSON.stringify(fa[k]) !== JSON.stringify(fb[k]))
      .map((k) => ({ key: k, from: fa[k], to: fb[k] }));
    if (fields.length) changedClips.push({ id, fields });
  }
  return {
    addedClips: b.clips.filter((c) => !am.has(c.id)),
    removedClips: a.clips.filter((c) => !bm.has(c.id)),
    changedClips,
    addedTracks: b.tracks.filter((t) => !a.tracks.some((x) => x.id === t.id)).map((t) => t.id),
    addedMedia: b.media.filter((m) => !a.media.some((x) => x.id === m.id)).map((m) => m.id),
  };
}
