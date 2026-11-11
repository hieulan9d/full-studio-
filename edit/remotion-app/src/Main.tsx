import type {FC} from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';

export const Main: FC<{title: string}> = ({title}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const progress = {extrapolateRight: 'clamp'} as const;
	const opacity = interpolate(frame, [0, fps * 0.6], [0, 1], progress);
	const y = interpolate(frame, [0, fps * 0.6], [40, 0], progress);

	return (
		<AbsoluteFill style={{background: '#111113', justifyContent: 'center', alignItems: 'center'}}>
			<div
				style={{
					color: '#fff',
					fontSize: 96,
					fontWeight: 700,
					fontFamily: 'Inter, sans-serif',
					textAlign: 'center',
					opacity,
					transform: `translateY(${y}px)`,
				}}
			>
				{title}
			</div>
		</AbsoluteFill>
	);
};
