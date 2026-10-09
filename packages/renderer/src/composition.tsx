/**
 * Remotion composition for compiled video specs.
 * Renders statement-only jobs to 1080×1920 vertical video.
 *
 * This is a minimal composition. Full rendering requires Remotion video-render CLI.
 * Stub implementation for validation and composition registration.
 */

import React from 'react';
import type { CompiledPlan } from '@video-use/compile';

export interface CompositionProps {
  compiledPlan: CompiledPlan;
  audioPath?: string;
}

/**
 * Validates composition can be rendered from a compiled plan.
 * Returns true if the plan is suitable for Remotion rendering.
 */
export function validateComposition(compiledPlan: CompiledPlan): boolean {
  // Plan must be valid
  if (!compiledPlan.valid) {
    return false;
  }

  // Must have timeline
  if (!compiledPlan.timeline || compiledPlan.timeline.length === 0) {
    return false;
  }

  // All shots must have intents
  for (const frame of compiledPlan.timeline) {
    if (!frame.shot.intent) {
      return false;
    }
  }

  return true;
}

/**
 * Get composition metadata for rendering
 */
export interface CompositionMetadata {
  name: string;
  width: number;
  height: number;
  fps: number;
  durationInFrames: number;
}

export function getCompositionMetadata(
  compiledPlan: CompiledPlan,
  fps: number = 30,
  width: number = 1080,
  height: number = 1920
): CompositionMetadata {
  const lastFrame = compiledPlan.timeline[compiledPlan.timeline.length - 1];
  const durationSeconds = lastFrame.endSecond;
  const durationInFrames = Math.round(durationSeconds * fps);

  return {
    name: `video-${Date.now()}`,
    width,
    height,
    fps,
    durationInFrames,
  };
}

/**
 * Stub Composition component for reference.
 * Full implementation requires Remotion's JSX rendering.
 *
 * In production, this would render each shot as a Remotion Sequence
 * with appropriate styling based on intent and brand.
 */
export const Composition: React.FC<CompositionProps> = ({
  compiledPlan,
  audioPath: _audioPath,
}) => {
  // Validate before rendering
  if (!validateComposition(compiledPlan)) {
    throw new Error('Invalid compiled plan for composition');
  }

  // Placeholder: actual rendering handled by Remotion
  return (
    <div>
      {compiledPlan.timeline.length} shots, {compiledPlan.storyboard.length} bytes storyboard
    </div>
  );
};

export default Composition;
