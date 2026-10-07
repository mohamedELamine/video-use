// PROTOTYPE (#11). A renderer of video-spec.json + brand.json. Component choice
// comes from `intent` alone; every word on screen comes from `content`.
import React, {createContext, useContext, useEffect, useState} from 'react';
import {AbsoluteFill, Audio, Img, Sequence, continueRender, delayRender, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import type {Asset, ResolvedShot, Text} from './resolve.ts';
import type {Surface, Theme} from './theme.ts';

export type FrameCue = ResolvedShot['cues'][number] & {frame: number};
export type ShotProps = {shot: ResolvedShot; cues: FrameCue[]; carried: string[]; fadeIn: boolean; fadeOut: boolean};

type Ctx = ShotProps & {theme: Theme; surface: Surface; assets: Record<string, Asset>};
const ShotCtx = createContext<Ctx | null>(null);
const useShot = () => useContext(ShotCtx)!;

const src = (asset: Asset) => staticFile(asset.path!);
const textLength = (t: Text | undefined) => (t === undefined ? 0 : typeof t === 'string' ? t.length : t.map((r) => (typeof r === 'string' ? r : r.text)).join('').length);

const T: React.FC<{value: Text}> = ({value}) => {
	const {theme} = useShot();
	if (typeof value === 'string') return <>{value}</>;
	return <>{value.map((r, i) => (typeof r === 'string' ? <React.Fragment key={i}>{r}</React.Fragment> : <span key={i} style={r.accent ? {color: theme.accent} : undefined}>{r.text}</span>))}</>;
};

// When an entrance starts: a reveal cue on this slot wins over choreography.
const useStart = (slot: string | undefined, index: number | undefined, delay: number) => {
	const {cues, theme} = useShot();
	const cue = slot ? cues.find((c) => c.kind === 'reveal' && c.target.slot === slot && c.target.index === index) : undefined;
	return cue ? cue.frame - theme.motion.landLead : delay;
};

const Enter: React.FC<React.PropsWithChildren<{slot?: string; index?: number; delay?: number; style?: React.CSSProperties}>> = ({slot, index, delay = 0, style, children}) => {
	const {carried, theme} = useShot();
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const start = useStart(slot, index, delay);
	if (slot && carried.includes(slot)) return <div style={style}>{children}</div>;
	const p = spring({frame: frame - start, fps, config: {damping: 200}, durationInFrames: theme.motion.settle});
	const m = theme.motion;
	return <div style={{...style, opacity: p, transform: `translateY(${(1 - p) * m.travel}px) scale(${m.scaleFrom + p * (1 - m.scaleFrom)})`}}>{children}</div>;
};

const Scene: React.FC<React.PropsWithChildren<{style?: React.CSSProperties}>> = ({children, style}) => {
	const {surface, theme, fadeIn, fadeOut} = useShot();
	const frame = useCurrentFrame();
	const {durationInFrames} = useVideoConfig();
	const f = theme.motion.fade;
	const opacity = Math.min(
		fadeIn ? interpolate(frame, [0, f], [0, 1], {extrapolateRight: 'clamp'}) : 1,
		fadeOut ? interpolate(frame, [durationInFrames - f, durationInFrames], [1, 0], {extrapolateLeft: 'clamp'}) : 1,
	);
	return (
		<AbsoluteFill style={{opacity, background: surface.bg, color: surface.fg}}>
			<AbsoluteFill style={{direction: theme.dir, fontFamily: theme.font.body.family, fontWeight: theme.font.body.weight, ...style}}>{children}</AbsoluteFill>
		</AbsoluteFill>
	);
};

const display = (theme: Theme): React.CSSProperties => ({fontFamily: theme.font.display.family, fontWeight: theme.font.display.weight});

// ---- intents -------------------------------------------------------------

const Statement: React.FC = () => {
	const {shot, theme, surface} = useShot();
	const c = shot.content;
	const frame = useCurrentFrame();
	const bodyStart = useStart('body', undefined, theme.motion.stagger * 3);
	if (!c.kicker && !c.body && !c.footnote) {
		return (
			<Scene style={{alignItems: 'center', justifyContent: 'center', padding: 75, textAlign: 'center'}}>
				<div style={{width: 150, height: 8, borderRadius: 99, background: theme.accent, marginBottom: 48}} />
				<Enter slot="headline"><div style={{...display(theme), fontSize: textLength(c.headline) <= 14 ? 116 : 90, lineHeight: 1.18}}><T value={c.headline} /></div></Enter>
			</Scene>
		);
	}
	const split = interpolate(frame, [bodyStart - 9, bodyStart + 9], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
	return (
		<Scene style={{padding: '170px 82px'}}>
			{c.kicker && <Enter slot="kicker"><div style={{fontSize: 35, color: theme.accent}}><T value={c.kicker} /></div></Enter>}
			<div style={{marginTop: 180, textAlign: 'center'}}>
				<Enter slot="headline" delay={8}><div style={{...display(theme), fontSize: 98, lineHeight: 1.12}}><T value={c.headline} /></div></Enter>
				{c.body && (
					<>
						<div style={{height: 4, background: surface.line, margin: '86px 0 72px', overflow: 'hidden'}}><div style={{height: '100%', width: `${split * 100}%`, background: theme.accent}} /></div>
						<Enter slot="body"><div style={{...display(theme), fontSize: 72, lineHeight: 1.25}}><T value={c.body} /></div></Enter>
					</>
				)}
			</div>
			{c.footnote && <div style={{marginTop: 'auto', textAlign: 'center', fontSize: 34, color: surface.muted}}><T value={c.footnote} /></div>}
		</Scene>
	);
};

const Mark: React.FC<{width: number}> = ({width}) => {
	const {theme} = useShot();
	return theme.logo ? <Img src={staticFile(`brand/${theme.logo}`)} style={{width}} /> : <div style={{...display(theme), fontSize: width / 4.6, lineHeight: 1.1, direction: 'ltr'}}>{theme.name}</div>;
};

const BrandIntent: React.FC = () => {
	const {shot, theme, assets} = useShot();
	const c = shot.content;
	const visual = c.visual ? assets[c.visual] : undefined;
	return (
		<Scene style={{alignItems: 'center', justifyContent: 'center', padding: 75, textAlign: 'center'}}>
			{visual?.path && <Enter slot="visual"><Img src={src(visual)} style={{width: 350, marginBottom: 52}} /></Enter>}
			<Enter slot="__mark" delay={visual ? 10 : 0}><div style={{marginBottom: visual ? 0 : 90}}><Mark width={visual ? 780 : 700} /></div></Enter>
			{c.headline && (
				<Enter slot="headline" delay={visual ? 24 : 16}>
					{visual ? <div style={{fontSize: 43, color: theme.accent, marginTop: 40}}><T value={c.headline} /></div> : <div style={{...display(theme), fontSize: 78, lineHeight: 1.3}}><T value={c.headline} /></div>}
				</Enter>
			)}
			{c.cta && <Enter slot="cta" style={{position: 'absolute', bottom: 150}}><div style={{fontSize: 42, letterSpacing: 1, direction: 'ltr'}}><T value={c.cta} /></div></Enter>}
		</Scene>
	);
};

const List: React.FC = () => {
	const {shot, theme, surface} = useShot();
	const c = shot.content;
	const items: {label: Text; accent?: boolean}[] = c.items;
	const arrow = theme.dir === 'rtl' ? '←' : '→';
	return (
		<Scene style={{padding: '145px 72px'}}>
			<Enter slot="headline"><div style={{...display(theme), fontSize: 78, lineHeight: 1.18}}><T value={c.headline} /></div></Enter>
			<div style={{display: 'flex', flexDirection: 'column', gap: 26, marginTop: 100}}>
				{items.map((item, i) => (
					<Enter key={i} slot="items" index={i} delay={10 + i * theme.motion.stagger}>
						<div style={{display: 'flex', alignItems: 'center', gap: 28, padding: '33px 38px', borderRadius: 30, background: surface.card, border: `1px solid ${surface.line}`, boxShadow: item.accent ? `0 30px 85px ${surface.line}` : 'none'}}>
							<div style={{width: 76, height: 76, borderRadius: 23, background: item.accent ? theme.accent : surface.fg, color: item.accent ? theme.onAccent : surface.bg, display: 'grid', placeItems: 'center', fontSize: 27, ...display(theme)}}>{String(i + 1).padStart(2, '0')}</div>
							<div style={{fontSize: 45, ...display(theme)}}><T value={item.label} /></div>
							{i < items.length - 1 && <div style={{marginInlineStart: 'auto', fontSize: 42, color: surface.muted}}>{arrow}</div>}
						</div>
					</Enter>
				))}
			</div>
		</Scene>
	);
};

const Pending: React.FC<{id: string; asset: Asset}> = ({id, asset}) => {
	const {cues, surface, theme} = useShot();
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	return (
		<AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', padding: 60, textAlign: 'center', background: `repeating-linear-gradient(135deg, ${surface.card} 0 26px, transparent 26px 52px)`, border: `4px dashed ${surface.line}`, borderRadius: 56, direction: 'ltr', fontFamily: 'monospace'}}>
			<div style={{fontSize: 40, color: surface.muted, fontWeight: 700}}>{asset.kind.toUpperCase()} PENDING</div>
			<div style={{fontSize: 52, marginTop: 18, fontWeight: 700}}>{id}</div>
			<div style={{fontSize: 26, color: surface.muted, marginTop: 30, lineHeight: 1.5}}>{asset.obtain}</div>
			{cues.filter((c) => c.target.element).map((c, i) => {
				const p = spring({frame: frame - c.frame, fps, config: {damping: 14, stiffness: 160}});
				return <div key={i} style={{marginTop: 40, padding: '18px 30px', borderRadius: 20, background: theme.accent, color: theme.onAccent, fontSize: 30, fontWeight: 700, opacity: Math.min(1, p), transform: `scale(${0.6 + 0.4 * p})`}}>{c.kind} → {c.target.element} @ {c.anchor}</div>;
			})}
		</AbsoluteFill>
	);
};

const ProductShot: React.FC = () => {
	const {shot, theme, assets, surface} = useShot();
	const frame = useCurrentFrame();
	const {durationInFrames} = useVideoConfig();
	const c = shot.content;
	const asset = assets[shot.asset!];
	const zoom = shot.camera?.mode === 'focus' ? interpolate(frame, [0, durationInFrames], [1, 1.11]) : 1;
	return (
		<Scene style={{padding: '100px 62px'}}>
			{c.headline && <Enter slot="headline"><div style={{...display(theme), fontSize: 68, lineHeight: 1.2}}><T value={c.headline} /></div></Enter>}
			<div style={{position: 'absolute', top: 330, left: 95, width: 890, height: 1380, overflow: 'hidden', borderRadius: 56, background: surface.card, boxShadow: `0 30px 85px ${surface.line}`}}>
				{asset.path ? <Img src={src(asset)} style={{width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top', transform: `scale(${zoom})`}} /> : <Pending id={shot.asset!} asset={asset} />}
			</div>
			{c.callout && (
				<Enter slot="callout" delay={theme.motion.stagger * 4} style={{position: 'absolute', bottom: 110, right: 80, left: 80}}>
					<div style={{padding: '28px 36px', borderRadius: 28, background: theme.surfaces.dark.bg, color: theme.surfaces.dark.fg, fontSize: 38, textAlign: 'center', ...display(theme)}}><T value={c.callout} /></div>
				</Enter>
			)}
		</Scene>
	);
};

const Feature: React.FC = () => {
	const {shot, theme, surface, assets} = useShot();
	const c = shot.content;
	const icon = c.icon ? assets[c.icon] : undefined;
	return (
		<Scene style={{padding: '150px 75px'}}>
			{c.kicker && <Enter slot="kicker"><div style={{fontSize: 31, color: theme.accent}}><T value={c.kicker} /></div></Enter>}
			<div style={{marginTop: 165, borderRadius: 58, background: surface.card, border: `1px solid ${surface.line}`, boxShadow: `0 30px 85px ${surface.line}`, padding: '70px 58px', minHeight: 720}}>
				{icon?.path && <Enter slot="icon"><div style={{width: 170, height: 170, borderRadius: 50, background: theme.accent + '1f', display: 'grid', placeItems: 'center'}}><Img src={src(icon)} style={{width: 92}} /></div></Enter>}
				<Enter slot="headline" delay={10}><div style={{...display(theme), fontSize: 86, marginTop: 64}}><T value={c.headline} /></div></Enter>
				{c.body && <Enter slot="body" delay={18}><div style={{fontSize: 38, color: surface.muted, lineHeight: 1.55, marginTop: 28}}><T value={c.body} /></div></Enter>}
			</div>
		</Scene>
	);
};

const Stat: React.FC = () => {
	const {shot, theme, surface} = useShot();
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const c = shot.content;
	const pop = spring({frame: frame - useStart('value', undefined, 0), fps, config: {damping: 16, stiffness: 130}});
	return (
		<Scene style={{alignItems: 'center', justifyContent: 'center', textAlign: 'center'}}>
			<div style={{...display(theme), fontSize: 260, color: theme.accent, transform: `scale(${pop})`, lineHeight: 0.9}}><T value={c.value} /></div>
			<Enter slot="headline" delay={12}><div style={{...display(theme), fontSize: 72, marginTop: 40}}><T value={c.headline} /></div></Enter>
			{c.body && <Enter slot="body" delay={25}><div style={{fontSize: 34, color: surface.muted, marginTop: 35}}><T value={c.body} /></div></Enter>}
		</Scene>
	);
};

export const INTENTS: Record<string, {component: React.FC; surface: 'dark' | 'light'}> = {
	statement: {component: Statement, surface: 'light'},
	brand: {component: BrandIntent, surface: 'dark'},
	'product-shot': {component: ProductShot, surface: 'light'},
	list: {component: List, surface: 'light'},
	feature: {component: Feature, surface: 'light'},
	stat: {component: Stat, surface: 'dark'},
};

// ---- the film ------------------------------------------------------------

const useFonts = (theme: Theme) => {
	const [handle] = useState(() => delayRender('brand fonts'));
	useEffect(() => {
		Promise.all(theme.font.faces.map((f) => new FontFace(f.family, `url(${staticFile(`brand/${f.file}`)})`, {weight: String(f.weight), style: f.style ?? 'normal'}).load().then((ff) => document.fonts.add(ff))))
			.then(() => continueRender(handle))
			.catch((e) => {
				throw e;
			});
	}, [handle, theme]);
};

export type FilmProps = {
	theme: Theme;
	assets: Record<string, Asset>;
	voiceover: string;
	shots: (ShotProps & {from: number; durationInFrames: number})[];
};

export const Film: React.FC<FilmProps> = ({theme, assets, voiceover, shots}) => {
	useFonts(theme);
	return (
		<AbsoluteFill style={{background: theme.surfaces.light.bg}} lang={theme.lang}>
			<Audio src={staticFile(voiceover)} />
			{shots.map((s) => {
				const intent = INTENTS[s.shot.intent];
				const Component = intent.component;
				return (
					<Sequence key={s.shot.id} name={`${s.shot.id} ${s.shot.intent}`} from={s.from} durationInFrames={s.durationInFrames} premountFor={30}>
						<ShotCtx.Provider value={{...s, theme, assets, surface: theme.surfaces[intent.surface]}}>
							<Component />
						</ShotCtx.Provider>
					</Sequence>
				);
			})}
		</AbsoluteFill>
	);
};
