// PROTOTYPE (#11). Pre-render checks from #15, #28 and ADR 0001. Errors stop
// the render before a single frame; warnings are printed and rendered around.
import type {ResolvedShot, Spec, Text, WordTime} from './resolve.ts';

type SlotDef = {type: string; required?: boolean; item?: Record<string, SlotDef>};
type Vocabulary = {
	cue_kinds: Record<string, {targets: string[]}>;
	intents: Record<string, {primary_asset: 'required' | 'optional' | 'forbidden'; slots: Record<string, SlotDef>}>;
};

const isText = (v: unknown): v is Text =>
	typeof v === 'string' ||
	(Array.isArray(v) && v.every((r) => typeof r === 'string' || (typeof r === 'object' && r !== null && typeof (r as any).text === 'string')));

export const validate = (
	spec: Spec,
	vocab: Vocabulary,
	shots: ResolvedShot[],
	words: Map<string, WordTime>,
	implemented: string[],
) => {
	const errors: string[] = [];
	const warnings: string[] = [];
	const beats = new Map(spec.beats.map((b) => [b.id, b]));
	const caused = new Set<string>();

	const checkSlot = (where: string, def: SlotDef, v: unknown) => {
		if (def.type === 'text' && !isText(v)) errors.push(`${where}: expected text`);
		if (def.type === 'bool' && typeof v !== 'boolean') errors.push(`${where}: expected bool`);
		if (def.type === 'asset' && (typeof v !== 'string' || !spec.assets[v])) errors.push(`${where}: unknown asset ${String(v)}`);
		if (def.type === 'items') {
			if (!Array.isArray(v) || v.length === 0) return errors.push(`${where}: expected a non-empty list`);
			v.forEach((item, i) => checkSlots(`${where}[${i}]`, def.item ?? {}, item));
		}
	};
	const checkSlots = (where: string, defs: Record<string, SlotDef>, content: Record<string, unknown>) => {
		for (const [name, def] of Object.entries(defs)) {
			if (content[name] === undefined) {
				if (def.required) errors.push(`${where}: required slot "${name}" missing`);
			} else checkSlot(`${where}.${name}`, def, content[name]);
		}
		for (const name of Object.keys(content)) if (!defs[name]) errors.push(`${where}: unknown slot "${name}"`);
	};

	shots.forEach((s, i) => {
		const at = `shot ${s.id}`;
		const beat = beats.get(s.beat);
		if (!beat) errors.push(`${at}: unknown beat ${s.beat}`);
		const w = words.get(s.start_word);
		if (!w) errors.push(`${at}: unknown start_word ${s.start_word}`);
		if (i > 0 && w && words.get(shots[i - 1].start_word) && w.index <= words.get(shots[i - 1].start_word)!.index)
			errors.push(`${at}: start_word does not advance; shots must tile`);
		if (beat && w && (w.index < words.get(beat.start_word)!.index || w.index > words.get(beat.end_word)!.index))
			errors.push(`${at}: start_word ${s.start_word} lies outside beat ${beat.id}`);

		const intent = vocab.intents[s.intent];
		if (!intent) return errors.push(`${at}: intent "${s.intent}" is not in the vocabulary`);
		if (!implemented.includes(s.intent)) errors.push(`${at}: renderer does not implement intent "${s.intent}"`);
		checkSlots(`${at}.content`, intent.slots, s.content ?? {});

		const asset = s.asset ? spec.assets[s.asset] : undefined;
		if (s.asset && !asset) errors.push(`${at}: unknown primary asset ${s.asset}`);
		if (intent.primary_asset === 'required' && !s.asset) errors.push(`${at}: intent ${s.intent} requires a primary asset`);
		if (intent.primary_asset === 'forbidden' && s.asset) errors.push(`${at}: intent ${s.intent} forbids a primary asset`);
		if (s.evidence_mode === 'recorded-interaction' && asset?.kind !== 'recording') errors.push(`${at}: recorded-interaction needs a recording as primary asset`);
		if (s.evidence_mode === 'visual-state' && !asset) errors.push(`${at}: visual-state needs a primary asset`);
		if (asset && asset.path === null) warnings.push(`${at}: primary asset ${s.asset} is not produced yet; rendering a placeholder`);
		if (s.camera && s.camera.mode !== 'establish' && !asset) errors.push(`${at}: camera move without a primary asset`);

		for (const c of s.cues) {
			const where = `${at} cue ${c.anchor}/${c.kind}`;
			const anchor = beat?.anchors.find((a) => a.id === c.anchor);
			if (!anchor) {
				errors.push(`${where}: anchor is not in this shot's beat`);
				continue;
			}
			caused.add(c.anchor);
			if (!(c.at_s >= s.start_s && c.at_s < s.end_s))
				errors.push(`${where}: anchor word ${anchor.word} (${c.at_s.toFixed(2)}s) falls outside the shot (${s.start_s.toFixed(2)}-${s.end_s.toFixed(2)}s)`);
			const kind = vocab.cue_kinds[c.kind];
			const targetType = c.target.slot !== undefined ? 'slot' : c.target.element !== undefined ? 'element' : '?';
			if (!kind) errors.push(`${where}: unknown cue kind`);
			else if (!kind.targets.includes(targetType)) errors.push(`${where}: ${c.kind} cannot target a ${targetType}`);
			if (targetType === 'slot') {
				const v = s.content?.[c.target.slot!];
				if (v === undefined) errors.push(`${where}: slot "${c.target.slot}" is empty`);
				if (c.target.index !== undefined && !(Array.isArray(v) && c.target.index < v.length)) errors.push(`${where}: no item ${c.target.index}`);
			}
			if (targetType === 'element') {
				if (!asset) errors.push(`${where}: element target needs a primary asset`);
				else warnings.push(`${where}: element "${c.target.element}" cannot be resolved until ${s.asset} has a manifest`);
			}
		}
	});

	for (const b of spec.beats) for (const a of b.anchors) if (!caused.has(a.id)) errors.push(`anchor ${a.id} causes no cue`);
	return {errors, warnings};
};
