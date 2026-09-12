"""Pair a script's lines against the voice-over's silence windows, in order.

Each script line is one phrase (id `pNN`, from the line structure — see issue #14).
A line may span several windows when the narrator breathed mid-line; no window is
ever split, because the waveform is ground truth and the line count is not.

The pairing is a DP over in-order, contiguous assignments minimising the squared
gap between each line's share of the characters and its share of the speech time.

Usage: python pair_phrases.py <script.md> <audio.wav>
"""

from __future__ import annotations

import sys
import unicodedata

sys.path.insert(0, "skills/wp-reels/helpers")
from vo_phrases import phrases  # noqa: E402

TATWEEL = "ـ"


def script_lines(path: str) -> list[str]:
    with open(path, encoding="utf-8") as fh:
        return [ln.strip() for ln in fh if ln.strip()]


def weight(text: str) -> int:
    """Spoken-length proxy: letters and digits only, diacritics and punctuation out."""
    return sum(
        1
        for ch in unicodedata.normalize("NFC", text)
        if ch.isalnum() and ch != TATWEEL and not unicodedata.combining(ch)
    )


def pair(lines: list[str], windows: list[tuple[float, float]]) -> list[list[int]]:
    """Assign each line a contiguous, non-empty run of windows, in order."""
    n, m = len(lines), len(windows)
    assert m >= n, f"{m} windows cannot cover {n} lines"

    w = [weight(ln) for ln in lines]
    wshare = [x / sum(w) for x in w]
    dur = [e - s for s, e in windows]
    total = sum(dur)

    INF = float("inf")
    # best[i][j] = cost of covering lines[i:] with windows[j:]
    best = [[INF] * (m + 1) for _ in range(n + 1)]
    take = [[0] * (m + 1) for _ in range(n + 1)]
    best[n][m] = 0.0
    for i in range(n - 1, -1, -1):
        for j in range(m - 1, -1, -1):
            remaining = n - i - 1  # lines after this one, each needing >= 1 window
            run = 0.0
            for k in range(j, m - remaining):
                run += dur[k]
                nxt = best[i + 1][k + 1]
                if nxt == INF:
                    continue
                cost = nxt + (run / total - wshare[i]) ** 2
                if cost < best[i][j]:
                    best[i][j], take[i][j] = cost, k + 1 - j

    out, j = [], 0
    for i in range(n):
        out.append(list(range(j, j + take[i][j])))
        j += take[i][j]
    assert j == m, "windows left over"
    return out


def main() -> None:
    script, audio = sys.argv[1], sys.argv[2]
    lines = script_lines(script)
    windows = phrases(audio, noise=-35, min_gap=0.45)
    groups = pair(lines, windows)

    speech = sum(windows[k][1] - windows[k][0] for g in groups for k in g)
    mean = sum(weight(ln) for ln in lines) / speech

    print(f"{len(lines)} script lines -> {len(windows)} silence windows")
    print(f"mean speech rate {mean:.1f} chars/s over {speech:.1f}s of speech\n")
    for i, (line, idx) in enumerate(zip(lines, groups), 1):
        start, end = windows[idx[0]][0], windows[idx[-1]][1]
        voiced = sum(windows[k][1] - windows[k][0] for k in idx)
        rate = weight(line) / voiced
        tag = ",".join(f"P{k + 1:02d}" for k in idx)
        # a phrase spoken far off the mean rate is where script and audio disagree
        flag = "  <- RATE" if not 0.55 < rate / mean < 1.8 else ""
        print(f"p{i:02d} [{start:06.2f}-{end:06.2f}] {end - start:4.1f}s {rate:4.1f}c/s {tag:<12}{flag}")
        print(f"     {line}")


def _selfcheck() -> None:
    w = [(0.0, 2.0), (3.0, 4.0), (5.0, 5.2)]
    assert pair(["aaaaaa", "b"], w) == [[0, 1], [2]], "the long line absorbs the spare window"
    assert pair(["b", "aaaaaa"], w) == [[0], [1, 2]], "and does so on whichever side it sits"
    assert pair(["a", "b", "c"], w) == [[0], [1], [2]], "one window each when the counts match"
    assert pair(["aaaa"], w) == [[0, 1, 2]], "a single line takes every window"


if __name__ == "__main__":
    _selfcheck()
    main()
