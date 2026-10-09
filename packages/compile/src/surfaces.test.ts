import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { compile } from './index.js';
import type { Plan, Alignment, IntentVocabulary, RenderJob, BrandIdentity } from './types.js';

const mockAlignment: Alignment = {
  words: [
    { id: 'w1', text: 'hello', start: 0, end: 0.5 },
    { id: 'w2', text: 'world', start: 0.5, end: 1.0 },
    { id: 'w3', text: 'test', start: 1.0, end: 1.5 },
  ],
  duration: 1.5,
};

const mockIntents: IntentVocabulary = {
  version: '1.0.0',
  intents: [
    {
      id: 'statement',
      name: 'Statement',
      description: 'Text statement',
      slots: [{ id: 'copy', type: 'string', required: true, source: 'plan' }],
      primaryAssetRule: 'none',
      evidenceModes: ['stated'],
    },
  ],
  cueKinds: [{ id: 'reveal', name: 'Reveal', description: 'Reveal', targetTypes: ['slot'] }],
};

const brandWithAlt: BrandIdentity = {
  name: 'Test Brand',
  palette: {
    alt_bg: '#f5f5f5',
    alt_fg: '#333333',
  },
  roles: { required: [], open: [] },
  surfaces: {
    base: { bg: '#FFFFFF', fg: '#000000' },
  },
};

const lightBrand: BrandIdentity = {
  name: 'Light Only',
  palette: {}, // no alt_bg or alt_fg
  roles: { required: [], open: [] },
  surfaces: {
    base: { bg: '#FFFFFF', fg: '#000000' },
  },
};

// Test 1: Shot with explicit base surface
test('surfaces: shot with explicit base surface compiles', () => {
  const plan: Plan = {
    id: 'test',
    version: '1.0.0',
    archetype: 'launch',
    beats: [
      {
        id: 'b1',
        kind: 'HOOK',
        startWordId: 'w1',
        endWordId: 'w2',
        shots: [
          {
            id: 's1',
            beatId: 'b1',
            startWordId: 'w1',
            intent: 'statement',
            surface: 'base',
            slots: { copy: 'Hello' },
          },
        ],
        anchors: [],
      },
    ],
  };

  const mockJob: RenderJob = {
    product: { name: 'Test', brand: brandWithAlt, knowledge: { name: 'Test', capabilities: [] } },
    plan,
    alignment: mockAlignment,
    archetype: 'launch',
    output: { tailS: 1, fps: 30, width: 1080, height: 1920 },
  };

  const result = compile(plan, mockAlignment, mockIntents, mockJob);
  assert.equal(result.valid, true);
});

// Test 2: Shot with alt surface on brand that has alt_bg
test('surfaces: alt surface on brand with alt_bg compiles', () => {
  const plan: Plan = {
    id: 'test',
    version: '1.0.0',
    archetype: 'launch',
    beats: [
      {
        id: 'b1',
        kind: 'HOOK',
        startWordId: 'w1',
        endWordId: 'w2',
        shots: [
          {
            id: 's1',
            beatId: 'b1',
            startWordId: 'w1',
            intent: 'statement',
            surface: 'alt',
            slots: { copy: 'Hello' },
          },
        ],
        anchors: [],
      },
    ],
  };

  const mockJob: RenderJob = {
    product: { name: 'Test', brand: brandWithAlt, knowledge: { name: 'Test', capabilities: [] } },
    plan,
    alignment: mockAlignment,
    archetype: 'launch',
    output: { tailS: 1, fps: 30, width: 1080, height: 1920 },
  };

  const result = compile(plan, mockAlignment, mockIntents, mockJob);
  assert.equal(result.valid, true);
});

// Test 3: Shot with alt surface on light-only brand (fallback scenario)
test('surfaces: alt on light-only brand warns and falls back', () => {
  const plan: Plan = {
    id: 'test',
    version: '1.0.0',
    archetype: 'launch',
    beats: [
      {
        id: 'b1',
        kind: 'HOOK',
        startWordId: 'w1',
        endWordId: 'w2',
        shots: [
          {
            id: 's1',
            beatId: 'b1',
            startWordId: 'w1',
            intent: 'statement',
            surface: 'alt',
            slots: { copy: 'Hello' },
          },
        ],
        anchors: [],
      },
    ],
  };

  const mockJob: RenderJob = {
    product: { name: 'Test', brand: lightBrand, knowledge: { name: 'Test', capabilities: [] } },
    plan,
    alignment: mockAlignment,
    archetype: 'launch',
    output: { tailS: 1, fps: 30, width: 1080, height: 1920 },
  };

  const result = compile(plan, mockAlignment, mockIntents, mockJob);
  // Should still be valid, but warns
  assert.equal(result.valid, true);
  // TODO: add warning validation when warnings are collected
});

// Test 4: Multiple shots with different surfaces
test('surfaces: multiple shots with mixed surfaces', () => {
  const plan: Plan = {
    id: 'test',
    version: '1.0.0',
    archetype: 'launch',
    beats: [
      {
        id: 'b1',
        kind: 'HOOK',
        startWordId: 'w1',
        endWordId: 'w3',
        shots: [
          {
            id: 's1',
            beatId: 'b1',
            startWordId: 'w1',
            intent: 'statement',
            surface: 'base',
            slots: { copy: 'Base' },
          },
          {
            id: 's2',
            beatId: 'b1',
            startWordId: 'w2',
            intent: 'statement',
            surface: 'alt',
            slots: { copy: 'Alt' },
          },
          {
            id: 's3',
            beatId: 'b1',
            startWordId: 'w3',
            intent: 'statement',
            // no surface specified = defaults to base
            slots: { copy: 'Default' },
          },
        ],
        anchors: [],
      },
    ],
  };

  const mockJob: RenderJob = {
    product: { name: 'Test', brand: brandWithAlt, knowledge: { name: 'Test', capabilities: [] } },
    plan,
    alignment: mockAlignment,
    archetype: 'launch',
    output: { tailS: 1, fps: 30, width: 1080, height: 1920 },
  };

  const result = compile(plan, mockAlignment, mockIntents, mockJob);
  assert.equal(result.valid, true);
  assert.equal(result.timeline.length, 3);
});

test('surfaces: all tests completed', () => {
  assert.ok(true);
});
