import { describe, expect, it } from 'vitest';
import { cleanName, clampCoordinate, MAX_COORDINATE, MAX_NAME_LENGTH } from '../../src/core/limits';
import { formatCm, nextGroupName, plural, shortenToWords, uniqueName } from '../../src/core/text';

describe('plural and formatCm', () => {
  it('pluralises by count and rounds centimetres', () => {
    expect(plural(1, 'item')).toBe('1 item');
    expect(plural(0, 'item')).toBe('0 items');
    expect(formatCm(12.6)).toBe('13');
    expect(formatCm(-0.2)).toBe('0');
    expect(formatCm(Number.NaN)).toBe('0');
  });
});

describe('uniqueName', () => {
  it('keeps a free name and numbers copies of a taken one', () => {
    expect(uniqueName('Desk', new Set())).toBe('Desk');
    expect(uniqueName('Desk', new Set(['Desk']))).toBe('Desk copy');
    expect(uniqueName('Desk', new Set(['Desk', 'Desk copy']))).toBe('Desk copy 2');
  });

  it('numbers a copy of a copy from the original name', () => {
    expect(uniqueName('Desk copy', new Set(['Desk', 'Desk copy']))).toBe('Desk copy 2');
    expect(uniqueName('Desk copy 2', new Set(['Desk copy 2', 'Desk copy']))).toBe('Desk copy 3');
  });

  it('never exceeds the name limit', () => {
    const long = 'a'.repeat(MAX_NAME_LENGTH);
    const copy = uniqueName(long, new Set([long]));
    expect(copy).toHaveLength(MAX_NAME_LENGTH);
    expect(copy.endsWith(' copy')).toBe(true);
  });
});

describe('shortenToWords', () => {
  it('keeps names that fit and otherwise cuts at a word boundary', () => {
    expect(shortenToWords('Phone nook', 10)).toBe('Phone nook');
    expect(shortenToWords('Phone nook', 8)).toBe('Phone…');
    expect(shortenToWords('Coffee point', 10)).toBe('Coffee…');
    expect(shortenToWords('Fern desk 1', 10)).toBe('Fern desk…');
  });

  it('leaves the label out rather than showing part of a word', () => {
    expect(shortenToWords('Phone nook', 5)).toBe('');
    expect(shortenToWords('Bracken', 4)).toBe('');
    expect(shortenToWords('Desk', 0)).toBe('');
  });
});

describe('nextGroupName', () => {
  it('skips names that are already used', () => {
    expect(nextGroupName(new Set(), 1)).toBe('Group 1');
    expect(nextGroupName(new Set(['Group 3', 'Group 4']), 3)).toBe('Group 5');
  });
});

describe('limits', () => {
  it('clamps coordinates and cleans names', () => {
    expect(clampCoordinate(-2 * MAX_COORDINATE)).toBe(-MAX_COORDINATE);
    expect(clampCoordinate(5)).toBe(5);
    expect(cleanName('  Room  ')).toBe('Room');
    expect(cleanName(`${'b'.repeat(MAX_NAME_LENGTH - 1)}  c`)).toBe(
      'b'.repeat(MAX_NAME_LENGTH - 1),
    );
  });
});
