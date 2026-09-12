"""build_reel.py must produce a project whose host ids, sub-composition ids and
timeline keys agree (the HyperFrames mount contract), and copy every asset."""
import json, re, subprocess, sys, tempfile
from pathlib import Path

HELPERS = Path(__file__).resolve().parent.parent / "skills" / "wp-reels" / "helpers"


def test_build_reel_mount_contract(tmp_path: Path = None):
    tmp = Path(tmp_path or tempfile.mkdtemp())
    shot = tmp / "shot.png"; shot.write_bytes(b"\x89PNG\r\n\x1a\n")
    font = tmp / "F.ttf"; font.write_bytes(b"0")
    spec = {"output": {"width": 1080, "height": 1920, "fps": 30},
            "brand": {"accent": "#f97316", "bg": "#0d1524", "font": {"family": "F", "files": [[str(font), 800]]}},
            "scenes": [{"template": "hook", "start": 0, "duration": 3, "vars": {"headline": "a <b>", "headline_accent": "c"}},
                       {"template": "device-scroll", "start": 3, "duration": 5, "vars": {"screenshot": str(shot), "callout": "x"}},
                       {"template": "cta", "start": 8, "duration": 3, "vars": {"headline": "y", "button": "z"}}]}
    (tmp / "reel.json").write_text(json.dumps(spec))
    project = tmp / "project"
    subprocess.run([sys.executable, str(HELPERS / "build_reel.py"), str(tmp / "reel.json"), "-o", str(project)], check=True, capture_output=True)
    index = (project / "index.html").read_text()
    hosts = re.findall(r'data-composition-id="([^"]+)" data-composition-src="compositions/([^"]+)"', index)
    assert len(hosts) == 3
    for cid, src in hosts:
        body = (project / "compositions" / src).read_text()
        assert f'data-composition-id="{cid}"' in body, cid
        assert f'window.__timelines["{cid}"]' in body, cid
        assert "{{" not in body, "unfilled placeholder in " + src
        assert "@font-face" in body
    assert "&lt;b&gt;" in (project / "compositions" / hosts[0][1]).read_text()   # text is escaped
    assert (project / "assets" / "shot.png").exists() and (project / "fonts" / "F.ttf").exists()
    assert 'data-duration="11.0"' in index and 'dir="rtl"' not in index.split("<body>")[0]


if __name__ == "__main__":
    test_build_reel_mount_contract(); print("ok")
