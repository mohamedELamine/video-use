// PROTOTYPE (#11). The one shared visual system: everything comes from
// brand.json, with the degradation table from #5. No colour is invented here.

type Face = {file: string; weight: number; style?: string};
type FontRole = {family: string; faces: Face[]};
export type Brand = {
	name: string;
	lang: string;
	dir: 'rtl' | 'ltr';
	colors: {bg: string; fg: string; accent: string; on_accent: string; roles?: Record<string, string>};
	fonts: Record<string, FontRole> & {body: FontRole};
	motion?: {character?: string; pace?: string};
	logo?: {file: string};
};

export type Surface = {bg: string; fg: string; muted: string; card: string; line: string};

// motion.character -> how an entrance moves; motion.pace -> how long things take.
// Renderer-owned translation; the brand never hands over a curve (#5).
const CHARACTER: Record<string, {travel: number; settle: number; scaleFrom: number}> = {
	snappy: {travel: 48, settle: 24, scaleFrom: 0.98},
	calm: {travel: 24, settle: 36, scaleFrom: 1},
	editorial: {travel: 0, settle: 30, scaleFrom: 1},
};
const PACE: Record<string, number> = {slow: 1.4, medium: 1, fast: 0.7};

export const makeTheme = (brand: Brand) => {
	const c = brand.colors;
	const r = c.roles ?? {};
	const alpha = (hex: string, a: number) => hex + Math.round(a * 255).toString(16).padStart(2, '0');

	const dark: Surface = {bg: c.bg, fg: c.fg, muted: alpha(c.fg, 0.72), card: alpha(c.fg, 0.08), line: alpha(c.fg, 0.16)};
	// Light surface needs the open role canvas_light; without it the film stays on bg.
	const light: Surface = r.canvas_light
		? {bg: r.canvas_light, fg: r.ink ?? c.bg, muted: r.muted ?? alpha(r.ink ?? c.bg, 0.6), card: '#ffffff', line: alpha(r.ink ?? c.bg, 0.11)}
		: dark;

	const character = CHARACTER[brand.motion?.character ?? ''] ?? CHARACTER.snappy;
	const pace = PACE[brand.motion?.pace ?? ''] ?? 1;
	const body = brand.fonts.body;
	const display = brand.fonts.display ?? body;
	const heaviest = (f: FontRole) => Math.max(...f.faces.map((x) => x.weight));

	return {
		dir: brand.dir,
		lang: brand.lang,
		name: brand.name,
		logo: brand.logo?.file,
		accent: c.accent,
		onAccent: c.on_accent,
		surfaces: {dark, light},
		font: {
			body: {family: body.family, weight: heaviest(body)},
			display: {family: display.family, weight: heaviest(display)},
			faces: Object.values(brand.fonts).flatMap((f) => f.faces.map((face) => ({family: f.family, ...face}))),
		},
		motion: {
			travel: character.travel,
			scaleFrom: character.scaleFrom,
			settle: Math.round(character.settle * pace),
			stagger: Math.round(9 * pace),
			fade: Math.round(8 * pace),
			// A cue lands ON its word: the entrance starts this early so it is
			// mostly settled by the time the word is heard.
			landLead: Math.round(12 * pace),
		},
	};
};
export type Theme = ReturnType<typeof makeTheme>;
