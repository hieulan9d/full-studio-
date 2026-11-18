// Kiem GIAO DIEN giai doan 3 bang Playwright qua CDP: nhan dang whisper that, chon/cat/sua tu, phu de, khoang lang,
// thu vien SFX, goi y SFX + duyet TUNG MUC, QC, xuat chuan hoa -14 LUFS.
// Chay app: TOOL_EDIT_CDP_PORT=9333 TOOL_EDIT_DEV_API=1 npx electron .   roi: node scripts/ui-test-audio.mjs   (can e2e-audio.mjs da tao out/media/speech-en.mp4)
import { chromium } from 'playwright-core';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
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
    await sleep(120);
  }
};
const near = (a, b, tol) => Math.abs(a - b) <= tol;
const speech = resolve('out/media/speech-en.mp4');
if (!existsSync(speech)) throw new Error('thieu out/media/speech-en.mp4: chay scripts/e2e-audio.mjs truoc');

const browser = await chromium.connectOverCDP(`http://127.0.0.1:${process.env.TOOL_EDIT_CDP_PORT ?? 9333}`);
const page = browser.contexts()[0].pages()[0];
await page.setViewportSize({ width: 1500, height: 900 }).catch(() => {});
await waitFor(() => page.evaluate(() => !!window.__te), 15000, 'giao dien san sang');
const T = (id) => page.locator(`[data-testid="${id}"]`);
const st = (fn, ...a) => page.evaluate(fn, ...a);

// ---- 0. chuan bi: du an moi + clip noi
await call('POST', '/project/new', {});
await page.reload();
await waitFor(() => page.evaluate(() => !!window.__te), 15000, 'reload');
const imp = (await call('POST', '/media_import', { path: speech })).data;
for (const id of [imp.job_id, imp.audio_job_id]) if (id) await waitFor(async () => (await call('GET', `/jobs/${id}`)).data.state === 'done', 60000, 'cache');
const dur = (await project()).media[0].duration;
await call('POST', '/ops', { source: 'human', ops: [{ op: 'add_clip', clip: { id: 'v', track: 'v1', src: { type: 'media', mediaId: imp.mediaId }, start: 0, duration: dur, in: 0, volume: 1, transform: {}, keyframes: {} } }] });
await page.locator('.clip[data-clip="v"]').click({ position: { x: 60, y: 20 } });
await T('tab-transcript').click();

// ---- 1. nhan dang whisper that tu giao dien
ok((await T('tr-run').count()) === 1, 'Tab Loi thoai: clip chua co loi thoai -> hien nut "Nhan dang loi thoai"');
await T('tr-lang').selectOption('en');
await T('tr-run').click();
await waitFor(async () => (await page.locator('.words .w').count()) >= 20, 120000, 'tu xuat hien');
const nw = await page.locator('.words .w').count();
ok(nw >= 20, 'Whisper (GPU) chay tu giao dien: danh sach tung tu hien ra', `${nw} tu`);
await page.screenshot({ path: `${OUT}/a1-transcript.png` });

// ---- 2. click tu -> nhay toi moc; chon doan; cat; hoan tac
const tr = (await project()).media[0].transcript;
const iFox = tr.words.findIndex((w) => /fox/i.test(w.w));
await page.locator(`.words .w[data-w="${iFox}"]`).click();
await waitFor(async () => near(await st(() => window.__te.store.get().playhead), tr.words[iFox].s, 0.05), 3000, 'seek tu');
ok(true, 'Click tu "fox": con tro nhay toi moc bat dau cua tu', `${tr.words[iFox].s}s`);
await page.locator(`.words .w[data-w="${iFox}"]`).click();
await page.locator(`.words .w[data-w="${iFox + 2}"]`).click({ modifiers: ['Shift'] });
const nsel = await page.locator('.words .w.sel').count();
ok(nsel === 3, 'Shift+click chon doan 3 tu', `${nsel} tu`);
const cutDur = tr.words[iFox + 2].e - tr.words[iFox].s;
await T('tr-cut').click();
await waitFor(async () => (await project()).clips.filter((c) => c.src.type === 'media').length === 2, 4000, 'cat');
let pj = await project();
const total = pj.clips.filter((c) => c.src.type === 'media').reduce((a, c) => a + c.duration, 0);
ok(near(total, dur - cutDur, 0.01), 'Cat doan da chon: clip ngan di dung do dai doan (xoa chu = xoa doan)', `${dur.toFixed(2)} -> ${total.toFixed(2)}s (cat ${cutDur.toFixed(2)}s)`);
await page.keyboard.press('Control+z');
await waitFor(async () => (await project()).clips.filter((c) => c.src.type === 'media').length === 1, 3000, 'undo');
ok(true, 'Ctrl+Z hoan tac viec cat');

// ---- 3. sua tu bang nhap doi
await page.locator(`.words .w[data-w="${iFox}"]`).dblclick();
await T('modal-input').waitFor({ timeout: 3000 });
await T('modal-input').fill('cáo');
await T('modal-input').press('Enter');
await waitFor(async () => (await project()).media[0].transcript.words[iFox].w === 'cáo', 3000, 'sua tu');
ok(true, 'Nhap doi tu "fox" -> sua thanh "cáo" (hop thoai ten, luu vao loi thoai)');

// ---- 4. phu de tu giao dien
await T('cap-style').selectOption('karaoke');
await T('cap-gen').click();
await waitFor(async () => (await project()).clips.filter((c) => c.tag === 'captions:v').length >= 5, 4000, 'phu de');
pj = await project();
const capN = pj.clips.filter((c) => c.tag === 'captions:v').length;
ok(capN >= 5 && pj.tracks.some((t) => t.name === 'Phụ đề'), 'Tao phu de karaoke: nhieu nhom tren track "Phu de"', `${capN} nhom`);
ok(pj.clips.some((c) => c.tag === 'captions:v' && /cáo/.test(c.src.text.content)), 'Phu de dung tu da sua ("cáo")');
await page.screenshot({ path: `${OUT}/a2-captions.png` });

// ---- 5. khoang lang -> cat, phu de tu cap nhat
await T('sil-min').fill('1');
await T('sil-min').press('Enter');
await T('sil-find').click();
await T('sil-result').waitFor({ timeout: 5000 });
const silTxt = await T('sil-result').innerText();
ok(/1 khoảng/.test(silTxt), 'Tim khoang lang (>1s): thay 1 khoang giua hai cau', silTxt.slice(0, 80));
await T('sil-cut').click();
await waitFor(async () => (await project()).clips.filter((c) => c.src.type === 'media').length === 2, 4000, 'cat lang');
pj = await project();
const cuts = pj.clips.filter((c) => c.src.type === 'media').sort((a, b) => a.start - b.start);
ok(near(cuts[1].start, cuts[0].start + cuts[0].duration, 1e-6) && pj.clips.filter((c) => c.tag?.startsWith('captions:')).length >= 5, 'Cat khoang lang: hai manh noi lien va phu de duoc tao lai theo moc moi');
const qcPre = (await call('GET', '/qc')).data;
ok(qcPre.speech.coverage > 0.85, 'Sau khi cat, phu de van phu >= 85% loi thoai (da tu cap nhat)', `${Math.round(qcPre.speech.coverage * 100)}%`);

// ---- 6. thu vien SFX
await T('tab-library').click();
await waitFor(async () => (await page.locator('[data-lib]').count()) >= 20, 20000, 'kho');
const nl = await page.locator('[data-lib]').count();
ok(nl >= 20 && nl <= 40, 'Tab Thu vien: liet ke SFX da duyet (khong trung lap)', `${nl} muc`);
await T('lib-q').fill('whoosh');
await sleep(800);
const nwh = await page.locator('[data-lib]').count();
ok(nwh >= 3 && nwh < nl, 'Tim "whoosh": loc theo ten/tag', `${nwh} muc`);
await T('lib-q').fill('');
await page.locator('[data-lib] button[title^="Thêm vào timeline"]').first().click();
await waitFor(async () => (await project()).clips.some((c) => c.tag === 'sfx:manual'), 4000, 'them sfx');
ok(true, 'Nut "+" them SFX vao timeline tai con tro (tao track SFX)');
await T('lib-kind-music').click();
await waitFor(async () => (await page.locator('[data-lib]').count()) === 8, 5000, 'nhac');
ok(true, 'Loc "Nhac": 8 bai Mixkit kem BPM');

// ---- 7. goi y SFX + duyet tung muc: them chu + them mot cat nua
await page.evaluate(() => window.__te.player.seek(0));
await T('tab-props').click();
await T('add-text').click();
await waitFor(async () => (await project()).clips.some((c) => c.src.type === 'text' && !c.tag), 4000, 'chu');
await call('POST', '/ops', { source: 'human', ops: [{ op: 'remove_clip', id: (await project()).clips.find((c) => c.tag === 'sfx:manual').id }, { op: 'remove_ranges', id: cuts[1].id, ranges: [{ s: cuts[1].in + 0.3, e: cuts[1].in + 0.6 }] }] });
await T('tab-library').click();
await T('lib-kind-sfx').click();
await T('sfx-suggest').click();
await waitFor(() => T('tab-proposals').getAttribute('class').then((c) => c.includes('on')), 5000, 'chuyen tab de xuat');
await waitFor(async () => (await page.locator('[data-proposal]').count()) >= 1, 4000, 'the de xuat');
const picks = await page.locator('[data-testid^="pick-"]').count();
ok(picks >= 2,'De xuat SFX: moi SFX co o tick rieng de duyet TUNG MUC', `${picks} muc`);
const before = (await project()).clips.filter((c) => c.tag?.startsWith('sfx:')).length;
ok(before === 0, 'De xuat chua ap dung gi (cho duyet)');
await page.locator('[data-testid^="pick-"]').first().uncheck();
await page.screenshot({ path: `${OUT}/a3-sfx-proposal.png` });
const accBtn = page.locator('[data-testid^="accept-"]').first();
ok((await accBtn.innerText()).includes(`${picks - 1} mục`), 'Nut Chap nhan hien dung so muc da chon', await accBtn.innerText());
await accBtn.click();
await waitFor(async () => (await project()).clips.filter((c) => c.tag?.startsWith('sfx:')).length === picks - 1, 4000, 'chap nhan tung muc');
ok(true, 'Chap nhan: chi cac muc con tick duoc them (bo 1 SFX khong thich)', `${picks - 1}/${picks}`);

// ---- 8. marker tren thuoc + QC + xuat chuan hoa
await call('POST', '/ops', { source: 'human', ops: [{ op: 'add_markers', markers: [{ t: 1, kind: 'beat' }, { t: 2, kind: 'user' }, { t: 3, kind: 'beat' }] }] });
await waitFor(async () => (await page.locator('.ruler .mk').count()) === 3, 3000, 'marker');
ok(true, 'Marker nhip/nguoi dung hien tren thuoc thoi gian (3 marker)');
await T('tab-qc').click();
await T('qc-run').click();
await T('qc-result').waitFor({ timeout: 30000 });
const lufs = await T('qc-lufs').innerText();
ok(/LUFS/.test(lufs), 'Tab Kiem tra: hien loudness cua ban tron', lufs);
ok(await T('norm-lufs').isChecked(), 'Xuat: o "-14 LUFS" mac dinh BAT');
const exp = resolve('out/ui/ui-audio-export.mp4');
rmSync(exp, { force: true });
const oldRender = new Set((await call('GET', '/jobs')).data.filter((j) => j.type === 'render').map((j) => j.id));
await T('export916').click();
const findNew = async () => (await call('GET', '/jobs')).data.find((j) => j.type === 'render' && !oldRender.has(j.id) && j.state === 'done');
await waitFor(findNew, 120000, 'xuat');
const job = await findNew();
const r = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', job.result.path, '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-'], { maxBuffer: 1 << 26 });
const s = r.stderr.toString();
const m = JSON.parse(s.slice(s.lastIndexOf('{'), s.lastIndexOf('}') + 1));
ok(near(Number(m.input_i), -14, 1.2), 'Nut Xuat 9:16 voi -14 LUFS: file ra chuan hoa dung muc', `${m.input_i} LUFS`);

console.log(`\n${pass} dat, ${fail} that bai`);
await browser.close();
process.exitCode = fail ? 1 : 0;
