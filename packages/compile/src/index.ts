import { Plan, Alignment, CompiledPlan, IntentVocabulary, RenderJob } from './types.js';
import { Validator } from './validator.js';
import { Resolver } from './resolver.js';
import { StoryboardGenerator } from './storyboard.js';

/**
 * Compile a video spec plan into an executable render instruction.
 *
 * Pure function: takes inputs, returns compiled plan with findings.
 * No I/O, deterministic, idempotent.
 */
export function compile(
  plan: Plan,
  alignment: Alignment,
  intents: IntentVocabulary,
  job: RenderJob
): CompiledPlan {
  // Validation phase
  const validator = new Validator(alignment, intents);
  const findings = validator.validate(plan, job);
  const errors = findings.filter(f => f.severity === 'error');
  const warnings = findings.filter(f => f.severity === 'warning');

  const isValid = errors.length === 0;

  // Resolution phase (only if valid)
  let timeline: any[] = [];
  let storyboard: string = '';

  if (isValid) {
    const resolver = new Resolver(alignment, {
      fps: job.output.fps,
      tailS: job.output.tailS,
    });
    timeline = resolver.resolve(plan);

    const generator = new StoryboardGenerator(plan, alignment, timeline);
    storyboard = generator.generate();
  }

  return {
    valid: isValid,
    errors,
    warnings,
    grounding: [], // TODO: implement grounding check
    timeline,
    storyboard,
  };
}

// Export types and utilities
export * from './types.js';
export { Validator } from './validator.js';
export { Resolver } from './resolver.js';
export { StoryboardGenerator } from './storyboard.js';
export { SurfaceResolver } from './surface-resolver.js';
