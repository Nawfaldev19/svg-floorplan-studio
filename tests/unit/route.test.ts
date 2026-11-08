import { describe, expect, it } from 'vitest';
import { parseRoute, ROUTE_HREF, ROUTE_TITLE } from '../../src/shared/route';

describe('parseRoute', () => {
  it('maps each hash to its view and anything else to the overview', () => {
    expect(parseRoute(ROUTE_HREF.editor)).toBe('editor');
    expect(parseRoute('#/viewer?embed')).toBe('viewer');
    expect(parseRoute('#main')).toBe('home');
    expect(parseRoute('')).toBe('home');
  });

  it('gives every view its own document title', () => {
    expect(new Set(Object.values(ROUTE_TITLE)).size).toBe(3);
  });
});
