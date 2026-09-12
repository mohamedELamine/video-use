"""Forced-align a supplied script against its voice-over — the tier-2 half of issue #14.

Phrase windows come from the waveform (`silencedetect`, via pair_phrases); word
times come from a CTC aligner run over the *known* transcript. Where the two
disagree the waveform wins, so a word outside its phrase window is reported as a
containment failure rather than silently trusted.

Emits the alignment contract decided on #14: absolute seconds, phrase ids from
the script's own line structure, word ids `pNN.wNN`.

Usage: python align_vo.py <script.md> <audio.wav> <out.json>

Needs a Python 3.12 environment (onnxruntime has no 3.14 wheel):

    python3.12 -m venv .venv-align
    .venv-align/bin/pip install ctc-forced-aligner uroman

The ~1 GB MMS-300M ONNX model downloads once to ~/ctc_forced_aligner/model.onnx.
"""

from __future__ import annotations

import hashlib
import json
import math
import os
import sys

import numpy
import uroman as _uroman

import ctc_forced_aligner as cfa
from ctc_forced_aligner import Tokenizer

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "scripts"))
from pair_phrases import pair, phrases, script_lines  # noqa: E402

LANG = "ara"
_UR = _uroman.Uroman()


def _uroman_tokens(norm_transcripts, iso=None):
    """Real uroman, replacing the package's `unidecode` stand-in.

    `unidecode` mangles Arabic — it emits uppercase and backticks that the
    package's own normaliser then strips or turns into spaces, splitting words
    in half (ويرجّعلك -> "wyrjw lk"). uroman is what the MMS recipe specifies.
    """
    out = []
    for text in norm_transcripts:
        romanized = _UR.romanize_string(text, lcode=iso)
        out.append(cfa.normalize_uroman(" ".join(romanized.strip())))
    return out


cfa.get_uroman_tokens = _uroman_tokens


def align_words(audio: str, text: str) -> list[dict]:
    """Word-level {start, end, text, confidence} over the whole script, in order."""
    import onnxruntime

    model_path = os.path.join(os.path.expanduser("~"), "ctc_forced_aligner", "model.onnx")
    cfa.ensure_onnx_model(model_path, cfa.MODEL_URL)
    session = onnxruntime.InferenceSession(model_path)
    tokenizer = Tokenizer()

    waveform = cfa.load_audio(audio)
    emissions, stride = cfa.generate_emissions(session, waveform)
    tokens_starred, text_starred = cfa.preprocess_text(
        text, romanize=True, language=LANG, split_size="word", star_frequency="segment"
    )
    segments, scores, blank = cfa.get_alignments(emissions, tokens_starred, tokenizer)
    spans = cfa.get_spans(tokens_starred, segments, blank)
    results = cfa.postprocess_results(text_starred, spans, stride, scores)

    # scores are summed frame log-probs; per-frame mean back through exp is a 0-1 confidence
    for r in results:
        frames = max(1.0, (r["end"] - r["start"]) * 1000 / stride)
        r["confidence"] = round(float(math.exp(r.pop("score") / frames)), 4)
        r["start"], r["end"] = round(r["start"], 3), round(r["end"], 3)
    return results


def main() -> None:
    script_path, audio_path, out_path = sys.argv[1], sys.argv[2], sys.argv[3]
    lines = script_lines(script_path)
    windows = phrases(audio_path, noise=-35, min_gap=0.45)
    groups = pair(lines, windows)

    words = align_words(audio_path, " ".join(lines))
    counts = [len(ln.split()) for ln in lines]
    assert len(words) == sum(counts), f"aligner returned {len(words)} words, script has {sum(counts)}"

    out_phrases, cursor = [], 0
    for i, (line, idx) in enumerate(zip(lines, groups), 1):
        pid = f"p{i:02d}"
        start, end = windows[idx[0]][0], windows[idx[-1]][1]
        ws = []
        for j, w in enumerate(words[cursor : cursor + counts[i - 1]], 1):
            ws.append({"id": f"{pid}.w{j:02d}", "text": w["text"], **{k: w[k] for k in ("start", "end", "confidence")}})
        cursor += counts[i - 1]
        out_phrases.append(
            {
                "id": pid,
                "start": round(start, 3),
                "end": round(end, 3),
                "windows": [f"P{k + 1:02d}" for k in idx],
                "text": line,
                "words": ws,
            }
        )

    with open(audio_path, "rb") as fh:
        sha = hashlib.sha256(fh.read()).hexdigest()

    doc = {
        "audio": os.path.basename(audio_path),
        "audio_sha256": sha,
        "script": os.path.basename(script_path),
        "duration": round(windows[-1][1], 3),
        "aligner": "ctc_forced_aligner@1.0.2-onnx+uroman",
        "phrases": out_phrases,
    }
    with open(out_path, "w", encoding="utf-8") as fh:
        json.dump(doc, fh, ensure_ascii=False, indent=2)

    check(out_phrases)


def check(out_phrases: list[dict]) -> None:
    """The two failure signals from #14: containment against the waveform, and confidence."""
    confs, breaches = [], []
    for p in out_phrases:
        for w in p["words"]:
            confs.append(w["confidence"])
            if w["start"] < p["start"] - 0.05 or w["end"] > p["end"] + 0.05:
                breaches.append((w["id"], w["text"], w["start"], w["end"], p["start"], p["end"]))

    confs.sort()
    n = len(confs)
    pct = lambda q: confs[min(n - 1, int(q * n))]  # noqa: E731
    print(f"{n} words in {len(out_phrases)} phrases")
    print(f"confidence  min {confs[0]:.3f}  p05 {pct(0.05):.3f}  p25 {pct(0.25):.3f} "
          f" median {pct(0.5):.3f}  p75 {pct(0.75):.3f}  max {confs[-1]:.3f}")
    print(f"containment {n - len(breaches)}/{n} words inside their phrase window")
    for b in breaches:
        print(f"  BREACH {b[0]} {b[1]!r} [{b[2]:.2f}-{b[3]:.2f}] outside [{b[4]:.2f}-{b[5]:.2f}]")


if __name__ == "__main__":
    main()
