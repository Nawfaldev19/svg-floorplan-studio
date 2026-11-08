import { describe, expect, it, vi } from 'vitest';
import { subscribe } from '../../src/shared/pageHandlers';

/** Every source module's text, keyed by path. */
const sources = import.meta.glob<string>('../../src/**/*.{ts,tsx}', {
  query: '?raw',
  import: 'default',
  eager: true,
});

describe('subscribe', () => {
  it('lets several subscribers share one handler property and restores it when they leave', () => {
    const target = { onblur: null as ((arg: unknown) => void) | null };
    const page = target as unknown as Window;
    const first = vi.fn();
    const second = vi.fn();
    const stopFirst = subscribe(page, 'onblur', first);
    const stopSecond = subscribe(page, 'onblur', second);
    target.onblur?.('focus left');
    expect(first).toHaveBeenCalledWith('focus left');
    expect(second).toHaveBeenCalledWith('focus left');
    stopFirst();
    target.onblur?.('again');
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(2);
    stopSecond();
    expect(target.onblur).toBeNull();
  });
});

describe('page-level handler ownership', () => {
  it('assigns window and document handler properties only in src/shared/pageHandlers.ts', () => {
    expect(Object.keys(sources).length).toBeGreaterThan(30);
    const offenders = Object.entries(sources)
      .filter(([path]) => !path.endsWith('/pageHandlers.ts'))
      .flatMap(([path, text]) =>
        text
          .split('\n')
          .map((line, i) => ({ line, at: `${path}:${i + 1}` }))
          .filter(({ line }) => /\b(window|document)\.on[a-z]+\s*=[^=]/.test(line))
          .map(({ at }) => at),
      );
    expect(offenders).toEqual([]);
  });
});
