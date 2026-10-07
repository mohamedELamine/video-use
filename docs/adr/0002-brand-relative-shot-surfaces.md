# Shot surfaces are named relative to the brand, never as dark or light

A shot in `video-spec.json` may carry `surface: "base" | "alt"`. The shot planner writes it, because alternating surfaces is a directing rhythm. `base` is the brand's required `bg`/`fg`. `alt` is the alternate surface a brand may offer through two recognised open roles, `alt_bg` and `alt_fg`. We name surfaces relative to the brand because brands differ in which surface is dark. Sooq Pro's required `bg` is dark and its alternate is light, while a typical light-only SaaS brand has a white `bg` and nothing else. In a plan, `tone: "dark"` would mean a different thing for each product, and on a light-only brand it would render light while still saying dark.

Three rules follow from this, and each will look odd to a reader who expects explicit tones:

- **The renderer never derives a surface from the intent.** The shipped Sooq Pro film puts the same intent on both surfaces, a dark Hook and a light Difference (both `statement`) and a light ProductPage and a dark Variants (both `product-shot`), and it flips surface inside a single beat. A shot with no `surface` sits on `base`.
- **A missing alternate degrades and does not fail.** If a shot asks for `alt` and the brand has no `alt_bg`, the shot falls back to `base` and the validator raises a warning, as it does for an asset with `path: null`. If `alt_fg` is absent, the renderer uses whichever of `fg` and `bg` contrasts more with `alt_bg`. Muted text is derived from each surface's foreground, and no brand declares it per surface.
- **`alt_bg`/`alt_fg` stay open roles.** The renderer gives meaning to these two names, but they are not schema fields. The shape of `brand.json` from the brand.json contract (#5) is unchanged.

## Considered options

- **Absolute `dark | light` on the shot.** It reads instantly in a storyboard, but the field becomes false on a brand that offers only one surface. The storyboard gets the readability back by printing the resolved colour next to the value.
- **Surface derived from the intent** (the #11 prototype). This is how the Hook and Variants lost their dark punch, so it is a directing decision made silently by the renderer.
- **A rhythm pattern on the archetype or the director.** This rebuilds an ordered template inside the archetype, which the archetype definition forbids.
- **Promoting the alternate surface to explicit `colors` fields.** It changes the #5 contract for something only some brands have.

Decided in [Surface tone: who decides dark or light per shot](https://github.com/mohamedELamine/video-use/issues/29).
