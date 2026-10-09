# video-spec.json addresses time by aligned word, never by seconds

`video-spec.json` contains no timestamps. Beats, anchors and shots point at word ids from the alignment, and one deterministic resolver turns those ids into seconds at the renderer's door. The renderer then converts seconds to frames once, in order. We chose this because the spec has to survive re-alignment and script edits without being rewritten. Seconds remain the unit everywhere outside the renderer. Word ids are the address. Storing both would give two sources of truth that drift apart at the first re-alignment.

Two rules follow from this, and both will look odd to a reader who expects explicit times:

- **Shots carry only `start_word`.** A shot runs until the next shot starts. The first shot begins at 0. The last shot runs to the end of the voice-over plus `job.output.tail_s`. Silence between phrases (about a third of a typical narration) goes to the shot that precedes it. Where the cut falls inside a gap is resolver policy, not spec data. There is no `end_word` on a shot, because shots tile the timeline and an end address could only repeat or contradict the next shot's start.
- **Cues are written by the shot planner and timed by their anchor.** Every cue names exactly one anchor, takes that anchor's word as its moment, and adds only a `target` and a `kind` (`reveal | state_change | camera`). Every anchor must land in a shot of its own beat: either it causes at least one cue there, or one of those shots has the anchor's word as its `start_word`, so the cut lands it. A cue on an anchor that a cut already lands is allowed but redundant. Choreography that no anchor causes, such as entrances and staggers, belongs to the renderer.

## Considered options

- **Seconds in the spec** (the original `start_s`/`duration_s` and `at_s` from the video-spec.json contract, #2). Simple for a renderer, but every re-alignment rewrites the plan.
- **Renderer-computed cues** (map #18). The renderer cannot know *what* should land on a payoff word, such as a price inside a recording or a callout, without making a creative decision the spec exists to remove.
- **Word id plus cached seconds.** Rejected as two sources of truth.

Reconciled in [Reconcile the spec contract with map #18](https://github.com/mohamedELamine/video-use/issues/28).

**Amended** after [Make the Remotion composition spec-driven](https://github.com/mohamedELamine/video-use/issues/11): a cut satisfies an anchor. The original rule ("every anchor must cause at least one cue") forced a redundant reveal on every shot that starts on its anchor's word, such as the five module cards whose names land as cuts.
