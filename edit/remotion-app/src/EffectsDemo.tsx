import type {FC} from 'react';
import {AbsoluteFill, Sequence} from 'remotion';
import {EFFECTS} from './effects/Effects';

// Mỗi effect chiếm 3 giây (90 frame ở 30fps). Tổng cộng 20 effect = 60 giây.
export const EFFECT_SECONDS = 3;

export const EffectsDemo: FC = () => (
	<AbsoluteFill>
		{EFFECTS.map((e, i) => {
			const Scene = e.Component;
			return (
				<Sequence key={e.id} from={i * EFFECT_SECONDS * 30} durationInFrames={EFFECT_SECONDS * 30}>
					<AbsoluteFill>
						<Scene />
						<div style={{position: 'absolute', top: 120, width: '100%', textAlign: 'center', fontFamily: 'Inter, sans-serif', fontSize: 52, fontWeight: 800, color: '#fff', textShadow: '0 4px 12px rgba(0,0,0,.6)'}}>
							<span style={{background: '#ff5a1f', borderRadius: 10, padding: '4px 14px', marginRight: 12}}>{e.id}</span>
							{e.name}
						</div>
					</AbsoluteFill>
				</Sequence>
			);
		})}
	</AbsoluteFill>
);
