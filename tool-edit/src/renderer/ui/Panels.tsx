// Cac bang: thanh tren, kho media, preview + thanh phat, thuoc tinh, de xuat cua AI.
import { viText } from '../vi-runtime';
import { useEffect, useRef, useState } from 'react';
import type { Clip, Op, Project } from '../../core/schema';
import type { ProposalView } from '../bridge';
import { CHART_KINDS, CHART_LABEL } from '../../core/chart';
import { addChartClip, setLayout, goHome, importFolderDialog, addMediaToTimeline, addShapeClip, addTextClip, decideProposal, exportPreset, importDialog, newProjectAction, openProjectAction, redo, renameProject, restoreAutosave, saveProjectAction, snapshotCreate, snapshotRestore, splitAtPlayhead, toggleDraft, undo } from '../actions';
import { PRESETS } from '../../core/presets';
import { LevelMeter } from './LevelMeter';
import { Stage } from './Stage';
import { Icon } from './Icon';
import { player, stats } from '../player';
import { store, useStore } from '../store';
import { formatTime } from '../timeline-math';

// ---------------- thanh tren ----------------
export function TopBar() {
  const [norm, setNorm] = useState(true);
  const meta = useStore((s) => s.meta);
  const name = useStore((s) => s.project.name);
  const jobs = useStore((s) => s.jobs);
  const running = jobs.filter((j) => j.state === 'running');
  const exporting = running.some((j) => j.type === 'render');
  const label: Record<string, string> = { media_cache: 'Chuẩn bị video', media_audio: 'Giải mã tiếng', render: 'Xuất', matte: 'Tách nền', transcribe: 'Nhận dạng lời thoại', beats: 'Nhận nhịp' };
  return (
    <div className="top" data-testid="topbar">
      <button onClick={goHome} data-testid="go-home" className="ib" title="Về Trang chủ (Ctrl+H)"><Icon n="home" />Trang chủ</button>
      <span className="name" title={meta.path ?? 'chưa lưu'}><Icon n="film" size={14} />{name}{meta.dirty && <span className="dirty"> ●</span>}</span>
      <span className="grp">
        <button onClick={() => void newProjectAction()} className="ib" title="Dự án mới"><Icon n="file" />Mới</button>
        <button onClick={() => void openProjectAction()} className="ib" title="Mở dự án (Ctrl+O)"><Icon n="folder" />Mở</button>
        <button onClick={() => void saveProjectAction(false)} className="ib" title="Lưu (Ctrl+S)"><Icon n="save" />Lưu</button>
        <button onClick={() => void saveProjectAction(true)} className="ib" title="Lưu thành bản mới (Ctrl+Shift+S)">Lưu thành...</button>
      </span>
      <span className="grp">
        <button onClick={() => void undo()} className="ib" title="Hoàn tác (Ctrl+Z)"><Icon n="undo" />Hoàn tác</button>
        <button onClick={() => void redo()} className="ib" title="Làm lại (Ctrl+Y)"><Icon n="redo" />Làm lại</button>
      </span>
      <span className="grp">
        <button onClick={() => void importDialog()} className="primary ib" data-testid="import-media" title="Nhập file media (Ctrl+I)"><Icon n="download" />Nhập media</button>
        <button onClick={() => void importFolderDialog()} className="ib" data-testid="import-folder" title="Nhập tất cả file media trong một thư mục (cả thư mục con)"><Icon n="folderPlus" />Nhập thư mục</button>
        <button onClick={() => void addTextClip()} data-testid="add-text" className="ib" title="Thêm chữ tại con trỏ (T)"><Icon n="type" />Chữ</button>
        <select value="" data-testid="add-shape" title="Thêm hình vector tại con trỏ" onChange={(e) => { if (e.target.value) void addShapeClip(e.target.value as never); }}>
          <option value="">+ Hình</option>
          <option value="rect">Chữ nhật</option>
          <option value="ellipse">Elip</option>
          <option value="ring">Vòng (viền)</option>
          <option value="star">Sao</option>
        </select>
        <button onClick={() => store.set({ templatesOpen: true })} data-testid="open-templates" className="ib" title="Mẫu dựng sẵn: thẻ kính, tiêu đề, lower third, số liệu, nút, biểu đồ"><Icon n="sparkles" />Mẫu</button>
        <select value="" data-testid="add-chart" title="Thêm biểu đồ / số đếm tại con trỏ" onChange={(e) => { if (e.target.value) void addChartClip(e.target.value as never); e.target.value = ''; }}>
          <option value="">+ Biểu đồ</option>
          {CHART_KINDS.map((k) => <option key={k} value={k}>{CHART_LABEL[k]}</option>)}
        </select>
        <select value="" data-testid="add-preset" onChange={(e) => { if (e.target.value) void addTextClip(e.target.value); e.target.value = ''; }} title="Thêm chữ từ preset">
          <option value="">+ Chữ từ preset...</option>
          {PRESETS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </span>
      <span className="grp">
        <button onClick={() => void snapshotCreate()} className="ib" title="Lưu mốc snapshot"><Icon n="camera" />Snapshot</button>
        <button onClick={() => void snapshotRestore()} className="ib" title="Khôi phục một mốc snapshot"><Icon n="history" />Khôi phục</button>
      </span>
      <span className="grow" />
      <div className="jobs" data-testid="jobs">
        {running.slice(0, 3).map((j) => (
          <span key={j.id} title={j.id} className="job">{label[j.type] ?? j.type} <span className="bar" style={{ display: 'inline-block', verticalAlign: 'middle' }}><i style={{ width: `${Math.round(j.progress * 100)}%` }} /></span></span>
        ))}
      </div>
      <label className="check" title="Chuẩn hóa âm lượng tổng về -14 LUFS (2 lượt, tuyến tính)"><input type="checkbox" checked={norm} data-testid="norm-lufs" onChange={(e) => setNorm(e.target.checked)} /> -14 LUFS</label>
      <button disabled={exporting} onClick={() => void exportPreset('9:16', norm ? -14 : undefined)} className="primary ib" data-testid="export916"><Icon n="upload" />Xuất 9:16</button>
      <button disabled={exporting} onClick={() => void exportPreset('16:9', norm ? -14 : undefined)} className="primary ib" data-testid="export169"><Icon n="upload" />Xuất 16:9</button>
      <button onClick={() => store.set({ exportOpen: true })} data-testid="export-to" className="ib" title="Xuất timeline sang Premiere, DaVinci Resolve, CapCut, After Effects, EDL"><Icon n="upload" />Xuất sang…</button>
      <button onClick={() => store.set({ settingsOpen: true })} data-testid="open-settings" className="ib" title="Cài đặt và phím tắt (Ctrl+,)"><Icon n="gear" />Cài đặt</button>
    </div>
  );
}

// ---------------- kho media ----------------
export function MediaPool() {
  const media = useStore((s) => s.project.media).filter((m) => m.role !== 'matte'); // media matte la phu, an
  const thumbs = useStore((s) => s.thumbs);
  const autosave = useStore((s) => s.autosave);
  const hasClips = useStore((s) => s.project.clips.length > 0);
  const chip = (m: (typeof media)[number]) => {
    if (m.kind === 'audio') return m.cache?.audio === 'ready' ? 'tiếng' : 'đang giải mã';
    if (m.cache?.status === 'error') return 'loi';
    if (m.cache?.status !== 'ready') return 'đang chuẩn bị';
    return m.kind === 'image' ? 'anh' : `${m.duration.toFixed(1)}s`;
  };
  return (
    <div className="panel pool" data-testid="pool">
      <h3>Media<span className="grow" /><button className="plain" data-testid="pool-add" title="Nhập file media" onClick={() => void importDialog()}>+ File</button><button className="plain" data-testid="pool-add-folder" title="Nhập cả thư mục" onClick={() => void importFolderDialog()}>+ Thư mục</button></h3>
      <div className="scroll">
        {autosave?.exists && !hasClips && media.length === 0 && (
          <div className="autosave" data-testid="autosave-banner">
            Có phiên chưa lưu: <b>{autosave.name}</b> ({autosave.clips} clip, {new Date(autosave.mtime!).toLocaleString()}).
            <div className="row"><button className="primary" onClick={() => void restoreAutosave()}>Khôi phục</button><button onClick={() => store.set({ autosave: null })}>Bỏ qua</button></div>
          </div>
        )}
        {media.length === 0 ? (
          <div className="empty">Chưa có media.<br />Bấm <b>+ Nhập media</b> hoặc kéo file từ Explorer thả vào cửa sổ.</div>
        ) : (
          <div className="media-grid">
            {media.map((m) => (
              <div
                key={m.id}
                className="media"
                data-media={m.id}
                draggable
                title={m.path}
                onDragStart={(e) => {
                  e.dataTransfer.setData('application/x-tool-edit-media', m.id);
                  e.dataTransfer.effectAllowed = 'copy';
                }}
                onDoubleClick={() => void addMediaToTimeline(m.id)}
              >
                <div className="th" style={thumbs[m.id] ? { backgroundImage: `url(${thumbs[m.id]})` } : undefined}>{!thumbs[m.id] && (m.kind === 'audio' ? '♪' : '▶')}</div>
                <span className="chip">{chip(m)}</span>
                <button className="add" onClick={() => void addMediaToTimeline(m.id)} title="Thêm vào timeline tại con trỏ">+</button>
                <div className="meta"><b>{m.path.split(/[\\/]/).pop()}</b>{m.kind === 'audio' ? 'âm thanh' : `${m.width}x${m.height}`}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------- preview + thanh phat ----------------
export function Preview() {
  const aspect = useStore((s) => s.aspect);
  const playing = useStore((s) => s.playing);
  const t = useStore((s) => s.playhead);
  const fps = useStore((s) => s.project.fps);
  const viewMode = useStore((s) => s.viewMode);
  const maxedPv = useStore((s) => s.layout.maxed === 'preview');
  useEffect(() => {
    player.requestRender();
  }, [aspect, viewMode]);
  const step = (n: number) => {
    if (store.get().playing) player.pause();
    player.seek(Math.max(0, store.get().playhead + n / fps));
  };
  return (
    <div className="panel preview" data-testid="preview">
      <h3>Xem trước<span className="grow" />
        <span className="seg" title="Chế độ xem (chỉ preview, không vào file xuất)">
          <button className={viewMode === 'false' ? 'on' : ''} data-testid="view-false" onClick={() => store.set({ viewMode: viewMode === 'false' ? 'none' : 'false' })}>Màu giả</button>
          <button className={viewMode === 'clip' ? 'on' : ''} data-testid="view-clip" onClick={() => store.set({ viewMode: viewMode === 'clip' ? 'none' : 'clip' })}>Clip</button>
        </span>
        <button className="plain" data-testid="max-preview" onClick={() => setLayout({ maxed: store.get().layout.maxed === 'preview' ? 'none' : 'preview' }, false)} title="Phóng to / thu lại khung xem (Shift+P)"><Icon n={maxedPv ? 'minimize' : 'maximize'} />{maxedPv ? 'Thu lại' : 'Phóng to'}</button>
        <span className="seg">
          <button className={aspect === '9:16' ? 'on' : ''} onClick={() => store.set({ aspect: '9:16' })}>9:16</button>
          <button className={aspect === '16:9' ? 'on' : ''} onClick={() => store.set({ aspect: '16:9' })}>16:9</button>
        </span>
      </h3>
      <div className="stagewrap">
      <Stage />
      <LevelMeter />
      </div>
      <div className="transport">
        <button className="ib sq" onClick={() => player.seek(0)} title="Về đầu (Home)"><Icon n="skipBack" size={15} /></button>
        <button className="ib sq" onClick={() => step(-1)} title="Lùi 1 khung (←)"><Icon n="stepBack" size={16} /></button>
        <button className="primary ib playbtn" onClick={() => player.toggle()} data-testid="play" title="Phát/dừng (Space)"><Icon n={playing ? 'pause' : 'play'} size={16} /></button>
        <button className="ib sq" onClick={() => step(1)} title="Tiến 1 khung (→)"><Icon n="stepFwd" size={16} /></button>
        <button className="ib sq" onClick={() => player.seek(player.end)} title="Tới cuối (End)"><Icon n="skipFwd" size={15} /></button>
        <span className="time" data-testid="time">{formatTime(t, fps)}</span>
        <span className="grow" />
        <button className="ib" onClick={() => void splitAtPlayhead()} title="Cắt clip tại con trỏ"><Icon n="scissors" />Cắt</button>
      </div>
    </div>
  );
}

// ---------------- de xuat cua AI ----------------
function describeOp(o: any): string {
  switch (o.op) {
    case 'add_track': return `thêm track ${o.track?.id}`;
    case 'add_clip': return `thêm clip ${o.clip?.id}`;
    case 'remove_clip': return `xóa clip ${o.id}`;
    case 'set_clip': return `sửa clip ${o.id}`;
    case 'set_transform': return `biến đổi clip ${o.id}`;
    case 'split_clip': return `cắt clip ${o.id}`;
    case 'ripple_delete': return `xóa liền clip ${o.id}`;
    default: return o.op;
  }
}

export function Proposals() {
  const proposals = useStore((s) => s.proposals);
  const project = useStore((s) => s.project);
  const draft = useStore((s) => s.draft);
  const pending = proposals.filter((p) => p.status === 'pending');
  const invalid = proposals.filter((p) => p.status === 'invalid').length;
  return (
    <div className="scroll" data-testid="proposals">
      {pending.length === 0 && <div className="empty">Không có đề xuất nào đang chờ.<br />Khi AI gợi <b>propose_ops</b>, đề xuất hiện ở đây để bạn xem thử, chấp nhận hoặc từ chối.{invalid ? <><br /><span className="kbd">({invalid} đề xuất sai đã bị từ chối tự động)</span></> : null}</div>}
      {pending.map((p) => <ProposalCard key={p.id} p={p} project={project} previewing={draft?.id === p.id} />)}
    </div>
  );
}

function ProposalCard({ p, project, previewing }: { p: ProposalView; project: Project; previewing: boolean }) {
  const selectable = (p.ops as Op[]).map((o, i) => (o.op === 'add_clip' ? i : -1)).filter((i) => i >= 0);
  const [checked, setChecked] = useState<Set<number>>(new Set(selectable));
  const subset = selectable.length > 1;
  const lines = summarize(p.ops as Op[], project);
  return (
    <div className="prop" data-proposal={p.id} data-testid={`prop-${p.id}`}>
      <div className="hd"><span className="src">{p.source}</span><span>{p.id}</span><span style={{ marginLeft: 'auto', color: 'var(--dim)' }}>{new Date(p.createdAt).toLocaleTimeString()}</span></div>
      {p.note && <div className="note">{viText(p.note)}</div>}
      <div className="diff">{lines.map((l, i) => (
        <div key={i} className={l.kind}>
          {subset && selectable.includes(l.op) && <input type="checkbox" checked={checked.has(l.op)} data-testid={`pick-${p.id}-${l.op}`} onChange={(e) => { const n = new Set(checked); e.target.checked ? n.add(l.op) : n.delete(l.op); setChecked(n); }} />} {l.text}
        </div>
      ))}</div>
      {subset && <div className="kbd" style={{ padding: '0 10px 6px' }}>Bỏ tick mục không thich: chỉ các mục được chọn se được áp dụng ({checked.size}/{selectable.length}).</div>}
      <div className="act">
        <button onClick={() => void toggleDraft(p.id)} className={previewing ? 'primary' : ''} data-testid={`preview-${p.id}`}>{previewing ? 'Đang xem thử' : 'Xem thử'}</button>
        <span className="grow" />
        <button onClick={() => void decideProposal(p.id, false)} data-testid={`reject-${p.id}`}>Từ chối</button>
        <button className="primary" onClick={() => void decideProposal(p.id, true, subset && checked.size < selectable.length ? [...checked] : undefined)} data-testid={`accept-${p.id}`} disabled={subset && checked.size === 0}>Chấp nhận{subset && checked.size < selectable.length ? ` ${checked.size} mục` : ''}</button>
      </div>
    </div>
  );
}

/** Tom tat de xuat thanh cac dong +/-/~ de nguoi duyet doc nhanh. `op` = chi so op trong de xuat (de duyet tung muc). */
function summarize(ops: Op[], project: { clips: Clip[] }): { kind: 'add' | 'del' | 'mod'; text: string; op: number }[] {
  const out: { kind: 'add' | 'del' | 'mod'; text: string; op: number }[] = [];
  const t = (x: number) => `${Math.round(x * 100) / 100}s`;
  const kv = (patch: Record<string, unknown>) => Object.entries(patch).map(([k, v]) => `${k}=${typeof v === 'number' ? Math.round((v as number) * 1000) / 1000 : v}`).join(', ');
  (ops as any[]).forEach((o, op) => {
    const push = (kind: 'add' | 'del' | 'mod', text: string) => out.push({ kind, text: viText(text), op });
    if (o.op === 'add_clip') push('add', `+ clip ${o.clip.id} [${o.clip.track}] ${t(o.clip.start)}→${t(o.clip.start + o.clip.duration)}${o.clip.tag ? ' · ' + o.clip.tag : ''}${o.clip.src?.mediaId ? ' (' + o.clip.src.mediaId + ')' : ''}`);
    else if (o.op === 'add_track') push('add', `+ track ${o.track.id} (${o.track.kind}${o.track.name ? ', ' + o.track.name : ''})`);
    else if (o.op === 'add_media') push('add', `+ media ${o.media.id}: ${String(o.media.path).split(/[\\/]/).pop()}`);
    else if (o.op === 'remove_clip') push('del', `- xóa clip ${o.id}${(() => { const c = project.clips.find((x) => x.id === o.id); return c ? ` (${t(c.start)}→${t(c.start + c.duration)})` : ''; })()}`);
    else if (o.op === 'ripple_delete') push('del', `- xóa liền clip ${o.id}`);
    else if (o.op === 'remove_ranges') push('del', `- cắt ${o.ranges.length} đoạn khỏi clip ${o.id} (${t(o.ranges.reduce((a: number, r: any) => a + (r.e - r.s), 0))}): ${o.ranges.slice(0, 4).map((r: any) => `${t(r.s)}–${t(r.e)}`).join(', ')}${o.ranges.length > 4 ? '…' : ''}`);
    else if (o.op === 'split_clip') push('mod', `~ cắt clip ${o.id} tai ${t(o.at)}`);
    else if (o.op === 'set_chart') push('mod', `~ biểu đồ ${o.id}: ${Object.keys(o.patch).join(', ')}`);
    else if (o.op === 'set_transition') push('mod', o.transition ? `~ chuyển cảnh clip ${o.id}: ${o.transition.kind} ${o.transition.duration}s` : `~ gỡ chuyển cảnh clip ${o.id}`);
    else if (o.op === 'group_clips') push('mod', `~ ghép ${o.ids.length} clip thành nhóm ${o.group}`);
    else if (o.op === 'ungroup') push('mod', `~ hủy ghép nhóm ${o.group}`);
    else if (o.op === 'set_clip' || o.op === 'set_transform') push('mod', `~ clip ${o.id}: ${kv(o.patch)}`);
    else if (o.op === 'generate_captions') push('add', `+ phụ đề ${o.opts.style} cho clip ${o.id}`);
    else if (o.op === 'remove_captions') push('del', `- xóa phụ đề của clip ${o.id}`);
    else if (o.op === 'duck_clip') push('mod', `~ duck nhạc ${o.id}: ${o.opts?.amountDb ?? -14} dB duoi loi thoai`);
    else if (o.op === 'add_markers') push('add', `+ ${o.markers.length} marker (${o.markers[0]?.kind})`);
    else if (o.op === 'edit_word') push('mod', `~ sửa từ #${o.index} thanh "${o.text}"`);
    else if (o.op === 'set_text') push('mod', `~ chữ ${o.id}: ${Object.keys(o.patch).join(', ')}`);
    else if (o.op === 'set_keyframes' || o.op === 'set_keyframe') push('mod', `~ keyframe ${o.id}.${o.prop}`);
    else if (o.op === 'set_speed') push('mod', `~ tốc độ clip ${o.id}: ${o.speed}x`);
    else if (o.op === 'set_clip_matte') push('mod', o.matte ? `~ chỉ hiện người (matte) clip ${o.id}: mục ${o.matte.lo}..${o.matte.hi}, mềm ${o.matte.feather}` : `~ gỡ matte clip ${o.id}`);
    else if (o.op === 'set_fx') push('mod', o.fx === null ? `~ gỡ hết hiệu ứng clip ${o.id}` : `~ hiệu ứng clip ${o.id}: ${Object.entries(o.fx).map(([k, v]) => (v === null ? `bo ${k}` : k)).join(', ')}`);
    else if (o.op === 'set_blend') push('mod', `~ chế độ trộn clip ${o.id}: ${o.blend}`);
    else if (o.op === 'set_shape') push('mod', `~ hình ${o.id}: ${Object.keys(o.patch).join(', ')}`);
    else if (o.op === 'apply_preset') push('mod', `~ preset ${o.preset} cho clip ${o.id}`);
    else push('mod', describeOp(o));
  });
  return out;
}

export { stats };
