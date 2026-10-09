import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

test('CLI: compile valid fixture', () => {
  const fixtureDir = join(process.cwd(), 'fixtures');

  // Skip if fixtures don't exist
  if (!existsSync(join(fixtureDir, 'contrasting-fixture.json'))) {
    console.log('Skipping CLI test: fixtures not found');
    return;
  }

  // Run CLI
  try {
    execSync(`node packages/cli/dist/cli.js compile fixtures/contrasting-fixture.json`, {
      cwd: process.cwd(),
      stdio: 'ignore',
    });
  } catch (error) {
    assert.fail(`CLI execution failed: ${error}`);
  }

  // Check outputs exist
  assert.ok(existsSync('storyboard.md'), 'storyboard.md should exist');
  assert.ok(existsSync('compiled-plan.json'), 'compiled-plan.json should exist');

  // Check storyboard content
  const storyboard = readFileSync('storyboard.md', 'utf-8');
  assert.ok(storyboard.includes('Beat: hook'), 'storyboard should contain beat');
  assert.ok(storyboard.includes('Shot:'), 'storyboard should contain shots');

  // Check compiled plan
  const compiledPlan = JSON.parse(readFileSync('compiled-plan.json', 'utf-8'));
  assert.equal(compiledPlan.valid, true, 'Plan should be valid');
  assert.equal(compiledPlan.errors.length, 0, 'Should have no errors');
  assert.ok(compiledPlan.timeline.length > 0, 'Timeline should have frames');
});

test('CLI: refuse invalid plan', () => {
  const invalidFixture = {
    product: { name: 'Test' },
    plan: {
      id: '',
      version: '1.0.0',
      archetype: 'launch',
      beats: [],
    },
    alignment: { words: [], duration: 0 },
    archetype: 'launch',
    output: { tailS: 1, fps: 30, width: 1080, height: 1920 },
  };

  // Write temporary fixture
  const tmpFile = '/tmp/invalid-fixture.json';
  require('fs').writeFileSync(tmpFile, JSON.stringify(invalidFixture));

  // Run CLI and expect non-zero exit
  try {
    execSync(`node packages/cli/dist/cli.js compile ${tmpFile}`, {
      cwd: process.cwd(),
    });
    assert.fail('CLI should have exited with non-zero status');
  } catch (error: any) {
    if (error.status !== 1) {
      assert.fail(`Expected exit code 1, got ${error.status}`);
    }
  }
});
