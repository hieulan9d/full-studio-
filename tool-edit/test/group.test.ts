import assert from 'node:assert/strict';
import { Session } from '../src/core/session';
import { DEFAULT_TRANSFORM, newProject, validate, type Clip, type Media } from '../src/core/schema';
import { expandGroups, newGroupId } from '../src/renderer/timeline-math';
import { buildAudioPlan } from '../src/main/exporter';
import { statsOf, type ScopeCounts } from '../src/core/scopes';

let n = 0;
const t = (name: string, fn: () => void) => {
  fn();
  n++;
  console.log('ok -', name);
};
const media: Media = { id: 'm1', path: 'x', kind: 'video', duration: 10, width: 1080, height: 1920, fps: 30, hasAudio: true };
const clip = (id: string, start: number, duration: number, track = 'v1'): Clip => ({ id, track, src: { type: 'media', mediaId: 'm1' }, start, duration, in: 0, volume: 1, transform: { ...DEFAULT_TRANSFORM }, keyframes: {} });
const mk = () => {
  const s = new Session();
  s.apply([{ op: 'add_media', media }, { op: 'add_clip', clip: clip('c1', 0, 2) }, { op: 'add_clip', clip: clip('c2', 2, 2) }, { op: 'add_clip', clip: clip('c3', 4, 2) }], 'human');
  return s;
};

t('group_clips: ghep 2 clip, cac clip con lai khong bi anh huong, du an hop le', () => {
  const s = mk();
  const r = s.apply([{ op: 'group_clips', ids: ['c1', 'c2'], group: 'g1' }], 'human');
  assert.ok(r.ok);
  assert.equal(s.project.clips.find((c) => c.id === 'c1')!.group, 'g1');
  assert.equal(s.project.clips.find((c) => c.id === 'c3')!.group, undefined);
  assert.deepEqual(validate(s.project), []);
});

t('group_clips: can >= 2 clip, clip phai ton tai, group khong rong', () => {
  const s = mk();
  assert.ok(!s.apply([{ op: 'group_clips', ids: ['c1'], group: 'g1' }], 'human').ok);
  assert.ok(!s.apply([{ op: 'group_clips', ids: ['c1', 'zz'], group: 'g1' }], 'human').ok);
  assert.ok(!s.apply([{ op: 'group_clips', ids: ['c1', 'c2'], group: '' }], 'human').ok);
  assert.equal(s.project.clips.some((c) => c.group), false, 'op loi khong de lai nhom nua chung');
});

t('ungroup: go nhom, hoan tac khoi phuc nhom', () => {
  const s = mk();
  s.apply([{ op: 'group_clips', ids: ['c1', 'c2'], group: 'g1' }], 'human');
  assert.ok(s.apply([{ op: 'ungroup', group: 'g1' }], 'human').ok);
  assert.equal(s.project.clips.some((c) => c.group), false);
  assert.ok(s.undo());
  assert.equal(s.project.clips.filter((c) => c.group === 'g1').length, 2);
  assert.ok(!s.apply([{ op: 'ungroup', group: 'khong-co' }], 'human').ok);
});

t('split_clip: manh moi thua huong nhom', () => {
  const s = mk();
  s.apply([{ op: 'group_clips', ids: ['c1', 'c2'], group: 'g1' }], 'human');
  s.apply([{ op: 'split_clip', id: 'c1', at: 1, newId: 'c9' }], 'human');
  assert.equal(s.project.clips.find((c) => c.id === 'c9')!.group, 'g1');
});

t('expandGroups / newGroupId: chon 1 clip keo ca nhom; id nhom moi khong trung', () => {
  const s = mk();
  s.apply([{ op: 'group_clips', ids: ['c1', 'c3'], group: 'g1' }], 'human');
  assert.deepEqual(expandGroups(s.project, ['c1']).sort(), ['c1', 'c3']);
  assert.deepEqual(expandGroups(s.project, ['c2']), ['c2']);
  assert.equal(newGroupId(s.project), 'g2');
});

t('statsOf: ty le duoi 16 / tren 235 theo luma', () => {
  const hist = new Uint32Array(4 * 256);
  // 100 diem: 10 diem luma 0..15, 20 diem luma 236..255, con lai 70 diem luma 128
  hist[3 * 256 + 5] = 10;
  hist[3 * 256 + 250] = 20;
  hist[3 * 256 + 128] = 70;
  for (let c = 0; c < 3; c++) hist[c * 256 + 128] = 100;
  const d: ScopeCounts = { w: 10, h: 10, cols: 1, hist, wave: new Uint32Array(4 * 256), vect: new Uint32Array(256 * 256) };
  const st = statsOf(d);
  assert.equal(st.below_legal_pct, 10);
  assert.equal(st.above_legal_pct, 20);
});

t('set_clip disabled: tat/bat, bat lai thi go truong, gia tri sai bi tu choi', () => {
  const s = mk();
  assert.ok(s.apply([{ op: 'set_clip', id: 'c1', patch: { disabled: true } }], 'human').ok);
  assert.equal(s.project.clips.find((c) => c.id === 'c1')!.disabled, true);
  assert.ok(s.apply([{ op: 'set_clip', id: 'c1', patch: { disabled: false } }], 'human').ok);
  assert.equal('disabled' in s.project.clips.find((c) => c.id === 'c1')!, false);
  assert.ok(!s.apply([{ op: 'set_clip', id: 'c1', patch: { disabled: 'yes' as unknown as boolean } }], 'human').ok);
  assert.deepEqual(validate(s.project), []);
});

t('xuat am thanh: clip vo hieu hoa khong vao ban tron', () => {
  const s = mk();
  const on = buildAudioPlan(s.project, 0);
  assert.ok(on.inputs.length > 0, 'co tieng khi bat');
  s.apply(['c1', 'c2', 'c3'].map((id) => ({ op: 'set_clip' as const, id, patch: { disabled: true } })), 'human');
  const off = buildAudioPlan(s.project, 0);
  assert.equal(off.inputs.length, 0);
});

t('remove_track: chi go track rong; clip con thi bi tu choi', () => {
  const s = mk();
  s.apply([{ op: 'add_track', track: { id: 'v2', kind: 'video', name: 'Video 2' } }], 'human');
  assert.ok(s.apply([{ op: 'remove_track', id: 'v2' }], 'human').ok);
  assert.equal(s.project.tracks.some((x) => x.id === 'v2'), false);
  assert.ok(!s.apply([{ op: 'remove_track', id: 'v1' }], 'human').ok, 'v1 con clip');
  assert.ok(!s.apply([{ op: 'remove_track', id: 'zz' }], 'human').ok);
  // chuyen clip roi go track trong cung mot buoc, hoan tac mot lan la quay lai het
  s.apply([{ op: 'add_track', track: { id: 'v3', kind: 'video', name: 'Video 3' } }], 'human');
  const r = s.apply([{ op: 'set_clip', id: 'c1', patch: { track: 'v3' } }, { op: 'set_clip', id: 'c2', patch: { track: 'v3', start: 5 } }, { op: 'set_clip', id: 'c3', patch: { track: 'v3', start: 8 } }, { op: 'remove_track', id: 'v1' }], 'human');
  assert.ok(r.ok, JSON.stringify(r));
  assert.ok(s.undo());
  assert.ok(s.project.tracks.some((x) => x.id === 'v1') && s.project.clips.every((c) => c.track === 'v1'));
});

console.log(`${n} test nhom clip/scope dat`);
