import type {FC} from 'react';
import {AbsoluteFill, Sequence} from 'remotion';
import {EFFECTS_18} from './effects/Effects18';

// Mỗi effect 1.1 giây (33 frame ở 30fps), tổng 18 effect ~20 giây như video mẫu.
export const SECONDS_PER_EFFECT18 = 1.1;
const FRAMES = Math.round(SECONDS_PER_EFFECT18 * 30);

export const EffectsDemo18: FC = () => (
	<AbsoluteFill>
		{EFFECTS_18.map((e, i) => {
			const Scene = e.Component;
			return (
				<Sequence key={e.id} from={i * FRAMES} durationInFrames={FRAMES}>
					<AbsoluteFill>
						<Scene />
						<div style={{position: 'absolute', top: 80, width: '100%', textAlign: 'center', fontFamily: 'Inter, sans-serif', fontSize: 44, fontWeight: 800, color: '#fff', textShadow: '0 4px 12px rgba(0,0,0,.6)'}}>
							<span style={{background: '#ff5a1f', borderRadius: 10, padding: '4px 14px', marginRight: 12}}>{e.id}</span>
							{e.name}
						</div>
					</AbsoluteFill>
				</Sequence>
			);
		})}
	</AbsoluteFill>
);
