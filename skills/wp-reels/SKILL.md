---
name: wp-reels
description: Film a WordPress theme (local install or demo URL) and turn it into vertical 9:16 reels in the SaaS-motion style — floating device cards, scrolling page captures, blur-in Arabic/Latin kinetic callouts, feature punch-ins, CTA — synced to a voiceover. Launch reels, feature reels, one per theme or many. Renders through HyperFrames; verifies with video-use's own tools.
---

# WP Reels

A vendored skill of `video-use`. Same principles, same hard rules, plus the ones below. Read the parent `SKILL.md` first if this is a cold start.

## What it does

1. **Capture** the theme: full-page and above-the-fold screenshots per page, desktop and mobile, with sticky headers un-stuck, lazy content hydrated, and optional hover/click states.
2. **Plan** a reel from an archetype (`references/archetypes.md`) against the voiceover's phrase windows.
3. **Build** a HyperFrames project from `reel.json` using the scene templates in `templates/scenes/`.
4. **Check → render → self-eval** with `timeline_view.py` on the rendered MP4, exactly like a normal edit.

The theme's *look* comes from the capture. The reel's *motion* comes from the templates. The *timing* comes from the voiceover.

## Hard rules (in addition to video-use's twelve)

13. **Never full-page-screenshot a page with sticky/fixed elements left in place.** They repeat at every viewport seam. `capture_wp.mjs` un-sticks them; if you capture any other way, do the same.
14. **Scene boundaries land on silence.** Use `vo_phrases.py` (no transcript) or `takes_packed.md` (Scribe) and cut in the gaps, never mid-phrase. A callout's payoff word lands inside its scene.
15. **Fonts ship with the project, by file.** `reel.json` names the font files; the builder copies them into `<project>/fonts/` and declares `@font-face` in every composition. Never rely on an installed system font — HyperFrames renders in its own Chrome. Only use fonts whose licence allows video use (Cairo is OFL; the SaaSor pack's Fontshare families are free for commercial video but not redistributable — keep them on this machine).
16. **`dir="rtl"` never goes on `<html>`.** HyperFrames renders a black video. Direction lives on the composition root (`brand.dir` in the spec).
17. **9:16 safe zone.** Nothing that must be read sits in the bottom ~420px or the top ~160px of a 1080×1920 frame; templates already respect this — don't add elements outside it.
18. **The reel project lives in `<videos_dir>/edit/reels/<reel-name>/`.** The skill directory stays clean.

## Helpers (`helpers/`, resolve relative to this file)

- **`capture_wp.mjs <out_dir> <url> [url…] [--viewports desktop,mobile] [--hover sel] [--click sel] [--settle ms]`** — zero-dependency (Node ≥22 + Chrome). Writes `<out>/<slug>/<viewport>/{viewport,full,hover,click}.png` and `manifest.json` (page height, title, headings, CTA labels, sticky elements hidden, interaction results). `CHROME=/path` overrides the browser.
- **`vo_phrases.py <audio>`** — phrase windows from silence gaps. Use before transcription exists. With an ElevenLabs key, prefer `transcribe.py` + `pack_transcripts.py` from the parent skill (word-level).
- **`build_reel.py <reel.json> -o <project_dir>`** — writes the HyperFrames project: `index.html`, one `compositions/<scene>.html` per scene, copied `assets/` and `fonts/`. Then inside the project: `npx --yes hyperframes check`, `npx --yes hyperframes render --quality draft -o preview.mp4`, final with `--quality high`.

## Scene templates (`templates/scenes/`)

| Template        | Beat it serves            | Variables                                                                                     |
| --------------- | ------------------------- | --------------------------------------------------------------------------------------------- |
| `hook`          | HOOK / PROBLEM            | `eyebrow`, `headline`, `headline_accent`, `sub`                                               |
| `device-scroll` | TOUR                      | `screenshot` (full-page PNG), `url_label`, `callout`, `callout_accent`                        |
| `feature-zoom`  | PROOF / FEATURE / BENEFIT | `screenshot` (16:9 state PNG), `callout`, `callout_accent`, `zoom_x` %, `zoom_y` %, `zoom_scale` |
| `cta`           | CTA                       | `logo` (svg/png, optional), `headline`, `headline_accent`, `button`                           |

Every template: blur-in per-word text, its own exit in the last 0.4s, brand colours from `brand.*`, RTL-safe. Add a template by copying one and keeping the `{{id}}`, `{{duration}}`, `{{fontface}}`, `{{width}}`, `{{height}}` placeholders — `build_reel.py` fills any `{{name}}` from `vars`.

Want a different move (3D iPhone, cursor press, carousel)? Search first: `npx hyperframes catalog --query "…"` — `ios26-liquid-glass`, `press-ripple`, `tilt-card`, `app-showcase` exist in the registry. Wire the block into a template instead of authoring motion by hand.

## The process

1. **Inventory.** If the site is local, confirm it answers (`curl -sI http://<site>.local`). Run `capture_wp.mjs` for the pages the reel needs (home + the feature pages). Look at `manifest.json` and the `full.png` contact sheet. If the voiceover exists, run `vo_phrases.py` (or transcribe). Read the script.
2. **Pick the archetype** (launch / feature) and map script lines → beats → templates. One idea per scene.
3. **Propose the strategy** in plain language: scene list with start/duration on the phrase windows, which capture each scene uses, callout text (≤4 words, accent = payoff word), brand colours/font, background. **Wait for confirmation.**
4. **Write `reel.json`** (schema in `build_reel.py`'s docstring) into `<videos_dir>/edit/reels/<name>/reel.json` and build.
5. **`npx hyperframes check --snapshots`** in the project. Fix every error; read the snapshots.
6. **Draft render**, then **self-eval** with `timeline_view.py` on the MP4 at every scene boundary (±1.2s) and the first/last 2s. Look for: text cut mid-blur, page seam in the scroll, callout hidden by the card, audio phrase straddling a cut. Cap at 3 passes.
7. **Final render** on approval (`--quality high`). Append to `project.md`.

## Multiple reels per theme

Same capture, same brand block, different `scenes`. Keep one `reel.json` per reel (`launch.json`, `feature-quick-order.json`, …) in the same `edit/reels/` folder and build each into its own project dir. The CTA scene is copied verbatim across them.

## Known limits (phase 2)

- No live interaction footage yet — captures are stills, motion is synthetic. Hover/click states come from `--hover`/`--click` as separate stills.
- No 3D device GLB scenes; `device-scroll` is a browser card. The registry's `ios26-liquid-glass` is the path when needed.
- No auto beat-sync to music; `audio.music` is mixed at a fixed gain with a fade-out.
- Arabic transcription: Scribe (ElevenLabs) is the reliable engine. `hyperframes transcribe` needs whisper-cpp/Parakeet installed and its Whisper defaults are English models.
