// Tab "Kiểm tra": font thieu dau, chu tran khung, loudness, phu de bao phu loi thoai.
import { viText } from '../vi-runtime';
import { useState } from 'react';
import { runQc } from '../actions';
import { Section } from './fields';

interface QcResult {
  duration: number;
  loudness: { integrated_lufs: number; true_peak_dbtp: number; lra: number; verdict: string } | null;
  speech: { seconds: number; captioned_seconds: number; coverage: number | null };
  issues: { level: 'error' | 'warn'; code: string; message: string }[];
  ok: boolean;
}

export function Qc() {
  const [r, setR] = useState<QcResult | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <div className="scroll" data-testid="qc">
      <Section title="Kiểm tra chất lượng">
        <div style={{ padding: '4px 12px' }}>
          <button className="primary" data-testid="qc-run" disabled={busy} onClick={async () => { setBusy(true); setR(await runQc()); setBusy(false); }}>{busy ? 'Đang kiểm tra…' : 'Chạy kiểm tra'}</button>
          <div className="kbd" style={{ marginTop: 6 }}>Font thiếu dấu tiếng Việt · chữ tràn khung 9:16/16:9 · loudness bản trộn · phụ đề có bao phủ lời thoại</div>
        </div>
      </Section>
      {r && (
        <>
          <Section title={r.ok ? 'Kết quả: Không có lỗi' : 'Kết quả: CÓ LỖI'}>
            <div style={{ padding: '0 12px' }} data-testid="qc-result">
              {r.loudness && <div className="field"><label>Loudness</label><span data-testid="qc-lufs">{r.loudness.integrated_lufs.toFixed(1)} LUFS · dinh {r.loudness.true_peak_dbtp.toFixed(1)} dBTP · {r.loudness.verdict}</span></div>}
              <div className="field"><label>Lời thoại</label><span>{r.speech.seconds}s{r.speech.coverage !== null ? ` · phụ đề bao phủ ${Math.round(r.speech.coverage * 100)}%` : ''}</span></div>
            </div>
            {r.issues.length === 0 && <div className="empty">Không có vấn đề nào.</div>}
            {r.issues.map((i, k) => <div key={k} className={i.level === 'error' ? 'warn' : 'warn soft'} data-testid={`qc-${i.code}`}>{i.level === 'error' ? '✖ ' : '▲ '}{viText(i.message)}</div>)}
          </Section>
        </>
      )}
    </div>
  );
}
