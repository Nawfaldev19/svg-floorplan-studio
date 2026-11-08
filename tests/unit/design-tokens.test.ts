import { describe, expect, it } from 'vitest';
import tokens from '../../src/styles/tokens.css?raw';

// Keeps the colour pairs listed in docs/reference/design-tokens.md at or above
// their WCAG 2.2 minimums (1.4.3 text 4.5:1, 1.4.11 non-text 3:1) in both themes.

function readBlock(selector: string): Record<string, string> {
  const start = tokens.indexOf(selector);
  if (start < 0) throw new Error(`${selector} not found in tokens.css`);
  const body = tokens.slice(start, tokens.indexOf('}', start));
  const pairs = [...body.matchAll(/(--[a-z0-9-]+):\s*(#[0-9a-f]{6})/gi)].map(
    (m): [string, string] => [m[1] ?? '', m[2] ?? ''],
  );
  return Object.fromEntries(pairs);
}

const light = readBlock(':root {');
const dark = { ...light, ...readBlock(":root[data-theme='dark'] {") };

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(theme: Record<string, string>, a: string, b: string): number {
  const fg = theme[a];
  const bg = theme[b];
  if (!fg || !bg) throw new Error(`missing token ${fg ? b : a}`);
  const [hi, lo] = [luminance(fg), luminance(bg)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

const TEXT: readonly [string, string][] = [
  ['--color-text', '--color-bg'],
  ['--color-text', '--color-surface'],
  ['--color-text', '--color-sunken'],
  ['--color-text', '--color-primary-soft'],
  ['--color-text-muted', '--color-bg'],
  ['--color-text-muted', '--color-surface'],
  ['--color-text-muted', '--color-primary-soft'],
  ['--color-primary', '--color-bg'],
  ['--color-primary', '--color-surface'],
  ['--color-on-primary', '--color-primary'],
  ['--color-on-danger', '--color-danger'],
  ['--color-danger', '--color-surface'],
  ['--color-accent', '--color-bg'],
  ['--color-text', '--item-desk'],
  ['--color-text', '--item-meeting-room'],
  ['--color-text', '--item-lounge'],
  ['--color-text', '--item-planter'],
];

const FILLS = [
  '--color-surface',
  '--item-desk',
  '--item-meeting-room',
  '--item-lounge',
  '--item-planter',
];
const AMENITIES = [
  '--amenity-standing',
  '--amenity-dual-monitor',
  '--amenity-quiet',
  '--amenity-window',
  '--amenity-step-free',
];

const NON_TEXT: readonly [string, string][] = [
  ['--color-border-strong', '--color-surface'],
  ['--color-border-strong', '--color-bg'],
  ['--color-focus', '--color-surface'],
  ['--color-focus', '--color-bg'],
  ['--color-primary', '--color-surface'],
  ['--item-desk-stroke', '--color-surface'],
  ['--item-meeting-room-stroke', '--color-surface'],
  ['--item-lounge-stroke', '--color-surface'],
  ['--item-planter-stroke', '--color-surface'],
  ['--item-wall', '--color-surface'],
  ['--color-accent', '--item-desk'],
  ['--color-focus', '--item-desk'],
  ['--color-focus', '--item-meeting-room'],
  ...AMENITIES.flatMap((tag) => FILLS.map((fill): [string, string] => [tag, fill])),
];

describe('design token contrast', () => {
  for (const [name, theme] of [
    ['light', light],
    ['dark', dark],
  ] as const) {
    it(`gives text at least 4.5:1 in the ${name} theme`, () => {
      const low = TEXT.filter(([a, b]) => contrast(theme, a, b) < 4.5);
      expect(low).toEqual([]);
    });

    it(`gives borders, focus, plan strokes and amenity glyphs at least 3:1 in the ${name} theme`, () => {
      const low = NON_TEXT.filter(([a, b]) => contrast(theme, a, b) < 3);
      expect(low).toEqual([]);
    });
  }

  it('defines the same colour tokens in both themes', () => {
    const colours = Object.keys(light).filter((key) => /^--(color|item|amenity)-/.test(key));
    const darkOnly = readBlock(":root[data-theme='dark'] {");
    expect(colours.filter((key) => !(key in darkOnly))).toEqual([]);
  });

  it('uses the same dark values whether the system or the toggle asks for dark', () => {
    expect(readBlock(":root:not([data-theme='light']) {")).toEqual(
      readBlock(":root[data-theme='dark'] {"),
    );
  });
});
