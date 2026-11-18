import { useEffect, useState } from 'react';
import { ScopeWindow, loadScopeWin, toggleScopeWin } from './ScopeWindow';
import { toggleDisableSelection, groupSelection, ungroupSelection, separateAudio, copyClips, duplicateClips, pasteClips, addTextClip, addTrack, commit, deleteSelection, ensureThumbs, exportPreset, goHome, importDialog, importFolderDialog, importPaths, loadSettings, openProjectAction, redo, saveProjectAction, select, setLayout, splitAtPlayhead, undo } from '../actions';
import { audio } from '../audio';
import { pvActual, pvFit, pvZoomBy } from '../pview';
import { player } from '../player';
import { store, useStore, DEFAULT_LAYOUT, type State } from '../store';
import { Icon } from './Icon';
import { actionFor, comboOf } from '../keymap';
import { Home } from './Home';
import { SettingsDialog } from './SettingsDialog';
import { Graph } from './Graph';
import { Color } from './Color';
import { Scope } from './Scope';
import { Inspector } from './Inspector';
import { Library } from './Library';
import { Qc } from './Qc';
import { Transcript } from './Transcript';
import { MediaPool, Preview, Proposals, TopBar } from './Panels';
import { Timeline } from './Timeline';
import { ExportDialog } from './ExportDialog';

function Toast() {
  const t = useStore((s) => s.toast);
  if (!t) return null;
  return (
    <div className={`toast ${t.kind}`} data-testid="toast">
      <span>{t.text}</span>
      {t.action && <button onClick={t.action.run}>{t.action.label}</button>}
    </div>
  );
}

function ModalHost() {
  const m = useStore((s) => s.modal);
  const [txt, setTxt] = useState('');
  useEffect(() => {
    if (m?.kind === 'text') setTxt(m.value);
  }, [m]);
  useEffect(() => {
    if (!m) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') m.cancel();
    };
    window.addEventListener('keydown', onKey, true); // capture: o nhap chu goi stopPropagation nen listener bubble se khong thay Esc
    return () => window.removeEventListener('keydown', onKey, true);
  }, [m]);
  if (!m) return null;
  return (
    <div className="modal-bg" data-testid="modal" onPointerDown={(e) => e.target === e.currentTarget && m.cancel()}>
      <div className="modal">
        <h4>{m.title}</h4>
        {m.kind === 'text' ? (
          <>
            <input autoFocus type="text" value={txt} data-testid="modal-input" onChange={(e) => setTxt(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && txt.trim()) m.ok(txt.trim()); e.stopPropagation(); }} />
            <div className="row"><button onClick={m.cancel}>Hủy</button><button className="primary" data-testid="modal-ok" disabled={!txt.trim()} onClick={() => m.ok(txt.trim())}>OK</button></div>
          </>
        ) : (
          <>
            <div className="list">{m.items.map((it) => <button key={it.value} data-testid="modal-item" onClick={() => m.ok(it.value)}>{it.label}</button>)}</div>
            <div className="row"><button onClick={m.cancel}>Hủy</button></div>
          </>
        )}
      </div>
    </div>
  );
}

const TABS: { id: State['rightTab']; label: string; icon: string }[] = [
  { id: 'props', label: 'Thuộc tính', icon: 'sliders' },
  { id: 'color', label: 'Màu', icon: 'palette' },
  { id: 'scope', label: 'Scope', icon: 'activity' },
  { id: 'graph', label: 'Đường cong', icon: 'curve' },
  { id: 'transcript', label: 'Lời thoại', icon: 'message' },
  { id: 'library', label: 'Âm thanh', icon: 'music' },
  { id: 'qc', label: 'Kiểm tra', icon: 'check' },
  { id: 'proposals', label: 'Đề xuất của AI', icon: 'bot' },
];

function Right() {
  const tab = useStore((s) => s.rightTab);
  const pending = useStore((s) => s.proposals.filter((p) => p.status === 'pending').length);
  const scopeOpen = useStore((s) => s.scopeWin.open);
  return (
    <div className="panel right">
      <div className="tabs">
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? 'on' : ''} onClick={() => store.set({ rightTab: t.id })} data-testid={`tab-${t.id}`} title={t.label} aria-label={t.label}>
            <Icon n={t.icon} size={16} />
            <span className="tl">{t.label}</span>
            {t.id === 'proposals' && pending > 0 && <span className="badge" data-testid="badge">{pending}</span>}
          </button>
        ))}
      </div>
      {tab === 'props' ? <Inspector /> : tab === 'color' ? <Color /> : tab === 'scope' ? (scopeOpen ? <div className="empty" data-testid="scope-docked-note">Scope đang mở ở <b>cửa sổ riêng</b> (nổi trên màn hình).<br /><br /><button onClick={() => toggleScopeWin(false)}>Đưa về tab này</button></div> : <Scope />) : tab === 'graph' ? <Graph /> : tab === 'transcript' ? <Transcript /> : tab === 'library' ? <Library /> : tab === 'qc' ? <Qc /> : <Proposals />}
    </div>
  );
}


/** Thanh chia kéo được giữa hai khung. dir 'v' = thanh dọc (đổi bề rộng), 'h' = thanh ngang (đổi chiều cao). */
function Splitter({ area, dir, onDrag, onToggle, testid }: { area: string; dir: 'v' | 'h'; onDrag: (delta: number) => void; onToggle: () => void; testid: string }) {
  const start = (e: React.PointerEvent) => {
    e.preventDefault();
    const el = e.currentTarget as HTMLElement;
    el.setPointerCapture(e.pointerId);
    let last = dir === 'v' ? e.clientX : e.clientY;
    const move = (ev: PointerEvent) => {
      const cur = dir === 'v' ? ev.clientX : ev.clientY;
      onDrag(cur - last);
      last = cur;
    };
    const up = () => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      setLayout({}); // lưu
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
  };
  return <div className={`split ${dir}`} style={{ gridArea: area }} data-testid={testid} onPointerDown={start} onDoubleClick={onToggle} title="Kéo để đổi kích thước · bấm đúp để thu gọn / mở lại" />;
}

const clampN = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));

/** Chạy một hành động phím tắt theo id. */
function runAction(id: string) {
  const s = store.get();
  const fps = s.project.fps;
  const edits = () => [...new Set(s.project.clips.flatMap((c) => [c.start, c.start + c.duration]))].sort((a, b) => a - b);
  switch (id) {
    case 'play': return player.toggle();
    case 'frameBack': return player.seek(Math.max(0, s.playhead - 1 / fps));
    case 'frameFwd': return player.seek(s.playhead + 1 / fps);
    case 'secBack': return player.seek(Math.max(0, s.playhead - 1));
    case 'secFwd': return player.seek(s.playhead + 1);
    case 'prevEdit': { const e = edits().filter((t) => t < s.playhead - 1e-3); return player.seek(e.length ? e[e.length - 1] : 0); }
    case 'nextEdit': { const e = edits().find((t) => t > s.playhead + 1e-3); return e !== undefined ? player.seek(e) : undefined; }
    case 'seekStart': return player.seek(0);
    case 'seekEnd': return player.seek(player.end);
    case 'split': return void splitAtPlayhead();
    case 'delete': return void deleteSelection(false);
    case 'rippleDelete': return void deleteSelection(true);
    case 'undo': return void undo();
    case 'redo': return void redo();
    case 'copy': return void copyClips(false);
    case 'cut': return void copyClips(true);
    case 'paste': return void pasteClips();
    case 'duplicate': return void duplicateClips();
    case 'toggleClip': return void toggleDisableSelection();
    case 'scopeWindow': return toggleScopeWin();
    case 'groupClips': return void groupSelection();
    case 'ungroupClips': return void ungroupSelection();
    case 'separateAudio': return void separateAudio();
    case 'selectAll': return select(s.project.clips.map((c) => c.id));
    case 'deselect': return store.set({ selection: [], draft: null });
    case 'addMarker': return void commit([{ op: 'add_markers', markers: [{ t: Math.round(s.playhead * 1000) / 1000, kind: 'user' }] }]);
    case 'addText': return void addTextClip();
    case 'save': return void saveProjectAction(false);
    case 'saveAs': return void saveProjectAction(true);
    case 'open': return void openProjectAction();
    case 'newProject': return goHome();
    case 'importMedia': return void importDialog();
    case 'importFolder': return void importFolderDialog();
    case 'home': return goHome();
    case 'settings': return store.set({ settingsOpen: !s.settingsOpen });
    case 'export916': return void exportPreset('9:16', -14);
    case 'export169': return void exportPreset('16:9', -14);
    case 'zoomIn': return store.set({ zoom: clampN(s.zoom * 1.25, 8, 600) });
    case 'zoomOut': return store.set({ zoom: clampN(s.zoom / 1.25, 8, 600) });
    case 'zoomFit': { const end = Math.max(1, player.end); return store.set({ zoom: clampN((document.querySelector('.tl-scroll')?.clientWidth ?? 1000) / (end + 1) - 1, 8, 600) }); }
    case 'trackTaller': return setLayout({ trackH: clampN(s.layout.trackH + 0.2, 0.6, 2.6) });
    case 'trackShorter': return setLayout({ trackH: clampN(s.layout.trackH - 0.2, 0.6, 2.6) });
    case 'maxTimeline': return setLayout({ maxed: s.layout.maxed === 'timeline' ? 'none' : 'timeline' }, false);
    case 'maxPreview': return setLayout({ maxed: s.layout.maxed === 'preview' ? 'none' : 'preview' }, false);
    case 'pvZoomIn': return pvZoomBy(1.25);
    case 'pvZoomOut': return pvZoomBy(1 / 1.25);
    case 'pvFit': return pvFit();
    case 'pvActual': return pvActual();
    case 'pvSafe': return store.set({ safeGuides: !s.safeGuides });
    case 'tabProps': return store.set({ rightTab: 'props' });
    case 'tabColor': return store.set({ rightTab: 'color' });
    case 'tabAudio': return store.set({ rightTab: 'library' });
  }
}

export function App() {
  const project = useStore((s) => s.project);
  const view = useStore((s) => s.view);
  const layout = useStore((s) => s.layout);

  // lúc khởi động: nạp cài đặt; mở Trang chủ (trừ khi chạy kiểm thử tự động: ?start=editor)
  useEffect(() => {
    void loadSettings();
    loadScopeWin();
    if (new URLSearchParams(location.search).get('start') !== 'editor') store.set({ view: 'home' });
  }, []);

  // phím tắt toàn cục theo cấu hình (bỏ qua khi đang gõ trong ô nhập)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA')) return;
      if (store.get().settingsOpen || store.get().modal) return;
      const combo = comboOf(e);
      if (!combo) return;
      const id = actionFor(store.get().keymap, combo);
      if (!id) return;
      if (store.get().rightTab === 'graph' && ['copy', 'paste'].includes(id)) return; // tab Đường cong dùng Ctrl+C / Ctrl+V cho keyframe
      if (store.get().view === 'home' && !['settings', 'open', 'home', 'newProject', 'importMedia'].includes(id)) return;
      e.preventDefault();
      runAction(id);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // kéo file / thư mục từ Explorer vào cửa sổ
  useEffect(() => {
    const over = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes('Files')) e.preventDefault();
    };
    const drop = (e: DragEvent) => {
      if (!e.dataTransfer?.files.length) return;
      e.preventDefault();
      const paths = [...e.dataTransfer.files].map((f) => window.toolEdit.pathForFile(f)).filter(Boolean);
      if (store.get().view === 'editor') void importPaths(paths);
    };
    window.addEventListener('dragover', over);
    window.addEventListener('drop', drop);
    return () => {
      window.removeEventListener('dragover', over);
      window.removeEventListener('drop', drop);
    };
  }, []);

  // khi dự án đổi: vẽ lại, giải mã tiếng, tạo thumbnail
  useEffect(() => {
    void ensureThumbs(project);
    void audio.ensure(project).catch(() => {});
    audio.forget(project);
    player.projectChanged();
  }, [project]);

  // thu/phóng tạm một khung: preview vẽ lại khi kích thước đổi
  useEffect(() => {
    player.requestRender();
  }, [layout]);

  void addTrack;
  const mx = layout.maxed;
  const style = {
    gridTemplateColumns: mx === 'timeline' ? '0px 0px 1fr 0px 0px' : `${layout.left}px 6px minmax(260px, 1fr) 6px ${layout.right}px`,
    gridTemplateRows: mx === 'timeline' ? '46px 0px 0px 1fr' : mx === 'preview' ? '46px 1fr 0px 0px' : `46px minmax(120px, 1fr) 6px ${layout.tl}px`,
  } as React.CSSProperties;
  return (
    <>
      {view === 'home' ? <Home /> : (
        <div id="app" style={style}>
          <TopBar />
          <MediaPool />
          <Splitter area="sp1" dir="v" testid="split-left" onDrag={(d) => setLayout({ left: clampN(store.get().layout.left + d, 0, 640) }, false)} onToggle={() => setLayout({ left: layout.left > 0 ? 0 : DEFAULT_LAYOUT.left })} />
          <Preview />
          <Splitter area="sp2" dir="v" testid="split-right" onDrag={(d) => setLayout({ right: clampN(store.get().layout.right - d, 0, 760) }, false)} onToggle={() => setLayout({ right: layout.right > 0 ? 0 : DEFAULT_LAYOUT.right })} />
          <Right />
          <Splitter area="sp3" dir="h" testid="split-timeline" onDrag={(d) => setLayout({ tl: clampN(store.get().layout.tl - d, 70, Math.max(200, window.innerHeight - 200)) }, false)} onToggle={() => setLayout({ tl: layout.tl > 80 ? 70 : DEFAULT_LAYOUT.tl })} />
          <Timeline />
        </div>
      )}
      <ScopeWindow />
      <SettingsDialog />
      <Toast />
      <ModalHost />
      <ExportDialog />
    </>
  );
}
