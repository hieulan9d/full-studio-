import type {CSSProperties, FC, ReactNode} from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';

// Mỗi effect nhận tùy chọn `layer`: nội dung thật (footage hoặc chữ). Không có layer thì dùng người giả lập.
export type Props = {layer?: ReactNode; text?: string; label?: string; title?: string; caption?: string; word?: string};

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const ramp = (f: number, a: number, b: number, from: number, to: number) =>
	interpolate(f, [a, b], [from, to], clamp);
const FONT = 'Inter, sans-serif';

const Figure: FC = () => (
	<>
		<div style={{position: 'absolute', left: '50%', top: '38%', width: 500, height: 500, marginLeft: -250, marginTop: -250, borderRadius: '50%', background: '#d9b99b'}} />
		<div style={{position: 'absolute', left: '50%', top: '66%', width: 900, height: 760, marginLeft: -450, borderRadius: '50% 50% 0 0', background: '#f2f2f2'}} />
	</>
);

// Khung nền chung: có layer thì hiện layer, không thì hiện người giả lập.
const Stage: FC<{bg?: string; layer?: ReactNode; children?: ReactNode}> = ({bg = '#2b2b33', layer, children}) => (
	<AbsoluteFill style={{background: layer ? '#000' : bg, overflow: 'hidden'}}>
		{layer ? <AbsoluteFill>{layer}</AbsoluteFill> : <Figure />}
		{children}
	</AbsoluteFill>
);

const card: CSSProperties = {background: '#fff', color: '#111', borderRadius: 24, fontFamily: FONT};

// 01 Kinetic hook: từng từ phóng to rồi ổn định.
export const KineticHook: FC<Props> = ({text = 'KINETIC HOOK', layer}) => {
	const f = useCurrentFrame();
	const {fps} = useVideoConfig();
	return (
		<AbsoluteFill style={{background: '#111', overflow: 'hidden'}}>
			{layer && <AbsoluteFill>{layer}</AbsoluteFill>}
			<AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', flexDirection: 'column'}}>
				{text.split(' ').map((w, i) => {
					const s = spring({frame: f - i * 4, fps, config: {damping: 10}});
					return <div key={i} style={{fontFamily: FONT, fontWeight: 900, fontSize: 150, color: '#fff', transform: `scale(${s})`, textShadow: '0 6px 20px rgba(0,0,0,.5)'}}>{w}</div>;
				})}
			</AbsoluteFill>
		</AbsoluteFill>
	);
};

// 02 Gravity drop: chữ rơi và nảy.
export const GravityDrop: FC<Props> = ({text = 'DROP', layer}) => {
	const f = useCurrentFrame();
	const {fps} = useVideoConfig();
	const s = spring({frame: f, fps, config: {damping: 8, stiffness: 200, mass: 1.5}});
	return (
		<AbsoluteFill style={{background: '#111', overflow: 'hidden'}}>
			{layer && <AbsoluteFill>{layer}</AbsoluteFill>}
			<AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
				<div style={{fontFamily: FONT, fontWeight: 900, fontSize: 200, color: '#fff', transform: `translateY(${interpolate(s, [0, 1], [-900, 0])}px)`}}>{text}</div>
			</AbsoluteFill>
		</AbsoluteFill>
	);
};

// 03 Giant captions: phụ đề rất lớn.
export const GiantCaptions: FC<Props> = ({text = 'GIANT captions.', layer}) => {
	const f = useCurrentFrame();
	return (
		<AbsoluteFill style={{background: '#111', overflow: 'hidden'}}>
			{layer && <AbsoluteFill>{layer}</AbsoluteFill>}
			<AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
				<div style={{fontFamily: FONT, fontWeight: 900, fontSize: 130, color: '#fff', textAlign: 'center', padding: 40, opacity: ramp(f, 0, 8, 0, 1), lineHeight: 1}}>{text}</div>
			</AbsoluteFill>
		</AbsoluteFill>
	);
};

// 04 Prompt bar: gõ từng ký tự vào ô prompt.
export const PromptBar: FC<Props> = ({text = 'prompt bar', layer}) => {
	const f = useCurrentFrame();
	const n = Math.min(text.length, Math.floor(ramp(f, 0, 40, 0, text.length)));
	return (
		<Stage bg="#2b2b33" layer={layer}>
			<div style={{...card, position: 'absolute', top: 200, left: 60, right: 60, padding: '28px 36px', fontSize: 54, boxShadow: '0 10px 30px rgba(0,0,0,.3)'}}>
				{text.slice(0, n)}<span style={{opacity: Math.floor(f / 10) % 2}}>|</span>
			</div>
		</Stage>
	);
};

// 05 Storyboard deck: thẻ xếp chồng lần lượt.
export const StoryboardDeck: FC<Props> = ({layer}) => {
	const f = useCurrentFrame();
	return (
		<Stage bg="#1d2b1d" layer={layer}>
			{[0, 1, 2, 3].map((i) => (
				<div key={i} style={{...card, position: 'absolute', top: 360 + i * 20, left: 200 + i * 40, width: 360, height: 520, transform: `rotate(${(i - 1.5) * 6}deg) translateY(${ramp(f, i * 5, i * 5 + 12, -600, 0)}px)`, background: ['#f6d365', '#fda085', '#a1c4fd', '#c2e9fb'][i]}} />
			))}
		</Stage>
	);
};

// 06 Icon strike: logo bị gạch chéo đỏ.
export const IconStrike: FC<Props> = ({label = 'CapCut', layer}) => {
	const f = useCurrentFrame();
	return (
		<AbsoluteFill style={{background: '#111', justifyContent: 'center', alignItems: 'center', overflow: 'hidden'}}>
			{layer && <AbsoluteFill>{layer}</AbsoluteFill>}
			<div style={{width: 260, height: 260, borderRadius: 56, background: '#fff', color: '#111', fontFamily: FONT, fontWeight: 800, fontSize: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative'}}>
				{label}
				<div style={{position: 'absolute', top: '50%', left: '-10%', width: `${ramp(f, 10, 25, 0, 100)}%`, height: 14, background: '#ff3b30', transform: 'rotate(-30deg)', borderRadius: 7}} />
			</div>
		</AbsoluteFill>
	);
};

// 07 File drop: clip được thả vào ô.
export const FileDrop: FC<Props> = ({layer}) => {
	const f = useCurrentFrame();
	return (
		<AbsoluteFill style={{background: '#0f2a1f', justifyContent: 'center', alignItems: 'center', overflow: 'hidden'}}>
			<div style={{width: 760, height: 900, border: '6px dashed #7fd1a3', borderRadius: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7fd1a3', fontFamily: FONT, fontSize: 48, overflow: 'hidden'}}>
				{layer ?? 'Drop raw footage'}
			</div>
			<div style={{position: 'absolute', width: 400, height: 260, borderRadius: 18, background: '#3a6ea5', transform: `translateY(${ramp(f, 0, 20, -500, 0)}px)`}} />
		</AbsoluteFill>
	);
};

// 08 NLE timeline: các track xuất hiện lần lượt.
export const NleTimeline: FC<Props> = ({layer}) => {
	const f = useCurrentFrame();
	return (
		<AbsoluteFill style={{background: '#16161c', padding: 60, justifyContent: 'center', fontFamily: FONT, overflow: 'hidden'}}>
			{layer && <div style={{height: 520, borderRadius: 16, overflow: 'hidden', marginBottom: 40, position: 'relative'}}><AbsoluteFill>{layer}</AbsoluteFill></div>}
			{['V1', 'V2', 'A1', 'A2'].map((t, i) => (
				<div key={t} style={{display: 'flex', alignItems: 'center', gap: 20, marginBottom: 30, opacity: ramp(f, i * 6, i * 6 + 10, 0, 1)}}>
					<span style={{color: '#888', width: 60, fontSize: 30}}>{t}</span>
					<div style={{height: 90, width: ramp(f, i * 6, i * 6 + 14, 0, 820), borderRadius: 12, background: i < 2 ? '#3a6ea5' : '#2e7d52'}} />
				</div>
			))}
		</AbsoluteFill>
	);
};

// 09 Jiggle delete: icon rung lắc.
export const JiggleDelete: FC<Props> = ({layer}) => {
	const f = useCurrentFrame();
	const angle = Math.sin(f * 0.8) * 4;
	return (
		<AbsoluteFill style={{background: '#1c1c24', justifyContent: 'center', alignItems: 'center', overflow: 'hidden'}}>
			{layer && <AbsoluteFill style={{opacity: 0.35}}>{layer}</AbsoluteFill>}
			<div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 240px)', gap: 50}}>
				{['#ff6b6b', '#4ecdc4', '#ffe66d', '#a29bfe', '#fd79a8', '#55efc4'].map((c, i) => (
					<div key={c} style={{width: 220, height: 220, borderRadius: 48, background: c, transform: `rotate(${i % 2 ? -angle : angle}deg)`}} />
				))}
			</div>
		</AbsoluteFill>
	);
};

// 10 Grade slider: so sánh trước/sau bằng thanh kéo.
export const GradeSlider: FC<Props> = ({layer}) => {
	const f = useCurrentFrame();
	const x = ramp(f, 0, 60, 20, 80);
	return (
		<>
			<Stage bg="#8a6f5a" layer={layer} />
			<AbsoluteFill style={{clipPath: `inset(0 ${100 - x}% 0 0)`}}>
				<Stage bg="#3a4a6b" layer={layer} />
			</AbsoluteFill>
			<div style={{position: 'absolute', top: 0, bottom: 0, left: `${x}%`, width: 6, background: '#fff'}} />
		</>
	);
};

// 11 Eyedropper grade: bảng màu xuất hiện.
export const EyedropperGrade: FC<Props> = ({layer}) => {
	const f = useCurrentFrame();
	return (
		<>
			<Stage bg="#4a5a6b" layer={layer} />
			<div style={{position: 'absolute', bottom: 200, left: 60, right: 60, display: 'flex', gap: 14, opacity: ramp(f, 0, 15, 0, 1)}}>
				{['#1a1a1a', '#3b4a5c', '#7a8ea3', '#c9d6e3', '#f2f2f2'].map((c) => (
					<div key={c} style={{flex: 1, height: 160, borderRadius: 16, background: c, border: '4px solid #fff'}} />
				))}
			</div>
		</>
	);
};

// 12 Film look: chuyển đen trắng và hạt phim.
export const FilmLook: FC<Props> = ({layer}) => {
	const f = useCurrentFrame();
	return (
		<>
			<AbsoluteFill style={{filter: `grayscale(${ramp(f, 0, 30, 0, 100)}%) contrast(1.15)`}}>
				<Stage bg="#333" layer={layer} />
			</AbsoluteFill>
			<AbsoluteFill style={{background: 'repeating-radial-gradient(circle at 30% 40%, rgba(255,255,255,.04) 0 2px, transparent 2px 5px)', opacity: 0.6}} />
		</>
	);
};

// 13 Title card: chữ serif trên nền xanh đậm.
export const TitleCard: FC<Props> = ({text = 'TITLE', layer}) => {
	const f = useCurrentFrame();
	return (
		<AbsoluteFill style={{background: '#1f3b2f', justifyContent: 'center', alignItems: 'center', overflow: 'hidden'}}>
			{layer && <AbsoluteFill style={{opacity: 0.5}}>{layer}</AbsoluteFill>}
			<div style={{fontFamily: 'Georgia, serif', fontSize: 200, color: '#f5efe0', letterSpacing: 6, opacity: ramp(f, 0, 20, 0, 1), transform: `scale(${ramp(f, 0, 30, 1.1, 1)})`}}>{text}</div>
		</AbsoluteFill>
	);
};

// 14 Playing grid: lưới nhiều khung.
export const PlayingGrid: FC<Props> = ({layer}) => {
	const f = useCurrentFrame();
	return (
		<AbsoluteFill style={{background: '#101014', padding: 40, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignContent: 'center', overflow: 'hidden'}}>
			{[0, 1, 2, 3].map((i) => (
				<div key={i} style={{height: 480, borderRadius: 24, overflow: 'hidden', position: 'relative', background: ['#5b8def', '#e07a5f', '#81b29a', '#f2cc8f'][i], transform: `scale(${ramp(f, i * 4, i * 4 + 12, 0.6, 1)})`}}>
					{layer && <AbsoluteFill>{layer}</AbsoluteFill>}
				</div>
			))}
		</AbsoluteFill>
	);
};

// 15 Reel feed: giao diện feed dọc có nút tương tác.
export const ReelFeed: FC<Props> = ({caption = 'Claude Cooked', layer}) => {
	const f = useCurrentFrame();
	return (
		<AbsoluteFill style={{background: '#000', transform: `translateY(${ramp(f, 0, 12, 200, 0)}px)`, overflow: 'hidden'}}>
			{layer && <AbsoluteFill>{layer}</AbsoluteFill>}
			<div style={{position: 'absolute', bottom: 260, left: 40, color: '#fff', fontFamily: FONT, fontWeight: 800, fontSize: 64, textShadow: '0 4px 12px rgba(0,0,0,.6)'}}>{caption}</div>
			<div style={{position: 'absolute', right: 40, bottom: 400, display: 'flex', flexDirection: 'column', gap: 40}}>
				{['♥', '💬', '↗'].map((i) => <div key={i} style={{color: '#fff', fontSize: 56, textAlign: 'center'}}>{i}</div>)}
			</div>
		</AbsoluteFill>
	);
};

// 16 Video card: thẻ video nhỏ có tiêu đề.
export const VideoCard: FC<Props> = ({title = 'Video card', layer}) => {
	const f = useCurrentFrame();
	return (
		<Stage layer={layer}>
			<div style={{...card, position: 'absolute', top: 300, left: 60, right: 60, height: 560, overflow: 'hidden', transform: `scale(${ramp(f, 0, 12, 0.9, 1)})`, boxShadow: '0 20px 40px rgba(0,0,0,.4)'}}>
				<div style={{height: 400, background: '#1d2b4a', overflow: 'hidden', position: 'relative'}}>{layer && <AbsoluteFill>{layer}</AbsoluteFill>}</div>
				<div style={{padding: 24, fontSize: 44, fontWeight: 700}}>{title}</div>
			</div>
		</Stage>
	);
};

// 17 Comment CTA: ô bình luận với chữ.
export const CommentCta: FC<Props> = ({word = 'EDIT', layer}) => {
	const f = useCurrentFrame();
	const n = Math.min(word.length, Math.floor(ramp(f, 0, 12, 0, word.length)));
	return (
		<Stage layer={layer}>
			<div style={{...card, position: 'absolute', bottom: 340, left: 60, right: 60, padding: '26px 36px', fontSize: 52, fontWeight: 700}}>Bình luận: {word.slice(0, n)}</div>
		</Stage>
	);
};

// 18 Comment drop: bình luận thả xuống.
export const CommentDrop: FC<Props> = ({text = 'Get all 40+ effects, comment EDIT below', layer}) => {
	const f = useCurrentFrame();
	const {fps} = useVideoConfig();
	const s = spring({frame: f, fps, config: {damping: 12}});
	return (
		<Stage layer={layer}>
			<div style={{...card, position: 'absolute', top: 260, left: 60, right: 60, transform: `translateY(${(1 - s) * -300}px)`, opacity: s, padding: 36, fontSize: 52, fontWeight: 800}}>{text}</div>
		</Stage>
	);
};

export const EFFECTS_18: {id: string; name: string; Component: FC<Props>}[] = [
	{id: '01', name: 'Kinetic hook', Component: KineticHook},
	{id: '02', name: 'Gravity drop', Component: GravityDrop},
	{id: '03', name: 'Giant captions', Component: GiantCaptions},
	{id: '04', name: 'Prompt bar', Component: PromptBar},
	{id: '05', name: 'Storyboard deck', Component: StoryboardDeck},
	{id: '06', name: 'Icon strike', Component: IconStrike},
	{id: '07', name: 'File drop', Component: FileDrop},
	{id: '08', name: 'NLE timeline', Component: NleTimeline},
	{id: '09', name: 'Jiggle delete', Component: JiggleDelete},
	{id: '10', name: 'Grade slider', Component: GradeSlider},
	{id: '11', name: 'Eyedropper grade', Component: EyedropperGrade},
	{id: '12', name: 'Film look', Component: FilmLook},
	{id: '13', name: 'Title card', Component: TitleCard},
	{id: '14', name: 'Playing grid', Component: PlayingGrid},
	{id: '15', name: 'Reel feed', Component: ReelFeed},
	{id: '16', name: 'Video card', Component: VideoCard},
	{id: '17', name: 'Comment CTA', Component: CommentCta},
	{id: '18', name: 'Comment drop', Component: CommentDrop},
];
