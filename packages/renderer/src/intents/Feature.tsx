/**
 * Feature intent renderer.
 * Highlighted product feature with icon and description.
 *
 * Slots:
 * - headline* (text)
 * - kicker (text)
 * - body (text)
 * - icon (asset)
 */

import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, Img, Easing } from 'remotion';
import type { BrandIdentity } from '@video-use/compile';

export interface FeatureProps {
  headline: string | TextRun[];
  kicker?: string | TextRun[];
  body?: string | TextRun[];
  icon?: string;
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
    <span key={i} style={{ color: run.accent ? accentColor : 'inherit', fontWeight: run.accent ? 800 : 'inherit' }}>
      {run.text}
    </span>
  ));
}

export const Feature: React.FC<FeatureProps> = ({
  headline,
  kicker,
  body,
  icon,
  surface,
  brand,
  durationInFrames,
  fps,
}) => {
  const frame = useCurrentFrame();
  const bg = surface === 'base' ? brand.surfaces.base.bg : (brand.palette.alt_bg || brand.surfaces.base.bg);
  const fg = surface === 'base' ? brand.surfaces.base.fg : (brand.palette.alt_fg || brand.surfaces.base.fg);
  const accentColor = brand.palette.accent || brand.palette.primary;

  const entranceDuration = fps * 0.5;
  const opacity = interpolate(frame, [0, entranceDuration * 0.3], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.ease),
  });

  const translateY = interpolate(frame, [0, entranceDuration], [25, 0], {
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
        {icon && (
          <Img src={icon} style={{ width: 120, height: 120, marginBottom: 40, filter: `brightness(${surface === 'base' ? '1' : '0.2'})` }} />
        )}

        {kicker && (
          <div style={{ fontSize: 28, marginBottom: 16, opacity: 0.7, fontWeight: 700 }}>
            {renderText(kicker, accentColor)}
          </div>
        )}

        <h3 style={{ fontSize: 56, lineHeight: 1.2, marginBottom: body ? 32 : 0, fontWeight: 800, maxWidth: '800px' }}>
          {renderText(headline, accentColor)}
        </h3>

        {body && (
          <p style={{ fontSize: 36, lineHeight: 1.4, maxWidth: '700px', fontWeight: 700, opacity: 0.85 }}>
            {renderText(body, accentColor)}
          </p>
        )}
      </div>
    </AbsoluteFill>
  );
};
