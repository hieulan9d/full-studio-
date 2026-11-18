import assert from 'node:assert/strict';
import { Session } from '../src/core/session';
import { DEFAULT_TRANSFORM, newProject, validate, type Clip } from '../src/core/schema';
import { EASE_PRESETS, volumeExpr, sampleTrack, bezierAt, easeFromName, easeName, evalTrack, findKeyAt, resolveClip, shiftKeys, splitKeys, upsertKey, type Ease, type Keyframe } from '../src/core/anim';
import { defaultText, mergeText, validateText } from '../src/core/text';
import { PRESETS, getPreset, presetKeys } from '../src/core/presets';

let n = 0;
const t = (name: string, fn: () => void) => {
  fn();
  n++;
  console.log('ok -', name);
};
const K = (tt: number, v: number, ease: Ease = EASE_PRESETS.linear): Keyframe => ({ t: tt, v, ease });
const near = (a: number, b: number, tol = 1e-6) => assert.ok(Math.abs(a - b) <= tol, `${a} !~ ${b}`);

// cai dat tham chieu doc lap: lay mau tham so hoa cua cubic-bezier roi chia doi tim t theo x
function refBezier(e: Ease, x: number): number {
  const bz = (a: number, b: number, c: number, u: number) => 3 * a * (1 - u) ** 2 * u + 3 * b * (1 - u) * u * u + u ** 3 * c;
  let lo = 0,
    hi = 1;
  for (let i = 0; i < 60; i++) {
    const u = (lo + hi) / 2;
    if (bz(e.x1, e.x2, 1, u) < x) lo = u;
    else hi = u;
  }
  const u = (lo + hi) / 2;
  return 3 * e.y1 * (1 - u) ** 2 * u + 3 * e.y2 * (1 - u) * u * u + u ** 3;
}

t('bezierAt: khop cai dat tham chieu tren moi preset, nhieu diem', () => {
  for (const [name, e] of Object.entries(EASE_PRESETS)) {
    if (e.kind !== 'bezier') continue;
    for (let i = 0; i <= 50; i++) near(bezierAt(e, i / 50), refBezier(e, i / 50), 2e-5);
    assert.ok(name);
  }
});

t('bezierAt: dau mut, linear, hold, doi xung ease-in-out', () => {
  const eio = EASE_PRESETS['ease-in-out'];
  near(bezierAt(eio, 0), 0);
  near(bezierAt(eio, 1), 1);
  near(bezierAt(eio, 0.5), 0.5, 1e-6);
  near(bezierAt(EASE_PRESETS.linear, 0.37), 0.37);
  near(bezierAt(EASE_PRESETS.hold, 0.99), 0);
  assert.ok(bezierAt(EASE_PRESETS.overshoot, 0.6) > 1, 'overshoot vuot 1');
  assert.ok(bezierAt(EASE_PRESETS.snap, 0.2) > 0.6, 'snap tang rat nhanh luc dau');
});

t('easeName / easeFromName round-trip', () => {
  for (const n2 of Object.keys(EASE_PRESETS)) assert.equal(easeName(easeFromName(n2)!), n2);
  assert.equal(easeName({ kind: 'bezier', x1: 0.3, y1: 0.2, x2: 0.7, y2: 0.9 }), 'custom');
  assert.equal(easeFromName('khong-co'), null);
});

t('evalTrack: giu gia tri ngoai khoang, noi suy tuyen tinh, hold', () => {
  const ks = [K(1, 10), K(3, 30), K(4, 0, EASE_PRESETS.hold), K(6, 100)];
  near(evalTrack(ks, 0), 10);
  near(evalTrack(ks, 2), 20);
  near(evalTrack(ks, 3.5), 15);
  near(evalTrack(ks, 4.5), 0); // hold giu v cua khung 4
  near(evalTrack(ks, 9), 100);
  assert.ok(Number.isNaN(evalTrack([], 1)));
});

t('evalTrack: bezier ease-in-out o giua = trung binh', () => {
  const ks = [K(0, 0, EASE_PRESETS['ease-in-out']), K(2, 10)];
  near(evalTrack(ks, 1), 5, 1e-5);
  assert.ok(evalTrack(ks, 0.4) < 2, 'cham luc dau');
});

const clip = (extra: Partial<Clip> = {}): Clip => ({ id: 'c1', track: 'v1', src: { type: 'gen', kind: 'bars', param: 0 }, start: 0, duration: 4, in: 0, volume: 1, transform: { ...DEFAULT_TRANSFORM }, keyframes: {}, ...extra });
const textClip = (extra: Partial<Clip> = {}): Clip => clip({ src: { type: 'text', text: defaultText() }, ...extra });

t('resolveClip: ghi de transform va text, khong doi clip goc', () => {
  const c = textClip({ keyframes: { 'transform.opacity': [K(0, 0), K(2, 1)], 'text.size': [K(0, 100), K(2, 200)], 'text.fill.offset': [K(0, 0), K(4, 1)] } });
  const before = JSON.stringify(c);
  const r = resolveClip(c, 1);
  near(r.transform.opacity, 0.5);
  near(r.text!.size, 150);
  near(r.text!.fill.offset, 0.25);
  assert.equal(JSON.stringify(c), before);
  near(resolveClip(c, 99).transform.opacity, 1);
});

t('upsertKey/findKeyAt/shiftKeys', () => {
  let ks = [K(0, 0), K(2, 2)];
  ks = upsertKey(ks, K(1, 5));
  assert.deepEqual(ks.map((k) => k.t), [0, 1, 2]);
  ks = upsertKey(ks, K(1.00001, 7)); // cung thoi diem trong dung sai -> ghi de
  assert.equal(ks.length, 3);
  assert.equal(findKeyAt(ks, 1)?.v, 7);
  const sh = shiftKeys({ a: ks }, -0.5);
  assert.deepEqual(sh.a.map((k) => +k.t.toFixed(3)), [-0.5, 0.5, 1.5]); // khung ghi de giu thoi diem MOI (1.00001)
});

t('splitKeys: lien tuc tai diem cat va giu duong cong tuyen tinh', () => {
  const map = { p: [K(0, 0), K(2, 10)] };
  const { left, right } = splitKeys(map, 0.5);
  near(evalTrack(left.p, 0.5), 2.5);
  near(evalTrack(right.p, 0), 2.5);
  near(evalTrack(right.p, 0.75), evalTrack(map.p, 1.25)); // 6.25
  near(evalTrack(right.p, 1.5), 10);
  // cat sau khung cuoi / truoc khung dau
  const a = splitKeys(map, 3);
  near(evalTrack(a.right.p, 0), 10);
  const b = splitKeys({ p: [K(1, 4), K(2, 8)] }, 0.5);
  near(evalTrack(b.left.p, 0.2), 4);
  near(evalTrack(b.right.p, 0), 4);
  near(evalTrack(b.right.p, 0.5), 4); // dung o truoc khung dau van giu
  near(evalTrack(b.right.p, 1.5), 8);
});

const withClip = (c: Clip) => {
  const s = new Session();
  const r = s.apply([{ op: 'add_clip', clip: c }], 'human');
  assert.equal(r.ok, true, r.errors.join(';'));
  return s;
};

t('op set_keyframe/remove_keyframe/set_keyframes', () => {
  const s = withClip(clip());
  assert.equal(s.apply([{ op: 'set_keyframe', id: 'c1', prop: 'transform.opacity', t: 0, v: 0, ease_preset: 'snap' }, { op: 'set_keyframe', id: 'c1', prop: 'transform.opacity', t: 1, v: 1 }], 'ai:x').ok, true);
  const ks = s.project.clips[0].keyframes['transform.opacity'];
  assert.equal(ks.length, 2);
  assert.equal(easeName(ks[0].ease), 'snap');
  assert.equal(easeName(ks[1].ease), 'ease-in-out'); // mac dinh
  assert.equal(s.apply([{ op: 'set_keyframe', id: 'c1', prop: 'transform.opacity', t: 1, v: 0.5 }], 'human').ok, true); // ghi de, giu ease
  assert.equal(s.project.clips[0].keyframes['transform.opacity'][1].v, 0.5);
  assert.equal(s.apply([{ op: 'remove_keyframe', id: 'c1', prop: 'transform.opacity', t: 0 }], 'human').ok, true);
  assert.equal(s.project.clips[0].keyframes['transform.opacity'].length, 1);
  assert.equal(s.apply([{ op: 'remove_keyframe', id: 'c1', prop: 'transform.opacity', t: 1 }], 'human').ok, true);
  assert.equal(s.project.clips[0].keyframes['transform.opacity'], undefined);
  assert.equal(s.apply([{ op: 'remove_keyframe', id: 'c1', prop: 'transform.opacity', t: 9 }], 'human').ok, false);
  assert.equal(s.apply([{ op: 'set_keyframes', id: 'c1', prop: 'transform.x', keys: [K(2, 1), K(0, 0)] }], 'human').ok, true); // tu sap xep
  assert.deepEqual(s.project.clips[0].keyframes['transform.x'].map((k) => k.t), [0, 2]);
  assert.equal(s.apply([{ op: 'set_keyframes', id: 'c1', prop: 'transform.x', keys: [] }], 'human').ok, true);
  assert.equal(s.project.clips[0].keyframes['transform.x'], undefined);
});

t('keyframe: thuoc tinh khong hop le / sai loai clip / trung thoi diem bi tu choi', () => {
  const s = withClip(clip());
  assert.equal(s.apply([{ op: 'set_keyframe', id: 'c1', prop: 'text.size', t: 0, v: 5 }], 'human').ok, false); // clip gen khong co text
  assert.equal(s.apply([{ op: 'set_keyframe', id: 'c1', prop: 'transform.khong-co', t: 0, v: 5 }], 'human').ok, false);
  assert.equal(s.apply([{ op: 'set_keyframe', id: 'c1', prop: 'volume', t: 0, v: 1 }], 'human').ok, false); // gen khong co tieng
  assert.equal(s.apply([{ op: 'set_keyframes', id: 'c1', prop: 'transform.x', keys: [K(1, 0), K(1, 2)] }], 'human').ok, false); // trung t
  assert.equal(s.apply([{ op: 'set_keyframe', id: 'c1', prop: 'transform.x', t: 0, v: NaN }], 'human').ok, false);
  assert.equal(s.apply([{ op: 'set_keyframe', id: 'c1', prop: 'transform.x', t: 0, v: 1, ease: { kind: 'bezier', x1: 2, y1: 0, x2: 1, y2: 1 } }], 'human').ok, false); // x1 ngoai 0..1
  assert.equal(s.apply([{ op: 'set_keyframe', id: 'c1', prop: 'transform.x', t: 0, v: 1, ease_preset: 'khong-co' }], 'human').ok, false);
});

t('split_clip chia keyframe, giu lien tuc; trim dau (in doi) day keyframe lui', () => {
  const c = clip({ duration: 4, keyframes: { 'transform.x': [K(0, 0), K(4, 8)] } });
  const s = withClip(c);
  assert.equal(s.apply([{ op: 'split_clip', id: 'c1', at: 1, newId: 'c2' }], 'human').ok, true);
  const a = s.project.clips.find((x) => x.id === 'c1')!,
    b = s.project.clips.find((x) => x.id === 'c2')!;
  near(resolveClip(a, 1).transform.x, 2);
  near(resolveClip(b, 0).transform.x, 2);
  near(resolveClip(b, 3).transform.x, 8);
  // trim dau: in tang 1 -> keyframe lui 1
  const s2 = withClip(clip({ keyframes: { 'transform.x': [K(1, 0), K(3, 4)] } }));
  assert.equal(s2.apply([{ op: 'set_clip', id: 'c1', patch: { start: 1, duration: 3, in: 1 } }], 'human').ok, true);
  assert.deepEqual(s2.project.clips[0].keyframes['transform.x'].map((k) => k.t), [0, 2]);
});

t('set_text: gop sau, stops thay ca mang; tu choi mau/gradient sai', () => {
  const s = withClip(textClip());
  assert.equal(s.apply([{ op: 'set_text', id: 'c1', patch: { content: 'Xin chào Việt Nam', size: 200, fill: { type: 'linear', stops: [{ pos: 0, color: '#ff0000' }, { pos: 1, color: '#0000ff' }] }, stroke: { width: 8 } } }], 'human').ok, true);
  const tx = (s.project.clips[0].src as any).text;
  assert.equal(tx.content, 'Xin chào Việt Nam');
  assert.equal(tx.fill.type, 'linear');
  assert.equal(tx.fill.stops[1].color, '#0000ff');
  assert.equal(tx.stroke.width, 8);
  assert.equal(tx.stroke.color, '#000000'); // giu truong khong dung toi
  assert.equal(s.apply([{ op: 'set_text', id: 'c1', patch: { fill: { color: 'do' } } }], 'human').ok, false);
  assert.equal(s.apply([{ op: 'set_text', id: 'c1', patch: { fill: { type: 'linear', stops: [{ pos: 0, color: '#ff0000' }] } } }], 'human').ok, false); // can >= 2 diem
  assert.equal(s.apply([{ op: 'set_text', id: 'c1', patch: { animator: { preset: 'lung-tung' as any } } }], 'human').ok, false);
  assert.equal(s.apply([{ op: 'set_text', id: 'c1', patch: { size: -5 } }], 'human').ok, false);
  const m = new Session();
  m.apply([{ op: 'add_clip', clip: clip() }], 'human');
  assert.equal(m.apply([{ op: 'set_text', id: 'c1', patch: { content: 'x' } }], 'human').ok, false); // khong phai clip chu
});

t('clip chu: phai tren track video; validate mac dinh hop le', () => {
  const p = newProject();
  p.clips.push(textClip());
  assert.deepEqual(validate(p), []);
  const q = newProject();
  q.clips.push(textClip({ track: 'a1' }));
  assert.ok(validate(q).some((e) => /track video/.test(e)));
  assert.deepEqual(validateText(defaultText()), []);
  assert.ok(validateText({ ...defaultText(), weight: 1000 }).length > 0);
});

t('apply_preset: gop text, tao keyframe dung (fromEnd theo do dai clip), thay track cu', () => {
  const s = withClip(textClip({ duration: 3, keyframes: { 'transform.opacity': [K(0, 0.1)] } }));
  assert.equal(s.apply([{ op: 'apply_preset', id: 'c1', preset: 'keyword-gradient' }], 'ai:x').ok, true);
  const c = s.project.clips[0];
  const tx = (c.src as any).text;
  assert.equal(tx.fill.type, 'linear');
  assert.equal(tx.fill.stops[0].color, '#7563ff');
  const op = c.keyframes['transform.opacity'];
  assert.deepEqual(op.map((k) => +k.t.toFixed(4)), [0, 0.0667, 2.9, 3]); // 2 khung vao, 3 khung ra o cuoi clip 3s
  assert.deepEqual(op.map((k) => k.v), [0, 1, 1, 0]);
  const sc = c.keyframes['transform.scale'];
  near(sc[0].v, 1.35);
  assert.equal(easeName(sc[0].ease), 'snap');
  near(sc[1].t, 5 / 30, 1e-5);
  near(resolveClip(c, 0).transform.scale, 1.35);
  near(resolveClip(c, 1).transform.scale, 1);
  assert.equal(s.apply([{ op: 'apply_preset', id: 'c1', preset: 'khong-co' }], 'human').ok, false);
  const g = withClip(clip());
  assert.equal(g.apply([{ op: 'apply_preset', id: 'c1', preset: 'keyword-gradient' }], 'human').ok, false); // khong phai clip chu
});

t('moi preset co noi dung hop le va tao keyframe hop le tren clip 0.5s (qua ngan van hop le)', () => {
  for (const pr of PRESETS) {
    const c = textClip({ duration: 0.5 });
    const s = new Session();
    s.apply([{ op: 'add_clip', clip: c }], 'human');
    const r = s.apply([{ op: 'apply_preset', id: 'c1', preset: pr.id }], 'human');
    assert.equal(r.ok, true, `${pr.id}: ${r.errors.join(';')}`);
    assert.ok(pr.source.length > 5 && pr.description.length > 5);
  }
  assert.ok(getPreset('neon-number'));
  assert.deepEqual(Object.keys(presetKeys(getPreset('neon-number')!, 2)).sort(), ['transform.opacity', 'transform.rotation', 'transform.scale']);
});

t('mergeText khong doi ban goc', () => {
  const a = defaultText();
  const before = JSON.stringify(a);
  const b = mergeText(a, { size: 50, glow: { strength: 2 } });
  assert.equal(JSON.stringify(a), before);
  assert.equal(b.size, 50);
  assert.equal(b.glow.strength, 2);
  assert.equal(b.glow.radius, a.glow.radius);
});

t('volumeExpr: bieu thuc ffmpeg cho ra dung gia tri keyframe (kiem bang cach tinh bieu thuc)', () => {
  const evalExpr = (expr: string, tt: number) =>
    (new Function('IF', 'LT', 't', 'return ' + expr.split('if(').join('IF(').split('lt(').join('LT(') + ';') as (...a: unknown[]) => number)((c: number, a: number, b: number) => (c ? a : b), (a: number, b: number) => (a < b ? 1 : 0), tt);
  const lin = [K(0, 0), K(2, 1), K(3, 0.25)];
  const e1 = volumeExpr(lin);
  assert.ok(!e1.includes(' '), 'khong co khoang trang');
  for (const tt of [-1, 0, 0.5, 1, 2, 2.5, 3, 5]) near(evalExpr(e1, tt), evalTrack(lin, tt), 1e-5);
  const eased = [K(0, 0, EASE_PRESETS['ease-in-out']), K(2, 1, EASE_PRESETS.hold), K(3, 0.4)];
  const e2 = volumeExpr(eased);
  for (let i = 0; i <= 60; i++) near(evalExpr(e2, i * 0.06), evalTrack(eased, i * 0.06), 0.02); // gap khuc 10 doan/ease: sai so nho
  assert.equal(sampleTrack([]).length, 0);
  near(evalExpr(volumeExpr([K(1, 0.7)]), 0), 0.7);
});

t('add_clip chu: bo sung truong thieu tu mac dinh', () => {
  const s = new Session();
  const r = s.apply([{ op: 'add_clip', clip: { id: 'c1', track: 'v1', src: { type: 'text', text: { content: 'Xin chao', size: 90 } as never }, start: 0, duration: 2, in: 0, volume: 1, transform: {} as never, keyframes: {} } }], 'ai:x');
  assert.equal(r.ok, true, r.errors.join(';'));
  const tx = (s.project.clips[0].src as any).text;
  assert.equal(tx.content, 'Xin chao');
  assert.equal(tx.size, 90);
  assert.equal(tx.font, 'Segoe UI'); // mac dinh
  assert.equal(tx.fill.type, 'solid');
  assert.equal(s.project.clips[0].transform.anchorH, 'center');
});

console.log(`${n} test anim dat`);
