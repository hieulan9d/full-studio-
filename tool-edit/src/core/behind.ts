// "Chu sau lung nguoi": nhan doi clip da tach nen len mot track tren cung (chi con phan nguoi), chu nam o track giua. Xem F-42.
import { DEFAULT_MATTE, nextId, type Clip, type Op, type Project } from './schema';

export interface CutoutPlan {
  ops: Op[];
  overlayId: string;
  overlayTrack: string;
  textTrack?: string; // track de dat chu (nam giua video goc va lop nguoi)
}

/** Dung cac op tao lop nguoi. Tra ve chuoi loi neu clip khong hop le. withTextTrack: tao them track chu o giua. */
export function personCutoutPlan(p: Project, clipId: string, withTextTrack: boolean): CutoutPlan | string {
  const c = p.clips.find((x) => x.id === clipId);
  if (!c) return `khong co clip ${clipId}`;
  if (c.src.type !== 'media') return `clip ${clipId} khong phai clip media`;
  const mediaId = c.src.mediaId;
  const m = p.media.find((x) => x.id === mediaId);
  if (!m || m.kind !== 'video') return `clip ${clipId} khong phai video`;
  if (!m.matte) return `media ${m.id} chua duoc tach nen (chay remove_background / nut "Tach nen" truoc, doi xong)`;
  const ops: Op[] = [];
  const used = new Set([...p.tracks.map((t) => t.id), ...p.clips.map((x) => x.id), ...p.media.map((x) => x.id)]);
  const fresh = (prefix: string) => {
    let n = 1;
    while (used.has(prefix + n)) n++;
    used.add(prefix + n);
    return prefix + n;
  };
  const nVideo = p.tracks.filter((t) => t.kind === 'video').length;
  let textTrack: string | undefined;
  if (withTextTrack) {
    textTrack = fresh('v');
    ops.push({ op: 'add_track', track: { id: textTrack, kind: 'video', name: `Chu sau nguoi ${nVideo + 1}` } });
  }
  const overlayTrack = fresh('v');
  ops.push({ op: 'add_track', track: { id: overlayTrack, kind: 'video', name: `Nguoi (tach nen) ${nVideo + (withTextTrack ? 2 : 1)}` } });
  const overlayId = fresh('c');
  const kf = JSON.parse(JSON.stringify(c.keyframes ?? {}));
  delete kf.volume; // lop nguoi khong phat tieng (tieng da o clip goc)
  const clip: Clip = { ...JSON.parse(JSON.stringify(c)), id: overlayId, track: overlayTrack, volume: 0, keyframes: kf, matte: c.matte ?? { ...DEFAULT_MATTE }, tag: 'cutout:' + c.id };
  delete clip.captionOpts;
  ops.push({ op: 'add_clip', clip });
  return { ops, overlayId, overlayTrack, textTrack };
}

export { nextId };
