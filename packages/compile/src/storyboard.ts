import { Plan, Alignment, TimelineFrame } from './types.js';

export class StoryboardGenerator {
  private plan: Plan;
  private alignment: Alignment;
  private timeline: TimelineFrame[];

  constructor(plan: Plan, alignment: Alignment, timeline: TimelineFrame[]) {
    this.plan = plan;
    this.alignment = alignment;
    this.timeline = timeline;
  }

  /**
   * Generate a deterministic Markdown storyboard showing beats and shots.
   * Two runs produce byte-identical output.
   */
  generate(): string {
    const lines: string[] = [];

    lines.push('# Storyboard\n');

    for (const beat of this.plan.beats) {
      lines.push(this.formatBeat(beat));

      for (const shot of beat.shots) {
        lines.push(this.formatShot(shot));
      }

      lines.push(''); // blank line between beats
    }

    return lines.join('\n');
  }

  private formatBeat(beat: any): string {
    const narration = this.getNarration(beat.startWordId, beat.endWordId);
    const startIdx = this.getWordIndex(beat.startWordId);
    const endIdx = this.getWordIndex(beat.endWordId);

    let header = `## Beat: ${beat.id} (${beat.kind})`;
    if (startIdx >= 0 && endIdx >= 0) {
      header += ` [words ${startIdx}-${endIdx}]`;
    }

    const lines = [header, ''];

    if (narration) {
      lines.push(`**Narration**: "${narration}"`);
      lines.push('');
    }

    // Show anchors in beat
    if (beat.anchors && beat.anchors.length > 0) {
      lines.push('**Anchors**:');
      for (const anchor of beat.anchors) {
        const word = this.getWord(anchor.wordId);
        lines.push(`- ${anchor.role}: "${word?.text}" (${anchor.wordId})`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  private formatShot(shot: any): string {
    const timelineEntry = this.timeline.find(t => t.shot.id === shot.id);
    // const startWord = this.getWord(shot.startWordId);

    const lines = [`### Shot: ${shot.id}`];

    lines.push(`- **Intent**: ${shot.intent}`);

    if (timelineEntry) {
      lines.push(`- **Start**: ${timelineEntry.startSecond.toFixed(2)}s (frame ${timelineEntry.startFrame})`);
      lines.push(`- **End**: ${timelineEntry.endSecond.toFixed(2)}s (frame ${timelineEntry.endFrame})`);
      lines.push(`- **Duration**: ${(timelineEntry.endSecond - timelineEntry.startSecond).toFixed(2)}s`);
    }

    // Show surface with colors
    const surface = shot.surface || 'base';
    let surfaceStr = surface;
    // TODO: add resolved colors when resolver integrated
    lines.push(`- **Surface**: ${surfaceStr}`);

    if (shot.intent === 'statement' && shot.slots?.copy) {
      const copy = shot.slots.copy;
      lines.push(`- **Copy**: "${typeof copy === 'string' ? copy : JSON.stringify(copy)}"`);
    }

    if (shot.cues && shot.cues.length > 0) {
      lines.push(`- **Cues**:`);
      for (const cue of shot.cues) {
        const targetStr = typeof cue.target === 'string' ? cue.target : JSON.stringify(cue.target);
        lines.push(`  - ${cue.kind}: ${targetStr} (anchor: ${cue.anchorId})`);
      }
    }

    lines.push('');

    return lines.join('\n');
  }

  private getNarration(startWordId: string, endWordId: string): string {
    const startIdx = this.getWordIndex(startWordId);
    const endIdx = this.getWordIndex(endWordId);

    if (startIdx < 0 || endIdx < 0) {
      return '';
    }

    const words = this.alignment.words.slice(startIdx, endIdx + 1);
    return words.map(w => w.text).join(' ');
  }

  private getWord(wordId: string) {
    return this.alignment.words.find(w => w.id === wordId);
  }

  private getWordIndex(wordId: string): number {
    return this.alignment.words.findIndex(w => w.id === wordId);
  }
}
