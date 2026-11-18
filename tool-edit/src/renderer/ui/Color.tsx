// Tab "Màu": chinh mau co ban kieu DaVinci (input log, phoi sang, nhiet do/tint, tuong phan + pivot, bao hoa, lift/gamma/gain/offset, duong cong, LUT .cube).
import { useEffect, useRef, useState } from 'react';
import { defaultGrade, defaultLogWheels, defaultQualifier, defaultWindow, isIdentity, LOG_INPUTS, LOG_LABEL, ZERO_WHEEL, type DeepPartialGrade, type Grade, type Pt, type Wheel } from '../../core/grade';
import type { Clip } from '../../core/schema';
import { exportCube, pickLut, setGrade } from '../actions';
import { toggleScopeWin } from './ScopeWindow';
import { clearLive, setLive, settleLive } from '../live';
import { useStore } from '../store';
import { INPUT_SPACES } from '../../core/colorspace';
import { Check, NumField, Row, Section } from './fields';

/** Thanh truot: keo thi cap nhat cuc bo, tha chuot moi ghi (mot buoc hoan tac). */
function Slider({ value, min, max, step, onCommit, onLive, testid }: { value: number; min: number; max: number; step: number; onCommit: (n: number) => void; onLive?: (n: number) => void; testid?: string }) {
  const [v, setV0] = useState(value);
  const vr = useRef(value); // gia tri moi nhat (tranh closure cu khi bam phim nhanh)
  const setV = (n: number) => {
    vr.current = n;
    setV0(n);
  };
  const valr = useRef(value);
  valr.current = value;
  const drag = useRef(false);
  useEffect(() => {
    if (!drag.current) setV(value);
  }, [value]);
  const cm = onCommit;
  const done = () => {
    drag.current = false;
    if (Math.abs(vr.current - valr.current) > 1e-9) cm(vr.current);
    else clearLive();
  };
  return <input type="range" data-testid={testid} min={min} max={max} step={step} value={v} style={{ flex: 1, minWidth: 0 }} onPointerDown={() => (drag.current = true)} onChange={(e) => {
    const n = Number(e.target.value);
    setV(n);
    onLive?.(n); // preview + scope đổi ngay khi kéo, chưa ghi vào dự án
  }} onPointerUp={done} onKeyUp={done} onBlur={() => drag.current && done()} />;
}

function Param({ label, value, min, max, step, onCommit, onLive, id }: { label: string; value: number; min: number; max: number; step: number; onCommit: (n: number) => void; onLive?: (n: number) => void; id: string }) {
  return (
    <Row label={label}>
      <Slider value={value} min={min} max={max} step={step} onCommit={onCommit} onLive={onLive} testid={`s-${id}`} />
      <NumField testid={`g-${id}`} value={value} min={min} max={max} step={step} onCommit={onCommit} />
    </Row>
  );
}

const WHEELS: { key: 'lift' | 'gamma' | 'gain' | 'offset'; label: string; lo: number; hi: number; step: number }[] = [
  { key: 'lift', label: 'Lift (tối)', lo: -0.5, hi: 0.5, step: 0.005 },
  { key: 'gamma', label: 'Gamma (giữa)', lo: -1, hi: 1, step: 0.01 },
  { key: 'gain', label: 'Gain (sáng)', lo: -0.9, hi: 1, step: 0.01 },
  { key: 'offset', label: 'Offset (cả dải)', lo: -0.2, hi: 0.2, step: 0.002 },
];

function WheelEditor({ clip, g, k, label, lo, hi, step }: { clip: Clip; g: Grade; k: 'lift' | 'gamma' | 'gain' | 'offset'; label: string; lo: number; hi: number; step: number }) {
  const w = g[k];
  const set = (c: keyof Wheel, n: number) => void setGrade(clip, { [k]: { [c]: n } } as DeepPartialGrade).then(settleLive);
  const live = (c: keyof Wheel, n: number) => setLive(clip.id, { [k]: { [c]: n } } as DeepPartialGrade);
  const dot = (c: 'r' | 'g' | 'b' | 'm') => ({ r: '#ff5a5a', g: '#5aff7a', b: '#6a8cff', m: '#ddd' })[c];
  return (
    <div style={{ padding: '2px 12px' }}>
      <div className="kbd" style={{ display: 'flex', justifyContent: 'space-between' }}>
        <b>{label}</b>
        <button className="plain" data-testid={`wheel-reset-${k}`} onClick={() => void setGrade(clip, { [k]: { ...ZERO_WHEEL } } as DeepPartialGrade)} title="Đặt lại">↺</button>
      </div>
      {(['m', 'r', 'g', 'b'] as const).map((c) => (
        <div key={c} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ color: dot(c), width: 10 }}>●</span>
          <Slider value={w[c]} min={c === 'm' ? lo : lo / 2} max={c === 'm' ? hi : hi / 2} step={step} onCommit={(n) => set(c, n)} onLive={(n) => live(c, n)} testid={`s-${k}-${c}`} />
          <NumField testid={`g-${k}-${c}`} value={w[c]} step={step} min={-1} max={2} onCommit={(n) => set(c, n)} />
        </div>
      ))}
    </div>
  );
}

const CURVE_SIZE = 168;
type CurveKey = 'master' | 'r' | 'g' | 'b';
const CURVE_COLOR: Record<CurveKey, string> = { master: '#e8e8e8', r: '#ff6060', g: '#60ff80', b: '#7090ff' };

/** Duong cong: bam de them diem, keo de doi, nhap doi de xoa. */
function CurveEditor({ clip, g }: { clip: Clip; g: Grade }) {
  const [ch, setCh] = useState<CurveKey>('master');
  const pts: Pt[] = g.curves[ch] ?? [[0, 0], [1, 1]];
  const [drag, setDrag] = useState<{ i: number; pts: Pt[] } | null>(null);
  const cur = drag?.pts ?? pts;
  const ref = useRef<SVGSVGElement | null>(null);
  const toPt = (e: React.PointerEvent): Pt => {
    const r = ref.current!.getBoundingClientRect();
    return [Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), Math.min(1, Math.max(0, 1 - (e.clientY - r.top) / r.height))];
  };
  const curvePatch = (p: Pt[]) => ({ curves: { [ch]: p.length === 2 && p[0][0] === 0 && p[0][1] === 0 && p[1][0] === 1 && p[1][1] === 1 ? null : p } });
  const commit = (p: Pt[]) => void setGrade(clip, curvePatch(p)).then(settleLive);
  const path = () => {
    // duong gap khuc mau thu tu noi suy that (de nhin): dung chinh evalCurve qua import dong da co
    return cur.map((p, i) => `${i ? 'L' : 'M'}${p[0] * CURVE_SIZE},${(1 - p[1]) * CURVE_SIZE}`).join(' ');
  };
  return (
    <div style={{ padding: '4px 12px' }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
        {(['master', 'r', 'g', 'b'] as CurveKey[]).map((k) => <button key={k} className={ch === k ? 'primary' : ''} data-testid={`curve-ch-${k}`} onClick={() => setCh(k)} style={{ color: ch === k ? undefined : CURVE_COLOR[k] }}>{k === 'master' ? 'Chỉnh' : k.toUpperCase()}</button>)}
        <span className="grow" />
        <button data-testid="curve-s" onClick={() => commit([[0, 0], [0.25, 0.18], [0.75, 0.82], [1, 1]])} title="Đường cong chữ S nhẹ (tăng tương phản)">S</button>
        <button data-testid="curve-reset" onClick={() => void setGrade(clip, { curves: { [ch]: null } })} title="Đặt lại đường cong này">↺</button>
      </div>
      <svg
        ref={ref}
        width="100%"
        viewBox={`0 0 ${CURVE_SIZE} ${CURVE_SIZE}`}
        style={{ background: '#16181c', borderRadius: 4, touchAction: 'none', maxWidth: 260 }}
        data-testid="curve-svg"
        onPointerDown={(e) => {
          const p = toPt(e);
          const near = cur.findIndex((q) => Math.hypot(q[0] - p[0], q[1] - p[1]) < 0.06);
          if (near >= 0) {
            (e.target as Element).setPointerCapture?.(e.pointerId);
            return setDrag({ i: near, pts: cur.map((q) => [...q] as Pt) });
          }
          const np = [...cur, p].sort((a, b) => a[0] - b[0]);
          const i = np.findIndex((q) => q === p);
          (e.target as Element).setPointerCapture?.(e.pointerId);
          setDrag({ i, pts: np });
        }}
        onPointerMove={(e) => {
          if (!drag) return;
          const p = toPt(e);
          const q = drag.pts.map((x) => [...x] as Pt);
          const lo = drag.i > 0 ? q[drag.i - 1][0] + 0.01 : 0,
            hi = drag.i < q.length - 1 ? q[drag.i + 1][0] - 0.01 : 1;
          q[drag.i] = [drag.i === 0 ? 0 : drag.i === q.length - 1 ? 1 : Math.min(hi, Math.max(lo, p[0])), p[1]];
          setDrag({ i: drag.i, pts: q });
          setLive(clip.id, curvePatch(q) as DeepPartialGrade);
        }}
        onPointerUp={() => {
          if (!drag) return;
          const d = drag;
          setDrag(null);
          commit(d.pts);
        }}
        onDoubleClick={(e) => {
          const p = toPt(e as unknown as React.PointerEvent);
          const i = cur.findIndex((q, k) => k > 0 && k < cur.length - 1 && Math.hypot(q[0] - p[0], q[1] - p[1]) < 0.06);
          if (i > 0) commit(cur.filter((_, k) => k !== i));
        }}
      >
        {[0.25, 0.5, 0.75].map((v) => <g key={v}><line x1={v * CURVE_SIZE} y1={0} x2={v * CURVE_SIZE} y2={CURVE_SIZE} stroke="#2a2d33" /><line x1={0} y1={v * CURVE_SIZE} x2={CURVE_SIZE} y2={v * CURVE_SIZE} stroke="#2a2d33" /></g>)}
        <line x1={0} y1={CURVE_SIZE} x2={CURVE_SIZE} y2={0} stroke="#3a3d44" strokeDasharray="3 3" />
        <path d={path()} fill="none" stroke={CURVE_COLOR[ch]} strokeWidth={1.5} />
        {cur.map((p, i) => <circle key={i} cx={p[0] * CURVE_SIZE} cy={(1 - p[1]) * CURVE_SIZE} r={4} fill={CURVE_COLOR[ch]} data-testid={`curve-pt-${i}`} />)}
      </svg>
      <div className="kbd">Bấm: thêm điểm · kéo: đổi · nhấp đôi: xóa điểm</div>
    </div>
  );
}

export function Color() {
  const project = useStore((s) => s.project);
  const selection = useStore((s) => s.selection);
  const clip = selection.length === 1 ? project.clips.find((c) => c.id === selection[0]) : undefined;
  if (!clip || clip.src.type !== 'media') {
    return <div className="scroll"><div className="empty">Chọn một clip <b>video hoặc ảnh</b> trên timeline để chỉnh màu.<br /><br />Xem tab <b>Scope</b> để đo: waveform, parade, vectorscope, histogram.</div></div>;
  }
  const m = project.media.find((x) => x.id === (clip.src as { mediaId: string }).mediaId);
  if (!m || m.kind === 'audio') return <div className="scroll"><div className="empty">Clip âm thanh không chỉnh màu được.</div></div>;
  const g = clip.grade ?? defaultGrade();
  const P = (patch: DeepPartialGrade) => void setGrade(clip, patch).then(settleLive);
  const L = (patch: DeepPartialGrade) => setLive(clip.id, patch);
  return (
    <div className="scroll" data-testid="color">
      <Section title={`Chỉnh màu · clip ${clip.id}`} right={<><button className="plain" data-testid="open-scope-float" onClick={() => toggleScopeWin()} title="Mở / đóng cửa sổ Scope riêng để vừa chỉnh vừa xem (Ctrl+L)">Scope riêng</button>{clip.grade ? <button className="plain" data-testid="grade-reset" onClick={() => void setGrade(clip, null)} title="Xóa mọi chỉnh màu">Đặt lại</button> : null}</>}>
        <Row label="Nguồn (log)">
          <select value={g.input} data-testid="g-input" onChange={(e) => P({ input: e.target.value as never })}>{LOG_INPUTS.map((k) => <option key={k} value={k}>{LOG_LABEL[k]}</option>)}</select>
        </Row>
        <Param id="exposure" label="Phơi sáng (stop)" value={g.exposure} min={-4} max={4} step={0.05} onCommit={(n) => P({ exposure: n })} onLive={(n) => L({ exposure: n })} />
        <Param id="temperature" label="Nhiệt độ" value={g.temperature} min={-100} max={100} step={1} onCommit={(n) => P({ temperature: n })} onLive={(n) => L({ temperature: n })} />
        <Param id="tint" label="Tint" value={g.tint} min={-100} max={100} step={1} onCommit={(n) => P({ tint: n })} onLive={(n) => L({ tint: n })} />
        <Param id="contrast" label="Tương phản" value={g.contrast} min={-1} max={1} step={0.01} onCommit={(n) => P({ contrast: n })} onLive={(n) => L({ contrast: n })} />
        <Param id="pivot" label="Pivot" value={g.pivot} min={0.05} max={0.95} step={0.01} onCommit={(n) => P({ pivot: n })} onLive={(n) => L({ pivot: n })} />
        <Param id="saturation" label="Bão hòa" value={g.saturation} min={0} max={2} step={0.01} onCommit={(n) => P({ saturation: n })} onLive={(n) => L({ saturation: n })} />
        <Param id="mix" label="Mức áp dụng" value={g.mix} min={0} max={1} step={0.01} onCommit={(n) => P({ mix: n })} onLive={(n) => L({ mix: n })} />
        {m.kind === 'video' && g.input !== 'none' && (
          <>
            <Row label="Tone-map">
              <select value={g.tonemap ?? 'none'} data-testid="g-tonemap" onChange={(e) => P({ tonemap: e.target.value as never })}>
                <option value="none">Không (cắt cứng ở trắng)</option>
                <option value="aces">ACES (nén vùng sáng, nên dùng với log)</option>
              </select>
            </Row>
            <div className="kbd" style={{ padding: '0 12px 4px' }}>{INPUT_SPACES[g.input].checked}. Gam màu được đổi sang Rec.709 trước khi chỉnh.</div>
          </>
        )}
      </Section>
      <Section title="Bánh màu (lift / gamma / gain / offset)">
        {WHEELS.map((w) => <WheelEditor key={w.key} clip={clip} g={g} k={w.key} label={w.label} lo={w.lo} hi={w.hi} step={w.step} />)}
      </Section>
      <Section title="Bộ lọc màu (qualifier HSL)" right={<button className="plain" data-testid="q-toggle" onClick={() => P({ qual: g.qual ? ({ enabled: !g.qual.enabled } as never) : ({ enabled: true } as never) })}>{g.qual?.enabled ? 'Tắt' : 'Bật'}</button>}>
        {g.qual?.enabled ? (
          <>
            <div className="kbd" style={{ padding: '0 12px 4px' }}>Chọn màu theo sắc độ / bão hòa / độ sáng, chỉ chỉnh vùng được chọn. Bật "Xem mặt nạ" để thấy vùng chọn (trắng).</div>
            <Param id="q-hue-c" label="Sắc độ (tâm, °)" value={g.qual.hue.center} min={0} max={360} step={1} onCommit={(n) => P({ qual: { hue: { center: n } } })} onLive={(n) => L({ qual: { hue: { center: n } } })} />
            <Param id="q-hue-w" label="Sắc độ (rộng, °)" value={g.qual.hue.width} min={0} max={180} step={1} onCommit={(n) => P({ qual: { hue: { width: n } } })} onLive={(n) => L({ qual: { hue: { width: n } } })} />
            <Param id="q-hue-s" label="Sắc độ (mềm, °)" value={g.qual.hue.soft} min={0} max={90} step={1} onCommit={(n) => P({ qual: { hue: { soft: n } } })} onLive={(n) => L({ qual: { hue: { soft: n } } })} />
            <Param id="q-sat-lo" label="Bão hòa từ" value={g.qual.sat.lo} min={0} max={1} step={0.01} onCommit={(n) => P({ qual: { sat: { lo: n } } })} onLive={(n) => L({ qual: { sat: { lo: n } } })} />
            <Param id="q-sat-hi" label="Bão hòa đến" value={g.qual.sat.hi} min={0} max={1} step={0.01} onCommit={(n) => P({ qual: { sat: { hi: n } } })} onLive={(n) => L({ qual: { sat: { hi: n } } })} />
            <Param id="q-lum-lo" label="Độ sáng từ" value={g.qual.lum.lo} min={0} max={1} step={0.01} onCommit={(n) => P({ qual: { lum: { lo: n } } })} onLive={(n) => L({ qual: { lum: { lo: n } } })} />
            <Param id="q-lum-hi" label="Độ sáng đến" value={g.qual.lum.hi} min={0} max={1} step={0.01} onCommit={(n) => P({ qual: { lum: { hi: n } } })} onLive={(n) => L({ qual: { lum: { hi: n } } })} />
            <Param id="q-soft" label="Mép mềm (bão hòa/sáng)" value={g.qual.sat.soft} min={0} max={1} step={0.01} onCommit={(n) => P({ qual: { sat: { soft: n }, lum: { soft: n } } })} onLive={(n) => L({ qual: { sat: { soft: n }, lum: { soft: n } } })} />
            <Param id="q-adj-hue" label="Xoay sắc độ (°)" value={g.qual.adjust.hue} min={-180} max={180} step={1} onCommit={(n) => P({ qual: { adjust: { hue: n } } })} onLive={(n) => L({ qual: { adjust: { hue: n } } })} />
            <Param id="q-adj-sat" label="Bão hòa (vùng chọn)" value={g.qual.adjust.sat} min={0} max={2} step={0.01} onCommit={(n) => P({ qual: { adjust: { sat: n } } })} onLive={(n) => L({ qual: { adjust: { sat: n } } })} />
            <Param id="q-adj-lum" label="Độ sáng (vùng chọn)" value={g.qual.adjust.lum} min={-0.5} max={0.5} step={0.01} onCommit={(n) => P({ qual: { adjust: { lum: n } } })} onLive={(n) => L({ qual: { adjust: { lum: n } } })} />
            <div style={{ padding: '2px 12px', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <Check testid="q-invert" label="Đảo vùng chọn" value={g.qual.invert} onCommit={(b) => P({ qual: { invert: b } })} />
              <Check testid="q-show" label="Xem mặt nạ" value={g.qual.show} onCommit={(b) => P({ qual: { show: b } })} />
              <button data-testid="q-clear" onClick={() => P({ qual: null })}>Bỏ bộ lọc</button>
            </div>
          </>
        ) : (
          <div className="kbd" style={{ padding: '2px 12px' }}>Chưa bật. Bấm "Bật" rồi chọn màu cần chỉnh (ví dụ chỉ da hoặc chỉ bầu trời).</div>
        )}
      </Section>
      <Section title="Bánh màu theo vùng (shadows / mids / highlights)">
        {(['shadows', 'mids', 'highlights'] as const).map((k) => {
          const w = (g.logw ?? defaultLogWheels())[k];
          const lab = k === 'shadows' ? 'Vùng tối' : k === 'mids' ? 'Vùng giữa' : 'Vùng sáng';
          return (['m', 'r', 'g', 'b'] as const).map((c) => (
            <Param key={k + c} id={`lw-${k}-${c}`} label={`${lab} · ${c === 'm' ? 'chung' : c.toUpperCase()}`} value={w[c]} min={-0.5} max={0.5} step={0.005} onCommit={(n) => P({ logw: { [k]: { [c]: n } } } as never)} onLive={(n) => L({ logw: { [k]: { [c]: n } } } as never)} />
          ));
        })}
        <Param id="lw-sr" label="Ranh giới vùng tối" value={(g.logw ?? defaultLogWheels()).shadowRange} min={0.05} max={0.6} step={0.01} onCommit={(n) => P({ logw: { shadowRange: n } })} onLive={(n) => L({ logw: { shadowRange: n } })} />
        <Param id="lw-hr" label="Ranh giới vùng sáng" value={(g.logw ?? defaultLogWheels()).highlightRange} min={0.4} max={0.95} step={0.01} onCommit={(n) => P({ logw: { highlightRange: n } })} onLive={(n) => L({ logw: { highlightRange: n } })} />
        <div style={{ padding: '2px 12px' }}><button data-testid="lw-clear" disabled={!g.logw} onClick={() => P({ logw: null })}>Đặt lại</button></div>
      </Section>
      <Section title="Cửa sổ (chỉ chỉnh trong một vùng)" right={<button className="plain" data-testid="win-toggle" onClick={() => P({ win: g.win ? ({ enabled: !g.win.enabled } as never) : ({ enabled: true } as never) })}>{g.win?.enabled ? 'Tắt' : 'Bật'}</button>}>
        {g.win?.enabled ? (
          <>
            <Row label="Hình">
              <select value={g.win.shape} data-testid="win-shape" onChange={(e) => P({ win: { shape: e.target.value as never } })}><option value="ellipse">Elip</option><option value="rect">Chữ nhật</option></select>
            </Row>
            <Param id="win-cx" label="Tâm X" value={g.win.cx} min={0} max={1} step={0.005} onCommit={(n) => P({ win: { cx: n } })} onLive={(n) => L({ win: { cx: n } })} />
            <Param id="win-cy" label="Tâm Y" value={g.win.cy} min={0} max={1} step={0.005} onCommit={(n) => P({ win: { cy: n } })} onLive={(n) => L({ win: { cy: n } })} />
            <Param id="win-w" label="Rộng" value={g.win.w} min={0.02} max={2} step={0.01} onCommit={(n) => P({ win: { w: n } })} onLive={(n) => L({ win: { w: n } })} />
            <Param id="win-h" label="Cao" value={g.win.h} min={0.02} max={2} step={0.01} onCommit={(n) => P({ win: { h: n } })} onLive={(n) => L({ win: { h: n } })} />
            <Param id="win-rot" label="Xoay (°)" value={g.win.rot} min={-180} max={180} step={1} onCommit={(n) => P({ win: { rot: n } })} onLive={(n) => L({ win: { rot: n } })} />
            <Param id="win-f" label="Mép mềm" value={g.win.feather} min={0} max={1} step={0.01} onCommit={(n) => P({ win: { feather: n } })} onLive={(n) => L({ win: { feather: n } })} />
            <div style={{ padding: '2px 12px', display: 'flex', gap: 12 }}>
              <Check testid="win-invert" label="Đảo (chỉnh bên ngoài)" value={g.win.invert} onCommit={(b) => P({ win: { invert: b } })} />
              <button data-testid="win-clear" onClick={() => P({ win: null })}>Bỏ cửa sổ</button>
            </div>
          </>
        ) : (
          <div className="kbd" style={{ padding: '2px 12px' }}>Chưa bật. Cửa sổ giới hạn chỉnh màu trong một hình elip hoặc chữ nhật (ví dụ chỉ làm sáng mặt người).</div>
        )}
      </Section>
      <Section title="Đường cong">
        <CurveEditor clip={clip} g={g} />
      </Section>
      <Section title="LUT (.cube)">
        {g.lut ? (
          <>
            <Row label="LUT"><span title={g.lut.path} data-testid="lut-name">{g.lut.name}</span></Row>
            <Param id="lutmix" label="Mục LUT" value={g.lut.mix} min={0} max={1} step={0.01} onCommit={(n) => P({ lut: { ...g.lut!, mix: n } })} onLive={(n) => L({ lut: { ...g.lut!, mix: n } })} />
            <div style={{ padding: '2px 12px' }}><button data-testid="lut-clear" onClick={() => P({ lut: null })}>Bỏ LUT</button></div>
          </>
        ) : (
          <div style={{ padding: '2px 12px' }}><button data-testid="lut-pick" onClick={() => void pickLut(clip)}>Chọn LUT .cube…</button></div>
        )}
        <div style={{ padding: '4px 12px' }}>
          <button data-testid="cube-export" disabled={!clip.grade} onClick={() => void exportCube(clip)}>Xuất grade thành .cube</button>
          <div className="kbd" style={{ marginTop: 4 }}>LUT .cube nhận vào là mã hóa hiển thị (Rec.709/sRGB), chạy theo thứ tự: nguồn → chỉnh màu → LUT. Chỉ hỗ trợ LUT 3D.</div>
        </div>
      </Section>
      <div className="kbd" style={{ padding: '4px 12px' }}>{isIdentity(clip.grade) ? 'Chưa chỉnh gì (không tốn chi phí render).' : 'Đã chỉnh: nướng thành LUT 3D (33³ đến 65³ tùy chỉnh, GPU), không làm chậm phát.'}</div>
    </div>
  );
}
