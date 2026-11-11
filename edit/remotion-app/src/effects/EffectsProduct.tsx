import type {FC, ReactNode} from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';

// Gói hiệu ứng quảng cáo sản phẩm, dựng theo video mẫu "video sản phẩm" (BOJOMI):
// chớp vàng chuyển cảnh, bụi sáng bokeh, cầu vàng + chú thích, bong bóng kính + vệt sáng bay quanh.
export type ProductProps = {layer?: ReactNode; text?: string; sub?: string};

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const SERIF = 'Georgia, "Times New Roman", serif';
const GOLD = '#f2c15a';
const GREEN = '#2f6b45';
const rnd = (n: number) => {
	const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
	return x - Math.floor(x);
};

const Backdrop: FC<{layer?: ReactNode; children?: ReactNode}> = ({layer, children}) => (
	<AbsoluteFill style={{background: layer ? '#000' : 'linear-gradient(160deg, #efe6d2 0%, #d9ccb0 55%, #b9b595 100%)', overflow: 'hidden'}}>
		{layer && <AbsoluteFill>{layer}</AbsoluteFill>}
		{children}
	</AbsoluteFill>
);

// Bụi sáng vàng lơ lửng, nhấp nháy.
const Dust: FC<{count?: number; seed?: number; fade?: number}> = ({count = 70, seed = 0, fade = 1}) => {
	const f = useCurrentFrame();
	return (
		<>
			{Array.from({length: count}, (_, i) => {
				const k = i + seed;
				const size = 4 + rnd(k + 1) * 16;
				const x = rnd(k) * 100;
				const y = ((rnd(k + 2) * 100 - f * (0.15 + rnd(k + 3) * 0.35)) % 100 + 100) % 100;
				const tw = 0.35 + 0.65 * Math.abs(Math.sin(f * (0.08 + rnd(k + 4) * 0.15) + k));
				return <div key={i} style={{position: 'absolute', left: `${x}%`, top: `${y}%`, width: size, height: size, borderRadius: '50%', background: `radial-gradient(circle, #fff7d6 0%, ${GOLD} 45%, transparent 72%)`, opacity: tw * fade, filter: size > 12 ? 'blur(1.5px)' : undefined}} />;
			})}
		</>
	);
};

// 01 Gold flash: chớp sáng vàng từ một điểm, bụi sáng tỏa ra rồi lộ cảnh mới.
export const GoldFlash: FC<ProductProps> = ({layer}) => {
	const f = useCurrentFrame();
	const flash = interpolate(f, [0, 8, 14, 30], [0, 1, 0.9, 0], clamp);
	const bloom = interpolate(f, [0, 10], [60, 2200], clamp);
	return (
		<Backdrop layer={layer}>
			<Dust fade={interpolate(f, [8, 20, 40], [0, 1, 0.5], clamp)} />
			<div style={{position: 'absolute', left: '36%', top: '45%', width: bloom, height: bloom, marginLeft: -bloom / 2, marginTop: -bloom / 2, borderRadius: '50%', background: 'radial-gradient(circle, #fffbe8 0%, rgba(255,226,140,.9) 35%, rgba(255,200,90,0) 70%)', opacity: flash, mixBlendMode: 'screen'}} />
			<AbsoluteFill style={{background: '#fff6d8', opacity: interpolate(f, [4, 12, 22], [0, 0.85, 0], clamp)}} />
		</Backdrop>
	);
};

// 02 Sparkle dust: bụi vàng bokeh trôi nhẹ trên footage (dùng suốt cảnh).
export const SparkleDust: FC<ProductProps> = ({layer}) => (
	<Backdrop layer={layer}>
		<Dust count={90} />
		<AbsoluteFill style={{background: 'radial-gradient(circle at 70% 25%, rgba(255,226,140,.35), transparent 55%)', mixBlendMode: 'screen'}} />
	</Backdrop>
);

// 03 Glow orb callout: cầu vàng phát sáng bật ra, chữ chú thích trượt vào bên phải.
export const GlowOrbCallout: FC<ProductProps> = ({text = 'Calcium', sub = 'Aquamin (417.6 mg)', layer}) => {
	const f = useCurrentFrame();
	const {fps} = useVideoConfig();
	const pop = spring({frame: f, fps, config: {damping: 11}});
	const pulse = 1 + 0.04 * Math.sin(f * 0.4);
	const slide = interpolate(f, [8, 22], [60, 0], clamp);
	const op = interpolate(f, [8, 20], [0, 1], clamp);
	return (
		<Backdrop layer={layer}>
			<Dust count={50} seed={40} />
			<div style={{position: 'absolute', left: 90, top: '42%', width: 300, height: 300, transform: `scale(${pop * pulse})`, borderRadius: '50%', background: 'radial-gradient(circle at 50% 50%, #fffbe6 0%, #ffe28a 28%, #e8a93a 70%, #b9791c 100%)', boxShadow: '0 0 80px 30px rgba(255,205,90,.55), inset 0 0 40px rgba(255,255,255,.6)'}} />
			<div style={{position: 'absolute', left: 430, top: '41%', opacity: op, transform: `translateX(${slide}px)`, fontFamily: SERIF}}>
				<div style={{fontSize: 74, fontWeight: 700, color: GOLD, textShadow: '0 4px 14px rgba(120,80,0,.45)'}}>{text}</div>
				<div style={{fontSize: 56, fontWeight: 700, color: GREEN, lineHeight: 1.15, whiteSpace: 'nowrap', textShadow: '0 2px 8px rgba(255,255,255,.6)'}}>{sub}</div>
			</div>
		</Backdrop>
	);
};

// 04 Vitamin bubbles: ba bong bóng kính chứa tên chất, nối bằng vệt sáng xanh–vàng bay quanh.
const BUBBLES = [
	{x: 230, y: 960, t: 'Vitamin', n: 'D3', v: '(779.4 IU)', d: 0},
	{x: 770, y: 720, t: 'Vitamin', n: 'D3', v: '(779.4 IU)', d: 5},
	{x: 800, y: 1110, t: 'Vitamin', n: 'K2', v: '(169.8 mcg)', d: 10},
];

export const VitaminBubbles: FC<ProductProps> = ({layer}) => {
	const f = useCurrentFrame();
	const {fps} = useVideoConfig();
	const draw = interpolate(f, [4, 26], [1, 0], clamp);
	const spin = f * 3;
	const trail = (a: (typeof BUBBLES)[number], b: (typeof BUBBLES)[number], color: string, bend: number, w: number) => (
		<path d={`M ${a.x} ${a.y} C ${(a.x + b.x) / 2} ${a.y + bend}, ${(a.x + b.x) / 2} ${b.y - bend}, ${b.x} ${b.y}`} fill="none" stroke={color} strokeWidth={w} strokeLinecap="round" pathLength={1} strokeDasharray="1" strokeDashoffset={draw} style={{filter: `drop-shadow(0 0 10px ${color})`}} />
	);
	return (
		<Backdrop layer={layer}>
			<Dust count={40} seed={80} />
			<svg width="1080" height="1920" style={{position: 'absolute', inset: 0}}>
				{trail(BUBBLES[0], BUBBLES[1], '#ffd979', -140, 5)}
				{trail(BUBBLES[0], BUBBLES[2], '#8fe6b0', 110, 6)}
				{trail(BUBBLES[1], BUBBLES[2], '#fff1b8', -80, 4)}
				<ellipse cx={640} cy={900} rx={300} ry={150} fill="none" stroke="#ffe39a" strokeWidth={4} opacity={0.7} transform={`rotate(${-20 + Math.sin(f * 0.1) * 4} 640 900)`} strokeDasharray="120 30" strokeDashoffset={-spin} style={{filter: 'drop-shadow(0 0 8px #ffd979)'}} />
			</svg>
			{BUBBLES.map((b, i) => {
				const s = spring({frame: f - b.d, fps, config: {damping: 9}});
				const float = Math.sin((f + i * 11) * 0.12) * 8;
				return (
					<div key={i} style={{position: 'absolute', left: b.x - 150, top: b.y - 150 + float, width: 300, height: 300, transform: `scale(${s})`, borderRadius: '50%', background: 'radial-gradient(circle at 32% 28%, rgba(255,255,255,.85), rgba(255,255,255,.28) 38%, rgba(255,255,255,.12) 70%)', border: '3px solid rgba(255,255,255,.7)', boxShadow: 'inset 0 0 40px rgba(255,255,255,.55), 0 10px 40px rgba(0,0,0,.18)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', fontFamily: SERIF, color: GREEN}}>
						<div style={{fontSize: 40, fontWeight: 700}}>{b.t}</div>
						<div style={{fontSize: 96, fontWeight: 800, lineHeight: 1}}>{b.n}</div>
						<div style={{fontSize: 30, fontWeight: 600}}>{b.v}</div>
					</div>
				);
			})}
		</Backdrop>
	);
};

export const EFFECTS_PRODUCT: {id: string; name: string; Component: FC<ProductProps>}[] = [
	{id: '01', name: 'Gold flash', Component: GoldFlash},
	{id: '02', name: 'Sparkle dust', Component: SparkleDust},
	{id: '03', name: 'Glow orb callout', Component: GlowOrbCallout},
	{id: '04', name: 'Vitamin bubbles', Component: VitaminBubbles},
];
