import assert from 'node:assert/strict';
import { Session } from '../src/core/session';
import { DEFAULT_TRANSFORM, newProject, nextId, type Clip, type Media } from '../src/core/schema';
import { diffProjects } from '../src/core/diff';
import { findFreeStart, formatTime, freshIds, maxDurationFor, rulerStep, snapMoveDelta, snapPoints, snapValue, splitTargets, trimLeft, trimRight } from '../src/renderer/timeline-math';

let n = 0;
const t = (name: string, fn: () => void) => {
  fn();
  n++;
  console.log('ok -', name);
};
const media: Media = { id: 'm1', path: 'x', kind: 'video', duration: 10, width: 1080, height: 1920, fps: 30, hasAudio: true };
const clip = (id: string, start: number, duration: number, inn = 0, track = 'v1'): Clip => ({ id, track, src: { type: 'media', mediaId: 'm1' }, start, duration, in: inn, volume: 1, transform: { ...DEFAULT_TRANSFORM }, keyframes: {} });
const proj = (cs: Clip[]) => {
  const s = new Session();
  s.apply([{ op: 'add_media', media }, ...cs.map((c) => ({ op: 'add_clip' as const, clip: c }))], 'human');
  return s.project;
};

t('snapValue: bam trong nguong, khong bam ngoai nguong', () => {
  assert.deepEqual(snapValue(1.04, [0, 1, 2], 0.05), { value: 1, snapped: true });
  assert.deepEqual(snapValue(1.2, [0, 1, 2], 0.05), { value: 1.2, snapped: false });
});

t('snapPoints: gom 0, playhead, mep clip khac, bo qua clip dang keo', () => {
  const p = proj([clip('a', 1, 2), clip('b', 5, 1)]);
  const pts = snapPoints(p, new Set(['a']), 3.3);
  assert.ok(pts.includes(0) && pts.includes(3.3) && pts.includes(5) && pts.includes(6));
  assert.ok(!pts.includes(1) && !pts.includes(3));
});

t('snapMoveDelta: mep phai cua nhom bam vao mep trai clip khac', () => {
  const group = [{ start: 0, duration: 2, in: 0, track: 'v1' }];
  const r = snapMoveDelta(group, 2.97, [5], 0.1); // mep phai 2+2.97=4.97 -> 5
  assert.equal(r.snapped, true);
  assert.ok(Math.abs(r.dt - 3) < 1e-9);
});

t('snapMoveDelta: khong keo nhom ra truoc 0', () => {
  const r = snapMoveDelta([{ start: 1, duration: 2, in: 0, track: 'v1' }], -5, [], 0.1);
  assert.equal(r.dt, -1);
});

t('trimLeft: tang in cung luong, giu mep phai', () => {
  const r = trimLeft({ start: 2, duration: 4, in: 1, track: 'v1' }, 3, 30);
  assert.deepEqual([r.start, r.duration, r.in], [3, 3, 2]);
});

t('trimLeft: khong vuot dau nguon (in>=0) va khong ngan hon 1 khung', () => {
  const a = trimLeft({ start: 2, duration: 4, in: 1, track: 'v1' }, 0, 30); // chi lui duoc 1s
  assert.deepEqual([a.start, a.in], [1, 0]);
  const b = trimLeft({ start: 2, duration: 4, in: 1, track: 'v1' }, 99, 30);
  assert.ok(Math.abs(b.duration - 1 / 30) < 1e-6);
});

t('trimRight: gioi han theo nguon va toi thieu 1 khung', () => {
  const c = { start: 2, duration: 4, in: 1, track: 'v1' };
  assert.equal(trimRight(c, 99, 30, 9).duration, 9);
  assert.ok(Math.abs(trimRight(c, 0, 30, 9).duration - 1 / 30) < 1e-6);
  assert.equal(trimRight(c, 5, 30, 9).duration, 3);
});

t('maxDurationFor: do dai nguon con lai; anh khong gioi han', () => {
  const p = proj([clip('a', 0, 3, 4)]);
  assert.equal(maxDurationFor(p, p.clips[0]), 6);
});

t('findFreeStart: dat vao khe vua, hoac day sang phai', () => {
  const p = proj([clip('a', 0, 2), clip('b', 3, 2)]);
  assert.equal(findFreeStart(p, 'v1', 2, 1), 2); // khe 2..3 vua 1s
  assert.equal(findFreeStart(p, 'v1', 2, 2), 5); // khong vua, day sang sau b
  assert.equal(findFreeStart(p, 'v1', 0.5, 1), 2); // roi vao a -> day toi het a (giay 2), khe 2..3 vua 1s
  assert.equal(findFreeStart(p, 'v1', 0.5, 1.5), 5); // khe 2..3 khong du 1.5s -> sau b
  assert.equal(findFreeStart(p, 'v1', 7, 1), 7);
});

t('freshIds: khong trung id da co va khong trung nhau', () => {
  const p = proj([clip('c1', 0, 1), clip('c3', 1, 1, 0)]);
  assert.deepEqual(freshIds(p, 'c', 3), ['c2', 'c4', 'c5']);
  assert.equal(nextId(p, 'c'), 'c4');
});

t('splitTargets: uu tien phan da chon, khong thi clip tren cung', () => {
  const s = new Session();
  s.apply([{ op: 'add_media', media }, { op: 'add_track', track: { id: 'v2', kind: 'video', name: 'V2' } }, { op: 'add_clip', clip: clip('a', 0, 4) }, { op: 'add_clip', clip: clip('b', 0, 4, 0, 'v2') }], 'human');
  const p = s.project;
  assert.deepEqual(splitTargets(p, [], 2).map((c) => c.id), ['b']); // v2 cao hon
  assert.deepEqual(splitTargets(p, ['a'], 2).map((c) => c.id), ['a']);
  assert.deepEqual(splitTargets(p, ['a'], 5), []); // ngoai clip
  assert.deepEqual(splitTargets(p, [], 0), []); // dung mep thi khong cat
});

t('formatTime va rulerStep', () => {
  assert.equal(formatTime(65.5, 30), '01:05:15');
  assert.equal(formatTime(-3, 30), '00:00:00');
  assert.ok(rulerStep(100) * 100 >= 70);
  assert.ok(rulerStep(1000) < rulerStep(10));
});

t('diffProjects: them, xoa, doi', () => {
  const a = proj([clip('a', 0, 2), clip('b', 3, 2)]);
  const s = new Session(JSON.parse(JSON.stringify(a)));
  const d = s.draftOf([{ op: 'remove_clip', id: 'a' }, { op: 'add_clip', clip: clip('c', 6, 1) }, { op: 'set_transform', id: 'b', patch: { scale: 0.5 } }, { op: 'set_clip', id: 'b', patch: { start: 4 } }]);
  assert.ok(d.project);
  const diff = diffProjects(a, d.project!);
  assert.deepEqual(diff.removedClips.map((c) => c.id), ['a']);
  assert.deepEqual(diff.addedClips.map((c) => c.id), ['c']);
  assert.equal(diff.changedClips.length, 1);
  assert.deepEqual(diff.changedClips[0].fields.map((f) => f.key).sort(), ['start', 'transform.scale']);
});

t('draftOf khong doi du an, bao loi khi sai', () => {
  const s = new Session(proj([clip('a', 0, 2)]));
  const before = JSON.stringify(s.project);
  assert.ok(s.draftOf([{ op: 'remove_clip', id: 'a' }]).project);
  assert.equal(JSON.stringify(s.project), before);
  assert.ok(s.draftOf([{ op: 'remove_clip', id: 'zz' }]).errors.length > 0);
});

t('snapshot/restore: hoan tac duoc, giu cache media', () => {
  const s = new Session(proj([clip('a', 0, 2)]));
  s.patchMediaCache('m1', { status: 'ready', frames: 300 });
  s.snapshot('truoc');
  s.apply([{ op: 'remove_clip', id: 'a' }], 'human');
  s.patchMediaCache('m1', { status: 'ready', frames: 301 });
  assert.equal(s.project.clips.length, 0);
  assert.equal(s.restoreSnapshot('truoc'), true);
  assert.equal(s.project.clips.length, 1);
  assert.equal(s.project.media[0].cache?.frames, 301); // cache hien tai, khong bi snapshot ghi de
  assert.equal(s.undo(), true);
  assert.equal(s.project.clips.length, 0);
  assert.equal(s.restoreSnapshot('khong-co'), false);
});

t('newProject mac dinh co 2 track', () => assert.equal(newProject().tracks.length, 2));

console.log(`${n} test timeline dat`);
