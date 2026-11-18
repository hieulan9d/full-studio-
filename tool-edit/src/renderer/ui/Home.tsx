// Trang chủ: tạo dự án mới, mở/đổi tên/nhân bản/xóa dự án cũ, khôi phục phiên chưa lưu.
import { useEffect, useMemo, useState } from 'react';
import { api } from '../bridge';
import { createProject, duplicateProjectFile, forgetProjectFile, goEditor, loadProjects, openProjectFile, openProjectAction, renameProjectFile, restoreAutosave, trashProjectFile, type ProjectCard } from '../actions';
import { store, useStore } from '../store';

const fmtDur = (s: number) => (s >= 60 ? `${Math.floor(s / 60)} phút ${Math.round(s % 60)} giây` : `${s.toFixed(1)} giây`);
const fmtSize = (b: number) => (b > 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1e3))} KB`);

export function Home() {
  const [list, setList] = useState<ProjectCard[]>([]);
  const [dir, setDir] = useState('');
  const [q, setQ] = useState('');
  const [name, setName] = useState('');
  const [aspect, setAspect] = useState<'9:16' | '16:9'>('9:16');
  const [loading, setLoading] = useState(true);
  const autosave = useStore((s) => s.autosave);
  const cur = useStore((s) => s.project);
  const meta = useStore((s) => s.meta);
  const refresh = async () => {
    const r = await loadProjects();
    setList(r.projects);
    setDir(r.dir);
    setLoading(false);
  };
  useEffect(() => {
    void refresh();
    void api('GET', '/project/autosave').then((r) => store.set({ autosave: r.json?.exists ? r.json : null }));
  }, []);
  const shown = useMemo(() => list.filter((p) => !q || p.name.toLowerCase().includes(q.toLowerCase())), [list, q]);
  const hasWork = cur.clips.length > 0 || cur.media.length > 0;
  return (
    <div className="home" data-testid="home">
      <div className="home-in">
        <header>
          <h1>Tool Edit</h1>
          <span className="kbd">Phần mềm dựng video cho người và AI · Trang chủ</span>
          <span className="grow" />
          {hasWork && <button className="primary" data-testid="home-continue" onClick={goEditor}>Tiếp tục dự án đang mở: {cur.name}{meta.dirty ? ' •' : ''}</button>}
          <button data-testid="home-open" onClick={() => void openProjectAction().then(() => store.get().meta.path && goEditor())}>Mở dự án…</button>
        </header>

        <section className="home-new">
          <h2>Dự án mới</h2>
          <div className="home-form">
            <input type="text" placeholder="Tên dự án" value={name} data-testid="home-name" onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Enter') void createProject(name || 'Dự án mới', aspect); }} />
            <span className="seg">
              <button className={aspect === '9:16' ? 'on' : ''} data-testid="home-9x16" onClick={() => setAspect('9:16')}>9:16 dọc</button>
              <button className={aspect === '16:9' ? 'on' : ''} data-testid="home-16x9" onClick={() => setAspect('16:9')}>16:9 ngang</button>
            </span>
            <button className="primary" data-testid="home-create" onClick={() => void createProject(name || 'Dự án mới', aspect).then(refresh)}>Tạo dự án</button>
          </div>
          <div className="kbd">Dự án được lưu trong: {dir || '…'} {dir && <button className="plain" onClick={() => void window.toolEdit.showInFolder(dir)}>mở thư mục</button>}</div>
        </section>

        {autosave?.exists && (
          <section className="home-restore" data-testid="home-autosave">
            Có phiên chưa lưu: <b>{autosave.name}</b> ({autosave.clips} clip, {new Date(autosave.mtime!).toLocaleString('vi-VN')}).
            <button onClick={() => void restoreAutosave().then(goEditor)}>Khôi phục</button>
            <button onClick={() => store.set({ autosave: null })}>Bỏ qua</button>
          </section>
        )}

        <section>
          <div className="home-head">
            <h2>Dự án gần đây</h2>
            <input type="text" placeholder="Tìm theo tên…" value={q} data-testid="home-search" onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.stopPropagation()} />
          </div>
          {loading ? <div className="empty">Đang tải…</div> : shown.length === 0 ? <div className="empty">{list.length ? 'Không có dự án nào khớp.' : 'Chưa có dự án nào. Hãy tạo dự án mới ở trên hoặc mở một file .tedit.'}</div> : (
            <div className="home-grid">
              {shown.map((p) => (
                <div key={p.path} className={`pcard${p.current ? ' cur' : ''}`} data-project={p.name} data-testid="project-card">
                  <div className="pcard-main" onDoubleClick={() => void openProjectFile(p.path)}>
                    <b title={p.path}>{p.name}{p.current && <span className="chip2">đang mở</span>}</b>
                    <span className="kbd">{p.ok ? `${p.clips} clip · ${p.media} media · ${fmtDur(p.duration)}` : 'file không đọc được'}</span>
                    <span className="kbd">{p.width ? `${p.width}×${p.height} · ${p.fps} fps · ` : ''}{fmtSize(p.size)}</span>
                    <span className="kbd">Sửa lần cuối: {new Date(p.mtime).toLocaleString('vi-VN')}</span>
                  </div>
                  <div className="pcard-act">
                    <button className="primary" data-testid="project-open" disabled={!p.ok} onClick={() => void openProjectFile(p.path)}>Mở</button>
                    <button data-testid="project-rename" onClick={() => void renameProjectFile(p).then((ok) => { if (ok) void refresh(); })}>Đổi tên</button>
                    <button data-testid="project-dup" onClick={() => void duplicateProjectFile(p).then((ok) => { if (ok) void refresh(); })}>Nhân bản</button>
                    <button className="plain" title="Bỏ khỏi danh sách (không xóa file)" data-testid="project-forget" onClick={() => void forgetProjectFile(p).then(refresh)}>Bỏ khỏi danh sách</button>
                    <button className="plain danger" data-testid="project-trash" onClick={() => void trashProjectFile(p).then((ok) => { if (ok) void refresh(); })}>Xóa</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
