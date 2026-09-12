"""Phrase windows of a voiceover from silence gaps — no ASR needed.

Use when there is no transcript yet (no ElevenLabs key). Prints one line per
spoken phrase: [start-end] duration. Scene boundaries should land on the
silence between phrases. When a transcript exists, use takes_packed.md instead.

Usage:
    python vo_phrases.py <audio_or_video> [--noise -35] [--min-gap 0.45]
"""
from __future__ import annotations
import argparse, re, subprocess

def phrases(path: str, noise: float, min_gap: float) -> list[tuple[float, float]]:
    out = subprocess.run(["ffmpeg", "-i", path, "-af", f"silencedetect=noise={noise}dB:d={min_gap}", "-f", "null", "-"],
                         capture_output=True, text=True).stderr
    dur = float(re.search(r"Duration: (\d+):(\d+):([\d.]+)", out).group(3)) + 60 * int(re.search(r"Duration: (\d+):(\d+)", out).group(2))
    starts = [float(x) for x in re.findall(r"silence_start: ([\d.]+)", out)]
    ends = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", out)]
    edges = [0.0] + ends
    stops = starts + [dur]
    return [(s, e) for s, e in zip(edges, stops) if e - s > 0.15]

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("audio"); ap.add_argument("--noise", type=float, default=-35); ap.add_argument("--min-gap", type=float, default=0.45)
    a = ap.parse_args()
    for i, (s, e) in enumerate(phrases(a.audio, a.noise, a.min_gap), 1):
        print(f"P{i:02d} [{s:06.2f}-{e:06.2f}] {e - s:4.1f}s")
