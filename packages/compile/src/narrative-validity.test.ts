import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { ArchetypeResolver, launchArchetype } from './archetype-resolver.js';
import { GroundingValidator } from './grounding-validator.js';
import type { Plan, ProductKnowledge, Alignment } from './types.js';

const mockProduct: ProductKnowledge = {
  name: 'Test Product',
  capabilities: [
    { id: 'automation', name: 'Automation', description: 'Automate tasks', evidenceModes: ['recorded', 'stated'] },
    { id: 'integration', name: 'Integration', description: 'Integrate tools', evidenceModes: ['visual-state', 'stated'] },
  ],
};

const mockAlignment: Alignment = {
  words: [
    { id: 'w1', text: 'hello', start: 0, end: 0.5 },
    { id: 'w2', text: 'world', start: 0.5, end: 1.0 },
    { id: 'w3', text: 'automate', start: 1.0, end: 1.5 },
    { id: 'w4', text: 'tasks', start: 1.5, end: 2.0 },
    { id: 'w5', text: 'integrate', start: 2.0, end: 2.5 },
    { id: 'w6', text: 'tools', start: 2.5, end: 3.0 },
  ],
  duration: 3.0,
};

// Test 1: Missing obligation
test('narrative: error on missing obligation', () => {
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
        shots: [],
        anchors: [],
        claimedObligations: ['capture-attention'], // missing others
      },
      {
        id: 'b2',
        kind: 'CTA',
        startWordId: 'w5',
        endWordId: 'w6',
        shots: [],
        anchors: [],
        claimedObligations: ['drive-action'],
      },
    ],
  };

  const resolver = new ArchetypeResolver(launchArchetype);
  const findings = resolver.validate(plan, 'launch');

  assert.ok(findings.some(f => f.code === 'MISSING_OBLIGATION'));
});

// Test 2: capture-attention not by first beat
test('narrative: error if capture-attention not first beat', () => {
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
        shots: [],
        anchors: [],
        claimedObligations: ['establish-product'],
      },
      {
        id: 'b2',
        kind: 'CAPABILITY',
        startWordId: 'w3',
        endWordId: 'w4',
        shots: [],
        anchors: [],
        claimedObligations: ['capture-attention', 'communicate-value', 'resolve-promise', 'drive-action'],
      },
    ],
  };

  const resolver = new ArchetypeResolver(launchArchetype);
  const findings = resolver.validate(plan, 'launch');

  assert.ok(findings.some(f => f.code === 'CAPTURE_ATTENTION_NOT_FIRST'));
});

// Test 3: drive-action not by last beat
test('narrative: error if drive-action not last beat', () => {
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
        shots: [],
        anchors: [],
        claimedObligations: ['capture-attention', 'drive-action'],
      },
      {
        id: 'b2',
        kind: 'CTA',
        startWordId: 'w5',
        endWordId: 'w6',
        shots: [],
        anchors: [],
        claimedObligations: ['establish-product', 'communicate-value', 'resolve-promise'],
      },
    ],
  };

  const resolver = new ArchetypeResolver(launchArchetype);
  const findings = resolver.validate(plan, 'launch');

  assert.ok(findings.some(f => f.code === 'DRIVE_ACTION_NOT_LAST'));
});

// Test 4: Invalid beat kind
test('narrative: error on invalid beat kind', () => {
  const plan: Plan = {
    id: 'test',
    version: '1.0.0',
    archetype: 'launch',
    beats: [
      {
        id: 'b1',
        kind: 'INVALID_KIND',
        startWordId: 'w1',
        endWordId: 'w2',
        shots: [],
        anchors: [],
        claimedObligations: ['capture-attention'],
      },
      {
        id: 'b2',
        kind: 'CTA',
        startWordId: 'w5',
        endWordId: 'w6',
        shots: [],
        anchors: [],
        claimedObligations: ['drive-action'],
      },
    ],
  };

  const resolver = new ArchetypeResolver(launchArchetype);
  const findings = resolver.validate(plan, 'launch');

  assert.ok(findings.some(f => f.code === 'INVALID_BEAT_KIND'));
});

// Test 5: Valid launch with REVEAL
test('narrative: valid launch opening on REVEAL beat', () => {
  const plan: Plan = {
    id: 'test',
    version: '1.0.0',
    archetype: 'launch',
    beats: [
      {
        id: 'b1',
        kind: 'REVEAL',
        startWordId: 'w1',
        endWordId: 'w2',
        shots: [],
        anchors: [],
        claimedObligations: ['capture-attention', 'establish-product'],
      },
      {
        id: 'b2',
        kind: 'CAPABILITY',
        startWordId: 'w3',
        endWordId: 'w4',
        shots: [],
        anchors: [],
        claimedObligations: ['communicate-value', 'resolve-promise'],
      },
      {
        id: 'b3',
        kind: 'CTA',
        startWordId: 'w5',
        endWordId: 'w6',
        shots: [],
        anchors: [],
        claimedObligations: ['drive-action'],
      },
    ],
  };

  const resolver = new ArchetypeResolver(launchArchetype);
  const findings = resolver.validate(plan, 'launch');

  assert.equal(findings.length, 0);
});

// Test 6: Unresolved capability (warning)
test('grounding: warning on unknown capability', () => {
  const plan: Plan = {
    id: 'test',
    version: '1.0.0',
    archetype: 'launch',
    beats: [
      {
        id: 'b1',
        kind: 'CAPABILITY',
        startWordId: 'w1',
        endWordId: 'w2',
        shots: [],
        anchors: [],
        promotions: [
          { capabilityId: 'unknown-capability', groundingPhrase: 'hello' },
        ],
      },
    ],
  };

  const validator = new GroundingValidator(mockProduct, mockAlignment);
  const findings = validator.validate(plan);

  assert.ok(findings.some(f => f.code === 'UNRESOLVED_CAPABILITY' && f.severity === 'warning'));
});

// Test 7: Capability not promoted in beat
test('grounding: error if capability not promoted in beat', () => {
  const plan: Plan = {
    id: 'test',
    version: '1.0.0',
    archetype: 'launch',
    beats: [
      {
        id: 'b1',
        kind: 'CAPABILITY',
        startWordId: 'w1',
        endWordId: 'w2',
        shots: [
          {
            id: 's1',
            beatId: 'b1',
            startWordId: 'w1',
            intent: 'product-shot',
            slots: {},
            capabilityId: 'automation', // not promoted in beat
          },
        ],
        anchors: [],
        promotions: [],
      },
    ],
  };

  const validator = new GroundingValidator(mockProduct, mockAlignment);
  const findings = validator.validate(plan);

  assert.ok(findings.some(f => f.code === 'CAPABILITY_NOT_PROMOTED'));
});

// Test 8: Grounding phrase outside beat
test('grounding: error on grounding phrase outside beat', () => {
  const plan: Plan = {
    id: 'test',
    version: '1.0.0',
    archetype: 'launch',
    beats: [
      {
        id: 'b1',
        kind: 'CAPABILITY',
        startWordId: 'w1',
        endWordId: 'w2',
        shots: [],
        anchors: [],
        promotions: [
          { capabilityId: 'automation', groundingPhrase: 'automate tasks' }, // outside w1-w2 range
        ],
      },
    ],
  };

  const validator = new GroundingValidator(mockProduct, mockAlignment);
  const findings = validator.validate(plan);

  assert.ok(findings.some(f => f.code === 'GROUNDING_PHRASE_OUTSIDE_BEAT'));
});

test('narrative: all tests completed', () => {
  assert.ok(true);
});
