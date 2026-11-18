// MCP server (stdio) cho Tool Edit. Boc len HTTP noi bo cua app dang chay. Xem CHUC-NANG.md F-12, F-14.
// AI KHONG co tool ap dung truc tiep: chi `propose_ops`; nguoi duyet trong app. Khong co tool accept/reject/undo.
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { spawn } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { z } from 'zod';
import { EASE_NAMES, easeFromName } from '../core/anim';
import { PRESETS } from '../core/presets';
import { DEFAULT_TRANSFORM, nextId, type Op, type Project } from '../core/schema';
import { defaultText } from '../core/text';
import { srcToTimeline } from '../core/transcript';
import { personCutoutPlan } from '../core/behind';
import { BLEND_MODES, FX_NAMES, SHAPE_KINDS, defaultShape } from '../core/fx';
import { defaultGrade, mergeGrade, parseCube, type DeepPartialGrade } from '../core/grade';
import { SPEED_PRESETS, speedPresetKeys } from '../core/speed';

const BASE = `http://127.0.0.1:${process.env.TOOL_EDIT_PORT ?? 17480}`;
const SOURCE = process.env.TOOL_EDIT_AI_NAME ? `ai:${process.env.TOOL_EDIT_AI_NAME}` : 'ai:mcp';

async function http(method: string, p: string, body?: unknown): Promise<{ status: number; json?: any; buf?: Buffer }> {
  let r: Response;
  try {
    r = await fetch(BASE + p, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  } catch {
    throw new Error('Tool Edit chua chay (khong ket noi duoc ' + BASE + '). Nho nguoi dung mo app: `npm start` trong thu muc tool-edit.');
  }
  const ct = r.headers.get('content-type') ?? '';
  if (ct.includes('json')) return { status: r.status, json: await r.json() };
  return { status: r.status, buf: Buffer.from(await r.arrayBuffer()) };
}

const text = (o: unknown) => ({ content: [{ type: 'text' as const, text: typeof o === 'string' ? o : JSON.stringify(o, null, 2) }] });
const fail = (msg: string) => ({ isError: true, content: [{ type: 'text' as const, text: msg }] });
const wrap = (fn: (a: any) => Promise<any>) => async (a: any) => {
  try {
    return await fn(a);
  } catch (e) {
    return fail(String((e as Error).message ?? e));
  }
};

const server = new McpServer({ name: 'tool-edit', version: '0.1.0' });

server.registerTool(
  'app_status',
  { description: 'Trang thai Tool Edit: GPU, renderer san sang chua, so clip/media, job dang chay, so de xuat cho duyet.', inputSchema: {} },
  wrap(async () => text((await http('GET', '/status')).json)),
);

server.registerTool(
  'project_get',
  {
    description: 'Doc du an hien tai: fps, kich thuoc, media (kem cache.status), tracks, clips, 5 muc lich su gan nhat. Doc truoc khi sua. Du an lon (hang tram clip): dung summary=true (gon: tong quan, so clip moi track, media, canh bao) hoac track_id / from / to de chi lay clip trong mot track hoac mot khoang thoi gian (giay). Truong warnings canh bao font thieu dau tieng Viet va clip tran khung.',
    inputSchema: {
      summary: z.boolean().describe('true = tra ban tom tat gon (khong liet ke tung clip)').default(false),
      track_id: z.string().describe('Chi lay clip cua track nay').optional(),
      from: z.number().describe('Chi lay clip giao voi khoang thoi gian bat dau tu day (giay)').optional(),
      to: z.number().describe('... den day (giay)').optional(),
    },
  },
  wrap(async ({ summary, track_id, from, to }) => {
    const p = (await http('GET', '/project')).json;
    const { history, ...rest } = p;
    const warnings = (await http('GET', '/warnings')).json ?? [];
    type C = { id: string; track: string; start: number; duration: number; src?: { type?: string; mediaId?: string }; tag?: string; disabled?: boolean };
    const clips: C[] = rest.clips ?? [];
    if (summary) {
      const end = clips.reduce((m, c) => Math.max(m, c.start + c.duration), 0);
      return text({
        fps: rest.fps, width: rest.width, height: rest.height, duration_s: Math.round(end * 100) / 100,
        tracks: (rest.tracks ?? []).map((t: { id: string; kind: string; name: string }) => {
          const cs = clips.filter((c) => c.track === t.id);
          return { id: t.id, kind: t.kind, name: t.name, clips: cs.length, from: cs.length ? Math.min(...cs.map((c) => c.start)) : null, to: cs.length ? Math.max(...cs.map((c) => c.start + c.duration)) : null };
        }),
        media: (rest.media ?? []).map((m: { id: string; name?: string; path?: string; kind?: string; duration?: number; cache?: { status?: string } }) => ({ id: m.id, name: m.name ?? String(m.path ?? '').split(/[\/]/).pop(), kind: m.kind, duration: m.duration, cache: m.cache?.status })),
        clips_by_kind: clips.reduce((a: Record<string, number>, c) => { const k = c.tag?.split(':')[0] ?? c.src?.type ?? 'clip'; a[k] = (a[k] ?? 0) + 1; return a; }, {}),
        disabled_clips: clips.filter((c) => c.disabled).length,
        history_total: history.length, history_last: history.slice(-3), warnings,
        hint: 'Muon xem tung clip: project_get voi track_id hoac from/to.',
      });
    }
    if (track_id || from !== undefined || to !== undefined) {
      const lo = from ?? -Infinity, hi = to ?? Infinity;
      rest.clips = clips.filter((c) => (!track_id || c.track === track_id) && c.start + c.duration > lo && c.start < hi);
      return text({ ...rest, filtered: { track_id, from, to, shown: rest.clips.length, of: clips.length }, history_total: history.length, warnings });
    }
    return text({ ...rest, history_total: history.length, history_last: history.slice(-5), warnings });
  }),
);

server.registerTool(
  'media_import',
  {
    description: 'Nhap mot file video/am thanh vao du an (duong dan tuyet doi tren may). Tra ve mediaId va job_id cua tac vu tao cache; hoi job_status cho den khi state=done roi moi dung media trong clip. Nhap lai cung file tra ve mediaId cu.',
    inputSchema: { path: z.string().describe('Duong dan tuyet doi toi file, vd D:\\\\video\\\\a.mp4') },
  },
  wrap(async ({ path: p }) => {
    const r = await http('POST', '/media_import', { path: p, source: SOURCE });
    if (r.status !== 200) return fail(r.json?.error ?? JSON.stringify(r.json));
    return text(r.json);
  }),
);

server.registerTool(
  'job_status',
  { description: 'Trang thai mot tac vu nen (cache media, render): state running|done|error|cancelled, progress 0..1, result hoac error.', inputSchema: { job_id: z.string().describe('vd job3') } },
  wrap(async ({ job_id }) => {
    const r = await http('GET', `/jobs/${encodeURIComponent(job_id)}`);
    return r.status === 200 ? text(r.json) : fail(r.json?.error ?? 'khong co job nay');
  }),
);

const OPS_HELP = `Moi phan tu la mot object co truong "op". Cac op:
- {"op":"add_track","track":{"id":"v2","kind":"video"|"audio","name":"Video 2"}}  (track dau danh sach = lop duoi cung)
- {"op":"remove_track","id":"v3"}  (chi go track da trong)
- {"op":"add_clip","clip":{"id","track","src":{"type":"media","mediaId":"m1"},"start":giay,"duration":giay,"in":giay trong nguon,"volume":1,"transform":{"x":0,"y":0,"scale":1,"rotation":0,"opacity":1,"fit":"contain"|"cover"}}}
- {"op":"remove_clip","id":"c1"}
- {"op":"set_clip","id":"c1","patch":{"start","duration","in","track","volume","disabled":true|false (vo hieu hoa clip: khong hien/khong phat/khong xuat)}}
- {"op":"group_clips","ids":["c1","c2"],"group":"g1"}  (ghep clip: chon/keo/xoa cung nhau)  va  {"op":"ungroup","group":"g1"}
- {"op":"set_transform","id":"c1","patch":{"x","y","scale","rotation","opacity","fit"}}  (x,y theo ty le khung; 0 = giua)
- {"op":"split_clip","id":"c1","at":giay tren timeline,"newId":"c2"}
- {"op":"ripple_delete","id":"c1"}  (xoa va keo cac clip sau tren cung track lui lai)
- {"op":"set_text","id":"c1","patch":{"content","font","size","weight","italic","align","lineHeight","letterSpacing","maxWidth","fill":{"type":"solid|linear|radial|angular","color","stops":[{"pos","color"}],"angle","offset","cx","cy","radius"},"stroke":{"color","width","over"},"shadow":{"color","opacity","blur","x","y"},"glow":{"color","radius","strength"},"animator":{"preset","unit","duration","stagger","delay","distance","blur","out","color"}}}  (clip chu; chi truong can doi; mau dang #rrggbb)
- {"op":"set_keyframe","id":"c1","prop":"transform.opacity","t":giay tu DAU clip,"v":gia tri,"ease_preset":"snap"}  hoac "ease":{"kind":"bezier","x1","y1","x2","y2"}
- {"op":"set_keyframes","id":"c1","prop":"text.size","keys":[{"t","v","ease":{...}}]}  (thay ca track; keys rong = xoa)
- {"op":"remove_keyframe","id":"c1","prop":"transform.x","t":0.5}
- {"op":"apply_preset","id":"c1","preset":"keyword-gradient"}  (clip chu; xem list_presets)
Clip chu: {"op":"add_clip","clip":{"id","track":"v1","src":{"type":"text","text":<TextSpec day du>},"start","duration","in":0,"volume":1,"transform":{},"keyframes":{}}} - de don gian dung tool add_text.
Thuoc tinh keyframe duoc: transform.x|y|scale|rotation|opacity, volume (clip media), text.size|letterSpacing|lineHeight|fill.angle|fill.offset|stroke.width|shadow.opacity|blur|x|y|glow.strength|radius. Thoi gian keyframe tinh tu DAU clip.
- {"op":"generate_captions","id":"c1","opts":{"style":"karaoke|word-pop|line-fade","maxWords":4,"maxChars":26,"font","size","color","highlight","y"}}  (phu de tung tu tu loi thoai cua clip media; thay phu de cu cua clip do)
- {"op":"remove_ranges","id":"c1","ranges":[{"s":giay trong NGUON,"e":giay}]}  (cat cac doan khoi clip va keo lien; phu de da sinh tu tao lai)
- {"op":"duck_clip","id":"mu","opts":{"amountDb":-14,"attack":0.2,"release":0.45}}  (ha am luong clip nhac duoi tieng noi)
- {"op":"edit_word","mediaId":"m1","index":12,"text":"..."}  (sua mot tu trong loi thoai)
- {"op":"set_speed","id":"c1","speed":2}  (toc do co dinh 0.05..16; xoa speed ramp neu co) ; speed ramp = set_keyframes prop "speed" (giay tu dau clip, v = toc do); doan nguon tieu thu = tich phan toc do
- {"op":"set_clip_matte","id":"c1","matte":{"lo":0,"hi":1,"feather":0}|null}  (chi hien nguoi; media phai da tach nen). set_media_matte do app tao sau khi tach nen.
- {"op":"set_grade","id":"c1","grade":{"exposure":0.3,"saturation":1.1,"lift":{"m":0.02},"curves":{"master":[[0,0],[0.5,0.45],[1,1]]},"lut":{"path":"D:/x.cube","name":"x","mix":1}}|null}  (chinh mau clip video/anh; gop tung phan; null = go). Nen dung grade_set/apply_lut/match_color.
- {"op":"set_fx","id":"c1","fx":{"blur":{"radius":20},"glow":{"radius":30,"intensity":1,"color":"#5ff4ff"},"round":null}}|null  (hieu ung lop: crop, blur, glow, shadow, round, vignette, wipe; gop; ten:null go) ; {"op":"set_blend","id":"c1","blend":"screen"}; clip hinh: src {"type":"shape","shape":{"kind":"rect|ellipse|ring|star","w","h","fill":"#rrggbb","fillOpacity","stroke":{"color","width"},"radius","trim"}} va {"op":"set_shape","id","patch"}. Nen dung set_fx/set_blend/add_shape.
- {"op":"add_markers","markers":[{"t":giay,"kind":"beat|user|sfx","label"}]} , {"op":"clear_markers","kind"}
Luat: clip tren cung track khong duoc chong nhau; in+duration khong vuot do dai media; chi dung media da co cache.status=ready.`;

server.registerTool(
  'propose_ops',
  {
    description: 'Thay doi du an. Mac dinh app TU AP DUNG ngay neu hop le (nguoi dung khong can duyet; ket qua co applied:true, hoan tac bang Ctrl+Z trong app); neu nguoi dung tat tu ap dung thi thanh de xuat cho ho Chap nhan. Lenh duoc kiem tra thu (dry-run) va bao loi ngay neu sai. ' + OPS_HELP,
    inputSchema: {
      ops: z.array(z.object({ op: z.string() }).passthrough()).min(1).describe('Danh sach op (xem mo ta tool)'),
      note: z.string().describe('Mot cau cho nguoi dung biet de xuat nay lam gi va vi sao').default(''),
    },
  },
  wrap(async ({ ops, note }) => {
    const r = await http('POST', '/propose', { ops, note, source: SOURCE });
    if (r.status === 200) return text({ ...r.json, next: r.json && (r.json as { applied?: boolean }).applied ? 'Da ap dung vao du an (khong can duyet). Dung preview_frame de kiem tra.' : 'Nguoi dung can bam Chap nhan trong app. Dung proposals_list de xem da duoc duyet chua.' });
    return fail(`De xuat khong hop le, chua tao: ${JSON.stringify(r.json?.errors ?? r.json)}`);
  }),
);

server.registerTool(
  'proposals_list',
  { description: 'Danh sach de xuat va trang thai (pending|accepted|rejected). Dung de biet nguoi dung da duyet chua.', inputSchema: {} },
  wrap(async () => text((await http('GET', '/proposals')).json)),
);

server.registerTool(
  'preview_frame',
  {
    description: 'Xem anh mot khung cua du an tai thoi diem t (giay) tren timeline. Dung de kiem tra ket qua bang mat. scale 0.05..1 (mac dinh 0.3). aspect "9:16" hoac "16:9" de xem theo ti le xuat. proposal_id: xem khung NHU THE de xuat do da duoc chap nhan (khong doi du an).',
    inputSchema: {
      t: z.number().min(0).describe('giay'),
      scale: z.number().min(0.05).max(1).default(0.3),
      aspect: z.enum(['9:16', '16:9']).optional(),
      proposal_id: z.string().optional().describe('vd p3: xem truoc ket qua cua de xuat nay'),
    },
  },
  wrap(async ({ t, scale, aspect, proposal_id }) => {
    const q = `t=${t}&scale=${scale ?? 0.3}${aspect ? '&aspect=' + encodeURIComponent(aspect) : ''}${proposal_id ? '&proposal=' + encodeURIComponent(proposal_id) : ''}`;
    const r = await http('GET', `/preview_frame?${q}`);
    if (r.status !== 200 || !r.buf) return fail(r.json?.error ?? 'khong render duoc khung');
    return { content: [{ type: 'image' as const, data: r.buf.toString('base64'), mimeType: 'image/png' }, { type: 'text' as const, text: `Khung t=${t}s${proposal_id ? ' (xem truoc de xuat ' + proposal_id + ')' : ''}` }] };
  }),
);

server.registerTool(
  'contact_sheet',
  {
    description: 'Xem nhieu khung cung luc, xep thanh mot dai ngang (nhan dien nhanh bo cuc theo thoi gian). Chon "times" cu the hoac from/to/count.',
    inputSchema: {
      times: z.array(z.number().min(0)).max(12).optional().describe('cac moc giay'),
      from: z.number().min(0).optional(),
      to: z.number().min(0).optional(),
      count: z.number().int().min(2).max(12).default(6),
      scale: z.number().min(0.05).max(0.5).default(0.15),
    },
  },
  wrap(async ({ times, from, to, count, scale }) => {
    let ts: number[] = times ?? [];
    if (!ts.length) {
      const p = (await http('GET', '/project')).json;
      const end = p.clips.reduce((m: number, c: any) => Math.max(m, c.start + c.duration), 0);
      const a = from ?? 0,
        b = to ?? end;
      ts = Array.from({ length: count }, (_, i) => +(a + ((b - a) * i) / Math.max(1, count - 1) - (i === count - 1 ? 1 / p.fps : 0)).toFixed(3));
    }
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tool-edit-cs-'));
    try {
      for (let i = 0; i < ts.length; i++) {
        const r = await http('GET', `/preview_frame?t=${Math.max(0, ts[i])}&scale=${scale ?? 0.15}`);
        if (r.status !== 200 || !r.buf) return fail(`khung t=${ts[i]}: ${r.json?.error ?? 'loi'}`);
        fs.writeFileSync(path.join(dir, `f${String(i).padStart(2, '0')}.png`), r.buf);
      }
      const out = path.join(dir, 'sheet.png');
      await new Promise<void>((res, rej) => {
        const p = spawn(process.env.FFMPEG_PATH ?? 'ffmpeg', ['-v', 'error', '-y', '-framerate', '1', '-i', path.join(dir, 'f%02d.png'), '-vf', `tile=${ts.length}x1:padding=4:color=gray`, '-frames:v', '1', out]);
        let err = '';
        p.stderr.on('data', (d) => (err += d));
        p.on('close', (c) => (c === 0 ? res() : rej(new Error('ffmpeg ghep anh loi: ' + err))));
      });
      return { content: [{ type: 'image' as const, data: fs.readFileSync(out).toString('base64'), mimeType: 'image/png' }, { type: 'text' as const, text: `Cac khung (giay): ${ts.join(', ')}` }] };
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }),
);

server.registerTool(
  'list_presets',
  { description: 'Danh sach preset chu/chuyen dong (lay so do tu kit talking-head): id, ten, mo ta, nguon so do, noi dung va do dai mac dinh. Dung id voi add_text hoac apply_preset.', inputSchema: {} },
  wrap(async () => text((await http('GET', '/presets')).json)),
);

server.registerTool(
  'list_fonts',
  {
    description: 'Danh sach ho font cai trong may, kem co du glyph tieng Viet co dau hay khong (doc bang ky tu cua tung file font). Chon font vietnamese=true khi chu la tieng Viet. Neu app dang quet lan dau, scanning=true: thu lai sau it giay.',
    inputSchema: { vietnamese: z.boolean().default(true).describe('chi liet ke font du dau tieng Viet'), query: z.string().optional().describe('loc theo ten') },
  },
  wrap(async ({ vietnamese, query }) => {
    const r = await http('GET', `/fonts?vietnamese=${vietnamese === false ? 0 : 1}${query ? '&q=' + encodeURIComponent(query) : ''}`);
    return r.status === 200 ? text(r.json) : fail(r.json?.error ?? 'khong lay duoc danh sach font');
  }),
);

const HEXC = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'mau dang #rrggbb');

server.registerTool(
  'add_text',
  {
    description: 'DE XUAT them mot clip chu (nguoi dung duyet). Co the chon preset (list_presets) roi ghi de font/co/mau. Neu khong chi track thi tu chon track video con trong cho do hoac tao track moi. Chu tieng Viet: dung font du dau (list_fonts).',
    inputSchema: {
      text: z.string().min(1).describe('noi dung chu (\\n de xuong dong)'),
      start: z.number().min(0).describe('giay tren timeline'),
      duration: z.number().positive().default(3),
      preset: z.string().optional().describe('id preset, vd keyword-gradient'),
      font: z.string().optional(),
      size: z.number().positive().optional().describe('px @ canh ngan 1080'),
      color: HEXC.optional().describe('mau chu don sac (bo qua neu preset dung gradient va ban muon giu)'),
      track: z.string().optional().describe('id track video, vd v1'),
      anchor_h: z.enum(['left', 'center', 'right']).optional(),
      anchor_v: z.enum(['top', 'middle', 'bottom']).optional(),
      x: z.number().optional().describe('dich ngang tu diem neo, ty le chieu rong khung'),
      y: z.number().optional().describe('dich doc tu diem neo, ty le chieu cao khung'),
      note: z.string().default('').describe('mot cau cho nguoi dung biet de xuat nay lam gi'),
    },
  },
  wrap(async (a) => {
    const p = (await http('GET', '/project')).json as Project;
    const ops: Op[] = [];
    let track = a.track as string | undefined;
    if (track) {
      const t = p.tracks.find((x) => x.id === track);
      if (!t || t.kind !== 'video') return fail(`track "${track}" khong ton tai hoac khong phai track video`);
    } else {
      const free = (id: string) => !p.clips.some((c) => c.track === id && a.start < c.start + c.duration - 1e-6 && c.start < a.start + a.duration - 1e-6);
      track = [...p.tracks.filter((t) => t.kind === 'video')].reverse().find((t) => free(t.id))?.id;
      if (!track) {
        track = nextId(p, 'v');
        ops.push({ op: 'add_track', track: { id: track, kind: 'video', name: `Video ${p.tracks.filter((t) => t.kind === 'video').length + 1}` } });
      }
    }
    const id = nextId(p, 'c');
    ops.push({ op: 'add_clip', clip: { id, track, src: { type: 'text', text: { ...defaultText(), content: a.text } }, start: a.start, duration: a.duration, in: 0, volume: 1, transform: { ...DEFAULT_TRANSFORM }, keyframes: {} } });
    if (a.preset) ops.push({ op: 'apply_preset', id, preset: a.preset });
    const patch: Record<string, unknown> = {};
    if (a.font) patch.font = a.font;
    if (a.size) patch.size = a.size;
    if (a.color) patch.fill = { type: 'solid', color: a.color };
    if (Object.keys(patch).length) ops.push({ op: 'set_text', id, patch: patch as never });
    const tf: Record<string, unknown> = {};
    if (a.anchor_h) tf.anchorH = a.anchor_h;
    if (a.anchor_v) tf.anchorV = a.anchor_v;
    if (a.x !== undefined) tf.x = a.x;
    if (a.y !== undefined) tf.y = a.y;
    if (Object.keys(tf).length) ops.push({ op: 'set_transform', id, patch: tf as never });
    const r = await http('POST', '/propose', { ops, note: a.note || `Them chu "${a.text.slice(0, 30)}"`, source: SOURCE });
    if (r.status !== 200) return fail(`De xuat khong hop le, chua tao: ${JSON.stringify(r.json?.errors ?? r.json)}`);
    return text({ ...r.json, clip_id: id, track, next: 'Nguoi dung can bam Chap nhan trong app (tab "De xuat cua AI").' });
  }),
);

server.registerTool(
  'set_keyframes',
  {
    description: 'DE XUAT thay toan bo track keyframe cua mot thuoc tinh tren mot clip (nguoi dung duyet). Thoi gian t tinh tu DAU clip. Moi keyframe co the chon ease (duong cong toi keyframe sau) bang ten hoac bezier. keys rong = xoa het keyframe cua thuoc tinh.',
    inputSchema: {
      clip_id: z.string(),
      property: z.string().describe('vd transform.opacity, transform.scale, transform.x, text.size, text.fill.offset, volume'),
      keys: z.array(z.object({ t: z.number().min(0), value: z.number(), ease: z.enum(EASE_NAMES as [string, ...string[]]).optional().describe('mac dinh ease-in-out'), bezier: z.array(z.number()).length(4).optional().describe('[x1,y1,x2,y2], x trong 0..1; uu tien hon ease') })),
      note: z.string().default(''),
    },
  },
  wrap(async ({ clip_id, property, keys, note }) => {
    const ks = keys.map((k: any) => ({ t: k.t, v: k.value, ease: k.bezier ? { kind: 'bezier' as const, x1: k.bezier[0], y1: k.bezier[1], x2: k.bezier[2], y2: k.bezier[3] } : easeFromName(k.ease ?? 'ease-in-out')! }));
    const r = await http('POST', '/propose', { ops: [{ op: 'set_keyframes', id: clip_id, prop: property, keys: ks }], note: note || `Keyframe ${property} cho ${clip_id}`, source: SOURCE });
    if (r.status !== 200) return fail(`De xuat khong hop le, chua tao: ${JSON.stringify(r.json?.errors ?? r.json)}`);
    return text({ ...r.json, next: 'Nguoi dung can bam Chap nhan trong app.' });
  }),
);

server.registerTool(
  'apply_preset',
  {
    description: 'DE XUAT ap dung mot preset (list_presets) len clip chu: gop kieu chu va THAY cac track keyframe ma preset dinh nghia (vd ti le, do duc).',
    inputSchema: { clip_id: z.string(), preset: z.enum(PRESETS.map((x) => x.id) as [string, ...string[]]), note: z.string().default('') },
  },
  wrap(async ({ clip_id, preset, note }) => {
    const r = await http('POST', '/propose', { ops: [{ op: 'apply_preset', id: clip_id, preset }], note: note || `Ap dung preset ${preset} cho ${clip_id}`, source: SOURCE });
    if (r.status !== 200) return fail(`De xuat khong hop le, chua tao: ${JSON.stringify(r.json?.errors ?? r.json)}`);
    return text({ ...r.json, next: 'Nguoi dung can bam Chap nhan trong app.' });
  }),
);

server.registerTool(
  'transcribe',
  {
    description: 'Nhan dang giong noi TUNG TU (whisper, chay GPU o may nguoi dung, rat nhanh) cho mot media co tieng. Chay nen: tra job_id, hoi job_status. Ket qua luu vao media (xem get_transcript). KHONG tu tai mo hinh: neu mo hinh chua co trong may se bao loi MODEL_MISSING (can nguoi dung dong y tai). Tieng Viet: language="vi".',
    inputSchema: { media_id: z.string(), language: z.string().default('vi').describe('vi | en | auto'), model: z.string().default('large-v3-turbo').describe('large-v3-turbo | medium | small (chi cac mo hinh da co)'), prompt: z.string().optional().describe('ten rieng / thuat ngu de nhan dang dung chinh ta') },
  },
  wrap(async ({ media_id, language, model, prompt }) => {
    const r = await http('POST', '/transcribe', { media_id, lang: language, model, prompt });
    return r.status === 200 ? text(r.json) : fail(r.json?.error ?? JSON.stringify(r.json));
  }),
);

server.registerTool(
  'get_transcript',
  { description: 'Doc loi thoai cua media: van ban va tung tu kem moc thoi gian (giay trong NGUON) va chi so tu. Dung chi so tu cho cut_words / fix_transcript.', inputSchema: { media_id: z.string(), from: z.number().optional().describe('giay nguon bat dau'), to: z.number().optional() } },
  wrap(async ({ media_id, from, to }) => {
    const r = await http('GET', `/transcript?media_id=${encodeURIComponent(media_id)}${from !== undefined ? '&from=' + from : ''}${to !== undefined ? '&to=' + to : ''}`);
    return r.status === 200 ? text(r.json) : fail(r.json?.error ?? 'khong co loi thoai');
  }),
);

server.registerTool(
  'fix_transcript',
  { description: 'DE XUAT sua chinh ta cac tu nhan dang sai (dung ngu canh de sua). Moi sua: chi so tu (tu get_transcript) va chu dung. Sau khi duyet nen tao lai phu de.', inputSchema: { media_id: z.string(), edits: z.array(z.object({ index: z.number().int().min(0), text: z.string().min(1).max(80) })).min(1).max(200), note: z.string().default('') } },
  wrap(async ({ media_id, edits, note }) => {
    const r = await http('POST', '/propose', { ops: edits.map((e: any) => ({ op: 'edit_word', mediaId: media_id, index: e.index, text: e.text })), note: note || `Sua ${edits.length} tu trong loi thoai`, source: SOURCE });
    return r.status === 200 ? text({ ...r.json, next: 'Nguoi dung can duyet trong app.' }) : fail(`De xuat khong hop le: ${JSON.stringify(r.json?.errors ?? r.json)}`);
  }),
);

server.registerTool(
  'generate_captions',
  {
    description: 'DE XUAT tao phu de tung tu tu loi thoai cua mot clip media (phai transcribe truoc). Moc vao cua tung tu khop dung loi noi. Kieu: karaoke (tu dang noi sang len), word-pop (moi tu truot len), line-fade (ca dong mo dan). Thay phu de cu cua clip. Chu tieng Viet: dung font du dau (list_fonts).',
    inputSchema: {
      clip_id: z.string(),
      style: z.enum(['karaoke', 'word-pop', 'line-fade']).default('karaoke'),
      max_words: z.number().int().min(1).max(10).default(4),
      max_chars: z.number().int().min(8).max(60).default(26),
      font: z.string().optional(),
      size: z.number().positive().optional(),
      color: HEXC.optional(),
      highlight: HEXC.optional().describe('mau tu dang noi (karaoke)'),
      y: z.number().optional().describe('dich doc tu day khung (ty le chieu cao, mac dinh -0.2)'),
      note: z.string().default(''),
    },
  },
  wrap(async (a) => {
    const opts = { style: a.style, maxWords: a.max_words, maxChars: a.max_chars, font: a.font, size: a.size, color: a.color, highlight: a.highlight, y: a.y };
    const r = await http('POST', '/propose', { ops: [{ op: 'generate_captions', id: a.clip_id, opts }], note: a.note || `Phu de ${a.style} cho ${a.clip_id}`, source: SOURCE });
    return r.status === 200 ? text({ ...r.json, next: 'Nguoi dung can duyet trong app (xem thu truoc khi chap nhan).' }) : fail(`De xuat khong hop le: ${JSON.stringify(r.json?.errors ?? r.json)}`);
  }),
);

server.registerTool(
  'cut_silences',
  {
    description: 'DE XUAT cat cac khoang im lang khoi mot clip noi (keo lien, phu de tu tao lai). Tim khoang lang theo loi thoai (hoac am thanh neu chua co loi thoai). Tra ve cac khoang va tong thoi gian se cat; xem preview truoc khi nguoi dung duyet.',
    inputSchema: { clip_id: z.string(), min_silence: z.number().min(0.2).max(10).default(0.6).describe('giay: chi cat khoang lang dai hon'), keep: z.number().min(0).max(1).default(0.12).describe('giay giu lai o moi dau khoang lang de tho tu nhien'), source: z.enum(['auto', 'audio']).default('auto'), note: z.string().default('') },
  },
  wrap(async ({ clip_id, min_silence, keep, source, note }) => {
    const sl = await http('GET', `/silences?clip_id=${encodeURIComponent(clip_id)}&min=${min_silence}&keep=${keep}&source=${source}`);
    if (sl.status !== 200) return fail(sl.json?.error ?? 'khong tim duoc khoang lang');
    if (!sl.json.count) return text({ ok: true, count: 0, message: 'Khong co khoang lang nao dai hon nguong.' });
    const r = await http('POST', '/propose', { ops: [{ op: 'remove_ranges', id: clip_id, ranges: sl.json.ranges }], note: note || `Cat ${sl.json.count} khoang lang (${sl.json.total_seconds}s)`, source: SOURCE });
    return r.status === 200 ? text({ ...r.json, silences: sl.json.ranges, total_seconds: sl.json.total_seconds, detected_from: sl.json.source, next: 'Nguoi dung can duyet trong app.' }) : fail(`De xuat khong hop le: ${JSON.stringify(r.json?.errors ?? r.json)}`);
  }),
);

server.registerTool(
  'cut_words',
  { description: 'DE XUAT cat doan loi thoai tu tu so `from_word` den `to_word` (chi so tu get_transcript, ca hai deu bi cat) khoi clip: "xoa chu = xoa doan", keo lien, phu de tu tao lai.', inputSchema: { clip_id: z.string(), media_id: z.string(), from_word: z.number().int().min(0), to_word: z.number().int().min(0), note: z.string().default('') } },
  wrap(async ({ clip_id, media_id, from_word, to_word, note }) => {
    const tr = await http('GET', `/transcript?media_id=${encodeURIComponent(media_id)}`);
    if (tr.status !== 200) return fail(tr.json?.error ?? 'khong co loi thoai');
    const ws = tr.json.words as { i: number; s: number; e: number; w: string }[];
    const a = ws.find((w) => w.i === from_word),
      b = ws.find((w) => w.i === to_word);
    if (!a || !b || to_word < from_word) return fail(`chi so tu khong hop le (co ${tr.json.total_words} tu)`);
    const r = await http('POST', '/propose', { ops: [{ op: 'remove_ranges', id: clip_id, ranges: [{ s: a.s, e: b.e }] }], note: note || `Cat "${ws.filter((w) => w.i >= from_word && w.i <= to_word).map((w) => w.w).join(' ').slice(0, 50)}"`, source: SOURCE });
    return r.status === 200 ? text({ ...r.json, range: { s: a.s, e: b.e }, next: 'Nguoi dung can duyet trong app.' }) : fail(`De xuat khong hop le: ${JSON.stringify(r.json?.errors ?? r.json)}`);
  }),
);

server.registerTool(
  'list_library',
  { description: 'Kho SFX va nhac DA DUYET (tu kit): ten, loai (sfx|music), tag, thoi luong, BPM (nhac). Dung tag voi suggest_sfx. Nguoi dung tung che SFX do AI tu dat: chi dung SFX trong kho nay va de nguoi dung duyet.', inputSchema: { kind: z.enum(['sfx', 'music']).optional(), tag: z.string().optional(), query: z.string().optional() } },
  wrap(async ({ kind, tag, query }) => {
    const r = await http('GET', `/library?${kind ? 'kind=' + kind + '&' : ''}${tag ? 'tag=' + encodeURIComponent(tag) + '&' : ''}${query ? 'q=' + encodeURIComponent(query) : ''}`);
    return r.status === 200 ? text({ ...r.json, items: r.json.items.map((i: any) => ({ name: i.name, kind: i.kind, tags: i.tags, duration: i.duration, bpm: i.bpm })) }) : fail(r.json?.error ?? 'kho chua san sang');
  }),
);

server.registerTool(
  'suggest_sfx',
  {
    description: 'DE XUAT SFX theo su kien: cat canh giua cac clip lien nhau (event=cut), clip chu bat dau (text), marker/nhip (marker|beat). Moi quy tac: event + tag trong kho (list_library) + am luong. Tao MOT de xuat; nguoi dung duyet TUNG SFX (bo tick cai khong thich). Tra ve danh sach SFX se dat kem ly do.',
    inputSchema: { rules: z.array(z.object({ event: z.enum(['cut', 'text', 'marker', 'beat']), tag: z.string(), volume: z.number().min(0).max(2).optional(), offset: z.number().min(-1).max(1).optional(), min_gap: z.number().min(0).optional(), max: z.number().int().min(1).max(200).optional() })).min(1).max(6), note: z.string().default('') },
  },
  wrap(async ({ rules, note }) => {
    const r = await http('POST', '/suggest_sfx', { rules, source: SOURCE, note: note || undefined });
    if (r.status !== 200) return fail(r.json?.error ? `${r.json.error}${r.json.missing?.length ? ' (thieu tag: ' + r.json.missing.join(', ') + ')' : ''}` : `De xuat khong hop le: ${JSON.stringify(r.json?.errors)}`);
    return text({ ...r.json, next: 'Nguoi dung duyet tung SFX trong app (tab De xuat).' });
  }),
);

server.registerTool(
  'duck_music',
  { description: 'DE XUAT ha am luong clip nhac duoi tieng noi (dua tren loi thoai cac clip khac tren timeline): tao keyframe am luong, sua duoc sau. Can transcribe truoc.', inputSchema: { clip_id: z.string(), amount_db: z.number().min(-40).max(-3).default(-14), attack: z.number().min(0.02).max(2).default(0.2), release: z.number().min(0.05).max(3).default(0.45), note: z.string().default('') } },
  wrap(async ({ clip_id, amount_db, attack, release, note }) => {
    const r = await http('POST', '/propose', { ops: [{ op: 'duck_clip', id: clip_id, opts: { amountDb: amount_db, attack, release } }], note: note || `Duck nhac ${amount_db} dB duoi loi noi`, source: SOURCE });
    return r.status === 200 ? text({ ...r.json, next: 'Nguoi dung can duyet trong app.' }) : fail(`De xuat khong hop le: ${JSON.stringify(r.json?.errors ?? r.json)}`);
  }),
);

server.registerTool(
  'detect_beats',
  { description: 'Phan tich nhip (BPM + luoi nhip) cua mot media nhac. Chay nen, tra job_id. Ket qua luu o media (beats). Dung beat_markers de dat marker nhip len timeline.', inputSchema: { media_id: z.string() } },
  wrap(async ({ media_id }) => {
    const r = await http('POST', '/beats', { media_id });
    return r.status === 200 ? text(r.json) : fail(r.json?.error ?? JSON.stringify(r.json));
  }),
);

server.registerTool(
  'beat_markers',
  { description: 'DE XUAT dat marker nhip len timeline theo nhip cua mot clip nhac (da detect_beats). Marker la diem bam (snap) va co the dung cho suggest_sfx (event=beat). every = moi N nhip dat 1 marker.', inputSchema: { clip_id: z.string(), every: z.number().int().min(1).max(16).default(1), note: z.string().default('') } },
  wrap(async ({ clip_id, every, note }) => {
    const p = (await http('GET', '/project')).json as Project;
    const c = p.clips.find((x) => x.id === clip_id);
    if (!c || c.src.type !== 'media') return fail(`khong co clip media ${clip_id}`);
    const mid = c.src.mediaId;
    const beats = p.media.find((m) => m.id === mid)?.beats;
    if (!beats) return fail('media chua co nhip (chay detect_beats va doi job xong)');
    const markers = beats.times.filter((t, i) => i % every === 0 && t >= c.in && t < c.in + c.duration).map((t) => ({ t: srcToTimeline(c, t), kind: 'beat' as const }));
    if (!markers.length) return fail('khong co nhip nao nam trong phan clip dang dung');
    const r = await http('POST', '/propose', { ops: [{ op: 'add_markers', markers }], note: note || `${markers.length} marker nhip (${beats.bpm} BPM)`, source: SOURCE });
    return r.status === 200 ? text({ ...r.json, bpm: beats.bpm, markers: markers.length, next: 'Nguoi dung can duyet trong app.' }) : fail(`De xuat khong hop le: ${JSON.stringify(r.json?.errors ?? r.json)}`);
  }),
);

server.registerTool(
  'qc_check',
  { description: 'Kiem tra chat luong du an: font thieu dau tieng Viet, chu tran khung 9:16/16:9, loudness cua ban tron (LUFS, dinh dBTP; muc tieu mang xa hoi ~ -14), phu de co bao phu loi thoai khong. Tra ve issues (error|warn) va ok.', inputSchema: {} },
  wrap(async () => {
    const r = await http('GET', '/qc');
    return r.status === 200 ? text(r.json) : fail(r.json?.error ?? 'qc that bai');
  }),
);


server.registerTool(
  'remove_background',
  {
    description: 'TACH NEN video (nguoi noi) bang RVM tren GPU cua nguoi dung, chay nen: tra job_id, hoi job_status. Ket qua la matte (video xam) gan vao media; sau do dung apply_matte / text_behind_person. Khong tu tai mo hinh: neu thieu se bao MODEL_MISSING (can nguoi dung dong y tai). Chi mot phan tich (whisper, nhip, tach nen) chay mot luc. Khoang 10 khung/s tren RTX 3060.',
    inputSchema: { media_id: z.string() },
  },
  wrap(async ({ media_id }) => {
    const r = await http('POST', '/matte', { media_id });
    return r.status === 200 ? text(r.json) : fail(r.json?.error ?? JSON.stringify(r.json));
  }),
);

server.registerTool(
  'apply_matte',
  {
    description: 'DE XUAT chi hien phan NGUOI cua clip (nen trong suot, thay nen phia sau), hoac go matte (enabled=false). Media phai da duoc remove_background xong. lo/hi: muc den/trang cua matte de cat bot vien mo (vd 0.3..0.7 cho vien gon); feather: lam mem vien (0..16 texel).',
    inputSchema: { clip_id: z.string(), enabled: z.boolean().default(true), lo: z.number().min(0).max(0.99).default(0), hi: z.number().min(0.01).max(1).default(1), feather: z.number().min(0).max(16).default(0), note: z.string().default('') },
  },
  wrap(async ({ clip_id, enabled, lo, hi, feather, note }) => {
    const r = await http('POST', '/propose', { ops: [{ op: 'set_clip_matte', id: clip_id, matte: enabled ? { lo, hi, feather } : null }], note: note || (enabled ? `Chi hien nguoi (matte) cho ${clip_id}` : `Go matte cua ${clip_id}`), source: SOURCE });
    if (r.status !== 200) return fail(`De xuat khong hop le, chua tao: ${JSON.stringify(r.json?.errors ?? r.json)}`);
    return text({ ...r.json, next: 'Nguoi dung can bam Chap nhan trong app.' });
  }),
);

server.registerTool(
  'text_behind_person',
  {
    description: 'DE XUAT dat CHU SAU LUNG NGUOI: nhan doi clip da tach nen len track tren cung (chi con nguoi), tao track chu o giua va them clip chu o do. Can media da remove_background. Thoi gian chu mac dinh = toan bo clip. Chu tieng Viet: font du dau (list_fonts).',
    inputSchema: {
      clip_id: z.string().describe('clip video nguoi noi (da tach nen)'),
      text: z.string().min(1),
      start: z.number().min(0).optional().describe('giay tren timeline, mac dinh dau clip'),
      duration: z.number().positive().optional().describe('mac dinh het clip'),
      preset: z.string().optional(),
      font: z.string().optional(),
      size: z.number().positive().optional(),
      color: HEXC.optional(),
      y: z.number().optional().describe('dich doc tu giua khung (ty le chieu cao); am = len tren'),
      note: z.string().default(''),
    },
  },
  wrap(async (a) => {
    const p = (await http('GET', '/project')).json as Project;
    const plan = personCutoutPlan(p, a.clip_id, true);
    if (typeof plan === 'string') return fail(plan);
    const c = p.clips.find((x) => x.id === a.clip_id)!;
    const start = a.start ?? c.start;
    const duration = a.duration ?? c.start + c.duration - start;
    if (!(duration > 0)) return fail('thoi gian chu nam ngoai clip');
    const ops = [...plan.ops];
    const used = new Set([...p.clips.map((x) => x.id), plan.overlayId]);
    let n = 1;
    while (used.has('c' + n)) n++;
    const id = 'c' + n;
    ops.push({ op: 'add_clip', clip: { id, track: plan.textTrack!, src: { type: 'text', text: { ...defaultText(), content: a.text } }, start, duration, in: 0, volume: 1, transform: { ...DEFAULT_TRANSFORM }, keyframes: {} } });
    if (a.preset) ops.push({ op: 'apply_preset', id, preset: a.preset });
    const patch: Record<string, unknown> = {};
    if (a.font) patch.font = a.font;
    if (a.size) patch.size = a.size;
    if (a.color) patch.fill = { type: 'solid', color: a.color };
    if (Object.keys(patch).length) ops.push({ op: 'set_text', id, patch: patch as never });
    if (a.y !== undefined) ops.push({ op: 'set_transform', id, patch: { y: a.y } });
    const r = await http('POST', '/propose', { ops, note: a.note || `Chu "${a.text.slice(0, 30)}" sau lung nguoi`, source: SOURCE });
    if (r.status !== 200) return fail(`De xuat khong hop le, chua tao: ${JSON.stringify(r.json?.errors ?? r.json)}`);
    return text({ ...r.json, text_clip: id, text_track: plan.textTrack, person_clip: plan.overlayId, person_track: plan.overlayTrack, next: 'Nguoi dung can bam Chap nhan trong app (xem thu truoc: chu nam sau nguoi).' });
  }),
);

server.registerTool(
  'set_speed',
  {
    description: 'DE XUAT doi TOC DO clip: speed co dinh (0.05..16, 1 = binh thuong; giu cao do khi xuat) HOAC preset speed ramp (hero-time, bullet-time, speed-up-end, slow-start, pulse) HOAC keys tu chon (t tinh tu dau clip, value la toc do). Do dai clip tren timeline giu nguyen; doan nguon tieu thu = tich phan toc do (khong duoc vuot nguon). Speed ramp tat tieng clip. Cham (<1) tu tron khung.',
    inputSchema: {
      clip_id: z.string(),
      speed: z.number().min(0.05).max(16).optional(),
      preset: z.enum(SPEED_PRESETS.map((x) => x.id) as [string, ...string[]]).optional(),
      keys: z.array(z.object({ t: z.number().min(0), value: z.number().min(0.05).max(16), ease: z.enum(EASE_NAMES as [string, ...string[]]).optional().describe('mac dinh ease-in-out') })).optional(),
      note: z.string().default(''),
    },
  },
  wrap(async ({ clip_id, speed, preset, keys, note }) => {
    const given = [speed !== undefined, !!preset, !!keys].filter(Boolean).length;
    if (given !== 1) return fail('chon dung MOT trong: speed, preset, keys');
    const p = (await http('GET', '/project')).json as Project;
    const c = p.clips.find((x) => x.id === clip_id);
    if (!c) return fail(`khong co clip ${clip_id}`);
    const ops: Op[] = [];
    if (speed !== undefined) ops.push({ op: 'set_speed', id: clip_id, speed });
    else {
      const ks = preset ? speedPresetKeys(SPEED_PRESETS.find((x) => x.id === preset)!, c.duration) : keys!.map((k: any) => ({ t: k.t, v: k.value, ease: easeFromName(k.ease ?? 'ease-in-out')! }));
      ops.push({ op: 'set_speed', id: clip_id, speed: 1 }, { op: 'set_keyframes', id: clip_id, prop: 'speed', keys: ks });
    }
    const r = await http('POST', '/propose', { ops, note: note || (preset ? `Speed ramp ${preset}` : speed !== undefined ? `Toc do ${speed}x` : 'Speed ramp tuy chinh'), source: SOURCE });
    if (r.status !== 200) return fail(`De xuat khong hop le, chua tao: ${JSON.stringify(r.json?.errors ?? r.json)}`);
    return text({ ...r.json, next: 'Nguoi dung can bam Chap nhan trong app.' });
  }),
);


const WHEEL = z.object({ r: z.number().optional(), g: z.number().optional(), b: z.number().optional(), m: z.number().optional() }).describe('r,g,b = lech mau theo kenh; m = chung. lift -0.5..0.5, gamma -1..2, gain -1..2 (0 = giu), offset -0.5..0.5');
const PTS = z.array(z.array(z.number()).length(2)).min(2).max(16).describe('cac diem [x,y] 0..1, x tang dan, bat dau [0,0] ket thuc [1,1] la duong thang');

server.registerTool(
  'grade_get',
  { description: 'Doc chinh mau (grade) hien tai cua mot clip, hoac gia tri mac dinh neu chua chinh. Cac truong: input (none|slog3|vlog), exposure (stop), temperature, tint (-100..100), contrast (-1..1), pivot, saturation (1 = giu), lift/gamma/gain/offset {r,g,b,m}, curves {master,r,g,b}, lut {path,name,mix}, mix.', inputSchema: { clip_id: z.string() } },
  wrap(async ({ clip_id }) => {
    const p = (await http('GET', '/project')).json as Project;
    const c = p.clips.find((x) => x.id === clip_id);
    if (!c) return fail(`khong co clip ${clip_id}`);
    return text({ clip_id, graded: !!c.grade, grade: c.grade ?? defaultGrade() });
  }),
);

server.registerTool(
  'grade_set',
  {
    description: 'DE XUAT chinh mau cho mot clip video/anh (nguoi dung duyet). Chi truyen cac truong can doi (gop vao grade hien co). Xem truoc ket qua bang preview_frame(proposal_id), do bang analyze_frame(proposal_id) / scope_image(proposal_id). reset=true: go het chinh mau. Thu tu xu ly: nguon log -> phoi sang -> nhiet do/tint -> tuong phan -> duong cong -> lift/gamma/gain/offset -> bao hoa -> LUT -> muc ap dung.',
    inputSchema: {
      clip_id: z.string(),
      reset: z.boolean().default(false),
      input: z.enum(['none', 'slog3', 'vlog']).optional().describe('footage log: chi bien doi duong cong, khong doi gam mau'),
      exposure: z.number().min(-6).max(6).optional(),
      temperature: z.number().min(-100).max(100).optional().describe('am = lanh/xanh, duong = am/cam (gan dung, khong phai Kelvin)'),
      tint: z.number().min(-100).max(100).optional(),
      contrast: z.number().min(-1).max(1).optional(),
      pivot: z.number().min(0.05).max(0.95).optional(),
      saturation: z.number().min(0).max(3).optional(),
      lift: WHEEL.optional(),
      gamma: WHEEL.optional(),
      gain: WHEEL.optional(),
      offset: WHEEL.optional(),
      curves: z.object({ master: PTS.optional(), r: PTS.optional(), g: PTS.optional(), b: PTS.optional() }).optional(),
      mix: z.number().min(0).max(1).optional(),
      note: z.string().default(''),
    },
  },
  wrap(async (a) => {
    const { clip_id, reset, note, ...rest } = a;
    const patch: DeepPartialGrade = {};
    for (const [k, v] of Object.entries(rest)) if (v !== undefined) (patch as Record<string, unknown>)[k] = v;
    if (!reset && !Object.keys(patch).length) return fail('khong co truong chinh mau nao de doi (hoac dat reset=true)');
    const ops: Op[] = reset ? [{ op: 'set_grade', id: clip_id, grade: null }, ...(Object.keys(patch).length ? [{ op: 'set_grade' as const, id: clip_id, grade: patch }] : [])] : [{ op: 'set_grade', id: clip_id, grade: patch }];
    const r = await http('POST', '/propose', { ops, note: note || (reset ? `Dat lai chinh mau ${clip_id}` : `Chinh mau ${clip_id}: ${Object.keys(patch).join(', ')}`), source: SOURCE });
    if (r.status !== 200) return fail(`De xuat khong hop le, chua tao: ${JSON.stringify(r.json?.errors ?? r.json)}`);
    return text({ ...r.json, next: 'Nguoi dung can bam Chap nhan trong app. Xem thu: preview_frame voi proposal_id.' });
  }),
);

server.registerTool(
  'apply_lut',
  { description: 'DE XUAT gan mot file LUT .cube (3D, duong dan tuyet doi tren may) vao clip, voi muc mix 0..1. LUT nhan vao la ma hoa hien thi Rec.709/sRGB. Chay SAU chinh mau co ban.', inputSchema: { clip_id: z.string(), path: z.string().describe('vd D:\\\\luts\\\\look.cube'), mix: z.number().min(0).max(1).default(1), note: z.string().default('') } },
  wrap(async ({ clip_id, path: lp, mix, note }) => {
    if (!/\.cube$/i.test(lp) || !fs.existsSync(lp)) return fail(`khong thay file .cube: ${lp}`);
    let lut;
    try {
      lut = parseCube(fs.readFileSync(lp, 'utf8'));
    } catch (e) {
      return fail(`LUT khong doc duoc: ${(e as Error).message}`);
    }
    const name = path.basename(lp);
    const r = await http('POST', '/propose', { ops: [{ op: 'set_grade', id: clip_id, grade: { lut: { path: path.resolve(lp), name, mix } } }], note: note || `Gan LUT ${name} (${lut.size}^3) cho ${clip_id}`, source: SOURCE });
    if (r.status !== 200) return fail(`De xuat khong hop le, chua tao: ${JSON.stringify(r.json?.errors ?? r.json)}`);
    return text({ ...r.json, next: 'Nguoi dung can bam Chap nhan trong app.' });
  }),
);

server.registerTool(
  'analyze_frame',
  {
    description: 'DO so lieu mau cua mot khung (compute shader tren GPU, sau Output Transform): trung binh/do lech/min/max/percentile cua R,G,B,luma (0..1), % chay sang, % den ep, % kenh bi clip, bao hoa, lech mau tong the (cast), % diem mau da, % theo vung sang, % duoi/tren muc hop le (luma <16 / >235). roi: vung do. Dung de quyet dinh chinh gi thay vi doan. clip_id: chi do rieng clip do; graded=false: do mau GOC truoc khi chinh. proposal_id: do ket qua cua de xuat chua duyet.',
    inputSchema: { t: z.number().min(0).describe('giay tren timeline'), clip_id: z.string().optional(), graded: z.boolean().default(true), proposal_id: z.string().optional(), aspect: z.enum(['9:16', '16:9']).optional(), roi: z.string().optional().describe('vung do: full (mac dinh) | center | upper | lower | left | right | "x0,y0,x1,y1" (ty le 0..1). Dung de bo vien den/letterbox hoac do rieng mot vung (vd mat).') },
  },
  wrap(async ({ t, clip_id, graded, proposal_id, aspect, roi }) => {
    const q = `${roi ? 'roi=' + encodeURIComponent(roi) + '&' : ''}t=${t}${clip_id ? '&clip_id=' + encodeURIComponent(clip_id) : ''}&graded=${graded === false ? 0 : 1}${proposal_id ? '&proposal=' + encodeURIComponent(proposal_id) : ''}${aspect ? '&aspect=' + aspect : ''}`;
    const r = await http('GET', `/analyze_frame?${q}`);
    return r.status === 200 ? text(r.json) : fail(r.json?.error ?? 'khong do duoc');
  }),
);

server.registerTool(
  'scope_image',
  {
    description: 'Xem scope cua mot khung duoi dang ANH: waveform (do sang theo cot), rgbwave (R,G,B chong len nhau), parade (R,G,B tach rieng), vectorscope (mau; co duong da cam, o muc tieu 75%), histogram. Doc de thay clip, mau lech, do tuong phan. Tham so nhu analyze_frame.',
    inputSchema: { t: z.number().min(0), kind: z.enum(['waveform', 'rgbwave', 'parade', 'vectorscope', 'histogram']).default('waveform'), clip_id: z.string().optional(), graded: z.boolean().default(true), proposal_id: z.string().optional(), roi: z.string().optional() },
  },
  wrap(async ({ t, kind, clip_id, graded, proposal_id, roi }) => {
    const q = `${roi ? 'roi=' + encodeURIComponent(roi) + '&' : ''}t=${t}&kind=${kind}${clip_id ? '&clip_id=' + encodeURIComponent(clip_id) : ''}&graded=${graded === false ? 0 : 1}${proposal_id ? '&proposal=' + encodeURIComponent(proposal_id) : ''}`;
    const r = await http('GET', `/scope_image?${q}`);
    if (r.status !== 200 || !r.buf) return fail(r.json?.error ?? 'khong ve duoc scope');
    return { content: [{ type: 'image' as const, data: r.buf.toString('base64'), mimeType: 'image/png' }, { type: 'text' as const, text: `Scope ${kind} tai t=${t}s${clip_id ? ' (rieng clip ' + clip_id + ')' : ''}` }] };
  }),
);

server.registerTool(
  'match_color',
  {
    description: 'DE XUAT lam mau clip nay GIONG clip tham chieu: do trung binh va do lech cua R,G,B o hai khung (clip nay o mau goc, clip tham chieu nhu dang hien), roi dat gain + offset theo kenh de khop. Day la so khop thong ke don gian (khong phai so khop cam nhan); nen xem lai bang preview_frame. Gop vao chinh mau hien co cua clip.',
    inputSchema: { clip_id: z.string(), t: z.number().min(0).describe('giay tren timeline, khung cua clip can chinh'), reference_clip_id: z.string(), reference_t: z.number().min(0).describe('giay tren timeline, khung cua clip tham chieu'), strength: z.number().min(0).max(1).default(1), note: z.string().default('') },
  },
  wrap(async ({ clip_id, t, reference_clip_id, reference_t, strength, note }) => {
    const a = await http('GET', `/analyze_frame?t=${t}&clip_id=${encodeURIComponent(clip_id)}&graded=0`);
    const b = await http('GET', `/analyze_frame?t=${reference_t}&clip_id=${encodeURIComponent(reference_clip_id)}&graded=1`);
    if (a.status !== 200) return fail(a.json?.error ?? 'khong do duoc clip nay (co dang hien o thoi diem t khong?)');
    if (b.status !== 200) return fail(b.json?.error ?? 'khong do duoc clip tham chieu');
    const k = (x: number) => Math.min(0.25, Math.max(-0.25, x));
    const gain: Record<string, number> = {},
      offset: Record<string, number> = {};
    for (const c of ['r', 'g', 'b'] as const) {
      const sa = a.json.channels[c],
        sb = b.json.channels[c];
      const g = sa.std > 0.005 ? Math.min(2, Math.max(0.5, sb.std / sa.std)) : 1;
      const o = k(sb.mean - g * sa.mean);
      gain[c] = (g - 1) * strength;
      offset[c] = o * strength;
    }
    const r = await http('POST', '/propose', { ops: [{ op: 'set_grade', id: clip_id, grade: { gain, offset } }], note: note || `Khop mau ${clip_id} voi ${reference_clip_id}`, source: SOURCE });
    if (r.status !== 200) return fail(`De xuat khong hop le, chua tao: ${JSON.stringify(r.json?.errors ?? r.json)}`);
    return text({ ...r.json, gain, offset, source_stats: { r: a.json.channels.r, g: a.json.channels.g, b: a.json.channels.b }, reference_stats: { r: b.json.channels.r, g: b.json.channels.g, b: b.json.channels.b }, next: 'Nguoi dung can bam Chap nhan trong app. Kiem lai bang analyze_frame(proposal_id).' });
  }),
);


const NUM = z.number();
server.registerTool(
  'set_fx',
  {
    description: 'DE XUAT them/sua/go HIEU UNG LOP cho mot clip (nguoi dung duyet). Hieu ung: blur {radius px}, glow {radius, intensity 0..6, color #rrggbb hoac "" giu mau nguon, threshold 0..1}, shadow {x,y,blur,opacity,color}, round {radius 0..0.5} va crop {left,top,right,bottom 0..0.95} (chi clip video/anh), vignette {amount,softness}, wipe {progress 0..1, angle do, feather}. Moi hieu ung la mot object (chi truyen truong can doi, gop vao hieu ung co san); remove=[ten...] de go tung hieu ung; remove_all=true go het. Don vi px theo canh ngan 1080. Hieu ung keyframe duoc bang set_keyframes voi property fx.<ten>.<truong>, vd fx.wipe.progress, fx.blur.radius (hieu ung phai co truoc).',
    inputSchema: {
      clip_id: z.string(),
      blur: z.object({ radius: NUM.min(0).max(200) }).partial().optional(),
      glow: z.object({ radius: NUM.min(0).max(200), intensity: NUM.min(0).max(6), color: z.string(), threshold: NUM.min(0).max(1) }).partial().optional(),
      shadow: z.object({ x: NUM, y: NUM, blur: NUM.min(0).max(200), opacity: NUM.min(0).max(1), color: HEXC }).partial().optional(),
      round: z.object({ radius: NUM.min(0).max(0.5) }).partial().optional(),
      crop: z.object({ left: NUM.min(0).max(0.95), top: NUM.min(0).max(0.95), right: NUM.min(0).max(0.95), bottom: NUM.min(0).max(0.95) }).partial().optional(),
      vignette: z.object({ amount: NUM.min(0).max(1), softness: NUM.min(0).max(1) }).partial().optional(),
      wipe: z.object({ progress: NUM.min(0).max(1), angle: NUM, feather: NUM.min(0).max(1) }).partial().optional(),
      remove: z.array(z.enum(FX_NAMES as [string, ...string[]])).optional().describe('ten cac hieu ung can go'),
      remove_all: z.boolean().default(false),
      note: z.string().default(''),
    },
  },
  wrap(async (a) => {
    const patch: Record<string, unknown> = {};
    for (const n of FX_NAMES) if (a[n] !== undefined) patch[n] = a[n];
    for (const n of (a.remove ?? []) as string[]) patch[n] = null;
    if (!a.remove_all && !Object.keys(patch).length) return fail('khong co hieu ung nao de doi (blur|glow|shadow|round|crop|vignette|wipe) remove hoac remove_all=true');
    const r = await http('POST', '/propose', { ops: [{ op: 'set_fx', id: a.clip_id, fx: a.remove_all ? null : patch }], note: a.note || `Hieu ung ${a.remove_all ? '(go het)' : Object.keys(patch).join(', ')} cho ${a.clip_id}`, source: SOURCE });
    if (r.status !== 200) return fail(`De xuat khong hop le, chua tao: ${JSON.stringify(r.json?.errors ?? r.json)}`);
    return text({ ...r.json, next: 'Nguoi dung can bam Chap nhan trong app.' });
  }),
);

server.registerTool(
  'set_blend',
  { description: 'DE XUAT doi CHE DO TRON cua clip voi cac lop duoi: normal | add | screen | multiply (tinh trong anh sang tuyen tinh). Dung screen/add cho light leak, glow, tia sang; multiply cho bong, lop toi.', inputSchema: { clip_id: z.string(), blend: z.enum(BLEND_MODES as [string, ...string[]]), note: z.string().default('') } },
  wrap(async ({ clip_id, blend, note }) => {
    const r = await http('POST', '/propose', { ops: [{ op: 'set_blend', id: clip_id, blend }], note: note || `Che do tron ${blend} cho ${clip_id}`, source: SOURCE });
    if (r.status !== 200) return fail(`De xuat khong hop le, chua tao: ${JSON.stringify(r.json?.errors ?? r.json)}`);
    return text({ ...r.json, next: 'Nguoi dung can bam Chap nhan trong app.' });
  }),
);

server.registerTool(
  'add_shape',
  {
    description: 'DE XUAT them mot HINH VECTOR (rect, ellipse, ring, star) tai start/duration, tu chon track video con trong (hoac tao track moi). Kich thuoc px theo canh ngan 1080; vi tri x,y la dich tu diem neo theo ty le khung (0 = giua). Hinh co the keyframe: shape.w, shape.h, shape.stroke.width, shape.fillOpacity, shape.radius, shape.trim (vien "tu ve", 0..1) va transform. Dung cho the, vong no (ring + scale + opacity), thanh kinh (rect bo goc, fillOpacity thap).',
    inputSchema: {
      kind: z.enum(SHAPE_KINDS as [string, ...string[]]),
      start: z.number().min(0),
      duration: z.number().positive().default(2),
      w: z.number().min(1).max(4000).optional(),
      h: z.number().min(1).max(4000).optional(),
      fill: z.string().optional().describe('#rrggbb, rong = khong to'),
      fill_opacity: z.number().min(0).max(1).optional(),
      stroke_color: HEXC.optional(),
      stroke_width: z.number().min(0).max(400).optional(),
      radius: z.number().min(0).optional().describe('bo goc rect (px)'),
      points: z.number().int().min(3).max(24).optional(),
      inner: z.number().min(0.05).max(1).optional(),
      trim: z.number().min(0).max(1).optional(),
      x: z.number().optional(),
      y: z.number().optional(),
      track: z.string().optional(),
      note: z.string().default(''),
    },
  },
  wrap(async (a) => {
    const p = (await http('GET', '/project')).json as Project;
    const ops: Op[] = [];
    let track = a.track as string | undefined;
    if (track) {
      const t = p.tracks.find((x) => x.id === track);
      if (!t || t.kind !== 'video') return fail(`track "${track}" khong ton tai hoac khong phai track video`);
    } else {
      const free = (id: string) => !p.clips.some((c) => c.track === id && a.start < c.start + c.duration - 1e-6 && c.start < a.start + a.duration - 1e-6);
      track = [...p.tracks.filter((t) => t.kind === 'video')].reverse().find((t) => free(t.id))?.id;
      if (!track) {
        track = nextId(p, 'v');
        ops.push({ op: 'add_track', track: { id: track, kind: 'video', name: `Video ${p.tracks.filter((t) => t.kind === 'video').length + 1}` } });
      }
    }
    const id = nextId(p, 'c');
    const sp = defaultShape(a.kind);
    if (a.w) sp.w = a.w;
    if (a.h) sp.h = a.h;
    if (a.fill !== undefined) sp.fill = a.fill;
    if (a.fill_opacity !== undefined) sp.fillOpacity = a.fill_opacity;
    if (a.stroke_color) sp.stroke.color = a.stroke_color;
    if (a.stroke_width !== undefined) sp.stroke.width = a.stroke_width;
    if (a.radius !== undefined) sp.radius = a.radius;
    if (a.points) sp.points = a.points;
    if (a.inner) sp.inner = a.inner;
    if (a.trim !== undefined) sp.trim = a.trim;
    const tf: Record<string, number> = {};
    if (a.x !== undefined) tf.x = a.x;
    if (a.y !== undefined) tf.y = a.y;
    ops.push({ op: 'add_clip', clip: { id, track, src: { type: 'shape', shape: sp }, start: a.start, duration: a.duration, in: 0, volume: 1, transform: { ...DEFAULT_TRANSFORM, ...tf }, keyframes: {} } });
    const r = await http('POST', '/propose', { ops, note: a.note || `Them hinh ${a.kind}`, source: SOURCE });
    if (r.status !== 200) return fail(`De xuat khong hop le, chua tao: ${JSON.stringify(r.json?.errors ?? r.json)}`);
    return text({ ...r.json, clip_id: id, track, next: 'Nguoi dung can bam Chap nhan trong app.' });
  }),
);

server.registerTool(
  'snapshot_create',
  { description: 'Luu mot moc (snapshot) co ten cua du an hien tai de nguoi dung co the quay lai. AI chi duoc TAO moc, khong duoc khoi phuc (khoi phuc la quyen cua nguoi dung).', inputSchema: { name: z.string().min(1).describe('vd truoc-khi-doi-bo-cuc') } },
  wrap(async ({ name }) => text((await http('POST', '/snapshots', { name })).json)),
);

server.registerTool(
  'snapshots_list',
  { description: 'Danh sach snapshot da luu (ten, thoi gian, so clip).', inputSchema: {} },
  wrap(async () => text((await http('GET', '/snapshots')).json)),
);

server.registerTool(
  'render_start',
  {
    description: 'Xuat video (NVENC H.264, BT.709) chay nen. preset "9:16" (1080x1920), "16:9" (1920x1080) hoac "project". Tra ve job_id; hoi job_status. Khong ghi de file co san. Mot lan chi mot job xuat.',
    inputSchema: { preset: z.enum(['9:16', '16:9', 'project']).default('9:16'), out: z.string().optional().describe('Duong dan file .mp4; bo trong = thu muc exports cua app'), loudness_lufs: z.number().min(-30).max(-6).optional().describe('chuan hoa am luong tong (2 luot, tuyen tinh); mang xa hoi thuong -14') },
  },
  wrap(async ({ preset, out, loudness_lufs }) => {
    const r = await http('POST', '/render_start', { preset, out, loudness_lufs });
    return r.status === 200 ? text(r.json) : fail(r.json?.error ?? JSON.stringify(r.json));
  }),
);

server.registerTool(
  'export_timeline',
  {
    description: 'Xuat timeline sang phan mem khac: "premiere" (xmeml .xml), "resolve" (.fcpxml + .xml), "capcut" (ban nhap CapCut, can mot ban nhap khuon tren may), "ae" (script .jsx dung lai comp), "edl" (chi diem cat). Phan khong co tuong ung (chu/hinh/hieu ung/chinh mau/matte) duoc ve san thanh MOT lop .mov trong suot (job chay nen, co the lau). Tra ve job_id: hoi job_status de lay out_dir, danh sach file, canh bao, va "verified" (muc da kiem tren phan mem dich; thuong la "chua kiem"). Luon ghi vao thu muc exports cua app; khong sua du an.',
    inputSchema: { target: z.enum(['premiere', 'resolve', 'capcut', 'ae', 'edl']), aspect: z.enum(['project', '9:16', '16:9']).default('project'), overlay: z.boolean().default(true).describe('false = bo lop phu (chu/hinh/hieu ung se KHONG co trong ban xuat)') },
  },
  wrap(async ({ target, aspect, overlay }) => {
    const r = await http('POST', '/export_timeline', { target, aspect, overlay });
    return r.status === 200 ? text(r.json) : fail(r.json?.error ?? JSON.stringify(r.json));
  }),
);

server.registerTool(
  'job_cancel',
  { description: 'Huy mot job dang chay (vd render). File xuat do se bi xoa.', inputSchema: { job_id: z.string() } },
  wrap(async ({ job_id }) => text((await http('POST', `/jobs/${encodeURIComponent(job_id)}/cancel`)).json)),
);

await server.connect(new StdioServerTransport());
