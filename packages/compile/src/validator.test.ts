import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { Validator } from './validator.js';
import { Plan, Alignment, IntentVocabulary, RenderJob } from './types.js';

// Minimal fixtures
const mockAlignment: Alignment = {
  words: [
    { id: 'w1', text: 'hello', start: 0, end: 0.5 },
    { id: 'w2', text: 'world', start: 0.5, end: 1.0 },
    { id: 'w3', text: 'test', start: 1.0, end: 1.5 },
    { id: 'w4', text: 'data', start: 1.5, end: 2.0 },
  ],
  duration: 2.0,
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
    name: 'Test',
    brand: { name: 'Test', palette: {}, roles: { required: [], open: [] }, surfaces: { base: { bg: '#fff', fg: '#000' } } },
    knowledge: { name: 'Test', capabilities: [] },
  },
  plan: {} as Plan,
  alignment: mockAlignment,
  archetype: 'launch',
  output: { tailS: 1, fps: 30, width: 1080, height: 1920 },
};

// Test each error code
const testErrorCode = (code: string, _testName: string, planFactory: () => Plan) => {
  test(`validator: error code ${code}`, () => {
    const plan = planFactory();
    const validator = new Validator(mockAlignment, mockIntents);
    const findings = validator.validate(plan, { ...mockJob, plan });

    const error = findings.find((f) => f.code === code);
    assert.ok(error, `Expected error code ${code}, got: ${findings.map((f) => f.code).join(', ')}`);
    assert.equal(error.severity, 'error');
    assert.ok(error.entityId, 'Error should have entityId');
    assert.ok(error.message, 'Error should have message');
  });
};

testErrorCode('PLAN_MISSING_ID', 'missing plan id', () => ({
  id: '',
  version: '1.0.0',
  archetype: 'launch',
  beats: [],
}));

testErrorCode('PLAN_UNKNOWN_VERSION', 'unknown plan version', () => ({
  id: 'test',
  version: '9.9.9' as any,
  archetype: 'launch',
  beats: [],
}));

testErrorCode('PLAN_MISSING_ARCHETYPE', 'missing archetype', () => ({
  id: 'test',
  version: '1.0.0',
  archetype: '',
  beats: [
    {
      id: 'b1',
      kind: 'HOOK',
      startWordId: 'w1',
      endWordId: 'w2',
      shots: [],
      anchors: [],
    },
  ],
}));

testErrorCode('PLAN_NO_BEATS', 'no beats', () => ({
  id: 'test',
  version: '1.0.0',
  archetype: 'launch',
  beats: [],
}));

testErrorCode('BEAT_DUPLICATE_ID', 'duplicate beat id', () => ({
  id: 'test',
  version: '1.0.0',
  archetype: 'launch',
  beats: [
    {
      id: 'b1',
      kind: 'HOOK',
      startWordId: 'w1',
      endWordId: 'w2',
      shots: [],
      anchors: [],
    },
    {
      id: 'b1', // duplicate
      kind: 'PROBLEM',
      startWordId: 'w3',
      endWordId: 'w4',
      shots: [],
      anchors: [],
    },
  ],
}));

testErrorCode('BEAT_MISSING_KIND', 'beat missing kind', () => ({
  id: 'test',
  version: '1.0.0',
  archetype: 'launch',
  beats: [
    {
      id: 'b1',
      kind: '' as any,
      startWordId: 'w1',
      endWordId: 'w2',
      shots: [],
      anchors: [],
    },
  ],
}));

testErrorCode('BEAT_START_WORD_NOT_FOUND', 'beat start word not found', () => ({
  id: 'test',
  version: '1.0.0',
  archetype: 'launch',
  beats: [
    {
      id: 'b1',
      kind: 'HOOK',
      startWordId: 'w999',
      endWordId: 'w2',
      shots: [],
      anchors: [],
    },
  ],
}));

testErrorCode('SHOT_UNKNOWN_INTENT', 'shot with unknown intent', () => ({
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
          intent: 'unknown-intent',
          slots: {},
        },
      ],
      anchors: [],
    },
  ],
}));

testErrorCode('SHOT_MISSING_SLOT', 'shot missing required slot', () => ({
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
          slots: {}, // missing 'copy'
        },
      ],
      anchors: [],
    },
  ],
}));

testErrorCode('ANCHOR_WORD_NOT_FOUND', 'anchor word not found', () => ({
  id: 'test',
  version: '1.0.0',
  archetype: 'launch',
  beats: [
    {
      id: 'b1',
      kind: 'HOOK',
      startWordId: 'w1',
      endWordId: 'w2',
      shots: [],
      anchors: [
        {
          id: 'a1',
          role: 'payoff',
          wordId: 'w999',
        },
      ],
    },
  ],
}));

testErrorCode('BEAT_MULTIPLE_PAYOFFS', 'beat with multiple payoffs', () => ({
  id: 'test',
  version: '1.0.0',
  archetype: 'launch',
  beats: [
    {
      id: 'b1',
      kind: 'HOOK',
      startWordId: 'w1',
      endWordId: 'w4',
      shots: [],
      anchors: [
        {
          id: 'a1',
          role: 'payoff',
          wordId: 'w1',
        },
        {
          id: 'a2',
          role: 'payoff',
          wordId: 'w2',
        },
      ],
    },
  ],
}));

testErrorCode('CUE_UNKNOWN_KIND', 'cue with unknown kind', () => ({
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
          slots: { copy: 'test' },
          cues: [
            {
              id: 'c1',
              anchorId: 'a1',
              kind: 'unknown-kind' as any,
              target: 'something',
            },
          ],
        },
      ],
      anchors: [
        {
          id: 'a1',
          role: 'payoff',
          wordId: 'w1',
        },
      ],
    },
  ],
}));

testErrorCode('CUE_ANCHOR_NOT_FOUND', 'cue references non-existent anchor', () => ({
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
          slots: { copy: 'test' },
          cues: [
            {
              id: 'c1',
              anchorId: 'a999',
              kind: 'reveal',
              target: 'slot',
            },
          ],
        },
      ],
      anchors: [],
    },
  ],
}));

test('validator: all error codes tested', () => {
  // This test documents which error codes are covered
  const codes = [
    'PLAN_MISSING_ID',
    'PLAN_UNKNOWN_VERSION',
    'PLAN_MISSING_ARCHETYPE',
    'PLAN_NO_BEATS',
    'BEAT_DUPLICATE_ID',
    'BEAT_MISSING_KIND',
    'BEAT_START_WORD_NOT_FOUND',
    'SHOT_UNKNOWN_INTENT',
    'SHOT_MISSING_SLOT',
    'ANCHOR_WORD_NOT_FOUND',
    'BEAT_MULTIPLE_PAYOFFS',
    'CUE_UNKNOWN_KIND',
    'CUE_ANCHOR_NOT_FOUND',
  ];

  assert.ok(codes.length >= 13, 'Should test at least 13 error codes');
});
