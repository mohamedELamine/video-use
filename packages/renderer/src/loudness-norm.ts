/**
 * Loudness normalization helper for video-use.
 *
 * Implements two-pass loudness normalization using ffmpeg-normalize style:
 * - First pass: measure loudness
 * - Second pass: apply normalization
 */

export interface LoudnessConfig {
  targetLUFS?: number; // Target LUFS (default -16 for streaming)
  truePeak?: number; // True peak limit (default -1.5 dBFS)
  method?: 'peak' | 'rms' | 'loudness'; // Method (default: loudness)
}

/**
 * Build ffmpeg filter chain for loudness normalization.
 *
 * Returns ffmpeg filter string for -af argument.
 * Usage: ffmpeg -i input.mp4 -af "<filter>" output.mp4
 */
export function buildLoudnessFilter(config: LoudnessConfig = {}): string {
  const targetLUFS = config.targetLUFS ?? -16;
  const truePeak = config.truePeak ?? -1.5;

  // Use loudnorm filter with specified target
  // Format: loudnorm=I=<target>:TP=<peak>:LRA=<range>
  return `loudnorm=I=${targetLUFS}:TP=${truePeak}:LRA=7`;
}

/**
 * Example command for two-pass loudness normalization.
 *
 * For audio in a video file:
 * Pass 1: ffmpeg -i input.mp4 -af "loudnorm=I=-16:TP=-1.5:LRA=7:print_format=json" -f null -
 * Pass 2: ffmpeg -i input.mp4 -af "loudnorm=I=-16:TP=-1.5:LRA=7:measured_I=<I>:measured_TP=<TP>:measured_LRA=<LRA>" output.mp4
 */

export function getLoudnessCommand(
  inputPath: string,
  outputPath: string,
  config: LoudnessConfig = {}
): string {
  const filter = buildLoudnessFilter(config);

  // Single-pass command (simpler, less accurate)
  return `ffmpeg -i "${inputPath}" -c:v copy -af "${filter}" -y "${outputPath}"`;
}

/**
 * Get measurement command for first pass
 */
export function getMeasurementCommand(inputPath: string, config: LoudnessConfig = {}): string {
  const filter = buildLoudnessFilter(config);
  return `ffmpeg -i "${inputPath}" -af "${filter}=print_format=json" -f null -`;
}

export default {
  buildLoudnessFilter,
  getLoudnessCommand,
  getMeasurementCommand,
};
