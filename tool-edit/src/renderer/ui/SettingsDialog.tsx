// Cài đặt: phím tắt (bấm vào ô rồi nhấn tổ hợp phím mới), báo trùng, đặt lại; thông tin chuột.
import { useEffect, useState } from 'react';
import { ACTIONS, RESERVED, actionFor, comboOf, conflicts, defaultKeymap, prettyCombo } from '../keymap';
import { exportKeymap, importKeymap, resetKeys, setKey } from '../actions';
import { store, useStore } from '../store';

export function SettingsDialog() {
  const open = useStore((s) => s.settingsOpen);
  const km = useStore((s) => s.keymap);
  const [rec, setRec] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const [q, setQ] = useState('');
  useEffect(() => {
    if (!rec) return;
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.key === 'Escape' && !e.ctrlKey && !e.altKey && !e.shiftKey) {
        setRec(null);
        setMsg('');
        return;
      }
      const c = comboOf(e);
      if (!c) return;
      if (RESERVED.includes(c.toLowerCase())) {
        setMsg(`${c} là phím hệ thống, hãy chọn tổ hợp khác.`);
        return;
      }
      const other = actionFor(store.get().keymap, c);
      setKey(rec, c);
      setMsg(other && other !== rec ? `Lưu ý: "${c}" đang trùng với "${ACTIONS.find((a) => a.id === other)?.label}". Hãy gán lại một trong hai.` : '');
      setRec(null);
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [rec]);
  if (!open) return null;
  const def = defaultKeymap();
  const dup = conflicts(km);
  const groups = ['Phát lại', 'Chỉnh sửa', 'Dự án', 'Xem'] as const;
  return (
    <div className="modal-bg" data-testid="settings" onMouseDown={(e) => e.target === e.currentTarget && store.set({ settingsOpen: false })}>
      <div className="modal wide">
        <div className="mh">
          <b>Cài đặt</b>
          <span className="grow" />
          <button className="plain" data-testid="settings-close" onClick={() => store.set({ settingsOpen: false })}>✕</button>
        </div>
        <div className="mbody">
          <h4>Phím tắt</h4>
          <div className="kbd" style={{ marginBottom: 6 }}>Bấm vào ô phím rồi nhấn tổ hợp mới (Esc để hủy). Phím không có tác dụng khi đang gõ trong ô nhập.</div>
          <div style={{ display: 'flex', gap: 6, margin: '6px 0' }}>
            <input type="text" placeholder="Tìm hành động…" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.stopPropagation()} data-testid="keys-search" style={{ flex: 1 }} />
            <button data-testid="keys-export" onClick={() => void exportKeymap()} title="Lưu bộ phím tắt ra file JSON để mang sang máy khác">Xuất…</button>
            <button data-testid="keys-import" onClick={() => void importKeymap()} title="Nạp bộ phím tắt từ file JSON (thay bộ hiện tại)">Nhập…</button>
            <button data-testid="keys-reset" onClick={() => { if (window.confirm('Đặt lại toàn bộ phím tắt về mặc định?')) resetKeys(); }}>Đặt lại tất cả</button>
          </div>
          {msg && <div className="warn" data-testid="keys-msg">{msg}</div>}
          {dup.length > 0 && <div className="warn soft" data-testid="keys-dup">Đang trùng phím: {dup.map((d) => `${d.combo} (${d.ids.map((i) => ACTIONS.find((a) => a.id === i)?.label).join(' / ')})`).join('; ')}</div>}
          {groups.map((g) => (
            <div key={g}>
              <div className="kbd" style={{ margin: '10px 0 4px' }}><b>{g}</b></div>
              {ACTIONS.filter((a) => a.group === g && (!q || a.label.toLowerCase().includes(q.toLowerCase()))).map((a) => (
                <div key={a.id} className="keyrow" data-testid={`key-${a.id}`}>
                  <span>{a.label}</span>
                  <button className={rec === a.id ? 'primary' : ''} data-testid={`keybtn-${a.id}`} onClick={() => { setRec(a.id); setMsg(''); }}>{rec === a.id ? 'Nhấn phím…' : prettyCombo(km[a.id])}</button>
                  <button className="plain" title="Bỏ gán" onClick={() => setKey(a.id, '')}>✕</button>
                  <button className="plain" title="Đặt lại mặc định" disabled={km[a.id] === def[a.id]} onClick={() => setKey(a.id, def[a.id])}>↺</button>
                </div>
              ))}
            </div>
          ))}
          <h4 style={{ marginTop: 16 }}>Chuột trên timeline</h4>
          <div className="kbd" style={{ lineHeight: 1.8 }}>
            Ctrl + con lăn: phóng to / thu nhỏ theo vị trí chuột<br />
            Alt + con lăn: cuộn timeline sang trái / phải<br />
            Shift + con lăn: cuộn ngang nhanh · Con lăn: cuộn các track lên / xuống<br />
            Alt khi kéo clip: tắt bám dính (snap)
          </div>
        </div>
      </div>
    </div>
  );
}
