#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { compile, type Plan, type Alignment, type RenderJob, type IntentVocabulary } from '@video-use/compile';

/**
 * CLI entry point for video spec compilation and rendering.
 *
 * Usage:
 *   video-use compile <render-job.json> [--render]
 */

function loadJSON<T>(path: string): T {
  try {
    const content = readFileSync(resolve(path), 'utf-8');
    return JSON.parse(content) as T;
  } catch (error) {
    console.error(`Error loading ${path}:`, error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

function main(): void {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage: video-use compile <render-job.json> [--render]');
    process.exit(1);
  }

  const command = args[0];

  if (command === 'compile') {
    if (args.length < 2) {
      console.error('Usage: video-use compile <render-job.json> [--render]');
      process.exit(1);
    }

    const jobPath = args[1];
    const shouldRender = args.includes('--render');

    // Load render job
    const job = loadJSON<RenderJob>(jobPath);

    // Load plan
    const plan = typeof job.plan === 'string' ? loadJSON<Plan>(job.plan) : (job.plan as Plan);

    // Load alignment
    const alignment = typeof job.alignment === 'string'
      ? loadJSON<Alignment>(job.alignment)
      : (job.alignment as Alignment);

    // Load intent vocabulary
    // Try multiple locations
    let vocabPath = resolve(process.cwd(), 'intent-vocabulary.json');
    let intents: IntentVocabulary;
    try {
      intents = loadJSON<IntentVocabulary>(vocabPath);
    } catch {
      // Try from package location
      vocabPath = resolve(
        import.meta.url.replace('file://', ''),
        '../../../intent-vocabulary.json'
      );
      intents = loadJSON<IntentVocabulary>(vocabPath);
    }

    // Compile
    const compiled = compile(plan, alignment, intents, job);

    // Write storyboard
    if (compiled.valid || !compiled.valid) {
      // Always write storyboard, even if compilation failed
      try {
        writeFileSync(resolve('storyboard.md'), compiled.storyboard, 'utf-8');
        console.log('✓ storyboard.md written');
      } catch (error) {
        console.error('Error writing storyboard:', error instanceof Error ? error.message : error);
      }
    }

    // Write compiled plan
    try {
      writeFileSync(resolve('compiled-plan.json'), JSON.stringify(compiled, null, 2), 'utf-8');
      console.log('✓ compiled-plan.json written');
    } catch (error) {
      console.error('Error writing compiled plan:', error instanceof Error ? error.message : error);
    }

    // Report findings
    if (!compiled.valid) {
      console.error(`\n✗ Compilation failed with ${compiled.errors.length} error(s)`);
      for (const error of compiled.errors) {
        console.error(`  [${error.code}] ${error.entityId}: ${error.message}`);
      }
      process.exit(1);
    }

    if (compiled.warnings.length > 0) {
      console.warn(`\n⚠ Compilation succeeded with ${compiled.warnings.length} warning(s)`);
      for (const warning of compiled.warnings) {
        console.warn(`  [${warning.code}] ${warning.entityId}: ${warning.message}`);
      }
    }

    if (compiled.valid) {
      console.log('\n✓ Compilation succeeded');
    }

    // Render if requested (stub for now)
    if (shouldRender) {
      console.log('Rendering not yet implemented');
      process.exit(1);
    }

    process.exit(0);
  } else {
    console.error(`Unknown command: ${command}`);
    console.error('Usage: video-use compile <render-job.json> [--render]');
    process.exit(1);
  }
}

main();
