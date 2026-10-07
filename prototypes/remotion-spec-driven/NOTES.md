# PROTOTYPE NOTES: Make the Remotion composition spec-driven (#11)

> Throwaway. This answers one question and is not the renderer.

**Question.** Can the shipped Remotion composition become a renderer of `video-spec.json` + `brand.json` without losing the film it already produces?

**Answer.** Yes. `out/spec-film.mp4` is 1806 frames at 1080×1920@30, the same 60.245 s as the shipped render, rendered from [`video-spec.sooq-pro.json`](video-spec.sooq-pro.json), [`brands/sooq-pro/brand.json`](../../brands/sooq-pro/brand.json) and `alignment.json`. Nothing in the spec names a component, a frame, a second or an easing. The fields used are `intent`, `content`, `asset`, `camera.mode` and `cues` (`anchor`, `kind`, `target`), as decided in #2, #28 and #15.

Two shots, QuickOrder and Variants, are **deferred by decision**. Their primary asset is a recording that does not exist yet (`path: null`), so they render a placeholder. Their element cues still fire, as visible markers, at the anchor's word.

## How the film was re-expressed

| shipped scene | shot | beat | intent | spec start | shipped start | drift |
|---|---|---|---|---|---|---|
| Hook | s01 | b01 HOOK | statement | 0.00 | 0.00 | 0 |
| Difference | s02 | b02 PIVOT | statement | 6.67 | 6.54 | +0.13 |
| ProductReveal | s03 | b03 REVEAL | brand | 8.29 | 8.10 | +0.19 |
| Journey | s04 | b03 | list | 14.02 | 13.88 | +0.14 |
| ProductPage | s05 | b04 CAPABILITY | product-shot (screenshot) | 20.08 | 19.86 | +0.22 |
| QuickOrder | s06 | b04 | product-shot (**deferred** recording) | 24.73 | 24.60 | +0.13 |
| Variants | s07 | b04 | product-shot (**deferred** recording) | 31.82 | 31.76 | +0.06 |
| BeyondSale | s08 | b05 CAPABILITY | statement | 36.57 | 36.86 | −0.29 |
| ModuleCard ×5 | s09–s13 | b05 | feature ×5 | 39.39 … 45.58 | 39.36 … 45.70 | ≤ 0.23 |
| ModulesCount | s14 | b05 | stat | 47.04 | 47.20 | −0.16 |
| Outro | s15 + s16 | b06 PAYOFF + b07 CTA | brand + brand | 52.09 / 58.56 | 52.20 / — | −0.11 |

Run `npm run timeline` for the full table with frames and cue moments.

**Cuts.** One resolver constant places every cut: half a second before the next shot's first word, and never earlier than halfway into the silence. Measured against the 14 hand-placed cuts, the mean drift is 0.145 s and the worst is 0.29 s. No per-cut nudge is possible, and that is by design (ADR 0001).

**Cues land on words.** A reveal starts 12 frames (0.4 s at `pace: medium`) before its anchor word, so it has mostly settled when the word is heard. That reproduces the shipped hand-placed delays: the Hook body starts at 2.43 s against 2.40 s, and «وخلاص.» starts at 35.13 s against 34.96 s. The shipped `delay={8}` frames and `sec(2.4)` seconds are now one mechanism.

**Brand corrected, zero spec change.** Cairo 700/800/900 is vendored by file under `brands/sooq-pro/fonts/`. The colours are `#f97316` and `#0f1e3d` on `#0d1524` / `#fafafa`. The wordmark is the brand `name` set in the `display` font, per the #5 ruling that the SVG is not a logo yet. `brand.motion` (`snappy`/`medium`) is translated into spring settle time, travel, stagger and fade in [`theme.ts`](src/theme.ts), and the degradation table from #5 is implemented there.

**Validation runs before rendering.** An invalid plan throws while the composition is registered. These cases were checked by hand against the validator: a dropped cue gives "anchor causes no cue", a `state_change` on a slot is rejected, a cue outside its shot's extent is rejected, a primary asset on a `statement` is rejected, a missing required slot is rejected, and an unknown intent is rejected. A `path: null` asset is a **warning**, not an error, because the contract lets a shot name an asset that does not exist yet.

## Where the contract strained

These are ordered by how much they matter. The first four are gaps in the spec, and each one is a candidate decision.

1. **Surface tone has no home.** The shipped film alternates dark and light scenes as a deliberate rhythm. Neither the spec nor the brand can say which is which, so the renderer derives it from the intent: `brand` and `stat` are dark, everything else is light. As a result, **Hook and Variants flipped from dark to light**, and the opening lost its dark punch. This is a directing decision. It is not a renderer decision and not a brand one.
2. **The brand mark cannot be a cue target.** "Sooq Pro" is spoken at 9.98 s and 52.7 s, but the mark comes from `brand.json` and is not a slot, so no cue can make it land on the word. That is why **b03 REVEAL and b06 PAYOFF carry no anchors at all**, which is suspicious for exactly the two beats whose purpose is the name.
3. **A cut can be a landing, but it does not count as one.** Each of the five module names lands as a *cut*, because each card's `start_word` is that name. CONTEXT.md calls five such cards "five emphasis anchors", but the rule that every anchor must cause a cue would force five redundant reveals. I declared no anchors there. Either a shot whose `start_word` is the anchor's word should satisfy the anchor, or such anchors should not be declared.
4. **Screenshots need manifests too.** The shipped ProductPage push-in aims at the product (`transformOrigin: 70% 48%`). `camera: { mode: "focus" }` without a `target_element` can only push in at the centre. Aiming at an element of a screenshot needs element boxes for screenshots, not only for recordings.
5. **Beats that straddle scenes were resolved as follows.** For the Hook, the beats were regrouped: b01 HOOK is p01 and p02, and «هنا الفرق.» became its own `PIVOT` beat. For the Outro, the shot was split at p23 into two `brand` shots, s15 (b06) and s16 (b07). The renderer holds what consecutive `brand` shots share (the mark and the headline) instead of fading and re-entering it, so the split is invisible. That continuity rule is renderer choreography, but it currently applies to `brand` only.
6. **Line breaks moved.** The shipped `<br/>`s («سهل.⏎بصح…», «بصح البيع⏎ما يوقفش هنا.») are gone, as #15 requires, and naive wrapping now breaks some lines badly (BeyondSale wraps after «يوقفش»). The renderer needs a balanced wrap that prefers run boundaries. This is a renderer fix only.
7. **What was dropped to keep one visual system.** The `reel-background-*.svg` blob backgrounds, which bake in the old colours, were replaced by flat surfaces. The five pastel card tints were replaced by one accent tint. The glyph "icons" (✦◉٪↗♥) became five static SVG assets drawn for this prototype. On the dark surfaces, the first frames of an entrance now read as near-black: `blackdetect` flags 47.30–47.47 s and 52.37–52.67 s, while the shipped film shows none.
8. **A shipped bug was fixed in passing.** The ProductPage callout pill rendered at the *top* of the frame in the shipped film, because the `Ease` transform wrapper became its containing block. It now sits at the bottom as intended.

## Not proven here

- The `recorded-interaction` path end to end. That needs a real recording with a manifest, which is Stage 2 or `soqpro.local`.
- The loudnorm post-pass and captions (#10). The shipped film has neither, and neither was under test.
- Type-checking. The vendored `node_modules` has no `@types/react`, so `tsc` was not run. The bundle builds and renders.
- `OFL.txt` is not yet vendored beside the Cairo files.
