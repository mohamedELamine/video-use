// PROTOTYPE (#11). Spec + brand + alignment in, one composition out. Validation
// runs before the composition is registered, so an invalid plan never renders.
import React from 'react';
import {Composition} from 'remotion';
import spec from '../video-spec.sooq-pro.json';
import vocab from '../intent-vocabulary.json';
import brand from '../../../brands/sooq-pro/brand.json';
import alignment from '../../../brands/sooq-pro/alignment.json';
import {resolve, toFrames, type Alignment, type Spec} from './resolve.ts';
import {validate} from './validate.ts';
import {makeTheme, type Brand} from './theme.ts';
import {Film, INTENTS, type FilmProps} from './Film.tsx';

const s = spec as unknown as Spec;
const {shots, duration_s, words} = resolve(s, alignment as Alignment);
const {errors, warnings} = validate(s, vocab as any, shots, words, Object.keys(INTENTS));
warnings.forEach((w) => console.warn(`[spec] ${w}`));
if (errors.length) throw new Error(`video-spec.json is invalid:\n  ${errors.join('\n  ')}`);

const {fps, resolution} = s.job.output;
const frames = toFrames(shots, duration_s, fps);
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
// Renderer choreography: consecutive shots of one intent hold what they share
// instead of fading out and re-entering it.
const continuous = (i: number) => i > 0 && i < shots.length && shots[i - 1].intent === shots[i].intent && shots[i].intent === 'brand';

const props: FilmProps = {
	theme: makeTheme(brand as Brand),
	assets: s.assets,
	voiceover: `reels/${(spec as any).job.voiceover}`,
	shots: shots.map((shot, i) => {
		const carried: string[] = [];
		if (continuous(i)) {
			carried.push('__mark');
			for (const [k, v] of Object.entries(shot.content)) if (same(v, shots[i - 1].content[k])) carried.push(k);
		}
		return {shot, ...frames.shots[i], carried, fadeIn: !continuous(i), fadeOut: !continuous(i + 1)};
	}),
};

export const Root: React.FC = () => (
	<Composition id="SpecFilm" component={Film as any} durationInFrames={frames.total} fps={fps} width={resolution[0]} height={resolution[1]} defaultProps={props as any} />
);
