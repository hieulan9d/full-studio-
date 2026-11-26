import assert from 'node:assert/strict';
import { Session } from '../src/core/session';
import { DEFAULT_TRANSFORM, validate } from '../src/core/schema';
import { chartEase, chartEnd, defaultChart, formatNumber, itemProgress, mergeChart, niceMax, validateChart, CHART_KINDS } from '../src/core/chart';

let n = 0;
const t = (name: string, fn: () => void) => {
  fn();
  n++;
  console.log('ok -', name);
};
const mk = (kind: 'bar' | 'number' = 'bar') => {
  const s = new Session();
  s.apply([{ op: 'add_clip', clip: { id: 'k1', track: 'v1', src: { type: 'chart', chart: defaultChart(kind) }, start: 0, duration: 4, in: 0, volume: 1, transform: { ...DEFAULT_TRANSFORM }, keyframes: {} } }], 'human');
  return s;
};

t('formatNumber: kieu Viet (cham nghin, phay thap phan), tien to / hau to', () => {
  assert.equal(formatNumber(1250.5, 1), '1.250,5');
  assert.equal(formatNumber(1234567, 0), '1.234.567');
  assert.equal(formatNumber(999, 0, '$', 'k'), '$999k');
  assert.equal(formatNumber(-4200, 0), '-4.200');
  assert.equal(formatNumber(0.5, 2), '0,50');
});

t('niceMax: tran truc dep', () => {
  assert.equal(niceMax(96), 100);
  assert.equal(niceMax(100), 100);
  assert.equal(niceMax(101), 200);
  assert.equal(niceMax(0.37), 0.5);
  assert.equal(niceMax(23), 25);
  assert.equal(niceMax(0), 1);
});

t('hoat hoa: tien do 0 truoc delay, 1 sau duration, so le theo stagger', () => {
  const c = defaultChart('bar');
  assert.equal(itemProgress(c, 0, 0), 0);
  assert.equal(itemProgress(c, 0, c.delay + c.duration + 0.01), 1);
  assert.ok(itemProgress(c, 3, c.delay + 0.5) < itemProgress(c, 0, c.delay + 0.5), 'muc sau cham hon');
  assert.ok(chartEnd(c) > c.delay + c.duration, 'bar co stagger: ket thuc muon hon');
  assert.equal(chartEnd(defaultChart('number')), 0.15 + 1.2);
  for (const e of ['out', 'inout', 'linear'] as const) assert.ok(chartEase(0, e) === 0 && chartEase(1, e) === 1 && chartEase(0.5, e) > 0.4);
  assert.equal(itemProgress({ ...c, duration: 0 }, 0, 0), 1);
});

t('validateChart: mac dinh moi kieu hop le; bat loi du lieu', () => {
  for (const k of CHART_KINDS) assert.deepEqual(validateChart(defaultChart(k), 'x'), [], k);
  const c = defaultChart('pie');
  assert.ok(validateChart({ ...c, data: [] }, 'x').length);
  assert.ok(validateChart({ ...c, data: [{ label: 'a', value: -1 }] }, 'x').length, 'tron khong nhan gia tri am');
  assert.ok(validateChart({ ...c, data: [{ label: 'a', value: 0 }] }, 'x').length, 'tong 0');
  assert.ok(validateChart({ ...defaultChart('line'), data: [{ label: 'a', value: -3 }, { label: 'b', value: 4 }] }, 'x').length === 0, 'duong cho phep am');
  assert.ok(validateChart({ ...c, palette: ['red'] }, 'x').length);
  assert.ok(validateChart({ ...c, w: 10 }, 'x').length);
  assert.ok(validateChart({ ...c, data: Array.from({ length: 30 }, (_, i) => ({ label: String(i), value: 1 })) }, 'x').length);
});

t('add_clip chart: gop mac dinh cho phan thieu; set_chart gop, doi du lieu, bao loi', () => {
  const s = new Session();
  const r = s.apply([{ op: 'add_clip', clip: { id: 'k2', track: 'v1', src: { type: 'chart', chart: { kind: 'donut', data: [{ label: 'A', value: 3 }] } as never }, start: 0, duration: 4, in: 0, volume: 1, transform: { ...DEFAULT_TRANSFORM }, keyframes: {} } }], 'human');
  assert.ok(r.ok, JSON.stringify(r));
  const ch = (s.project.clips[0].src as { chart: ReturnType<typeof defaultChart> }).chart;
  assert.equal(ch.kind, 'donut');
  assert.equal(ch.w, defaultChart('donut').w);
  assert.ok(s.apply([{ op: 'set_chart', id: 'k2', patch: { title: 'Tong', data: [{ label: 'A', value: 5 }, { label: 'B', value: 7 }] } }], 'human').ok);
  assert.equal((s.project.clips[0].src as never as { chart: { data: unknown[] } }).chart.data.length, 2);
  assert.ok(!s.apply([{ op: 'set_chart', id: 'k2', patch: { bg: 'xanh' } }], 'human').ok);
  assert.ok(!s.apply([{ op: 'set_chart', id: 'khong-co', patch: { title: 'x' } }], 'human').ok);
  assert.deepEqual(validate(s.project), []);
  const u = mk('number');
  assert.ok(!u.apply([{ op: 'set_chart', id: 'k1', patch: { w: 5 } }], 'human').ok, 'cu the khong doi khi loi');
});

t('mergeChart: data / palette duoc thay ca mang, khong dung chung tham chieu', () => {
  const a = defaultChart('bar');
  const b = mergeChart(a, { data: [{ label: 'x', value: 1 }], palette: ['#ffffff'] });
  assert.equal(b.data.length, 1);
  assert.equal(a.data.length, 4);
  b.palette.push('#000000');
  assert.equal(a.palette.length, 6);
});

t('clip bieu do tren track audio bi tu choi', () => {
  const s = new Session();
  const r = s.apply([{ op: 'add_clip', clip: { id: 'k3', track: 'a1', src: { type: 'chart', chart: defaultChart('bar') }, start: 0, duration: 4, in: 0, volume: 1, transform: { ...DEFAULT_TRANSFORM }, keyframes: {} } }], 'human');
  assert.ok(!r.ok);
});

console.log(`${n} test bieu do dat`);
