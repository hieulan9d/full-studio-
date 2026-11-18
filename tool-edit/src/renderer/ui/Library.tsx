// Tab "Thư viện": SFX + nhac da duyet (tag, nghe thu, them vao timeline), goi y SFX theo su kien (chi la de xuat), marker.
import { useEffect, useRef, useState } from 'react';
import type { LibItem } from '../../core/sfx';
import { api } from '../bridge';
import { libraryAdd, suggestSfx, toast } from '../actions';
import { NumField, Row, Section } from './fields';
import { store } from '../store';

interface LibView {
  scanning: boolean;
  dirs: string[];
  total: number;
  all: number;
  items: LibItem[];
}

export function Library() {
  const [kind, setKind] = useState<'' | 'sfx' | 'music'>('sfx');
  const [q, setQ] = useState('');
  const [lib, setLib] = useState<LibView | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [rules, setRules] = useState({ cut: { on: true, tag: 'whoosh', volume: 50 }, text: { on: true, tag: 'pop', volume: 50 }, beat: { on: false, tag: 'tick', volume: 40 } });

  const load = async () => {
    const r = await api('GET', `/library?${kind ? 'kind=' + kind + '&' : ''}${q ? 'q=' + encodeURIComponent(q) : ''}`);
    if (r.status === 200) setLib(r.json as LibView);
  };
  useEffect(() => {
    void load();
    const t = setInterval(() => lib?.scanning && void load(), 1500);
    return () => clearInterval(t);
  }, [kind, q, lib?.scanning]);

  const preview = async (it: LibItem) => {
    audioRef.current?.pause();
    if (playing === it.id) return setPlaying(null);
    try {
      const bytes = await window.toolEdit.readLibrary(it.id);
      const url = URL.createObjectURL(new Blob([bytes as BlobPart]));
      const a = new Audio(url);
      a.onended = () => setPlaying(null);
      audioRef.current = a;
      setPlaying(it.id);
      await a.play();
    } catch (e) {
      toast('Không nghe thử được: ' + String((e as Error).message), 'error');
      setPlaying(null);
    }
  };

  const addDir = async () => {
    const d = await window.toolEdit.dialogDir();
    if (!d) return;
    await api('POST', '/library/scan', { dir: d });
    await load();
  };

  const removeDir = async (d: string) => {
    if (!window.confirm(`Bỏ thư mục này khỏi kho âm thanh?
${d}
(Không xóa file trên đĩa.)`)) return;
    await api('POST', '/library/remove_dir', { dir: d });
    await load();
  };
  const rescan = async () => {
    await api('POST', '/library/scan', {});
    await load();
  };

  const sfxTags = [...new Set((lib?.items ?? []).filter((i) => i.kind === 'sfx').flatMap((i) => i.tags))].filter((t) => t !== 'sfx').sort();

  return (
    <div className="scroll" data-testid="library">
      <Section title="Thư mục âm thanh (AI dùng được)" right={<span style={{ display: 'flex', gap: 4 }}><button className="plain" data-testid="lib-rescan" onClick={() => void rescan()} title="Quét lại các thư mục">↻ Quét lại</button><button className="plain" data-testid="lib-add-dir" onClick={() => void addDir()} title="Thêm thư mục chứa SFX / nhạc">+ Thêm thư mục</button></span>}>
        <div className="kbd" style={{ padding: '0 12px 6px', lineHeight: 1.5 }}>Thêm thư mục chứa SFX và nhạc của bạn. AI chỉ chọn âm thanh trong các thư mục này (công cụ <b>list_library</b>, <b>suggest_sfx</b>) và mọi SFX AI gợi ý đều chờ bạn duyệt. Thư mục con cũng được quét; thẻ tag lấy từ tên file.</div>
        {(lib?.dirs ?? []).length === 0 && <div className="empty" style={{ padding: 10 }}>Chưa có thư mục nào.</div>}
        {(lib?.dirs ?? []).map((d) => (
          <div key={d} className="libdir" data-testid="lib-dir" title={d}>
            <span>{d}</span>
            <button className="plain" data-testid="lib-dir-remove" title="Bỏ khỏi kho (không xóa file)" onClick={() => void removeDir(d)}>✕</button>
          </div>
        ))}
        {lib && <div className="kbd" style={{ padding: '4px 12px' }}>{lib.all} âm thanh · {lib.dirs.length} thư mục{lib.scanning ? ' · đang quét…' : ''}</div>}
      </Section>

      <Section title="Kho SFX và nhạc (đã duyệt)" right={<button className="plain" onClick={() => void addDir()} title="Thêm thư mục vào kho">+ thư mục</button>}>
        <div style={{ display: 'flex', gap: 6, padding: '0 12px 6px' }}>
          <span className="seg">
            {([['sfx', 'SFX'], ['music', 'Nhạc'], ['', 'Tất cả']] as const).map(([k, l]) => <button key={k} className={kind === k ? 'on' : ''} data-testid={`lib-kind-${k || 'all'}`} onClick={() => setKind(k)}>{l}</button>)}
          </span>
          <input type="text" placeholder="Tìm theo tên/tag" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.stopPropagation()} style={{ flex: 1, minWidth: 0 }} data-testid="lib-q" />
        </div>
        <div className="lib-list" data-testid="lib-list">
          {lib?.items.map((it) => (
            <div key={it.id} className="lib-item" data-lib={it.id}>
              <button className="plain" onClick={() => void preview(it)} title="Nghe thử">{playing === it.id ? '■' : '▶'}</button>
              <div className="lib-main">
                <b>{it.name}</b>
                <span className="kbd">{it.duration.toFixed(1)}s{it.bpm ? ` · ${it.bpm} BPM` : ''} · {it.tags.filter((t) => t !== it.kind).slice(0, 4).join(', ')}</span>
              </div>
              <button className="plain" onClick={() => void libraryAdd(it)} title="Thêm vào timeline tại con trỏ">+</button>
            </div>
          ))}
          {lib && lib.items.length === 0 && <div className="empty">{lib.scanning ? 'Đang quét kho…' : 'Không có mục nào. Bấm "+ thư mục" để thêm thư mục SFX/nhạc.'}</div>}
        </div>
        {lib && <div className="kbd" style={{ padding: '4px 12px' }}>{lib.total}/{lib.all} mục · {lib.dirs.length} thư mục{lib.scanning ? ' · đang quét…' : ''}</div>}
      </Section>

      <Section title="Gợi ý SFX theo sự kiện">
        <div className="kbd" style={{ padding: '0 12px 6px' }}>Tạo <b>đề xuất</b> (không tự áp dụng): bạn duyệt TỪNG SFX ở tab "Đề xuất".</div>
        {(['cut', 'text', 'beat'] as const).map((ev) => (
          <div key={ev} className="rule">
            <label className="check"><input type="checkbox" checked={rules[ev].on} data-testid={`rule-${ev}`} onChange={(e) => setRules({ ...rules, [ev]: { ...rules[ev], on: e.target.checked } })} /> {ev === 'cut' ? 'Cắt cảnh' : ev === 'text' ? 'Chữ hiện' : 'Nhịp/marker'}</label>
            <select value={rules[ev].tag} onChange={(e) => setRules({ ...rules, [ev]: { ...rules[ev], tag: e.target.value } })} data-testid={`rule-tag-${ev}`}>
              {[...new Set([rules[ev].tag, ...sfxTags])].map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <NumField value={rules[ev].volume} min={0} max={200} step={5} onCommit={(n) => setRules({ ...rules, [ev]: { ...rules[ev], volume: n } })} />
          </div>
        ))}
        <div style={{ padding: '6px 12px' }}>
          <button className="primary" data-testid="sfx-suggest" onClick={() => {
            const list: { event: string; tag: string; volume: number }[] = [];
            if (rules.cut.on) list.push({ event: 'cut', tag: rules.cut.tag, volume: rules.cut.volume / 100 });
            if (rules.text.on) list.push({ event: 'text', tag: rules.text.tag, volume: rules.text.volume / 100 });
            if (rules.beat.on) list.push({ event: 'beat', tag: rules.beat.tag, volume: rules.beat.volume / 100 }, { event: 'marker', tag: rules.beat.tag, volume: rules.beat.volume / 100 });
            if (!list.length) return toast('Bật ít nhất một quy tắc');
            void suggestSfx(list);
          }}>Gợi ý SFX</button>
        </div>
      </Section>
      <Section title="Marker">
        <div style={{ padding: '0 12px 8px', display: 'flex', gap: 6 }}>
          <span className="kbd">Nhận nhịp và đặt marker: chọn clip nhạc, tab "Lời thoại" → "Nhạc: duck và nhịp". Marker là điểm bám trong timeline.</span>
        </div>
      </Section>
    </div>
  );
}

void Row;
void store;
