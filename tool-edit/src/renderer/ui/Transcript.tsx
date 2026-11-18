// Tab "Lời thoại": nhan dang (whisper), danh sach tu (sua, chon doan de cat), phu de tung tu, khoang lang, duck nhac.
import { useEffect, useMemo, useState } from 'react';
import { CAPTION_STYLES, captionClipsOf, type CaptionStyleId } from '../../core/captions';
import { srcToTimeline } from '../../core/transcript';
import { cutRanges, cutWords, detectBeatsAction, duckClip, editWord, findSilences, generateCaptionsAction, placeBeatMarkers, removeCaptionsAction, transcribeMedia, askText } from '../actions';
import { player } from '../player';
import { store, useStore } from '../store';
import { Check, ColorField, NumField, Row, Section } from './fields';

export function Transcript() {
  const project = useStore((s) => s.project);
  const selection = useStore((s) => s.selection);
  const jobs = useStore((s) => s.jobs);
  const ph = useStore((s) => (s.playing ? Math.floor(s.playhead * 5) / 5 : s.playhead));
  const clip = selection.length === 1 ? project.clips.find((c) => c.id === selection[0]) : undefined;
  const media = clip?.src.type === 'media' ? project.media.find((m) => m.id === (clip.src as { mediaId: string }).mediaId) : undefined;

  const [lang, setLang] = useState('vi');
  const [model, setModel] = useState('large-v3-turbo');
  const [range, setRange] = useState<[number, number] | null>(null);
  const [capStyle, setCapStyle] = useState<CaptionStyleId>('karaoke');
  const [maxWords, setMaxWords] = useState(4);
  const [color, setColor] = useState('#ffffff');
  const [highlight, setHighlight] = useState('#ffd166');
  const [minSil, setMinSil] = useState(0.6);
  const [sil, setSil] = useState<{ count: number; total_seconds: number; ranges: { s: number; e: number }[]; source: string } | null>(null);
  const [beatEvery, setBeatEvery] = useState(1);
  const [duckDb, setDuckDb] = useState(-14);
  useEffect(() => {
    setRange(null);
    setSil(null);
  }, [clip?.id]);

  const running = jobs.find((j) => (j.type === 'transcribe' || j.type === 'beats') && j.state === 'running');
  const words = media?.transcript?.words;
  const win = clip ? { lo: clip.in, hi: clip.in + clip.duration } : { lo: 0, hi: 0 };
  const tlNow = clip ? ph - clip.start + clip.in : 0; // thoi diem NGUON dang phat
  const caps = useMemo(() => (clip ? captionClipsOf(project, clip.id) : []), [project, clip]);

  if (!clip || !media) {
    return <div className="scroll"><div className="empty">Chọn một clip <b>video hoặc âm thanh</b> trên timeline để nhận dạng lời thoại, tạo phụ đề, cắt khoảng lặng.<br /><br />Whisper chạy trên GPU của máy bạn, không gửi dữ liệu đi đâu.</div></div>;
  }

  const hasAudio = media.hasAudio || media.kind === 'audio';
  const sel = range ? [Math.min(...range), Math.max(...range)] : null;

  return (
    <div className="scroll" data-testid="transcript">
      <Section title={`Clip ${clip.id} · ${media.path.split(/[\\/]/).pop()}`}>
        {running && (
          <div style={{ padding: '4px 12px' }} data-testid="analysis-progress">
            {running.type === 'transcribe' ? 'Đang nhận dạng lời thoại' : 'Đang nhận nhịp'}… {Math.round(running.progress * 100)}%
            <div className="bar" style={{ width: '100%', marginTop: 4 }}><i style={{ width: `${Math.round(running.progress * 100)}%` }} /></div>
          </div>
        )}
        {hasAudio && !words && !running && (
          <>
            <Row label="Ngôn ngữ"><select value={lang} data-testid="tr-lang" onChange={(e) => setLang(e.target.value)}><option value="vi">Tiếng Việt</option><option value="en">English</option><option value="auto">Tự động nhận</option></select></Row>
            <Row label="Mô hình"><select value={model} onChange={(e) => setModel(e.target.value)}><option value="large-v3-turbo">large-v3-turbo (chính xác, nhanh)</option><option value="medium">medium</option><option value="small">small (nhanh nhất)</option></select></Row>
            <div style={{ padding: '4px 12px' }}><button className="primary" data-testid="tr-run" onClick={() => void transcribeMedia(media.id, lang, model)}>Nhận dạng lời thoại</button></div>
            <div className="kbd" style={{ padding: '0 12px 6px' }}>Chỉ dùng mô hình ĐÃ CÓ trong máy (không tự tải).</div>
          </>
        )}
        {!hasAudio && <div className="kbd" style={{ padding: '0 12px' }}>Media này không có tiếng.</div>}
      </Section>

      {words && (
        <Section title={`Lời thoại (${words.length} từ · ${media.transcript!.lang} · ${media.transcript!.model})`} right={<button className="plain" title="Nhận dạng lại (thay lời thoại, mất các sửa tay)" onClick={() => void transcribeMedia(media.id, media.transcript!.lang, model)}>↻</button>}>
          <div className="words" data-testid="words">
            {words.map((w, i) => {
              const inWin = (w.s + w.e) / 2 >= win.lo && (w.s + w.e) / 2 < win.hi;
              const cur = tlNow >= w.s && tlNow < w.e;
              const isSel = sel && i >= sel[0] && i <= sel[1];
              return (
                <span key={i} data-w={i} className={`w${inWin ? '' : ' out'}${cur ? ' cur' : ''}${isSel ? ' sel' : ''}`} title={`${w.s.toFixed(2)}s – ${w.e.toFixed(2)}s${w.p !== undefined ? ' · tin cay ' + Math.round(w.p * 100) + '%' : ''}`}
                  onClick={(e) => {
                    setRange(e.shiftKey && range ? [range[0], i] : [i, i]);
                    if (inWin) player.seek(srcToTimeline(clip, w.s));
                  }}
                  onDoubleClick={async () => {
                    const t = await askText('Sửa từ', w.w);
                    if (t && t !== w.w) void editWord(media.id, i, t);
                  }}>
                  {w.w}{' '}
                </span>
              );
            })}
          </div>
          <div style={{ padding: '4px 12px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button className="primary" disabled={!sel} data-testid="tr-cut" onClick={() => sel && void cutWords(clip, media.id, sel[0], sel[1]).then(() => setRange(null))}>Cắt đoạn đã chọn{sel ? ` (${sel[1] - sel[0] + 1} từ)` : ''}</button>
            <button disabled={!sel || sel[0] !== sel[1]} onClick={async () => { const w = words[sel![0]]; const t = await askText('Sửa từ', w.w); if (t && t !== w.w) void editWord(media.id, sel![0], t); }}>Sửa từ</button>
          </div>
          <div className="kbd" style={{ padding: '0 12px 6px' }}>Click: chọn + nhảy tới từ · Shift+click: chọn đoạn · Nhấp đôi: sửa từ · Từ mờ = ngoài phần clip đang dùng</div>
        </Section>
      )}

      {words && (
        <Section title="Phụ đề từng từ">
          <Row label="Kiểu">
            <select value={capStyle} data-testid="cap-style" onChange={(e) => setCapStyle(e.target.value as CaptionStyleId)}>
              {(Object.keys(CAPTION_STYLES) as CaptionStyleId[]).map((k) => <option key={k} value={k}>{CAPTION_STYLES[k].name}</option>)}
            </select>
          </Row>
          <div className="kbd" style={{ padding: '0 12px 4px' }}>{CAPTION_STYLES[capStyle].description}</div>
          <Row label="Tối đa (từ)"><NumField testid="cap-words" value={maxWords} min={1} max={10} step={1} onCommit={(n) => setMaxWords(Math.round(n))} /></Row>
          <Row label="Màu chữ"><ColorField value={color} onCommit={setColor} />{capStyle === 'karaoke' && <><span style={{ color: 'var(--dim)' }}>nhan</span><ColorField value={highlight} onCommit={setHighlight} /></>}</Row>
          <div style={{ padding: '4px 12px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button className="primary" data-testid="cap-gen" onClick={() => void generateCaptionsAction(clip, { style: capStyle, maxWords, color, highlight })}>{caps.length ? 'Tạo lại phụ đề' : 'Tạo phụ đề'}</button>
            {caps.length > 0 && <button onClick={() => void removeCaptionsAction(clip)}>Xóa phụ đề</button>}
            {caps.length > 0 && <span className="kbd" style={{ alignSelf: 'center' }}>{caps.length} nhom</span>}
          </div>
          <div className="kbd" style={{ padding: '0 12px 6px' }}>Sửa lời thoại hoặc cắt đoạn xong: bấm "Tạo lại phụ đề". (Cắt bằng tab này tự cập nhật phụ đề.)</div>
        </Section>
      )}

      {hasAudio && (
        <Section title="Khoảng lặng">
          <Row label="Dài hơn (s)"><NumField testid="sil-min" value={minSil} min={0.2} max={10} step={0.1} onCommit={setMinSil} /></Row>
          <div style={{ padding: '4px 12px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button data-testid="sil-find" onClick={async () => setSil(await findSilences(clip.id, minSil, 0.12))}>Tìm khoảng lặng</button>
            {sil && sil.count > 0 && <button className="primary" data-testid="sil-cut" onClick={() => void cutRanges(clip, sil.ranges).then(() => setSil(null))}>Cắt {sil.count} khoảng ({sil.total_seconds.toFixed(1)}s)</button>}
          </div>
          {sil && <div className="kbd" style={{ padding: '4px 12px' }} data-testid="sil-result">{sil.count ? `Tìm thấy ${sil.count} khoảng (${sil.total_seconds.toFixed(2)}s) theo ${sil.source === 'words' ? 'lời thoại' : 'âm thanh'}: ${sil.ranges.slice(0, 6).map((r) => `${r.s.toFixed(1)}–${r.e.toFixed(1)}s`).join(', ')}${sil.count > 6 ? '…' : ''}` : 'Không có khoảng lặng nào dài hơn ngưỡng.'}</div>}
        </Section>
      )}

      <Section title="Nhạc: duck và nhịp">
        <Row label="Hạ dưới tiếng nói (dB)"><NumField testid="duck-db" value={duckDb} min={-40} max={-3} step={1} onCommit={setDuckDb} /></Row>
        <div style={{ padding: '4px 12px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button data-testid="duck-run" onClick={() => void duckClip(clip, duckDb)} title="Hạ âm lượng clip này khi có tiếng nói ở clip khác">Duck dưới lời thoại</button>
          <button data-testid="beats-run" disabled={!!running} onClick={() => void detectBeatsAction(media.id)}>Nhận nhịp</button>
        </div>
        {media.beats && (
          <>
            <div className="kbd" style={{ padding: '4px 12px' }} data-testid="beats-info">{media.beats.bpm} BPM · {media.beats.times.length} nhịp (có thể gấp đôi / một nửa)</div>
            <Row label="Mỗi N nhịp"><NumField value={beatEvery} min={1} max={16} step={1} onCommit={(n) => setBeatEvery(Math.round(n))} /></Row>
            <div style={{ padding: '4px 12px' }}><button data-testid="beats-place" onClick={() => void placeBeatMarkers(clip, beatEvery)}>Đặt marker nhịp lên timeline</button></div>
          </>
        )}
      </Section>
    </div>
  );
}

export { Check, store };
