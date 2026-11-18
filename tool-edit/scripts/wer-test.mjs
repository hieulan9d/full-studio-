// Do do chinh xac nhan dang giong noi (WER) tren clip CUA BAN, de biet tieng Viet that chay tot den dau.
// Dung:  node scripts/wer-test.mjs <file-media> <file-van-ban-dung.txt> [vi|en] [model]
// Can app dang chay (npm start). Van ban dung: go lai dung loi trong clip, khong can dau cau.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const [, , media, refFile, lang = 'vi', model = 'large-v3-turbo'] = process.argv;
if (!media || !refFile) {
  console.log('Dung: node scripts/wer-test.mjs <media> <van-ban-dung.txt> [vi|en] [model]');
  process.exit(2);
}
const BASE = `http://127.0.0.1:${process.env.TOOL_EDIT_PORT ?? 17480}`;
const call = async (m, p, b) => (await fetch(BASE + p, { method: m, headers: { 'Content-Type': 'application/json' }, body: b ? JSON.stringify(b) : undefined })).json();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const norm = (s) => s.normalize('NFC').toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean);
const strip = (w) => w.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');

const imp = await call('POST', '/media_import', { path: resolve(media) });
if (!imp.mediaId) throw new Error(JSON.stringify(imp));
for (const id of [imp.job_id, imp.audio_job_id].filter(Boolean)) while ((await call('GET', `/jobs/${id}`)).state === 'running') await sleep(300);
const tj = await call('POST', '/transcribe', { media_id: imp.mediaId, lang, model });
if (!tj.job_id) throw new Error(JSON.stringify(tj));
let j;
do { await sleep(500); j = await call('GET', `/jobs/${tj.job_id}`); } while (j.state === 'running');
if (j.state !== 'done') throw new Error('nhan dang that bai: ' + (j.error ?? j.state));
const hyp = (await call('GET', `/transcript?media_id=${imp.mediaId}`)).words.map((w) => w.w).join(' ');

const ref = norm(readFileSync(refFile, 'utf8'));
const h = norm(hyp);
const lev = (a, b) => {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j2 = 1; j2 <= b.length; j2++) d[0][j2] = j2;
  for (let i = 1; i <= a.length; i++) for (let k = 1; k <= b.length; k++) d[i][k] = Math.min(d[i - 1][k] + 1, d[i][k - 1] + 1, d[i - 1][k - 1] + (a[i - 1] === b[k - 1] ? 0 : 1));
  return d[a.length][b.length];
};
const wer = lev(ref, h) / ref.length;
const werNoTone = lev(ref.map(strip), h.map(strip)) / ref.length;
console.log(`Mo hinh ${model} · ${lang} · ${ref.length} tu dung`);
console.log(`WER (giu dau)      : ${(wer * 100).toFixed(1)}%`);
console.log(`WER (bo dau thanh) : ${(werNoTone * 100).toFixed(1)}%   <- neu thap hon nhieu: loi chu yeu la dau, sua bang tab Loi thoai`);
console.log(`\nNhan dang : ${hyp}\nDung      : ${ref.join(' ')}`);
