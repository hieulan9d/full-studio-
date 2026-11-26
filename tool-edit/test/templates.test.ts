import assert from 'node:assert/strict';
import { Session } from '../src/core/session';
import { newProject, validate, DEFAULT_TRANSFORM, type Project } from '../src/core/schema';
import { TEMPLATES, checkVar, expandTemplate, findTemplate } from '../src/core/templates';

let n = 0;
const t = (name: string, fn: () => void) => {
  fn();
  n++;
  console.log('ok -', name);
};
const apply = (p: Project, ops: unknown[]) => {
  const s = new Session();
  s.load(structuredClone(p));
  const r = s.apply(ops as never, 'human');
  return { r, project: s.project };
};

t('moi mau: sinh op hop le, ap vao du an trong thi du an hop le, cung mot nhom', () => {
  for (const tp of TEMPLATES) {
    const ex = expandTemplate(tp, {}, newProject(), 1);
    assert.ok(!('error' in ex), `${tp.id}: ${'error' in ex ? ex.error : ''}`);
    if ('error' in ex) return;
    const { r, project } = apply(newProject(), ex.ops);
    assert.ok(r.ok, `${tp.id}: ${JSON.stringify(r)}`);
    assert.deepEqual(validate(project), [], tp.id);
    const cs = project.clips.filter((c) => ex.clipIds.includes(c.id));
    assert.equal(cs.length, tp.clips.length, tp.id);
    assert.ok(cs.every((c) => c.group === ex.group && c.tag === `tpl:${tp.id}`), `${tp.id}: cung nhom + tag`);
    assert.ok(cs.every((c) => c.start >= 1 - 1e-9 && c.start + c.duration <= 1 + tp.duration + 1e-6), `${tp.id}: nam trong thoi luong mau`);
  }
});

t('thu tu lop giu dung: lop cao hon nam tren track co chi so cao hon', () => {
  const tp = findTemplate('glass-card')!;
  const ex = expandTemplate(tp, {}, newProject(), 0) as Exclude<ReturnType<typeof expandTemplate>, { error: string }>;
  const { project } = apply(newProject(), ex.ops);
  const idx = (id: string) => project.tracks.findIndex((x) => x.id === project.clips.find((c) => c.id === id)!.track);
  const byLayer = tp.clips.map((c, i) => ({ layer: c.layer, idx: idx(ex.clipIds[i]) }));
  for (const a of byLayer) for (const b of byLayer) if (a.layer < b.layer) assert.ok(a.idx < b.idx, 'lop thap hon phai o track thap hon');
});

t('dung lai track trong; track ban thi tao track moi o tren cung; ten khong trung', () => {
  const tp = findTemplate('cta-button')!; // 2 lop
  // du an co v1 trong + v2 ban trong khoang
  const base = newProject();
  base.tracks.push({ id: 'v2', kind: 'video', name: 'Video 2' });
  const first = apply(base, [{ op: 'add_clip', clip: { id: 'c1', track: 'v2', src: { type: 'gen', kind: 'bars', param: 0 }, start: 0, duration: 10, in: 0, volume: 1, transform: { ...DEFAULT_TRANSFORM }, keyframes: {} } }]).project;
  const ex = expandTemplate(tp, {}, first, 1) as Exclude<ReturnType<typeof expandTemplate>, { error: string }>;
  const added = ex.ops.filter((o) => o.op === 'add_track');
  assert.equal(added.length, 1, 'v1 con trong dung lai, v2 ban nen can 1 track moi');
  const { r, project } = apply(first, ex.ops);
  assert.ok(r.ok, JSON.stringify(r));
  assert.equal(new Set(project.tracks.map((x) => x.name)).size, project.tracks.length, 'ten track khong trung');
  assert.deepEqual(validate(project), []);
  // dat chong len nhau lan 2 tai cung thoi diem: van hop le (tao track moi)
  const ex2 = expandTemplate(tp, {}, project, 1) as Exclude<ReturnType<typeof expandTemplate>, { error: string }>;
  const again = apply(project, ex2.ops);
  assert.ok(again.r.ok);
  assert.notEqual(ex2.group, ex.group, 'nhom moi khac nhom cu');
  assert.deepEqual(validate(again.project), []);
});

t('bien: thay chu, so, mau, du lieu; mac dinh khi thieu; bao loi bien la / sai kieu', () => {
  const tp = findTemplate('stat-counter')!;
  const ex = expandTemplate(tp, { value: 4321.5, label: 'Don hang', suffix: ' don', color: '#ff0000' }, newProject(), 0) as Exclude<ReturnType<typeof expandTemplate>, { error: string }>;
  const { project } = apply(newProject(), ex.ops);
  const ch = project.clips.find((c) => c.src.type === 'chart')!.src as { chart: { data: { label: string; value: number }[]; suffix: string; palette: string[] } };
  assert.equal(ch.chart.data[0].value, 4321.5, 'so thay nguyen kieu so');
  assert.equal(ch.chart.data[0].label, 'Don hang');
  assert.equal(ch.chart.suffix, ' don');
  assert.equal(ch.chart.palette[0], '#ff0000');
  const bar = expandTemplate(findTemplate('bar-chart-card')!, { data: 'A: 10\nB: 25,5\nC: 1.200' }, newProject(), 0) as Exclude<ReturnType<typeof expandTemplate>, { error: string }>;
  const bp = apply(newProject(), bar.ops).project;
  const bd = (bp.clips[0].src as { chart: { data: { label: string; value: number }[] } }).chart.data;
  assert.deepEqual(bd.map((d) => d.value), [10, 25.5, 1200], 'du lieu bieu do doc kieu Viet');
  assert.ok('error' in expandTemplate(tp, { khong_co: 1 }, newProject(), 0));
  assert.ok('error' in expandTemplate(tp, { value: 'abc' as never }, newProject(), 0));
  assert.ok('error' in expandTemplate(tp, { color: 'do' }, newProject(), 0));
  assert.ok('error' in expandTemplate(tp, {}, newProject(), -1));
  assert.equal(checkVar({ id: 'x', label: '', type: 'text', default: '' }, 'a'.repeat(500))?.includes('qua dai'), true);
});

t('vi tri doi tu px@1080 sang ti le khung: 9:16 va 16:9 cho cung kich thuoc pixel', () => {
  const tp = findTemplate('glass-card')!; // tieu de dy = -38 px
  const portrait = newProject();
  const land = newProject();
  land.width = 1920;
  land.height = 1080;
  const get = (p: Project) => {
    const ex = expandTemplate(tp, {}, p, 0) as Exclude<ReturnType<typeof expandTemplate>, { error: string }>;
    const { project } = apply(p, ex.ops);
    return project.clips.find((c) => c.src.type === 'text' && (c.src as { text: { content: string } }).text.content === 'Tính năng mới')!;
  };
  const a = get(portrait),
    b = get(land);
  assert.ok(Math.abs(a.transform.y * 1920 - -38) < 1e-6, '9:16: y * cao khung = -38 px');
  assert.ok(Math.abs(b.transform.y * 1080 - -38) < 1e-6, '16:9: y * cao khung = -38 px');
  // keyframe transform.y cung doi: thong bao app-toast
  const toast = expandTemplate(findTemplate('app-toast')!, {}, portrait, 0) as Exclude<ReturnType<typeof expandTemplate>, { error: string }>;
  const pj = apply(portrait, toast.ops).project;
  const card = pj.clips.find((c) => c.tag === 'tpl:app-toast')!;
  const ky = card.keyframes['transform.y'];
  assert.ok(Math.abs(ky[ky.length - 1].v * 1920 - -420) < 1e-6, 'keyframe cuoi = vi tri dich (-420 px)');
});

console.log(`${n} test mau dung san dat`);
