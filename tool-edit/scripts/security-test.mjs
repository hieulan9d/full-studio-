// Kiem bao mat: app chay KHONG co TOOL_EDIT_DEV_API -> HTTP khong duoc co cac duong "ap dung".
const BASE = `http://127.0.0.1:${process.env.TOOL_EDIT_PORT ?? 17480}`;
let pass = 0, fail = 0;
const ok = (c, n, x = '') => { c ? pass++ : fail++; console.log(`${c ? 'ok  ' : 'FAIL'} - ${n}${x ? '  [' + x + ']' : ''}`); };
const call = async (m, p, b) => { const r = await fetch(BASE + p, { method: m, headers: { 'Content-Type': 'application/json' }, body: b ? JSON.stringify(b) : undefined }); return { status: r.status, data: await r.json().catch(() => null) }; };

const st = (await call('GET', '/status')).data;
ok(st?.ok === true, 'app dang chay (khong DEV)');
const bad = [
  ['POST', '/ops', { ops: [{ op: 'add_track', track: { id: 'x', kind: 'video', name: 'x' } }] }],
  ['POST', '/undo'], ['POST', '/redo'],
  ['POST', '/project/new', {}], ['POST', '/project/load', { path: 'autosave' }], ['POST', '/project/save', { path: 'x.tedit' }], ['POST', '/project/rename', { name: 'x' }],
  ['POST', '/snapshots/restore', { name: 'x' }],
  ['POST', '/settings', { keymap: { split: 'X' } }],
  ['POST', '/projects/create', { name: 'x' }], ['POST', '/projects/duplicate', { path: 'x.tedit' }], ['POST', '/projects/rename', { path: 'x.tedit', name: 'y' }],
  ['POST', '/projects/forget', { path: 'x.tedit' }], ['POST', '/projects/trash', { path: 'x.tedit' }], ['POST', '/library/remove_dir', { dir: 'x' }],
];
for (const [m, p, b] of bad) {
  const r = await call(m, p, b);
  ok(r.status === 403, `${m} ${p} bi chan (403)`, String(r.status));
}
const pr = (await call('POST', '/propose', { source: 'ai:ke-xau', note: 'thu', ops: [{ op: 'add_track', track: { id: 'v9', kind: 'video', name: 'V9' } }] })).data;
ok(pr.ok && pr.status === 'pending', 'AI van de xuat duoc (propose)');
const acc = await call('POST', `/proposals/${pr.proposal_id}/accept`);
const rej = await call('POST', `/proposals/${pr.proposal_id}/reject`);
ok(acc.status === 403 && rej.status === 403, 'AI KHONG tu chap nhan/tu choi duoc qua HTTP (403)', `${acc.status}/${rej.status}`);
const p = (await call('GET', '/project')).data;
ok(!p.tracks.some((t) => t.id === 'v9'), 'du an khong bi doi boi de xuat chua duyet');
ok((await call('GET', '/proposals')).data.find((x) => x.id === pr.proposal_id).status === 'pending', 'de xuat van o trang thai pending, cho nguoi dung duyet trong giao dien');
ok((await call('POST', '/snapshots', { name: 'a' })).status === 200, 'AI tao duoc snapshot (khong nguy hiem)');
// xuat timeline (F-97): AI goi duoc nhung khong co duong "out"/"install"; timeline rong -> loi co cau truc, khong tao file
const ex = await call('POST', '/export_timeline', { target: 'edl', out: 'C:/Windows/Temp/tedit-khong-duoc-ghi', install: true });
ok(ex.status === 500 && /timeline rong/.test(ex.data?.error ?? ''), 'export_timeline tren timeline rong -> loi co cau truc (khong 403, khong tao file)', `${ex.status} ${ex.data?.error}`);
console.log(`\n${pass} dat, ${fail} that bai`);
process.exitCode = fail ? 1 : 0;
