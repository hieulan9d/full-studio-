import assert from 'node:assert/strict';
import { Session } from '../src/core/session';
import { Clip, DEFAULT_TRANSFORM, Media, migrate, newProject, timelineEnd, validate } from '../src/core/schema';
import { bt709Eotf, bt709Oetf, srgbEotf, srgbOetf } from '../src/core/color';

let n = 0;
const t = (name: string, fn: () => void) => {
  fn();
  n++;
  console.log('ok -', name);
};

const media = (id = 'm1', duration = 10): Media => ({ id, path: 'x.mp4', kind: 'video', duration, width: 1080, height: 1920, fps: 30, hasAudio: true });
const clip = (id: string, start: number, duration: number, extra: Partial<Clip> = {}): Clip => ({
  id,
  track: 'v1',
  src: { type: 'media', mediaId: 'm1' },
  start,
  duration,
  in: 0,
  volume: 1,
  transform: { ...DEFAULT_TRANSFORM },
  keyframes: {},
  ...extra,
});
const withMedia = () => {
  const s = new Session();
  assert.equal(s.apply([{ op: 'add_media', media: media() }], 'human').ok, true);
  return s;
};

t('project mac dinh hop le', () => assert.deepEqual(validate(newProject()), []));

t('add_clip ghi history voi nguon', () => {
  const s = withMedia();
  const r = s.apply([{ op: 'add_clip', clip: clip('c1', 0, 4) }], 'ai:claude');
  assert.equal(r.ok, true);
  assert.equal(s.project.history.at(-1)!.source, 'ai:claude');
});

t('atomic: op loi thi khong doi gi', () => {
  const s = withMedia();
  const before = JSON.stringify(s.project);
  const r = s.apply([{ op: 'add_clip', clip: clip('c1', 0, 4) }, { op: 'remove_clip', id: 'khong-co' }], 'human');
  assert.equal(r.ok, false);
  assert.equal(JSON.stringify(s.project), before);
});

t('validate: id trung, duration<=0, thieu media/track, vuot do dai media', () => {
  const s = withMedia();
  s.apply([{ op: 'add_clip', clip: clip('c1', 0, 4) }], 'human');
  assert.equal(s.apply([{ op: 'add_clip', clip: clip('c1', 5, 1) }], 'human').ok, false); // id trung
  assert.equal(s.apply([{ op: 'add_clip', clip: clip('c2', 5, 0) }], 'human').ok, false);
  assert.equal(s.apply([{ op: 'add_clip', clip: clip('c2', 5, 1, { track: 'khong-co' }) }], 'human').ok, false);
  assert.equal(s.apply([{ op: 'add_clip', clip: clip('c2', 5, 1, { src: { type: 'media', mediaId: 'zz' } }) }], 'human').ok, false);
  assert.equal(s.apply([{ op: 'add_clip', clip: clip('c2', 5, 20) }], 'human').ok, false); // 20s > media 10s
});

t('khong cho clip chong len nhau tren cung track', () => {
  const s = withMedia();
  s.apply([{ op: 'add_clip', clip: clip('c1', 0, 4) }], 'human');
  const r = s.apply([{ op: 'add_clip', clip: clip('c2', 3, 2) }], 'human');
  assert.equal(r.ok, false);
  assert.match(r.errors.join(' '), /chong nhau/);
});

t('split_clip: hai nua noi lien, in cua nua phai dung', () => {
  const s = withMedia();
  s.apply([{ op: 'add_clip', clip: clip('c1', 2, 6, { in: 1 }) }], 'human');
  assert.equal(s.apply([{ op: 'split_clip', id: 'c1', at: 5, newId: 'c2' }], 'human').ok, true);
  const a = s.project.clips.find((c) => c.id === 'c1')!;
  const b = s.project.clips.find((c) => c.id === 'c2')!;
  assert.deepEqual([a.start, a.duration, a.in], [2, 3, 1]);
  assert.deepEqual([b.start, b.duration, b.in], [5, 3, 4]); // in = 1 + 3
  assert.equal(s.apply([{ op: 'split_clip', id: 'c1', at: 2, newId: 'c3' }], 'human').ok, false); // dung mep
});

t('ripple_delete keo clip sau lui lai', () => {
  const s = withMedia();
  s.apply([{ op: 'add_clip', clip: clip('c1', 0, 2) }, { op: 'add_clip', clip: clip('c2', 2, 3, { in: 2 }) }, { op: 'add_clip', clip: clip('c3', 5, 1, { in: 5 }) }], 'human');
  assert.equal(s.apply([{ op: 'ripple_delete', id: 'c1' }], 'human').ok, true);
  assert.deepEqual(s.project.clips.map((c) => [c.id, c.start]), [['c2', 0], ['c3', 3]]);
  assert.equal(timelineEnd(s.project), 4);
});

t('set_transform + undo/redo', () => {
  const s = withMedia();
  s.apply([{ op: 'add_clip', clip: clip('c1', 0, 2) }], 'human');
  s.apply([{ op: 'set_transform', id: 'c1', patch: { scale: 2, opacity: 0.5 } }], 'human');
  assert.equal(s.project.clips[0].transform.scale, 2);
  s.undo();
  assert.equal(s.project.clips[0].transform.scale, 1);
  s.redo();
  assert.equal(s.project.clips[0].transform.opacity, 0.5);
});

t('dryRun khong doi du an', () => {
  const s = withMedia();
  const before = JSON.stringify(s.project);
  assert.deepEqual(s.dryRun([{ op: 'add_clip', clip: clip('c1', 0, 2) }]), []);
  assert.ok(s.dryRun([{ op: 'remove_clip', id: 'nope' }]).length > 0);
  assert.equal(JSON.stringify(s.project), before);
});

t('setMediaCache khong vao lich su va song qua undo', () => {
  const s = withMedia();
  s.apply([{ op: 'add_clip', clip: clip('c1', 0, 2) }], 'human');
  s.setMediaCache('m1', { status: 'ready', frames: 300 });
  s.undo();
  assert.equal(s.project.media[0].cache?.status, 'ready');
  assert.equal(s.project.history.length, 1);
});

t('migrate v0 -> v1', () => {
  const p = migrate({ schema: 0, name: 'cu', fps: 30, width: 1080, height: 1920, clips: [{ id: 'c1', kind: 'bars', start: 0, duration: 5, param: 0 }], history: [] });
  assert.equal(p.schema, 6);
  assert.deepEqual(validate(p), []);
  assert.deepEqual(p.clips[0].src, { type: 'gen', kind: 'bars', param: 0 });
  assert.throws(() => migrate({ schema: 99 }));
});

t('migrate v1 -> v3: them keyframes, tham so neo vi tri, markers', () => {
  const v1 = { schema: 1, name: 'cu', fps: 30, width: 1080, height: 1920, media: [], tracks: [{ id: 'v1', kind: 'video', name: 'V' }], clips: [{ id: 'c1', track: 'v1', src: { type: 'gen', kind: 'bars', param: 0 }, start: 0, duration: 2, in: 0, volume: 1, transform: { x: 0.1, y: 0, scale: 1, rotation: 0, opacity: 1, fit: 'contain' } }], history: [] };
  const p = migrate(v1);
  assert.equal(p.schema, 6);
  assert.deepEqual(p.markers, []);
  assert.deepEqual(p.clips[0].keyframes, {});
  assert.equal(p.clips[0].transform.anchorH, 'center');
  assert.equal(p.clips[0].transform.x, 0.1);
  assert.deepEqual(validate(p), []);
});

t('round-trip mau: oetf(eotf(x)) = x', () => {
  for (let i = 0; i <= 1023; i++) {
    const x = i / 1023;
    assert.ok(Math.abs(srgbOetf(srgbEotf(x)) - x) < 1e-9, `srgb ${i}`);
    // BT.709: hai nhanh cong thuc khong khop tuyet doi gan nguong 0.018 (lech ~3e-4, nho hon 1 muc ma 10-bit = 9.8e-4)
    assert.ok(Math.abs(bt709Oetf(bt709Eotf(x)) - x) < 5e-4, `bt709 ${i}`);
  }
});

console.log(`${n} test dat`);
