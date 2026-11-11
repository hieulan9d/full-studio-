import {Composition} from 'remotion';
import {Main} from './Main';
import {EffectsDemo, EFFECT_SECONDS} from './EffectsDemo';
import {EffectsDemo18, SECONDS_PER_EFFECT18} from './EffectsDemo18';
import {EffectsDemoWow, SECONDS_PER_EFFECT_WOW} from './EffectsDemoWow';
import {EFFECTS_WOW} from './effects/EffectsWow';
import {EffectsDemoProduct, SECONDS_PER_EFFECT_PRODUCT} from './EffectsDemoProduct';
import {EFFECTS_PRODUCT} from './effects/EffectsProduct';
import {EFFECTS} from './effects/Effects';
import {EFFECTS_18} from './effects/Effects18';

export const RemotionRoot = () => (
	<>
		<Composition id="Main" component={Main} durationInFrames={300} fps={30} width={1080} height={1920} defaultProps={{title: 'Chào bạn'}} />
		<Composition id="Effects" component={EffectsDemo} durationInFrames={EFFECTS.length * EFFECT_SECONDS * 30} fps={30} width={1080} height={1920} />
		<Composition id="Effects18" component={EffectsDemo18} durationInFrames={Math.round(EFFECTS_18.length * SECONDS_PER_EFFECT18 * 30)} fps={30} width={1080} height={1920} />
		<Composition id="EffectsWow" component={EffectsDemoWow} durationInFrames={Math.round(EFFECTS_WOW.length * SECONDS_PER_EFFECT_WOW * 30)} fps={30} width={1080} height={1920} />
		<Composition id="EffectsProduct" component={EffectsDemoProduct} durationInFrames={Math.round(EFFECTS_PRODUCT.length * SECONDS_PER_EFFECT_PRODUCT * 30)} fps={30} width={1080} height={1920} />
	</>
);
