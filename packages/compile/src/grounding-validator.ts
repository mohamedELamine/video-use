import type { Plan, Finding, ProductKnowledge, GroundingResult, Alignment, Promotion } from './types.js';

/**
 * Grounding validator checks that capability claims are valid.
 *
 * - Capability must exist in product.json
 * - Shot's evidence mode must be in capability's evidenceModes
 * - Grounding phrase must fall within beat's word range
 * - supporting shots carry no capabilityId
 */
export class GroundingValidator {
  private product: ProductKnowledge;
  private alignment: Alignment;
  private findings: Finding[] = [];
  private groundingResults: GroundingResult[] = [];

  constructor(product: ProductKnowledge, alignment: Alignment) {
    this.product = product;
    this.alignment = alignment;
  }

  /**
   * Validate grounding for a plan.
   */
  validate(plan: Plan): Finding[] {
    this.findings = [];
    this.groundingResults = [];

    // Validate promotions and groundings
    for (const beat of plan.beats) {
      this.validatePromotions(beat, plan);
      this.validateShots(beat);
    }

    return this.findings;
  }

  private validatePromotions(beat: any, _plan: Plan): void {
    if (!beat.promotions) {
      return;
    }

    for (const promotion of beat.promotions) {
      // Check capability exists
      const capability = this.product.capabilities.find(c => c.id === promotion.capabilityId);

      if (!capability) {
        this.addWarning('UNRESOLVED_CAPABILITY', beat.id, `Capability not found: ${promotion.capabilityId}`);
        this.groundingResults.push({
          capabilityId: promotion.capabilityId,
          state: 'unresolved',
          reason: 'Capability not in product.json',
        });
      } else {
        this.groundingResults.push({
          capabilityId: promotion.capabilityId,
          state: 'grounded',
          capabilityName: capability.name,
        });
      }

      // Check grounding phrase is within beat
      this.validateGroundingPhrase(promotion, beat);
    }
  }

  private validateGroundingPhrase(promotion: Promotion, beat: any): void {
    const beatStartIdx = this.getWordIndex(beat.startWordId);
    const beatEndIdx = this.getWordIndex(beat.endWordId);

    if (beatStartIdx < 0 || beatEndIdx < 0) {
      return;
    }

    // Find grounding phrase in alignment
    const phraseWords = promotion.groundingPhrase.split(/\s+/);
    let foundStart = -1;

    for (let i = beatStartIdx; i <= beatEndIdx; i++) {
      const word = this.alignment.words[i];
      if (word && word.text === phraseWords[0]) {
        // Check if phrase matches
        let matches = true;
        for (let j = 0; j < phraseWords.length; j++) {
          const w = this.alignment.words[i + j];
          if (!w || w.text !== phraseWords[j]) {
            matches = false;
            break;
          }
        }
        if (matches) {
          foundStart = i;
          break;
        }
      }
    }

    if (foundStart < beatStartIdx || foundStart + phraseWords.length - 1 > beatEndIdx) {
      this.addError('GROUNDING_PHRASE_OUTSIDE_BEAT', beat.id, `Grounding phrase outside beat: "${promotion.groundingPhrase}"`);
    }
  }

  private validateShots(beat: any): void {
    // Collect promoted capabilities
    const promotedCaps = new Set<string>();
    if (beat.promotions) {
      for (const prom of beat.promotions) {
        promotedCaps.add(prom.capabilityId);
      }
    }

    for (const shot of beat.shots) {
      // Check supporting shots have no capabilityId
      if (shot.intent === 'statement') {
        if (shot.capabilityId) {
          this.addWarning('STATEMENT_WITH_CAPABILITY', shot.id, 'Supporting shot (statement) should not have capabilityId');
        }
      }

      // Check capability is promoted in beat
      if (shot.capabilityId) {
        if (!promotedCaps.has(shot.capabilityId)) {
          this.addError('CAPABILITY_NOT_PROMOTED', shot.id, `Capability not promoted in beat: ${shot.capabilityId}`);
        }

        // Check evidence mode
        const capability = this.product.capabilities.find(c => c.id === shot.capabilityId);
        if (capability && shot.evidenceMode && !capability.evidenceModes.includes(shot.evidenceMode)) {
          this.addWarning('INVALID_EVIDENCE_MODE', shot.id, `Evidence mode not in capability: ${shot.evidenceMode}`);
        }
      }
    }
  }

  private getWordIndex(wordId: string): number {
    return this.alignment.words.findIndex(w => w.id === wordId);
  }

  private addError(code: string, entityId: string, message: string): void {
    this.findings.push({
      code,
      severity: 'error',
      entityId,
      message,
    });
  }

  private addWarning(code: string, entityId: string, message: string): void {
    this.findings.push({
      code,
      severity: 'warning',
      entityId,
      message,
    });
  }

  getGroundingResults(): GroundingResult[] {
    return this.groundingResults;
  }
}
