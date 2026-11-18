// Kiem MCP server bang client MCP that (SDK chinh thuc) qua stdio. Can app dang chay (npm start).
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

let pass = 0,
  fail = 0;
const ok = (c, n, x = '') => {
  c ? pass++ : fail++;
  console.log(`${c ? 'ok  ' : 'FAIL'} - ${n}${x ? '  [' + x + ']' : ''}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const BASE = `http://127.0.0.1:${process.env.TOOL_EDIT_PORT ?? 17480}`;
const MEDIA = resolve('out/media');

const client = new Client({ name: 'mcp-test', version: '1.0.0' });
await client.connect(new StdioClientTransport({ command: 'node', args: ['dist/mcp.mjs'], env: { ...process.env, TOOL_EDIT_AI_NAME: 'test' } }));
const call = async (name, args = {}) => client.callTool({ name, arguments: args });
const body = (r) => JSON.parse(r.content.find((c) => c.type === 'text').text);

// ---- tools/list va schema
const { tools } = await client.listTools();
const names = tools.map((t) => t.name).sort();
ok(['app_status', 'contact_sheet', 'job_cancel', 'job_status', 'media_import', 'preview_frame', 'project_get', 'propose_ops', 'proposals_list', 'render_start', 'snapshot_create', 'snapshots_list', 'add_text', 'set_keyframes', 'apply_preset', 'list_presets', 'list_fonts', 'transcribe', 'get_transcript', 'fix_transcript', 'generate_captions', 'cut_silences', 'cut_words', 'list_library', 'suggest_sfx', 'duck_music', 'detect_beats', 'beat_markers', 'qc_check', 'remove_background', 'apply_matte', 'text_behind_person', 'set_speed', 'grade_get', 'grade_set', 'apply_lut', 'analyze_frame', 'scope_image', 'match_color', 'set_fx', 'set_blend', 'add_shape', 'export_timeline'].every((n) => names.includes(n)) && names.length === 43, 'tools/list du 43 tool', names.join(','));
ok(!names.some((n) => /accept|reject|undo|apply|restore/.test(n) && n !== 'apply_preset' && n !== 'apply_matte' && n !== 'apply_lut'), 'AI KHONG co tool ap dung/duyet/hoan tac/khoi phuc truc tiep (apply_preset, apply_matte, apply_lut chi tao DE XUAT, da kiem rieng)');
const flat = JSON.stringify(tools.map((t) => t.inputSchema));
ok(!/anyOf|oneOf|allOf/.test(flat), 'schema khong dung anyOf/oneOf/allOf (than thien Gemini/GPT)', (flat.match(/anyOf|oneOf|allOf/g) ?? []).join(','));
ok(tools.every((t) => t.description && t.description.length > 20), 'moi tool co mo ta');

// ---- luong dung that
const st = body(await call('app_status'));
ok(st.rendererReady === true, 'app_status: renderer san sang');
const imp = body(await call('media_import', { path: resolve(MEDIA, 'seq.mp4') }));
ok(imp.ok && imp.mediaId, 'media_import', JSON.stringify(imp));
const bad = await call('media_import', { path: resolve(MEDIA, 'khong-co.mp4') });
ok(bad.isError === true && /khong thay file/.test(bad.content[0].text), 'media_import loi -> isError co thong diep');
if (imp.job_id) {
  for (let i = 0; i < 200; i++) {
    const j = body(await call('job_status', { job_id: imp.job_id }));
    if (j.state !== 'running') {
      ok(j.state === 'done', 'cache xong qua job_status', j.state);
      break;
    }
    await sleep(150);
  }
}
const mid = imp.mediaId;
const clip = { id: 'c1', track: 'v1', src: { type: 'media', mediaId: mid }, start: 0, duration: 3, in: 0, volume: 1, transform: { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1, fit: 'contain' } };
const pr = body(await call('propose_ops', { ops: [{ op: 'add_clip', clip }], note: 'Them clip seq vao track 1' }));
ok(pr.ok && pr.status === 'pending', 'propose_ops tao de xuat pending', pr.proposal_id);
let proj = body(await call('project_get'));
ok(proj.clips.length === 0, 'du an CHUA doi sau propose_ops');
const prBad = await call('propose_ops', { ops: [{ op: 'add_clip', clip: { ...clip, id: 'cz', duration: 99 } }] });
ok(prBad.isError === true && /vuot do dai/.test(prBad.content[0].text), 'propose sai bi tu choi ngay voi ly do');
const prUnknown = await call('propose_ops', { ops: [{ op: 'lam_gi_do' }] });
ok(prUnknown.isError === true, 'op khong biet bi tu choi');

// xem thu ket qua cua de xuat KHI CHUA duoc duyet
const pvp = await call('preview_frame', { t: 1, scale: 0.1, proposal_id: pr.proposal_id });
ok(!pvp.isError && pvp.content.some((c) => c.type === 'image'), 'preview_frame voi proposal_id xem truoc de xuat chua duyet');
ok(body(await call('project_get')).clips.length === 0, 'xem truoc de xuat khong doi du an');
const snap = body(await call('snapshot_create', { name: 'mcp-test' }));
ok(snap.ok && body(await call('snapshots_list')).some((x) => x.name === 'mcp-test'), 'snapshot_create + snapshots_list');

// nguoi dung duyet (khong qua MCP)
const acc = await fetch(`${BASE}/proposals/${pr.proposal_id}/accept`, { method: 'POST' });
ok(acc.status === 200, 'nguoi dung accept qua app');
proj = body(await call('project_get'));
ok(proj.clips.length === 1 && proj.history_last.at(-1).source === 'ai:test', 'du an co clip, nguon history = ai:test', proj.history_last.at(-1)?.source);
const list = body(await call('proposals_list'));
ok(list.find((p) => p.id === pr.proposal_id)?.status === 'accepted', 'proposals_list thay trang thai accepted');

// nhin
const pf = await call('preview_frame', { t: 1, scale: 0.2 });
const img = pf.content.find((c) => c.type === 'image');
ok(img && img.mimeType === 'image/png' && Buffer.from(img.data, 'base64').subarray(1, 4).toString() === 'PNG', 'preview_frame tra image/png hop le');
const cs = await call('contact_sheet', { count: 5, scale: 0.12 });
const cimg = cs.content.find((c) => c.type === 'image');
ok(cimg && Buffer.from(cimg.data, 'base64').length > 1000, 'contact_sheet tra anh ghep', cs.content.find((c) => c.type === 'text')?.text);
const pfBad = await call('preview_frame', { t: -1 });
ok(pfBad.isError === true, 'tham so sai (t<0) bi schema chan');

// xuat
const out = resolve('out/e2e/mcp-test-' + Date.now() + '.mp4');
const rs = body(await call('render_start', { preset: '9:16', out }));
ok(rs.ok && rs.frames === 90, 'render_start 90 khung', JSON.stringify(rs).slice(0, 80));
for (let i = 0; i < 400; i++) {
  const j = body(await call('job_status', { job_id: rs.job_id }));
  if (j.state !== 'running') {
    ok(j.state === 'done' && j.result.bytes > 10000, 'render xong qua MCP', j.error ?? `${j.result?.seconds}s`);
    break;
  }
  await sleep(200);
}

// ---- chu + keyframe + preset + font (GD2): tat ca deu la DE XUAT cho nguoi duyet
const presets = body(await call('list_presets'));
ok(presets.length >= 8 && presets.some((x) => x.id === 'keyword-gradient' && /kit/.test(x.source)), 'list_presets: >= 8 preset, co nguon so do tu kit', `${presets.length} preset`);
let fonts = body(await call('list_fonts', { vietnamese: true }));
for (let i = 0; i < 40 && fonts.scanning; i++) { await sleep(500); fonts = body(await call('list_fonts', { vietnamese: true })); }
ok(fonts.fonts.length > 5 && fonts.fonts.every((f) => f.vietnamese === true) && fonts.fonts.some((f) => f.family === 'Segoe UI'), 'list_fonts(vietnamese=true): chi font du dau tieng Viet, co Segoe UI', `${fonts.total} ho`);
const noFilter = body(await call('list_fonts', { vietnamese: false, query: 'impact' }));
ok(noFilter.fonts.some((f) => f.family === 'Impact' && f.vietnamese === false), 'list_fonts(vietnamese=false, query=impact): thay Impact va danh dau thieu dau');
const before = body(await call('project_get'));
const at = body(await call('add_text', { text: 'Tu khoa chinh', start: 0, duration: 2, preset: 'keyword-gradient', font: 'Segoe UI Black', size: 200, note: 'Them tu khoa' }));
ok(at.ok && at.status === 'pending' && at.clip_id && at.track, 'add_text tao de xuat pending (tu chon track)', JSON.stringify({ id: at.proposal_id, clip: at.clip_id, track: at.track }));
ok(body(await call('project_get')).clips.length === before.clips.length, 'add_text KHONG doi du an cho den khi duyet');
const bad1 = await call('add_text', { text: 'x', start: 0, duration: 2, preset: 'khong-co' });
ok(bad1.isError === true && /preset/.test(bad1.content[0].text), 'add_text voi preset khong co bi tu choi ngay kem ly do');
const bad2 = await call('add_text', { text: 'x', start: 0, track: 'a1' });
ok(bad2.isError === true && /khong phai track video|khong ton tai/.test(bad2.content[0].text), 'add_text vao track audio bi tu choi');
const bad3 = await call('add_text', { text: 'x', start: 0, color: 'do' });
ok(bad3.isError === true, 'add_text voi mau sai dinh dang bi chan boi schema');
const acc2 = await fetch(`${BASE}/proposals/${at.proposal_id}/accept`, { method: 'POST' });
ok(acc2.status === 200, 'nguoi dung duyet de xuat add_text');
let pj = body(await call('project_get'));
const tc = pj.clips.find((x) => x.id === at.clip_id);
ok(tc && tc.src.type === 'text' && tc.src.text.size === 200 && tc.src.text.font === 'Segoe UI Black' && tc.src.text.fill.type === 'linear' && tc.keyframes['transform.scale']?.length === 2, 'Sau khi duyet: clip chu co preset (gradient, keyframe) + font/co ghi de');
const at2 = body(await call('add_text', { text: 'Dong thu hai', start: 0.5, duration: 1.5 }));
ok(at2.ok && at2.track !== at.track, 'add_text thu hai trung thoi gian: tu chon track KHAC (tranh chong)', `${at.track} / ${at2.track}`);
await fetch(`${BASE}/proposals/${at2.proposal_id}/accept`, { method: 'POST' });
const sk = body(await call('set_keyframes', { clip_id: at.clip_id, property: 'text.fill.offset', keys: [{ t: 0, value: 0, ease: 'linear' }, { t: 2, value: 0.5, bezier: [0.4, 0, 0.2, 1] }], note: 'Truot gradient' }));
ok(sk.ok && sk.status === 'pending', 'set_keyframes tao de xuat pending');
await fetch(`${BASE}/proposals/${sk.proposal_id}/accept`, { method: 'POST' });
pj = body(await call('project_get'));
const offKeys = pj.clips.find((x) => x.id === at.clip_id).keyframes['text.fill.offset'];
ok(offKeys?.length === 2 && offKeys[0].ease.kind === 'linear' && offKeys[0].ease.x1 === 0 && offKeys[1].ease.kind === 'bezier' && offKeys[1].ease.x1 === 0.4, 'Sau khi duyet: keyframe voi ease linear va bezier tuy chinh');
const skBad = await call('set_keyframes', { clip_id: at.clip_id, property: 'volume', keys: [{ t: 0, value: 1 }] });
ok(skBad.isError === true && /volume|keyframe/.test(skBad.content[0].text), 'set_keyframes cho thuoc tinh khong hop le (volume tren clip chu) bi tu choi kem ly do');
const skBad2 = await call('set_keyframes', { clip_id: at.clip_id, property: 'transform.x', keys: [{ t: 1, value: 0 }, { t: 1, value: 1 }] });
ok(skBad2.isError === true, 'set_keyframes voi hai keyframe trung thoi diem bi tu choi');
const ap = body(await call('apply_preset', { clip_id: at.clip_id, preset: 'neon-number' }));
ok(ap.ok, 'apply_preset tao de xuat pending');
const apBad = await call('apply_preset', { clip_id: at.clip_id, preset: 'khong-co' });
ok(apBad.isError === true, 'apply_preset voi preset khong co bi schema chan (enum)');
const apBad2 = await call('apply_preset', { clip_id: clip.id, preset: 'neon-number' });
ok(apBad2.isError === true && /clip chu/.test(apBad2.content[0].text), 'apply_preset len clip video bi tu choi: "chi ap dung cho clip chu"');
// canh bao font trong project_get
const warnProp = body(await call('add_text', { text: 'Việt Nam', start: 5, duration: 1, font: 'Impact' }));
await fetch(`${BASE}/proposals/${warnProp.proposal_id}/accept`, { method: 'POST' });
pj = body(await call('project_get'));
ok(pj.warnings.some((w) => w.code === 'font-no-vietnamese' && w.clip === warnProp.clip_id), 'project_get kem canh bao: font Impact thieu dau tieng Viet cho clip chu Viet', pj.warnings[0]?.message?.slice(0, 50));

// ---- GD3: loi thoai, phu de, khoang lang, SFX, duck, nhip, qc (moi thu ghi deu la DE XUAT)
const speechPath = resolve(MEDIA, 'speech-en.mp4');
const simp = body(await call('media_import', { path: speechPath }));
for (const jid of [simp.job_id, simp.audio_job_id].filter(Boolean)) for (let i = 0; i < 300; i++) { if (body(await call('job_status', { job_id: jid })).state !== 'running') break; await sleep(200); }
const sdur = body(await call('project_get')).media.find((m) => m.id === simp.mediaId).duration;
await fetch(`${BASE}/ops`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ source: 'human', ops: [{ op: 'add_clip', clip: { id: 'sp', track: 'v1', src: { type: 'media', mediaId: simp.mediaId }, start: 20, duration: sdur, in: 0, volume: 1, transform: {}, keyframes: {} } }] }) });
const trNone = await call('get_transcript', { media_id: simp.mediaId });
ok(trNone.isError === true, 'get_transcript khi chua nhan dang -> loi co thong diep');
const trj = body(await call('transcribe', { media_id: simp.mediaId, language: 'en' }));
ok(trj.ok && trj.job_id, 'transcribe tra job_id (chay nen)', JSON.stringify(trj).slice(0, 80));
let tjob;
for (let i = 0; i < 600; i++) { tjob = body(await call('job_status', { job_id: trj.job_id })); if (tjob.state !== 'running') break; await sleep(300); }
ok(tjob.state === 'done', 'whisper xong qua MCP', tjob.error ?? tjob.state);
const gt = body(await call('get_transcript', { media_id: simp.mediaId }));
ok(gt.total_words >= 20 && gt.words[0].s >= 0, 'get_transcript: tung tu co moc thoi gian', `${gt.total_words} tu`);
const nClips0 = body(await call('project_get')).clips.length;
const ft = body(await call('fix_transcript', { media_id: simp.mediaId, edits: [{ index: 0, text: 'Sua' }] }));
ok(ft.ok && ft.status === 'pending', 'fix_transcript tao de xuat pending');
const ftBad = await call('fix_transcript', { media_id: simp.mediaId, edits: [{ index: 9999, text: 'x' }] });
ok(ftBad.isError === true, 'fix_transcript voi chi so tu sai bi tu choi');
const gc = body(await call('generate_captions', { clip_id: 'sp', style: 'karaoke' }));
ok(gc.ok && gc.status === 'pending' && body(await call('project_get')).clips.length === nClips0, 'generate_captions: de xuat pending, du an chua doi');
const gcBad = await call('generate_captions', { clip_id: 'khong-co' });
ok(gcBad.isError === true, 'generate_captions clip khong co bi tu choi');
const cs2 = body(await call('cut_silences', { clip_id: 'sp', min_silence: 1 }));
ok(cs2.ok && cs2.status === 'pending' && cs2.silences.length === 1 && cs2.total_seconds > 1.5, 'cut_silences: tim 1 khoang lang va tao de xuat', `${cs2.total_seconds}s`);
const cw = body(await call('cut_words', { clip_id: 'sp', media_id: simp.mediaId, from_word: 2, to_word: 4 }));
ok(cw.ok && cw.status === 'pending' && cw.range.e > cw.range.s, 'cut_words tao de xuat cat doan');
const cwBad = await call('cut_words', { clip_id: 'sp', media_id: simp.mediaId, from_word: 5, to_word: 2 });
ok(cwBad.isError === true, 'cut_words voi doan nguoc bi tu choi');
const ll = body(await call('list_library', { kind: 'sfx', query: 'whoosh' }));
ok(ll.items.length >= 3 && ll.items.every((x) => x.kind === 'sfx'), 'list_library: tim SFX whoosh', `${ll.items.length} muc`);
const lm = body(await call('list_library', { kind: 'music' }));
ok(lm.items.length === 8 && lm.items.every((x) => x.bpm > 0), 'list_library: 8 bai nhac co BPM');
const ss = body(await call('suggest_sfx', { rules: [{ event: 'text', tag: 'whoosh', volume: 0.5 }] }));
ok(ss.ok && ss.proposal_id && ss.plan.length >= 1 && body(await call('proposals_list')).find((p) => p.id === ss.proposal_id)?.status === 'pending', 'suggest_sfx tao de xuat pending (khong tu ap dung)');
const ssBad = await call('suggest_sfx', { rules: [{ event: 'text', tag: 'tag-khong-co' }] });
ok(ssBad.isError === true && /thieu tag|khong/.test(ssBad.content[0].text), 'suggest_sfx voi tag khong co trong kho bi tu choi');
const dm = body(await call('duck_music', { clip_id: 'c1', amount_db: -12 }));
ok(dm.ok && dm.status === 'pending', 'duck_music tao de xuat pending');
const bm = await call('beat_markers', { clip_id: 'sp' });
ok(bm.isError === true && /nhip/.test(bm.content[0].text), 'beat_markers khi chua detect_beats bi tu choi kem huong dan');
const qcr = body(await call('qc_check'));
ok(typeof qcr.ok === 'boolean' && Array.isArray(qcr.issues) && qcr.loudness, 'qc_check tra loudness + danh sach van de', `${qcr.loudness?.integrated_lufs} LUFS`);
const pend = body(await call('proposals_list')).filter((p) => p.status === 'pending').length;
ok(pend >= 6, 'moi tool ghi deu chi tao DE XUAT (chua ap dung gi)', `${pend} de xuat dang cho`);

// ---- GD4: toc do + tach nen (moi thu ghi deu la DE XUAT)
const spd = body(await call('set_speed', { clip_id: 'sp', speed: 0.9 }));
ok(spd.ok && spd.status === 'pending', 'set_speed (toc do co dinh) tao de xuat pending');
const spdP = body(await call('set_speed', { clip_id: 'sp', preset: 'hero-time' }));
ok(spdP.ok && spdP.status === 'pending', 'set_speed voi preset hero-time tao de xuat pending');
const spdBad = await call('set_speed', { clip_id: 'sp', speed: 2, preset: 'pulse' });
ok(spdBad.isError === true && /MOT/.test(spdBad.content[0].text), 'set_speed truyen ca speed va preset bi tu choi: chi MOT');
const spdOver = await call('set_speed', { clip_id: 'c1', speed: 16 });
ok(spdOver.isError === true, 'set_speed vuot do dai nguon bi tu choi ngay kem ly do', spdOver.content?.[0]?.text?.slice(0, 80));
const spdNoClip = await call('set_speed', { clip_id: 'khong-co', speed: 2 });
ok(spdNoClip.isError === true, 'set_speed clip khong co bi tu choi');
const spdRange = await call('set_speed', { clip_id: 'sp', speed: 100 });
ok(spdRange.isError === true, 'set_speed ngoai 0.05..16 bi schema chan');
const arPath = resolve(MEDIA, 'aroll6.mp4');
if (existsSync(arPath) && existsSync(resolve('models/rvm_mobilenetv3_fp32.onnx'))) {
  const ai = body(await call('media_import', { path: arPath }));
  for (const jid of [ai.job_id, ai.audio_job_id].filter(Boolean)) for (let i = 0; i < 300; i++) { if (body(await call('job_status', { job_id: jid })).state !== 'running') break; await sleep(200); }
  await fetch(`${BASE}/ops`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ source: 'human', ops: [{ op: 'add_clip', clip: { id: 'ar', track: 'v1', src: { type: 'media', mediaId: ai.mediaId }, start: 60, duration: 5, in: 0, volume: 1, transform: {}, keyframes: {} } }] }) });
  const noMatte = await call('apply_matte', { clip_id: 'ar' });
  ok(noMatte.isError === true && /tach nen|matte/.test(noMatte.content[0].text), 'apply_matte khi chua tach nen bi tu choi kem huong dan');
  const noBehind = await call('text_behind_person', { clip_id: 'ar', text: 'X' });
  ok(noBehind.isError === true && /tach nen/.test(noBehind.content[0].text), 'text_behind_person khi chua tach nen bi tu choi');
  const rb = body(await call('remove_background', { media_id: ai.mediaId }));
  ok(rb.ok && rb.job_id, 'remove_background tra job_id (chay nen)');
  let rj;
  for (let i = 0; i < 900; i++) { rj = body(await call('job_status', { job_id: rb.job_id })); if (rj.state !== 'running') break; await sleep(300); }
  ok(rj.state === 'done', 'RVM xong qua MCP', rj.error ?? rj.result?.device);
  for (let i = 0; i < 120 && body(await call('project_get')).media.find((m) => m.role === 'matte')?.cache?.status !== 'ready'; i++) await sleep(300);
  const am = body(await call('apply_matte', { clip_id: 'ar', lo: 0.2, hi: 0.8, feather: 2 }));
  ok(am.ok && am.status === 'pending', 'apply_matte tao de xuat pending');
  const nTr0 = body(await call('project_get')).tracks.length;
  const tb = body(await call('text_behind_person', { clip_id: 'ar', text: 'Chu sau nguoi', preset: 'title-white' }));
  ok(tb.ok && tb.text_track && tb.person_track && tb.person_clip, 'text_behind_person tao de xuat: track chu + track nguoi + clip', JSON.stringify({ t: tb.text_track, p: tb.person_track }));
  ok(body(await call('project_get')).tracks.length === nTr0, 'text_behind_person KHONG doi du an cho den khi duyet');
  const accB = await fetch(`${BASE}/proposals/${tb.proposal_id}/accept`, { method: 'POST' });
  ok(accB.status === 200, 'nguoi dung duyet text_behind_person');
  const pj4 = body(await call('project_get'));
  const ov = pj4.clips.find((x) => x.id === tb.person_clip);
  const tx = pj4.clips.find((x) => x.id === tb.text_clip);
  const order = pj4.tracks.map((t) => t.id);
  ok(ov && ov.matte && ov.volume === 0 && ov.tag === 'cutout:ar' && tx && tx.track === tb.text_track && order.indexOf('v1') < order.indexOf(tb.text_track) && order.indexOf(tb.text_track) < order.indexOf(tb.person_track), 'Sau khi duyet: video goc (duoi) < chu (giua) < nguoi tach nen (tren cung), lop nguoi tat tieng');
} else console.log('BO QUA phan tach nen trong mcp-test: thieu aroll6.mp4 hoac mo hinh RVM');

// ---- GD5: chinh mau + scope + LUT (moi thu ghi la DE XUAT; do/xem la doc)
const colPath = resolve(MEDIA, 'color-test.mp4');
if (existsSync(colPath)) {
  const ci = body(await call('media_import', { path: colPath }));
  for (const jid of [ci.job_id, ci.audio_job_id].filter(Boolean)) for (let i = 0; i < 300; i++) { if (body(await call('job_status', { job_id: jid })).state !== 'running') break; await sleep(200); }
  const mk = (id, track) => ({ id, track, src: { type: 'media', mediaId: ci.mediaId }, start: 100, duration: 3, in: 0, volume: 1, transform: {}, keyframes: {} });
  await fetch(`${BASE}/ops`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ source: 'human', ops: [{ op: 'add_clip', clip: mk('g1', 'v1') }, { op: 'add_track', track: { id: 'vg2', kind: 'video', name: 'Tham chieu' } }, { op: 'add_clip', clip: { ...mk('g2', 'vg2'), start: 200 } }] }) });
  const gg = body(await call('grade_get', { clip_id: 'g1' }));
  ok(gg.graded === false && gg.grade.saturation === 1 && gg.grade.input === 'none', 'grade_get: clip chua chinh tra ve gia tri mac dinh');
  const gs = body(await call('grade_set', { clip_id: 'g1', exposure: 0.5, saturation: 1.2, lift: { m: 0.02 }, curves: { master: [[0, 0], [0.5, 0.45], [1, 1]] } }));
  ok(gs.ok && gs.status === 'pending', 'grade_set tao de xuat pending');
  ok(body(await call('grade_get', { clip_id: 'g1' })).graded === false, 'grade_set KHONG doi du an cho den khi duyet');
  const an0 = body(await call('analyze_frame', { t: 100.5, clip_id: 'g1', graded: false }));
  const anP = body(await call('analyze_frame', { t: 100.5, clip_id: 'g1', proposal_id: gs.proposal_id }));
  ok(an0.channels.luma.mean > 0 && anP.channels.luma.mean > an0.channels.luma.mean, 'analyze_frame(proposal_id) do duoc de xuat chua duyet: sang hon mau goc', `${an0.channels.luma.mean} -> ${anP.channels.luma.mean}`);
  const si = await call('scope_image', { t: 100.5, kind: 'vectorscope', clip_id: 'g1' });
  const simg = si.content.find((c) => c.type === 'image');
  ok(simg && Buffer.from(simg.data, 'base64').subarray(1, 4).toString() === 'PNG', 'scope_image tra anh PNG vectorscope');
  const sbad = await call('scope_image', { t: 100.5, kind: 'xyz' });
  ok(sbad.isError === true, 'scope_image voi loai khong co bi schema chan');
  const none = await call('grade_set', { clip_id: 'g1' });
  ok(none.isError === true, 'grade_set khong co truong nao bi tu choi');
  const badRange = await call('grade_set', { clip_id: 'g1', exposure: 50 });
  ok(badRange.isError === true, 'grade_set exposure ngoai khoang bi schema chan');
  const badClip = await call('grade_set', { clip_id: 'khong-co', exposure: 1 });
  ok(badClip.isError === true, 'grade_set clip khong co bi tu choi ngay');
  const badText = await call('grade_set', { clip_id: 'c1', exposure: 1 });
  void badText;
  const noLut = await call('apply_lut', { clip_id: 'g1', path: 'D:/khong/co.cube' });
  ok(noLut.isError === true && /khong thay/.test(noLut.content[0].text), 'apply_lut file khong co bi tu choi');
  const cubeFile = resolve('out/mcp-test.cube');
  const lines = ['LUT_3D_SIZE 2'];
  for (let b = 0; b < 2; b++) for (let g = 0; g < 2; g++) for (let r = 0; r < 2; r++) lines.push(`${1 - r} ${g} ${b}`);
  (await import('node:fs')).writeFileSync(cubeFile, lines.join('\n'));
  const lutOk = body(await call('apply_lut', { clip_id: 'g1', path: cubeFile, mix: 0.8 }));
  ok(lutOk.ok && lutOk.status === 'pending', 'apply_lut file .cube hop le tao de xuat pending');
  (await import('node:fs')).writeFileSync(cubeFile, 'LUT_3D_SIZE 3\n0 0 0\n');
  const lutBad = await call('apply_lut', { clip_id: 'g1', path: cubeFile });
  ok(lutBad.isError === true && /LUT khong doc duoc/.test(lutBad.content[0].text), 'apply_lut file .cube hong bi tu choi kem ly do');
  await fetch(`${BASE}/ops`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ source: 'human', ops: [{ op: 'set_grade', id: 'g2', grade: { exposure: 1, temperature: 40 } }] }) });
  const mc = body(await call('match_color', { clip_id: 'g1', t: 100.5, reference_clip_id: 'g2', reference_t: 200.5 }));
  ok(mc.ok && mc.status === 'pending' && mc.gain && mc.offset && Math.abs(mc.offset.r) <= 0.25, 'match_color tao de xuat gain/offset tu so do hai khung', JSON.stringify(mc.gain).slice(0, 60));
  const mcAfter = body(await call('analyze_frame', { t: 100.5, clip_id: 'g1', proposal_id: mc.proposal_id }));
  const mcRef = body(await call('analyze_frame', { t: 200.5, clip_id: 'g2' }));
  const dBefore = Math.abs(an0.channels.r.mean - mcRef.channels.r.mean) + Math.abs(an0.channels.b.mean - mcRef.channels.b.mean);
  const dAfter = Math.abs(mcAfter.channels.r.mean - mcRef.channels.r.mean) + Math.abs(mcAfter.channels.b.mean - mcRef.channels.b.mean);
  ok(dAfter < dBefore * 0.5, 'Sau match_color (xem truoc), trung binh R va B gan clip tham chieu hon it nhat mot nua', `${dBefore.toFixed(3)} -> ${dAfter.toFixed(3)}`);
  const acc = await fetch(`${BASE}/proposals/${gs.proposal_id}/accept`, { method: 'POST' });
  ok(acc.status === 200 && body(await call('grade_get', { clip_id: 'g1' })).grade.exposure === 0.5, 'Sau khi duyet: grade_get thay chinh mau da ap dung');
} else console.log('BO QUA phan mau trong mcp-test: thieu out/media/color-test.mp4');

// ---- GD6: hieu ung lop, blend, hinh vector (moi thu ghi la DE XUAT)
{
  const sfx = body(await call('set_fx', { clip_id: 'g1', glow: { radius: 30, intensity: 1.2, color: '#5ff4ff' }, round: { radius: 0.1 } }));
  ok(sfx.ok && sfx.status === 'pending', 'set_fx tao de xuat pending (glow + bo goc)');
  ok(body(await call('project_get')).clips.find((c) => c.id === 'g1').fx === undefined, 'set_fx KHONG doi du an cho den khi duyet');
  const sfxNone = await call('set_fx', { clip_id: 'g1' });
  ok(sfxNone.isError === true, 'set_fx khong co hieu ung nao bi tu choi');
  const sfxBad = await call('set_fx', { clip_id: 'g1', blur: { radius: 500 } });
  ok(sfxBad.isError === true, 'set_fx blur.radius ngoai khoang bi schema chan');
  const sfxText = await call('set_fx', { clip_id: 'c1', round: { radius: 0.1 } });
  void sfxText;
  const sfxClip = await call('set_fx', { clip_id: 'khong-co', blur: { radius: 5 } });
  ok(sfxClip.isError === true, 'set_fx clip khong co bi tu choi ngay');
  const sfxAcc = await fetch(`${BASE}/proposals/${sfx.proposal_id}/accept`, { method: 'POST' });
  ok(sfxAcc.status === 200 && body(await call('project_get')).clips.find((c) => c.id === 'g1').fx.glow.intensity === 1.2, 'Sau khi duyet: clip co hieu ung glow');
  const sfxOff = body(await call('set_fx', { clip_id: 'g1', remove: ['glow'] }));
  ok(sfxOff.ok, 'set_fx remove=[glow] tao de xuat go hieu ung');
  const sb = body(await call('set_blend', { clip_id: 'g1', blend: 'screen' }));
  ok(sb.ok && sb.status === 'pending', 'set_blend tao de xuat pending');
  const sbBad = await call('set_blend', { clip_id: 'g1', blend: 'overlay' });
  ok(sbBad.isError === true, 'set_blend che do khong co bi schema chan');
  const sh = body(await call('add_shape', { kind: 'ring', start: 300, duration: 2, w: 200, stroke_color: '#ffffff', stroke_width: 8, trim: 0.5, x: 0.1 }));
  ok(sh.ok && sh.status === 'pending' && sh.clip_id && sh.track, 'add_shape ring tao de xuat pending (tu chon track)', JSON.stringify({ c: sh.clip_id, t: sh.track }));
  const shBadTrack = await call('add_shape', { kind: 'rect', start: 0, track: 'a1' });
  ok(shBadTrack.isError === true && /khong phai track video|khong ton tai/.test(shBadTrack.content[0].text), 'add_shape vao track audio bi tu choi');
  const shBadKind = await call('add_shape', { kind: 'tam-giac', start: 0 });
  ok(shBadKind.isError === true, 'add_shape loai khong co bi schema chan');
  await fetch(`${BASE}/proposals/${sh.proposal_id}/accept`, { method: 'POST' });
  const shc = body(await call('project_get')).clips.find((c) => c.id === sh.clip_id);
  ok(shc && shc.src.type === 'shape' && shc.src.shape.kind === 'ring' && shc.src.shape.trim === 0.5 && shc.transform.x === 0.1, 'Sau khi duyet: clip hinh ring dung thong so');
  const kfOk = body(await call('set_keyframes', { clip_id: sh.clip_id, property: 'shape.trim', keys: [{ t: 0, value: 0 }, { t: 2, value: 1 }] }));
  ok(kfOk.ok, 'set_keyframes shape.trim (ve vien) hop le tren clip hinh');
  const kfBad = await call('set_keyframes', { clip_id: 'g1', property: 'fx.wipe.progress', keys: [{ t: 0, value: 0 }] });
  ok(kfBad.isError === true, 'set_keyframes fx.wipe.progress khi clip chua co wipe bi tu choi');
}

await client.close();
console.log(`\n${pass} dat, ${fail} that bai`);
process.exitCode = fail ? 1 : 0;
