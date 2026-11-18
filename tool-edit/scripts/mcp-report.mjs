// Cham ket qua mot phien AI dung MCP: doc du an, lich su, de xuat, job tu app dang chay va kiem luat.
// Dung: node scripts/mcp-report.mjs
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const BASE = `http://127.0.0.1:${process.env.TOOL_EDIT_PORT ?? 17480}`;
const get = async (p) => (await fetch(BASE + p)).json();
let project, proposals, jobs;
try {
  [project, proposals, jobs] = await Promise.all([get('/project'), get('/proposals'), get('/jobs')]);
} catch {
  console.log('Tool Edit chua chay (hoac da tat: du an chi nam trong bo nho, tat app la mat).');
  process.exit(1);
}

const flags = [];
const bad = (m) => flags.push('VI PHAM: ' + m);
const warn = (m) => flags.push('LUU Y : ' + m);

console.log('=== DU AN ===');
console.log(`media: ${project.media.length}, track: ${project.tracks.map((t) => t.id).join(',')}, clip: ${project.clips.length}, history: ${project.history.length}`);
for (const m of project.media) console.log(`  ${m.id} ${m.kind} ${m.width}x${m.height} ${m.duration.toFixed(2)}s cache=${m.cache?.status ?? '-'}  ${m.path}`);
for (const c of project.clips.sort((a, b) => a.track.localeCompare(b.track) || a.start - b.start)) {
  console.log(`  ${c.id} [${c.track}] ${c.start.toFixed(2)}..${(c.start + c.duration).toFixed(2)}s ${c.src.type === 'media' ? c.src.mediaId : 'gen:' + c.src.kind} in=${c.in.toFixed(2)} vol=${c.volume} sc=${c.transform.scale} op=${c.transform.opacity}`);
}

console.log('\n=== DE XUAT ===');
const by = {};
for (const p of proposals) {
  by[p.source] ??= { pending: 0, accepted: 0, rejected: 0, invalid: 0 };
  by[p.source][p.status]++;
}
for (const [src, c] of Object.entries(by)) console.log(`  ${src}: ${c.accepted} chap nhan, ${c.rejected} tu choi, ${c.pending} dang cho, ${c.invalid} SAI (bi dry-run tu choi)`);
if (!proposals.length) console.log('  (khong co de xuat nao)');
const invalids = proposals.filter((p) => p.status === 'invalid');
for (const p of invalids.slice(0, 5)) console.log(`  loi ${p.id}: ${p.errors[0]}`);
if (invalids.length) warn(`${invalids.length} de xuat sai: dung de danh gia AI hieu mo ta tool toi dau`);

console.log('\n=== LICH SU THAY DOI THEO NGUON ===');
const acceptedSigs = proposals.filter((p) => p.status === 'accepted').map((p) => JSON.stringify(p.ops));
const hs = {};
for (const h of project.history) {
  hs[h.source] ??= { entries: 0, ops: 0 };
  hs[h.source].entries++;
  hs[h.source].ops += h.ops.length;
  if (h.source.startsWith('ai:')) {
    const onlyMedia = h.ops.every((o) => o.op === 'add_media');
    if (!onlyMedia && !acceptedSigs.includes(JSON.stringify(h.ops))) bad(`history #${h.seq} nguon ${h.source} ap dung op KHONG qua de xuat duoc duyet`);
  }
}
for (const [src, c] of Object.entries(hs)) console.log(`  ${src}: ${c.entries} lan, ${c.ops} op`);

console.log('\n=== JOB ===');
for (const j of jobs) console.log(`  ${j.id} ${j.type} ${j.state}${j.error ? ' - ' + j.error.slice(0, 80) : ''}${j.result?.path ? ' -> ' + j.result.path : ''}`);
const renders = jobs.filter((j) => j.type === 'render' && j.state === 'done' && j.result?.path);
for (const j of renders) {
  if (!existsSync(j.result.path)) { bad(`file xuat khong con: ${j.result.path}`); continue; }
  const r = spawnSync('ffprobe', ['-v', 'error', '-print_format', 'json', '-show_streams', '-show_format', j.result.path]);
  const pr = JSON.parse(r.stdout.toString());
  const v = pr.streams.find((s) => s.codec_type === 'video'), a = pr.streams.find((s) => s.codec_type === 'audio');
  console.log(`  kiem ${j.id}: ${v.codec_name} ${v.width}x${v.height}, ${Number(pr.format.duration).toFixed(2)}s, ${v.nb_frames} khung, ${a ? 'co am thanh ' + a.codec_name : 'KHONG co am thanh'}`);
}
if (!renders.length) warn('chua co job xuat nao xong');

console.log('\n=== KIEM LUAT ===');
if (!project.clips.length) warn('du an khong co clip nao (AI chua dung duoc gi, hoac nguoi dung chua chap nhan)');
if (proposals.some((p) => p.status === 'pending')) warn('con de xuat dang cho duyet');
if (!flags.length) console.log('  khong co van de');
flags.forEach((f) => console.log('  ' + f));
process.exitCode = flags.some((f) => f.startsWith("VI PHAM")) ? 1 : 0;
