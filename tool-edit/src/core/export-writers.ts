// Ghi file trao doi tu Plan: xmeml (Premiere Pro / Resolve), FCPXML (Resolve / Final Cut), EDL CMX3600, script After Effects (.jsx).
// Thuan tuy (tra chuoi), kiem duoc trong node. Muc kiem tung dich: xem CHUC-NANG.md F-97. Xem export-plan.ts cho phan chuyen duoc.
import type { Plan, PlanItem } from './export-plan';

export interface OverlayFile {
  path: string; // .mov co kenh alpha
  width: number;
  height: number;
  duration: number; // giay (= do dai timeline)
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const fwd = (p: string) => p.replace(/\\/g, '/');
const frames = (plan: Plan, sec: number) => Math.round(sec * plan.fps);
const fileUrl = (p: string) => 'file:///' + fwd(p).split('/').map((seg, i) => (i === 0 && /^[A-Za-z]:$/.test(seg) ? seg : encodeURIComponent(seg))).join('/');

/** Cac muc am thanh: clip tren track audio + tieng cua clip video (khi co tieng va am luong > 0). */
export function audioItems(plan: Plan): { name: string; items: PlanItem[] }[] {
  const out: { name: string; items: PlanItem[] }[] = [];
  for (const tr of plan.video) {
    const items = tr.items
      .filter((i) => i.kind === 'video' && i.hasAudio && i.volume > 0)
      .map((i) => ({ ...i, kind: 'audio' as const }));
    if (items.length) out.push({ name: `${tr.name} (tiếng)`, items });
  }
  for (const tr of plan.audio) out.push({ name: tr.name, items: tr.items });
  return out;
}

// ---------------- EDL ----------------
function tc(plan: Plan, sec: number): string {
  const f = Math.round(sec * plan.fps);
  const fps = Math.round(plan.fps);
  const ff = f % fps,
    s = Math.floor(f / fps) % 60,
    m = Math.floor(f / fps / 60) % 60,
    h = Math.floor(f / fps / 3600);
  const p2 = (n: number) => String(n).padStart(2, '0');
  return `${p2(h)}:${p2(m)}:${p2(s)}:${p2(ff)}`;
}

/** Mot EDL moi track (CMX3600 khong co lop): V1.edl, V2.edl, A1.edl... */
export function writeEdl(plan: Plan): { file: string; text: string }[] {
  const out: { file: string; text: string }[] = [];
  const emit = (label: string, kind: 'V' | 'A', items: PlanItem[]) => {
    const lines = [`TITLE: ${plan.name} - ${label}`, 'FCM: NON-DROP FRAME', ''];
    let n = 1;
    let cursor = 0;
    for (const it of items.slice().sort((a, b) => a.start - b.start)) {
      if (it.start > cursor + 1e-6) {
        // khoang trong: su kien den (BL) de giu moc thoi gian
        lines.push(`${String(n++).padStart(3, '0')}  BL       ${kind}     C        00:00:00:00 ${tc(plan, it.start - cursor)} ${tc(plan, cursor)} ${tc(plan, it.start)}`);
      }
      const srcIn = it.srcIn,
        srcOut = it.srcIn + it.dur * it.speed;
      lines.push(`${String(n++).padStart(3, '0')}  AX       ${kind}     C        ${tc(plan, srcIn)} ${tc(plan, srcOut)} ${tc(plan, it.start)} ${tc(plan, it.start + it.dur)}`);
      lines.push(`* FROM CLIP NAME: ${it.name}`);
      lines.push(`* SOURCE FILE: ${fwd(it.path)}`);
      cursor = it.start + it.dur;
    }
    out.push({ file: `${label}.edl`, text: lines.join('\n') + '\n' });
  };
  plan.video.forEach((t, i) => emit(`V${i + 1}-${t.name.replace(/[^\w.-]+/g, '_')}`, 'V', t.items.filter((x) => x.kind === 'video')));
  audioItems(plan).forEach((t, i) => emit(`A${i + 1}-${t.name.replace(/[^\w.-]+/g, '_')}`, 'A', t.items));
  return out;
}

// ---------------- xmeml (Premiere Pro, Resolve) ----------------
export function writeXmeml(plan: Plan, overlay?: OverlayFile): string {
  const fps = Math.round(plan.fps);
  const rate = `<rate><timebase>${fps}</timebase><ntsc>FALSE</ntsc></rate>`;
  const W = plan.width,
    H = plan.height;
  const fileIds = new Map<string, string>();
  const fileXml = (path: string, name: string, durSec: number, w: number, h: number, hasV: boolean, hasA: boolean): string => {
    const known = fileIds.get(path);
    if (known) return `<file id="${known}"/>`;
    const id = `file-${fileIds.size + 1}`;
    fileIds.set(path, id);
    return `<file id="${id}"><name>${esc(name)}</name><pathurl>${esc(fileUrl(path))}</pathurl>${rate}<duration>${frames(plan, durSec)}</duration><media>${
      hasV ? `<video><samplecharacteristics>${rate}<width>${w}</width><height>${h}</height><anamorphic>FALSE</anamorphic><pixelaspectratio>square</pixelaspectratio><fielddominance>none</fielddominance></samplecharacteristics></video>` : ''
    }${hasA ? '<audio><samplecharacteristics><depth>16</depth><samplerate>48000</samplerate></samplecharacteristics><channelcount>2</channelcount></audio>' : ''}</media></file>`;
  };
  const param = (id: string, name: string, min: number, max: number, vals: { when: number; v: string }[] | null, single: string) => {
    if (!vals) return `<parameter authoringApp="PremierePro"><parameterid>${id}</parameterid><name>${name}</name><valuemin>${min}</valuemin><valuemax>${max}</valuemax><value>${single}</value></parameter>`;
    return `<parameter authoringApp="PremierePro"><parameterid>${id}</parameterid><name>${name}</name><valuemin>${min}</valuemin><valuemax>${max}</valuemax>${vals.map((k) => `<keyframe><when>${k.when}</when><value>${k.v}</value></keyframe>`).join('')}</parameter>`;
  };
  let ci = 0;
  const videoClip = (it: PlanItem) => {
    const id = `clipitem-${++ci}`;
    const a = frames(plan, it.start),
      b = frames(plan, it.start + it.dur);
    const inF = frames(plan, it.srcIn),
      outF = inF + (b - a);
    const sm = it.samples;
    const k = (get: (s: (typeof sm)[number]) => string) => (it.animated ? sm.map((s) => ({ when: frames(plan, s.t), v: get(s) })) : null);
    const s0 = sm[0];
    const motion = `<filter><effect><name>Basic Motion</name><effectid>basic</effectid><effectcategory>motion</effectcategory><effecttype>motion</effecttype><mediatype>video</mediatype>${
      param('scale', 'Scale', 0, 1000, k((s) => String(+((s.s / it.fitContain) * it.fitContain * 100).toFixed(4))), String(+(s0.s * 100).toFixed(4)))
    }${param('rotation', 'Rotation', -8640, 8640, k((s) => String(+s.rot.toFixed(4))), String(+s0.rot.toFixed(4)))}${
      it.animated
        ? `<parameter authoringApp="PremierePro"><parameterid>center</parameterid><name>Center</name>${sm.map((s) => `<keyframe><when>${frames(plan, s.t)}</when><value><horiz>${+((s.cx - W / 2) / W).toFixed(6)}</horiz><vert>${+((s.cy - H / 2) / H).toFixed(6)}</vert></value></keyframe>`).join('')}</parameter>`
        : `<parameter authoringApp="PremierePro"><parameterid>center</parameterid><name>Center</name><value><horiz>${+((s0.cx - W / 2) / W).toFixed(6)}</horiz><vert>${+((s0.cy - H / 2) / H).toFixed(6)}</vert></value></parameter>`
    }</effect></filter>`;
    const needOp = it.animated ? sm.some((s) => s.op !== 1) : s0.op !== 1;
    const opacity = needOp ? `<filter><effect><name>Opacity</name><effectid>opacity</effectid><effectcategory>motion</effectcategory><effecttype>motion</effecttype><mediatype>video</mediatype>${param('opacity', 'opacity', 0, 100, k((s) => String(+(s.op * 100).toFixed(3))), String(+(s0.op * 100).toFixed(3)))}</effect></filter>` : '';
    return `<clipitem id="${id}"><name>${esc(it.name)}</name><enabled>TRUE</enabled><duration>${frames(plan, it.mediaDur) || b - a}</duration>${rate}<start>${a}</start><end>${b}</end><in>${inF}</in><out>${outF}</out>${fileXml(it.path, it.name, it.mediaDur, it.mediaW, it.mediaH, true, it.hasAudio)}${motion}${opacity}</clipitem>`;
  };
  const audioClip = (it: PlanItem, ch: number) => {
    const id = `clipitem-${++ci}`;
    const a = frames(plan, it.start),
      b = frames(plan, it.start + it.dur);
    const inF = frames(plan, it.srcIn);
    const gain = it.volume !== 1 ? `<filter><effect><name>Audio Levels</name><effectid>audiolevels</effectid><effectcategory>audiolevels</effectcategory><effecttype>audiolevels</effecttype><mediatype>audio</mediatype><parameter authoringApp="PremierePro"><parameterid>level</parameterid><name>Level</name><valuemin>0</valuemin><valuemax>3.98109</valuemax><value>${+it.volume.toFixed(5)}</value></parameter></effect></filter>` : '';
    return `<clipitem id="${id}" premiereChannelType="stereo"><name>${esc(it.name)}</name><enabled>TRUE</enabled><duration>${frames(plan, it.mediaDur) || b - a}</duration>${rate}<start>${a}</start><end>${b}</end><in>${inF}</in><out>${inF + (b - a)}</out>${fileXml(it.path, it.name, it.mediaDur, it.mediaW, it.mediaH, it.kind === 'video', true)}${gain}<sourcetrack><mediatype>audio</mediatype><trackindex>${ch}</trackindex></sourcetrack></clipitem>`;
  };
  const vtracks = plan.video.map((t) => `<track>${t.items.map(videoClip).join('')}<enabled>TRUE</enabled><locked>FALSE</locked></track>`);
  if (overlay) {
    const id = `clipitem-${++ci}`;
    const n = frames(plan, overlay.duration);
    vtracks.push(`<track><clipitem id="${id}"><name>Lớp phủ (chữ, hình, hiệu ứng)</name><enabled>TRUE</enabled><duration>${n}</duration>${rate}<start>0</start><end>${n}</end><in>0</in><out>${n}</out><alphatype>straight</alphatype>${fileXml(overlay.path, 'lop-phu.mov', overlay.duration, overlay.width, overlay.height, true, false)}</clipitem><enabled>TRUE</enabled><locked>FALSE</locked></track>`);
  }
  const atracks: string[] = [];
  for (const t of audioItems(plan)) atracks.push(`<track>${t.items.map((it) => audioClip(it, 1)).join('')}<enabled>TRUE</enabled><locked>FALSE</locked></track>`);
  const total = frames(plan, plan.duration);
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE xmeml>
<xmeml version="4"><sequence id="sequence-1"><name>${esc(plan.name)}</name><duration>${total}</duration>${rate}<timecode>${rate}<string>00:00:00:00</string><frame>0</frame><displayformat>NDF</displayformat></timecode><media><video><format><samplecharacteristics>${rate}<width>${W}</width><height>${H}</height><anamorphic>FALSE</anamorphic><pixelaspectratio>square</pixelaspectratio><fielddominance>none</fielddominance></samplecharacteristics></format>${vtracks.join('')}</video><audio><numOutputChannels>2</numOutputChannels><format><samplecharacteristics><depth>16</depth><samplerate>48000</samplerate></samplecharacteristics></format>${atracks.join('')}</audio></media></sequence></xmeml>
`;
}

// ---------------- FCPXML 1.9 (Resolve, Final Cut) ----------------
export function writeFcpxml(plan: Plan, overlay?: OverlayFile): string {
  const fps = Math.round(plan.fps);
  const t = (sec: number) => `${frames(plan, sec)}/${fps}s`;
  const assets = new Map<string, string>();
  let xml = '';
  const asset = (path: string, name: string, durSec: number, hasV: boolean, hasA: boolean): string => {
    let id = assets.get(path);
    if (id) return id;
    id = `r${assets.size + 2}`;
    assets.set(path, id);
    xml += `<asset id="${id}" name="${esc(name)}" start="0s" duration="${t(durSec)}" hasVideo="${hasV ? 1 : 0}" hasAudio="${hasA ? 1 : 0}" format="r1"${hasA ? ' audioSources="1" audioChannels="2" audioRate="48000"' : ''}><media-rep kind="original-media" src="${esc(fileUrl(path))}"/></asset>`;
    return id;
  };
  const lanes: string[] = [];
  plan.video.forEach((tr, vi) => {
    for (const it of tr.items) {
      const ref = asset(it.path, it.name, it.mediaDur, true, it.hasAudio);
      const s0 = it.samples[0];
      // vi tri FCPXML: don vi % chieu cao khung, y huong LEN; xoay nguoc chieu kim dong ho. [chua kiem tren Resolve/Final Cut]
      const pos = `${+(((s0.cx - plan.width / 2) / plan.height) * 100).toFixed(4)} ${+((-(s0.cy - plan.height / 2) / plan.height) * 100).toFixed(4)}`;
      const sc = +(s0.s / it.fitContain).toFixed(5);
      lanes.push(`<asset-clip ref="${ref}" lane="${vi + 1}" offset="${t(it.start)}" name="${esc(it.name)}" start="${t(it.srcIn)}" duration="${t(it.dur)}" tcFormat="NDF" audioRole="dialogue"><adjust-transform position="${pos}" scale="${sc} ${sc}" rotation="${+(-s0.rot).toFixed(4)}"/>${s0.op !== 1 ? `<adjust-blend amount="${+s0.op.toFixed(4)}"/>` : ''}</asset-clip>`);
    }
  });
  if (overlay) {
    const ref = asset(overlay.path, 'lop-phu.mov', overlay.duration, true, false);
    lanes.push(`<asset-clip ref="${ref}" lane="${plan.video.length + 1}" offset="0s" name="Lớp phủ" start="0s" duration="${t(overlay.duration)}" tcFormat="NDF"/>`);
  }
  let al = 0;
  for (const tr of audioItems(plan)) {
    al++;
    for (const it of tr.items) {
      const ref = asset(it.path, it.name, it.mediaDur, it.kind === 'video', true);
      lanes.push(`<asset-clip ref="${ref}" lane="${-al}" offset="${t(it.start)}" name="${esc(it.name)}" start="${t(it.srcIn)}" duration="${t(it.dur)}" tcFormat="NDF" audioRole="dialogue">${it.volume !== 1 ? `<adjust-volume amount="${+(20 * Math.log10(Math.max(it.volume, 1e-4))).toFixed(3)}dB"/>` : ''}</asset-clip>`);
    }
  }
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE fcpxml>
<fcpxml version="1.9"><resources><format id="r1" name="FFVideoFormat${plan.height}p${fps}" frameDuration="1/${fps}s" width="${plan.width}" height="${plan.height}" colorSpace="1-1-1 (Rec. 709)"/>${xml}</resources><library><event name="${esc(plan.name)}"><project name="${esc(plan.name)}"><sequence format="r1" duration="${t(plan.duration)}" tcStart="0s" tcFormat="NDF" audioLayout="stereo" audioRate="48k"><spine><gap name="Nền" offset="0s" start="0s" duration="${t(plan.duration)}">${lanes.join('')}</gap></spine></sequence></project></event></library></fcpxml>
`;
}

// ---------------- After Effects (.jsx) ----------------
const js = (s: string) => JSON.stringify(s).replace(/[\u0080-￿]/g, (c) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));
const n6 = (x: number) => +x.toFixed(6);

/** Script ExtendScript dung lai comp: nhap footage, tao layer co in/out, vi tri/ti le/xoay/do duc (co keyframe), am luong; lop phu tren cung. Khong co hop thoai. */
export function writeAeJsx(plan: Plan, overlay?: OverlayFile): string {
  const L: string[] = [];
  L.push('// Tool Edit -> After Effects: dung lai comp tu dong. Chay: File > Scripts > Run Script File...');
  L.push('(function () {');
  L.push('  var log = [];');
  L.push('  app.beginUndoGroup("Tool Edit import");');
  L.push(`  var comp = app.project.items.addComp(${js(plan.name)}, ${plan.width}, ${plan.height}, 1, ${n6(Math.max(plan.duration, 1 / plan.fps))}, ${plan.fps});`);
  L.push('  var cache = {};');
  L.push('  function foot(p) { if (cache[p]) return cache[p]; var f = new File(p); if (!f.exists) { log.push("THIEU FILE: " + p); return null; } var it = app.project.importFile(new ImportOptions(f)); cache[p] = it; return it; }');
  L.push('  function place(p, start, srcIn, dur, name) { var f = foot(p); if (!f) return null; var l = comp.layers.add(f); l.name = name; l.startTime = start - srcIn; l.inPoint = start; l.outPoint = start + dur; return l; }');
  L.push('  function db(v) { return v <= 0.0001 ? -192 : 20 * Math.log(v) / Math.LN10; }');
  const addVideo = (it: PlanItem) => {
    L.push(`  (function () { var l = place(${js(fwd(it.path))}, ${n6(it.start)}, ${n6(it.srcIn)}, ${n6(it.dur)}, ${js(it.name)}); if (!l) return;`);
    const sm = it.samples;
    if (!it.animated) {
      const s0 = sm[0];
      L.push(`    l.property("Position").setValue([${n6(s0.cx)}, ${n6(s0.cy)}]); l.property("Scale").setValue([${n6(s0.s * 100)}, ${n6(s0.s * 100)}]); l.property("Rotation").setValue(${n6(s0.rot)}); l.property("Opacity").setValue(${n6(s0.op * 100)});`);
    } else {
      const times = `[${sm.map((s) => n6(it.start + s.t)).join(', ')}]`;
      L.push(`    var T = ${times};`);
      L.push(`    l.property("Position").setValuesAtTimes(T, [${sm.map((s) => `[${n6(s.cx)}, ${n6(s.cy)}]`).join(', ')}]);`);
      L.push(`    l.property("Scale").setValuesAtTimes(T, [${sm.map((s) => `[${n6(s.s * 100)}, ${n6(s.s * 100)}]`).join(', ')}]);`);
      L.push(`    l.property("Rotation").setValuesAtTimes(T, [${sm.map((s) => n6(s.rot)).join(', ')}]);`);
      L.push(`    l.property("Opacity").setValuesAtTimes(T, [${sm.map((s) => n6(s.op * 100)).join(', ')}]);`);
    }
    if (it.kind === 'video') {
      if (it.hasAudio && it.volume > 0) L.push(`    try { l.property("Audio Levels").setValue([db(${n6(it.volume)}), db(${n6(it.volume)})]); } catch (e) {}`);
      else L.push('    try { l.audioEnabled = false; } catch (e) {}');
    }
    L.push('  })();');
  };
  for (const tr of plan.video) for (const it of tr.items) addVideo(it);
  for (const tr of plan.audio)
    for (const it of tr.items) {
      L.push(`  (function () { var l = place(${js(fwd(it.path))}, ${n6(it.start)}, ${n6(it.srcIn)}, ${n6(it.dur)}, ${js(it.name)}); if (!l) return; try { l.property("Audio Levels").setValue([db(${n6(it.volume)}), db(${n6(it.volume)})]); } catch (e) {} })();`);
    }
  if (overlay) {
    L.push(`  (function () { var l = place(${js(fwd(overlay.path))}, 0, 0, ${n6(overlay.duration)}, "Lop phu (chu, hinh, hieu ung)"); if (l) { l.property("Position").setValue([${plan.width / 2}, ${plan.height / 2}]); } })();`);
  }
  L.push('  app.endUndoGroup();');
  L.push(`  return "Da dung comp \\"" + comp.name + "\\": " + comp.numLayers + " layer" + (log.length ? "; CANH BAO: " + log.join(" | ") : "");`);
  L.push('})();');
  return L.join('\n') + '\n';
}
