import assert from 'node:assert/strict';
import { Session } from '../src/core/session';
import { DEFAULT_TRANSFORM, migrate, newProject, validate, type Clip, type Media } from '../src/core/schema';
import { EASE_PRESETS, type Keyframe } from '../src/core/anim';
import { hasSpeed, SPEED_PRESETS, speedAt, srcSpan, srcTimeAt } from '../src/core/speed';
import { maxDurationFor, trimLeft } from '../src/renderer/timeline-math';
import { personCutoutPlan } from '../src/core/behind';

let n = 0;
const t = (name: string, fn: () => void) => {
  fn();
  n++;
  console.log('ok -', name);
};
const near = (a: number, b: number, tol = 1e-3) => assert.ok(Math.abs(a - b) <= tol, `${a} !~ ${b}`);
const K = (tt: number, v: number, ease = EASE_PRESETS.linear): Keyframe => ({ t: tt, v, ease });
const media = (id: string, dur = 20, extra: Partial<Media> = {}): Media => ({ id, path: `D:/x/${id}.mp4`, kind: 'video', duration: dur, width: 1080, height: 1920, fps: 30, hasAudio: true, ...extra });
const mclip = (id: string, mediaId: string, start: number, duration: number, extra: Partial<Clip> = {}): Clip => ({ id, track: 'v1', src: { type: 'media', mediaId }, start, duration, in: 0, volume: 1, transform: { ...DEFAULT_TRANSFORM }, keyframes: {}, ...extra });
const make = (clips: Clip[], medias: Media[] = [media('m1')]) => {
  const s = new Session();
  const r = s.apply([...medias.map((m) => ({ op: 'add_media' as const, media: m })), ...clips.map((c) => ({ op: 'add_clip' as const, clip: c }))], 'human');
  assert.equal(r.ok, true, r.errors.join(';'));
  return s;
};

t('srcTimeAt: toc do co dinh va khong co speed', () => {
  const c = mclip('c', 'm', 0, 4, { in: 1 });
  near(srcTimeAt(c, 2), 3);
  near(srcSpan(c), 4);
  const f = mclip('f', 'm', 0, 4, { in: 1, speed: 2 });
  near(srcTimeAt(f, 2), 5);
  near(srcSpan(f), 8);
  assert.equal(hasSpeed(c), false);
  assert.equal(hasSpeed(f), true);
});

t('srcTimeAt: toc do keyframe tuyen tinh 1 -> 3 trong 2 giay = tich phan 4 giay nguon', () => {
  const c = mclip('c', 'm', 0, 2, { keyframes: { speed: [K(0, 1), K(2, 3)] } });
  near(speedAt(c, 1), 2);
  near(srcTimeAt(c, 2), 4, 2e-3);
  near(srcTimeAt(c, 1), 1.5, 2e-3); // 1 + (1+2)/2*... = tich phan 0..1 cua 1+t = 1.5
});

t('srcTimeAt: speed ramp bezier don dieu, dung dieu kien bien', () => {
  const c = mclip('c', 'm', 0, 3, { keyframes: { speed: [K(0, 1, EASE_PRESETS['ease-in-out']), K(1.5, 0.2, EASE_PRESETS['ease-in-out']), K(3, 1)] } });
  let prev = 0;
  for (let i = 0; i <= 30; i++) {
    const s = srcTimeAt(c, (i / 30) * 3);
    assert.ok(s >= prev - 1e-9, 'khong lui');
    prev = s;
  }
  assert.ok(srcSpan(c) < 3 && srcSpan(c) > 1.5, `span ${srcSpan(c)}`);
});

t('validate: vuot do dai nguon voi speed bi bao; set_speed xoa keyframe', () => {
  const s = make([mclip('c', 'm1', 0, 6)], [media('m1', 10)]);
  assert.equal(s.apply([{ op: 'set_speed', id: 'c', speed: 2 }], 'human').ok, false); // 6*2 = 12 > 10
  assert.equal(s.apply([{ op: 'set_speed', id: 'c', speed: 1.5 }], 'human').ok, true);
  assert.equal(s.project.clips[0].speed, 1.5);
  assert.equal(s.apply([{ op: 'set_keyframes', id: 'c', prop: 'speed', keys: [K(0, 1), K(6, 1.5)] }], 'human').ok, true);
  assert.equal(s.apply([{ op: 'set_speed', id: 'c', speed: 1 }], 'human').ok, true);
  assert.equal(s.project.clips[0].speed, undefined);
  assert.equal(s.project.clips[0].keyframes.speed, undefined);
  assert.equal(s.apply([{ op: 'set_speed', id: 'c', speed: 99 }], 'human').ok, false);
  assert.equal(s.apply([{ op: 'set_keyframes', id: 'c', prop: 'speed', keys: [K(0, 0.01)] }], 'human').ok, false); // ngoai 0.05..16
});

t('split_clip khi co toc do: manh phai bat dau dung thoi diem nguon', () => {
  const s = make([mclip('c', 'm1', 0, 4, { speed: 2 })]);
  assert.equal(s.apply([{ op: 'split_clip', id: 'c', at: 1, newId: 'd' }], 'human').ok, true);
  const d = s.project.clips.find((x) => x.id === 'd')!;
  near(d.in, 2);
  assert.equal(d.speed, 2);
  const s2 = make([mclip('c', 'm1', 0, 2, { keyframes: { speed: [K(0, 1), K(2, 3)] } })]);
  s2.apply([{ op: 'split_clip', id: 'c', at: 1, newId: 'd' }], 'human');
  const d2 = s2.project.clips.find((x) => x.id === 'd')!;
  near(d2.in, 1.5, 3e-3);
  near(speedAt(d2, 0), 2); // lien tuc toc do tai diem cat
  near(srcTimeAt(d2, 1), 4, 3e-3);
});

t('speed ramp: khong trim dau (doi in) va khong cat theo loi/phu de', () => {
  const s = make([mclip('c', 'm1', 0, 4, { in: 1, keyframes: { speed: [K(0, 1), K(4, 2)] } })]);
  assert.equal(s.apply([{ op: 'set_clip', id: 'c', patch: { in: 1.5 } }], 'human').ok, false);
  assert.equal(s.apply([{ op: 'remove_ranges', id: 'c', ranges: [{ s: 2, e: 3 }] }], 'human').ok, false);
  assert.equal(s.apply([{ op: 'generate_captions', id: 'c', opts: {} as never }], 'human').ok, false);
});

t('timeline-math: trimLeft va maxDuration co toc do', () => {
  const r = trimLeft({ start: 2, duration: 4, in: 4, track: 'v1' }, 3, 30, 2);
  near(r.in, 6);
  near(r.duration, 3);
  const a = trimLeft({ start: 2, duration: 4, in: 4, track: 'v1' }, 0, 30, 2); // chi lui duoc 2 giay timeline (4 giay nguon)
  near(a.start, 0);
  near(a.in, 0);
  const p = newProject();
  p.media.push(media('m1', 10));
  p.clips.push(mclip('c', 'm1', 0, 3, { in: 2, speed: 2 }));
  near(maxDurationFor(p, p.clips[0]), 4); // (10-2)/2
});

t('matte: set_media_matte, set_clip_matte, tu choi khi chua tach, go matte go cac clip', () => {
  const s = make([mclip('c', 'm1', 0, 4)], [media('m1'), media('mt', 20, { role: 'matte', hasAudio: false })]);
  assert.equal(s.apply([{ op: 'set_clip_matte', id: 'c', matte: { lo: 0.1, hi: 0.9, feather: 1 } }], 'human').ok, false);
  assert.equal(s.apply([{ op: 'set_media_matte', mediaId: 'm1', matteId: 'm1' }], 'human').ok, false); // khong phai matte
  assert.equal(s.apply([{ op: 'set_media_matte', mediaId: 'm1', matteId: 'mt' }], 'human').ok, true);
  assert.equal(s.apply([{ op: 'set_clip_matte', id: 'c', matte: { lo: 0.1, hi: 0.9, feather: 1 } }], 'human').ok, true);
  assert.deepEqual(s.project.clips[0].matte, { lo: 0.1, hi: 0.9, feather: 1 });
  assert.equal(s.apply([{ op: 'set_clip_matte', id: 'c', matte: { lo: 0.9, hi: 0.1, feather: 0 } }], 'human').ok, false);
  assert.equal(s.apply([{ op: 'set_media_matte', mediaId: 'm1', matteId: null }], 'human').ok, true);
  assert.equal(s.project.clips[0].matte, undefined);
  assert.ok(validate(s.project).length === 0);
});

t('migrate v3 -> v4 va preset speed hop le', () => {
  const p = newProject();
  const old: any = { ...p, schema: 3 };
  const m = migrate(old);
  assert.equal(m.schema, 6);
  for (const pr of SPEED_PRESETS) {
    assert.ok(pr.points.length >= 2 && pr.points[0].t === 0 && pr.points.at(-1)!.t === 1, pr.id);
    for (const q of pr.points) assert.ok(q.v >= 0.05 && q.v <= 16, pr.id);
  }
});

t('personCutoutPlan: 2 track moi (chu giua, nguoi tren cung), lop nguoi tat tieng, tu choi khi chua tach nen', () => {
  const s = make([mclip('c', 'm1', 0, 4, { keyframes: { volume: [K(0, 1), K(4, 0.5)], 'transform.x': [K(0, 0), K(4, 0.1)] } })], [media('m1'), media('mt', 20, { role: 'matte', hasAudio: false })]);
  assert.equal(typeof personCutoutPlan(s.project, 'c', true), 'string'); // chua tach nen
  s.apply([{ op: 'set_media_matte', mediaId: 'm1', matteId: 'mt' }], 'human');
  const plan = personCutoutPlan(s.project, 'c', true);
  assert.ok(typeof plan !== 'string');
  if (typeof plan === 'string') return;
  assert.equal(plan.ops.filter((o) => o.op === 'add_track').length, 2);
  assert.notEqual(plan.textTrack, plan.overlayTrack);
  const r = s.apply(plan.ops, 'human');
  assert.equal(r.ok, true, r.errors.join(';'));
  const order = s.project.tracks.map((x) => x.id);
  assert.ok(order.indexOf('v1') < order.indexOf(plan.textTrack!) && order.indexOf(plan.textTrack!) < order.indexOf(plan.overlayTrack));
  const ov = s.project.clips.find((x) => x.id === plan.overlayId)!;
  assert.equal(ov.volume, 0);
  assert.equal(ov.keyframes.volume, undefined);
  assert.ok(ov.keyframes['transform.x']);
  assert.equal(ov.tag, 'cutout:c');
  assert.deepEqual(ov.matte, { lo: 0, hi: 1, feather: 0 });
  assert.ok(typeof personCutoutPlan(s.project, 'khong-co', true) === 'string');
});

console.log(`${n} test speed dat`);
