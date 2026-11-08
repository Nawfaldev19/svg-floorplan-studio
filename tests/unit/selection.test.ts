import { describe, expect, it } from 'vitest';
import {
  expandToGroups,
  hitTest,
  itemsInsideBox,
  readingOrder,
  selectionBounds,
  toggleInSelection,
} from '../../src/core/selection';
import { makeDoc, makeItem, seeded } from './factories';

const doc = makeDoc(
  [
    makeItem({ id: 'a', x: 0, y: 0, groupId: 'g' }),
    makeItem({ id: 'b', x: 200, y: 0, groupId: 'g' }),
    makeItem({ id: 'c', x: 400, y: 0 }),
    makeItem({ id: 'top', x: 410, y: 0 }),
  ],
  [{ id: 'g', name: 'Pod' }],
);

describe('expandToGroups', () => {
  it('adds the rest of the group after the given ids', () => {
    expect(expandToGroups(doc, ['a'])).toEqual(['a', 'b']);
  });

  it('leaves ungrouped ids alone', () => {
    expect(expandToGroups(doc, ['c'])).toEqual(['c']);
  });
});

describe('hitTest', () => {
  it('returns the topmost item under the point', () => {
    expect(hitTest(doc, { x: 405, y: 0 })?.id).toBe('top');
  });

  it('returns null over empty space', () => {
    expect(hitTest(doc, { x: 100, y: 300 })).toBeNull();
  });
});

describe('itemsInsideBox', () => {
  it('selects only fully contained items', () => {
    expect(itemsInsideBox(doc, { minX: -100, minY: -50, maxX: 290, maxY: 50 })).toEqual(['a', 'b']);
    expect(itemsInsideBox(doc, { minX: -100, minY: -50, maxX: 250, maxY: 50 })).toEqual(['a']);
  });
});

describe('toggleInSelection', () => {
  it('adds and removes a whole group together', () => {
    const added = toggleInSelection(doc, ['c'], 'a', false);
    expect(added).toEqual(['c', 'a', 'b']);
    expect(toggleInSelection(doc, added, 'b', false)).toEqual(['c']);
  });

  it('toggles a single member when exact', () => {
    expect(toggleInSelection(doc, [], 'a', true)).toEqual(['a']);
  });
});

describe('selection helpers', () => {
  it('measures the selection', () => {
    expect(selectionBounds(doc, [])).toBeNull();
    expect(selectionBounds(doc, ['a', 'b'])).toEqual({ minX: -80, minY: -40, maxX: 280, maxY: 40 });
  });
});

describe('readingOrder', () => {
  it('reads lines of 40 cm top to bottom, each left to right, and skips walls', () => {
    const items = [
      makeItem({ id: 'right', x: 300, y: 10 }),
      makeItem({ id: 'left', x: 0, y: 30 }),
      makeItem({ id: 'below', x: -500, y: 45 }),
      makeItem({ id: 'wall', kind: 'wall', x: -900, y: 0 }),
    ];
    expect(readingOrder(items).map((i) => i.id)).toEqual(['left', 'right', 'below']);
  });

  it('gives the same order whatever order the items arrive in', () => {
    const random = seeded(11);
    const items = Array.from({ length: 60 }, (_, i) =>
      makeItem({ id: `i${i}`, x: Math.round(random() * 600), y: Math.round(random() * 200) }),
    );
    const expected = readingOrder(items).map((i) => i.id);
    for (let run = 0; run < 10; run += 1) {
      const shuffled = [...items].sort(() => random() - 0.5);
      expect(readingOrder(shuffled).map((i) => i.id)).toEqual(expected);
    }
  });
});
