import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { Renderer } from './index.js';
import type { BrandIdentity, CompiledPlan } from '@video-use/compile';

const mockBrand: BrandIdentity = {
  name: 'Test Brand',
  palette: { primary: '#0066FF', accent: '#FF6600' },
  roles: { required: [], open: [] },
  surfaces: {
    base: { bg: '#FFFFFF', fg: '#000000' },
  },
};

const mockCompiledPlan: CompiledPlan = {
  valid: true,
  errors: [],
  warnings: [],
  grounding: [],
  timeline: [
    {
      shot: { id: 'shot-1', beatId: 'beat-1', intent: 'statement' },
      startFrame: 0,
      startSecond: 0,
      endFrame: 30,
      endSecond: 1.0,
      anchors: [],
      cues: [],
    },
    {
      shot: { id: 'shot-2', beatId: 'beat-1', intent: 'statement' },
      startFrame: 30,
      startSecond: 1.0,
      endFrame: 60,
      endSecond: 2.0,
      anchors: [],
      cues: [],
    },
  ],
  storyboard: '# Storyboard',
};

test('Renderer: constructor accepts valid brand', () => {
  const renderer = new Renderer(mockBrand, {
    fps: 30,
    width: 1080,
    height: 1920,
    duration: 10,
    tailS: 1,
  });

  assert.ok(renderer);
});

test('Renderer: constructor rejects brand without name', () => {
  const invalidBrand = { ...mockBrand, name: '' };

  assert.throws(
    () =>
      new Renderer(invalidBrand, {
        fps: 30,
        width: 1080,
        height: 1920,
        duration: 10,
        tailS: 1,
      }),
    (err: any) => err.message.includes('must have a name')
  );
});

test('Renderer: constructor rejects brand without base surface', () => {
  const invalidBrand = { ...mockBrand, surfaces: {} };

  assert.throws(
    () =>
      new Renderer(invalidBrand as any, {
        fps: 30,
        width: 1080,
        height: 1920,
        duration: 10,
        tailS: 1,
      }),
    (err: any) => err.message.includes('must define base surface')
  );
});

test('Renderer: registerComposition accepts valid plan', () => {
  const renderer = new Renderer(mockBrand, {
    fps: 30,
    width: 1080,
    height: 1920,
    duration: 10,
    tailS: 1,
  });

  const result = renderer.registerComposition(mockCompiledPlan);

  assert.ok(result.composition);
  assert.equal(result.duration, 2.0);
  assert.equal(result.fps, 30);
  assert.equal(result.width, 1080);
  assert.equal(result.height, 1920);
  assert.equal(result.frames.length, 2);
});

test('Renderer: registerComposition refuses invalid plan', () => {
  const renderer = new Renderer(mockBrand, {
    fps: 30,
    width: 1080,
    height: 1920,
    duration: 10,
    tailS: 1,
  });

  const invalidPlan: CompiledPlan = {
    valid: false,
    errors: [
      {
        code: 'PLAN_MISSING_ID',
        severity: 'error',
        entityId: 'unknown',
        message: 'Plan missing id',
      },
    ],
    warnings: [],
    grounding: [],
    timeline: [],
    storyboard: '',
  };

  assert.throws(
    () => renderer.registerComposition(invalidPlan),
    (err: any) => err.message.includes('Cannot render an invalid compiled plan')
  );
});

test('Renderer: registerComposition refuses empty timeline', () => {
  const renderer = new Renderer(mockBrand, {
    fps: 30,
    width: 1080,
    height: 1920,
    duration: 10,
    tailS: 1,
  });

  const planWithoutTimeline: CompiledPlan = {
    valid: true,
    errors: [],
    warnings: [],
    grounding: [],
    timeline: [],
    storyboard: '',
  };

  assert.throws(
    () => renderer.registerComposition(planWithoutTimeline),
    (err: any) => err.message.includes('has no timeline')
  );
});

test('Renderer: getSurface returns base by default', () => {
  const renderer = new Renderer(mockBrand, {
    fps: 30,
    width: 1080,
    height: 1920,
    duration: 10,
    tailS: 1,
  });

  const surface = renderer.getSurface();
  assert.equal(surface.bg, '#FFFFFF');
  assert.equal(surface.fg, '#000000');
});

test('Renderer: getAccent returns brand accent', () => {
  const renderer = new Renderer(mockBrand, {
    fps: 30,
    width: 1080,
    height: 1920,
    duration: 10,
    tailS: 1,
  });

  const accent = renderer.getAccent();
  assert.equal(accent, '#FF6600');
});

test('Renderer: getAccent falls back to default', () => {
  const brandWithoutAccent: BrandIdentity = {
    name: 'Test',
    palette: {},
    roles: { required: [], open: [] },
    surfaces: { base: { bg: '#fff', fg: '#000' } },
  };

  const renderer = new Renderer(brandWithoutAccent, {
    fps: 30,
    width: 1080,
    height: 1920,
    duration: 10,
    tailS: 1,
  });

  const accent = renderer.getAccent();
  assert.equal(accent, '#0066FF');
});
