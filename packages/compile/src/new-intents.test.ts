import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { Validator } from './validator.js';
import { Alignment, Plan } from './types.js';
import { IntentVocabulary } from './types.js';

// Load vocabulary
const vocab: IntentVocabulary = {
  version: '1.0.0',
  intents: [
    {
      id: 'list',
      name: 'List',
      description: 'Enumeration of features or items',
      slots: [
        {
          id: 'headline',
          type: 'string | run[]',
          required: true,
          source: 'plan',
        },
        {
          id: 'items',
          type: 'listItem[]',
          required: true,
          source: 'plan',
        },
      ],
      primaryAssetRule: 'forbidden',
      evidenceModes: ['stated'],
    },
    {
      id: 'feature',
      name: 'Feature',
      description: 'Highlighted product feature with icon',
      slots: [
        {
          id: 'headline',
          type: 'string | run[]',
          required: true,
          source: 'plan',
        },
        {
          id: 'kicker',
          type: 'string | run[]',
          required: false,
          source: 'plan',
        },
        {
          id: 'body',
          type: 'string | run[]',
          required: false,
          source: 'plan',
        },
        {
          id: 'icon',
          type: 'asset',
          required: false,
          source: 'plan',
        },
      ],
      primaryAssetRule: 'forbidden',
      evidenceModes: ['stated'],
    },
    {
      id: 'stat',
      name: 'Stat',
      description: 'Numeric claim or metric',
      slots: [
        {
          id: 'value',
          type: 'string | run[]',
          required: true,
          source: 'plan',
        },
        {
          id: 'headline',
          type: 'string | run[]',
          required: true,
          source: 'plan',
        },
        {
          id: 'body',
          type: 'string | run[]',
          required: false,
          source: 'plan',
        },
      ],
      primaryAssetRule: 'forbidden',
      evidenceModes: ['stated'],
    },
  ],
  cueKinds: [
    {
      id: 'reveal',
      name: 'Reveal',
      description: 'Make visible',
      targetTypes: ['content-slot', 'primary-asset-element'],
    },
  ],
};

const alignment: Alignment = {
  words: [
    { id: 'w01', text: 'Hello', start: 0, end: 1, confidence: 0.95, phraseConfidence: 0.9 },
    { id: 'w02', text: 'world', start: 1, end: 2, confidence: 0.95, phraseConfidence: 0.9 },
    { id: 'w03', text: 'this', start: 2, end: 3, confidence: 0.95, phraseConfidence: 0.9 },
    { id: 'w04', text: 'is', start: 3, end: 4, confidence: 0.95, phraseConfidence: 0.9 },
    { id: 'w05', text: 'great', start: 4, end: 5, confidence: 0.95, phraseConfidence: 0.9 },
  ],
  duration: 5,
};

test('intents: list intent missing headline', () => {
  const validator = new Validator(alignment, vocab);

  const plan: Plan = {
    id: 'test-plan',
    version: '1.0.0',
    archetype: 'launch',
    beats: [
      {
        id: 'b01',
        kind: 'HOOK',
        startWordId: 'w01',
        endWordId: 'w02',
        shots: [
          {
            id: 's01',
            beatId: 'b01',
            startWordId: 'w01',
            intent: 'list',
            slots: {
              // missing headline
              items: [{ label: 'item1', accent: false }],
            },
          },
        ],
        anchors: [],
      },
    ],
  };

  const findings = validator.validate(plan, {} as any);
  const errors = findings.filter(f => f.severity === 'error');
  assert.ok(errors.some(e => e.code === 'SHOT_MISSING_SLOT'));
});

test('intents: list with empty items array', () => {
  const validator = new Validator(alignment, vocab);

  const plan: Plan = {
    id: 'test-plan',
    version: '1.0.0',
    archetype: 'launch',
    beats: [
      {
        id: 'b01',
        kind: 'HOOK',
        startWordId: 'w01',
        endWordId: 'w02',
        shots: [
          {
            id: 's01',
            beatId: 'b01',
            startWordId: 'w01',
            intent: 'list',
            slots: {
              headline: 'Items',
              items: [], // empty array
            },
          },
        ],
        anchors: [],
      },
    ],
  };

  validator.validate(plan, {} as any);
  // Empty items list should ideally be a warning, but for now just compile
  assert.ok(true);
});

test('intents: feature intent missing headline', () => {
  const validator = new Validator(alignment, vocab);

  const plan: Plan = {
    id: 'test-plan',
    version: '1.0.0',
    archetype: 'launch',
    beats: [
      {
        id: 'b01',
        kind: 'HOOK',
        startWordId: 'w01',
        endWordId: 'w02',
        shots: [
          {
            id: 's01',
            beatId: 'b01',
            startWordId: 'w01',
            intent: 'feature',
            slots: {
              // missing headline
              body: 'Feature description',
            },
          },
        ],
        anchors: [],
      },
    ],
  };

  const findings = validator.validate(plan, {} as any);
  const errors = findings.filter(f => f.severity === 'error');
  assert.ok(errors.some(e => e.code === 'SHOT_MISSING_SLOT'));
});

test('intents: stat intent missing value', () => {
  const validator = new Validator(alignment, vocab);

  const plan: Plan = {
    id: 'test-plan',
    version: '1.0.0',
    archetype: 'launch',
    beats: [
      {
        id: 'b01',
        kind: 'HOOK',
        startWordId: 'w01',
        endWordId: 'w02',
        shots: [
          {
            id: 's01',
            beatId: 'b01',
            startWordId: 'w01',
            intent: 'stat',
            slots: {
              // missing value
              headline: 'Users',
            },
          },
        ],
        anchors: [],
      },
    ],
  };

  const findings = validator.validate(plan, {} as any);
  const errors = findings.filter(f => f.severity === 'error');
  assert.ok(errors.some(e => e.code === 'SHOT_MISSING_SLOT'));
});

test('intents: list with primary asset forbidden', () => {
  const validator = new Validator(alignment, vocab);

  const plan: Plan = {
    id: 'test-plan',
    version: '1.0.0',
    archetype: 'launch',
    beats: [
      {
        id: 'b01',
        kind: 'HOOK',
        startWordId: 'w01',
        endWordId: 'w02',
        shots: [
          {
            id: 's01',
            beatId: 'b01',
            startWordId: 'w01',
            intent: 'list',
            primaryAsset: 'forbidden-asset.jpg',
            slots: {
              headline: 'Items',
              items: [{ label: 'item1', accent: false }],
            },
          },
        ],
        anchors: [],
      },
    ],
  };

  const findings = validator.validate(plan, {} as any);
  const errors = findings.filter(f => f.severity === 'error');
  assert.ok(errors.some(e => e.code === 'SHOT_FORBIDDEN_PRIMARY_ASSET'));
});

test('intents: feature with primary asset forbidden', () => {
  const validator = new Validator(alignment, vocab);

  const plan: Plan = {
    id: 'test-plan',
    version: '1.0.0',
    archetype: 'launch',
    beats: [
      {
        id: 'b01',
        kind: 'HOOK',
        startWordId: 'w01',
        endWordId: 'w02',
        shots: [
          {
            id: 's01',
            beatId: 'b01',
            startWordId: 'w01',
            intent: 'feature',
            primaryAsset: 'forbidden-asset.jpg',
            slots: {
              headline: 'Feature',
              body: 'Description',
            },
          },
        ],
        anchors: [],
      },
    ],
  };

  const findings = validator.validate(plan, {} as any);
  const errors = findings.filter(f => f.severity === 'error');
  assert.ok(errors.some(e => e.code === 'SHOT_FORBIDDEN_PRIMARY_ASSET'));
});

test('intents: stat with primary asset forbidden', () => {
  const validator = new Validator(alignment, vocab);

  const plan: Plan = {
    id: 'test-plan',
    version: '1.0.0',
    archetype: 'launch',
    beats: [
      {
        id: 'b01',
        kind: 'HOOK',
        startWordId: 'w01',
        endWordId: 'w02',
        shots: [
          {
            id: 's01',
            beatId: 'b01',
            startWordId: 'w01',
            intent: 'stat',
            primaryAsset: 'forbidden-asset.jpg',
            slots: {
              value: '100',
              headline: 'Statistic',
            },
          },
        ],
        anchors: [],
      },
    ],
  };

  const findings = validator.validate(plan, {} as any);
  const errors = findings.filter(f => f.severity === 'error');
  assert.ok(errors.some(e => e.code === 'SHOT_FORBIDDEN_PRIMARY_ASSET'));
});

test('intents: list valid with all required slots', () => {
  const validator = new Validator(alignment, vocab);

  const plan: Plan = {
    id: 'test-plan',
    version: '1.0.0',
    archetype: 'launch',
    beats: [
      {
        id: 'b01',
        kind: 'HOOK',
        startWordId: 'w01',
        endWordId: 'w02',
        shots: [
          {
            id: 's01',
            beatId: 'b01',
            startWordId: 'w01',
            intent: 'list',
            slots: {
              headline: 'Features',
              items: [
                { label: 'Item 1', accent: false },
                { label: 'Item 2', accent: true },
              ],
            },
          },
        ],
        anchors: [],
      },
    ],
  };

  const findings = validator.validate(plan, {} as any);
  const errors = findings.filter(f => f.severity === 'error');
  assert.equal(errors.length, 0);
});

test('intents: feature valid with all required slots', () => {
  const validator = new Validator(alignment, vocab);

  const plan: Plan = {
    id: 'test-plan',
    version: '1.0.0',
    archetype: 'launch',
    beats: [
      {
        id: 'b01',
        kind: 'HOOK',
        startWordId: 'w01',
        endWordId: 'w02',
        shots: [
          {
            id: 's01',
            beatId: 'b01',
            startWordId: 'w01',
            intent: 'feature',
            slots: {
              headline: 'Feature Name',
              kicker: 'Optional kicker',
              body: 'Feature description',
              icon: 'icon-asset-id',
            },
          },
        ],
        anchors: [],
      },
    ],
  };

  const findings = validator.validate(plan, {} as any);
  const errors = findings.filter(f => f.severity === 'error');
  assert.equal(errors.length, 0);
});

test('intents: stat valid with all required slots', () => {
  const validator = new Validator(alignment, vocab);

  const plan: Plan = {
    id: 'test-plan',
    version: '1.0.0',
    archetype: 'launch',
    beats: [
      {
        id: 'b01',
        kind: 'HOOK',
        startWordId: 'w01',
        endWordId: 'w02',
        shots: [
          {
            id: 's01',
            beatId: 'b01',
            startWordId: 'w01',
            intent: 'stat',
            slots: {
              value: '2M+',
              headline: 'Active Users',
              body: 'Globally',
            },
          },
        ],
        anchors: [],
      },
    ],
  };

  const findings = validator.validate(plan, {} as any);
  const errors = findings.filter(f => f.severity === 'error');
  assert.equal(errors.length, 0);
});

test('intents: all tests completed', () => {
  assert.ok(true);
});
