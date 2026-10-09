# AI product-video director

Turns a product site, a script and a recorded voice-over into a finished vertical product reel. The planning layer is renderer-agnostic: every decision lands in `video-spec.json`, which a renderer executes.

## Language

### The two product inputs

**Brand identity**:
How a product should look and feel on screen — palette, type, direction, motion character. Carried by `brand.json`. Product-agnostic by construction: a field belongs here only if it would still mean something for a completely different theme or SaaS product.
_Avoid_: Theme, styling, design tokens, branding

**Product knowledge**:
What a product *is* — its pages, features, interactions, important UI states and the selectors that reach them. Carried by `product.json`. Everything true of one product and not of products in general lives here, never in brand identity.
_Avoid_: Site map, product data, metadata

**Role**:
A named slot in a contract that a composition may reference — a colour role (`accent`), a font role (`body`). A *required* role is one every product can meaningfully fill; an *open* role is product vocabulary, and a composition referencing one must degrade when it is absent.
_Avoid_: Token, variable, slot

**Validation product**:
A real product used to prove a contract holds, never to define its shape. Sooq Pro is the first. A contract that only fits its validation product has failed.
_Avoid_: Reference product, example product, first customer

### The pipeline

**Script**:
The canonical spoken text, supplied by the human. Not derived from the audio.

**Voice-over**:
The recorded narration. Canonical for timing and for the audio track itself.

**Alignment**:
Matching script to voice-over to produce addressable, timestamped words. Distinct from transcription, which would derive the words themselves.
_Avoid_: Transcription, ASR

**Beat**:
A unit of narrative *purpose* — one thing the film is doing. Owned by the narrative planner. One beat yields one or more shots; it is never a unit of screen time, and collapsing it into one is how a film becomes a slideshow.

Purpose, not *argument*: connective narration that turns the story without asserting anything ("هنا الفرق") has a real directing purpose and occupies real narration time, and a definition built on argument has nowhere to put it.
_Avoid_: Scene, section, segment

**Beat identity**:
A beat's id is assigned once, at creation, and stays stable for that beat's lifetime. Its narration boundaries are **mutable properties**, carried separately, never part of the id.

The distinction from aligned word ids is deliberate: a word id is anchored in the canonical script, which does not move, so deriving it from structure is safe. A beat is an *editorial* entity whose boundaries are expected to shift during planning and human review. An id derived from a start boundary either has to be renamed when the boundary moves — invalidating every shot, obligation claim and piece of review feedback pointing at it — or survives as an id that lies about where its beat starts.

**Beat kind**:
The vocabulary a planner uses to describe a beat's purpose — `HOOK`, `PROBLEM`, `REVEAL`, `POSITIONING`, `PIVOT`, `CAPABILITY`, `DIFFERENTIATION`, `PAYOFF`, `ATTRIBUTION`, `CTA`. A palette, not a sequence, and not the thing an archetype requires.

**Narrative obligation**:
Something a directing strategy must accomplish — capture attention early, establish what the product is, communicate meaningful value, resolve the opening promise, drive to action. What an archetype actually requires. Obligations are deliberately *not* beat kinds: a film may open on the reveal and let it serve as the hook, so requiring a literal `HOOK` beat would reject a valid launch. Beat kinds are the vocabulary; obligations are the contract.

A beat **claims** the obligations it serves, and an archetype is satisfied when every one of its obligations is claimed. Ordering is expressed through claims, never through kinds: an obligation that is positional, such as capturing attention *early*, must be claimed by the beat in that position.

**Shot**:
A unit of visual *execution*: one continuous stretch of screen time in the spec, carrying its own cues. Owned by the shot planner. Belongs to exactly one beat.
_Avoid_: Scene, sequence, clip

**Archetype**:
A named directing strategy — `launch` is the first — declared as the **narrative obligations** it must satisfy, plus which beat kinds may repeat and what ordering is semantically necessary. Never an ordered template, and never a list of required beat labels: constraining labels rebuilds the template inside the validator.

System-owned and product-agnostic. A product *selects* an archetype; it never authors or weakens one, or the validator means something different for every product. A new directing strategy adds a declaration; it does not change the shared narrative schema.
_Avoid_: Template, format, structure

**Speech-safe boundary**:
A point a beat may start or end on without cutting speech. Phrase boundaries are the first preference and a high-confidence aligned word boundary the second, used when the narrative genuinely turns inside a phrase. An arbitrary mid-word timestamp is never one. Silence detection *supplies candidates*; it is not the definition.

**Promotion**:
Presenting a product capability or claim as a thing the film is asserting. A capability may not be promoted unless it is grounded in the narration **of the beat promoting it**. Distinct from a **supporting visual**, which explains or proves an already-narrated idea and introduces no new claim.
_Avoid_: Showing, featuring, covering

**Grounding reference**:
The link from a promoted capability to the narration in its own beat that asserts it. Every promotion carries one, and the set of promotions may never exceed the set of valid grounding references — which is what stops a beat promoting six sub-capabilities when the narration named one. Code can verify a reference exists and resolves; only judgment can say it is the right one.

**Grounding is asymmetric.** A planner promoting a capability the narration does not ground is a structural violation. Narration asserting something product knowledge cannot substantiate is *not*: product knowledge is always partial, so that is a review flag, not a failure. The two directions are deliberately not mirror images.

**Grounding state**:
How a narrated assertion stands against product knowledge. `grounded` — substantiated. `unresolved` — current knowledge cannot substantiate it, which raises a review flag and means exactly that: absence of evidence, not evidence of absence. `contradicted` — knowledge positively says it is false, a hard stop.

`unresolved` and `contradicted` must never collapse into one state. The reviewer of an `unresolved` claim is as likely to find the product model incomplete as the script overreaching, and code cannot tell which. Negative evidence does not exist in product knowledge yet; the state is reserved so that adding it later does not require reinterpreting every existing flag.

**Render job**:
The per-render inputs: which product, which archetype, which script, which voice-over, what output is wanted. Distinct from the product, which owns brand identity, product knowledge and reusable assets.

The boundary matters because one product legitimately yields many films — a launch reel and a feature reel differ in archetype, script and voice-over while sharing a product entirely. A script or voice-over filed as product knowledge quietly becomes *the* script that product has.
_Avoid_: Config, project, run

**Valid** (of a plan):
Structurally admissible: boundaries legal, archetype constraints satisfied, every reference resolving, every promotion grounded. Deterministic and machine-checkable. **Not** a claim about whether the plan is any *good* — beat grouping, emphasis, pacing and payoff choice are quality, which no validator proves. A green validator means valid, never good.

**Anchor**:
A semantic timing decision inside a beat: a moment something must land on, addressed to an aligned word. An editorial entity, not a derived timestamp — so like a beat, its **identity is stable and its word address is mutable**. Each anchor has a role:

- **payoff** — the moment the beat's purpose lands. Zero or one per beat; a beat that merely sets up a problem has none.
- **emphasis** — a secondary moment that should land without the beat resolving. Zero or many.

Five feature cards under one beat are five emphasis anchors, not five payoffs. Anchors are chosen upstream, where meaning lives, and every anchor must land. It lands in one of two ways. A **cut** lands it when a shot of its own beat starts on the anchor's word. Otherwise it becomes an executable cue downstream, and the cue keeps a reference to the anchor that caused it, so the lineage from narrative decision to rendered frame stays traceable. The five feature cards land by their cuts.
_Avoid_: Highlight, hit, sync point, marker

**Capability**:
Something a product can substantiate, as the narrative layer sees it: a stable id, a human name, a short semantic description, and how it can be evidenced. This is the **narrative-facing projection** of product knowledge, not the whole of it — pages, states, flows and selectors exist downstream and are deliberately invisible here. Narrative planning asks what a product can substantiate and how strongly, never which URL or DOM node implements it.
_Avoid_: Feature, function, module

**Evidence mode**:
A way a capability can be shown — recorded as an interaction, shown as a visual state, and so on. A capability may support several; one that supports none can only be stated, never demonstrated.

**Intent**:
What a shot *is* on screen — a statement, a product shot, a list — named without naming any renderer component. Orthogonal to **evidence mode**: evidence mode says *why* a shot is on screen and how its capability is proven; intent says *what the viewer is looking at*. One evidence mode can be served by several intents, and one intent can serve several evidence modes; only their compatibility is checked.

Two shots share an intent when they share the same content shape and ask the same thing of the viewer's eye. An intent must still make sense for a single-page SaaS product. A difference that exists only because something was hand-drawn — a mocked form standing in for a recording — is not a difference of intent.
_Avoid_: Template, component, layout, scene type

**Intent vocabulary**:
The system-owned set of intents and the content each one accepts. Like an archetype, a product selects from it and never extends it. A new intent is a vocabulary entry plus renderer support, never a change to the spec's shape; a renderer declares which intents it implements, and a plan using one it does not is caught before rendering. Kept small on purpose: coherence across a film comes from one shared visual system, not from a cap on variety.

**Content slot**:
A named place an intent defines for the shot planner to fill — a headline, a callout, a list of items, a secondary image. Filled per shot, from the plan. Not a **Role**: a role is resolved from brand identity and is the same across a whole film; a content slot is written for one shot.

Items that share one frame are one slot holding a list; items that each take the whole frame, separated by cuts, are separate shots of the same intent. Line breaks, numbering, and how long text is fitted belong to the renderer, never to a slot.

One exception is deliberate: the `mark` slot of the `brand` intent holds the **brand mark** and is filled from brand identity, never by the planner. The planner may make a cue land on it but may not write it. It is a slot so that a cue can address it in the same way as any other target.
_Avoid_: Prop, field, variable

**Brand mark**:
How a product signs its name on screen: its logo, or its name set in the brand's display type when it has no logo. Part of brand identity, the same across every film the product yields. It is **not on-screen copy**, even when it is rendered as text, because nobody chose those words for this film.

A `brand` shot always shows the mark. It is the only intent that carries it. A cue can make the mark land on the word where the name is spoken. A shot that starts on that word needs no cue, because the cut lands it.
_Avoid_: Logo, wordmark, lockup

**Primary asset**:
The one asset a shot is *about* — what its camera moves over, its cursor acts on, and its element cues address. A shot has at most one; any other image it carries sits in a content slot. Evidence modes constrain the primary asset, never the intent: a recorded interaction needs a recording, a visual state needs some asset, and a stated or supporting shot needs none.

**Surface**:
The ground a shot is set on, behind everything it shows. Named **relative to the brand**, never as an absolute colour or lightness: `base` is the brand's own background and foreground, and `alt` is an alternate surface the brand may offer through open roles. Brands differ in which one is dark, so "dark" in a plan would mean something different for every product.

Chosen per shot by the shot planner. Alternating surfaces is a directing rhythm: the same intent can sit on either surface, and so can two shots of one beat. A shot that names no surface sits on `base`. A shot asking for `alt` on a brand that offers none falls back to `base`, and the fallback is flagged for review rather than rejected.
_Avoid_: Tone, theme, mode, background, dark/light

**On-screen copy**:
Every word the viewer reads, spoken or not, except the **brand mark**. Written by the shot planner and carried in the plan, because choosing it is a creative decision; a renderer never writes copy, and never chooses or orders what product knowledge to show.

**Cue**:
A timed event *inside* a shot that makes one anchor land on one target — the price inside a recording, a callout, a camera move — so intra-shot payoff timing is directable. Written by the shot planner, because choosing *what* lands on the anchor's word is a creative decision no renderer may guess. Every cue is caused by exactly one anchor and carries no time of its own: it is timed by its anchor's word, so the moment lives in one place. An anchor needs no cue when a shot of its beat starts on its word, because the cut already lands it; a cue there is allowed but redundant.

A cue lands on either a **content slot** or an element of the shot's **primary asset**. What it may do follows from which: a slot can only be revealed, while an element can be revealed, change state, or be moved to by the camera. The set of cue kinds belongs to the intent vocabulary, so a new kind is a vocabulary entry, not a change to the plan's shape.

Entrance choreography that answers to no anchor — a headline fading in, a list staggering — is not a cue. It belongs to the renderer.
_Avoid_: Sync point, keyframe, hit

**Storyboard**:
The human-reviewable view of a plan, generated from `video-spec.json` and never authored beside it. It shows beat and shot ids so review feedback lands on a line that maps straight back to the spec; changes are made in the spec, never in the storyboard.

**Asset**:
Something a shot shows — a recording, a screenshot, a static file, a HyperFrames clip — declared once by stable id together with how to obtain it, so a shot can name an asset that does not exist yet. A shot's capability and evidence mode say *why* it is on screen; its asset says *what* is on screen.
_Avoid_: Media, file, footage

**Recording**:
Real browser footage of a product interaction, captured as frames with DOM metadata bound to them.
_Avoid_: Screen capture, screencast, footage
