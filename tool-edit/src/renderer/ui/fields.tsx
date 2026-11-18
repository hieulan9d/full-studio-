// O nhap dung chung: so (commit khi Enter/roi o), mau, chon.
import { useEffect, useRef, useState } from 'react';
import { beginGesture, endGesture } from '../actions';
import { Icon } from './Icon';

const round = (n: number) => Math.round(n * 1000) / 1000;

export function NumField({ value, onCommit, step = 1, min, max, testid, disabled }: { value: number; onCommit: (n: number) => void; step?: number; min?: number; max?: number; testid?: string; disabled?: boolean }) {
  const [txt, setTxt] = useState(String(round(value)));
  const focus = useRef(false);
  useEffect(() => {
    if (!focus.current) setTxt(String(round(value)));
  }, [value]);
  // Doi NGAY khi go / bam mui ten (khong cho roi o): moi lan doi hop le ghi vao du an (preview doi tuc thi); ca luot go la MOT buoc hoan tac.
  const live = (raw: string) => {
    if (raw.trim() === '') return;
    let n = Number(raw);
    if (!Number.isFinite(n)) return;
    if (min !== undefined) n = Math.max(min, n);
    if (max !== undefined) n = Math.min(max, n);
    if (Math.abs(n - value) > 1e-9) onCommit(n);
  };
  const commitNow = () => {
    let n = Number(txt);
    if (!Number.isFinite(n)) return setTxt(String(round(value)));
    if (min !== undefined) n = Math.max(min, n);
    if (max !== undefined) n = Math.min(max, n);
    if (Math.abs(n - value) > 1e-9) onCommit(n);
    else setTxt(String(round(value)));
  };
  return (
    <input
      type="number"
      data-testid={testid}
      value={txt}
      step={step}
      disabled={disabled}
      onFocus={() => {
        focus.current = true;
        beginGesture('num');
      }}
      onChange={(e) => {
        setTxt(e.target.value);
        live(e.target.value);
      }}
      onBlur={() => {
        focus.current = false;
        commitNow();
        endGesture();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        e.stopPropagation(); // khong de phim tat toan cuc (S, Delete, Space...) can thiep khi go so
      }}
    />
  );
}

export function ColorField({ value, onCommit, testid }: { value: string; onCommit: (c: string) => void; testid?: string }) {
  const [v, setV] = useState(value.slice(0, 7));
  useEffect(() => setV(value.slice(0, 7)), [value]);
  const g = useRef(false);
  return (
    <input
      type="color"
      data-testid={testid}
      value={v}
      onChange={(e) => {
        setV(e.target.value);
        if (!g.current) {
          g.current = true;
          beginGesture('col'); // keo bang mau: doi ngay, mot buoc hoan tac
        }
        if (e.target.value.toLowerCase() !== value.slice(0, 7).toLowerCase()) onCommit(e.target.value);
      }}
      onBlur={() => {
        if (g.current) {
          g.current = false;
          endGesture();
        } else if (v.toLowerCase() !== value.slice(0, 7).toLowerCase()) onCommit(v);
      }}
      onKeyDown={(e) => e.stopPropagation()}
    />
  );
}

export function Check({ value, onCommit, label, testid }: { value: boolean; onCommit: (b: boolean) => void; label: string; testid?: string }) {
  return (
    <label className="check">
      <input type="checkbox" data-testid={testid} checked={value} onChange={(e) => onCommit(e.target.checked)} /> {label}
    </label>
  );
}

const collapsed = new Set<string>(); // trạng thái thu gọn của từng mục (giữ khi đổi tab trong phiên)

/** Mục có thể thu gọn: bấm vào tiêu đề để thu / mở. */
export function Section({ title, children, right }: { title: string; children: React.ReactNode; right?: React.ReactNode }) {
  const [shut, setShut] = useState(collapsed.has(title));
  const toggle = () => {
    if (shut) collapsed.delete(title);
    else collapsed.add(title);
    setShut(!shut);
  };
  return (
    <div className={`group${shut ? ' shut' : ''}`}>
      <h4 onClick={toggle} title={shut ? 'Mở mục này' : 'Thu gọn mục này'}>
        <Icon n="chevron" size={12} className="chev" />
        <span className="ttl">{title}</span>
        {right && <span className="rt" onClick={(e) => e.stopPropagation()}>{right}</span>}
      </h4>
      {!shut && <div className="gbody">{children}</div>}
    </div>
  );
}

export function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="field">
      <label>{label}</label>
      <div className="fv">{children}</div>
    </div>
  );
}
