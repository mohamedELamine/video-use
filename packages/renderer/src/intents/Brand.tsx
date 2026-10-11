/**
 * Brand intent renderer.
 * Product brand mark on a surface.
 *
 * Slots:
 * - mark (filled by brand identity, never in content)
 * - headline (text)
 * - visual (asset)
 * - cta (text)
 */

import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, Img, Easing } from 'remotion';
import type { BrandIdentity } from '@video-use/compile';

export interface BrandProps {
  headline?: string | TextRun[];
  visual?: string; // asset path
  cta?: string | TextRun[];
  surface: 'base' | 'alt';
  brand: BrandIdentity;
  durationInFrames: number;
  fps: number;
  showMark?: boolean; // Whether to show the mark (controlled by cues/choreography)
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
    <span
      key={i}
      style={{
        color: run.accent ? accentColor : 'inherit',
        fontWeight: run.accent ? 800 : 'inherit',
      }}
    >
      {run.text}
    </span>
  ));
}

export const Brand: React.FC<BrandProps> = ({
  headline,
  visual,
  cta,
  surface,
  brand,
  durationInFrames,
  fps,
  showMark = true,
}) => {
  const frame = useCurrentFrame();

  // Surface colors
  const bg = surface === 'base' ? brand.surfaces.base.bg : (brand.palette.alt_bg || brand.surfaces.base.bg);
  const fg = surface === 'base' ? brand.surfaces.base.fg : (brand.palette.alt_fg || brand.surfaces.base.fg);
  const accentColor = brand.palette.accent || brand.palette.primary;

  // Entrance animation
  const entranceDuration = fps * 0.6;
  const opacity = interpolate(frame, [0, entranceDuration * 0.4], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.ease),
  });

  const scale = interpolate(frame, [0, entranceDuration], [0.95, 1], {
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
        fontFamily: brand.fonts?.display?.family || brand.fonts?.body?.family || 'sans-serif',
      }}
    >
      <div
        style={{
          opacity,
          transform: `scale(${scale})`,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '120px 80px',
          textAlign: 'center',
        }}
      >
        {/* Visual */}
        {visual && (
          <div style={{ marginBottom: 60 }}>
            <Img
              src={visual}
              style={{
                maxWidth: '400px',
                maxHeight: '400px',
                objectFit: 'contain',
              }}
            />
          </div>
        )}

        {/* Brand Mark */}
        {showMark && (
          <div
            style={{
              fontSize: 96,
              fontWeight: 900,
              marginBottom: headline ? 48 : 0,
              letterSpacing: '-0.02em',
            }}
          >
            {brand.logo ? (
              <Img
                src={brand.logo}
                style={{
                  maxWidth: '600px',
                  maxHeight: '150px',
                  objectFit: 'contain',
                }}
              />
            ) : (
              brand.name
            )}
          </div>
        )}

        {/* Headline */}
        {headline && (
          <h2
            style={{
              fontSize: 64,
              lineHeight: 1.3,
              fontWeight: 800,
              maxWidth: '900px',
              marginBottom: cta ? 60 : 0,
            }}
          >
            {renderText(headline, accentColor)}
          </h2>
        )}

        {/* CTA */}
        {cta && (
          <div
            style={{
              fontSize: 40,
              fontWeight: 700,
              padding: '24px 48px',
              backgroundColor: accentColor,
              color: brand.palette.on_accent || '#ffffff',
              borderRadius: 16,
              marginTop: 40,
            }}
          >
            {renderText(cta, brand.palette.on_accent || '#ffffff')}
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};
