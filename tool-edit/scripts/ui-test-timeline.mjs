// Kiem GIAO DIEN timeline moi: tha media tu vao dung loai track, chuot phai "Tach video va audio", quet chon nhieu clip bang chuot,
// clip ghep (Ctrl+G) va huy ghep (Ctrl+Shift+G), keo ca nhom, sao chep nhom khong chung id nhom.
// Chay app: TOOL_EDIT_CDP_PORT=9333 TOOL_EDIT_DEV_API=1 npx electron .   roi: node scripts/ui-test-timeline.mjs   (can out/media/test-a.mp4 va out/media/beep.wav)
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const BASE = `http://127.0.0.1:${process.env.TOOL_EDIT_PORT ?? 17480}`;
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
  return { status: r.status, data: await r.json() };
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
    await sleep(120);
  }
};
const browser = await chromium.connectOverCDP(`http://127.0.0.1:${process.env.TOOL_EDIT_CDP_PORT ?? 9333}`);
const page = browser.contexts()[0].pages()[0];
await page.setViewportSize({ width: 1600, height: 950 }).catch(() => {});
await waitFor(() => page.evaluate(() => !!window.__te), 15000, 'giao dien san sang');
const T = (id) => page.locator(`[data-testid="${id}"]`);
const errs = [];
page.on('pageerror', (e) => errs.push(String(e)));

await call('POST', '/settings', { keymap: {} }); // phim tat mac dinh (cac test khac co the da sua phim)
await call('POST', '/project/new', {});
await page.reload();
await waitFor(() => page.evaluate(() => !!window.__te), 15000, 'reload');
const importOne = async (f) => {
  const r = (await call('POST', '/media_import', { path: resolve(f) })).data;
  for (const id of [r.job_id, r.audio_job_id]) if (id) await waitFor(async () => (await call('GET', `/jobs/${id}`)).data.state === 'done', 90000, 'cache');
  return r.mediaId;
};
const mV = await importOne('out/media/test-a.mp4');
const mA = await importOne('out/media/beep.wav');
await waitFor(async () => (await page.locator('.media').count()) >= 2, 5000, 'kho media');

const drop = async (selector, mediaId, x) => {
  const dt = await page.evaluateHandle((id) => { const d = new DataTransfer(); d.setData('application/x-tool-edit-media', id); return d; }, mediaId);
  await page.locator(selector).dispatchEvent('drop', { dataTransfer: dt, clientX: x, clientY: 300 });
};
const rowBox = async (tr) => page.locator(`.row[data-track="${tr}"]`).boundingBox();

// ---- 1. tha tu vao dung loai track ----
let rb = await rowBox('v1');
await drop('.row[data-track="v1"]', mA, rb.x + 200); // am thanh tha len track VIDEO
await waitFor(async () => (await project()).clips.length === 1, 4000, 'clip 1');
let p = await project();
ok(p.tracks.find((t) => t.id === p.clips[0].track).kind === 'audio', 'Tha file am thanh len track video: tu vao track audio', p.clips[0].track);
const a1 = await rowBox('a1');
await drop('.row[data-track="a1"]', mV, a1.x + 300); // video tha len track AUDIO
await waitFor(async () => (await project()).clips.length === 2, 4000, 'clip 2');
p = await project();
const cv = p.clips.find((c) => c.src.mediaId === mV);
ok(p.tracks.find((t) => t.id === cv.track).kind === 'video', 'Tha video len track audio: tu vao track video', cv.track);
await page.locator('.tl-scroll').dispatchEvent('drop', { dataTransfer: await page.evaluateHandle((id) => { const d = new DataTransfer(); d.setData('application/x-tool-edit-media', id); return d; }, mV), clientX: 900, clientY: 940 });
await waitFor(async () => (await project()).clips.length === 3, 4000, 'clip 3');
ok(true, 'Tha video ra ngoai track (vung trong cua timeline): van them duoc vao track video');
await call('POST', '/ops', { source: 'human', ops: [{ op: 'set_clip', id: p.clips.find((c) => c.src.mediaId === mV).id, patch: { start: 0 } }] });

// ---- 2. chuot phai: tach video va audio ----
p = await project();
const vclips = p.clips.filter((c) => c.src.mediaId === mV).sort((x, y) => x.start - y.start);
const v0 = vclips[0];
await page.locator(`.clip[data-clip="${v0.id}"]`).click({ button: 'right', position: { x: 30, y: 20 } });
await T('clip-menu').waitFor({ timeout: 3000 });
ok((await T('ctx-separate').isEnabled()) && !(await T('ctx-group').isEnabled()) && !(await T('ctx-ungroup').isEnabled()), 'Menu chuot phai clip video co tieng: "Tach" bat, "Ghep"/"Huy ghep" tat (moi chon 1 clip)');
await page.screenshot({ path: `${OUT}/tl-menu.png` });
await T('ctx-separate').click();
await waitFor(async () => (await project()).clips.length === 4, 4000, 'tach');
p = await project();
const vAfter = p.clips.find((c) => c.id === v0.id);
const aNew = p.clips.find((c) => c.src.mediaId === mV && c.track !== v0.track && p.tracks.find((t) => t.id === c.track).kind === 'audio');
ok(!!aNew && aNew.start === v0.start && aNew.duration === v0.duration && aNew.in === v0.in && aNew.volume === 1, 'Tach: co clip audio cung media, cung vi tri/do dai/diem vao, am luong giu nguyen', aNew && `${aNew.track} ${aNew.start}+${aNew.duration}`);
ok(vAfter.volume === 0, 'Tach: clip video bi tat tieng (volume 0) de khong phat doi tieng');
// khong chong tren track audio
const byTrack = {};
for (const c of p.clips) (byTrack[c.track] ??= []).push(c);
let overlap = false;
for (const cs of Object.values(byTrack)) { cs.sort((x, y) => x.start - y.start); for (let i = 1; i < cs.length; i++) if (cs[i].start < cs[i - 1].start + cs[i - 1].duration - 1e-6) overlap = true; }
ok(!overlap, 'Tach: khong chong clip tren track nao (tu tao track audio moi neu track audio dang ban)');

// ---- 3. quet chon bang chuot ----
await page.keyboard.press('Escape');
const sc = await page.locator('.tl-scroll').boundingBox();
const boxes = {};
for (const c of p.clips) boxes[c.id] = await page.locator(`.clip[data-clip="${c.id}"]`).boundingBox();
const maxRight = Math.max(...Object.values(boxes).map((b) => b.x + b.width));
const minLeft = Math.min(...Object.values(boxes).map((b) => b.x));
const minTop = Math.min(...Object.values(boxes).map((b) => b.y));
const maxBottom = Math.max(...Object.values(boxes).map((b) => b.y + b.height));
const sx = Math.min(sc.x + sc.width - 30, maxRight + 40);
await page.mouse.move(sx, maxBottom + 4 > sc.y + sc.height - 14 ? sc.y + sc.height - 14 : maxBottom + 4);
await page.mouse.down();
await page.mouse.move(minLeft + 5, minTop + 3, { steps: 8 });
const marqVisible = await page.locator('.marquee').count();
await page.mouse.up();
await sleep(200);
const sel1 = await page.evaluate(() => window.__te.store.get().selection.length);
ok(marqVisible === 1 && sel1 === p.clips.length, 'Keo chuot tren vung trong: hien khung quet va chon ' + p.clips.length + ' clip', `khung ${marqVisible}, chon ${sel1}`);
await page.screenshot({ path: `${OUT}/tl-marquee.png` });
// bam vung trong (khong keo) = bo chon
await page.mouse.click(sx, sc.y + sc.height - 12);
await sleep(150);
ok((await page.evaluate(() => window.__te.store.get().selection.length)) === 0, 'Bam vung trong khong keo: bo chon');
// quet mot phan: chi quet vung cua clip audio dau (hang audio)
const aBox = boxes[aNew.id];
await page.mouse.move(aBox.x + aBox.width + 12, aBox.y + aBox.height - 2);
await page.mouse.down();
await page.mouse.move(aBox.x + aBox.width - 12, aBox.y + 4, { steps: 4 });
await page.mouse.up();
await sleep(150);
const selPart = await page.evaluate(() => window.__te.store.get().selection);
ok(selPart.includes(aNew.id) && selPart.length < p.clips.length, 'Quet mot phan: chi chon clip bi khung cham toi', selPart.join(','));

// ---- 4. ghep / huy ghep bang phim tat ----
const ids2 = [v0.id, aNew.id];
await page.locator(`.clip[data-clip="${v0.id}"]`).click({ position: { x: 30, y: 20 } });
await page.locator(`.clip[data-clip="${aNew.id}"]`).click({ position: { x: 30, y: 12 }, modifiers: ['Shift'] });
await page.keyboard.press('Control+G');
await waitFor(async () => (await project()).clips.filter((c) => c.group).length === 2, 3000, 'ghep');
p = await project();
ok(new Set(p.clips.filter((c) => c.group).map((c) => c.group)).size === 1 && p.clips.filter((c) => c.group).every((c) => ids2.includes(c.id)), 'Ctrl+G: ghep 2 clip da chon thanh mot nhom');
await page.keyboard.press('Escape');
await page.locator(`.clip[data-clip="${aNew.id}"]`).click({ position: { x: 30, y: 12 } });
ok(JSON.stringify((await page.evaluate(() => window.__te.store.get().selection)).sort()) === JSON.stringify([...ids2].sort()), 'Bam 1 clip trong nhom: chon ca nhom');
await page.screenshot({ path: `${OUT}/tl-group.png` });
// keo ca nhom
const before = Object.fromEntries(p.clips.filter((c) => c.group).map((c) => [c.id, c.start]));
const vb = await page.locator(`.clip[data-clip="${v0.id}"]`).boundingBox();
await page.mouse.move(vb.x + vb.width / 2, vb.y + vb.height / 2);
await page.mouse.down();
await page.mouse.move(vb.x + vb.width / 2 + 120, vb.y + vb.height / 2, { steps: 6 });
await page.mouse.up();
await sleep(300);
p = await project();
const d1 = p.clips.find((c) => c.id === v0.id).start - before[v0.id];
const d2 = p.clips.find((c) => c.id === aNew.id).start - before[aNew.id];
ok(d1 > 0.3 && Math.abs(d1 - d2) < 1e-6, 'Keo 1 clip trong nhom: ca nhom dich dung bang nhau', `${d1.toFixed(3)} / ${d2.toFixed(3)}`);
// sao chep nhom -> nhom moi khong chung id
await page.keyboard.press('Control+C');
await page.keyboard.press('Control+V');
await waitFor(async () => (await project()).clips.length === 6, 3000, 'dan');
p = await project();
const gs = p.clips.filter((c) => c.group).map((c) => c.group);
ok(gs.length === 4 && new Set(gs).size === 2, 'Dan nhom: ban sao la nhom MOI (2 nhom, moi nhom 2 clip)', gs.join(','));
// huy ghep
await page.locator(`.clip[data-clip="${v0.id}"]`).click({ position: { x: 30, y: 20 } });
await page.keyboard.press('Control+Shift+G');
await waitFor(async () => (await project()).clips.filter((c) => c.group).length === 2, 3000, 'huy ghep');
ok(true, 'Ctrl+Shift+G: huy ghep dung nhom dang chon (nhom con lai van giu)');
// menu chuot phai: ghep / huy ghep bat dung luc
p = await project();
const grouped = p.clips.find((c) => c.group);
await page.locator(`.clip[data-clip="${grouped.id}"]`).click({ button: 'right', position: { x: 20, y: 12 } });
await T('clip-menu').waitFor();
ok((await T('ctx-ungroup').isEnabled()) && (await T('ctx-group').isEnabled()), 'Menu chuot phai clip thuoc nhom: "Huy ghep" va "Ghep" deu bat');
await T('ctx-ungroup').click();
await waitFor(async () => (await project()).clips.filter((c) => c.group).length === 0, 3000, 'huy ghep qua menu');
ok(true, 'Huy ghep qua menu chuot phai');
// hoan tac duoc
await page.keyboard.press('Control+Z');
await waitFor(async () => (await project()).clips.filter((c) => c.group).length === 2, 3000, 'undo');
ok(true, 'Hoan tac (Ctrl+Z) khoi phuc nhom');

// ---- 5. vo hieu hoa clip (V) ----
await page.keyboard.press('Escape');
p = await project();
const vclip = p.clips.find((c) => c.src.mediaId === mV && p.tracks.find((t) => t.id === c.track).kind === 'video' && !c.group);
await page.locator(`.clip[data-clip="${vclip.id}"]`).click({ position: { x: 30, y: 20 } });
await page.evaluate((t) => window.__te.player.seek(t), vclip.start + 0.5);
await sleep(600);
const lumaAt = async (t) => (await (await fetch(`${BASE}/analyze_frame?t=${t}&scale=0.2`)).json()).channels.luma.mean;
const lumaOn = await lumaAt(vclip.start + 0.5);
await page.keyboard.press('v');
await waitFor(async () => (await project()).clips.find((c) => c.id === vclip.id).disabled === true, 3000, 'tat clip');
ok(await page.locator(`.clip.off[data-clip="${vclip.id}"]`).count() === 1, 'Phim V: clip bi vo hieu hoa (hien mo, gach ngang ten)');
const lumaOff = await lumaAt(vclip.start + 0.5);
ok(lumaOn > 0.05 && lumaOff < lumaOn * 0.2, 'Clip video vo hieu hoa khong con hien hinh (khung xem/xuat)', `${lumaOn} -> ${lumaOff}`);
await page.keyboard.press('v');
await waitFor(async () => (await project()).clips.find((c) => c.id === vclip.id).disabled === undefined, 3000, 'bat lai');
ok(Math.abs((await lumaAt(vclip.start + 0.5)) - lumaOn) < 0.02, 'Bam V lan nua: bat lai, hinh tro lai nhu cu (truong disabled bi go)');
await T('toggle-clip').click();
await waitFor(async () => (await project()).clips.find((c) => c.id === vclip.id).disabled === true, 3000, 'tat bang nut');
await page.locator(`.clip[data-clip="${vclip.id}"]`).click({ button: 'right', position: { x: 30, y: 20 } });
ok((await T('ctx-toggle').innerText()).includes('Bật lại'), 'Menu chuot phai cua clip dang tat hien "Bat lai clip"');
await T('ctx-toggle').click();
await waitFor(async () => (await project()).clips.find((c) => c.id === vclip.id).disabled === undefined, 3000, 'bat lai qua menu');
ok(true, 'Nut "Tat clip"/menu chuot phai tat va bat lai duoc');

// ---- 6. keo len/xuong tu do trong cung loai; keo ra mep tao track Video/Audio moi ----
p = await project();
const aClip = p.clips.find((c) => c.src.mediaId === 'beep-none' || (p.tracks.find((t) => t.id === c.track).kind === 'audio' && !c.group));
const nAud0 = p.tracks.filter((t) => t.kind === 'audio').length;
const aOthers = p.clips.some((c) => c.track === aClip.track && c.id !== aClip.id);
await page.locator(`.clip[data-clip="${aClip.id}"]`).click({ position: { x: 20, y: 12 } });
let ab = await page.locator(`.clip[data-clip="${aClip.id}"]`).boundingBox();
await page.mouse.move(ab.x + 20, ab.y + ab.height / 2);
await page.mouse.down();
await page.mouse.move(ab.x + 22, ab.y + ab.height / 2 + 10, { steps: 3 });
await T('timeline').locator('.row.newzone').waitFor({ timeout: 3000 });
const zb = await T('timeline').locator('.row.newzone').boundingBox();
await page.mouse.move(ab.x + 22, zb.y + zb.height / 2, { steps: 6 });
await page.screenshot({ path: `${OUT}/tl-newtrack.png` });
await page.mouse.up();
await waitFor(async () => (await project()).clips.find((c) => c.id === aClip.id).track !== aClip.track, 3000, 'track audio moi');
p = await project();
const aMoved = p.clips.find((c) => c.id === aClip.id);
const audNow = p.tracks.filter((t) => t.kind === 'audio');
ok(aMoved.track !== aClip.track && p.tracks.find((t) => t.id === aMoved.track).kind === 'audio' && new Set(audNow.map((t) => t.name)).size === audNow.length, 'Keo clip audio xuong ra ngoai mep: tao track audio moi (ten khong trung) va chuyen clip vao', p.tracks.find((t) => t.id === aMoved.track).name);
ok(aOthers ? p.tracks.some((t) => t.id === aClip.track) : !p.tracks.some((t) => t.id === aClip.track), aOthers ? 'Track cu con clip khac: giu lai' : 'Track cu bi bo trong: hang do tu mat', aClip.track);
// khong qua duoc sang track video
ab = await page.locator(`.clip[data-clip="${aClip.id}"]`).boundingBox();
const vrow = await rowBox('v1');
await page.mouse.move(ab.x + 20, ab.y + ab.height / 2);
await page.mouse.down();
await page.mouse.move(ab.x + 22, vrow.y + vrow.height / 2, { steps: 10 });
await page.mouse.up();
await sleep(400);
const aStill = (await project()).clips.find((c) => c.id === aClip.id);
ok(p.tracks.find((t) => t.id === aStill.track).kind === 'audio', 'Keo clip audio len tren track video: khong chuyen (audio chi o audio)', aStill.track);
// keo video len mep tren: tao Video moi
const vOne = p.clips.find((c) => p.tracks.find((t) => t.id === c.track).kind === 'video' && !c.group);
const vTrackOld = vOne.track;
const vOthers = p.clips.some((c) => c.track === vTrackOld && c.id !== vOne.id);
let vbx = await page.locator(`.clip[data-clip="${vOne.id}"]`).boundingBox();
await page.mouse.move(vbx.x + 20, vbx.y + vbx.height / 2);
await page.mouse.down();
await page.mouse.move(vbx.x + 22, vbx.y + vbx.height / 2 - 8, { steps: 3 });
await T('timeline').locator('.row.newzone').waitFor({ timeout: 3000 });
const zt = await T('timeline').locator('.row.newzone').boundingBox();
await page.mouse.move(vbx.x + 22, zt.y + zt.height / 2, { steps: 6 });
await page.mouse.up();
await waitFor(async () => (await project()).clips.find((c) => c.id === vOne.id).track !== vTrackOld, 3000, 'track video moi');
p = await project();
const vNew = p.tracks.find((t) => t.id === p.clips.find((c) => c.id === vOne.id).track);
ok(vNew.kind === 'video' && p.tracks.indexOf(vNew) === p.tracks.length - 1 || p.tracks.filter((t) => t.kind === 'video').pop() === vNew, 'Keo clip video len mep tren: tao track video moi o lop tren cung', vNew.name);
ok(vOthers ? p.tracks.some((t) => t.id === vTrackOld) : !p.tracks.some((t) => t.id === vTrackOld), vOthers ? 'Track video cu con clip khac: giu lai' : 'Track video cu bi bo trong: hang do tu mat', vTrackOld);
ok(p.tracks.filter((t) => t.kind === 'video').length >= 1 && p.tracks.filter((t) => t.kind === 'audio').length >= 1, 'Luon con it nhat 1 track moi loai');
// don dep thu cong: keo het clip khoi 1 track phu -> track mat; hoan tac -> track tro lai cung mot buoc
const multi = p.tracks.filter((t) => t.kind === 'audio').find((t) => p.clips.filter((c) => c.track === t.id).length >= 1 && p.tracks.filter((q) => q.kind === 'audio').length >= 2);
if (multi) {
  const victim = p.clips.filter((c) => c.track === multi.id);
  const other = p.tracks.find((t) => t.kind === 'audio' && t.id !== multi.id).id;
  const mv = victim.map((c, i) => ({ op: 'set_clip', id: c.id, patch: { track: other, start: 100 + i * 20 } }));
  await page.evaluate(() => window.__te.store.set({ selection: [] }));
  const nTr = (await project()).tracks.length;
  const rr = await fetch(`${BASE}/ops`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ source: 'human', ops: mv }) });
  ok(rr.status === 200 && (await project()).tracks.length === nTr, 'Qua HTTP (khong qua giao dien) track trong KHONG tu mat: chi thao tac tren giao dien moi tu don', `${(await project()).tracks.length}/${nTr}`);
}
ok(errs.length === 0, 'Khong co loi JS trong giao dien', errs.join(' | ').slice(0, 200));
console.log(`\n${pass} dat, ${fail} loi`);
await browser.close();
process.exit(fail ? 1 : 0);
