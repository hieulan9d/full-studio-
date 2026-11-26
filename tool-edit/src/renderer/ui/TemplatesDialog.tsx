// Hộp thoại "Mẫu dựng sẵn": chọn mẫu (có ảnh xem trước), điền biến (chữ, số, màu, dữ liệu), thêm vào timeline tại con trỏ.
import { useEffect, useRef, useState } from 'react';
import { TEMPLATES, type Template } from '../../core/templates';
import { addTemplate } from '../actions';
import { templateThumb } from '../engine';
import { store, useStore } from '../store';
import { ColorField, NumField } from './fields';

const CATEGORY: Record<Template['category'], string> = { kinh: 'Kính', 'tieu-de': 'Tiêu đề', 'so-lieu': 'Số liệu', nut: 'Nút / giá', 'bieu-do': 'Biểu đồ', app: 'Giao diện app' };

function Thumb({ tpl, aspect }: { tpl: Template; aspect: '9:16' | '16:9' }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const [err, setErr] = useState(false);
  useEffect(() => {
    let live = true;
    setErr(false);
    templateThumb(tpl, aspect)
      .then((t) => {
        const c = ref.current;
        if (!live || !c) return;
        c.width = t.width;
        c.height = t.height;
        c.getContext('2d')!.putImageData(new ImageData(t.rgba as Uint8ClampedArray<ArrayBuffer>, t.width, t.height), 0, 0);
      })
      .catch(() => live && setErr(true));
    return () => {
      live = false;
    };
  }, [tpl, aspect]);
  return err ? <div className="tpl-thumb err">không xem trước được</div> : <canvas ref={ref} className="tpl-thumb" />;
}

export function TemplatesDialog() {
  const open = useStore((s) => s.templatesOpen);
  const aspect = useStore((s) => s.aspect);
  const [id, setId] = useState(TEMPLATES[0].id);
  const [vals, setVals] = useState<Record<string, string | number>>({});
  const tpl = TEMPLATES.find((t) => t.id === id)!;
  useEffect(() => setVals({}), [id]);
  if (!open) return null;
  const val = (v: Template['vars'][number]) => vals[v.id] ?? v.default;
  return (
    <div className="modal-bg" data-testid="templates" onMouseDown={(e) => e.target === e.currentTarget && store.set({ templatesOpen: false })}>
      <div className="modal wide tpl">
        <div className="mh">
          <b>Mẫu dựng sẵn</b>
          <span className="kbd" style={{ marginLeft: 10 }}>Mỗi mẫu là một nhóm clip (clip ghép) đặt tại con trỏ; sửa tiếp bằng thuộc tính như clip thường.</span>
          <span className="grow" />
          <button className="plain" data-testid="templates-close" onClick={() => store.set({ templatesOpen: false })}>✕</button>
        </div>
        <div className="tpl-body">
          <div className="tpl-list" data-testid="tpl-list">
            {TEMPLATES.map((t) => (
              <button key={t.id} className={`tpl-card${t.id === id ? ' on' : ''}`} data-testid={`tpl-${t.id}`} onClick={() => setId(t.id)}>
                <Thumb tpl={t} aspect={aspect} />
                <b>{t.name}</b>
                <span className="kbd">{CATEGORY[t.category]} · {t.duration}s</span>
              </button>
            ))}
          </div>
          <div className="tpl-form">
            <h4 style={{ margin: '0 0 4px' }}>{tpl.name}</h4>
            <div className="kbd" style={{ marginBottom: 10, lineHeight: 1.5 }}>{tpl.description}</div>
            {tpl.vars.map((v) => (
              <div key={v.id} className="field" style={{ padding: '3px 0', gridTemplateColumns: '120px 1fr' }}>
                <label>{v.label}</label>
                {v.type === 'color' ? (
                  <ColorField value={String(val(v))} testid={`tv-${v.id}`} onCommit={(c) => setVals({ ...vals, [v.id]: c })} />
                ) : v.type === 'number' ? (
                  <NumField testid={`tv-${v.id}`} value={Number(val(v))} step={10} onCommit={(n) => setVals({ ...vals, [v.id]: n })} />
                ) : v.type === 'data' ? (
                  <textarea rows={5} data-testid={`tv-${v.id}`} value={String(val(v))} onKeyDown={(e) => e.stopPropagation()} onChange={(e) => setVals({ ...vals, [v.id]: e.target.value })} />
                ) : (
                  <input type="text" data-testid={`tv-${v.id}`} value={String(val(v))} onKeyDown={(e) => e.stopPropagation()} onChange={(e) => setVals({ ...vals, [v.id]: e.target.value })} />
                )}
              </div>
            ))}
            <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
              <button className="primary" data-testid="tpl-add" onClick={() => void addTemplate(tpl.id, vals)}>Thêm vào timeline tại con trỏ</button>
              <button onClick={() => store.set({ templatesOpen: false })}>Đóng</button>
            </div>
            <div className="kbd" style={{ marginTop: 8, lineHeight: 1.5 }}>Ảnh xem trước vẽ trên nền thanh màu để thấy hiệu ứng kính mờ.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
