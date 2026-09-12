"""Build a HyperFrames project from a reel spec (reel.json).

Copies the scene templates, substitutes {{placeholders}}, copies every asset
into the project, and writes index.html with one sub-composition host per
scene plus the audio tracks. Then run `npx hyperframes check` and `render`
inside the project directory.

Usage:
    python build_reel.py <reel.json> -o <project_dir>

Reel spec (all paths absolute or relative to the spec file):
{
  "output": {"width": 1080, "height": 1920, "fps": 30},
  "brand": {"accent": "#f97316", "bg": "#0d1524", "fg": "#ffffff",
            "font": {"family": "Cairo", "files": [["~/Library/Fonts/Cairo-ExtraBold.ttf", 800], ["~/Library/Fonts/Cairo-Bold.ttf", 700]]},
            "lang": "ar", "dir": "rtl"},
  "background": "/abs/gradient.png",            # optional; CSS gradient fallback
  "audio": {"voiceover": "/abs/vo.wav", "music": "/abs/music.mp3", "music_volume": 0.18},
  "scenes": [
    {"template": "hook", "start": 0, "duration": 3.0,
     "vars": {"eyebrow": "...", "headline": "...", "headline_accent": "...", "sub": "..."}},
    {"template": "device-scroll", "start": 3.0, "duration": 5.6,
     "vars": {"screenshot": "/abs/full.png", "url_label": "site.local", "callout": "...", "callout_accent": "..."}},
    {"template": "feature-zoom", "start": 8.6, "duration": 4.0,
     "vars": {"screenshot": "/abs/state.png", "callout": "...", "callout_accent": "...", "zoom_x": 30, "zoom_y": 70, "zoom_scale": 1.8}},
    {"template": "cta", "start": 12.6, "duration": 3.9,
     "vars": {"logo": "/abs/wordmark.svg", "headline": "...", "headline_accent": "...", "button": "..."}}
  ]
}
"""
from __future__ import annotations
import argparse, html, json, re, shutil
from pathlib import Path

HERE = Path(__file__).resolve().parent
TEMPLATES = HERE.parent / "templates" / "scenes"
ASSET_VARS = {"screenshot", "logo"}          # vars that are file paths → copied into assets/
DEFAULT_BG = "linear-gradient(160deg, {bg} 0%, color-mix(in srgb, {bg} 70%, {accent}) 100%)"


def resolve(p: str | None, base: Path) -> Path | None:
    if not p:
        return None
    q = Path(p).expanduser()
    return q if q.is_absolute() else (base / q).resolve()


def copy_asset(src: Path | None, project: Path, sub: str = "assets") -> str:
    if not src:
        return ""
    dest = project / sub / src.name
    dest.parent.mkdir(parents=True, exist_ok=True)
    if not dest.exists() or dest.stat().st_size != src.stat().st_size:
        shutil.copy2(src, dest)
    return f"{sub}/{src.name}"


def fill(template: str, vars: dict) -> str:
    def sub(m):
        k = m.group(1)
        if k not in vars:
            raise SystemExit(f"template placeholder {{{{{k}}}}} has no value")
        v = vars[k]
        return str(v) if k in ("fontface", "duration", "width", "height", "zoom_x", "zoom_y", "zoom_scale") else html.escape(str(v), quote=True)
    return re.sub(r"{{(\w+)}}", sub, template)


def build(spec_path: Path, project: Path) -> None:
    spec = json.loads(spec_path.read_text())
    base = spec_path.parent
    out, brand = spec["output"], spec["brand"]
    W, H, FPS = out.get("width", 1080), out.get("height", 1920), out.get("fps", 30)
    project.mkdir(parents=True, exist_ok=True)
    (project / "compositions").mkdir(exist_ok=True)

    # fonts → fonts/ + one @font-face block reused by every file
    faces = []
    for file, weight in brand["font"]["files"]:
        rel = copy_asset(resolve(file, base), project, "fonts")
        fmt = "truetype" if rel.endswith(".ttf") else "opentype" if rel.endswith(".otf") else "woff2"
        faces.append(f'@font-face {{ font-family: "{brand["font"]["family"]}"; src: url("{rel}") format("{fmt}"); font-weight: {weight}; }}')
    fontface = "\n        ".join(faces)

    common = {"fontface": fontface, "font": brand["font"]["family"], "accent": brand.get("accent", "#f97316"),
              "bg": brand.get("bg", "#0d1524"), "fg": brand.get("fg", "#ffffff"), "lang": brand.get("lang", "ar"),
              "dir": brand.get("dir", "rtl"), "width": W, "height": H}

    hosts, total = [], 0.0
    for i, sc in enumerate(spec["scenes"], 1):
        tpl = TEMPLATES / f"{sc['template']}.html"
        if not tpl.exists():
            raise SystemExit(f"unknown template {sc['template']} (have: {[p.stem for p in TEMPLATES.glob('*.html')]})")
        sid = sc.get("id") or f"s{i:02d}-{sc['template']}"
        vars = dict(common, id=sid, duration=float(sc["duration"]))
        for k, v in sc.get("vars", {}).items():
            vars[k] = copy_asset(resolve(v, base), project) if k in ASSET_VARS else v
        # every template placeholder must resolve; unspecified text vars default to empty
        for k in set(re.findall(r"{{(\w+)}}", tpl.read_text())):
            vars.setdefault(k, "" if k not in ("zoom_x", "zoom_y", "zoom_scale") else {"zoom_x": 50, "zoom_y": 50, "zoom_scale": 1.6}[k])
        (project / "compositions" / f"{sid}.html").write_text(fill(tpl.read_text(), vars))
        hosts.append(f'      <div id="scene-{sid}" class="scene" data-composition-id="{sid}" data-composition-src="compositions/{sid}.html"\n'
                     f'           data-start="{sc["start"]}" data-duration="{sc["duration"]}" data-track-index="1" data-width="{W}" data-height="{H}"></div>')
        total = max(total, float(sc["start"]) + float(sc["duration"]))

    bg_src = copy_asset(resolve(spec.get("background"), base), project)
    bg_el = f'<img id="bg" src="{bg_src}" alt="" />' if bg_src else '<div id="bg"></div>'
    bg_css = ("#bg { position: absolute; inset: 0; width: %dpx; height: %dpx; object-fit: cover; }" % (W, H)) if bg_src else \
             ("#bg { position: absolute; inset: 0; background: %s; }" % DEFAULT_BG.format(bg=common["bg"], accent=common["accent"]))

    audio, mix = spec.get("audio", {}), []
    vo = copy_asset(resolve(audio.get("voiceover"), base), project)
    if vo:
        mix.append(f'      <audio id="vo" src="{vo}" data-start="0" data-duration="{total}" data-track-index="9" data-volume="1"></audio>')
    music = copy_asset(resolve(audio.get("music"), base), project)
    if music:
        mix.append(f'      <audio id="music" src="{music}" data-start="0" data-duration="{total}" data-track-index="10" data-volume="{audio.get("music_volume", 0.18)}"></audio>')
    fade = f'      tl.to("#music", {{ volume: 0, duration: 1.2, ease: "power1.in" }}, {total - 1.2:.2f});\n' if music else ""

    index = f'''<!doctype html>
<html lang="{common["lang"]}">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width={W}, height={H}" />
    <title>{spec.get("name", "reel")}</title>
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <style>
      {fontface}
      * {{ margin: 0; padding: 0; box-sizing: border-box; }}
      html, body {{ width: {W}px; height: {H}px; overflow: hidden; background: {common["bg"]}; }}
      body {{ font-family: "{common["font"]}", system-ui, sans-serif; }}
      #root {{ position: relative; width: {W}px; height: {H}px; overflow: hidden; }}
      {bg_css}
      #bg-tint {{ position: absolute; inset: 0; background: linear-gradient(180deg, color-mix(in srgb, {common["bg"]} 55%, transparent) 0%, color-mix(in srgb, {common["bg"]} 25%, transparent) 45%, color-mix(in srgb, {common["bg"]} 65%, transparent) 100%); }}
      .scene {{ position: absolute; inset: 0; width: {W}px; height: {H}px; }}
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="{total}" data-fps="{FPS}" data-width="{W}" data-height="{H}">
      {bg_el}
      <div id="bg-tint"></div>
{chr(10).join(hosts)}
{chr(10).join(mix)}
    </div>
    <script>
      const tl = gsap.timeline({{ paused: true }});
      tl.fromTo("#bg", {{ scale: 1.06, xPercent: 1 }}, {{ scale: 1.0, xPercent: -1, duration: {total}, ease: "none" }}, 0);
{fade}      window.__timelines["main"] = tl;
    </script>
  </body>
</html>
'''
    (project / "index.html").write_text(index)
    (project / "meta.json").write_text(json.dumps({"id": project.name, "name": spec.get("name", project.name)}))
    (project / "package.json").write_text(json.dumps({"name": project.name, "private": True, "type": "module",
        "scripts": {"check": "npx --yes hyperframes check", "render": "npx --yes hyperframes render"}}, indent=2))
    print(f"built {project}  scenes={len(hosts)}  duration={total}s  fps={FPS}")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("spec", type=Path)
    ap.add_argument("-o", "--output", type=Path, required=True, help="HyperFrames project dir (inside <videos_dir>/edit/)")
    a = ap.parse_args()
    build(a.spec.resolve(), a.output.resolve())
