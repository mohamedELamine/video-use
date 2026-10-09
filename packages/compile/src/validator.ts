import { Plan, Shot, Finding, Alignment, IntentVocabulary, RenderJob } from './types.js';

export class Validator {
  private findings: Finding[] = [];
  private alignment: Alignment;
  private intents: IntentVocabulary;

  constructor(alignment: Alignment, intents: IntentVocabulary) {
    this.alignment = alignment;
    this.intents = intents;
  }

  validate(plan: Plan, _job: RenderJob): Finding[] {
    this.findings = [];

    this.validatePlanStructure(plan);
    this.validateBeats(plan);
    this.validateShots(plan);
    this.validateAnchors(plan);
    this.validateCues(plan);
    this.validateAlignment(plan);

    return this.findings;
  }

  private validatePlanStructure(plan: Plan): void {
    if (!plan.id) {
      this.addError('PLAN_MISSING_ID', plan.id || 'unknown', 'Plan must have an id');
    }

    if (plan.version !== '1.0.0') {
      this.addError('PLAN_UNKNOWN_VERSION', plan.id, `Unknown plan version: ${plan.version}`);
    }

    if (!plan.archetype) {
      this.addError('PLAN_MISSING_ARCHETYPE', plan.id, 'Plan must specify an archetype');
    }

    if (!Array.isArray(plan.beats) || plan.beats.length === 0) {
      this.addError('PLAN_NO_BEATS', plan.id, 'Plan must contain at least one beat');
    }
  }

  private validateBeats(plan: Plan): void {
    const beatIds = new Set<string>();
    let prevEndWord: string | null = null;

    for (const beat of plan.beats) {
      // Check uniqueness
      if (beatIds.has(beat.id)) {
        this.addError('BEAT_DUPLICATE_ID', beat.id, `Duplicate beat id: ${beat.id}`);
      }
      beatIds.add(beat.id);

      // Check required fields
      if (!beat.id) {
        this.addError('BEAT_MISSING_ID', 'unknown', 'Beat must have an id');
        continue;
      }

      if (!beat.kind) {
        this.addError('BEAT_MISSING_KIND', beat.id, 'Beat must have a kind');
      }

      if (!beat.startWordId) {
        this.addError('BEAT_MISSING_START', beat.id, 'Beat must specify startWordId');
      }

      if (!beat.endWordId) {
        this.addError('BEAT_MISSING_END', beat.id, 'Beat must specify endWordId');
      }

      // Check word references exist
      if (!this.wordExists(beat.startWordId)) {
        this.addError('BEAT_START_WORD_NOT_FOUND', beat.id, `Start word not found: ${beat.startWordId}`);
      }

      if (!this.wordExists(beat.endWordId)) {
        this.addError('BEAT_END_WORD_NOT_FOUND', beat.id, `End word not found: ${beat.endWordId}`);
      }

      // Check ordering
      const startIdx = this.getWordIndex(beat.startWordId);
      const endIdx = this.getWordIndex(beat.endWordId);

      if (startIdx >= 0 && endIdx >= 0 && startIdx > endIdx) {
        this.addError('BEAT_START_AFTER_END', beat.id, 'Beat start word comes after end word');
      }

      // Check beats don't overlap (simplified check)
      if (prevEndWord !== null && startIdx >= 0) {
        const prevEndIdx = this.getWordIndex(prevEndWord);
        if (prevEndIdx >= 0 && startIdx < prevEndIdx) {
          this.addError('BEAT_OVERLAP', beat.id, 'Beats overlap in time');
        }
      }

      if (endIdx >= 0) {
        prevEndWord = beat.endWordId;
      }
    }
  }

  private validateShots(plan: Plan): void {
    const shotIds = new Set<string>();

    for (const beat of plan.beats) {
      if (!Array.isArray(beat.shots)) {
        this.addError('BEAT_NO_SHOTS', beat.id, 'Beat must contain shots');
        continue;
      }

      for (const shot of beat.shots) {
        // Check uniqueness
        if (shotIds.has(shot.id)) {
          this.addError('SHOT_DUPLICATE_ID', shot.id, `Duplicate shot id: ${shot.id}`);
        }
        shotIds.add(shot.id);

        // Check required fields
        if (!shot.id) {
          this.addError('SHOT_MISSING_ID', 'unknown', 'Shot must have an id');
          continue;
        }

        if (!shot.startWordId) {
          this.addError('SHOT_MISSING_START', shot.id, 'Shot must specify startWordId');
        } else if (!this.wordExists(shot.startWordId)) {
          this.addError('SHOT_START_WORD_NOT_FOUND', shot.id, `Start word not found: ${shot.startWordId}`);
        }

        // Check shot starts within its beat
        if (shot.startWordId && beat.startWordId && beat.endWordId) {
          const shotIdx = this.getWordIndex(shot.startWordId);
          const beatStartIdx = this.getWordIndex(beat.startWordId);
          const beatEndIdx = this.getWordIndex(beat.endWordId);

          if (shotIdx >= 0 && beatStartIdx >= 0 && shotIdx < beatStartIdx) {
            this.addError('SHOT_START_BEFORE_BEAT', shot.id, 'Shot starts before its beat');
          }

          if (shotIdx >= 0 && beatEndIdx >= 0 && shotIdx > beatEndIdx) {
            this.addError('SHOT_START_AFTER_BEAT', shot.id, 'Shot starts after its beat ends');
          }
        }

        // Check shot references correct beat
        if (shot.beatId !== beat.id) {
          this.addError('SHOT_WRONG_BEAT', shot.id, `Shot's beatId doesn't match containing beat`);
        }

        // Check intent is in vocabulary
        if (!shot.intent) {
          this.addError('SHOT_MISSING_INTENT', shot.id, 'Shot must specify an intent');
        } else {
          const intentDef = this.intents.intents.find(i => i.id === shot.intent);
          if (!intentDef) {
            this.addError('SHOT_UNKNOWN_INTENT', shot.id, `Intent not in vocabulary: ${shot.intent}`);
          } else {
            this.validateShotSlots(shot, intentDef);
          }
        }

        // Check surface value
        if (shot.surface && shot.surface !== 'base' && shot.surface !== 'alt') {
          this.addError('SHOT_INVALID_SURFACE', shot.id, `Invalid surface value: ${shot.surface}`);
        }
      }
    }
  }

  private validateShotSlots(shot: Shot, intentDef: any): void {
    for (const slotDef of intentDef.slots) {
      const slotValue = shot.slots?.[slotDef.id];

      if (slotDef.required && slotValue === undefined) {
        this.addError('SHOT_MISSING_SLOT', shot.id, `Required slot missing: ${slotDef.id}`);
      }

      if (slotValue !== undefined && slotDef.type === 'string' && typeof slotValue !== 'string') {
        this.addError('SHOT_SLOT_TYPE_ERROR', shot.id, `Slot ${slotDef.id} must be string, got ${typeof slotValue}`);
      }
    }
  }

  private validateAnchors(plan: Plan): void {
    const anchorIds = new Set<string>();

    for (const beat of plan.beats) {
      if (!Array.isArray(beat.anchors)) {
        continue;
      }

      let payoffCount = 0;
      for (const anchor of beat.anchors) {
        // Check uniqueness
        if (anchorIds.has(anchor.id)) {
          this.addError('ANCHOR_DUPLICATE_ID', anchor.id, `Duplicate anchor id: ${anchor.id}`);
        }
        anchorIds.add(anchor.id);

        // Check required fields
        if (!anchor.id) {
          this.addError('ANCHOR_MISSING_ID', 'unknown', 'Anchor must have an id');
          continue;
        }

        if (!anchor.role) {
          this.addError('ANCHOR_MISSING_ROLE', anchor.id, 'Anchor must have a role');
        }

        if (!anchor.wordId) {
          this.addError('ANCHOR_MISSING_WORD', anchor.id, 'Anchor must specify a wordId');
        } else if (!this.wordExists(anchor.wordId)) {
          this.addError('ANCHOR_WORD_NOT_FOUND', anchor.id, `Word not found: ${anchor.wordId}`);
        }

        // Check beat has at most one payoff
        if (anchor.role === 'payoff') {
          payoffCount++;
          if (payoffCount > 1) {
            this.addError('BEAT_MULTIPLE_PAYOFFS', beat.id, 'Beat cannot have more than one payoff anchor');
          }
        }
      }
    }
  }

  private validateCues(plan: Plan): void {
    for (const beat of plan.beats) {
      for (const shot of beat.shots) {
        if (!Array.isArray(shot.cues)) {
          continue;
        }

        for (const cue of shot.cues) {
          if (!cue.id) {
            this.addError('CUE_MISSING_ID', 'unknown', 'Cue must have an id');
            continue;
          }

          if (!cue.anchorId) {
            this.addError('CUE_MISSING_ANCHOR', cue.id, 'Cue must reference an anchor');
          } else {
            // Check anchor exists in this beat
            const anchorExists = beat.anchors?.some(a => a.id === cue.anchorId);
            if (!anchorExists) {
              this.addError('CUE_ANCHOR_NOT_FOUND', cue.id, `Anchor not found in beat: ${cue.anchorId}`);
            }
          }

          if (!cue.kind) {
            this.addError('CUE_MISSING_KIND', cue.id, 'Cue must specify a kind');
          } else {
            const kindExists = this.intents.cueKinds.some(k => k.id === cue.kind);
            if (!kindExists) {
              this.addError('CUE_UNKNOWN_KIND', cue.id, `Cue kind not in vocabulary: ${cue.kind}`);
            }
          }

          if (!cue.target) {
            this.addError('CUE_MISSING_TARGET', cue.id, 'Cue must specify a target');
          }
        }
      }
    }
  }

  private validateAlignment(plan: Plan): void {
    if (!this.alignment.words || this.alignment.words.length === 0) {
      this.addError('ALIGNMENT_EMPTY', plan.id, 'Alignment contains no words');
      return;
    }

    // Check alignment covers full plan
    const lastBeat = plan.beats[plan.beats.length - 1];
    if (lastBeat && lastBeat.endWordId) {
      if (!this.wordExists(lastBeat.endWordId)) {
        this.addError('ALIGNMENT_INCOMPLETE', plan.id, 'Alignment does not reach the end of the plan');
      }
    }
  }

  private wordExists(wordId: string): boolean {
    return this.alignment.words.some(w => w.id === wordId);
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

  // private addWarning(code: string, entityId: string, message: string): void {
  //   this.findings.push({
  //     code,
  //     severity: 'warning',
  //     entityId,
  //     message,
  //   });
  // }
}
