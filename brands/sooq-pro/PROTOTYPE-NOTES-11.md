# Prototype notes — ticket #11: Make the Remotion composition spec-driven

**Branch:** `prototype/remotion-spec-driven`
**Spec file:** `brands/sooq-pro/video-spec-remotion-prototype.json`

## The question answered

Can `video-spec.json` express the shipped 143-line Remotion comp without leaking renderer concerns into the spec?

**Answer: Yes, with one honest tension noted below.**

## What held

**evidence_mode maps cleanly to component categories:**

| evidence_mode | Remotion components |
|---|---|
| `supporting` | Hook, Difference, BeyondSale, Outro parts |
| `visual-state` | ProductReveal, Journey, ProductPage, QuickOrder, Variants, ModuleCard, ModulesCount |
| `recorded-interaction` | (not yet used — would map to a future RecordingClip component) |

The renderer reads `evidence_mode` + `capability_id` + `beat.kind` and picks a component. No component name ever enters the spec.

**beat.kind → shot mapping is natural:**
- `HOOK` → 1 shot
- `PROBLEM` → 1 shot
- `REVEAL` → 2 shots (product name + journey)
- `CAPABILITY` × 2 → 5 shots (product page, quick-order form, variants, module cards, modules count)
- `PAYOFF` → 1 shot
- `CTA` → 1 shot (merged into Outro by the renderer)

**word ids resolve all timing without seconds in the spec.** The renderer calls `alignment.json` once and converts word ids → frame numbers internally. No `sec()` calls in the spec.

**brand correction (Cairo + correct hex) is a brand.json change, zero spec change.** The spec references `"brand": "sooq-pro"` — the renderer reads `brand.json` for palette and font. Correcting Arial → Cairo and `#ff6b2c` → `#f97316` touches only `brand.json`.

## The honest tension

**The 5× ModuleCard pattern.** Beat b05 has one shot (s09) covering 5 module cards. The renderer must know to repeat the component 5 times, cycling through the modules. Three ways to express this:

1. **5 separate shots** in the spec — verbose, but fully explicit. Each shot gets its own word range (p13→p13, p14→p14 …). Problem: p13-p17 are very short phrases (0.5-1s each) and the spec becomes micro-managed.
2. **One shot with a `count` hint** — `"repeat": 5` — but this is renderer-adjacent, not spec vocabulary.
3. **The capability carries the list** — `product.json` lists the 5 retention modules; the renderer iterates. The spec says `evidence_mode: visual-state, capability_id: retention-modules` and the renderer knows the capability has 5 items to show.

**Option 3 is cleanest** and requires no new spec field. It means `product.json` must carry the ordered list of module names — which it should anyway as product knowledge. This confirms ticket #25's decision that product.json is the right home for this data.

## Zero renderer-field leakage

No `component`, `sequence`, `from`, `durationInFrames`, `fps`, `spring`, or `interpolate` field appears in the spec. The `_renderer_note` annotations are throwaway and prefixed `_` to distinguish them from schema fields.

## What the prototype does NOT prove

- Actual render output (requires running Remotion on the machine where the comp lives)
- That the brand correction produces the exact intended visual (requires visual inspection)
- The recorded-interaction shot path (no `soqpro.local` running)
