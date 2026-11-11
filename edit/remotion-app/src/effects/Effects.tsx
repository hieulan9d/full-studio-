import type {CSSProperties, FC, ReactNode} from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';

// Các tham số chuyển động đều nằm trong biến ramp để bạn dễ chỉnh.
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const ramp = (f: number, a: number, b: number, from: number, to: number) =>
	interpolate(f, [a, b], [from, to], clamp);

// Lớp nền thay cho footage thật: một người giả lập bằng hình tròn và thân.
const Base: FC<{color?: string; style?: CSSProperties; children?: ReactNode}> = ({
	color = '#2b2b33',
	style,
	children,
}) => (
	<AbsoluteFill style={{background: color, overflow: 'hidden', ...style}}>
		<div style={{position: 'absolute', left: '50%', top: '40%', width: 520, height: 520, marginLeft: -260, marginTop: -260, borderRadius: '50%', background: '#d9b99b'}} />
		<div style={{position: 'absolute', left: '50%', top: '66%', width: 900, height: 760, marginLeft: -450, borderRadius: '50% 50% 0 0', background: '#f2f2f2'}} />
		{children}
	</AbsoluteFill>
);

const card: CSSProperties = {background: '#fff', color: '#111', borderRadius: 28, padding: 36, fontSize: 40, fontFamily: 'Inter, sans-serif', fontWeight: 600};

export const Orbit: FC = () => {
	const f = useCurrentFrame();
	return (
		<AbsoluteFill style={{perspective: 1200}}>
			<AbsoluteFill style={{transform: `rotateY(${ramp(f, 0, 90, -35, 35)}deg)`}}>
				<Base />
			</AbsoluteFill>
		</AbsoluteFill>
	);
};

export const ChatTakeover: FC = () => {
	const f = useCurrentFrame();
	const y = ramp(f, 0, 20, 900, 0);
	return (
		<>
			<Base color="#111" />
			<AbsoluteFill style={{justifyContent: 'flex-end', padding: 40}}>
				<div style={{...card, transform: `translateY(${y}px)`}}>
					<div style={{background: '#eee', borderRadius: 18, padding: 20, marginBottom: 20}}>Edit video này, caption từng từ.</div>
					<div>On it.</div>
				</div>
			</AbsoluteFill>
		</>
	);
};

export const FrameEscape: FC = () => {
	const f = useCurrentFrame();
	const s = f < 45 ? ramp(f, 0, 45, 0.5, 1) : ramp(f, 45, 90, 1, 1.6);
	const o = f < 45 ? 1 : ramp(f, 60, 90, 1, 0);
	return (
		<>
			<Base color="#1a1a22" />
			<AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
				<div style={{width: 800, height: 1100, border: '14px solid #fff', borderRadius: 24, transform: `scale(${s})`, opacity: o, overflow: 'hidden'}}>
					<Base />
				</div>
			</AbsoluteFill>
		</>
	);
};

export const SnapZoom: FC = () => {
	const f = useCurrentFrame();
	const {fps} = useVideoConfig();
	const s = spring({frame: f, fps, config: {damping: 14, stiffness: 220}});
	return (
		<AbsoluteFill style={{transform: `scale(${1 + 0.25 * s})`}}>
			<Base />
		</AbsoluteFill>
	);
};

const checklistItems = ['Cắt đoạn ngừng', 'Chèn phụ đề', 'Thêm B-roll', 'Xuất video'];

export const ChecklistPop: FC = () => {
	const f = useCurrentFrame();
	const {fps} = useVideoConfig();
	const pop = spring({frame: f, fps, config: {damping: 12}});
	return (
		<>
			<Base color="#1b1b22" />
			<AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
				<div style={{...card, width: 760, transform: `scale(${pop})`}}>
					{checklistItems.map((item, i) => (
						<div key={item} style={{padding: '14px 0', opacity: ramp(f, i * 8, i * 8 + 10, 0, 1)}}>
							✔ {item}
						</div>
					))}
				</div>
			</AbsoluteFill>
		</>
	);
};

const tags = [
	{text: 'CLAUDE CHỈNH VIDEO', top: 380, from: -1200, angle: -6},
	{text: 'EDITORS OUT OF JOB?', top: 520, from: 1200, angle: 4},
	{text: 'CẮT 20 EFFECTS', top: 660, from: -1200, angle: -3},
	{text: 'MỘT CÚ CLICK', top: 800, from: 1200, angle: 5},
];

export const HeadlineStorm: FC = () => {
	const f = useCurrentFrame();
	return (
		<>
			<Base color="#101014" />
			{tags.map((t, i) => (
				<div
					key={t.text}
					style={{
						position: 'absolute',
						top: t.top,
						left: 60,
						transform: `translateX(${ramp(f, i * 6, i * 6 + 18, t.from, 0)}px) rotate(${t.angle}deg)`,
						background: i % 2 ? '#ff5a1f' : '#fff',
						color: i % 2 ? '#fff' : '#111',
						padding: '14px 24px',
						fontSize: 46,
						fontWeight: 800,
						fontFamily: 'Inter, sans-serif',
						borderRadius: 8,
					}}
				>
					{t.text}
				</div>
			))}
		</>
	);
};

export const ZoomPortal: FC = () => {
	const f = useCurrentFrame();
	const r = ramp(f, 0, 45, 0, 75);
	return (
		<>
			<AbsoluteFill style={{background: '#0b0b10'}} />
			<AbsoluteFill style={{clipPath: `circle(${r}% at 50% 50%)`}}>
				<AbsoluteFill style={{transform: 'scale(1.6)'}}>
					<Base color="#c8553d" />
				</AbsoluteFill>
			</AbsoluteFill>
		</>
	);
};

export const GrowthCurve: FC = () => {
	const f = useCurrentFrame();
	const p = ramp(f, 0, 60, 0, 1);
	const len = 1400;
	return (
		<>
			<Base color="#0b0b10" />
			<AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
				<svg width={960} height={520} viewBox="0 0 960 520">
					<polyline
						points="20,480 240,430 420,400 600,300 760,180 940,40"
						fill="none"
						stroke="#ff5a1f"
						strokeWidth={14}
						strokeLinecap="round"
						strokeDasharray={len}
						strokeDashoffset={len * (1 - p)}
					/>
				</svg>
				<div style={{position: 'absolute', top: 260, fontSize: 180, fontWeight: 900, color: '#ff5a1f', opacity: ramp(f, 50, 70, 0, 1), fontFamily: 'Inter, sans-serif'}}>8×</div>
			</AbsoluteFill>
		</>
	);
};

export const StudioReveal: FC = () => {
	const f = useCurrentFrame();
	return (
		<>
			<Base style={{filter: `blur(${ramp(f, 0, 30, 20, 0)}px)`}} />
			<AbsoluteFill style={{background: 'radial-gradient(circle at 50% 40%, transparent 35%, #000 100%)'}} />
			<div style={{position: 'absolute', bottom: 200, width: '100%', textAlign: 'center', fontSize: 72, fontWeight: 800, color: '#fff', fontFamily: 'Inter, sans-serif', opacity: ramp(f, 30, 50, 0, 1)}}>STUDIO</div>
		</>
	);
};

export const BrollOverlay: FC = () => {
	const f = useCurrentFrame();
	return (
		<>
			<Base />
			<div style={{position: 'absolute', top: 320, left: 60, right: 60, height: 700, borderRadius: 24, background: '#1d2b4a', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 56, fontFamily: 'Inter, sans-serif', transform: `translateY(${ramp(f, 0, 20, 600, 0)}px)`}}>
				B-roll (thay bằng clip của bạn)
			</div>
		</>
	);
};

export const PaperCutout: FC = () => {
	const f = useCurrentFrame();
	return (
		<AbsoluteFill style={{background: '#e9e4da'}}>
			<div style={{position: 'absolute', inset: 90, borderRadius: 20, background: '#fff', boxShadow: '0 30px 60px rgba(0,0,0,.35)', transform: `rotate(${ramp(f, 0, 30, -6, -2)}deg)`, overflow: 'hidden'}}>
				<Base color="#444" />
			</div>
		</AbsoluteFill>
	);
};

export const DollyZoom: FC = () => {
	const f = useCurrentFrame();
	const k = ramp(f, 0, 90, 1, 1.35);
	return (
		<>
			<AbsoluteFill style={{background: 'repeating-linear-gradient(90deg, #2a2a36 0 40px, #1a1a22 40px 80px)', transform: `scale(${1 / k})`}} />
			<AbsoluteFill style={{transform: `scale(${k})`}}>
				<Base />
			</AbsoluteFill>
		</>
	);
};

export const MagazineCover: FC = () => {
	const f = useCurrentFrame();
	return (
		<>
			<Base color="#e8dcc8" />
			<div style={{position: 'absolute', top: 140, width: '100%', textAlign: 'center', fontSize: 220, fontWeight: 900, color: '#111', fontFamily: 'Inter, sans-serif', transform: `translateY(${ramp(f, 0, 30, -200, 0)}px)`}}>
				CLAUDE
			</div>
			<div style={{position: 'absolute', bottom: 260, left: 60, fontSize: 56, fontWeight: 700, color: '#111', fontFamily: 'Inter, sans-serif', opacity: ramp(f, 20, 40, 0, 1)}}>
				Chỉnh video trong 1 câu lệnh
			</div>
		</>
	);
};

export const LiquidGlass: FC = () => {
	const f = useCurrentFrame();
	return (
		<>
			<Base />
			<div style={{position: 'absolute', top: 600, left: ramp(f, 0, 90, 200, 600), width: 420, height: 420, borderRadius: '50%', backdropFilter: 'blur(14px) saturate(160%)', background: 'rgba(255,255,255,0.12)', border: '2px solid rgba(255,255,255,.35)'}} />
		</>
	);
};

export const ZoomThroughCut: FC = () => {
	const f = useCurrentFrame();
	return (
		<>
			<AbsoluteFill style={{transform: `scale(${ramp(f, 0, 30, 1, 3)})`, opacity: ramp(f, 20, 40, 1, 0)}}>
				<Base color="#1f3b57" />
			</AbsoluteFill>
			<AbsoluteFill style={{transform: `scale(${ramp(f, 40, 60, 0.5, 1)})`, opacity: ramp(f, 40, 50, 0, 1)}}>
				<Base color="#5a2e1f" />
			</AbsoluteFill>
		</>
	);
};

export const GreenScreen: FC = () => {
	const f = useCurrentFrame();
	const replaced = f > 45;
	return (
		<>
			<AbsoluteFill style={{background: replaced ? 'radial-gradient(circle, #1e3a8a, #3b0764)' : '#00b140'}} />
			<AbsoluteFill>
				<Base color="transparent" />
			</AbsoluteFill>
		</>
	);
};

export const FrameBreak: FC = () => {
	const f = useCurrentFrame();
	const x = ramp(f, 30, 60, 0, 120);
	return (
		<>
			<AbsoluteFill style={{clipPath: 'inset(0 50% 0 0)', transform: `translateX(${-x}px)`}}>
				<Base />
			</AbsoluteFill>
			<AbsoluteFill style={{clipPath: 'inset(0 0 0 50%)', transform: `translateX(${x}px)`}}>
				<Base />
			</AbsoluteFill>
		</>
	);
};

const corner: CSSProperties = {position: 'absolute', width: 90, height: 90, borderColor: '#fff', borderStyle: 'solid', borderWidth: 0};

export const DigitalZoom: FC = () => {
	const f = useCurrentFrame();
	const z = 1 + ramp(f, 0, 90, 0, 1.2);
	return (
		<>
			<AbsoluteFill style={{transform: `scale(${z})`}}>
				<Base />
			</AbsoluteFill>
			<div style={{...corner, top: 120, left: 120, borderTopWidth: 6, borderLeftWidth: 6}} />
			<div style={{...corner, top: 120, right: 120, borderTopWidth: 6, borderRightWidth: 6}} />
			<div style={{...corner, bottom: 200, left: 120, borderBottomWidth: 6, borderLeftWidth: 6}} />
			<div style={{...corner, bottom: 200, right: 120, borderBottomWidth: 6, borderRightWidth: 6}} />
			<div style={{position: 'absolute', top: 150, left: 150, color: '#ff3b30', fontFamily: 'Inter, sans-serif', fontWeight: 700, opacity: Math.floor(f / 15) % 2}}>● REC</div>
			<div style={{position: 'absolute', top: 150, right: 150, color: '#fff', fontFamily: 'Inter, sans-serif', fontWeight: 700}}>{z.toFixed(1)}x</div>
		</>
	);
};

export const PhoneMockup: FC = () => {
	const f = useCurrentFrame();
	return (
		<AbsoluteFill style={{background: '#0f0f14', justifyContent: 'center', alignItems: 'center'}}>
			<div style={{width: 600, height: 1200, borderRadius: 90, border: '18px solid #222', overflow: 'hidden', position: 'relative', transform: `translateY(${ramp(f, 0, 25, 800, 0)}px)`}}>
				<Base />
			</div>
		</AbsoluteFill>
	);
};

const checkRows = ['Cắt đoạn ngừng', 'Phụ đề từng từ', 'B-roll', 'Hiệu ứng text'];

export const Checklist: FC = () => {
	const f = useCurrentFrame();
	return (
		<AbsoluteFill style={{background: '#0f0f14', justifyContent: 'center', padding: 80, fontFamily: 'Inter, sans-serif', color: '#fff'}}>
			{checkRows.map((row, i) => (
				<div key={row} style={{display: 'flex', alignItems: 'center', gap: 24, fontSize: 56, padding: '22px 0', transform: `translateX(${ramp(f, i * 8, i * 8 + 12, -300, 0)}px)`, opacity: ramp(f, i * 8, i * 8 + 12, 0, 1)}}>
					<span style={{width: 56, height: 56, borderRadius: 12, border: '4px solid #ff5a1f', background: f > i * 8 + 14 ? '#ff5a1f' : 'transparent'}} />
					{row}
				</div>
			))}
		</AbsoluteFill>
	);
};

export const EFFECTS: {id: string; name: string; Component: FC}[] = [
	{id: '01', name: 'Orbit', Component: Orbit},
	{id: '02', name: 'Chat Takeover', Component: ChatTakeover},
	{id: '03', name: 'Frame Escape', Component: FrameEscape},
	{id: '04', name: 'Snap Zoom', Component: SnapZoom},
	{id: '05', name: 'Checklist Pop', Component: ChecklistPop},
	{id: '06', name: 'Headline Storm', Component: HeadlineStorm},
	{id: '07', name: 'Zoom Portal', Component: ZoomPortal},
	{id: '08', name: 'Growth Curve', Component: GrowthCurve},
	{id: '09', name: 'Studio Reveal', Component: StudioReveal},
	{id: '10', name: 'B-roll Overlay', Component: BrollOverlay},
	{id: '11', name: 'Paper Cutout', Component: PaperCutout},
	{id: '12', name: 'Dolly Zoom', Component: DollyZoom},
	{id: '13', name: 'Magazine Cover', Component: MagazineCover},
	{id: '14', name: 'Liquid Glass', Component: LiquidGlass},
	{id: '15', name: 'Zoom Through Cut', Component: ZoomThroughCut},
	{id: '16', name: 'Green Screen', Component: GreenScreen},
	{id: '17', name: 'Frame Break', Component: FrameBreak},
	{id: '18', name: 'Digital Zoom', Component: DigitalZoom},
	{id: '19', name: 'Phone Mockup', Component: PhoneMockup},
	{id: '20', name: 'Checklist', Component: Checklist},
];
