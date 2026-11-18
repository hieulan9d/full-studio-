import assert from 'node:assert/strict';
import { Session } from '../src/core/session';
import { DEFAULT_TRANSFORM, validate, type Clip, type Media } from '../src/core/schema';
import { EASE_PRESETS, isAnimatable, resolveClip, valueAt, type Keyframe } from '../src/core/anim';
import { defaultShape, FX_DEFAULT, fxIsEmpty, mergeFx, mergeShape, validateFx, validateShape } from '../src/core/fx';
import { defaultGrade, gradePixel, isIdentity, mergeGrade, validateGrade } from '../src/core/grade';

let n = 0;
const t = (name: string, fn: () => void) => {
  fn();
  n++;
  console.log('ok -', name);
};
const near = (a: number, b: number, tol = 1e-6) => assert.ok(Math.abs(a - b) <= tol, `${a} !~ ${b}`);
const K = (tt: number, v: number): Keyframe => ({ t: tt, v, ease: EASE_PRESETS.linear });
const media = (id: string): Media => ({ id, path: `D:/x/${id}.mp4`, kind: 'video', duration: 10, width: 1080, height: 1920, fps: 30, hasAudio: true });
const mclip = (id: string): Clip => ({ id, track: 'v1', src: { type: 'media', mediaId: 'm1' }, start: 0, duration: 4, in: 0, volume: 1, transform: { ...DEFAULT_TRANSFORM }, keyframes: {} });
const shapeClip = (id: string, track = 'v1'): Clip => ({ id, track, src: { type: 'shape', shape: defaultShape('rect') }, start: 0, duration: 4, in: 0, volume: 1, transform: { ...DEFAULT_TRANSFORM }, keyframes: {} });
const make = (clips: Clip[]) => {
  const s = new Session();
  const r = s.apply([{ op: 'add_media', media: media('m1') }, ...clips.map((c) => ({ op: 'add_clip' as const, clip: c }))], 'human');
  assert.equal(r.ok, true, r.errors.join(';'));
  return s;
};

t('mergeFx: them voi mac dinh, gop tung phan, null go mot hieu ung, rong thi xoa', () => {
  let fx = mergeFx(undefined, { blur: { radius: 8 }, glow: { intensity: 2 } });
  assert.equal(fx.blur!.radius, 8);
  assert.equal(fx.glow!.radius, FX_DEFAULT.glow.radius);
  assert.equal(fx.glow!.intensity, 2);
  fx = mergeFx(fx, { glow: { radius: 99 } });
  assert.equal(fx.glow!.intensity, 2);
  assert.equal(fx.glow!.radius, 99);
  fx = mergeFx(fx, { blur: null, glow: null });
  assert.equal(fxIsEmpty(fx), true);
});

t('validateFx / validateShape bat gia tri xau', () => {
  assert.equal(validateFx({ blur: { radius: 20 } }, 'f').length, 0);
  assert.ok(validateFx({ blur: { radius: 999 } }, 'f').length > 0);
  assert.ok(validateFx({ shadow: { x: 0, y: 0, blur: 1, opacity: 2, color: '#000000' } }, 'f').length > 0);
  assert.ok(validateFx({ glow: { radius: 1, intensity: 1, color: 'do', threshold: 0 } }, 'f').length > 0);
  assert.ok(validateFx({ crop: { left: 0.6, top: 0, right: 0.6, bottom: 0 } }, 'f').length > 0);
  assert.ok(validateFx({ khong: {} } as never, 'f').length > 0);
  assert.equal(validateShape(defaultShape('star'), 's').length, 0);
  assert.ok(validateShape({ ...defaultShape('rect'), w: 0 }, 's').length > 0);
  assert.ok(validateShape({ ...defaultShape('rect'), fill: 'abc' }, 's').length > 0);
  assert.ok(validateShape({ ...defaultShape('rect'), kind: 'tam-giac' as never }, 's').length > 0);
});

t('set_fx / set_blend / set_shape qua session, undo, go keyframe cua hieu ung bi go', () => {
  const s = make([mclip('c'), { ...shapeClip('s', 'v1'), start: 5 }]);
  assert.equal(s.apply([{ op: 'set_fx', id: 'c', fx: { glow: { intensity: 1.5 }, round: { radius: 0.2 } } }], 'human').ok, true);
  assert.equal(s.project.clips[0].fx!.round!.radius, 0.2);
  assert.equal(s.apply([{ op: 'set_keyframes', id: 'c', prop: 'fx.glow.intensity', keys: [K(0, 0), K(2, 2)] }], 'human').ok, true);
  assert.equal(s.apply([{ op: 'set_keyframes', id: 'c', prop: 'fx.blur.radius', keys: [K(0, 0)] }], 'human').ok, false); // chua co blur
  near(valueAt(s.project.clips[0], 'fx.glow.intensity', 1), 1);
  near(resolveClip(s.project.clips[0], 1).fx!.glow!.intensity, 1);
  assert.equal(s.apply([{ op: 'set_fx', id: 'c', fx: { glow: null } }], 'human').ok, true);
  assert.equal(s.project.clips[0].keyframes['fx.glow.intensity'], undefined);
  assert.equal(s.apply([{ op: 'set_fx', id: 'c', fx: { khong: { a: 1 } } as never }], 'human').ok, false);
  assert.equal(s.apply([{ op: 'set_fx', id: 'c', fx: { blur: { radius: 500 } } }], 'human').ok, false);
  assert.equal(s.apply([{ op: 'set_fx', id: 'c', fx: null }], 'human').ok, true);
  assert.equal(s.project.clips[0].fx, undefined);
  assert.equal(s.apply([{ op: 'set_blend', id: 'c', blend: 'screen' }], 'human').ok, true);
  assert.equal(s.project.clips[0].blend, 'screen');
  assert.equal(s.apply([{ op: 'set_blend', id: 'c', blend: 'xyz' as never }], 'human').ok, false);
  assert.equal(s.apply([{ op: 'set_blend', id: 'c', blend: 'normal' }], 'human').ok, true);
  assert.equal(s.project.clips[0].blend, undefined);
  assert.equal(s.apply([{ op: 'set_shape', id: 's', patch: { kind: 'ellipse', w: 200, stroke: { width: 6 } } }], 'human').ok, true);
  const sp = (s.project.clips[1].src as { shape: ReturnType<typeof defaultShape> }).shape;
  assert.equal(sp.kind, 'ellipse');
  assert.equal(sp.stroke.width, 6);
  assert.equal(sp.stroke.color, '#ffffff');
  assert.equal(s.apply([{ op: 'set_shape', id: 'c', patch: { w: 1 } }], 'human').ok, false); // clip media
  assert.equal(validate(s.project).length, 0);
});

t('keyframe hinh: shape.trim animate, chi tren clip hinh; resolveClip tra shape', () => {
  const s = make([shapeClip('s')]);
  assert.equal(isAnimatable('shape.trim', s.project.clips[0]), true);
  assert.equal(isAnimatable('shape.trim', make([mclip('c')]).project.clips[0]), false);
  assert.equal(s.apply([{ op: 'set_keyframes', id: 's', prop: 'shape.trim', keys: [K(0, 0), K(2, 1)] }], 'human').ok, true);
  near(resolveClip(s.project.clips[0], 1).shape!.trim, 0.5);
  near(resolveClip(s.project.clips[0], 3).shape!.trim, 1);
  assert.equal(mergeShape(defaultShape('ring'), { stroke: { width: 3 } }).stroke.width, 3);
});

t('grade moi: muc den/trang, vibrance', () => {
  const g = mergeGrade(undefined, { black: 0.1, white: 0.9 });
  near(gradePixel(g, null, 0.1, 0.1, 0.1)[0], 0, 1e-9);
  near(gradePixel(g, null, 0.9, 0.9, 0.9)[0], 1, 1e-9);
  assert.equal(isIdentity(g), false);
  assert.equal(isIdentity(defaultGrade()), true);
  const gv = mergeGrade(undefined, { vibrance: 1 });
  const dull = gradePixel(gv, null, 0.55, 0.5, 0.45); // sat 0.1 -> he so ~1.9
  const vivid = gradePixel(gv, null, 0.9, 0.2, 0.1); // sat 0.8 -> he so ~1.2
  const rd = (dull[0] - dull[2]) / 0.1,
    rv = (vivid[0] - vivid[2]) / 0.8;
  near(rd, 1.9, 0.02);
  near(rv, 1.2, 0.02);
  assert.ok(rd > rv);
  assert.ok(validateGrade({ ...defaultGrade(), black: 0.6, white: 0.62 }, 'g').length > 0);
});

console.log(`${n} test fx dat`);
