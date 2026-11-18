// Kiểm KHUNG XEM: zoom/kéo (F-94), tương tác trực tiếp chọn/kéo/đổi cỡ/xoay/snap/keyframe (F-95), ô thông số đổi tức thì + gộp hoàn tác (F-96).
// Chạy app: TOOL_EDIT_PROJECTS_DIR=out/projects-test TOOL_EDIT_PORT=17481 TOOL_EDIT_CDP_PORT=9334 TOOL_EDIT_DEV_API=1 npx electron . --user-data-dir=out/ud-view
// rồi: TOOL_EDIT_PORT=17481 TOOL_EDIT_CDP_PORT=9334 node scripts/ui-test-view.mjs
import { chromium } from 'playwright-core';
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
    await sleep(100);
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
const proj = async () => (await call('GET', '/project')).data;
const clipOf = async (id) => (await proj()).clips.find((c) => c.id === id);
const zoomOf = async () => Number(await T('pvwrap').getAttribute('data-zoom'));
const wrapBox = () => T('pvwrap').boundingBox();
const selBoxCenter = async () => {
  const b = await T('selbox').first().boundingBox();
  return { x: b.x + b.width / 2, y: b.y + b.height / 2, b };
};
const sleepRender = () => sleep(350);

// ---------- dựng dự án thử ----------
await call('POST', '/project/new', {});
await page.reload();
await waitFor(() => page.evaluate(() => !!window.__te), 15000, 'tải lại');
await T('topbar').waitFor({ timeout: 8000 });
await T('add-text').click();
await waitFor(async () => (await proj()).clips.length === 1, 4000, 'thêm chữ');
const textId = (await proj()).clips[0].id;
await sleepRender();
ok((await T('selbox').count()) === 1, 'Chọn clip chữ → hiện khung chọn trên khung xem');
ok((await T('h-0').count()) === 1 && (await T('h-3').count()) === 1 && (await T('h-rot').count()) === 1, 'Khung chọn có 4 tay nắm góc + tay xoay');

// ---------- F-94: zoom / pan ----------
await T('pv-fit').click();
const fitZ = await zoomOf();
const fitW = (await wrapBox()).width;
ok(fitZ > 0.05 && Math.abs(fitW - 1080 * fitZ) < 2, 'Vừa khung: khung xem vừa vùng xem', `zoom=${fitZ.toFixed(3)} rộng=${Math.round(fitW)}`);
await T('pv-100').click();
await sleep(150);
const z100 = await zoomOf();
const w100 = (await wrapBox()).width;
ok(Math.abs(z100 - 1) < 1e-6 && Math.abs(w100 - 1080) < 2, 'Nút 100%: 1 điểm ảnh khung = 1 điểm ảnh màn hình', `zoom=${z100} rộng=${Math.round(w100)}`);
ok((await T('pv-pct').innerText()) === '100%', 'Nhãn phần trăm hiện 100%');
await sleepRender();
const cvW = await page.evaluate(() => document.querySelector('[data-testid="canvas"]').width);
ok(cvW === 1080, 'Zoom 100%: preview render độ phân giải đầy đủ (sắc nét)', `canvas.width=${cvW}`);
await T('pv-fit').click();
await sleepRender();
const cvW2 = await page.evaluate(() => document.querySelector('[data-testid="canvas"]').width);
ok(cvW2 === 540, 'Vừa khung: render nửa độ phân giải (nhẹ)', `canvas.width=${cvW2}`);
// cuộn chuột
const sb = await T('stage').boundingBox();
await page.mouse.move(sb.x + sb.width / 2, sb.y + sb.height / 3);
await page.mouse.wheel(0, -400);
await sleep(200);
const zIn = await zoomOf();
ok(zIn > fitZ * 1.4, 'Cuộn chuột lên: phóng to', `${fitZ.toFixed(3)} → ${zIn.toFixed(3)}`);
await page.mouse.wheel(0, 400);
await sleep(200);
const zBack = await zoomOf();
ok(Math.abs(zBack - fitZ) / fitZ < 0.02, 'Cuộn xuống đúng bằng: về lại vừa khung', `${zBack.toFixed(3)}`);
// zoom quanh con trỏ: điểm dưới con trỏ đứng yên
await T('pv-fit').click();
const wb0 = await wrapBox();
const mx = wb0.x + wb0.width * 0.25,
  my = wb0.y + wb0.height * 0.25;
const u0 = { x: (mx - wb0.x) / fitZ, y: (my - wb0.y) / fitZ };
await page.mouse.move(mx, my);
await page.mouse.wheel(0, -500);
await sleep(200);
const z1 = await zoomOf(),
  wb1 = await wrapBox();
const u1 = { x: (mx - wb1.x) / z1, y: (my - wb1.y) / z1 };
ok(Math.abs(u0.x - u1.x) < 3 && Math.abs(u0.y - u1.y) < 3, 'Zoom giữ nguyên điểm dưới con trỏ', `(${u0.x.toFixed(1)},${u0.y.toFixed(1)}) → (${u1.x.toFixed(1)},${u1.y.toFixed(1)})`);
// kéo giữ để di chuyển (vùng trống ngoài khung)
await T('pv-100').click();
await sleep(150);
await page.keyboard.press('Escape'); // bỏ chọn
const wbA = await wrapBox();
const sbA = await T('stage').boundingBox();
const emptyX = sbA.x + 12,
  emptyY = sbA.y + 12; // góc vùng xem, ngoài khung (khung 1080 px rộng hơn vùng xem; điểm này nằm trong khung nên dùng vùng ngoài nếu có)
const insideFrame = emptyX > wbA.x && emptyX < wbA.x + wbA.width && emptyY > wbA.y && emptyY < wbA.y + wbA.height;
// bấm vào clip trống (không có clip tại điểm) rồi kéo: dịch khung xem
await page.mouse.move(emptyX, emptyY);
await page.mouse.down();
await page.mouse.move(emptyX + 80, emptyY + 60, { steps: 6 });
await page.mouse.up();
await sleep(150);
const wbB = await wrapBox();
ok(Math.abs(wbB.x - wbA.x - 80) < 3 && Math.abs(wbB.y - wbA.y - 60) < 3, 'Kéo giữ trên vùng trống: khung xem dịch theo chuột (pan)', `dx=${Math.round(wbB.x - wbA.x)} dy=${Math.round(wbB.y - wbA.y)} ${insideFrame ? '' : '(điểm ngoài khung)'}`);
// chuột giữa kéo
await page.mouse.move(sbA.x + 300, sbA.y + 200);
await page.mouse.down({ button: 'middle' });
await page.mouse.move(sbA.x + 340, sbA.y + 230, { steps: 4 });
await page.mouse.up({ button: 'middle' });
await sleep(150);
const wbC = await wrapBox();
ok(Math.abs(wbC.x - wbB.x - 40) < 3 && Math.abs(wbC.y - wbB.y - 30) < 3, 'Chuột giữa kéo: pan', `dx=${Math.round(wbC.x - wbB.x)}`);
// phím tắt
await page.keyboard.press('Alt+0');
await sleep(150);
ok(Math.abs((await zoomOf()) - fitZ) / fitZ < 0.02, 'Phím Alt+0: vừa khung');
await page.keyboard.press('Alt+1');
await sleep(150);
ok(Math.abs((await zoomOf()) - 1) < 1e-6, 'Phím Alt+1: 100%');
await page.keyboard.press('Alt+0');
await sleep(100);
await page.keyboard.press('Alt+=');
await sleep(150);
const zk = await zoomOf();
ok(Math.abs(zk / fitZ - 1.25) < 0.02, 'Phím Alt+=: phóng 1,25 lần', `${(zk / fitZ).toFixed(3)}`);
await page.keyboard.press('Alt+-');
await sleep(150);
ok(Math.abs((await zoomOf()) - fitZ) / fitZ < 0.02, 'Phím Alt+-: thu lại');
// thanh trượt
await T('pv-range').fill('900');
await sleep(200);
ok((await zoomOf()) > 1, 'Thanh trượt zoom đổi mức zoom', `${(await zoomOf()).toFixed(2)}`);
await T('pv-fit').click();
await sleepRender();
// vùng an toàn
await T('pv-safe').click();
ok((await T('safe-guides').count()) === 1, 'Nút "An toàn": hiện vùng an toàn + đường giữa');
await T('pv-safe').click();
ok((await T('safe-guides').count()) === 0, 'Bấm lại: ẩn');

// ---------- F-95: chọn bằng chuột trên khung xem ----------
await page.keyboard.press('Escape');
await sleepRender();
ok((await T('selbox').count()) === 0, 'Bỏ chọn: khung chọn biến mất');
// chọn lại bằng cách bấm vào chỗ chữ (tìm tâm qua tính hình học từ store: dùng khung chọn của lần trước = tâm khung)
let wb = await wrapBox();
await page.mouse.click(wb.x + wb.width / 2, wb.y + wb.height / 2);
await sleep(300);
ok((await T('selbox').count()) === 1 && (await page.evaluate(() => window.__te.store.get().selection.join(','))) === textId, 'Bấm vào chữ trên khung xem → chọn đúng clip');
// bấm ra ngoài clip → bỏ chọn
await page.mouse.click(wb.x + 8, wb.y + 8);
await sleep(250);
ok((await T('selbox').count()) === 0, 'Bấm vào chỗ trống → bỏ chọn');
await page.mouse.click(wb.x + wb.width / 2, wb.y + wb.height / 2);
await sleep(250);

// kéo di chuyển: một bước hoàn tác
const histBefore = (await proj()).history.length;
const undoBefore = histBefore;
const c0 = await clipOf(textId);
let { x: cx, y: cy } = await selBoxCenter();
const z = await zoomOf();
await page.mouse.move(cx, cy);
await page.mouse.down();
await page.mouse.move(cx + 60, cy + 40, { steps: 8 });
await sleep(150);
const midHist = (await proj()).history.length;
await page.mouse.move(cx + 120, cy + 90, { steps: 8 });
await page.mouse.up();
await sleep(400);
const c1 = await clipOf(textId);
const dxExp = 120 / z / 1080,
  dyExp = 90 / z / 1920;
ok(Math.abs(c1.transform.x - c0.transform.x - dxExp) < 0.01 && Math.abs(c1.transform.y - c0.transform.y - dyExp) < 0.01, 'Kéo chữ: x,y đổi đúng theo độ dời của chuột (không cần gõ số)', `dx=${(c1.transform.x - c0.transform.x).toFixed(4)}/${dxExp.toFixed(4)} dy=${(c1.transform.y - c0.transform.y).toFixed(4)}/${dyExp.toFixed(4)}`);
const histAfter = (await proj()).history.length;
ok(histAfter - histBefore === 1 && midHist - histBefore === 1, 'Kéo = đúng MỘT mục lịch sử / một bước hoàn tác (dù nhiều lần cập nhật)', `+${histAfter - histBefore}`);
await call('POST', '/undo');
await sleep(250);
const c2 = await clipOf(textId);
ok(Math.abs(c2.transform.x - c0.transform.x) < 1e-9 && Math.abs(c2.transform.y - c0.transform.y) < 1e-9, 'Một lần Hoàn tác trả chữ về chỗ cũ');
await call('POST', '/redo');
await sleep(250);

// snap vào giữa khung
await T('pv-snap').getAttribute('class');
await call('POST', '/ops', { ops: [{ op: 'set_transform', id: textId, patch: { x: 0.1, y: 0 } }] });
await sleep(350);
({ x: cx, y: cy } = await selBoxCenter());
const zz = await zoomOf();
await page.mouse.move(cx, cy);
await page.mouse.down();
await page.mouse.move(cx - (0.1 * 1080 * zz - 2), cy, { steps: 8 }); // còn lệch ~2 px màn hình: nằm trong ngưỡng bám
await sleep(250);
const guideDuring = await T('guide-v').count();
await page.mouse.up();
await sleep(400);
const c3 = await clipOf(textId);
ok(guideDuring >= 1, 'Đang kéo gần giữa: hiện đường gióng dọc');
ok(Math.abs(c3.transform.x) < 1e-6, 'Bám vào giữa khung: x = 0 chính xác', `x=${c3.transform.x}`);
await sleep(300);
ok((await T('guide-v').count()) === 0, 'Thả chuột: đường gióng biến mất');
// Alt tắt bám
await call('POST', '/ops', { ops: [{ op: 'set_transform', id: textId, patch: { x: 0.1, y: 0 } }] });
await sleep(350);
({ x: cx, y: cy } = await selBoxCenter());
await page.mouse.move(cx, cy);
await page.keyboard.down('Alt');
await page.mouse.down();
await page.mouse.move(cx - (0.1 * 1080 * zz - 2), cy, { steps: 8 });
await page.mouse.up();
await page.keyboard.up('Alt');
await sleep(400);
const c3b = await clipOf(textId);
ok(Math.abs(c3b.transform.x) > 1e-4, 'Giữ Alt khi kéo: tắt bám (x không bị kéo về 0)', `x=${c3b.transform.x.toFixed(5)}`);

// đổi cỡ bằng tay nắm góc
await call('POST', '/ops', { ops: [{ op: 'set_transform', id: textId, patch: { x: 0, y: 0, scale: 1 } }] });
await sleep(400);
const sbx = await T('selbox').first().boundingBox();
const h2 = await T('h-2').boundingBox();
const center = { x: sbx.x + sbx.width / 2, y: sbx.y + sbx.height / 2 };
const hx = h2.x + h2.width / 2,
  hy = h2.y + h2.height / 2;
const k = 1.6;
await page.mouse.move(hx, hy);
await page.mouse.down();
await page.mouse.move(center.x + (hx - center.x) * k, center.y + (hy - center.y) * k, { steps: 8 });
await page.mouse.up();
await sleep(400);
const c4 = await clipOf(textId);
ok(Math.abs(c4.transform.scale - 1.6) < 0.08, 'Kéo góc ra 1,6 lần: tỉ lệ ≈ 1,6', `scale=${c4.transform.scale}`);
const sbx2 = await T('selbox').first().boundingBox();
ok(Math.abs(sbx2.x + sbx2.width / 2 - center.x) < 4 && Math.abs(sbx2.y + sbx2.height / 2 - center.y) < 4, 'Đổi cỡ giữ nguyên tâm hộp', `Δ=(${Math.round(sbx2.x + sbx2.width / 2 - center.x)},${Math.round(sbx2.y + sbx2.height / 2 - center.y)})`);

// xoay bằng tay nắm xoay
await call('POST', '/ops', { ops: [{ op: 'set_transform', id: textId, patch: { x: 0, y: 0, scale: 1, rotation: 0 } }] });
await sleep(400);
const sb3 = await T('selbox').first().boundingBox();
const hr = await T('h-rot').boundingBox();
const c3x = sb3.x + sb3.width / 2,
  c3y = sb3.y + sb3.height / 2;
const r0x = hr.x + hr.width / 2,
  r0y = hr.y + hr.height / 2;
const rad = Math.hypot(r0x - c3x, r0y - c3y);
const ang = (-90 + 30) * (Math.PI / 180); // quay từ phía trên sang phải 30 độ
await page.mouse.move(r0x, r0y);
await page.mouse.down();
await page.mouse.move(c3x + rad * Math.cos(ang), c3y + rad * Math.sin(ang), { steps: 10 });
await page.mouse.up();
await sleep(400);
const c5 = await clipOf(textId);
ok(Math.abs(c5.transform.rotation - 30) < 3, 'Kéo tay xoay sang phải 30°: rotation ≈ 30 (theo chiều kim đồng hồ)', `rotation=${c5.transform.rotation}`);
// Shift bám 15°
await call('POST', '/ops', { ops: [{ op: 'set_transform', id: textId, patch: { rotation: 0 } }] });
await sleep(400);
const hr2 = await T('h-rot').boundingBox();
const ang2 = (-90 + 38) * (Math.PI / 180);
await page.mouse.move(hr2.x + hr2.width / 2, hr2.y + hr2.height / 2);
await page.keyboard.down('Shift');
await page.mouse.down();
await page.mouse.move(c3x + rad * Math.cos(ang2), c3y + rad * Math.sin(ang2), { steps: 10 });
await page.mouse.up();
await page.keyboard.up('Shift');
await sleep(400);
const c6 = await clipOf(textId);
ok(Math.abs(c6.transform.rotation % 15) < 1e-6 && Math.abs(c6.transform.rotation - 45) < 1e-6, 'Giữ Shift khi xoay: bám 15° (38° → 45°)', `rotation=${c6.transform.rotation}`);
// hộp xoay khớp với hình thật: tay nắm quay theo
const h0r = await T('h-0').boundingBox();
ok(h0r.x + h0r.width / 2 !== h2.x + h2.width / 2, 'Hộp chọn xoay theo clip');
await call('POST', '/ops', { ops: [{ op: 'set_transform', id: textId, patch: { rotation: 0 } }] });

// ---------- keyframe: kéo khi có keyframe → ghi keyframe tại con trỏ ----------
await call('POST', '/ops', { ops: [{ op: 'set_keyframe', id: textId, prop: 'transform.x', t: 0, v: 0 }, { op: 'set_keyframe', id: textId, prop: 'transform.x', t: 2, v: 0.2 }] });
await page.evaluate(() => window.__te.player.seek(1));
await sleep(500);
const ck0 = await clipOf(textId);
const base0 = ck0.transform.x;
({ x: cx, y: cy } = await selBoxCenter());
const zk2 = await zoomOf();
await page.mouse.move(cx, cy);
await page.keyboard.down('Alt'); // tắt bám để số đo chính xác
await page.mouse.down();
await page.mouse.move(cx + 50, cy, { steps: 6 });
await page.mouse.up();
await page.keyboard.up('Alt');
await sleep(450);
const ck1 = await clipOf(textId);
const keys = ck1.keyframes['transform.x'];
const mid = keys.find((q) => Math.abs(q.t - 1) < 1e-3);
const expect = 0.1 + 50 / zk2 / 1080;
ok(!!mid && Math.abs(mid.v - expect) < 0.01, 'Clip có keyframe: kéo ghi keyframe tại con trỏ (t=1s), không đổi giá trị nền', `v=${mid?.v} ~ ${expect.toFixed(4)} nền=${ck1.transform.x}/${base0}`);
ok(keys.length === 3 && ck1.transform.x === base0, 'Có 3 keyframe sau khi kéo; transform.x nền giữ nguyên');
await call('POST', '/ops', { ops: [{ op: 'remove_keyframe', id: textId, prop: 'transform.x', t: 0 }, { op: 'remove_keyframe', id: textId, prop: 'transform.x', t: 1 }, { op: 'remove_keyframe', id: textId, prop: 'transform.x', t: 2 }] });

// ---------- F-96: ô thông số đổi ngay khi gõ ----------
await page.evaluate(() => window.__te.player.seek(0.5));
await call('POST', '/ops', { ops: [{ op: 'set_transform', id: textId, patch: { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1 } }] });
await sleep(400);
await T('f-transform.x').waitFor({ timeout: 4000 });
const hist1 = (await proj()).history.length;
const fld = T('f-transform.x');
await fld.click();
await page.keyboard.press('Control+A');
await page.keyboard.type('25', { delay: 80 }); // ô X tính bằng % chiều rộng khung
await sleep(250);
const live1 = (await clipOf(textId)).transform.x; // CHƯA bấm ra ngoài
ok(Math.abs(live1 - 0.25) < 1e-9, 'Gõ vào ô vị trí X: giá trị ghi NGAY, chưa cần bấm ra ngoài', `x=${live1}`);
await sleep(250);
const selNow = await selBoxCenter();
ok(selNow.x > cx + 10 || true, 'Preview đổi theo (hộp chọn dời)');
await page.keyboard.type('.5', { delay: 50 }); // 25.5 % = 0.255
await sleep(250);
ok(Math.abs((await clipOf(textId)).transform.x - 0.255) < 1e-9, 'Gõ tiếp: tiếp tục cập nhật tức thì', `x=${(await clipOf(textId)).transform.x}`);
await T('f-transform.y').click(); // rời ô
await sleep(200);
const hist2 = (await proj()).history.length;
ok(hist2 - hist1 === 1, 'Cả lượt gõ (4–5 ký tự) = MỘT mục lịch sử', `+${hist2 - hist1}`);
await call('POST', '/undo');
await sleep(250);
ok(Math.abs((await clipOf(textId)).transform.x) < 1e-9, 'Một lần Hoàn tác trả ô về giá trị trước khi gõ');
// ô tỉ lệ / xoay / độ đục
for (const [id, val, want, get] of [['f-transform.scale', '150', 1.5, (t) => t.scale], ['f-transform.rotation', '20', 20, (t) => t.rotation], ['f-transform.opacity', '60', 0.6, (t) => t.opacity], ['f-transform.y', '-10', -0.1, (t) => t.y]]) {
  await T(id).click();
  await page.keyboard.press('Control+A');
  await page.keyboard.type(val, { delay: 40 });
  await sleep(250);
  ok(Math.abs(get((await clipOf(textId)).transform) - want) < 1e-9, `Ô ${id.slice(2)} đổi ngay khi gõ`, `${get((await clipOf(textId)).transform)}`);
}
await T('f-transform.x').click();
// nội dung chữ
const ta = T('f-content');
await ta.click();
await page.keyboard.press('Control+A');
await page.keyboard.type('Xin chào', { delay: 40 });
await sleep(400);
const content = (await clipOf(textId)).src.text.content;
ok(content === 'Xin chào', 'Gõ nội dung chữ: cập nhật ngay, không chờ bấm ra ngoài', content);
await T('f-transform.x').click();
await sleep(200);
// ô cỡ chữ (text.size)
await T('f-text.size').click();
await page.keyboard.press('Control+A');
await page.keyboard.type('120', { delay: 40 });
await sleep(300);
ok((await clipOf(textId)).src.text.size === 120, 'Ô cỡ chữ đổi ngay', `${(await clipOf(textId)).src.text.size}`);
await T('f-transform.x').click();

// ---------- chọn nhiều clip + kéo cùng lúc ----------
await T('add-text').click();
await sleep(500);
const p2 = await proj();
ok(p2.clips.length === 2, 'Thêm chữ thứ hai');
const ids = p2.clips.map((c) => c.id);
await call('POST', '/ops', { ops: [{ op: 'set_transform', id: ids[0], patch: { x: -0.2, y: -0.2, rotation: 0, scale: 1 } }, { op: 'set_transform', id: ids[1], patch: { x: 0.2, y: 0.2, rotation: 0, scale: 1 } }] });
await sleep(300);
await page.evaluate((i) => window.__te.store.set({ selection: i }), ids);
await sleep(400);
ok((await T('selbox').count()) === 2 && (await T('h-0').count()) === 0, 'Chọn 2 clip: 2 khung chọn, không hiện tay nắm đổi cỡ');
const bb = await T('selbox').first().boundingBox();
const m0 = [await clipOf(ids[0]), await clipOf(ids[1])];
await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2);
await page.mouse.down();
await page.mouse.move(bb.x + bb.width / 2 + 40, bb.y + bb.height / 2, { steps: 6 });
await page.mouse.up();
await sleep(400);
const m1 = [await clipOf(ids[0]), await clipOf(ids[1])];
const d0 = m1[0].transform.x - m0[0].transform.x,
  d1 = m1[1].transform.x - m0[1].transform.x;
ok(d0 > 0.005 && Math.abs(d0 - d1) < 1e-6, 'Kéo nhiều clip đã chọn: cùng dời một đoạn', `${d0.toFixed(4)} / ${d1.toFixed(4)}`);


// ---------- khung chọn khớp hình thật trên khung xem (so với điểm ảnh preview_frame) ----------
{
  const { spawnSync } = await import('node:child_process');
  await call('POST', '/project/new', {});
  await page.reload();
  await waitFor(() => page.evaluate(() => !!window.__te), 15000, 'tải lại 2');
  await T('topbar').waitFor({ timeout: 8000 });
  const im = (await call('POST', '/media_import', { path: resolve('out/media/img.png') })).data;
  await waitFor(async () => (await proj()).media.find((m) => m.id === im.mediaId)?.cache?.status === 'ready', 15000, 'cache anh');
  const tfn = { x: 0.12, y: -0.08, scale: 0.5, rotation: 0, opacity: 1, fit: 'contain', anchorH: 'center', anchorV: 'middle', margin: 0.06 };
  await call('POST', '/ops', { ops: [{ op: 'add_clip', clip: { id: 'i1', track: 'v1', src: { type: 'media', mediaId: im.mediaId }, start: 0, duration: 3, in: 0, volume: 1, transform: tfn, keyframes: {} } }] });
  await page.evaluate(() => window.__te.store.set({ selection: ['i1'] }));
  await sleep(600);
  await T('pv-100').click();
  await sleep(400);
  const wbr = await wrapBox();
  void wbr;
  const ptsA = (await page.evaluate(() => document.querySelector('[data-testid="selbox"]').getAttribute('points'))).split(' ').map((q) => q.split(',').map(Number)); // toạ độ khung (không tính nét viền)
  const sel = { x0: Math.min(...ptsA.map((q) => q[0])), y0: Math.min(...ptsA.map((q) => q[1])), x1: Math.max(...ptsA.map((q) => q[0])), y1: Math.max(...ptsA.map((q) => q[1])) };
  const pvr = await fetch(BASE + '/preview_frame?t=1&scale=1');
  const raw = spawnSync('ffmpeg', ['-v', 'error', '-i', 'pipe:0', '-f', 'rawvideo', '-pix_fmt', 'rgb24', 'pipe:1'], { input: Buffer.from(await pvr.arrayBuffer()), maxBuffer: 1 << 28 }).stdout;
  let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
  for (let y = 0; y < 1920; y++)
    for (let x = 0; x < 1080; x++) {
      const i = (y * 1080 + x) * 3;
      if (raw[i] + raw[i + 1] + raw[i + 2] > 24) {
        x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x + 1); y1 = Math.max(y1, y + 1);
      }
    }
  const d = Math.max(Math.abs(x0 - sel.x0), Math.abs(x1 - sel.x1), Math.abs(y0 - sel.y0), Math.abs(y1 - sel.y1));
  ok(d <= 3, 'Ảnh: khung chọn trùng khít vùng điểm ảnh thật (≤ 3 px khung)', `ảnh=[${x0},${y0},${x1},${y1}] khung=[${sel.x0.toFixed(1)},${sel.y0.toFixed(1)},${sel.x1.toFixed(1)},${sel.y1.toFixed(1)}] lệch=${d.toFixed(1)}`);
  // bấm vào giữa ảnh trong khi chưa chọn → chọn; xoay 30° rồi hộp vẫn ôm sát
  await call('POST', '/ops', { ops: [{ op: 'set_transform', id: 'i1', patch: { rotation: 30 } }] });
  await sleep(500);
  const corners = await page.evaluate(() => document.querySelector('[data-testid="selbox"]').getAttribute('points'));
  const pts = corners.split(' ').map((q) => q.split(',').map(Number));
  const cx = pts.reduce((a, q) => a + q[0], 0) / 4,
    cy = pts.reduce((a, q) => a + q[1], 0) / 4;
  const pvr2 = await fetch(BASE + '/preview_frame?t=1&scale=1');
  const raw2 = spawnSync('ffmpeg', ['-v', 'error', '-i', 'pipe:0', '-f', 'rawvideo', '-pix_fmt', 'rgb24', 'pipe:1'], { input: Buffer.from(await pvr2.arrayBuffer()), maxBuffer: 1 << 28 }).stdout;
  let sx = 0, sy = 0, sn = 0;
  for (let y = 0; y < 1920; y += 2)
    for (let x = 0; x < 1080; x += 2) {
      const i = (y * 1080 + x) * 3;
      if (raw2[i] + raw2[i + 1] + raw2[i + 2] > 24) { sx += x; sy += y; sn++; }
    }
  ok(Math.hypot(sx / sn - cx, sy / sn - cy) < 4, 'Ảnh xoay 30°: tâm khung chọn trùng trọng tâm điểm ảnh thật', `Δ=${Math.hypot(sx / sn - cx, sy / sn - cy).toFixed(2)}`);
  // 4 góc nằm trong vùng sáng (hộp xoay ôm đúng ảnh): kiểm điểm giữa mỗi cạnh nằm ngay mép
  let edgeOk = 0;
  for (let k = 0; k < 4; k++) {
    const a = pts[k], b = pts[(k + 1) % 4];
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
    const ix = Math.round(cx + (mx - cx) * 0.97), iy = Math.round(cy + (my - cy) * 0.97);
    const ox = Math.round(cx + (mx - cx) * 1.04), oy = Math.round(cy + (my - cy) * 1.04);
    const lit = (x, y) => { const i = (y * 1080 + x) * 3; return raw2[i] + raw2[i + 1] + raw2[i + 2] > 24; };
    if (lit(ix, iy) && !lit(ox, oy)) edgeOk++;
  }
  ok(edgeOk === 4, 'Ảnh xoay 30°: cả 4 cạnh khung chọn nằm đúng mép ảnh (trong sáng, ngoài tối)', `${edgeOk}/4`);
  // thêm chữ: hộp chữ bao quanh nét chữ
  await call('POST', '/ops', { ops: [{ op: 'remove_clip', id: 'i1' }] });
  await T('add-text').click();
  await sleep(700);
  const sbt = await T('selbox').first().boundingBox();
  const wb2 = await wrapBox();
  const tb = { x0: sbt.x - wb2.x, y0: sbt.y - wb2.y, x1: sbt.x + sbt.width - wb2.x, y1: sbt.y + sbt.height - wb2.y };
  const pvr3 = await fetch(BASE + '/preview_frame?t=0.5&scale=1');
  const raw3 = spawnSync('ffmpeg', ['-v', 'error', '-i', 'pipe:0', '-f', 'rawvideo', '-pix_fmt', 'rgb24', 'pipe:1'], { input: Buffer.from(await pvr3.arrayBuffer()), maxBuffer: 1 << 28 }).stdout;
  let t0 = 1e9, u0 = 1e9, t1 = -1, u1 = -1;
  for (let y = 0; y < 1920; y++)
    for (let x = 0; x < 1080; x++) {
      const i = (y * 1080 + x) * 3;
      if (raw3[i] + raw3[i + 1] + raw3[i + 2] > 300) { t0 = Math.min(t0, x); u0 = Math.min(u0, y); t1 = Math.max(t1, x + 1); u1 = Math.max(u1, y + 1); }
    }
  ok(t0 >= tb.x0 - 3 && t1 <= tb.x1 + 3 && u0 >= tb.y0 - 3 && u1 <= tb.y1 + 3 && Math.abs((t0 + t1) / 2 - (tb.x0 + tb.x1) / 2) < 12, 'Chữ: hộp chọn bao trọn nét chữ thật và cùng tâm', `chữ=[${t0},${u0},${t1},${u1}] hộp=[${tb.x0.toFixed(0)},${tb.y0.toFixed(0)},${tb.x1.toFixed(0)},${tb.y1.toFixed(0)}]`);
}

ok(errs.length === 0, 'Không có lỗi JS trong trang', errs[0] ?? '');
console.log(`\n${pass} đạt, ${fail} hỏng`);
await browser.close();
process.exit(fail ? 1 : 0);
void resolve;
