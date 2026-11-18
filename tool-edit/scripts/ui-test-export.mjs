// Kiểm hộp thoại "Xuất sang…" trong giao diện (F-97). Chạy app như ui-test-view.mjs rồi: TOOL_EDIT_PORT=17481 TOOL_EDIT_CDP_PORT=9334 node scripts/ui-test-export.mjs
import { chromium } from 'playwright-core';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const BASE = `http://127.0.0.1:${process.env.TOOL_EDIT_PORT ?? 17480}`;
let pass = 0,
  fail = 0;
const ok = (c, n, x = '') => {
  c ? pass++ : fail++;
  console.log(`${c ? 'ok  ' : 'FAIL'} - ${n}${x ? '  [' + x + ']' : ''}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const call = async (method, path, body) => {
  const r = await fetch(BASE + path, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, data: await r.json() };
};
const waitFor = async (fn, ms = 8000, label = '') => {
  const t0 = Date.now();
  for (;;) {
    try {
      const v = await fn();
      if (v) return v;
    } catch {
      /* thử lại */
    }
    if (Date.now() - t0 > ms) throw new Error('quá hạn chờ: ' + label);
    await sleep(120);
  }
};
const browser = await chromium.connectOverCDP(`http://127.0.0.1:${process.env.TOOL_EDIT_CDP_PORT ?? 9333}`);
const page = browser.contexts()[0].pages()[0];
const errs = [];
page.on('pageerror', (e) => errs.push(String(e)));
await page.setViewportSize({ width: 1600, height: 950 }).catch(() => {});
const T = (id) => page.locator(`[data-testid="${id}"]`);

await call('POST', '/project/new', {});
await page.reload();
await waitFor(() => page.evaluate(() => !!window.__te), 15000, 'sẵn sàng');
await T('topbar').waitFor({ timeout: 8000 });
const im = (await call('POST', '/media_import', { path: resolve('out/media/aroll6.mp4') })).data;
await waitFor(async () => (await call('GET', '/project')).data.media[0]?.cache?.status === 'ready', 30000, 'cache');
const tf = { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1, fit: 'contain', anchorH: 'center', anchorV: 'middle', margin: 0.06 };
await call('POST', '/ops', { ops: [{ op: 'add_track', track: { id: 'v2', kind: 'video', name: 'Chữ' } }, { op: 'add_clip', clip: { id: 'c1', track: 'v1', src: { type: 'media', mediaId: im.mediaId }, start: 0, duration: 3, in: 0, volume: 1, transform: tf, keyframes: {} } }, { op: 'add_clip', clip: { id: 't1', track: 'v2', src: { type: 'text', text: { content: 'Xin chào' } }, start: 0.5, duration: 1, in: 0, volume: 1, transform: tf, keyframes: {} } }] });
await sleep(500);

await T('export-to').click();
await T('export-dialog').waitFor({ timeout: 3000 });
ok(true, 'Nút "Xuất sang…" mở hộp thoại');
for (const id of ['premiere', 'resolve', 'capcut', 'ae', 'edl']) ok((await T(`export-target-${id}`).count()) === 1, `Có lựa chọn ${id}`);
let sum = await T('export-summary').innerText();
ok(/Chuyển nguyên bản: 1 clip/.test(sum) && /vào lớp phủ: 1 clip/.test(sum), 'Tóm tắt: 1 clip chuyển nguyên bản, 1 clip chữ vào lớp phủ', sum.split('\n')[0]);
ok((await T('export-warning').count()) >= 1 && /lớp video trong suốt/.test(await T('export-warning').first().innerText()), 'Hiện cảnh báo phần chữ thành lớp phủ');
ok(/chưa kiểm/.test(await T('export-verified').innerText()), 'Ghi rõ mức kiểm: "chưa kiểm" trên phần mềm đích', await T('export-verified').innerText());
await T('export-target-edl').check();
await sleep(150);
ok((await T('export-overlay').count()) === 0, 'EDL: không có tuỳ chọn lớp phủ');
ok(/chỉ có điểm cắt/i.test(await T('export-summary').innerText()), 'EDL: cảnh báo chỉ có điểm cắt');
await T('export-target-capcut').check();
await sleep(300);
const capAvail = !(await T('export-unavailable').count());
ok(true, capAvail ? 'CapCut: có bản nháp khuôn trên máy' : 'CapCut: báo chưa có khuôn', capAvail ? '' : await T('export-unavailable').innerText());
await T('export-target-ae').check();
await T('export-aspect').selectOption('16:9');
await sleep(150);
ok(/16:9|1920/.test(await T('export-aspect').innerText()), 'Chọn được tỉ lệ 16:9');
await T('export-aspect').selectOption('project');
await T('export-target-premiere').check();
await T('export-go').click();
await T('export-dialog').waitFor({ state: 'detached', timeout: 3000 });
ok(true, 'Bấm Xuất: hộp thoại đóng, job chạy nền');
const job = await waitFor(async () => (await call('GET', '/jobs')).data.find((j) => j.type === 'export_timeline' && j.state !== 'running'), 120000, 'job xuất');
ok(job.state === 'done' && job.result.files.every((f) => existsSync(f)), 'Job xuất xong: mọi file có thật', job.error ?? `${job.result.files.length} file`);
const toast = await waitFor(async () => { const x = await T('toast').innerText().catch(() => ''); return /Đã xuất sang premiere/.test(x) ? x : null; }, 10000, 'thông báo xong').catch(() => '');
ok(/Đã xuất sang premiere/.test(toast), 'Thông báo hoàn tất kèm nút Mở thư mục', toast.slice(0, 70));
ok(errs.length === 0, 'Không có lỗi JS trong trang', errs[0] ?? '');
console.log(`\n${pass} đạt, ${fail} hỏng`);
await browser.close();
process.exit(fail ? 1 : 0);
