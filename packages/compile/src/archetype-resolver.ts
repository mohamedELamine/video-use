import type { Plan, Finding, Archetype } from './types.js';

/**
 * Archetype resolver validates narrative structure.
 *
 * Launch archetype:
 * - Obligations: capture-attention, establish-product, communicate-value,
 *   resolve-promise, drive-action
 * - capture-attention: claimed by first beat
 * - drive-action: claimed by last beat
 * - Only CAPABILITY and DIFFERENTIATION may repeat
 * - Every obligation claimed at least once
 */
export class ArchetypeResolver {
  private archetype: Archetype;
  private findings: Finding[] = [];

  constructor(archetype: Archetype) {
    this.archetype = archetype;
  }

  /**
   * Resolve and validate archetype against plan.
   */
  validate(plan: Plan, archetypeId: string): Finding[] {
    this.findings = [];

    // Check archetype exists
    if (archetypeId !== this.archetype.id) {
      this.addError('UNKNOWN_ARCHETYPE', plan.id, `Unknown archetype: ${archetypeId}`);
      return this.findings;
    }

    if (plan.beats.length === 0) {
      this.addError('NO_BEATS', plan.id, 'Plan must have at least one beat');
      return this.findings;
    }

    // Validate obligation claims
    this.validateObligationClaims(plan);

    // Validate beat kinds
    this.validateBeatKinds(plan);

    // Validate positioning constraints
    this.validatePositioning(plan);

    return this.findings;
  }

  private validateObligationClaims(plan: Plan): void {
    const claimedObligs = new Set<string>();
    const beatObligCounts = new Map<string, number>();

    // Collect all claimed obligations
    for (const beat of plan.beats) {
      if (beat.claimedObligations) {
        for (const oblig of beat.claimedObligations) {
          claimedObligs.add(oblig);
          beatObligCounts.set(oblig, (beatObligCounts.get(oblig) || 0) + 1);
        }
      }
    }

    // Check every obligation is claimed at least once
    for (const oblig of this.archetype.obligations) {
      if (!claimedObligs.has(oblig.id)) {
        this.addError('MISSING_OBLIGATION', plan.id, `Missing obligation claim: ${oblig.id}`);
      }
    }

    // Check non-repeatable obligations
    for (const oblig of this.archetype.obligations) {
      if (!oblig.repeatable && beatObligCounts.get(oblig.id)! > 1) {
        this.addError('REPEATED_NON_REPEATABLE', plan.id, `Non-repeatable obligation repeated: ${oblig.id}`);
      }
    }
  }

  private validatePositioning(plan: Plan): void {
    // Find capture-attention and drive-action
    const captureAttentionOblig = this.archetype.obligations.find(o => o.id === 'capture-attention');
    const driveActionOblig = this.archetype.obligations.find(o => o.id === 'drive-action');

    if (captureAttentionOblig && captureAttentionOblig.positional) {
      // Must be claimed by first beat
      if (!plan.beats[0].claimedObligations?.includes('capture-attention')) {
        this.addError('CAPTURE_ATTENTION_NOT_FIRST', plan.beats[0].id, 'capture-attention must be claimed by first beat');
      }
    }

    if (driveActionOblig && driveActionOblig.positional) {
      // Must be claimed by last beat
      const lastBeat = plan.beats[plan.beats.length - 1];
      if (!lastBeat.claimedObligations?.includes('drive-action')) {
        this.addError('DRIVE_ACTION_NOT_LAST', lastBeat.id, 'drive-action must be claimed by last beat');
      }
    }
  }

  private validateBeatKinds(plan: Plan): void {
    const validKinds = [
      'HOOK',
      'PROBLEM',
      'REVEAL',
      'POSITIONING',
      'PIVOT',
      'CAPABILITY',
      'DIFFERENTIATION',
      'PAYOFF',
      'ATTRIBUTION',
      'CTA',
    ];

    for (const beat of plan.beats) {
      if (!beat.kind || !validKinds.includes(beat.kind)) {
        this.addError('INVALID_BEAT_KIND', beat.id, `Invalid beat kind: ${beat.kind}`);
      }
    }
  }

  private addError(code: string, entityId: string, message: string): void {
    this.findings.push({
      code,
      severity: 'error',
      entityId,
      message,
    });
  }
}

/**
 * Built-in launch archetype
 */
export const launchArchetype: Archetype = {
  id: 'launch',
  obligations: [
    {
      id: 'capture-attention',
      description: 'Capture attention early',
      positional: true,
    },
    {
      id: 'establish-product',
      description: 'Establish what the product is',
      positional: false,
    },
    {
      id: 'communicate-value',
      description: 'Communicate meaningful value',
      positional: false,
    },
    {
      id: 'resolve-promise',
      description: 'Resolve the opening promise',
      positional: false,
    },
    {
      id: 'drive-action',
      description: 'Drive to action',
      positional: true,
    },
  ],
};
