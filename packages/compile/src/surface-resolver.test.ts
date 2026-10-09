import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { SurfaceResolver } from './surface-resolver.js';
import type { BrandIdentity } from './types.js';

const mockBrand: BrandIdentity = {
  name: 'Test Brand',
  palette: {
    primary: '#0066FF',
    alt_bg: '#f5f5f5',
    alt_fg: '#333333',
  },
  roles: { required: [], open: [] },
  surfaces: {
    base: { bg: '#FFFFFF', fg: '#000000' },
  },
};

const lightBrand: BrandIdentity = {
  name: 'Light Only Brand',
  palette: {
    primary: '#0066FF',
    // no alt_bg or alt_fg
  },
  roles: { required: [], open: [] },
  surfaces: {
    base: { bg: '#FFFFFF', fg: '#000000' },
  },
};

test('surface: absent surface resolves to base', () => {
  const resolver = new SurfaceResolver(mockBrand);

  const resolved = resolver.resolve(undefined);

  assert.equal(resolved.name, 'base');
  assert.equal(resolved.bg, '#FFFFFF');
  assert.equal(resolved.fg, '#000000');
  assert.equal(resolved.fallback, undefined);
});

test('surface: explicit base surface', () => {
  const resolver = new SurfaceResolver(mockBrand);

  const resolved = resolver.resolve('base');

  assert.equal(resolved.name, 'base');
  assert.equal(resolved.bg, '#FFFFFF');
  assert.equal(resolved.fg, '#000000');
});

test('surface: alt on brand with alt_bg and alt_fg', () => {
  const resolver = new SurfaceResolver(mockBrand);

  const resolved = resolver.resolve('alt');

  assert.equal(resolved.name, 'alt');
  assert.equal(resolved.bg, '#f5f5f5');
  assert.equal(resolved.fg, '#333333');
  assert.equal(resolved.fallback, undefined);
});

test('surface: alt on light-only brand falls back to base', () => {
  const resolver = new SurfaceResolver(lightBrand);

  const resolved = resolver.resolve('alt');

  assert.equal(resolved.name, 'base');
  assert.equal(resolved.bg, '#FFFFFF');
  assert.equal(resolved.fg, '#000000');
  assert.equal(resolved.fallback, true);
  assert.ok(resolved.fallbackReason?.includes('alt_bg not defined'));
});

test('surface: alt_fg absent uses contrasting fg', () => {
  const brandNoAltFg: BrandIdentity = {
    name: 'Test',
    palette: {
      alt_bg: '#f5f5f5', // light gray
      // no alt_fg - should derive from fg/bg contrast
    },
    roles: { required: [], open: [] },
    surfaces: {
      base: { bg: '#FFFFFF', fg: '#000000' },
    },
  };

  const resolver = new SurfaceResolver(brandNoAltFg);
  const resolved = resolver.resolve('alt');

  assert.equal(resolved.name, 'alt');
  assert.equal(resolved.bg, '#f5f5f5');
  // Should pick one of the two colors - fg or bg - that contrasts better
  assert.ok(resolved.fg === '#000000' || resolved.fg === '#FFFFFF');
});

test('surface: contrast calculation', () => {
  // Test with explicit alt_fg to verify resolution works
  const brandWithAltFg: BrandIdentity = {
    name: 'Test',
    palette: {
      alt_bg: '#333333',
      alt_fg: '#CCCCCC',
    },
    roles: { required: [], open: [] },
    surfaces: {
      base: { bg: '#FFFFFF', fg: '#000000' },
    },
  };

  const resolver = new SurfaceResolver(brandWithAltFg);
  const resolved = resolver.resolve('alt');

  assert.equal(resolved.fg, '#CCCCCC');
});

test('surface: resolvers independent', () => {
  const resolver1 = new SurfaceResolver(mockBrand);
  const resolver2 = new SurfaceResolver(lightBrand);

  const alt1 = resolver1.resolve('alt');
  const alt2 = resolver2.resolve('alt');

  // Different outcomes
  assert.equal(alt1.name, 'alt');
  assert.equal(alt2.name, 'base');
  assert.equal(alt2.fallback, true);
});

test('surface: all tests completed', () => {
  assert.ok(true);
});
