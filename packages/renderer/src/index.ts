/**
 * Renderer base for compiled video specs.
 *
 * This is a minimal stub that will be expanded into a full Remotion-based renderer.
 * For now it just validates that a compiled plan is suitable for rendering.
 */

import type { CompiledPlan, BrandIdentity } from '@video-use/compile';

export interface RenderOptions {
  fps: number;
  width: number;
  height: number;
  duration: number;
}

export class Renderer {
  private brand: BrandIdentity;
  private options: RenderOptions;

  constructor(brand: BrandIdentity, options: RenderOptions) {
    this.brand = brand;
    this.options = options;
  }

  /**
   * Register a composition from a compiled plan.
   * Refuses if the plan is invalid.
   */
  registerComposition(compiledPlan: CompiledPlan): void {
    if (!compiledPlan.valid) {
      throw new Error('Cannot render an invalid compiled plan');
    }

    // TODO: implement Remotion composition registration
  }

  /**
   * Render the composition to video.
   */
  async render(): Promise<void> {
    // TODO: implement rendering
    console.log('Rendering not yet implemented');
  }
}

export type * from '@video-use/compile';
