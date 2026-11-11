import {StrictMode, useEffect, useRef, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Player, type PlayerRef} from '@remotion/player';
import {EFFECTS_18} from '../src/effects/Effects18';
import {EditorProject, TEXT_PROP, type Clip} from '../src/EditorProject';
import './style.css';

const FPS = 30;
const DEFAULT_LEN = 33;

const COLORS = ['#e76f51', '#2a9d8f', '#e9c46a', '#457b9d', '#8e44ad', '#f4a261', '#16a085', '#c0392b', '#2980b9', '#d35400'];
const colorOf = (id: string) => COLORS[Number(id) % COLORS.length];
const nameOf = (id: string) => EFFECTS_18.find((x) => x.id === id)?.name ?? '';
const uid = () => Math.random().toString(36).slice(2, 9);

// Danh mục thư viện, gom theo kiểu hiệu ứng.
const CATS: {name: string; ids: string[] | null}[] = [
	{name: 'Đang thịnh hành', ids: null},
	{name: 'Chữ', ids: ['01', '02', '03', '04', '13', '17', '18']},
	{name: 'Giao diện app', ids: ['06', '07', '08', '09', '15', '16']},
	{name: 'Màu & ánh sáng', ids: ['10', '11', '12']},
	{name: 'Bố cục', ids: ['05', '14']},
];

const makeDefault = (): Clip[] =>
	EFFECTS_18.map((e, i) => ({id: `c${e.id}`, effectId: e.id, start: i * DEFAULT_LEN, duration: DEFAULT_LEN, text: ''}));

const loadClips = (): Clip[] => {
	try {
		const raw = localStorage.getItem(STORE_KEY);
		if (raw) return JSON.parse(raw) as Clip[];
	} catch {
		// Trình duyệt chặn localStorage thì dùng mặc định.
	}
	return makeDefault();
};

const tc = (frames: number) => {
	const s = Math.max(0, frames) / FPS;
	return `${String(Math.floor(s / 60)).padStart(2, '0')}:${(s % 60).toFixed(2).padStart(5, '0')}`;
};

function App() {
	const [clips, setClips] = useState<Clip[]>(makeDefault);
	const [loaded, setLoaded] = useState(false);
	const [past, setPast] = useState<Clip[][]>([]);
	const [selected, setSelected] = useState<string | null>(null);
	const [frame, setFrame] = useState(0);
	const [playing, setPlaying] = useState(false);
	const [pxPerSec, setPxPerSec] = useState(70);
	const [query, setQuery] = useState('');
	const [cat, setCat] = useState(0);
	const playerRef = useRef<PlayerRef>(null);
	const drag = useRef<{id: string; mode: 'move' | 'resize'; x0: number; start0: number; dur0: number} | null>(null);
	const scrub = useRef(false);

	const pxPerFrame = pxPerSec / FPS;
	const end = Math.max(0, ...clips.map((c) => c.start + c.duration));
	const total = Math.max(FPS * 4, end + FPS);
	const sel = clips.find((c) => c.id === selected) ?? null;
	const selEff = sel ? EFFECTS_18.find((x) => x.id === sel.effectId) : null;

	// Đọc dự án từ file project.json khi mở.
	useEffect(() => {
		fetch('/api/project')
			.then((r) => r.json())
			.then((d) => {
				if (d && Array.isArray(d.clips)) setClips(d.clips as Clip[]);
			})
			.catch(() => {})
			.finally(() => setLoaded(true));
	}, []);

	// Ghi dự án vào project.json mỗi khi có thay đổi (chờ 300ms để gom thay đổi liên tiếp).
	useEffect(() => {
		if (!loaded) return;
		const t = setTimeout(() => {
			fetch('/api/project', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({fps: FPS, clips})}).catch(() => {});
		}, 300);
		return () => clearTimeout(t);
	}, [clips, loaded]);

	useEffect(() => {
		const p = playerRef.current;
		if (!p) return;
		const onFrame = (e: any) => setFrame(e.detail.frame);
		const onPlay = () => setPlaying(true);
		const onPause = () => setPlaying(false);
		p.addEventListener('frameupdate', onFrame);
		p.addEventListener('play', onPlay);
		p.addEventListener('pause', onPause);
		return () => {
			p.removeEventListener('frameupdate', onFrame);
			p.removeEventListener('play', onPlay);
			p.removeEventListener('pause', onPause);
		};
	}, []);

	const commit = (next: Clip[]) => {
		setPast((p) => [...p.slice(-49), clips]);
		setClips(next);
	};
	const undo = () => {
		setPast((p) => {
			if (!p.length) return p;
			setClips(p[p.length - 1]);
			return p.slice(0, -1);
		});
	};
	const togglePlay = () => {
		const p = playerRef.current;
		if (!p) return;
		if (p.isPlaying()) p.pause();
		else p.play();
	};
	const stop = () => {
		playerRef.current?.pause();
		playerRef.current?.seekTo(0);
	};
	const seek = (f: number) => playerRef.current?.seekTo(Math.max(0, Math.min(total - 1, Math.round(f))));

	const update = (id: string, patch: Partial<Clip>, record = true) => {
		const next = clips.map((c) => (c.id === id ? {...c, ...patch} : c));
		record ? commit(next) : setClips(next);
	};

	const addEffect = (effectId: string) => {
		const c: Clip = {id: `c${effectId}-${uid()}`, effectId, start: end, duration: DEFAULT_LEN, text: ''};
		commit([...clips, c]);
		setSelected(c.id);
	};

	const removeSel = () => {
		if (!sel) return;
		commit(clips.filter((c) => c.id !== sel.id));
		setSelected(null);
	};

	const splitSel = () => {
		if (!sel || frame <= sel.start || frame >= sel.start + sel.duration) return;
		const a: Clip = {...sel, duration: frame - sel.start};
		const b: Clip = {...sel, id: `${sel.id}-${uid()}`, start: frame, duration: sel.start + sel.duration - frame};
		commit(clips.map((c) => (c.id === sel.id ? a : c)).concat(b));
		setSelected(b.id);
	};

	const duplicateSel = () => {
		if (!sel) return;
		const c: Clip = {...sel, id: `${sel.id}-${uid()}`, start: sel.start + sel.duration};
		commit([...clips, c]);
		setSelected(c.id);
	};

	const resetAll = () => {
		if (!confirm('Đặt lại về 18 effect mặc định? Chỉnh sửa hiện tại sẽ mất.')) return;
		commit(makeDefault());
		setSelected(null);
	};

	const saveFile = () => {
		const blob = new Blob([JSON.stringify({fps: FPS, clips}, null, 2)], {type: 'application/json'});
		const a = document.createElement('a');
		a.href = URL.createObjectURL(blob);
		a.download = 'du-an-effect.json';
		a.click();
	};

	const openFile = async (file: File) => {
		try {
			const data = JSON.parse(await file.text());
			if (!Array.isArray(data.clips)) return alert('File không đúng định dạng.');
			commit(data.clips as Clip[]);
			setSelected(null);
		} catch {
			alert('Không đọc được file.');
		}
	};

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			const tag = (e.target as HTMLElement).tagName;
			if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
			if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
			else if (e.key === 's' || e.key === 'S') splitSel();
			else if (e.key === 'Delete' || e.key === 'Backspace') removeSel();
			else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); }
			else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') { e.preventDefault(); duplicateSel(); }
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	});

	const onClipDown = (e: React.PointerEvent<HTMLDivElement>, c: Clip) => {
		const mode = (e.target as HTMLElement).dataset.mode === 'resize' ? 'resize' : 'move';
		setSelected(c.id);
		setPast((p) => [...p.slice(-49), clips]);
		drag.current = {id: c.id, mode, x0: e.clientX, start0: c.start, dur0: c.duration};
		e.currentTarget.setPointerCapture(e.pointerId);
	};
	const onInnerMove = (e: React.PointerEvent<HTMLDivElement>) => {
		if (scrub.current) {
			const rect = e.currentTarget.getBoundingClientRect();
			seek((e.clientX - rect.left) / pxPerFrame);
			return;
		}
		const d = drag.current;
		if (!d) return;
		const df = Math.round((e.clientX - d.x0) / pxPerFrame);
		if (d.mode === 'move') update(d.id, {start: Math.max(0, d.start0 + df)}, false);
		else update(d.id, {duration: Math.max(6, d.dur0 + df)}, false);
	};
	const onInnerUp = () => {
		drag.current = null;
		scrub.current = false;
	};
	const onRulerDown = (e: React.PointerEvent<HTMLDivElement>) => {
		scrub.current = true;
		const rect = e.currentTarget.getBoundingClientRect();
		seek((e.clientX - rect.left) / pxPerFrame);
	};

	const catIds = CATS[cat].ids;
	const filtered = EFFECTS_18.filter((e) => (!catIds || catIds.includes(e.id)) && (e.id + ' ' + e.name).toLowerCase().includes(query.toLowerCase()));
	const seconds = Math.ceil(total / FPS) + 2;
	const trackWidth = total * pxPerFrame + 300;
	const rulerStep = pxPerSec >= 90 ? 1 : 2;

	const Slider = ({label, value, min, max, step, onChange}: {label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void}) => (
		<div className="prow">
			<div className="lab"><span>{label}</span></div>
			<div className="line">
				<input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
				<input type="number" min={min} max={max} step={step} value={Number(value.toFixed(2))} onChange={(e) => onChange(Number(e.target.value))} />
			</div>
		</div>
	);

	return (
		<div className="app">
			<div className="ribbon">
				<div className="brand">✂ Edit Studio</div>
				{[
					['🎞', 'Tệp phương tiện', false], ['🎵', 'Âm thanh', false], ['T', 'Văn bản', false], ['✨', 'Hiệu ứng', true],
					['⇄', 'Chuyển tiếp', false], ['▭', 'Chú thích', false], ['◎', 'Bộ lọc', false], ['⚙', 'Điều chỉnh', false],
				].map(([icon, label, on]) => (
					<button key={label as string} className={`tool ${on ? 'on' : ''}`} disabled={!on} title={on ? '' : 'Sắp có'}>
						<span className="ico">{icon}</span>{label}
					</button>
				))}
				<div className="spacer" />
				<div className="actions">
					<button onClick={undo} disabled={!past.length} title="Hoàn tác (Ctrl+Z)">↶ Hoàn tác</button>
					<button onClick={() => document.getElementById('openFile')?.click()}>📂 Mở</button>
					<button onClick={saveFile}>💾 Lưu</button>
					<button onClick={resetAll}>↺ Mặc định</button>
					<input id="openFile" type="file" accept="application/json" hidden onChange={(e) => e.target.files?.[0] && openFile(e.target.files[0])} />
				</div>
			</div>

			<aside className="lib">
				<div className="cats">
					{CATS.map((c, i) => (
						<button key={c.name} className={i === cat ? 'on' : ''} onClick={() => setCat(i)}>{c.name}</button>
					))}
				</div>
				<div className="libmain">
					<div className="search">
						<input type="text" placeholder="Tìm hiệu ứng..." value={query} onChange={(e) => setQuery(e.target.value)} />
					</div>
					<div className="grid">
						{filtered.map((e) => (
							<button key={e.id} className="tile" onClick={() => addEffect(e.id)} title="Bấm để thêm vào timeline">
								<div className="thumb" style={{background: `linear-gradient(135deg, ${colorOf(e.id)}, #111)`}}>{e.id}</div>
								<div className="nm">{e.name}</div>
							</button>
						))}
					</div>
				</div>
			</aside>

			<main className="stage">
				<div className="head">
					<span className="title">Trình phát · Effect demo</span>
					<span>Tỷ lệ 9:16</span>
					<span>{FPS} fps</span>
				</div>
				<div className="body">
					<div className="preview">
						<Player
							ref={playerRef}
							component={EditorProject}
							inputProps={{clips}}
							durationInFrames={total}
							compositionWidth={1080}
							compositionHeight={1920}
							fps={FPS}
							controls={false}
							clickToPlay={false}
							style={{width: '100%', height: '100%'}}
						/>
					</div>
				</div>
				<div className="playbar">
					<span className="timecode"><b>{tc(frame)}</b> / {tc(total)}</span>
					<div style={{flex: 1}} />
					<button onClick={stop} title="Về đầu">⏮</button>
					<button className="accent" onClick={togglePlay} title="Phát/Dừng (Space)">{playing ? '⏸' : '▶'}</button>
				</div>
			</main>

			<aside className="props">
				<div className="tabs">
					<span className="on">Cơ bản</span>
					<span className="dis" title="Sắp có">Tốc độ</span>
					<span className="dis" title="Sắp có">Hiệu ứng động</span>
					<span className="dis" title="Sắp có">Điều chỉnh</span>
				</div>
				<div className="scroll">
					{!sel && <div className="empty">Chọn một hiệu ứng trên timeline để chỉnh.<br />Bấm một ô trong thư viện để thêm.</div>}
					{sel && selEff && (
						<>
							<div className="prow"><div className="lab"><span>{selEff.id} · {selEff.name}</span></div></div>
							<div className="prow">
								<div className="lab"><span>Áp vào</span></div>
								<select value={sel.target ?? 'none'} style={{width: '100%', background: '#141414', color: 'var(--text)', border: '1px solid var(--line)', borderRadius: 6, padding: 6}} onChange={(e) => update(sel.id, {target: e.target.value as Clip['target']})}>
									<option value="none">Hiệu ứng riêng</option>
									<option value="text">Chữ</option>
									<option value="video">Footage (video)</option>
								</select>
							</div>
							{(TEXT_PROP[sel.effectId] || sel.target === 'text') && (
								<div className="prow">
									<div className="lab"><span>Chữ hiển thị</span></div>
									<input type="text" value={sel.text} placeholder="Để trống = chữ mặc định" onChange={(e) => update(sel.id, {text: e.target.value})} />
								</div>
							)}
							{sel.target === 'video' && (
								<div className="prow">
									<div className="lab"><span>File footage</span></div>
									<input type="text" value={sel.source ?? ''} placeholder="footage/ten-file.mp4" onChange={(e) => update(sel.id, {source: e.target.value})} />
									<div className="hint">Bỏ file vào thư mục remotion-app\public\footage</div>
								</div>
							)}
							<Slider label="Bắt đầu (giây)" value={sel.start / FPS} min={0} max={Math.max(1, total / FPS)} step={0.1} onChange={(v) => update(sel.id, {start: Math.max(0, Math.round(v * FPS))})} />
							<Slider label="Độ dài (giây)" value={sel.duration / FPS} min={0.2} max={20} step={0.1} onChange={(v) => update(sel.id, {duration: Math.max(6, Math.round(v * FPS))})} />
							<div className="prow">
								<button className="accent" style={{width: '100%'}} onClick={splitSel} disabled={frame <= sel.start || frame >= sel.start + sel.duration}>✂ Tách tại đầu kim (S)</button>
							</div>
							<div className="prow" style={{display: 'flex', gap: 8}}>
								<button style={{flex: 1, background: '#262626'}} onClick={duplicateSel}>⧉ Nhân đôi</button>
								<button style={{flex: 1, background: '#262626', color: 'var(--red)'}} onClick={removeSel}>🗑 Xóa</button>
							</div>
						</>
					)}
				</div>
			</aside>

			<section className="timeline">
				<div className="tl-tools">
					<button onClick={splitSel} title="Tách (S)">✂</button>
					<button onClick={duplicateSel} title="Nhân đôi (Ctrl+D)">⧉</button>
					<button onClick={removeSel} title="Xóa (Delete)">🗑</button>
					<button onClick={undo} disabled={!past.length} title="Hoàn tác (Ctrl+Z)">↶</button>
					<span className="shortcuts">Space phát/dừng · S tách · Ctrl+Z hoàn tác · Delete xóa</span>
					<div className="zoom">
						<span>−</span>
						<input type="range" min={30} max={160} value={pxPerSec} onChange={(e) => setPxPerSec(Number(e.target.value))} />
						<span>+</span>
					</div>
				</div>
				<div className="tl-body">
					<div className="track-head">
						<div className="h" />
						<div className="t" title="Hiệu ứng">▦</div>
					</div>
					<div className="scroller">
						<div className="inner" style={{width: trackWidth}} onPointerMove={onInnerMove} onPointerUp={onInnerUp} onPointerCancel={onInnerUp}>
							<div className="ruler" style={{width: trackWidth}} onPointerDown={onRulerDown}>
								{Array.from({length: seconds}, (_, s) => s).filter((s) => s % rulerStep === 0).map((s) => (
									<div key={s} className="tick" style={{left: s * pxPerSec}}>{tc(s * FPS).slice(3, 8)}</div>
								))}
							</div>
							<div className="lane" style={{width: trackWidth}}>
								{clips.map((c) => (
									<div
										key={c.id}
										className={`clip ${c.id === selected ? 'sel' : ''}`}
										style={{left: c.start * pxPerFrame, width: Math.max(24, c.duration * pxPerFrame), background: `linear-gradient(180deg, ${colorOf(c.effectId)}, #2a2a2a)`}}
										onPointerDown={(e) => onClipDown(e, c)}
										title={`${c.effectId} ${nameOf(c.effectId)}`}
									>
										<div className="lbl">{c.effectId} {nameOf(c.effectId)}</div>
										<div className="sub">{(c.duration / FPS).toFixed(1)}s{c.text ? ` · "${c.text}"` : ''}</div>
										<div className="grip" data-mode="resize" />
									</div>
								))}
							</div>
							<div className="playhead" style={{left: frame * pxPerFrame}} />
						</div>
					</div>
				</div>
			</section>
		</div>
	);
}

createRoot(document.getElementById('root')!).render(
	<StrictMode>
		<App />
	</StrictMode>,
);
