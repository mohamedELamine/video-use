/**
 * List intent renderer.
 * Enumeration of features or items, staggered or in columns.
 *
 * Slots:
 * - headline* (text)
 * - items* (listItem[])
 */

import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from 'remotion';
import type { BrandIdentity } from '@video-use/compile';

export interface ListItem {
  label: string;
  accent?: boolean;
}

export interface ListProps {
  headline: string | TextRun[];
  items: ListItem[];
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

export const List: React.FC<ListProps> = ({
  headline,
  items,
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

  // Headline entrance
  const headlineDelay = fps * 0.2;
  const headlineOpacity = interpolate(frame, [0, headlineDelay + fps * 0.3], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.ease),
  });

  // Stagger item entrances
  const getItemOpacity = (index: number) => {
    const itemDelay = fps * (0.4 + index * 0.15); // Stagger by 0.15s
    return interpolate(frame, [itemDelay, itemDelay + fps * 0.25], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.out(Easing.ease),
    });
  };

  const getItemTranslate = (index: number) => {
    const itemDelay = fps * (0.4 + index * 0.15);
    return interpolate(frame, [itemDelay, itemDelay + fps * 0.4], [30, 0], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.out(Easing.cubic),
    });
  };

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
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '120px 80px',
        }}
      >
        {/* Headline */}
        <h2
          style={{
            opacity: headlineOpacity,
            fontSize: 64,
            lineHeight: 1.3,
            fontWeight: 800,
            marginBottom: 60,
            textAlign: 'center',
            maxWidth: '900px',
          }}
        >
          {renderText(headline, accentColor)}
        </h2>

        {/* Items */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 32,
            maxWidth: '800px',
            width: '100%',
          }}
        >
          {items.map((item, index) => (
            <div
              key={index}
              style={{
                opacity: getItemOpacity(index),
                transform: `translateY(${getItemTranslate(index)}px)`,
                fontSize: 48,
                fontWeight: item.accent ? 800 : 700,
                color: item.accent ? accentColor : fg,
                display: 'flex',
                alignItems: 'center',
                gap: 24,
              }}
            >
              {/* Bullet or number */}
              <div
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  backgroundColor: item.accent ? accentColor : fg,
                  flexShrink: 0,
                }}
              />
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};
