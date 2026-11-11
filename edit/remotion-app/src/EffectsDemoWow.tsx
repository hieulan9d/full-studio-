import type {FC} from 'react';
import {AbsoluteFill, Sequence} from 'remotion';
import {EFFECTS_WOW} from './effects/EffectsWow';

// Mỗi effect 1.1 giây (33 frame ở 30fps).
export const SECONDS_PER_EFFECT_WOW = 1.1;
const FRAMES = Math.round(SECONDS_PER_EFFECT_WOW * 30);

export const EffectsDemoWow: FC = () => (
	<AbsoluteFill>
		{EFFECTS_WOW.map((e, i) => {
			const Scene = e.Component;
			return (
				<Sequence key={e.id} from={i * FRAMES} durationInFrames={FRAMES}>
					<AbsoluteFill>
						<Scene />
						<div style={{position: 'absolute', bottom: 120, width: '100%', textAlign: 'center', fontFamily: 'Inter, sans-serif', fontSize: 40, fontWeight: 800, color: '#fff', textShadow: '0 4px 12px rgba(0,0,0,.6)'}}>
							<span style={{background: '#ff5a1f', borderRadius: 10, padding: '4px 14px', marginRight: 12}}>{e.id}</span>
							{e.name}
						</div>
					</AbsoluteFill>
				</Sequence>
			);
		})}
	</AbsoluteFill>
);
