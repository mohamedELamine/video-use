/**
 * Statement intent renderer.
 * Narrated assertion shown as on-screen text.
 *
 * Slots:
 * - headline* (text)
 * - kicker (text)
 * - body (text)
 * - footnote (text)
 */

import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from 'remotion';
import type { BrandIdentity } from '@video-use/compile';

export interface StatementProps {
  headline: string | TextRun[];
  kicker?: string | TextRun[];
  body?: string | TextRun[];
  footnote?: string | TextRun[];
  surface: 'base' | 'alt';
  brand: BrandIdentity;
  durationInFrames: number;
  fps: number;
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

export const Statement: React.FC<StatementProps> = ({
  headline,
  kicker,
  body,
  footnote,
  surface,
  brand,
  durationInFrames,
  fps,
}) => {
  const frame = useCurrentFrame();

  // Surface colors
  const bg = surface === 'base' ? brand.surfaces.base.bg : (brand.palette.alt_bg || brand.surfaces.base.bg);
  const fg = surface === 'base' ? brand.surfaces.base.fg : (brand.palette.alt_fg || brand.surfaces.base.fg);
  const accentColor = brand.palette.accent || brand.palette.primary;

  // Entrance animation (snappy character)
  const entranceDuration = fps * 0.5; // 0.5s entrance
  const opacity = interpolate(frame, [0, entranceDuration * 0.3], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.ease),
  });

  const translateY = interpolate(frame, [0, entranceDuration], [20, 0], {
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
      <div
        style={{
          opacity,
          transform: `translateY(${translateY}px)`,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '120px 80px',
          textAlign: 'center',
        }}
      >
        {kicker && (
          <div
            style={{
              fontSize: 32,
              marginBottom: 24,
              opacity: 0.7,
              fontWeight: 700,
            }}
          >
            {renderText(kicker, accentColor)}
          </div>
        )}

        <h1
          style={{
            fontSize: 72,
            lineHeight: 1.2,
            marginBottom: body ? 48 : 0,
            fontWeight: 800,
            maxWidth: '900px',
          }}
        >
          {renderText(headline, accentColor)}
        </h1>

        {body && (
          <p
            style={{
              fontSize: 44,
              lineHeight: 1.4,
              maxWidth: '800px',
              fontWeight: 700,
            }}
          >
            {renderText(body, accentColor)}
          </p>
        )}

        {footnote && (
          <div
            style={{
              fontSize: 28,
              marginTop: 48,
              opacity: 0.6,
              fontWeight: 700,
            }}
          >
            {renderText(footnote, accentColor)}
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};
