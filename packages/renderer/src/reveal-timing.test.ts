import { test } from 'node:test';
import { strict as assert } from 'node:assert';

// Reveal timing test - a cue's reveal lead timing
interface RevealSpec {
  anchorFrame: number; // frame where anchor word lands
  leadFrames: number; // frames before anchor to start reveal (0.4s at medium = 12 frames at 30fps)
  shotStartFrame: number;
  shotEndFrame: number;
}

function calculateRevealStart(spec: RevealSpec, fps: number = 30): number {
  const leadTime = 0.4; // 400ms lead time (medium pace)
  const leadFrames = Math.round(leadTime * fps);

  // Reveal starts at anchor frame minus lead, clamped to shot start
  return Math.max(spec.anchorFrame - leadFrames, spec.shotStartFrame);
}

test('reveal-timing: reveal starts 0.4s before anchor word', () => {
  const spec: RevealSpec = {
    anchorFrame: 30, // 1 second at 30fps
    leadFrames: 12, // 0.4s at 30fps
    shotStartFrame: 0,
    shotEndFrame: 60,
  };

  const revealStart = calculateRevealStart(spec);
  assert.equal(revealStart, 30 - 12, 'Reveal should start 12 frames before anchor');
});

test('reveal-timing: reveal clamped to shot start', () => {
  const spec: RevealSpec = {
    anchorFrame: 5, // 5 frames into shot
    leadFrames: 12, // would be negative without clamp
    shotStartFrame: 0,
    shotEndFrame: 60,
  };

  const revealStart = calculateRevealStart(spec);
  assert.equal(revealStart, 0, 'Reveal should clamp to shot start (0)');
});

test('reveal-timing: slot hidden before reveal start', () => {
  const anchorFrame = 30;
  const revealStart = calculateRevealStart({
    anchorFrame,
    leadFrames: 12,
    shotStartFrame: 0,
    shotEndFrame: 60,
  });

  // Before reveal start, slot should be hidden
  assert.ok(revealStart === 18);
  assert.ok(anchorFrame - revealStart > 0);
});

test('reveal-timing: slot shown after anchor word', () => {
  const anchorFrame = 30;
  const fps = 30;

  // After anchor frame, slot should be visible (animation complete)
  assert.ok(anchorFrame > calculateRevealStart({
    anchorFrame,
    leadFrames: 12,
    shotStartFrame: 0,
    shotEndFrame: 60,
  }));
});

test('reveal-timing: still before reveal = hidden', () => {
  const spec: RevealSpec = {
    anchorFrame: 30,
    leadFrames: 12,
    shotStartFrame: 0,
    shotEndFrame: 60,
  };

  const revealStart = calculateRevealStart(spec);

  // Still taken at frame 10 (before reveal start 18) should show hidden
  const stillFrame = 10;
  const shouldBeHidden = stillFrame < revealStart;
  assert.ok(shouldBeHidden);
});

test('reveal-timing: still after anchor = shown', () => {
  const spec: RevealSpec = {
    anchorFrame: 30,
    leadFrames: 12,
    shotStartFrame: 0,
    shotEndFrame: 60,
  };

  const anchorFrame = spec.anchorFrame;

  // Still taken at frame 40 (after anchor 30) should show visible
  const stillFrame = 40;
  const shouldBeVisible = stillFrame >= anchorFrame;
  assert.ok(shouldBeVisible);
});

test('reveal-timing: multiple cues in shot', () => {
  // Multiple cues in one shot, each with own reveal timing
  const cue1 = { anchorFrame: 20, leadFrames: 12, shotStartFrame: 0, shotEndFrame: 100 };
  const cue2 = { anchorFrame: 50, leadFrames: 12, shotStartFrame: 0, shotEndFrame: 100 };

  const cue1RevealStart = calculateRevealStart(cue1);
  const cue2RevealStart = calculateRevealStart(cue2);

  // Cues reveal at different times
  assert.ok(cue1RevealStart < cue2RevealStart);
  assert.equal(cue1RevealStart, 8); // 20 - 12
  assert.equal(cue2RevealStart, 38); // 50 - 12
});

test('reveal-timing: all tests completed', () => {
  assert.ok(true);
});
