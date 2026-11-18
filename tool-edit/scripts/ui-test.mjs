// Kiem giao dien THAT bang Playwright qua CDP: dieu khien cua so Electron nhu nguoi dung (chuot, ban phim, keo-tha).
// Chay app: TOOL_EDIT_CDP_PORT=9333 TOOL_EDIT_DEV_API=1 npx electron .   roi: node scripts/ui-test.mjs
import { chromium } from 'playwright-core';
import { spawnSync } from 'node:child_process';
import { mkdirSync, rmSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const BASE = `http://127.0.0.1:${process.env.TOOL_EDIT_PORT ?? 17480}`;
const MEDIA = resolve('out/media');
const OUT = resolve('out/ui');
mkdirSync(OUT, { recursive: true });
let pass = 0,
  fail = 0;
const ok = (c, n, x = '') => {
  c ? pass++ : fail++;
  console.log(`${c ? 'ok  ' : 'FAIL'} - ${n}${x ? '  [' + x + ']' : ''}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const call = async (method, path, body) => {
  const r = await fetch(BASE + path, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const ct = r.headers.get('content-type') ?? '';
  return { status: r.status, data: ct.includes('json') ? await r.json() : Buffer.from(await r.arrayBuffer()) };
};
const project = async () => (await call('GET', '/project')).data;
const waitFor = async (fn, ms = 8000, label = '') => {
  const t0 = Date.now();
  for (;;) {
    try {
      const v = await fn();
      if (v) return v;
    } catch {
      /* thu lai */
    }
    if (Date.now() - t0 > ms) throw new Error('qua han cho: ' + label);
    await sleep(100);
  }
};
const near = (a, b, tol) => Math.abs(a - b) <= tol;

const browser = await chromium.connectOverCDP(`http://127.0.0.1:${process.env.TOOL_EDIT_CDP_PORT ?? 9333}`);
const page = browser.contexts()[0].pages()[0];
await page.setViewportSize({ width: 1500, height: 900 }).catch(() => {});
await page.evaluate(() => window.__te && window.__te.store.set({ zoom: 100, layout: { left: 290, right: 340, tl: 310, trackH: 1, maxed: 'none' } })).catch(() => {}); // trạng thái giao diện còn sót từ lần chạy trước
await waitFor(() => page.evaluate(() => !!window.__te), 15000, 'giao dien san sang');
const st = (fn, ...a) => page.evaluate(fn, ...a);
const sel = () => st(() => window.__te.store.get().selection);
const playhead = () => st(() => window.__te.store.get().playhead);
const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png` });
const clipBox = async (id) => (await page.locator(`.clip[data-clip="${id}"]`).boundingBox());

// ---- 0. sach du an + nhap media (qua API vi hop thoai he dieu hanh khong tu dong hoa duoc)
await call('POST', '/project/new', {});
await waitFor(async () => (await project()).media.length === 0, 3000, 'du an moi');
const imp = {};
for (const n of ['seq.mp4', 'test-a.mp4', 'color.mp4', 'img.png', 'beep.wav']) imp[n] = (await call('POST', '/media_import', { path: resolve(MEDIA, n) })).data;
ok(Object.values(imp).every((x) => x.ok && x.mediaId), 'nhap 5 media (video, anh, am thanh)', Object.values(imp).map((x) => `${x.mediaId}:${x.kind}`).join(' '));
await waitFor(async () => {
  const p = await project();
  return p.media.every((m) => m.cache?.status === 'ready' && (m.cache.audio === 'ready' || m.cache.audio === 'none'));
}, 60000, 'cache video + tieng');
ok(true, 'cache video, tieng, anh deu san sang');
await sleep(800);
await shot('01-pool');
const items = await page.locator('[data-media]').count();
ok(items === 5, 'kho media hien 5 muc', String(items));
const thumbs = await page.locator('[data-media] .th').evaluateAll((els) => els.map((e) => e.style.backgroundImage.startsWith('url(')));
ok(thumbs.filter(Boolean).length >= 4, 'co anh thu nho cho video va anh (>=4/5)', thumbs.join(','));

// ---- 1. keo-tha tu kho media vao timeline
await page.dragAndDrop('[data-media="m1"]', '[data-track="v1"]', { targetPosition: { x: 104 + 100, y: 25 } });
await waitFor(async () => (await project()).clips.length === 1, 4000, 'tha clip');
let p = await project();
ok(p.clips[0].track === 'v1' && p.clips[0].src.mediaId === 'm1' && near(p.clips[0].start, 1.0, 0.05), 'keo-tha m1 vao track v1 tai giay ~1.0', `start=${p.clips[0].start}`);
const dragAudio = page.dragAndDrop('[data-media="m5"]', '[data-track="a1"]', { targetPosition: { x: 104 + 50, y: 20 } });
await dragAudio;
await waitFor(async () => (await project()).clips.length === 2, 4000, 'tha am thanh');
ok((await project()).clips.some((c) => c.track === 'a1' && c.src.mediaId === 'm5'), 'keo-tha am thanh vao track audio');
// tha video len track audio: tu chuyen sang track video (khong con bi tu choi)
await page.dragAndDrop('[data-media="m1"]', '[data-track="a1"]', { targetPosition: { x: 104 + 300, y: 20 } });
await waitFor(async () => (await project()).clips.length === 3, 4000, 'tha video len track audio');
ok((await project()).clips.filter((c) => c.src.mediaId === 'm1').every((c) => c.track === 'v1') && (await project()).clips.length === 3, 'tha VIDEO len track AUDIO: tu vao track video dung loai');
{ const pp = await project(); const extra = pp.clips.find((c) => c.src.mediaId === 'm1' && c.track === 'v1' && c.start > 1.5); if (extra) await call('POST', '/ops', { source: 'human', ops: [{ op: 'remove_clip', id: extra.id }] }); }
await waitFor(async () => (await project()).clips.length === 2, 3000, 'go clip thu de tiep tuc');

// them bang nut "+" va nhap doi
await page.locator('[data-media="m2"] button.add').click();
await page.locator('[data-media="m4"]').dblclick();
await waitFor(async () => (await project()).clips.length === 4, 4000, 'them bang +/dblclick');
p = await project();
const v1 = p.clips.filter((c) => c.track === 'v1').sort((a, b) => a.start - b.start);
ok(v1.length === 3 && v1.every((c, i) => i === 0 || c.start >= v1[i - 1].start + v1[i - 1].duration - 1e-6), 'them tu "+"/dblclick khong chong clip (tu day sang phai)', v1.map((c) => `${c.id}:${c.start.toFixed(2)}`).join(' '));
ok(v1.some((c) => c.src.mediaId === 'm4' && near(c.duration, 5, 0.01)), 'anh tinh mac dinh 5 giay');

await shot('02-timeline');

// ---- 2. chon + thuoc tinh
const c1 = p.clips.find((c) => c.src.mediaId === 'm1');
await page.locator(`.clip[data-clip="${c1.id}"]`).click({ position: { x: 40, y: 20 } });
ok((await sel()).join() === c1.id, 'click clip -> duoc chon');
await page.locator('[data-testid="tab-props"]').click();
await page.locator('[data-testid="f-transform.scale"]').fill('50');
await page.locator('[data-testid="f-transform.scale"]').press('Enter');
await waitFor(async () => near((await project()).clips.find((c) => c.id === c1.id).transform.scale, 0.5, 1e-6), 3000, 'scale');
ok(true, 'Thuoc tinh: dat ti le 50% -> transform.scale = 0.5');
await page.locator('[data-testid="f-transform.opacity"]').fill('80');
await page.locator('[data-testid="f-transform.opacity"]').press('Enter');
await page.locator('[data-testid="f-start"]').fill('0.5');
await page.locator('[data-testid="f-start"]').press('Enter');
await waitFor(async () => near((await project()).clips.find((c) => c.id === c1.id).start, 0.5, 1e-6), 3000, 'start');
p = await project();
ok(near(p.clips.find((c) => c.id === c1.id).transform.opacity, 0.8, 1e-6), 'Thuoc tinh: do duc 80%');
ok(true, 'Thuoc tinh: sua Bat dau = 0.5s (hop le, khong chong)');
// sua sai: dat bat dau chong len clip khac -> bao loi, khong doi
const other = p.clips.filter((c) => c.track === 'v1' && c.id !== c1.id)[0];
await page.locator('[data-testid="f-start"]').fill(String(other.start + 0.2));
await page.locator('[data-testid="f-start"]').press('Enter');
await sleep(500);
p = await project();
ok(near(p.clips.find((c) => c.id === c1.id).start, 0.5, 1e-6), 'Thuoc tinh: gia tri lam clip CHONG nhau bi tu choi (giu nguyen)', await st(() => window.__te.store.get().toast?.text ?? ''));
await page.locator('[data-testid="f-start"]').fill('0');
await page.locator('[data-testid="f-start"]').press('Enter');
await sleep(300);

// ---- 3. cat tai playhead bang phim S
const before = (await project()).clips.length;
const cc = (await project()).clips.find((c) => c.id === c1.id);
// dat playhead giua clip bang click len thuoc
const ruler = await page.locator('[data-testid="ruler"]').boundingBox();
const zoom = await st(() => window.__te.store.get().zoom);
await page.mouse.click(ruler.x + 104 + (cc.start + 2) * zoom, ruler.y + 12);
await waitFor(async () => near(await playhead(), cc.start + 2, 0.03), 2000, 'playhead');
ok(true, 'Click len thuoc dat playhead dung vi tri', `t=${(await playhead()).toFixed(3)}`);
await page.keyboard.press('s');
await waitFor(async () => (await project()).clips.length === before + 1, 3000, 'cat');
p = await project();
const left = p.clips.find((c) => c.id === c1.id);
const rightHalf = p.clips.find((c) => c.src.mediaId === 'm1' && c.id !== c1.id && near(c.start, left.start + left.duration, 1e-6));
ok(near(left.duration, 2, 0.04) && near(rightHalf.start, left.start + left.duration, 1e-6) && near(rightHalf.in, left.in + left.duration, 1e-6), 'Phim S: cat dung tai playhead, hai nua noi lien, `in` nua phai dung', `left.dur=${left.duration.toFixed(3)} right.in=${rightHalf.in.toFixed(3)}`);
await page.keyboard.press('Control+z');
await waitFor(async () => (await project()).clips.length === before, 3000, 'undo cat');
ok(true, 'Ctrl+Z hoan tac phep cat');
await page.keyboard.press('Control+y');
await waitFor(async () => (await project()).clips.length === before + 1, 3000, 'redo cat');
ok(true, 'Ctrl+Y lam lai');

// ---- 4. keo clip (move) co snap
p = await project();
const mv = p.clips.find((c) => c.src.mediaId === 'm4'); // anh 5s tren v1
const mvBox = await clipBox(mv.id);
const startBefore = mv.start;
await page.mouse.move(mvBox.x + mvBox.width / 2, mvBox.y + mvBox.height / 2);
await page.mouse.down();
await page.mouse.move(mvBox.x + mvBox.width / 2 + 120, mvBox.y + mvBox.height / 2, { steps: 8 });
const guideShown = await page.locator('.guide').count();
await page.mouse.up();
await waitFor(async () => !near((await project()).clips.find((c) => c.id === mv.id).start, startBefore, 1e-6), 3000, 'move');
p = await project();
const moved = p.clips.find((c) => c.id === mv.id);
ok(moved.start > startBefore + 0.5, 'Keo clip sang phai doi `start`', `${startBefore.toFixed(2)} -> ${moved.start.toFixed(2)}`);
ok(p.clips.filter((c) => c.track === 'v1').every((a, i, arr) => arr.every((b, j) => i === j || a.start + a.duration <= b.start + 1e-6 || b.start + b.duration <= a.start + 1e-6)), 'Sau khi keo khong co clip chong nhau');
// keo chong len clip khac -> bi tu choi
const a0 = p.clips.find((c) => c.id === c1.id);
const box0 = await clipBox(a0.id);
const tgt = p.clips.find((c) => c.track === 'v1' && c.id !== a0.id && c.src.mediaId === 'm2');
const tgtBox = await clipBox(tgt.id);
await page.mouse.move(box0.x + 30, box0.y + 20);
await page.mouse.down();
await page.mouse.move(tgtBox.x + tgtBox.width / 2, box0.y + 20, { steps: 10 });
await page.mouse.up();
await sleep(600);
p = await project();
ok(near(p.clips.find((c) => c.id === a0.id).start, a0.start, 1e-6), 'Keo clip de chong len clip khac bi tu choi, clip tro ve cho cu', await st(() => window.__te.store.get().toast?.text ?? ''));

// ---- 5. trim canh phai
p = await project();
const tr = p.clips.find((c) => c.src.mediaId === 'm2');
const trBox = await clipBox(tr.id);
const durBefore = tr.duration;
await page.mouse.move(trBox.x + trBox.width - 3, trBox.y + trBox.height / 2);
await page.mouse.down();
await page.mouse.move(trBox.x + trBox.width - 3 - 150, trBox.y + trBox.height / 2, { steps: 8 });
await page.mouse.up();
await waitFor(async () => (await project()).clips.find((c) => c.id === tr.id).duration < durBefore - 0.5, 3000, 'trim');
p = await project();
ok(near(p.clips.find((c) => c.id === tr.id).duration, durBefore - 1.5, 0.2) && p.clips.find((c) => c.id === tr.id).in === 0, 'Trim canh phai: ngan clip ~1.5s, `in` giu nguyen', `${durBefore.toFixed(2)} -> ${p.clips.find((c) => c.id === tr.id).duration.toFixed(2)}`);
// trim canh trai: in tang
p = await project();
const tl = p.clips.find((c) => c.src.mediaId === 'm2');
const tlBox = await clipBox(tl.id);
await page.mouse.move(tlBox.x + 3, tlBox.y + tlBox.height / 2);
await page.mouse.down();
await page.mouse.move(tlBox.x + 3 + 100, tlBox.y + tlBox.height / 2, { steps: 8 });
await page.mouse.up();
await waitFor(async () => (await project()).clips.find((c) => c.id === tl.id).in > 0.5, 3000, 'trim trai');
p = await project();
const tl2 = p.clips.find((c) => c.id === tl.id);
ok(near(tl2.in, 1.0, 0.2) && near(tl2.start + tl2.duration, tl.start + tl.duration, 1e-6), 'Trim canh trai: `in` tang ~1s, mep phai giu nguyen', `in=${tl2.in.toFixed(2)}`);
await shot('03-after-edit');

// ---- 6. xoa, xoa lien, hoan tac
p = await project();
const n0 = p.clips.length;
const victim = p.clips.find((c) => c.src.mediaId === 'm4');
await page.locator(`.clip[data-clip="${victim.id}"]`).click({ position: { x: 30, y: 20 } });
await page.keyboard.press('Delete');
await waitFor(async () => (await project()).clips.length === n0 - 1, 3000, 'xoa');
ok(true, 'Delete: xoa clip da chon');
await page.keyboard.press('Control+z');
await waitFor(async () => (await project()).clips.length === n0, 3000, 'undo xoa');
ok(true, 'Ctrl+Z khoi phuc clip da xoa');
// xoa lien: clip sau keo lui
p = await project();
const before2 = Object.fromEntries(p.clips.map((c) => [c.id, c.start]));
const v1s = p.clips.filter((c) => c.track === 'v1').sort((a, b) => a.start - b.start);
const first = v1s[0];
await page.locator(`.clip[data-clip="${first.id}"]`).click({ position: { x: 20, y: 20 } });
await page.keyboard.press('Shift+Delete');
await waitFor(async () => (await project()).clips.length === n0 - 1, 3000, 'xoa lien');
p = await project();
const second = v1s[1];
ok(near(p.clips.find((c) => c.id === second.id).start, before2[second.id] - first.duration, 1e-6), 'Shift+Delete: xoa lien, clip sau keo lui dung bang do dai da xoa');
await page.keyboard.press('Control+z');
await waitFor(async () => (await project()).clips.length === n0, 3000, 'undo xoa lien');

// ---- 7. phat lai: dong ho theo am thanh, hinh ve lien tuc
await page.keyboard.press('Home');
await waitFor(async () => (await playhead()) === 0, 2000, 've dau');
const f0 = await st(() => window.__te.stats.previewFrames);
await page.keyboard.press(' ');
await waitFor(() => st(() => window.__te.store.get().playing), 3000, 'bat dau phat');
const tA = await playhead();
await sleep(1500);
const tB = await playhead();
const f1 = await st(() => window.__te.stats.previewFrames);
const audState = await st(() => window.__te.audio.state);
ok(tB - tA > 1.1 && tB - tA < 1.9, 'Space: phat ~1.5s thi playhead tien ~1.5s (dong ho am thanh)', `dt=${(tB - tA).toFixed(2)}s`);
ok(f1 - f0 > 15, 'Phat lai ve >= 10 khung/giay tren man hinh', `${f1 - f0} khung / 1.5s`);
ok(audState === 'running', 'AudioContext dang chay khi phat', audState);
await shot('04-playing');
await page.keyboard.press(' ');
await waitFor(async () => !(await st(() => window.__te.store.get().playing)), 2000, 'dung');
ok(true, 'Space lan 2: dung phat');
const peaks = await st(() => window.__te.audio.peaks.size);
const waves = await page.locator('.clip canvas.wave').count();
ok(peaks >= 1 && waves >= 1, 'Waveform: co bieu do song am tren clip', `peaks=${peaks} canvas=${waves}`);

// ---- 8. de xuat cua AI: xem thu, chap nhan, tu choi
p = await project();
const target = p.clips.find((c) => c.src.mediaId === 'm1');
const pr1 = (await call('POST', '/propose', { source: 'ai:thu', note: 'Thu nho clip 1 con 30%', ops: [{ op: 'set_transform', id: target.id, patch: { scale: 0.3 } }] })).data;
const pr2 = (await call('POST', '/propose', { source: 'ai:thu', note: 'Xoa clip 1', ops: [{ op: 'remove_clip', id: target.id }] })).data;
await waitFor(() => page.locator('[data-testid="badge"]').count().then((n) => n > 0), 4000, 'badge');
ok((await page.locator('[data-testid="badge"]').innerText()) === '2', 'Tab "De xuat cua AI" co huy hieu 2');
await page.locator('[data-testid="tab-proposals"]').click();
await waitFor(() => page.locator(`[data-testid="prop-${pr1.proposal_id}"]`).count().then((n) => n > 0), 3000, 'the de xuat');
ok((await page.locator(`[data-testid="prop-${pr1.proposal_id}"] .diff`).innerText()).includes('scale=0.3'), 'The de xuat hien diff (scale=0.3)');
await page.locator(`[data-testid="preview-${pr2.proposal_id}"]`).click();
await waitFor(() => st(() => !!window.__te.store.get().draft), 3000, 'xem thu');
await sleep(300);
const ghost = await page.locator('.tlghost.del').count();
ok(ghost >= 1 && (await project()).clips.some((c) => c.id === target.id), 'Xem thu de xuat "xoa": ve khung do tren timeline, du an CHUA doi', `ghost.del=${ghost}`);
await shot('05-proposal-preview');
await page.locator(`[data-testid="preview-${pr2.proposal_id}"]`).click(); // tat xem thu
await page.locator(`[data-testid="reject-${pr2.proposal_id}"]`).click();
await sleep(400);
ok((await call('GET', '/proposals')).data.find((x) => x.id === pr2.proposal_id).status === 'rejected' && (await project()).clips.some((c) => c.id === target.id), 'Tu choi de xuat: trang thai rejected, du an khong doi');
await page.locator(`[data-testid="accept-${pr1.proposal_id}"]`).click();
await waitFor(async () => near((await project()).clips.find((c) => c.id === target.id).transform.scale, 0.3, 1e-6), 3000, 'accept');
const hs = (await project()).history.at(-1);
ok(hs.source === 'ai:thu', 'Chap nhan de xuat: du an doi, history ghi nguon ai:thu', hs.source);
// AI tren HTTP khong duoc tu duyet (khi khong bat DEV): kiem o e2e rieng

// ---- 9. luu / mo / tu luu
const file = resolve(OUT, 'ui-test.tedit');
rmSync(file, { force: true });
const clipsBefore = (await project()).clips.length;
const sv = await call('POST', '/project/save', { path: file });
ok(sv.status === 200 && existsSync(file), 'Luu du an ra file .tedit');
const asv = (await call('GET', '/project/autosave')).data;
ok(asv.exists === true, 'Tu luu: co file autosave', JSON.stringify(asv).slice(0, 80));
await call('POST', '/project/new', {});
await waitFor(async () => (await project()).clips.length === 0, 3000, 'new');
ok((await page.locator('[data-media]').count()) === 0, 'Du an moi: kho media va timeline trong');
const ld = await call('POST', '/project/load', { path: file });
ok(ld.status === 200 && ld.data.clips === clipsBefore, 'Mo lai file: dung so clip', `${ld.data.clips}`);
await waitFor(async () => (await project()).media.every((m) => m.cache?.status === 'ready' && m.cache.audio !== 'pending'), 60000, 'cache sau mo');
ok(true, 'Mo lai: cache media tu dong san sang lai (khong can nhap lai)');
await page.keyboard.press('Home');
await sleep(600);
ok((await st(() => window.__te.store.get().previewError)) == null, 'Mo lai: preview ve duoc, khong loi');
const pf = await call('GET', '/preview_frame?t=2.5&scale=0.1');
ok(pf.status === 200, 'preview_frame hoat dong sau khi mo lai');

// ---- 10. snapshot: bam NUT THAT tren giao dien (Electron khong co window.prompt nen dung hop thoai rieng)
const nSnap = (await project()).clips.length;
await page.getByRole('button', { name: 'Snapshot', exact: true }).click();
await page.locator('[data-testid="modal-input"]').waitFor({ timeout: 3000 });
await page.locator('[data-testid="modal-input"]').fill('truoc-xoa');
await page.locator('[data-testid="modal-input"]').press('Enter');
await waitFor(async () => (await call('GET', '/snapshots')).data.some((x) => x.name === 'truoc-xoa'), 3000, 'snapshot tao');
ok(true, 'Nut Snapshot: hop thoai nhap ten -> tao snapshot "truoc-xoa"');
const toDel = (await project()).clips[0];
await call('POST', '/ops', { source: 'human', ops: [{ op: 'remove_clip', id: toDel.id }] });
await waitFor(async () => (await project()).clips.length === nSnap - 1, 3000, 'xoa de thu snapshot');
await page.getByRole('button', { name: 'Khôi phục', exact: true }).click();
await page.locator('[data-testid="modal-item"]').first().waitFor({ timeout: 3000 });
ok((await page.locator('[data-testid="modal-item"]').first().innerText()).includes('truoc-xoa'), 'Nut Khoi phuc: hop thoai liet ke snapshot');
await page.locator('[data-testid="modal-item"]').first().click();
await waitFor(async () => (await project()).clips.length === nSnap, 3000, 'restore');
ok(true, 'Chon snapshot: clip da xoa tro lai');
await page.keyboard.press('Control+z');
await waitFor(async () => (await project()).clips.length === nSnap - 1, 3000, 'undo restore');
ok(true, 'Khoi phuc snapshot hoan tac duoc bang Ctrl+Z');
await page.keyboard.press('Control+z');
await page.getByRole('button', { name: 'Snapshot', exact: true }).click();
await page.locator('[data-testid="modal-input"]').waitFor({ timeout: 3000 });
await page.keyboard.press('Escape');
await sleep(200);
ok((await page.locator('[data-testid="modal"]').count()) === 0, 'Esc dong hop thoai, khong tao snapshot moi', String((await call('GET', '/snapshots')).data.length));

// ---- 11. anh tinh render dung mau + xuat tu giao dien
p = await project();
const imgClip = p.clips.find((c) => c.src.mediaId === 'm4');
const pimg = await call('GET', `/preview_frame?t=${imgClip.start + 1}&scale=0.2`);
const raw = spawnSync('ffmpeg', ['-v', 'error', '-i', 'pipe:0', '-vf', 'crop=1:1:108:192', '-f', 'rawvideo', '-pix_fmt', 'rgb24', 'pipe:1'], { input: pimg.data }).stdout;
ok(raw.length === 3 && near(raw[0], 0xc0, 8) && near(raw[1], 0x20, 8) && near(raw[2], 0x20, 8), 'Anh tinh (do C02020) render dung mau trong preview', `${[...raw]}`);

await page.locator('[data-testid="export916"]').click();
await waitFor(async () => (await call('GET', '/jobs')).data.some((j) => j.type === 'render' && j.state === 'done'), 90000, 'xuat tu giao dien');
const jr = (await call('GET', '/jobs')).data.find((j) => j.type === 'render' && j.state === 'done');
const pr = JSON.parse(spawnSync('ffprobe', ['-v', 'error', '-print_format', 'json', '-show_streams', '-show_format', jr.result.path]).stdout.toString());
const hasAudio = pr.streams.some((s) => s.codec_type === 'audio');
ok(jr.result.frames > 30 && pr.streams.find((s) => s.codec_type === 'video').width === 1080 && hasAudio, 'Nut "Xuat 9:16" tao file 1080x1920 co am thanh', `${jr.result.frames} khung, ${jr.result.seconds}s`);
await sleep(400);
await shot('06-after-export');

// ---- 12. Moi voi thay doi chua luu: hoi xac nhan (window.confirm duoc Electron ho tro)
const nClips = (await project()).clips.length;
let dlg = '';
page.once('dialog', (d) => { dlg = d.message(); void d.dismiss(); });
await page.getByRole('button', { name: 'Mới', exact: true }).click();
await sleep(500);
ok(dlg.includes('chưa lưu') && (await project()).clips.length === nClips, 'Nut Moi khi chua luu: hoi xac nhan, "Huy" giu nguyen du an', dlg);
page.once('dialog', (d) => void d.accept());
await page.getByRole('button', { name: 'Mới', exact: true }).click();
await waitFor(async () => (await project()).clips.length === 0, 4000, 'moi sau xac nhan');
ok(true, 'Nut Moi: dong y thi tao du an trong');

console.log(`\n${pass} dat, ${fail} that bai`);
await browser.close();
process.exitCode = fail ? 1 : 0;
