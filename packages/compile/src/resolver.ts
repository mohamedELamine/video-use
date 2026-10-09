import { Plan, Alignment, TimelineFrame, Shot } from './types.js';

export interface ResolverOptions {
  fps: number;
  tailS: number; // seconds after voice-over ends
}

export class Resolver {
  private alignment: Alignment;
  private options: ResolverOptions;

  constructor(alignment: Alignment, options: ResolverOptions) {
    this.alignment = alignment;
    this.options = options;
  }

  /**
   * Resolve the plan to a timeline with frame numbers and timestamps.
   * Deterministic and computed once, in order.
   */
  resolve(plan: Plan): TimelineFrame[] {
    const frames: TimelineFrame[] = [];
    const shots = this.collectShots(plan);

    if (shots.length === 0) {
      return frames;
    }

    // The first shot starts at frame 0
    // let currentFrame = 0;
    // let currentSecond = 0;

    for (let i = 0; i < shots.length; i++) {
      const shot = shots[i];
      const nextShot = shots[i + 1];

      // Find the start word in alignment
      const startWordIdx = this.getWordIndex(shot.startWordId);
      if (startWordIdx < 0) {
        // Word not found; skip this shot
        continue;
      }

      const startWord = this.alignment.words[startWordIdx];
      const startSecond = startWord.start;
      const startFrame = Math.round(startSecond * this.options.fps);

      // Determine end: either start of next shot, or end of voice-over + tail
      let endSecond: number;
      if (nextShot) {
        const nextStartWordIdx = this.getWordIndex(nextShot.startWordId);
        if (nextStartWordIdx >= 0) {
          const nextWord = this.alignment.words[nextStartWordIdx];
          // Cut should land 0.5s before next shot's word, but never before halfway through silence
          const nextWordStart = nextWord.start;
          const prevWord = this.alignment.words[nextStartWordIdx - 1];
          const silenceStart = prevWord?.end || nextWordStart;
          const silenceEnd = nextWordStart;
          const halfwaySilence = (silenceStart + silenceEnd) / 2;

          const cutPoint = Math.max(nextWordStart - 0.5, halfwaySilence);
          endSecond = cutPoint;
        } else {
          // Next word not found; use voice-over end
          endSecond = this.alignment.duration + this.options.tailS;
        }
      } else {
        // Last shot: runs to voice-over end plus tail
        endSecond = this.alignment.duration + this.options.tailS;
      }

      const endFrame = Math.round(endSecond * this.options.fps);

      frames.push({
        shot: {
          id: shot.id,
          beatId: shot.beatId,
          intent: shot.intent,
        },
        startFrame,
        startSecond,
        endFrame,
        endSecond,
        anchors: [], // TODO: resolve anchors
        cues: [], // TODO: resolve cues
      });
    }

    return frames;
  }

  private collectShots(plan: Plan): Shot[] {
    const shots: Shot[] = [];

    for (const beat of plan.beats) {
      for (const shot of beat.shots) {
        shots.push(shot);
      }
    }

    return shots;
  }

  private getWordIndex(wordId: string): number {
    return this.alignment.words.findIndex(w => w.id === wordId);
  }
}
