/**
 * Remotion composition for compiled video specs.
 * Renders all intents (statement, brand, list, feature, stat, product-shot) to 1080×1920 vertical video.
 */

import React from 'react';
import { Composition, Sequence, Audio } from 'remotion';
import type { CompiledPlan, BrandIdentity, TimelineFrame } from '@video-use/compile';
import { Statement, Brand, List, Feature, Stat, ProductShot } from './intents/index.js';

export interface VideoSpecCompositionProps {
  compiledPlan: CompiledPlan;
  brand: BrandIdentity;
  audioPath?: string;
}

/**
 * Render a single shot based on its intent.
 */
const Shot: React.FC<{
  frame: TimelineFrame;
  brand: BrandIdentity;
  fps: number;
}> = ({ frame, brand, fps }) => {
  const { shot } = frame;
  const durationInFrames = frame.endFrame - frame.startFrame;

  switch (shot.intent) {
    case 'statement':
      return (
        <Statement
          headline={shot.slots.headline as any}
          kicker={shot.slots.kicker as any}
          body={shot.slots.body as any}
          footnote={shot.slots.footnote as any}
          surface={shot.surface || 'base'}
          brand={brand}
          durationInFrames={durationInFrames}
          fps={fps}
        />
      );

    case 'brand':
      return (
        <Brand
          headline={shot.slots.headline as any}
          visual={shot.slots.visual as string}
          cta={shot.slots.cta as any}
          surface={shot.surface || 'base'}
          brand={brand}
          durationInFrames={durationInFrames}
          fps={fps}
          showMark={true} // TODO: control with reveal cues
        />
      );

    case 'list':
      return (
        <List
          headline={shot.slots.headline as any}
          items={shot.slots.items as any}
          surface={shot.surface || 'base'}
          brand={brand}
          durationInFrames={durationInFrames}
          fps={fps}
        />
      );

    case 'feature':
      return (
        <Feature
          headline={shot.slots.headline as any}
          kicker={shot.slots.kicker as any}
          body={shot.slots.body as any}
          icon={shot.slots.icon as string}
          surface={shot.surface || 'base'}
          brand={brand}
          durationInFrames={durationInFrames}
          fps={fps}
        />
      );

    case 'stat':
      return (
        <Stat
          value={shot.slots.value as any}
          headline={shot.slots.headline as any}
          body={shot.slots.body as any}
          surface={shot.surface || 'base'}
          brand={brand}
          durationInFrames={durationInFrames}
          fps={fps}
          showValue={true} // TODO: control with reveal cues
        />
      );

    case 'product-shot':
      return (
        <ProductShot
          headline={shot.slots.headline as any}
          callout={shot.slots.callout as any}
          primaryAsset={shot.primaryAsset || ''}
          assetKind={shot.evidenceMode === 'recorded-interaction' ? 'recording' : 'screenshot'}
          surface={shot.surface || 'base'}
          brand={brand}
          durationInFrames={durationInFrames}
          fps={fps}
          showCallout={false} // TODO: control with reveal cues
        />
      );

    default:
      // Fallback for unknown intents
      return (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#000',
            color: '#fff',
            fontSize: 48,
          }}
        >
          Unknown intent: {shot.intent}
        </div>
      );
  }
};

/**
 * Main Remotion composition.
 */
export const VideoSpecComposition: React.FC<VideoSpecCompositionProps> = ({
  compiledPlan,
  brand,
  audioPath,
}) => {
  if (!compiledPlan.valid || compiledPlan.timeline.length === 0) {
    return null;
  }

  const fps = 30;
  const lastFrame = compiledPlan.timeline[compiledPlan.timeline.length - 1];
  const durationInFrames = lastFrame.endFrame;

  return (
    <>
      {/* Audio track */}
      {audioPath && <Audio src={audioPath} />}

      {/* Render each shot as a sequence */}
      {compiledPlan.timeline.map((frame, index) => (
        <Sequence
          key={`shot-${frame.shot.id}-${index}`}
          from={frame.startFrame}
          durationInFrames={frame.endFrame - frame.startFrame}
        >
          <Shot frame={frame} brand={brand} fps={fps} />
        </Sequence>
      ))}
    </>
  );
};

/**
 * Register the composition with Remotion.
 * Call this in your Remotion root file.
 */
export function registerVideoSpecComposition(
  compiledPlan: CompiledPlan,
  brand: BrandIdentity,
  audioPath?: string
) {
  const fps = 30;
  const lastFrame = compiledPlan.timeline[compiledPlan.timeline.length - 1];
  const durationInFrames = lastFrame.endFrame;

  return (
    <Composition
      id="VideoSpec"
      component={VideoSpecComposition}
      durationInFrames={durationInFrames}
      fps={fps}
      width={1080}
      height={1920}
      defaultProps={{
        compiledPlan,
        brand,
        audioPath,
      }}
    />
  );
}

export default VideoSpecComposition;
