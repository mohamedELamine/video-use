// PROTOTYPE (#11). Prints the resolved timeline, validation, and the drift
// against the shipped film's hand-placed cuts. Run: node scripts/timeline.ts
import {readFileSync} from 'node:fs';
import {resolve, toFrames} from '../src/resolve.ts';
import {validate} from '../src/validate.ts';

const read = (p: string) => JSON.parse(readFileSync(new URL(p, import.meta.url), 'utf8'));
const spec = read('../video-spec.sooq-pro.json');
const vocab = read('../intent-vocabulary.json');
const al = read('../../../brands/sooq-pro/alignment.json');

const {shots, duration_s, words} = resolve(spec, al);
const frames = toFrames(shots, duration_s, spec.job.output.fps);
const {errors, warnings} = validate(spec, vocab, shots, words, Object.keys(vocab.intents));

// The shipped comp's Sequence starts, in seconds; s16 has no shipped twin.
const shipped: Record<string, number> = {
	s01: 0, s02: 6.54, s03: 8.1, s04: 13.88, s05: 19.86, s06: 24.6, s07: 31.76, s08: 36.86,
	s09: 39.36, s10: 41.36, s11: 42.86, s12: 44.36, s13: 45.7, s14: 47.2, s15: 52.2,
};

console.log('shot  beat intent        start_s  shipped  drift   from  frames  cues');
shots.forEach((s, i) => {
	const f = frames.shots[i];
	const ref = shipped[s.id];
	const drift = ref === undefined ? '   -  ' : (s.start_s - ref >= 0 ? '+' : '') + (s.start_s - ref).toFixed(2);
	const cues = f.cues.map((c) => `${c.kind}->${c.target.slot ?? c.target.element}@${c.at_s.toFixed(2)}s(f+${c.frame})`).join(' ');
	console.log(
		`${s.id}   ${s.beat}  ${s.intent.padEnd(13)} ${s.start_s.toFixed(2).padStart(6)}  ${ref === undefined ? '   -  ' : ref.toFixed(2).padStart(6)}  ${drift.padStart(6)}  ${String(f.from).padStart(5)}  ${String(f.durationInFrames).padStart(6)}  ${cues}`,
	);
});
const drifts = shots.filter((s) => shipped[s.id] !== undefined && s.id !== 's01').map((s) => Math.abs(s.start_s - shipped[s.id]));
console.log(`\ntotal ${frames.total} frames (${duration_s}s); cut drift vs shipped: mean ${(drifts.reduce((a, b) => a + b) / drifts.length).toFixed(3)}s, max ${Math.max(...drifts).toFixed(2)}s`);
console.log(`\nerrors (${errors.length}):`, errors.length ? '\n  ' + errors.join('\n  ') : '');
console.log(`warnings (${warnings.length}):\n  ` + warnings.join('\n  '));
process.exit(errors.length ? 1 : 0);
