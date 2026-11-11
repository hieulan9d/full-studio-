import type {FC, ReactNode} from 'react';
import {AbsoluteFill, OffthreadVideo, Sequence, staticFile} from 'remotion';
import {EFFECTS_18} from './effects/Effects18';

// target: 'none' (hiệu ứng tự vẽ), 'text' (áp lên chữ), 'video' (áp lên footage).
export type Clip = {
	id: string;
	effectId: string;
	start: number;
	duration: number;
	text: string;
	target?: 'none' | 'text' | 'video';
	source?: string;
};

// Tên prop chữ của từng effect (effect không có chữ thì không nằm trong danh sách).
export const TEXT_PROP: Record<string, string> = {
	'01': 'text', '02': 'text', '03': 'text', '04': 'text', '06': 'label',
	'13': 'text', '15': 'caption', '16': 'title', '17': 'word', '18': 'text',
};

const textLayer = (text: string): ReactNode => (
	<AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
		<div style={{fontFamily: 'Inter, sans-serif', fontWeight: 900, fontSize: 120, color: '#fff', textAlign: 'center', padding: 60, textShadow: '0 6px 20px rgba(0,0,0,.5)'}}>{text || 'Chữ của bạn'}</div>
	</AbsoluteFill>
);

const videoLayer = (src: string): ReactNode => (
	<OffthreadVideo src={staticFile(src)} muted style={{width: '100%', height: '100%', objectFit: 'cover'}} />
);

export const EditorProject: FC<{clips: Clip[]}> = ({clips}) => (
	<AbsoluteFill style={{background: '#000'}}>
		{clips.map((c) => {
			const e = EFFECTS_18.find((x) => x.id === c.effectId);
			if (!e) return null;
			const Scene = e.Component;
			const prop = TEXT_PROP[c.effectId];
			const props: Record<string, unknown> = {};
			if (prop && c.text) props[prop] = c.text;
			if (c.target === 'video' && c.source) props.layer = videoLayer(c.source);
			else if (c.target === 'text' && !prop) props.layer = textLayer(c.text);
			return (
				<Sequence key={c.id} from={c.start} durationInFrames={c.duration}>
					<AbsoluteFill>
						<Scene {...props} />
					</AbsoluteFill>
				</Sequence>
			);
		})}
	</AbsoluteFill>
);
