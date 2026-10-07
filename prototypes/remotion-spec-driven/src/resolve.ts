// PROTOTYPE (#11). The one deterministic resolver at the renderer's door:
// word ids -> seconds (ADR 0001), then seconds -> frames once, in order (#2).
// Plain TS with no imports so `node scripts/timeline.ts` can run it directly.

export type Run = string | {text: string; accent?: boolean};
export type Text = string | Run[];
export type Target = {slot?: string; index?: number; element?: string};
export type Cue = {anchor: string; kind: string; target: Target};
export type Shot = {
	id: string;
	beat: string;
	start_word: string;
	evidence_mode: string;
	capability_id?: string;
	intent: string;
	asset?: string;
	content: Record<string, any>;
	camera?: {mode: string; target_element?: string};
	cues?: Cue[];
};
export type Anchor = {id: string; role: string; word: string};
export type Beat = {id: string; kind: string; start_word: string; end_word: string; anchors: Anchor[]};
export type Asset = {kind: string; path: string | null; obtain?: string};
export type Spec = {
	job: {output: {resolution: [number, number]; fps: number; tail_s?: number}};
	assets: Record<string, Asset>;
	beats: Beat[];
	shots: Shot[];
};
export type Alignment = {
	duration: number;
	phrases: {id: string; start: number; end: number; words: {id: string; start: number; end: number; text: string}[]}[];
};

export type WordTime = {id: string; index: number; start: number; end: number; text: string};
export type ResolvedCue = Cue & {at_s: number};
export type ResolvedShot = Omit<Shot, 'cues'> & {start_s: number; end_s: number; cues: ResolvedCue[]};

// Resolver policy, not spec data (ADR 0001): a cut lands this far before the
// next shot's first word, but never earlier than halfway into the silence.
export const CUT_LEAD_S = 0.5;

// The waveform's phrase edges beat the aligner's word edges (#14).
export const wordTimes = (al: Alignment): Map<string, WordTime> => {
	const out = new Map<string, WordTime>();
	let index = 0;
	for (const p of al.phrases) {
		p.words.forEach((w, i) => {
			out.set(w.id, {
				id: w.id,
				index: index++,
				text: w.text,
				start: i === 0 ? p.start : w.start,
				end: i === p.words.length - 1 ? p.end : w.end,
			});
		});
	}
	return out;
};

const word = (words: Map<string, WordTime>, id: string): WordTime => {
	const w = words.get(id);
	if (!w) throw new Error(`unknown word id ${id}`);
	return w;
};

export const resolve = (spec: Spec, al: Alignment) => {
	const words = wordTimes(al);
	const byIndex = [...words.values()];
	const anchors = new Map(spec.beats.flatMap((b) => b.anchors.map((a) => [a.id, a] as const)));
	const duration_s = al.duration + (spec.job.output.tail_s ?? 0);

	const starts = spec.shots.map((s, i) => {
		if (i === 0) return 0;
		const next = word(words, s.start_word);
		const prevEnd = byIndex[next.index - 1].end;
		return next.start - Math.min(CUT_LEAD_S, (next.start - prevEnd) / 2);
	});

	const shots: ResolvedShot[] = spec.shots.map((s, i) => ({
		...s,
		start_s: starts[i],
		end_s: i + 1 < starts.length ? starts[i + 1] : duration_s,
		cues: (s.cues ?? []).map((c) => {
			const a = anchors.get(c.anchor);
			return {...c, at_s: a ? word(words, a.word).start : NaN};
		}),
	}));
	return {shots, duration_s, words};
};

// Boundaries become frames once, in order; each duration is the difference of
// two rounded boundaries, so shots can never gap or overlap.
export const toFrames = (shots: ResolvedShot[], duration_s: number, fps: number) => {
	const edges = [...shots.map((s) => Math.round(s.start_s * fps)), Math.round(duration_s * fps)];
	return {
		total: edges[edges.length - 1],
		shots: shots.map((s, i) => ({
			from: edges[i],
			durationInFrames: edges[i + 1] - edges[i],
			cues: s.cues.map((c) => ({...c, frame: Math.round(c.at_s * fps) - edges[i]})),
		})),
	};
};
