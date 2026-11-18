// Diem vao renderer: khoi tao engine WebGPU, dong bo trang thai tu tien trinh chinh, mount giao dien React.
import './bridge';
import { createRoot } from 'react-dom/client';
import { api } from './bridge';
import { audio } from './audio';
import { initEngine, pruneMedia, stats } from './engine';
import { player } from './player';
import { refreshJobs, refreshProposals } from './actions';
import { store } from './store';
import { selfTest } from './selftest';
import { App } from './ui/App';

async function main() {
  const info = await initEngine();
  const root = document.getElementById('root')!;

  if (location.search.includes('selftest')) {
    window.toolEdit.ready(info);
    await selfTest();
    return;
  }

  // trang thai du an tu main
  window.toolEdit.onState(({ project, meta }) => {
    const sel = store.get().selection.filter((id) => project.clips.some((c) => c.id === id));
    const draft = store.get().draft;
    store.set({ live: null, project, meta, selection: sel, draft: draft && store.get().proposals.some((p) => p.id === draft.id && p.status === 'pending') ? draft : null });
    pruneMedia(project);
  });
  audio.onPeaks = () => store.set({ peaksVersion: store.get().peaksVersion + 1 });

  const first = await api('GET', '/project');
  store.set({ project: first.json });
  const st = await api('GET', '/status');
  store.set({ meta: { path: st.json.projectPath, dirty: st.json.dirty } });
  const as = await api('GET', '/project/autosave');
  if (as.json?.exists && first.json.clips.length === 0 && first.json.media.length === 0) store.set({ autosave: as.json });

  setInterval(() => void refreshJobs(), 600);
  setInterval(() => void refreshProposals(), 700);
  void refreshJobs();
  void refreshProposals();

  // diem do cho kiem thu giao dien (chi doc, khong thay doi hanh vi)
  window.__te = { store, player, audio, stats };

  createRoot(root).render(<App />);
  window.toolEdit.ready(info); // bao main CHI SAU khi handler render/xuat da dang ky va giao dien da mount
}

main().catch((e) => {
  const msg = String(e instanceof Error ? e.stack : e);
  document.body.innerHTML = '<pre style="color:#f88;padding:20px;white-space:pre-wrap">LOI KHOI DONG: ' + msg.replace(/</g, '&lt;') + '</pre>';
  window.toolEdit.sendSelftest({ error: msg });
});
