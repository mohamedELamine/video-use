import type { BrandIdentity, ResolvedSurface, Finding } from './types.js';

/**
 * Resolve surfaces for shots with fallback logic.
 *
 * - base = brand's bg/fg
 * - alt = recognized open roles alt_bg/alt_fg
 * - When alt_fg absent, use whichever of fg/bg contrasts more with alt_bg
 * - alt on brand without alt_bg = warning + fallback to base
 */
export class SurfaceResolver {
  private brand: BrandIdentity;
  private findings: Finding[] = [];

  constructor(brand: BrandIdentity) {
    this.brand = brand;
  }

  /**
   * Resolve surface for a shot.
   * Returns resolved surface and collects warnings if needed.
   */
  resolve(requestedSurface?: 'base' | 'alt'): ResolvedSurface {
    // Default to base
    if (!requestedSurface || requestedSurface === 'base') {
      return {
        name: 'base',
        bg: this.brand.surfaces.base.bg,
        fg: this.brand.surfaces.base.fg,
      };
    }

    // Requested alt
    if (requestedSurface === 'alt') {
      // Check if brand has alt_bg open role
      const altBg = this.brand.palette['alt_bg'];
      const altFg = this.brand.palette['alt_fg'];

      if (!altBg) {
        // Warning: alt requested but alt_bg not defined
        return {
          name: 'base',
          bg: this.brand.surfaces.base.bg,
          fg: this.brand.surfaces.base.fg,
          fallback: true,
          fallbackReason: 'alt_bg not defined in brand palette',
        };
      }

      // Determine foreground
      let fg = altFg;
      if (!fg) {
        // Use whichever of fg/bg contrasts more with alt_bg
        const contrast = this.contrastRatio(altBg, this.brand.surfaces.base.fg);
        const bgContrast = this.contrastRatio(altBg, this.brand.surfaces.base.bg);

        fg = contrast >= bgContrast ? this.brand.surfaces.base.fg : this.brand.surfaces.base.bg;
      }

      return {
        name: 'alt',
        bg: altBg,
        fg,
      };
    }

    // Fallthrough
    return {
      name: 'base',
      bg: this.brand.surfaces.base.bg,
      fg: this.brand.surfaces.base.fg,
    };
  }

  /**
   * Simple contrast ratio approximation.
   * Higher = more contrast.
   */
  private contrastRatio(color1: string, color2: string): number {
    const l1 = this.luminance(color1);
    const l2 = this.luminance(color2);

    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);

    return (lighter + 0.05) / (darker + 0.05);
  }

  /**
   * Calculate relative luminance for WCAG contrast calculation.
   */
  private luminance(hex: string): number {
    const rgb = this.hexToRgb(hex);
    if (!rgb) return 0.5; // fallback

    let [r, g, b] = rgb;

    // Normalize to 0-1
    r /= 255;
    g /= 255;
    b /= 255;

    // Apply gamma correction
    r = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
    g = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
    b = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);

    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  /**
   * Convert hex color to RGB array.
   */
  private hexToRgb(hex: string): [number, number, number] | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
      : null;
  }

  /**
   * Get findings (warnings).
   */
  getFindings(): Finding[] {
    return this.findings;
  }
}
