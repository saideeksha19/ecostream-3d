import { describe, expect, it } from 'vitest';
import { isPlainNavigation, resolveRoute } from './Router';

describe('product navigation', () => {
  it('resolves the two supported product routes without a router dependency', () => {
    expect(resolveRoute('/')).toBe('home');
    expect(resolveRoute('////')).toBe('home');
    expect(resolveRoute('/digital-twin/')).toBe('digital-twin');
    expect(resolveRoute('/unknown')).toBe('not-found');
  });

  it('keeps modified and non-left clicks native', () => {
    const base = { button: 0, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false, defaultPrevented: false };
    expect(isPlainNavigation(base)).toBe(true);
    expect(isPlainNavigation({ ...base, button: 1 })).toBe(false);
    expect(isPlainNavigation({ ...base, metaKey: true })).toBe(false);
    expect(isPlainNavigation({ ...base, defaultPrevented: true })).toBe(false);
  });
});
