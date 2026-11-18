// Hop thoai "Xuat sang phan mem khac": chon dich (Premiere, Resolve, CapCut, After Effects, EDL), xem truoc phan chuyen duoc / khong. F-97.
import { useEffect, useMemo, useState } from 'react';
import { buildPlan, overlayFrameCount, TARGETS, type ExportTarget } from '../../core/export-plan';
import { toast } from '../actions';
import { api } from '../bridge';
import { store, useStore } from '../store';

interface TargetView {
  id: ExportTarget;
  verified: string;
  available: boolean;
  unavailable_reason?: string;
}

export function ExportDialog() {
  const open = useStore((s) => s.exportOpen);
  const project = useStore((s) => s.project);
  const [target, setTarget] = useState<ExportTarget>('premiere');
  const [aspect, setAspect] = useState<'project' | '9:16' | '16:9'>('project');
  const [overlay, setOverlay] = useState(true);
  const [install, setInstall] = useState(false);
  const [views, setViews] = useState<Record<string, TargetView>>({});
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!open) return;
    void api('GET', '/export_targets').then((r) => setViews(Object.fromEntries(((r.json?.targets ?? []) as TargetView[]).map((t) => [t.id, t]))));
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && store.set({ exportOpen: false });
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open]);
  const plan = useMemo(() => (open ? buildPlan(project, target, aspect) : null), [open, project, target, aspect]);
  if (!open || !plan) return null;
  const info = TARGETS.find((t) => t.id === target)!;
  const v = views[target];
  const close = () => store.set({ exportOpen: false });
  const nNative = plan.video.reduce((n, t) => n + t.items.length, 0) + plan.audio.reduce((n, t) => n + t.items.length, 0);
  const go = async () => {
    setBusy(true);
    const r = await api('POST', '/export_timeline', { target, aspect, overlay, install: target === 'capcut' && install });
    setBusy(false);
    if (r.status !== 200) return toast(`Không xuất được: ${r.json?.error}`, 'error');
    toast(r.json.overlay_frames ? `Đang vẽ lớp phủ (${r.json.overlay_frames} khung)…` : 'Đang ghi file…');
    close();
  };
  return (
    <div className="modal-bg" data-testid="export-dialog" onPointerDown={(e) => e.target === e.currentTarget && close()}>
      <div className="modal exportdlg">
        <h4>Xuất timeline sang phần mềm khác</h4>
        <div className="targets">
          {TARGETS.map((t) => (
            <label key={t.id} className={`tg${target === t.id ? ' on' : ''}${views[t.id] && !views[t.id].available ? ' off' : ''}`}>
              <input type="radio" name="tg" data-testid={`export-target-${t.id}`} checked={target === t.id} onChange={() => setTarget(t.id)} />
              <b>{t.label}</b>
              <span>{t.files}</span>
            </label>
          ))}
        </div>
        <div className="field"><label>Tỉ lệ khung</label>
          <div className="fv"><select data-testid="export-aspect" value={aspect} onChange={(e) => setAspect(e.target.value as never)}><option value="project">Theo dự án ({project.width}×{project.height})</option><option value="9:16">9:16 (1080×1920)</option><option value="16:9">16:9 (1920×1080)</option></select></div>
        </div>
        {target !== 'edl' && plan.overlay.clipIds.length > 0 && (
          <label className="check"><input type="checkbox" data-testid="export-overlay" checked={overlay} onChange={(e) => setOverlay(e.target.checked)} /> Vẽ sẵn lớp phủ trong suốt cho phần không chuyển được ({plan.overlay.clipIds.length} clip, ~{overlayFrameCount(plan)} khung; bỏ chọn = bỏ phần này)</label>
        )}
        {target === 'capcut' && <label className="check"><input type="checkbox" data-testid="export-install" checked={install} onChange={(e) => setInstall(e.target.checked)} /> Chép luôn vào thư mục bản nháp của CapCut (nên đóng CapCut trước)</label>}
        <div className="exinfo" data-testid="export-summary">
          Chuyển nguyên bản: <b>{nNative}</b> clip video/âm thanh{plan.overlay.clipIds.length ? <>; vào lớp phủ: <b>{plan.overlay.clipIds.length}</b> clip</> : null}.
          <div className="kbd">{info.note}</div>
          <div className="kbd" data-testid="export-verified">Mức kiểm: {v?.verified ?? '…'}</div>
          {v && !v.available && <div className="warn" data-testid="export-unavailable">⚠ {v.unavailable_reason}</div>}
          {plan.warnings.map((w, i) => <div className="warn" key={i} data-testid="export-warning">⚠ {w}</div>)}
        </div>
        <div className="row"><button onClick={close}>Đóng</button><button className="primary" data-testid="export-go" disabled={busy || (v ? !v.available : false)} onClick={() => void go()}>Xuất</button></div>
      </div>
    </div>
  );
}
