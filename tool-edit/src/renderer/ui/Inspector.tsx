// Bang thuoc tinh: bien doi, chu (font, fill/gradient, vien, bong, glow, animator), neo vi tri, preset, nut thoi keyframe.
import { useEffect, useRef, useState } from 'react';
import { prettyCombo } from '../keymap';
import { ANIM_PROPS, findKeyAt, valueAt } from '../../core/anim';
import { PRESETS } from '../../core/presets';
import type { Clip, Project } from '../../core/schema';
import { ANIM_PRESETS, ANIM_UNITS, type TextSpec } from '../../core/text';
import { hasVietnameseDiacritics } from '../../core/vn';
import { SPEED_PRESETS } from '../../core/speed';
import { CHART_KINDS, CHART_LABEL, parseChartData, type ChartSpec } from '../../core/chart';
import { TRANSITION_KINDS, TRANSITION_LABEL, TRANSITION_MAX, type Transition, type TransitionKind } from '../../core/transition';
import { BLEND_LABEL, BLEND_MODES, FX_DEFAULT, FX_LABEL, FX_NAMES, SHAPE_KINDS, type FxName } from '../../core/fx';
import { beginGesture, endGesture, setBlend, setFx } from '../actions';
import { applyPresetAction, applySpeedPreset, clearSpeed, clipLocal, commit, removeBackground, setClipMatte, textBehindPerson, gotoKeyframe, loadFonts, renameProject, setProp, setText, toggleKeyframe } from '../actions';
import { store, useStore } from '../store';
import { Check, ColorField, NumField, Row, Section } from './fields';

/** Nut thoi keyframe + dieu huong khung truoc/sau. */
function Kf({ clip, prop }: { clip: Clip; prop: string }) {
  useStore((s) => (s.playing ? 0 : s.playhead)); // ve lai khi con tro doi
  const keys = clip.keyframes[prop];
  const lt = clipLocal(clip);
  const at = findKeyAt(keys, lt);
  const has = !!keys?.length;
  return (
    <span className="kf" data-prop={prop}>
      {has && <button className="kfn" title="Keyframe trước" onClick={() => gotoKeyframe(clip, prop, -1)}>‹</button>}
      <button className={`kfd${at ? ' on' : has ? ' some' : ''}`} data-testid={`kf-${prop}`} title={at ? 'Xóa keyframe tại con trỏ' : 'Thêm keyframe tại con trỏ'} onClick={() => void toggleKeyframe(clip, prop)}>{at ? '◆' : has ? '◈' : '◇'}</button>
      {has && <button className="kfn" title="Keyframe sau" onClick={() => gotoKeyframe(clip, prop, 1)}>›</button>}
    </span>
  );
}

/** O so + nut thoi: hien gia tri tai con tro; go so khi co keyframe thi ghi keyframe tai con tro. */
function AnimField({ clip, prop, label, mul = 1, step = 1, min, max }: { clip: Clip; prop: string; label: string; mul?: number; step?: number; min?: number; max?: number }) {
  const ph = useStore((s) => (s.playing ? Math.floor(s.playhead * 4) / 4 : s.playhead));
  const lt = Math.round((ph - clip.start) * 1e6) / 1e6;
  const v = valueAt(clip, prop, Math.min(clip.duration, Math.max(0, lt))) * mul;
  return (
    <Row label={label}>
      <NumField testid={`f-${prop}`} value={v} step={step} min={min} max={max} onCommit={(n) => void setProp(clip, prop, n / mul)} />
      <Kf clip={clip} prop={prop} />
    </Row>
  );
}

function FontSelect({ clip, spec }: { clip: Clip; spec: TextSpec }) {
  const fonts = useStore((s) => s.fonts);
  const scanning = useStore((s) => s.fontsScanning);
  useEffect(() => {
    if (!store.get().fonts.length || scanning) {
      void loadFonts();
      const t = setInterval(() => void loadFonts().then(() => !store.get().fontsScanning && clearInterval(t)), 1500);
      return () => clearInterval(t);
    }
  }, [scanning]);
  const cur = fonts.find((f) => f.family.toLowerCase() === spec.font.toLowerCase());
  const vn = hasVietnameseDiacritics(spec.content);
  const good = fonts.filter((f) => f.vietnamese);
  const bad = fonts.filter((f) => !f.vietnamese);
  return (
    <>
      <Row label="Font">
        <select value={spec.font} data-testid="f-font" onChange={(e) => void setText(clip, { font: e.target.value })} title={cur ? '' : 'Font không có trong máy'}>
          {!cur && <option value={spec.font}>{spec.font} (không có trong máy)</option>}
          <optgroup label="Đủ dấu tiếng Việt">{good.map((f) => <option key={f.family} value={f.family}>{f.family}{f.user ? ' ★' : ''}</option>)}</optgroup>
          <optgroup label="Thiếu dấu tiếng Việt">{bad.map((f) => <option key={f.family} value={f.family}>⚠ {f.family}</option>)}</optgroup>
        </select>
      </Row>
      {cur && !cur.vietnamese && vn && <div className="warn" data-testid="warn-vn">⚠ Font này THIẾU ký tự tiếng Việt có dấu: chữ sẽ hiển thị sai. Hãy chọn font trong nhóm "Đủ dấu tiếng Việt".</div>}
      {!cur && fonts.length > 0 && <div className="warn">⚠ Font "{spec.font}" không có trong máy, se bị thay bằng font mặc đỉnh.</div>}
    </>
  );
}

function ContentField({ clip, spec }: { clip: Clip; spec: TextSpec }) {
  const [txt, setTxt] = useState(spec.content);
  const focus = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!focus.current) setTxt(spec.content); // dang go thi khong ghi de bang ban cu dang bay
  }, [spec.content]);
  const push = (v: string) => {
    if (v !== spec.content && v.length <= 2000) void setText(clip, { content: v });
  };
  return (
    <div style={{ padding: '3px 12px' }}>
      <textarea
        data-testid="f-content"
        value={txt}
        rows={3}
        onFocus={() => {
          focus.current = true;
          beginGesture('txt');
        }}
        onChange={(e) => {
          const v = e.target.value;
          setTxt(v);
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => push(v), 60); // doi gan nhu tuc thi, gop cac phim go lien tiep
        }}
        onBlur={() => {
          if (timer.current) clearTimeout(timer.current);
          push(txt);
          focus.current = false;
          endGesture();
        }}
        onKeyDown={(e) => e.stopPropagation()}
      />
    </div>
  );
}

function Stops({ clip, spec }: { clip: Clip; spec: TextSpec }) {
  const stops = spec.fill.stops;
  const set = (next: typeof stops) => void setText(clip, { fill: { stops: next } });
  return (
    <div style={{ padding: '0 12px' }} data-testid="stops">
      {stops.map((s, i) => (
        <div className="stop" key={i}>
          <ColorField testid={`stop-color-${i}`} value={s.color} onCommit={(c) => set(stops.map((x, j) => (j === i ? { ...x, color: c } : x)))} />
          <NumField testid={`stop-pos-${i}`} value={s.pos * 100} min={0} max={100} step={5} onCommit={(n) => set(stops.map((x, j) => (j === i ? { ...x, pos: n / 100 } : x)))} />
          <span style={{ color: 'var(--dim)' }}>%</span>
          <button className="plain" disabled={stops.length <= 2} onClick={() => set(stops.filter((_, j) => j !== i))} title="Xóa điểm">×</button>
        </div>
      ))}
      <button onClick={() => { const a = stops[stops.length - 2], b = stops[stops.length - 1]; set([...stops.slice(0, -1), { pos: (a.pos + b.pos) / 2, color: b.color }, b]); }} data-testid="add-stop">+ Điểm màu</button>
    </div>
  );
}

function TextControls({ clip, spec }: { clip: Clip; spec: TextSpec }) {
  const f = spec.fill;
  return (
    <>
      <Section title="Chữ">
        <ContentField clip={clip} spec={spec} />
        <FontSelect clip={clip} spec={spec} />
        <AnimField clip={clip} prop="text.size" label="Có chữ" step={5} min={1} />
        <Row label="Độ đậm">
          <select value={spec.weight} data-testid="f-weight" onChange={(e) => void setText(clip, { weight: Number(e.target.value) })}>
            {[100, 200, 300, 400, 500, 600, 700, 800, 900].map((w) => <option key={w} value={w}>{w}</option>)}
          </select>
          <Check value={spec.italic} label="Nghiêng" testid="f-italic" onCommit={(b) => void setText(clip, { italic: b })} />
        </Row>
        <Row label="Căn lề">
          <span className="seg">
            {(['left', 'center', 'right'] as const).map((a) => <button key={a} className={spec.align === a ? 'on' : ''} data-testid={`align-${a}`} onClick={() => void setText(clip, { align: a })}>{a === 'left' ? 'Trái' : a === 'center' ? 'Giữa' : 'Phải'}</button>)}
          </span>
        </Row>
        <AnimField clip={clip} prop="text.letterSpacing" label="Giãn chữ" step={1} />
        <AnimField clip={clip} prop="text.lineHeight" label="Giãn dòng" step={0.05} min={0.3} />
        <Row label="Ngắt dòng (%)"><NumField testid="f-maxwidth" value={spec.maxWidth * 100} min={0} max={400} step={5} onCommit={(n) => void setText(clip, { maxWidth: n / 100 })} /></Row>
      </Section>

      <Section title="Màu chữ (fill)">
        <Row label="Kiểu">
          <select value={f.type} data-testid="f-filltype" onChange={(e) => void setText(clip, { fill: { type: e.target.value as TextSpec['fill']['type'] } })}>
            <option value="solid">Đơn sắc</option><option value="linear">Gradient tuyến tính</option><option value="radial">Gradient trộn</option><option value="angular">Gradient góc (conic)</option>
          </select>
        </Row>
        {f.type === 'solid' ? (
          <Row label="Màu"><ColorField testid="f-fillcolor" value={f.color} onCommit={(c) => void setText(clip, { fill: { color: c } })} /></Row>
        ) : (
          <>
            <Stops clip={clip} spec={spec} />
            {(f.type === 'linear' || f.type === 'angular') && <AnimField clip={clip} prop="text.fill.angle" label="Góc (độ)" step={5} />}
            <AnimField clip={clip} prop="text.fill.offset" label={f.type === 'angular' ? 'Xoay vòng' : f.type === 'radial' ? 'Phóng bán kính' : 'Trượt gradient'} step={0.1} />
            {f.type !== 'linear' && (
              <>
                <Row label="Tâm X / Y (%)"><NumField testid="f-fillcx" value={f.cx * 100} step={5} onCommit={(n) => void setText(clip, { fill: { cx: n / 100 } })} /><NumField testid="f-fillcy" value={f.cy * 100} step={5} onCommit={(n) => void setText(clip, { fill: { cy: n / 100 } })} /></Row>
                {f.type === 'radial' && <Row label="Bán kính"><NumField value={f.radius} step={0.1} min={0.05} onCommit={(n) => void setText(clip, { fill: { radius: n } })} /></Row>}
              </>
            )}
          </>
        )}
      </Section>

      <Section title="Viền">
        <Row label="Màu"><ColorField testid="f-strokecolor" value={spec.stroke.color} onCommit={(c) => void setText(clip, { stroke: { color: c } })} /><Check value={spec.stroke.over} label="Đè lên chữ" onCommit={(b) => void setText(clip, { stroke: { over: b } })} /></Row>
        <AnimField clip={clip} prop="text.stroke.width" label="Độ dày" step={1} min={0} />
      </Section>

      <Section title="Bóng đổ">
        <Row label="Màu"><ColorField value={spec.shadow.color} onCommit={(c) => void setText(clip, { shadow: { color: c } })} /></Row>
        <AnimField clip={clip} prop="text.shadow.opacity" label="Độ đục (%)" mul={100} step={5} min={0} max={100} />
        <AnimField clip={clip} prop="text.shadow.blur" label="Mở" step={2} min={0} />
        <AnimField clip={clip} prop="text.shadow.x" label="Lệch X" step={1} />
        <AnimField clip={clip} prop="text.shadow.y" label="Lệch Y" step={1} />
      </Section>

      <Section title="Glow">
        <Row label="Màu"><ColorField testid="f-glowcolor" value={spec.glow.color} onCommit={(c) => void setText(clip, { glow: { color: c } })} /></Row>
        <AnimField clip={clip} prop="text.glow.strength" label="Cường độ" step={0.1} min={0} />
        <AnimField clip={clip} prop="text.glow.radius" label="Bán kính" step={2} min={0} />
      </Section>

      <Section title="Hiệu ứng chữ (animator)">
        <Row label="Kiểu">
          <select value={spec.animator.preset} data-testid="f-animpreset" onChange={(e) => void setText(clip, { animator: { preset: e.target.value as never } })}>
            {ANIM_PRESETS.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </Row>
        {spec.animator.preset !== 'none' && (
          <>
            <Row label="Theo">
              <select value={spec.animator.unit} data-testid="f-animunit" onChange={(e) => void setText(clip, { animator: { unit: e.target.value as never } })}>
                {ANIM_UNITS.map((a) => <option key={a} value={a}>{a === 'char' ? 'ký tự' : a === 'word' ? 'tu' : 'dong'}</option>)}
              </select>
            </Row>
            <Row label="Thời lượng (s)"><NumField value={spec.animator.duration} step={0.05} min={0.001} onCommit={(n) => void setText(clip, { animator: { duration: n } })} /></Row>
            <Row label="Cách nhau (s)"><NumField testid="f-animstagger" value={spec.animator.stagger} step={0.02} min={0} onCommit={(n) => void setText(clip, { animator: { stagger: n } })} /></Row>
            <Row label="Trễ (s)"><NumField value={spec.animator.delay} step={0.1} min={0} onCommit={(n) => void setText(clip, { animator: { delay: n } })} /></Row>
            <Row label="Khoảng trượt"><NumField value={spec.animator.distance} step={5} min={0} onCommit={(n) => void setText(clip, { animator: { distance: n } })} /></Row>
            <Row label="Mờ tối đa"><NumField value={spec.animator.blur} step={2} min={0} onCommit={(n) => void setText(clip, { animator: { blur: n } })} /></Row>
            <Row label="Màu 2"><ColorField value={spec.animator.color} onCommit={(c) => void setText(clip, { animator: { color: c } })} /><Check value={spec.animator.out} label="Chạy ngược ở cuối" onCommit={(b) => void setText(clip, { animator: { out: b } })} /></Row>
          </>
        )}
      </Section>

      <Section title="Preset">
        <PresetPicker clip={clip} />
      </Section>
    </>
  );
}

function PresetPicker({ clip }: { clip: Clip }) {
  const [id, setId] = useState(PRESETS[0].id);
  const pr = PRESETS.find((p) => p.id === id)!;
  return (
    <div style={{ padding: '3px 12px' }}>
      <div style={{ display: 'flex', gap: 6 }}>
        <select value={id} onChange={(e) => setId(e.target.value)} style={{ flex: 1 }} data-testid="preset-select">{PRESETS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
        <button className="primary" data-testid="preset-apply" onClick={() => void applyPresetAction(clip, id)}>Áp dụng</button>
      </div>
      <div className="kbd" style={{ marginTop: 6, lineHeight: 1.5 }}>{pr.description}</div>
    </div>
  );
}

/** Chuyển cảnh VÀO ở đầu clip: với clip liền trước trên cùng track (sát nhau), hoặc hiện dần từ nền nếu không có. */
function TransitionControls({ clip, project }: { clip: Clip; project: Project }) {
  const tn = clip.transition;
  const prev = project.clips.find((x) => x.id !== clip.id && x.track === clip.track && Math.abs(x.start + x.duration - clip.start) < 1e-4);
  const set = (t: Transition | null) => void commit([{ op: 'set_transition', id: clip.id, transition: t }]);
  return (
    <Section title="Chuyển cảnh vào">
      <Row label="Kiểu">
        <select value={tn?.kind ?? ''} data-testid="tn-kind" onChange={(e) => (e.target.value ? set({ kind: e.target.value as TransitionKind, duration: tn?.duration ?? Math.min(0.5, clip.duration) }) : set(null))}>
          <option value="">Không</option>
          {TRANSITION_KINDS.map((k) => <option key={k} value={k}>{TRANSITION_LABEL[k]}</option>)}
        </select>
      </Row>
      {tn && <Row label="Thời lượng (s)"><NumField testid="tn-dur" value={tn.duration} step={0.1} min={0.1} max={Math.min(TRANSITION_MAX, clip.duration)} onCommit={(n) => set({ ...tn, duration: n })} /></Row>}
      <div className="kbd" style={{ padding: '0 12px 6px', lineHeight: 1.5 }}>
        {prev ? 'Chuyển từ clip liền trước: clip trước kéo dài thêm phần đuôi nếu nguồn còn, không thì giữ khung cuối. Âm thanh chưa chéo mờ.' : 'Không có clip liền trước (sát nhau): clip này vào từ nền / lớp bên dưới.'}
      </div>
    </Section>
  );
}

function TransformControls({ clip, project }: { clip: Clip; project: Project }) {
  const m = clip.src.type === 'media' ? project.media.find((x) => x.id === (clip.src as { mediaId: string }).mediaId) : undefined;
  const tf = clip.transform;
  const setT = (patch: Record<string, number | string>) => void commit([{ op: 'set_transform', id: clip.id, patch }] as never);
  return (
    <>
      <Section title="Biến đổi">
        <AnimField clip={clip} prop="transform.x" label="Vị trí X (%)" mul={100} step={1} />
        <AnimField clip={clip} prop="transform.y" label="Vị trí Y (%)" mul={100} step={1} />
        <AnimField clip={clip} prop="transform.scale" label="Tỉ lệ (%)" mul={100} step={5} min={1} />
        <AnimField clip={clip} prop="transform.rotation" label="Xoay (độ)" step={1} />
        <AnimField clip={clip} prop="transform.rotX" label="Xoay 3D ngang (độ)" step={1} />
        <AnimField clip={clip} prop="transform.rotY" label="Xoay 3D dọc (độ)" step={1} />
        {(tf.rotX || tf.rotY || clip.keyframes?.['transform.rotX']?.length || clip.keyframes?.['transform.rotY']?.length) ? <Row label="Phối cảnh"><NumField testid="f-persp" value={tf.persp ?? 1.2} step={0.1} min={0.3} max={20} onCommit={(n) => setT({ persp: n })} /><span className="kbd">nhỏ = méo mạnh</span></Row> : null}
        <AnimField clip={clip} prop="transform.opacity" label="Độ đục (%)" mul={100} step={5} min={0} max={100} />
        {clip.src.type !== 'text' && (
          <Row label="Vừa khung">
            <select value={tf.fit} onChange={(e) => setT({ fit: e.target.value })} data-testid="f-fit"><option value="contain">Vừa (contain)</option><option value="cover">Phủ kín (cover)</option></select>
          </Row>
        )}
      </Section>
      <Section title="Neo vị trí (9:16 và 16:9)">
        <Row label="Neo">
          <select value={tf.anchorH} data-testid="f-anchorh" onChange={(e) => setT({ anchorH: e.target.value })}><option value="left">Trái</option><option value="center">Giữa</option><option value="right">Phải</option></select>
          <select value={tf.anchorV} data-testid="f-anchorv" onChange={(e) => setT({ anchorV: e.target.value })}><option value="top">Trên</option><option value="middle">Giữa</option><option value="bottom">Dưới</option></select>
        </Row>
        <Row label="Lề an toàn (%)"><NumField testid="f-margin" value={tf.margin * 100} step={1} min={0} max={40} onCommit={(n) => setT({ margin: n / 100 })} /></Row>
      </Section>
      {(m?.hasAudio || m?.kind === 'audio') && (
        <Section title="Âm thanh">
          <AnimField clip={clip} prop="volume" label="Âm lượng (%)" mul={100} step={5} min={0} max={300} />
        </Section>
      )}
    </>
  );
}


/** Toc do (co dinh hoac speed ramp theo keyframe) cho clip media. */
function SpeedControls({ clip }: { clip: Clip }) {
  const [pid, setPid] = useState(SPEED_PRESETS[0].id);
  const ramp = !!clip.keyframes.speed?.length;
  const pr = SPEED_PRESETS.find((x) => x.id === pid)!;
  return (
    <Section title="Tốc độ (speed ramp)">
      <AnimField clip={clip} prop="speed" label="Tốc độ (x)" step={0.1} min={0.05} max={16} />
      <Row label="Preset">
        <select value={pid} onChange={(e) => setPid(e.target.value)} data-testid="speed-preset">{SPEED_PRESETS.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
        <button className="primary" data-testid="speed-apply" onClick={() => void applySpeedPreset(clip, pid)}>Áp dụng</button>
      </Row>
      <div className="kbd" style={{ padding: '0 12px 4px', lineHeight: 1.5 }}>{pr.description}</div>
      {(ramp || (clip.speed ?? 1) !== 1) && <Row label=""><button data-testid="speed-clear" onClick={() => void clearSpeed(clip)}>Đặt lại tốc độ 1x</button></Row>}
      <div className="kbd" style={{ padding: '0 12px 6px', lineHeight: 1.5 }}>{ramp ? 'Speed ramp: clip tắt tiếng; sửa đường cong ở tab Đường cong. Không trim đầu được.' : (clip.speed ?? 1) !== 1 ? 'Tốc độ cố định: âm thanh giữ cao độ khi xuất (nghe thử có thẻ đổi cao độ).' : 'Độ dài clip trên timeline giữ nguyên, đoạn nguồn tiêu thụ thay đổi theo tốc độ.'} Cham (&lt;1x) tu tron khung.</div>
    </Section>
  );
}

/** Tach nen (RVM) + chi hien nguoi + chu sau lung nguoi. */
function MatteControls({ clip, project }: { clip: Clip; project: Project }) {
  const jobs = useStore((s) => s.jobs);
  const [txt, setTxt] = useState('CHỮ SAU NGƯỜI');
  const m = project.media.find((x) => x.id === (clip.src as { mediaId: string }).mediaId);
  if (!m || m.kind !== 'video') return null;
  const mm = m.matte ? project.media.find((x) => x.id === m.matte) : undefined;
  const running = jobs.find((j) => j.type === 'matte' && j.state === 'running');
  const mt = clip.matte;
  return (
    <Section title="Tách nền (người)">
      {running && <div style={{ padding: '4px 12px' }} data-testid="matte-progress">Đang tách nền… {Math.round(running.progress * 100)}%<div className="bar" style={{ width: '100%', marginTop: 4 }}><i style={{ width: `${Math.round(running.progress * 100)}%` }} /></div></div>}
      {!mm && !running && (
        <div style={{ padding: '4px 12px' }}>
          <button className="primary" data-testid="matte-run" onClick={() => void removeBackground(m.id)}>Tách nền (RVM, GPU)</button>
          <div className="kbd" style={{ marginTop: 4, lineHeight: 1.5 }}>Tách người ra khỏi nền cho cả video gốc. Chạy nền, khoảng 10 khung/giây trên RTX 3060; không gửi dữ liệu đi đâu.</div>
        </div>
      )}
      {mm && mm.cache?.status !== 'ready' && <div className="kbd" style={{ padding: '4px 12px' }}>Đang chuẩn bị matte…</div>}
      {mm && mm.cache?.status === 'ready' && (
        <>
          <Row label="Chỉ hiện người"><Check value={!!mt} label="" testid="matte-on" onCommit={(b) => void setClipMatte(clip, b ? { lo: 0, hi: 1, feather: 0 } : null)} /></Row>
          {mt && (
            <>
              <Row label="Đen (cắt viền)"><NumField testid="matte-lo" value={mt.lo} step={0.05} min={0} max={0.95} onCommit={(n) => void setClipMatte(clip, { ...mt, lo: Math.min(n, mt.hi - 0.02) })} /></Row>
              <Row label="Trắng"><NumField testid="matte-hi" value={mt.hi} step={0.05} min={0.05} max={1} onCommit={(n) => void setClipMatte(clip, { ...mt, hi: Math.max(n, mt.lo + 0.02) })} /></Row>
              <Row label="Làm mềm viền"><NumField testid="matte-feather" value={mt.feather} step={1} min={0} max={16} onCommit={(n) => void setClipMatte(clip, { ...mt, feather: n })} /></Row>
            </>
          )}
          <div style={{ padding: '4px 12px', display: 'flex', gap: 6 }}>
            <input type="text" value={txt} onChange={(e) => setTxt(e.target.value)} onKeyDown={(e) => e.stopPropagation()} style={{ flex: 1, minWidth: 0 }} data-testid="behind-text" />
            <button className="primary" data-testid="behind-run" onClick={() => void textBehindPerson(clip, txt)} title="Nhân đôi clip lên trên cùng (chỉ người), chữ ở giữa">Chữ sau người</button>
          </div>
          <div className="kbd" style={{ padding: '0 12px 6px', lineHeight: 1.5 }}>Tạo 2 track mới: chữ (giữa) và người tách nền (trên cùng). Video gốc ở dưới.</div>
        </>
      )}
    </Section>
  );
}

const FX_FIELDS: Record<FxName, { prop: string; label: string; step: number; min?: number; max?: number; mul?: number }[]> = {
  backdrop: [{ prop: 'fx.backdrop.radius', label: 'Bán kính mờ (px)', step: 2, min: 0, max: 200 }],
  crop: [{ prop: 'fx.crop.left', label: 'Cắt trái (%)', step: 1, min: 0, max: 95, mul: 100 }, { prop: 'fx.crop.top', label: 'Cắt trên (%)', step: 1, min: 0, max: 95, mul: 100 }, { prop: 'fx.crop.right', label: 'Cắt phải (%)', step: 1, min: 0, max: 95, mul: 100 }, { prop: 'fx.crop.bottom', label: 'Cắt dưới (%)', step: 1, min: 0, max: 95, mul: 100 }],
  blur: [{ prop: 'fx.blur.radius', label: 'Bán kính (px)', step: 2, min: 0, max: 200 }],
  glow: [{ prop: 'fx.glow.radius', label: 'Bán kính', step: 2, min: 0, max: 200 }, { prop: 'fx.glow.intensity', label: 'Cường độ', step: 0.1, min: 0, max: 6 }, { prop: 'fx.glow.threshold', label: 'Ngưỡng', step: 0.05, min: 0, max: 1 }],
  shadow: [{ prop: 'fx.shadow.x', label: 'Lệch X', step: 2 }, { prop: 'fx.shadow.y', label: 'Lệch Y', step: 2 }, { prop: 'fx.shadow.blur', label: 'Mở', step: 2, min: 0, max: 200 }, { prop: 'fx.shadow.opacity', label: 'Độ đục', step: 0.05, min: 0, max: 1 }],
  round: [{ prop: 'fx.round.radius', label: 'Bo góc (%)', step: 1, min: 0, max: 50, mul: 100 }],
  vignette: [{ prop: 'fx.vignette.amount', label: 'Độ tối', step: 0.05, min: 0, max: 1 }, { prop: 'fx.vignette.softness', label: 'Độ mềm', step: 0.05, min: 0, max: 1 }],
  wipe: [{ prop: 'fx.wipe.progress', label: 'Tiến độ', step: 0.05, min: 0, max: 1 }, { prop: 'fx.wipe.angle', label: 'Góc (độ)', step: 5 }, { prop: 'fx.wipe.feather', label: 'Độ mềm', step: 0.02, min: 0, max: 1 }],
};

/** Hieu ung lop + che do tron (Add/Screen/Multiply). */
function FxControls({ clip }: { clip: Clip }) {
  const fx = (clip.fx ?? {}) as Record<string, unknown>;
  const [pick, setPick] = useState<FxName>('glow');
  const have = FX_NAMES.filter((n) => fx[n]);
  const free = FX_NAMES.filter((n) => !fx[n] && (clip.src.type === 'media' || (n !== 'crop' && n !== 'round')));
  return (
    <Section title="Hiệu ứng và chế độ trộn">
      <Row label="Chế độ trộn">
        <select value={clip.blend ?? 'normal'} data-testid="f-blend" onChange={(e) => void setBlend(clip, e.target.value as never)}>{BLEND_MODES.map((b) => <option key={b} value={b}>{BLEND_LABEL[b]}</option>)}</select>
      </Row>
      {have.map((n) => (
        <div key={n} data-testid={`fx-${n}`}>
          <div className="kbd" style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 12px 0' }}>
            <b>{FX_LABEL[n]}</b>
            <button className="plain" data-testid={`fx-${n}-off`} onClick={() => void setFx(clip, { [n]: null })} title="Gỡ hiệu ứng">✕</button>
          </div>
          {FX_FIELDS[n].map((f) => <AnimField key={f.prop} clip={clip} prop={f.prop} label={f.label} step={f.step} min={f.min !== undefined && f.mul ? f.min : f.min} max={f.max} mul={f.mul ?? 1} />)}
          {n === 'glow' && <Row label="Màu"><ColorField value={((fx.glow as { color?: string })?.color || '#ffffff')} onCommit={(c) => void setFx(clip, { glow: { color: c } })} /><button className="plain" onClick={() => void setFx(clip, { glow: { color: '' } })} title="Giữ màu nguồn">goc</button></Row>}
          {n === 'shadow' && <Row label="Màu"><ColorField value={((fx.shadow as { color?: string })?.color || '#000000')} onCommit={(c) => void setFx(clip, { shadow: { color: c } })} /></Row>}
        </div>
      ))}
      {free.length > 0 && (
        <Row label="Thêm">
          <select value={pick} data-testid="fx-pick" onChange={(e) => setPick(e.target.value as FxName)}>{free.map((n) => <option key={n} value={n}>{FX_LABEL[n]}</option>)}</select>
          <button className="primary" data-testid="fx-add" onClick={() => void setFx(clip, { [free.includes(pick) ? pick : free[0]]: { ...FX_DEFAULT[free.includes(pick) ? pick : free[0]] } })}>+</button>
        </Row>
      )}
    </Section>
  );
}

/** Hinh vector: loai, kich thuoc, to, vien, trim. */
function ShapeControls({ clip }: { clip: Clip }) {
  const sp = (clip.src as { shape: import('../../core/fx').ShapeSpec }).shape;
  const set = (patch: Record<string, unknown>) => void commit([{ op: 'set_shape', id: clip.id, patch } as never]);
  return (
    <Section title="Hình">
      <Row label="Loại"><select value={sp.kind} data-testid="shape-kind" onChange={(e) => set({ kind: e.target.value })}>{SHAPE_KINDS.map((k) => <option key={k} value={k}>{k}</option>)}</select></Row>
      <AnimField clip={clip} prop="shape.w" label="Rộng (px)" step={10} min={1} />
      <AnimField clip={clip} prop="shape.h" label="Cao (px)" step={10} min={1} />
      <Row label="Màu to"><ColorField value={sp.fill || '#ffffff'} onCommit={(c) => set({ fill: c })} /><Check value={!!sp.fill} label="có to" onCommit={(b) => set({ fill: b ? '#ffffff' : '' })} /></Row>
      <AnimField clip={clip} prop="shape.fillOpacity" label="Độ đục to" step={0.05} min={0} max={1} />
      <Row label="Màu viền"><ColorField value={sp.stroke.color} onCommit={(c) => set({ stroke: { color: c } })} /></Row>
      <AnimField clip={clip} prop="shape.stroke.width" label="Dày viền (px)" step={1} min={0} />
      {sp.kind === 'rect' && <AnimField clip={clip} prop="shape.radius" label="Bo góc (px)" step={4} min={0} />}
      <AnimField clip={clip} prop="shape.trim" label="Về viền (0..1)" step={0.05} min={0} max={1} />
    </Section>
  );
}

/** Ô chữ một dòng: ghi khi rời ô / Enter (không ghi mỗi phím gõ). */
function TextBox({ value, onCommit, testid, placeholder, multiline }: { value: string; onCommit: (v: string) => void; testid?: string; placeholder?: string; multiline?: boolean }) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  const done = () => v !== value && onCommit(v);
  const common = { value: v, 'data-testid': testid, placeholder, onChange: (e: React.ChangeEvent<HTMLInputElement & HTMLTextAreaElement>) => setV(e.target.value), onBlur: done, onKeyDown: (e: React.KeyboardEvent) => e.stopPropagation(), style: { width: '100%' } as React.CSSProperties };
  return multiline ? <textarea rows={5} {...common} onKeyDown={(e) => e.stopPropagation()} /> : <input type="text" {...common} onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Enter') done(); }} />;
}

function ChartControls({ clip }: { clip: Clip }) {
  const sp = (clip.src as { chart: ChartSpec }).chart;
  const set = (patch: Record<string, unknown>) => void commit([{ op: 'set_chart', id: clip.id, patch } as never]);
  const dataTxt = sp.data.map((d) => `${d.label}: ${d.value}`).join(String.fromCharCode(10));
  const num = sp.kind === 'number';
  return (
    <Section title="Biểu đồ">
      <Row label="Kiểu"><select value={sp.kind} data-testid="chart-kind" onChange={(e) => set({ kind: e.target.value })}>{CHART_KINDS.map((k) => <option key={k} value={k}>{CHART_LABEL[k]}</option>)}</select></Row>
      <Row label="Tiêu đề"><TextBox value={sp.title} testid="chart-title" onCommit={(v) => set({ title: v })} /></Row>
      <div className="kbd" style={{ padding: '2px 12px' }}>{num ? 'Dòng đầu: "Chú thích: giá trị đích".' : 'Dữ liệu, mỗi dòng "Nhãn: giá trị":'}</div>
      <div style={{ padding: '0 12px 4px' }}><TextBox multiline value={dataTxt} testid="chart-data" onCommit={(v) => { const d = parseChartData(v); if (d.length) set({ data: d }); }} /></div>
      {num && <Row label="Đếm từ"><NumField testid="chart-from" value={sp.from} step={10} onCommit={(n) => set({ from: n })} /></Row>}
      <Row label="Tiền tố / hậu tố"><TextBox value={sp.prefix} testid="chart-prefix" onCommit={(v) => set({ prefix: v })} /><TextBox value={sp.suffix} testid="chart-suffix" onCommit={(v) => set({ suffix: v })} /></Row>
      <Row label="Số lẻ"><NumField testid="chart-decimals" value={sp.decimals} step={1} min={0} max={6} onCommit={(n) => set({ decimals: Math.round(n) })} /></Row>
      {!num && <Row label="Trục tối đa"><NumField testid="chart-max" value={sp.max} step={10} min={0} onCommit={(n) => set({ max: n })} /><span className="kbd">0 = tự động</span></Row>}
      <Row label="Rộng / cao (px)"><NumField testid="chart-w" value={sp.w} step={20} min={100} max={4000} onCommit={(n) => set({ w: n })} /><NumField testid="chart-h" value={sp.h} step={20} min={100} max={4000} onCommit={(n) => set({ h: n })} /></Row>
      <Row label="Nền thẻ"><ColorField value={sp.bg} onCommit={(c) => set({ bg: c })} /><NumField testid="chart-bgop" value={sp.bgOpacity} step={0.05} min={0} max={1} onCommit={(n) => set({ bgOpacity: n })} /></Row>
      <Row label="Màu chữ"><ColorField value={sp.textColor} onCommit={(c) => set({ textColor: c })} /></Row>
      <Row label="Bảng màu"><TextBox value={sp.palette.join(', ')} testid="chart-palette" onCommit={(v) => { const p = v.split(/[ ,;]+/).filter((x) => /^#[0-9a-fA-F]{6}$/.test(x)); if (p.length) set({ palette: p }); }} /></Row>
      <Row label="Cỡ chữ"><NumField testid="chart-fs" value={sp.fontSize} step={2} min={8} max={400} onCommit={(n) => set({ fontSize: n })} /></Row>
      {!num && <Row label="Hiển thị"><Check value={sp.grid} label="lưới" onCommit={(b) => set({ grid: b })} /><Check value={sp.valueLabels} label="giá trị" onCommit={(b) => set({ valueLabels: b })} /></Row>}
      <Row label="Hoạt họa vào (s)"><NumField testid="chart-dur" value={sp.duration} step={0.1} min={0} max={20} onCommit={(n) => set({ duration: n })} /></Row>
      <Row label="Trễ / so le (s)"><NumField testid="chart-delay" value={sp.delay} step={0.05} min={0} max={20} onCommit={(n) => set({ delay: n })} /><NumField testid="chart-stagger" value={sp.stagger} step={0.02} min={0} max={5} onCommit={(n) => set({ stagger: n })} /></Row>
      <Row label="Kiểu chậm dần"><select value={sp.ease} data-testid="chart-ease" onChange={(e) => set({ ease: e.target.value })}><option value="out">Nhanh rồi chậm</option><option value="inout">Mượt hai đầu</option><option value="linear">Đều</option></select></Row>
    </Section>
  );
}

export function Inspector() {
  const project = useStore((s) => s.project);
  const selection = useStore((s) => s.selection);
  const clip = selection.length === 1 ? project.clips.find((c) => c.id === selection[0]) : undefined;
  const km = useStore((s) => s.keymap);
  const pc = (id: string) => prettyCombo(km[id]);
  const [nameTxt, setNameTxt] = useState(project.name);
  useEffect(() => setNameTxt(project.name), [project.name]);
  if (!clip) {
    return (
      <div className="scroll">
        <div className="group">
          <h4>Dự án</h4>
          <div className="field"><label>Tên</label><input type="text" value={nameTxt} onChange={(e) => setNameTxt(e.target.value)} onBlur={() => nameTxt !== project.name && void renameProject(nameTxt)} onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); e.stopPropagation(); }} /></div>
          <div className="field"><label>Khung</label><span>{project.width}×{project.height} @ {project.fps} fps</span></div>
          <div className="field"><label>Media / clip</label><span>{project.media.length} / {project.clips.length}</span></div>
        </div>
        <div className="empty">{selection.length > 1 ? `Đã chọn ${selection.length} clip. Kéo để di chuyển cả nhóm, Delete để xóa.` : 'Chọn một clip trên timeline để chỉnh thuộc tính. Bấm "+ Chữ" để thêm chữ.'}</div>
        <div className="empty kbd" style={{ textAlign: 'left', lineHeight: 1.9 }} data-testid="shortcut-hint">
          {pc('play')}: phát/dừng · {pc('split')}: cắt · {pc('delete')}: xóa · {pc('rippleDelete')}: xóa liền<br />
          {pc('undo')} / {pc('redo')}: hoàn tác / làm lại · {pc('save')}: lưu · {pc('addMarker')}: đặt marker<br />
          ←/→: 1 khung · {pc('seekStart')}/{pc('seekEnd')}: về đầu / cuối · Ctrl+cuộn: zoom · Alt+cuộn: cuộn ngang timeline · Alt khi kéo: tắt bám dính<br />
          ◇ cạnh ô số: thêm/xóa keyframe tại con trỏ (kiểu CapCut)<br />
          Đổi phím tắt: nút <b>⚙ Cài đặt</b> trên thanh trên ({pc('settings')})
        </div>
      </div>
    );
  }
  const m = clip.src.type === 'media' ? project.media.find((x) => x.id === (clip.src as { mediaId: string }).mediaId) : undefined;
  const label = clip.src.type === 'text' ? 'Chữ' : m ? m.path.split(/[\\/]/).pop() : 'gen';
  const nKeys = Object.values(clip.keyframes).reduce((a, k) => a + k.length, 0);
  return (
    <div className="scroll" data-testid="inspector">
      <div className="group">
        <h4>Clip {clip.id} · {label}{nKeys > 0 && <span style={{ color: 'var(--sel)' }}> · {nKeys} keyframe</span>}</h4>
        <Row label="Bắt đầu (s)"><NumField testid="f-start" value={clip.start} step={0.1} min={0} onCommit={(n) => void commit([{ op: 'set_clip', id: clip.id, patch: { start: n } }])} /></Row>
        <Row label="Độ dài (s)"><NumField testid="f-duration" value={clip.duration} step={0.1} min={1 / project.fps} onCommit={(n) => void commit([{ op: 'set_clip', id: clip.id, patch: { duration: n } }])} /></Row>
        {clip.src.type === 'media' && <Row label="Lấy từ (s)"><NumField testid="f-in" value={clip.in} step={0.1} min={0} onCommit={(n) => void commit([{ op: 'set_clip', id: clip.id, patch: { in: n } }])} /></Row>}
        {nKeys > 0 && <Row label="Keyframe"><button onClick={() => store.set({ rightTab: 'graph', graphProp: Object.keys(clip.keyframes)[0] ?? null })}>Mở đường cong</button></Row>}
      </div>
      {clip.src.type === 'text' && <TextControls clip={clip} spec={clip.src.text} />}
      <TransformControls clip={clip} project={project} />
      {project.tracks.find((t) => t.id === clip.track)?.kind === 'video' && <TransitionControls clip={clip} project={project} />}
      {clip.src.type === 'shape' && <ShapeControls clip={clip} />}
      {clip.src.type === 'chart' && <ChartControls clip={clip} />}
      {(clip.src.type !== 'media' || m?.kind !== 'audio') && <FxControls clip={clip} />}
      {clip.src.type === 'media' && m && m.kind !== 'image' && <SpeedControls clip={clip} />}
      {clip.src.type === 'media' && m?.kind === 'video' && <MatteControls clip={clip} project={project} />}
    </div>
  );
}

export { ANIM_PROPS };
