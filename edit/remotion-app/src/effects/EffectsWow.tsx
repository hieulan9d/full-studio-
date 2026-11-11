import type {FC, ReactNode} from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';

// Gói hiệu ứng "wow": glitch, light leak, neon, sóng xung kích, hạt nổ, rung nhịp, tiêu đề điện ảnh, vạch chuyển cảnh.
// Mỗi effect nhận `layer` (footage thật) hoặc dùng nền giả lập khi không có.
export type WowProps = {layer?: ReactNode; text?: string};

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const FONT = 'Inter, sans-serif';
// Số giả ngẫu nhiên xác định (cùng frame -> cùng kết quả khi render).
const rnd = (n: number) => {
	const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
	return x - Math.floor(x);
};

const Backdrop: FC<{layer?: ReactNode; children?: ReactNode}> = ({layer, children}) => (
	<AbsoluteFill style={{background: layer ? '#000' : 'radial-gradient(circle at 50% 40%, #3a3a52, #101018)', overflow: 'hidden'}}>
		{layer && <AbsoluteFill>{layer}</AbsoluteFill>}
		{children}
	</AbsoluteFill>
);

// 01 Glitch title: chữ tách kênh RGB, cắt lát giật ngang rồi ổn định.
export const GlitchTitle: FC<WowProps> = ({text = 'GLITCH', layer}) => {
	const f = useCurrentFrame();
	const calm = interpolate(f, [0, 18], [1, 0], clamp);
	const jitter = (seed: number) => (rnd(f * 3 + seed) - 0.5) * 80 * calm;
	const word = (color: string, dx: number, dy: number, blend?: 'screen') => (
		<div style={{position: 'absolute', fontFamily: FONT, fontWeight: 900, fontSize: 210, color, transform: `translate(${dx}px, ${dy}px)`, mixBlendMode: blend}}>{text}</div>
	);
	return (
		<Backdrop layer={layer}>
			<AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
				{word('#ff2a55', jitter(1) - 14 * calm, jitter(2) * 0.2, 'screen')}
				{word('#19e6ff', jitter(3) + 14 * calm, jitter(4) * 0.2, 'screen')}
				{word('#fff', jitter(5) * 0.3, 0)}
				{[0, 1, 2, 3, 4].map((i) => (
					<div key={i} style={{position: 'absolute', left: 0, right: 0, top: `${30 + i * 9 + rnd(f + i) * 4}%`, height: 14 + rnd(f * 2 + i) * 22, background: 'rgba(255,255,255,.12)', transform: `translateX(${jitter(i + 9) * 3}px)`, opacity: calm}} />
				))}
			</AbsoluteFill>
		</Backdrop>
	);
};

// 02 Light leak: dải sáng cam–hồng quét ngang với chế độ hòa trộn screen.
export const LightLeak: FC<WowProps> = ({text = 'LIGHT LEAK', layer}) => {
	const f = useCurrentFrame();
	const x = interpolate(f, [0, 33], [-60, 120], clamp);
	const pulse = 0.65 + 0.35 * Math.sin(f * 0.5);
	return (
		<Backdrop layer={layer}>
			<AbsoluteFill style={{mixBlendMode: 'screen', opacity: pulse, background: `linear-gradient(105deg, transparent ${x - 40}%, rgba(255,140,40,.9) ${x - 15}%, rgba(255,60,140,.85) ${x}%, rgba(90,120,255,.5) ${x + 15}%, transparent ${x + 40}%)`}} />
			<AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
				<div style={{fontFamily: FONT, fontWeight: 800, fontSize: 120, color: '#fff', letterSpacing: 8, textShadow: '0 0 40px rgba(255,150,80,.8)'}}>{text}</div>
			</AbsoluteFill>
		</Backdrop>
	);
};

// 03 Neon sign: biển neon nhấp nháy bật lên rồi sáng ổn định.
export const NeonSign: FC<WowProps> = ({text = 'NEON', layer}) => {
	const f = useCurrentFrame();
	const flicker = f < 14 ? (rnd(Math.floor(f / 2)) > 0.45 ? 1 : 0.15) : 1;
	const glow = (r: number) => `0 0 ${r}px #ff3df2`;
	return (
		<Backdrop layer={layer}>
			<AbsoluteFill style={{background: 'rgba(0,0,0,.55)', justifyContent: 'center', alignItems: 'center'}}>
				<div style={{fontFamily: FONT, fontWeight: 900, fontSize: 230, color: '#ffe6fd', opacity: flicker, textShadow: `${glow(8)}, ${glow(24)}, ${glow(56)}, ${glow(110)}`, border: '10px solid #ff3df2', borderRadius: 40, padding: '10px 50px', boxShadow: `0 0 30px #ff3df2, inset 0 0 30px #ff3df2`}}>{text}</div>
			</AbsoluteFill>
		</Backdrop>
	);
};

// 04 Shockwave: chớp trắng + vòng sóng lan + chữ nảy.
export const Shockwave: FC<WowProps> = ({text = 'BOOM', layer}) => {
	const f = useCurrentFrame();
	const {fps} = useVideoConfig();
	const flash = interpolate(f, [0, 2, 10], [0, 0.95, 0], clamp);
	const hit = spring({frame: f, fps, config: {damping: 6, stiffness: 260}});
	const ring = (d: number) => interpolate(f, [d, d + 22], [0, 1800], clamp);
	return (
		<Backdrop layer={layer}>
			{[0, 5, 10].map((d) => (
				<div key={d} style={{position: 'absolute', left: '50%', top: '50%', width: ring(d), height: ring(d), marginLeft: -ring(d) / 2, marginTop: -ring(d) / 2, borderRadius: '50%', border: `${14 - d / 2}px solid rgba(255,255,255,${interpolate(f, [d, d + 22], [0.9, 0], clamp)})`}} />
			))}
			<AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
				<div style={{fontFamily: FONT, fontWeight: 900, fontSize: 260, color: '#fff', transform: `scale(${hit})`, textShadow: '0 10px 40px rgba(0,0,0,.6)'}}>{text}</div>
			</AbsoluteFill>
			<AbsoluteFill style={{background: '#fff', opacity: flash}} />
		</Backdrop>
	);
};

// 05 Particle burst: hạt phát sáng bắn tỏa ra từ giữa khung.
export const ParticleBurst: FC<WowProps> = ({text = 'WOW', layer}) => {
	const f = useCurrentFrame();
	const {fps} = useVideoConfig();
	const pop = spring({frame: f, fps, config: {damping: 9}});
	return (
		<Backdrop layer={layer}>
			{Array.from({length: 64}, (_, i) => {
				const ang = rnd(i) * Math.PI * 2;
				const speed = 300 + rnd(i + 99) * 900;
				const t = f / 33;
				const r = speed * (1 - Math.pow(1 - t, 2));
				const size = 8 + rnd(i + 7) * 22;
				const hue = 20 + rnd(i + 3) * 50;
				return <div key={i} style={{position: 'absolute', left: `calc(50% + ${Math.cos(ang) * r}px)`, top: `calc(50% + ${Math.sin(ang) * r + 250 * t * t}px)`, width: size, height: size, borderRadius: '50%', background: `hsl(${hue},100%,65%)`, boxShadow: `0 0 ${size * 2}px hsl(${hue},100%,55%)`, opacity: interpolate(f, [0, 6, 33], [0, 1, 0], clamp)}} />;
			})}
			<AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
				<div style={{fontFamily: FONT, fontWeight: 900, fontSize: 280, color: '#fff', transform: `scale(${pop})`, textShadow: '0 0 60px rgba(255,170,60,.9)'}}>{text}</div>
			</AbsoluteFill>
		</Backdrop>
	);
};

// 06 Beat shake: khung rung và nháy sáng theo nhịp (mỗi ~8 frame một nhịp, tắt dần).
export const BeatShake: FC<WowProps> = ({text = 'BEAT', layer}) => {
	const f = useCurrentFrame();
	const phase = f % 8;
	const hit = Math.exp(-phase / 2.2);
	const dx = (rnd(f) - 0.5) * 60 * hit;
	const dy = (rnd(f + 50) - 0.5) * 60 * hit;
	const zoom = 1 + 0.09 * hit;
	return (
		<Backdrop layer={layer}>
			<AbsoluteFill style={{transform: `translate(${dx}px, ${dy}px) scale(${zoom})`, justifyContent: 'center', alignItems: 'center'}}>
				<div style={{fontFamily: FONT, fontWeight: 900, fontSize: 240, color: '#fff'}}>{text}</div>
			</AbsoluteFill>
			<AbsoluteFill style={{background: `rgba(255,255,255,${0.35 * hit})`}} />
		</Backdrop>
	);
};

// 07 Cinematic title: hai vạch đen điện ảnh, chữ giãn cách mở ra và tan sáng.
export const CinematicTitle: FC<WowProps> = ({text = 'CINEMATIC', layer}) => {
	const f = useCurrentFrame();
	const bar = interpolate(f, [0, 14], [0, 230], clamp);
	const spacing = interpolate(f, [4, 33], [70, 14], clamp);
	const op = interpolate(f, [4, 16], [0, 1], clamp);
	return (
		<Backdrop layer={layer}>
			<AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', transform: `scale(${interpolate(f, [0, 33], [1.0, 1.08], clamp)})`}}>
				<div style={{fontFamily: FONT, fontWeight: 300, fontSize: 110, color: '#fff', letterSpacing: spacing, opacity: op, paddingLeft: spacing, filter: `blur(${interpolate(f, [4, 20], [14, 0], clamp)}px)`}}>{text}</div>
			</AbsoluteFill>
			<div style={{position: 'absolute', top: 0, left: 0, right: 0, height: bar, background: '#000'}} />
			<div style={{position: 'absolute', bottom: 0, left: 0, right: 0, height: bar, background: '#000'}} />
		</Backdrop>
	);
};

// 08 Slash wipe: vạch chéo quét ngang rồi lộ footage / cảnh mới.
export const SlashWipe: FC<WowProps> = ({text = 'SLASH', layer}) => {
	const f = useCurrentFrame();
	const p = interpolate(f, [4, 22], [-30, 130], clamp);
	return (
		<Backdrop layer={layer}>
			<AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
				<div style={{fontFamily: FONT, fontWeight: 900, fontSize: 230, color: '#fff'}}>{text}</div>
			</AbsoluteFill>
			<AbsoluteFill style={{background: '#ff2a55', clipPath: `polygon(${p - 30}% 0, ${p}% 0, ${p - 20}% 100%, ${p - 50}% 100%)`}} />
			<AbsoluteFill style={{background: '#fff', clipPath: `polygon(${p - 8}% 0, ${p - 4}% 0, ${p - 24}% 100%, ${p - 28}% 100%)`}} />
		</Backdrop>
	);
};

export const EFFECTS_WOW: {id: string; name: string; Component: FC<WowProps>}[] = [
	{id: '01', name: 'Glitch title', Component: GlitchTitle},
	{id: '02', name: 'Light leak', Component: LightLeak},
	{id: '03', name: 'Neon sign', Component: NeonSign},
	{id: '04', name: 'Shockwave', Component: Shockwave},
	{id: '05', name: 'Particle burst', Component: ParticleBurst},
	{id: '06', name: 'Beat shake', Component: BeatShake},
	{id: '07', name: 'Cinematic title', Component: CinematicTitle},
	{id: '08', name: 'Slash wipe', Component: SlashWipe},
];
