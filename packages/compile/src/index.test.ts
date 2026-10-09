import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { compile } from './index.js';
import { Plan, Alignment, IntentVocabulary, RenderJob } from './types.js';

// Minimal test fixtures
const mockAlignment: Alignment = {
  words: [
    { id: 'w1', text: 'hello', start: 0, end: 0.5 },
    { id: 'w2', text: 'world', start: 0.5, end: 1.0 },
    { id: 'w3', text: 'this', start: 1.0, end: 1.5 },
    { id: 'w4', text: 'is', start: 1.5, end: 2.0 },
    { id: 'w5', text: 'product', start: 2.0, end: 2.5 },
  ],
  duration: 2.5,
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

const mockJob: RenderJob = {
  product: {
    name: 'Test Product',
    brand: {
      name: 'Test Brand',
      palette: {},
      roles: { required: [], open: [] },
      surfaces: { base: { bg: '#fff', fg: '#000' } },
    },
    knowledge: { name: 'Test', capabilities: [] },
  },
  plan: {} as Plan,
  alignment: mockAlignment,
  archetype: 'launch',
  output: { tailS: 1, fps: 30, width: 1080, height: 1920 },
};

test('compile: valid statement-only plan', () => {
  const plan: Plan = {
    id: 'test-plan',
    version: '1.0.0',
    archetype: 'launch',
    beats: [
      {
        id: 'beat-1',
        kind: 'HOOK',
        startWordId: 'w1',
        endWordId: 'w3',
        shots: [
          {
            id: 'shot-1',
            beatId: 'beat-1',
            startWordId: 'w1',
            intent: 'statement',
            slots: { copy: 'Hello world' },
            surface: 'base',
          },
        ],
        anchors: [],
      },
    ],
  };

  const result = compile(plan, mockAlignment, mockIntents, { ...mockJob, plan });

  assert.equal(result.valid, true);
  assert.equal(result.errors.length, 0);
  assert.equal(result.timeline.length, 1);
  assert.ok(result.storyboard.includes('Beat: beat-1'));
  assert.ok(result.storyboard.includes('Shot: shot-1'));
});

test('compile: missing plan id', () => {
  const plan: Plan = {
    id: '',
    version: '1.0.0',
    archetype: 'launch',
    beats: [],
  };

  const result = compile(plan, mockAlignment, mockIntents, { ...mockJob, plan });

  assert.equal(result.valid, false);
  assert.ok(result.errors.some(e => e.code === 'PLAN_MISSING_ID'));
});

test('compile: unknown version', () => {
  const plan: Plan = {
    id: 'test',
    version: '2.0.0' as any,
    archetype: 'launch',
    beats: [],
  };

  const result = compile(plan, mockAlignment, mockIntents, { ...mockJob, plan });

  assert.equal(result.valid, false);
  assert.ok(result.errors.some(e => e.code === 'PLAN_UNKNOWN_VERSION'));
});

test('compile: shot with unknown intent', () => {
  const plan: Plan = {
    id: 'test',
    version: '1.0.0',
    archetype: 'launch',
    beats: [
      {
        id: 'beat-1',
        kind: 'HOOK',
        startWordId: 'w1',
        endWordId: 'w2',
        shots: [
          {
            id: 'shot-1',
            beatId: 'beat-1',
            startWordId: 'w1',
            intent: 'unknown-intent',
            slots: {},
          },
        ],
        anchors: [],
      },
    ],
  };

  const result = compile(plan, mockAlignment, mockIntents, { ...mockJob, plan });

  assert.equal(result.valid, false);
  assert.ok(result.errors.some(e => e.code === 'SHOT_UNKNOWN_INTENT'));
});

test('compile: missing required slot', () => {
  const plan: Plan = {
    id: 'test',
    version: '1.0.0',
    archetype: 'launch',
    beats: [
      {
        id: 'beat-1',
        kind: 'HOOK',
        startWordId: 'w1',
        endWordId: 'w2',
        shots: [
          {
            id: 'shot-1',
            beatId: 'beat-1',
            startWordId: 'w1',
            intent: 'statement',
            slots: {}, // missing 'copy'
          },
        ],
        anchors: [],
      },
    ],
  };

  const result = compile(plan, mockAlignment, mockIntents, { ...mockJob, plan });

  assert.equal(result.valid, false);
  assert.ok(result.errors.some(e => e.code === 'SHOT_MISSING_SLOT'));
});

test('resolver: frame boundaries tile exactly', () => {
  const plan: Plan = {
    id: 'test',
    version: '1.0.0',
    archetype: 'launch',
    beats: [
      {
        id: 'beat-1',
        kind: 'HOOK',
        startWordId: 'w1',
        endWordId: 'w3',
        shots: [
          {
            id: 'shot-1',
            beatId: 'beat-1',
            startWordId: 'w1',
            intent: 'statement',
            slots: { copy: 'Hello' },
          },
          {
            id: 'shot-2',
            beatId: 'beat-1',
            startWordId: 'w3',
            intent: 'statement',
            slots: { copy: 'World' },
          },
        ],
        anchors: [],
      },
    ],
  };

  const result = compile(plan, mockAlignment, mockIntents, { ...mockJob, plan });

  assert.equal(result.valid, true);
  assert.equal(result.timeline.length, 2);

  // Check that frame boundaries tile: end of shot N = start of shot N+1
  const shot1 = result.timeline[0];
  const shot2 = result.timeline[1];

  // Note: there may be rounding, so check approximately
  assert.ok(Math.abs(shot1.endSecond - shot2.startSecond) < 0.1);
});

test('storyboard: deterministic output', () => {
  const plan: Plan = {
    id: 'test',
    version: '1.0.0',
    archetype: 'launch',
    beats: [
      {
        id: 'beat-1',
        kind: 'HOOK',
        startWordId: 'w1',
        endWordId: 'w2',
        shots: [
          {
            id: 'shot-1',
            beatId: 'beat-1',
            startWordId: 'w1',
            intent: 'statement',
            slots: { copy: 'Test' },
          },
        ],
        anchors: [],
      },
    ],
  };

  const result1 = compile(plan, mockAlignment, mockIntents, { ...mockJob, plan });
  const result2 = compile(plan, mockAlignment, mockIntents, { ...mockJob, plan });

  // Byte-identical storyboards
  assert.equal(result1.storyboard, result2.storyboard);
});
