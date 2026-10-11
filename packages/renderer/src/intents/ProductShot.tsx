/**
 * ProductShot intent renderer.
 * Recorded interaction or visual state of a capability.
 *
 * Slots:
 * - headline (text)
 * - callout (text)
 * 
 * Primary asset required (screenshot or recording).
 */

import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, Img, Video, Easing } from 'remotion';
import type { BrandIdentity } from '@video-use/compile';

export interface ProductShotProps {
  headline?: string | TextRun[];
  callout?: string | TextRun[];
  primaryAsset: string;
  assetKind: 'screenshot' | 'recording';
  surface: 'base' | 'alt';
  brand: BrandIdentity;
  durationInFrames: number;
  fps: number;
  showCallout?: boolean; // Controlled by reveal cues
}

interface TextRun {
  text: string;
  accent?: boolean;
}

function renderText(content: string | TextRun[], accentColor: string): React.ReactNode {
  if (typeof content === 'string') {
    return content;
  }

  return content.map((run, i) => (
    <span key={i} style={{ color: run.accent ? accentColor : 'inherit', fontWeight: run.accent ? 800 : 'inherit' }}>
      {run.text}
    </span>
  ));
}

export const ProductShot: React.FC<ProductShotProps> = ({
  headline,
  callout,
  primaryAsset,
  assetKind,
  surface,
  brand,
  durationInFrames,
  fps,
  showCallout = false,
}) => {
  const frame = useCurrentFrame();
  const bg = surface === 'base' ? brand.surfaces.base.bg : (brand.palette.alt_bg || brand.surfaces.base.bg);
  const fg = surface === 'base' ? brand.surfaces.base.fg : (brand.palette.alt_fg || brand.surfaces.base.fg);
  const accentColor = brand.palette.accent || brand.palette.primary;

  const entranceDuration = fps * 0.5;
  const assetOpacity = interpolate(frame, [0, entranceDuration * 0.4], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.ease),
  });

  const assetScale = interpolate(frame, [0, entranceDuration], [1.05, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: bg,
        color: fg,
        direction: brand.dir || 'ltr',
        fontFamily: brand.fonts?.body?.family || 'sans-serif',
      }}
    >
      {/* Primary Asset */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: `translate(-50%, -50%) scale(${assetScale})`,
          opacity: assetOpacity,
          maxWidth: '90%',
          maxHeight: '70%',
        }}
      >
        {assetKind === 'recording' ? (
          <Video
            src={primaryAsset}
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              borderRadius: 24,
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            }}
          />
        ) : (
          <Img
            src={primaryAsset}
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              borderRadius: 24,
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            }}
          />
        )}
      </div>

      {/* Headline */}
      {headline && (
        <div
          style={{
            position: 'absolute',
            top: 100,
            left: 0,
            right: 0,
            textAlign: 'center',
            padding: '0 80px',
          }}
        >
          <h3
            style={{
              fontSize: 52,
              fontWeight: 800,
              textShadow: '0 2px 12px rgba(0,0,0,0.5)',
              maxWidth: '900px',
              margin: '0 auto',
            }}
          >
            {renderText(headline, accentColor)}
          </h3>
        </div>
      )}

      {/* Callout (revealed by cue) */}
      {callout && showCallout && (
        <div
          style={{
            position: 'absolute',
            bottom: 150,
            left: 0,
            right: 0,
            textAlign: 'center',
            padding: '0 80px',
          }}
        >
          <div
            style={{
              display: 'inline-block',
              fontSize: 44,
              fontWeight: 800,
              padding: '24px 48px',
              backgroundColor: accentColor,
              color: brand.palette.on_accent || '#ffffff',
              borderRadius: 16,
              boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
            }}
          >
            {renderText(callout, brand.palette.on_accent || '#ffffff')}
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};
