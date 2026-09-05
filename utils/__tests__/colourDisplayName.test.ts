import { describe, it, expect } from 'vitest';
import { getColourDisplayName } from '../colourDisplayName';

describe('getColourDisplayName', () => {
  it('returns empty string for null or undefined or empty input', () => {
    expect(getColourDisplayName(null)).toBe('');
    expect(getColourDisplayName(undefined)).toBe('');
    expect(getColourDisplayName('')).toBe('');
  });

  it('preserves nuanced colour names for admin users', () => {
    expect(getColourDisplayName('Medium Blue', true)).toBe('Medium Blue');
    expect(getColourDisplayName('Dark Red', true)).toBe('Dark Red');
    expect(getColourDisplayName('Light Grey', true)).toBe('Light Grey');
  });

  it('maps known nuanced colour names to simplified names for non-admin users', () => {
    expect(getColourDisplayName('Medium Blue', false)).toBe('Blue');
    expect(getColourDisplayName('Dark Red', false)).toBe('Red');
    expect(getColourDisplayName('Light Yellow', false)).toBe('Yellow');
    expect(getColourDisplayName('Medium Green', false)).toBe('Green');
    expect(getColourDisplayName('Light Grey', false)).toBe('Grey');
    expect(getColourDisplayName('Dark Orange', false)).toBe('Orange');
    expect(getColourDisplayName('Medium Purple', false)).toBe('Purple');
    expect(getColourDisplayName('Turqoise', false)).toBe('Turquoise');
  });

  it('falls back to stripping leading prefixes if not explicitly in the map', () => {
    expect(getColourDisplayName('Light Cyan', false)).toBe('Cyan');
    expect(getColourDisplayName('Dark Magenta', false)).toBe('Magenta');
    expect(getColourDisplayName('Medium Teal', false)).toBe('Teal');
  });

  it('leaves standard names unchanged for non-admin users', () => {
    expect(getColourDisplayName('Blue', false)).toBe('Blue');
    expect(getColourDisplayName('White', false)).toBe('White');
    expect(getColourDisplayName('Black', false)).toBe('Black');
  });
});
