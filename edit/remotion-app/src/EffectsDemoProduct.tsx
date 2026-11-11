import type {FC} from 'react';
import {AbsoluteFill, Sequence} from 'remotion';
import {EFFECTS_PRODUCT} from './effects/EffectsProduct';

// Mỗi effect 1.5 giây (45 frame ở 30fps).
export const SECONDS_PER_EFFECT_PRODUCT = 1.5;
const FRAMES = Math.round(SECONDS_PER_EFFECT_PRODUCT * 30);

export const EffectsDemoProduct: FC = () => (
	<AbsoluteFill>
		{EFFECTS_PRODUCT.map((e, i) => {
			const Scene = e.Component;
			return (
				<Sequence key={e.id} from={i * FRAMES} durationInFrames={FRAMES}>
					<AbsoluteFill>
						<Scene />
						<div style={{position: 'absolute', bottom: 120, width: '100%', textAlign: 'center', fontFamily: 'Inter, sans-serif', fontSize: 40, fontWeight: 800, color: '#2f6b45'}}>
							<span style={{background: '#f2c15a', color: '#fff', borderRadius: 10, padding: '4px 14px', marginRight: 12}}>{e.id}</span>
							{e.name}
						</div>
					</AbsoluteFill>
				</Sequence>
			);
		})}
	</AbsoluteFill>
);
