/**
 * Stat intent renderer.
 * Numeric claim or metric with headline and supporting text.
 *
 * Slots:
 * - value* (text)
 * - headline* (text)
 * - body (text)
 */

import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from 'remotion';
import type { BrandIdentity } from '@video-use/compile';

export interface StatProps {
  value: string | TextRun[];
  headline: string | TextRun[];
  body?: string | TextRun[];
  surface: 'base' | 'alt';
  brand: BrandIdentity;
  durationInFrames: number;
  fps: number;
  showValue?: boolean; // Controlled by reveal cues
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

export const Stat: React.FC<StatProps> = ({
  value,
  headline,
  body,
  surface,
  brand,
  durationInFrames,
  fps,
  showValue = true,
}) => {
  const frame = useCurrentFrame();
  const bg = surface === 'base' ? brand.surfaces.base.bg : (brand.palette.alt_bg || brand.surfaces.base.bg);
  const fg = surface === 'base' ? brand.surfaces.base.fg : (brand.palette.alt_fg || brand.surfaces.base.fg);
  const accentColor = brand.palette.accent || brand.palette.primary;

  const entranceDuration = fps * 0.4;
  const opacity = interpolate(frame, [0, entranceDuration * 0.3], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.ease),
  });

  const valueScale = interpolate(frame, [0, entranceDuration * 0.6], [0.8, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.back(1.5)),
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
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '120px 80px',
          textAlign: 'center',
        }}
      >
        {showValue && (
          <div
            style={{
              transform: `scale(${valueScale})`,
              fontSize: 180,
              fontWeight: 900,
              color: accentColor,
              marginBottom: 40,
              lineHeight: 1,
              letterSpacing: '-0.03em',
            }}
          >
            {renderText(value, accentColor)}
          </div>
        )}

        <h3 style={{ fontSize: 64, lineHeight: 1.2, marginBottom: body ? 36 : 0, fontWeight: 800, maxWidth: '850px' }}>
          {renderText(headline, accentColor)}
        </h3>

        {body && (
          <p style={{ fontSize: 40, lineHeight: 1.4, maxWidth: '750px', fontWeight: 700, opacity: 0.8 }}>
            {renderText(body, accentColor)}
          </p>
        )}
      </div>
    </AbsoluteFill>
  );
};
