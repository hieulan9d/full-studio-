// Thanh đo âm lượng hai bên tai: trái / phải (dBFS), đỉnh giữ 1,5 giây, báo đỏ khi chạm 0 dB.
import { useEffect, useRef, useState } from 'react';
import { audio } from '../audio';

const MIN = -60;
const pct = (db: number) => (Number.isFinite(db) ? Math.max(0, Math.min(1, (db - MIN) / -MIN)) : 0);
const fmt = (db: number) => (Number.isFinite(db) ? db.toFixed(1) : '-∞');
const TICKS = [0, -6, -12, -24, -36, -48, -60];

export function LevelMeter() {
  const [lv, setLv] = useState({ l: -Infinity, r: -Infinity, pl: -Infinity, pr: -Infinity, hl: -Infinity, hr: -Infinity });
  const raf = useRef(0);
  const smooth = useRef({ l: -Infinity, r: -Infinity });
  useEffect(() => {
    let last = 0;
    const loop = (t: number) => {
      if (t - last > 33) {
        last = t;
        const x = audio.levels();
        // rơi từ từ (18 dB/giây) để mắt kịp nhìn
        const fall = (prev: number, cur: number) => (cur >= prev || !Number.isFinite(prev) ? cur : Math.max(cur, prev - 0.6));
        smooth.current = { l: fall(smooth.current.l, x.pl), r: fall(smooth.current.r, x.pr) };
        setLv({ ...x, pl: smooth.current.l, pr: smooth.current.r });
      }
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf.current);
  }, []);
  const bar = (label: string, db: number, hold: number, id: string) => (
    <div className="mt-col" title={`${label}: đỉnh ${fmt(db)} dB`}>
      <div className="mt-bar" data-testid={id} data-db={Number.isFinite(db) ? db.toFixed(1) : '-inf'}>
        <i className="mt-fill" style={{ height: `${pct(db) * 100}%` }} />
        {Number.isFinite(hold) && <i className="mt-hold" style={{ bottom: `${pct(hold) * 100}%`, background: hold >= -0.5 ? 'var(--bad)' : hold >= -6 ? 'var(--warn)' : 'var(--ok)' }} />}
      </div>
      <b className={Number.isFinite(hold) && hold >= -0.5 ? 'clip' : ''}>{label}</b>
      <span className="kbd">{fmt(hold)}</span>
    </div>
  );
  return (
    <div className="meter" data-testid="meter">
      <div className="mt-scale">
        {TICKS.map((t) => (
          <span key={t} style={{ bottom: `${pct(t) * 100}%` }}>{t}</span>
        ))}
      </div>
      {bar('T', lv.pl, lv.hl, 'meter-l')}
      {bar('P', lv.pr, lv.hr, 'meter-r')}
    </div>
  );
}
