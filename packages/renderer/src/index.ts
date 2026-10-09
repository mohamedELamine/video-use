/**
 * Renderer for compiled video specs.
 *
 * Validates compiled plans and prepares Remotion compositions.
 */

import type { CompiledPlan, BrandIdentity, TimelineFrame } from '@video-use/compile';

export interface RenderOptions {
  fps: number;
  width: number;
  height: number;
  duration: number;
  tailS: number;
}

export interface RenderResult {
  composition: string; // composition name
  duration: number;
  fps: number;
  width: number;
  height: number;
  frames: TimelineFrame[];
}

export class Renderer {
  private brand: BrandIdentity;
  private options: RenderOptions;

  constructor(brand: BrandIdentity, options: RenderOptions) {
    this.brand = brand;
    this.options = options;

    // Validate brand
    if (!brand.name) {
      throw new Error('Brand must have a name');
    }

    if (!brand.surfaces?.base) {
      throw new Error('Brand must define base surface');
    }
  }

  /**
   * Register a composition from a compiled plan.
   * Refuses if the plan is invalid.
   *
   * Returns render configuration if successful.
   */
  registerComposition(compiledPlan: CompiledPlan): RenderResult {
    // Refuse invalid plans
    if (!compiledPlan.valid) {
      throw new Error(
        `Cannot render an invalid compiled plan: ${compiledPlan.errors
          .map((e) => `${e.code} (${e.entityId}): ${e.message}`)
          .join('; ')}`
      );
    }

    // Check timeline exists and has frames
    if (!compiledPlan.timeline || compiledPlan.timeline.length === 0) {
      throw new Error('Compiled plan has no timeline frames');
    }

    // Calculate total duration
    const lastFrame = compiledPlan.timeline[compiledPlan.timeline.length - 1];
    const durationSeconds = lastFrame.endSecond;
    const durationFrames = Math.round(durationSeconds * this.options.fps);

    return {
      composition: `statement-${Date.now()}`,
      duration: durationSeconds,
      fps: this.options.fps,
      width: this.options.width,
      height: this.options.height,
      frames: compiledPlan.timeline,
    };
  }

  /**
   * Get brand surface colors
   */
  getSurface(name: string = 'base') {
    const surface = this.brand.surfaces[name as keyof typeof this.brand.surfaces];
    if (!surface) {
      return this.brand.surfaces.base;
    }
    return surface;
  }

  /**
   * Get brand accent color for UI elements
   */
  getAccent(): string {
    return this.brand.palette['accent'] || '#0066FF';
  }
}

export type * from '@video-use/compile';
