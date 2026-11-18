// Xuat timeline sang phan mem khac (F-97) + gop hoan tac theo cu chi (F-96) + hinh hoc khung chon (F-95): phan thuan tuy, khong can Electron.
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { Session } from '../src/core/session';
import { DEFAULT_TRANSFORM, newProject, type Clip, type Media, type Project } from '../src/core/schema';
import { defaultText } from '../src/core/text';
import { buildPlan, mediaPlacement, TARGETS } from '../src/core/export-plan';
import { writeAeJsx, writeEdl, writeFcpxml, writeXmeml } from '../src/core/export-writers';
import { bounds, corners, hit, snapMove } from '../src/renderer/clip-geom';

let n = 0;
const t = (name: string, fn: () => void) => {
  fn();
  n++;
  console.log('ok -', name);
};
const vid: Media = { id: 'm1', path: 'D:/media/aroll 1.mp4', kind: 'video', duration: 20, width: 1080, height: 1920, fps: 30, hasAudio: true };
const wide: Media = { id: 'm2', path: 'D:/media/broll.mp4', kind: 'video', duration: 10, width: 1920, height: 1080, fps: 30, hasAudio: false };
const mus: Media = { id: 'm3', path: 'D:/media/nhạc & nền.mp3', kind: 'audio', duration: 60, width: 0, height: 0, fps: 0, hasAudio: true };
const clip = (id: string, track: string, mediaId: string, start: number, duration: number, extra: Partial<Clip> = {}): Clip => ({ id, track, src: { type: 'media', mediaId }, start, duration, in: 0, volume: 1, transform: { ...DEFAULT_TRANSFORM }, keyframes: {}, ...extra });
function proj(): Project {
  const p = newProject('Thử "F20" <bản 1>');
  p.media.push(vid, wide, mus);
  p.tracks.push({ id: 'v2', kind: 'video', name: 'Video 2' }, { id: 'v3', kind: 'video', name: 'Chữ' });
  p.clips.push(
    clip('c1', 'v1', 'm1', 0, 5),
    clip('c2', 'v2', 'm2', 1, 3, { transform: { ...DEFAULT_TRANSFORM, scale: 1.5, x: 0.1 }, keyframes: { 'transform.scale': [{ t: 0, v: 1, ease: { kind: 'bezier', x1: 0.4, y1: 0, x2: 0.2, y2: 1 } }, { t: 3, v: 2, ease: { kind: 'linear', x1: 0, y1: 0, x2: 1, y2: 1 } }] } }),
    clip('c3', 'a1', 'm3', 0, 5, { volume: 0.3 }),
    { id: 't1', track: 'v3', src: { type: 'text', text: { ...defaultText(), content: 'Xin chào' } }, start: 1, duration: 2, in: 0, volume: 1, transform: { ...DEFAULT_TRANSFORM }, keyframes: {} },
    clip('c4', 'v1', 'm1', 5, 2),
  );
  return p;
}
/** Kiem tra XML can bang the (khong co DOMParser trong node). */
function wellFormed(xml: string): boolean {
  const body = xml.replace(/<\?[\s\S]*?\?>/g, '').replace(/<!DOCTYPE[^>]*>/g, '');
  const stack: string[] = [];
  for (const m of body.matchAll(/<(\/?)([A-Za-z][\w:-]*)([^<>]*?)(\/?)>/g)) {
    if (m[4]) continue;
    if (m[1]) {
      if (stack.pop() !== m[2]) return false;
    } else stack.push(m[2]);
  }
  return stack.length === 0 && !/&(?!amp;|lt;|gt;|quot;)/.test(body.replace(/<[^>]*>/g, ''));
}

t('mediaPlacement: neo giua, scale 1 = vua khung, tam o giua; dich theo x,y; neo trai dich nua be rong', () => {
  const a = mediaPlacement(DEFAULT_TRANSFORM, 1080, 1920, 1080, 1920);
  assert.deepEqual([a.cx, a.cy, a.s], [540, 960, 1]);
  const b = mediaPlacement({ ...DEFAULT_TRANSFORM, x: 0.1, y: -0.05, scale: 2 }, 1080, 1920, 1920, 1080);
  assert.ok(Math.abs(b.cx - (540 + 108)) < 1e-9 && Math.abs(b.cy - (960 - 96)) < 1e-9);
  assert.ok(Math.abs(b.s - (1080 / 1920) * 2) < 1e-9);
  const l = mediaPlacement({ ...DEFAULT_TRANSFORM, anchorH: 'left', margin: 0.1 }, 1080, 1920, 540, 960);
  assert.ok(Math.abs(l.cx - (108 + 540)) < 1e-9, String(l.cx)); // le 108 + nua be rong (540 px nguon x2 vua khung = 1080 -> nua = 540)
});

t('buildPlan: phan chuyen duoc vs lop phu; canh bao ro rang', () => {
  const p = proj();
  const plan = buildPlan(p, 'premiere');
  assert.equal(plan.video.length, 2); // v1 (2 clip), v2 (1 clip); chu khong co track rieng
  assert.equal(plan.video[0].items.length, 2);
  assert.deepEqual(plan.overlay.clipIds, ['t1']);
  assert.ok(plan.overlay.needed);
  assert.deepEqual(plan.overlay.ranges, [[1, 3]]);
  assert.ok(plan.warnings.some((w) => /lớp video trong suốt/.test(w) && /chữ: 1/.test(w)));
  assert.ok(plan.warnings.some((w) => /ease/.test(w)), 'co keyframe bezier thi canh bao');
  assert.equal(plan.audio[0].items[0].volume, 0.3);
  const k = plan.video[1].items[0];
  assert.equal(k.animated, true);
  assert.equal(k.samples.length, 2);
  assert.ok(Math.abs(k.samples[1].s - (1080 / 1920) * 2) < 1e-9);
});

t('buildPlan: clip co chinh mau / hieu ung / blend / speed ramp / doi toc do -> lop phu; CapCut nhan doi toc do', () => {
  const p = proj();
  p.clips[0].fx = { blur: { radius: 4 } as never };
  p.clips[1].blend = 'add';
  p.clips[4].speed = 2;
  const pr = buildPlan(p, 'premiere');
  assert.deepEqual(pr.overlay.clipIds.sort(), ['c1', 'c2', 'c4', 't1']);
  assert.ok(pr.warnings.some((w) => /KHÔNG có tiếng/.test(w)));
  const cc = buildPlan(p, 'capcut');
  assert.deepEqual(cc.overlay.clipIds.sort(), ['c1', 'c2', 't1']);
  assert.equal(cc.video[0].items[0].speed, 2);
  const ed = buildPlan(p, 'edl');
  assert.equal(ed.overlay.needed, false);
});

t('buildPlan: clip bi vo hieu hoa khong duoc xuat; khung 16:9 doi kich thuoc', () => {
  const p = proj();
  p.clips[0].disabled = true;
  const plan = buildPlan(p, 'ae', '16:9');
  assert.equal(plan.width, 1920);
  assert.equal(plan.height, 1080);
  assert.ok(!plan.video.flatMap((v) => v.items).some((i) => i.id === 'c1'));
});

t('EDL: moi track mot file, timecode khung dung, co su kien den khi cach quang', () => {
  const files = writeEdl(buildPlan(proj(), 'edl'));
  assert.ok(files.length >= 3);
  const v2 = files.find((f) => /V2/.test(f.file))!.text;
  assert.match(v2, /BL\s+V\s+C\s+00:00:00:00 00:00:01:00 00:00:00:00 00:00:01:00/); // trong 1 giay dau
  assert.match(v2, /AX\s+V\s+C\s+00:00:00:00 00:00:03:00 00:00:01:00 00:00:04:00/);
  assert.match(v2, /FROM CLIP NAME: broll.mp4/);
});

t('xmeml: well-formed, escape ky tu dac biet, scale/center/rotation/keyframe, lop phu alpha, am thanh', () => {
  const plan = buildPlan(proj(), 'premiere');
  const xml = writeXmeml(plan, { path: 'D:/out/lop phu.mov', width: 1080, height: 1920, duration: 7 });
  assert.ok(wellFormed(xml), 'XML phai can bang');
  assert.match(xml, /Thử &quot;F20&quot; &lt;bản 1&gt;/);
  assert.match(xml, /file:\/\/\/D:\/media\/aroll%201\.mp4/);
  assert.match(xml, /<alphatype>straight<\/alphatype>/);
  assert.match(xml, /<parameterid>scale<\/parameterid>[\s\S]*?<keyframe><when>0<\/when><value>[\d.]+<\/value><\/keyframe><keyframe><when>90<\/when>/);
  assert.match(xml, /<timebase>30<\/timebase>/);
  assert.match(xml, /<value>0\.3<\/value>/); // am luong nhac 0.3
  assert.match(xml, /nh%E1%BA%A1c%20%26%20n%E1%BB%81n\.mp3/);
});

t('fcpxml: well-formed, lane video/am thanh, thoi gian hop ly so', () => {
  const xml = writeFcpxml(buildPlan(proj(), 'resolve'), { path: 'D:/out/lop-phu.mov', width: 1080, height: 1920, duration: 7 });
  assert.ok(wellFormed(xml));
  assert.match(xml, /<fcpxml version="1\.9">/);
  assert.match(xml, /lane="-1"/);
  assert.match(xml, /offset="30\/30s"/);
  assert.match(xml, /frameDuration="1\/30s"/);
});

t('After Effects .jsx: cu phap hop le, khong co hop thoai, setValuesAtTimes cho keyframe, chuoi unicode duoc escape', () => {
  const js = writeAeJsx(buildPlan(proj(), 'ae'), { path: 'D:/out/lop-phu.mov', width: 1080, height: 1920, duration: 7 });
  assert.doesNotThrow(() => new vm.Script(js));
  assert.ok(!/alert\(|confirm\(|prompt\(/.test(js));
  assert.match(js, /setValuesAtTimes/);
  assert.match(js, /addComp\("Th\\u1eed/);
  assert.ok(!/[^\x00-\x7f]/.test(js), 'script chi chua ASCII (tranh loi ma hoa ExtendScript)');
  assert.match(js, /Lop phu/);
});

t('Session.apply: cung khoa cu chi gop MOT buoc hoan tac va MOT muc lich su; khoa khac / khong khoa thi tach', () => {
  const s = new Session();
  s.apply([{ op: 'add_media', media: vid }, { op: 'add_clip', clip: clip('c1', 'v1', 'm1', 0, 5) }], 'human');
  const h0 = s.project.history.length;
  for (const x of [0.1, 0.2, 0.3, 0.4]) s.apply([{ op: 'set_transform', id: 'c1', patch: { x } }], 'human', 'drag:1');
  assert.equal(s.project.history.length, h0 + 1);
  assert.equal(s.project.clips[0].transform.x, 0.4);
  assert.ok(s.undo());
  assert.equal(s.project.clips[0].transform.x, 0, 'mot lan undo ve truoc cu chi');
  assert.ok(s.redo());
  assert.equal(s.project.clips[0].transform.x, 0.4);
  // khoa khac -> buoc moi; sau undo khong con gop vao buoc cu
  s.apply([{ op: 'set_transform', id: 'c1', patch: { x: 0.5 } }], 'human', 'drag:2');
  s.apply([{ op: 'set_transform', id: 'c1', patch: { x: 0.6 } }], 'human', 'drag:2');
  assert.ok(s.undo());
  assert.equal(s.project.clips[0].transform.x, 0.4);
  s.apply([{ op: 'set_transform', id: 'c1', patch: { x: 0.7 } }], 'human', 'drag:2'); // sau undo: khoa bi huy -> buoc moi
  s.apply([{ op: 'set_transform', id: 'c1', patch: { x: 0.8 } }], 'human');
  s.apply([{ op: 'set_transform', id: 'c1', patch: { x: 0.9 } }], 'human');
  assert.ok(s.undo() && s.project.clips[0].transform.x === 0.8);
  assert.ok(s.undo() && s.project.clips[0].transform.x === 0.7);
  // op loi khong lam hong chuoi gop
  const bad = s.apply([{ op: 'set_transform', id: 'zzz', patch: { x: 1 } }], 'human', 'drag:3');
  assert.equal(bad.ok, false);
});

t('hinh hoc khung chon: goc, hit-test co xoay, bounds, snap vao giua / mep / vung an toan', () => {
  const b = { cx: 500, cy: 800, w: 200, h: 100, rot: 0 };
  assert.deepEqual(corners(b)[0], [400, 750]);
  assert.ok(hit(b, 590, 840) && !hit(b, 610, 840));
  const r = { ...b, rot: 90 };
  assert.ok(hit(r, 500, 890) && !hit(r, 590, 800), 'xoay 90 do: hop dung len');
  const bb = bounds(r);
  assert.ok(Math.abs(bb.x1 - bb.x0 - 100) < 1e-9 && Math.abs(bb.y1 - bb.y0 - 200) < 1e-9);
  // tam hop 500 -> giua khung 540: keo +36 (con lech 4 < nguong 6) thi bam ve 540
  const s = snapMove(bounds(b), 36, 0, 1080, 1920, 6);
  assert.ok(Math.abs(s.dx - 40) < 1e-9 && s.vlines[0] === 540);
  const none = snapMove(bounds(b), 20, 0, 1080, 1920, 6);
  assert.equal(none.vlines.length, 0);
  assert.equal(none.dx, 20);
  // mep trai hop (400) bam vao mep an toan 5% (54)
  const e = snapMove({ x0: 400, x1: 600, y0: 750, y1: 850 }, -343, 0, 1080, 1920, 6, true);
  assert.ok(Math.abs(e.dx - -346) < 1e-9, String(e.dx));
});

t('TARGETS day du 5 dich', () => assert.deepEqual(TARGETS.map((x) => x.id), ['premiere', 'resolve', 'capcut', 'ae', 'edl']));

console.log(`${n} test xuat/gop hoan tac/hinh hoc dat`);
