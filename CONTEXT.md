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

**Shot**:
One continuous unit of screen time in the spec, carrying its own cues.

**Cue**:
A timed beat *inside* a shot, so intra-shot payoff timing is directable. Stored relative to its shot's start.

**Recording**:
Real browser footage of a product interaction, captured as frames with DOM metadata bound to them.
_Avoid_: Screen capture, screencast, footage
