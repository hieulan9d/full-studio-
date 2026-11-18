// Duyet de xuat cua AI tren terminal. CHI DUNG O CHE DO DEV: HTTP mac dinh tra 403 cho accept/reject;
// can chay app voi TOOL_EDIT_DEV_API=1. Khi dung that, duyet trong giao dien (tab "De xuat cua AI").
// Dung:  node scripts/duyet.mjs            duyet cac de xuat dang cho, hoi tung cai
//        node scripts/duyet.mjs --watch    cu chay, de xuat moi cua AI hien ra la hoi ngay
//        node scripts/duyet.mjs --accept-all   chap nhan het (chi dung de kiem thu)
import * as readline from 'node:readline/promises';

const BASE = `http://127.0.0.1:${process.env.TOOL_EDIT_PORT ?? 17480}`;
const watch = process.argv.includes('--watch');
const acceptAll = process.argv.includes('--accept-all');
// Terminal tuong tac: hoi tung cai bang readline. Dau vao qua ong dan (vd: echo n | node scripts/duyet.mjs): doc het stdin truoc, lay tung dong lam cau tra loi.
const interactive = !acceptAll && process.stdin.isTTY;
const rl = interactive ? readline.createInterface({ input: process.stdin, output: process.stdout }) : null;
let piped = null;
if (!acceptAll && !interactive) {
  const chunks = [];
  for await (const c of process.stdin) chunks.push(c);
  piped = Buffer.concat(chunks).toString().split(String.fromCharCode(10)).map((x) => x.replace(String.fromCharCode(13), '')).filter((x) => x.length);
}
const ask = async (q) => (rl ? rl.question(q) : (console.log(q + '(tu dong)'), piped?.shift() ?? 's'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const get = async (p) => (await fetch(BASE + p)).json();
const post = async (p) => {
  const r = await fetch(BASE + p, { method: 'POST' });
  return { status: r.status, data: await r.json() };
};

const t = (x) => (typeof x === 'number' ? +x.toFixed(3) + 's' : x);
function describe(o) {
  switch (o.op) {
    case 'add_track': return `them track ${o.track?.id} (${o.track?.kind})`;
    case 'add_clip': {
      const c = o.clip ?? {};
      const src = c.src?.type === 'media' ? `media ${c.src.mediaId}` : `sinh ${c.src?.kind}`;
      const tf = c.transform ? ` transform ${JSON.stringify(c.transform)}` : '';
      return `them clip ${c.id}: ${src}, track ${c.track}, timeline ${t(c.start)}..${t(c.start + c.duration)}, lay tu giay ${t(c.in ?? 0)} cua nguon, am luong ${c.volume ?? 1}${tf}`;
    }
    case 'remove_clip': return `xoa clip ${o.id}`;
    case 'set_clip': return `sua clip ${o.id}: ${JSON.stringify(o.patch)}`;
    case 'set_transform': return `bien doi clip ${o.id}: ${JSON.stringify(o.patch)}`;
    case 'split_clip': return `cat clip ${o.id} tai ${t(o.at)} (nua phai la ${o.newId})`;
    case 'ripple_delete': return `xoa clip ${o.id} va keo cac clip sau lui lai`;
    case 'add_media': return `them media ${o.media?.id}`;
    default: return JSON.stringify(o);
  }
}

const seen = new Set();
async function round() {
  let list;
  try {
    list = await get('/proposals');
  } catch {
    console.log('Tool Edit chua chay. Mo app bang: npm start');
    return false;
  }
  for (const p of list.filter((x) => x.status === 'pending' && !seen.has(x.id))) {
    seen.add(p.id);
    console.log(`\n--- De xuat ${p.id} cua ${p.source} (${p.createdAt}) ---`);
    if (p.note) console.log(`Ghi chu: ${p.note}`);
    p.ops.forEach((o, i) => console.log(`  ${i + 1}. ${describe(o)}`));
    let ans = 'y';
    if (!acceptAll) ans = (await ask('Chap nhan? [y]es / [n]o / [s]kip: ')).trim().toLowerCase();
    if (ans === 's') { seen.delete(p.id); continue; }
    if (ans === 'y' || ans === 'yes' || ans === '') {
      const r = await post(`/proposals/${p.id}/accept`);
      console.log(r.status === 200 ? '=> DA CHAP NHAN, du an da doi' : `=> khong ap dung duoc: ${JSON.stringify(r.data.errors ?? r.data)}`);
    } else {
      await post(`/proposals/${p.id}/reject`);
      console.log('=> DA TU CHOI');
    }
  }
  return true;
}

if (watch) {
  console.log('Dang cho de xuat tu AI... (Ctrl+C de thoat)');
  for (;;) {
    await round();
    await sleep(1500);
  }
} else {
  const up = await round();
  if (up && !acceptAll) console.log('\nXong. (Dung --watch de cho de xuat moi)');
  rl?.close();
}
