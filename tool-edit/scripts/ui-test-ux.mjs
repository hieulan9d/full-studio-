// Kiểm GIAO DIỆN bản mới: Trang chủ (tạo/mở/đổi tên/nhân bản/xóa dự án), Cài đặt + phím tắt, Alt+con lăn, thanh chia kéo được,
// chiều cao track, thanh đo âm lượng trái/phải, nhập thư mục, tab Âm thanh với thư mục SFX lưu bền.
// Chạy app: TOOL_EDIT_PROJECTS_DIR=out/projects-test TOOL_EDIT_CDP_PORT=9333 TOOL_EDIT_DEV_API=1 npx electron .   rồi: node scripts/ui-test-ux.mjs
import { chromium } from 'playwright-core';
import { existsSync, rmSync } from 'node:fs';
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
const waitFor = async (fn, ms = 6000, label = '') => {
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
page.on('dialog', (d) => void d.accept());
const errs = [];
page.on('pageerror', (e) => errs.push(String(e)));
await page.setViewportSize({ width: 1600, height: 950 }).catch(() => {});
await waitFor(() => page.evaluate(() => !!window.__te), 15000, 'sẵn sàng');
const T = (id) => page.locator(`[data-testid="${id}"]`);
const st = (fn, ...a) => page.evaluate(fn, ...a);

// ---------- Trang chủ ----------
// dọn dự án của lần chạy trước (chỉ trong thư mục thử)
for (const p of (await call('GET', '/projects')).data.projects) if (/projects-test/.test(p.path)) { await call('POST', '/projects/forget', { path: p.path }); rmSync(p.path, { force: true }); }
await call('POST', '/project/new', {});
await call('POST', '/library/remove_dir', { dir: resolve('out/media/folder-test') });
await call('POST', '/settings', { layout: { left: 290, right: 340, tl: 310, trackH: 1, maxed: 'none' } });
await page.reload();
await waitFor(() => page.evaluate(() => !!window.__te), 15000, 'tải lại');
await T('go-home').click();
await T('home').waitFor({ timeout: 4000 });
ok(true, 'Nút "Trang chủ" mở trang chủ');
await T('home-name').fill('Dự án thử');
await T('home-16x9').click();
await T('home-create').click();
await T('topbar').waitFor({ timeout: 6000 });
const proj1 = (await call('GET', '/project')).data;
ok(proj1.name === 'Dự án thử' && proj1.width === 1920 && proj1.height === 1080, 'Tạo dự án 16:9 từ Trang chủ: vào trình dựng, khung 1920×1080', `${proj1.name} ${proj1.width}x${proj1.height}`);
const files = (await call('GET', '/projects')).data;
const mine = files.projects.find((p) => p.name === 'Dự án thử');
ok(mine && existsSync(mine.path) && mine.current, 'Dự án được lưu ngay thành file .tedit trong thư mục dự án', mine?.path.split(/[\\/]/).pop());
await T('go-home').click();
await T('home').waitFor();
ok((await T('project-card').count()) >= 1 && (await T('home-continue').count()) === 0, 'Trang chủ liệt kê dự án, dự án trống không hiện nút "Tiếp tục"');
await T('home-name').fill('Dự án hai');
await T('home-create').click();
await T('topbar').waitFor();
await T('go-home').click();
await T('home').waitFor();
const names2 = (await call('GET', '/projects')).data.projects.map((p) => p.name);
ok(names2.includes('Dự án thử') && names2.includes('Dự án hai') && (await T('project-card').count()) === names2.length, 'Hai dự án vừa tạo có trong danh sách', names2.join(', '));
await T('home-search').fill('hai');
ok((await T('project-card').count()) === 1, 'Tìm theo tên lọc danh sách');
await T('home-search').fill('');
// đổi tên
const card = page.locator('[data-project="Dự án thử"]');
await card.locator('[data-testid="project-rename"]').click();
await T('modal-input').fill('Dự án đã đổi');
await T('modal-ok').click();
await waitFor(async () => (await call('GET', '/projects')).data.projects.some((p) => p.name === 'Dự án đã đổi' && /Dự án đã đổi/.test(p.path)), 4000, 'đổi tên');
ok(true, 'Đổi tên dự án: đổi cả tên trong file lẫn tên file');
await page.locator('[data-project="Dự án đã đổi"] [data-testid="project-dup"]').click();
await waitFor(async () => (await call('GET', '/projects')).data.projects.some((p) => /bản sao|ban sao/.test(p.name)), 4000, 'nhân bản');
ok(true, 'Nhân bản dự án tạo bản sao riêng');
const dupName = (await call('GET', '/projects')).data.projects.find((p) => /ban sao|bản sao/.test(p.name)).name;
await page.locator(`[data-project="${dupName}"] [data-testid="project-trash"]`).click();
await waitFor(async () => !(await call('GET', '/projects')).data.projects.some((p) => p.name === dupName), 5000, 'xóa');
ok(true, 'Xóa dự án (đưa vào Thùng rác) sau khi xác nhận');
await page.locator('[data-project="Dự án đã đổi"] [data-testid="project-forget"]').click();
await sleep(500);
const listAfter = (await call('GET', '/projects')).data.projects;
ok(listAfter.some((p) => p.name === 'Dự án đã đổi'), 'Bỏ khỏi danh sách: file nằm trong thư mục dự án nên vẫn được quét lại (không mất file)');
await page.locator('[data-project="Dự án đã đổi"] [data-testid="project-open"]').click();
await T('topbar').waitFor({ timeout: 6000 });
ok((await call('GET', '/project')).data.name === 'Dự án đã đổi', 'Nút "Mở" nạp dự án cũ vào trình dựng');

// ---------- Cài đặt + phím tắt ----------
await T('open-settings').click();
await T('settings').waitFor();
await T('keybtn-split').click();
await page.keyboard.press('X');
await waitFor(async () => (await st(() => window.__te.store.get().keymap.split)) === 'X', 3000, 'gán phím');
ok(true, 'Gán phím X cho "Cắt clip": nhấn tổ hợp mới thì lưu');
await T('keybtn-delete').click();
await page.keyboard.press('X');
await sleep(300);
ok((await T('keys-dup').count()) === 1 || (await T('keys-msg').count()) === 1, 'Gán trùng phím: có cảnh báo');
await T('keybtn-delete').click();
await page.keyboard.press('Control+Shift+D');
await waitFor(async () => (await st(() => window.__te.store.get().keymap.delete)) === 'Ctrl+Shift+D', 3000, 'gán delete');
await sleep(800);
const saved = (await call('GET', '/settings')).data;
ok(saved.keymap?.split === 'X' && saved.keymap?.delete === 'Ctrl+Shift+D', 'Phím tắt đã sửa được lưu xuống settings.json', JSON.stringify(saved.keymap));
await T('settings-close').click();
// X cắt clip
await call('POST', '/ops', { source: 'human', ops: [{ op: 'add_clip', clip: { id: 'k', track: 'v1', src: { type: 'gen', kind: 'bars', param: 0 }, start: 0, duration: 4, in: 0, volume: 1, transform: {}, keyframes: {} } }] });
await st(() => window.__te.player.seek(2));
await page.locator('.clip[data-clip="k"]').click({ position: { x: 30, y: 20 } });
await page.keyboard.press('x');
await waitFor(async () => (await call('GET', '/project')).data.clips.length === 2, 3000, 'cắt bằng X');
ok(true, 'Phím X (đã gán lại) cắt clip tại con trỏ');
await page.keyboard.press('s');
await sleep(300);
ok((await call('GET', '/project')).data.clips.length === 2, 'Phím S cũ không còn cắt nữa');
await page.keyboard.press('Control+z');
await waitFor(async () => (await call('GET', '/project')).data.clips.length === 1, 3000, 'undo');
// đặt lại
await T('open-settings').click();
await T('keys-reset').click();
await waitFor(async () => (await st(() => window.__te.store.get().keymap.split)) === 'S', 3000, 'đặt lại');
ok(true, 'Đặt lại tất cả phím về mặc định');
await T('settings-close').click();

// ---------- Alt + con lăn, zoom ----------
await st(() => window.__te.store.set({ zoom: 300 }));
await sleep(300);
const sc = page.locator('.tl-scroll');
const box = await sc.boundingBox();
await page.mouse.move(box.x + 400, box.y + 60);
const before = await sc.evaluate((e) => e.scrollLeft);
await page.keyboard.down('Alt');
await page.mouse.wheel(0, 400);
await page.keyboard.up('Alt');
await sleep(300);
const after = await sc.evaluate((e) => e.scrollLeft);
ok(after > before + 100, 'Alt + con lăn cuộn timeline sang phải', `${before} -> ${after}`);
await page.keyboard.down('Alt');
await page.mouse.wheel(0, -300);
await page.keyboard.up('Alt');
await sleep(300);
ok((await sc.evaluate((e) => e.scrollLeft)) < after, 'Alt + con lăn ngược cuộn sang trái');
const z0 = await st(() => window.__te.store.get().zoom);
await page.keyboard.down('Control');
await page.mouse.wheel(0, -200);
await page.keyboard.up('Control');
await sleep(300);
ok((await st(() => window.__te.store.get().zoom)) > z0, 'Ctrl + con lăn lên: phóng to timeline', `${z0} -> ${await st(() => window.__te.store.get().zoom)}`);

// ---------- chia khung kéo được ----------
const L0 = await st(() => window.__te.store.get().layout);
const sb = await T('split-left').boundingBox();
await page.mouse.move(sb.x + 3, sb.y + 200);
await page.mouse.down();
await page.mouse.move(sb.x + 143, sb.y + 200, { steps: 6 });
await page.mouse.up();
const L1 = await st(() => window.__te.store.get().layout);
ok(L1.left > L0.left + 100, 'Kéo thanh chia: khung Media rộng ra', `${L0.left} -> ${L1.left}`);
await T('split-left').dblclick();
ok((await st(() => window.__te.store.get().layout.left)) === 0, 'Bấm đúp thanh chia: thu gọn khung Media');
await T('split-left').dblclick();
ok((await st(() => window.__te.store.get().layout.left)) > 100, 'Bấm đúp lần nữa: mở lại');
const tb = await T('split-timeline').boundingBox();
await page.mouse.move(tb.x + 400, tb.y + 3);
await page.mouse.down();
await page.mouse.move(tb.x + 400, tb.y - 160, { steps: 6 });
await page.mouse.up();
const L2 = await st(() => window.__te.store.get().layout);
ok(L2.tl > L0.tl + 120, 'Kéo thanh chia ngang lên: timeline cao hơn', `${L0.tl} -> ${L2.tl}`);
await T('track-h').fill('1');
await sleep(300);
const rowH0 = await page.locator('.row').first().evaluate((e) => e.getBoundingClientRect().height);
await T('track-h').fill('2');
await sleep(300);
const rowH1 = await page.locator('.row').first().evaluate((e) => e.getBoundingClientRect().height);
ok(rowH1 > rowH0 * 1.5, 'Thanh "Cao track" làm các track cao hơn', `${rowH0} -> ${rowH1}`);
await st(() => document.activeElement?.blur());
await page.keyboard.press('Shift+T');
await sleep(300);
ok((await st(() => window.__te.store.get().layout.maxed)) === 'timeline', 'Phím Shift+T phóng to timeline');
await page.keyboard.press('Shift+T');
await sleep(800);
const saved2 = (await call('GET', '/settings')).data;
ok(saved2.layout?.left > 100 && saved2.layout?.tl > 400, 'Bố cục được lưu và nhớ lần sau', JSON.stringify(saved2.layout));
await T('max-timeline').click();
ok((await st(() => window.__te.store.get().layout.maxed)) === 'timeline' && (await T('max-timeline').innerText()).includes('Thu lại'), 'Nút "Phóng to" timeline: timeline chiếm cả vùng làm việc');
await T('max-timeline').click();
await T('max-preview').click();
ok((await st(() => window.__te.store.get().layout.maxed)) === 'preview', 'Nút "Phóng to" khung xem: ẩn timeline, khung xem lớn hơn');
await T('max-preview').click();
ok((await st(() => window.__te.store.get().layout.maxed)) === 'none', 'Bấm lại để thu về bố cục cũ');
await st(() => window.__te.store.set({ layout: { left: 290, right: 340, tl: 310, trackH: 1, maxed: 'none' } }));

// ---------- thanh đo âm lượng ----------
await call('POST', '/ops', { source: 'human', ops: [{ op: 'remove_clip', id: 'k' }] });
const imp = (await call('POST', '/media_import', { path: resolve('out/media/left-only.wav') })).data;
await waitFor(async () => (await call('GET', '/project')).data.media.find((m) => m.id === imp.mediaId)?.cache?.audio === 'ready', 15000, 'âm thanh');
await call('POST', '/ops', { source: 'human', ops: [{ op: 'add_clip', clip: { id: 'au', track: 'a1', src: { type: 'media', mediaId: imp.mediaId }, start: 0, duration: 4, in: 0, volume: 1, transform: {}, keyframes: {} } }] });
ok((await T('meter').count()) === 1, 'Có thanh đo âm lượng hai bên tai bên cạnh khung xem');
await st(() => window.__te.player.seek(0));
await st(() => window.__te.player.play());
await sleep(1200);
const dbL = Number(await T('meter-l').getAttribute('data-db'));
const dbR = await T('meter-r').getAttribute('data-db');
await st(() => window.__te.player.pause());
ok(dbL > -20 && dbL <= 0.5 && (dbR === '-inf' || Number(dbR) < -50), 'Thanh đo: file chỉ có tiếng tai trái → trái nhảy lên, phải im', `T ${dbL} dB, P ${dbR}`);
await sleep(3500);
ok(Number(await T('meter-l').getAttribute('data-db')) < dbL - 6 || (await T('meter-l').getAttribute('data-db')) === '-inf', 'Dừng phát: thanh rơi xuống');


// ---------- sao chép / cắt / dán / nhân đôi clip ----------
await call('POST', '/ops', { source: 'human', ops: [{ op: 'remove_clip', id: 'au' }].concat([]) });
await call('POST', '/ops', { source: 'human', ops: [
  { op: 'add_clip', clip: { id: 'p1', track: 'v1', src: { type: 'gen', kind: 'bars', param: 0 }, start: 0, duration: 2, in: 0, volume: 1, transform: { scale: 0.5 }, keyframes: {}, fx: { blur: { radius: 4 } }, blend: 'screen' } },
  { op: 'add_clip', clip: { id: 'p2', track: 'v1', src: { type: 'text', text: { content: 'Hai' } }, start: 5, duration: 1, in: 0, volume: 1, transform: {}, keyframes: {} } },
] });
const clips = async () => (await call('GET', '/project')).data.clips.filter((c) => c.id === 'p1' || c.id === 'p2' || c.start >= 0);
await st(() => window.__te.store.set({ selection: ['p1'] }));
await st(() => window.__te.store.set({ rightTab: 'props' }));
await st(() => document.activeElement?.blur());
await page.keyboard.press('Control+d');
await waitFor(async () => (await call('GET', '/project')).data.clips.filter((c) => c.src.type === 'gen').length === 2, 3000, 'nhân đôi');
let pj = (await call('GET', '/project')).data;
const dup = pj.clips.find((c) => c.src.type === 'gen' && c.id !== 'p1');
ok(Math.abs(dup.start - 2) < 1e-6 && dup.fx?.blur?.radius === 4 && dup.blend === 'screen' && dup.transform.scale === 0.5, 'Ctrl+D nhân đôi clip: đặt ngay sau bản gốc, giữ nguyên hiệu ứng, chế độ trộn, biến đổi', `start ${dup.start}`);
ok((await st(() => window.__te.store.get().selection)).join() === dup.id, 'Chọn luôn bản vừa nhân đôi');
await st(() => window.__te.store.set({ selection: ['p1', 'p2'] }));
await page.keyboard.press('Control+c');
await st(() => window.__te.player.seek(10));
await page.keyboard.press('Control+v');
await waitFor(async () => (await call('GET', '/project')).data.clips.length === 5, 3000, 'dán');
pj = (await call('GET', '/project')).data;
const pasted = pj.clips.filter((c) => c.start >= 10 - 1e-6).sort((a, b) => a.start - b.start);
ok(pasted.length === 2 && Math.abs(pasted[0].start - 10) < 1e-6 && Math.abs(pasted[1].start - 15) < 1e-6, 'Ctrl+C rồi Ctrl+V tại giây 10: dán cả nhóm, giữ khoảng cách giữa các clip (10 và 15)', pasted.map((c) => c.start).join(','));
await st(() => window.__te.player.seek(10.5));
await page.keyboard.press('Control+v');
await waitFor(async () => (await call('GET', '/project')).data.clips.length === 7, 3000, 'dán lần hai');
pj = (await call('GET', '/project')).data;
const starts = pj.clips.filter((c) => c.track === 'v1').map((c) => c.start).sort((a, b) => a - b);
const validOk = (await call('POST', '/ops', { source: 'human', ops: [] })).status === 200;
ok(validOk && pj.clips.filter((c) => c.src.type === 'text').length === 3, 'Dán lần nữa khi chỗ đã có clip: tự dịch tới chỗ trống, không chồng nhau', starts.join(','));
const toCut = pj.clips.filter((c) => c.start >= 10).map((c) => c.id);
await st((ids) => window.__te.store.set({ selection: ids }), toCut);
await page.keyboard.press('Control+x');
await waitFor(async () => (await call('GET', '/project')).data.clips.length === 3, 3000, 'cắt (lấy đi)');
ok(true, 'Ctrl+X lấy clip đi khỏi timeline');
await st(() => window.__te.player.seek(20));
await page.keyboard.press('Control+v');
await waitFor(async () => (await call('GET', '/project')).data.clips.length === 7, 3000, 'dán sau khi cắt');
ok(true, 'Dán lại clip đã cắt');
await page.keyboard.press('Control+z');
await waitFor(async () => (await call('GET', '/project')).data.clips.length === 3, 3000, 'hoàn tác dán');
ok(true, 'Ctrl+Z hoàn tác một lần dán');
await page.keyboard.press('Control+z');
await sleep(300);

// ---------- xuất / nhập bộ phím ----------
await T('open-settings').click();
ok((await T('keys-export').count()) === 1 && (await T('keys-import').count()) === 1, 'Cài đặt có nút Xuất… và Nhập… bộ phím');
await T('keybtn-paste').click();
await page.keyboard.press('Control+Shift+V');
await sleep(200);
ok((await st(() => window.__te.store.get().keymap.paste)) === 'Ctrl+Shift+V', 'Gán lại phím Dán thành Ctrl+Shift+V');
await T('settings-close').click();

// ---------- nhập thư mục + tab Âm thanh ----------
const fr = await call('POST', '/media_import', { path: resolve('out/media/folder-test') });
ok(fr.data.folder && fr.data.count === 2, 'Nhập cả thư mục: nhập 2 file media bên trong', JSON.stringify(fr.data).slice(0, 60));
await T('tab-library').click();
await T('lib-add-dir').waitFor();
await call('POST', '/library/scan', { dir: resolve('out/media/folder-test') });
await T('lib-rescan').click();
await waitFor(async () => (await T('lib-dir').count()) >= 1, 4000, 'thư mục kho');
ok(true, 'Tab Âm thanh liệt kê thư mục SFX đã thêm');
await waitFor(async () => (await page.locator('[data-testid="lib-dir"]', { hasText: 'folder-test' }).count()) === 1, 6000, 'thư mục thử hiện');
const nDirs = await T('lib-dir').count();
await page.locator('[data-testid="lib-dir"]', { hasText: 'folder-test' }).locator('[data-testid="lib-dir-remove"]').click();
await waitFor(async () => (await page.locator('[data-testid="lib-dir"]', { hasText: 'folder-test' }).count()) === 0, 6000, 'bỏ thư mục');
ok(true, 'Bỏ thư mục khỏi kho (không xóa file)');
ok(errs.length === 0, 'Không có lỗi JavaScript trong lúc dùng', errs.slice(0, 2).join(' | '));

console.log(`\n${pass} đạt, ${fail} thất bại`);
await browser.close();
process.exitCode = fail ? 1 : 0;
