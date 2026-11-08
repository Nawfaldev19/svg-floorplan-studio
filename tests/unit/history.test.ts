import { describe, expect, it } from 'vitest';
import {
  applyChange,
  COALESCE_WINDOW_MS,
  diffItem,
  diffItems,
  EMPTY_HISTORY,
  HISTORY_LIMIT,
  invertChange,
  record,
  redo,
  undo,
  type Change,
  type Operation,
} from '../../src/core/history';
import { AMENITY_TAGS, type PlanDocument, type PlanItem } from '../../src/core/types';
import { makeDoc, makeItem, seeded } from './factories';

const a = makeItem({ id: 'a', x: 0 });
const b = makeItem({ id: 'b', x: 100 });
const c = makeItem({ id: 'c', x: 200 });

describe('applyChange', () => {
  it('inserts, patches and removes in order', () => {
    const doc = makeDoc([a, b]);
    const change: Change = {
      label: 'mixed',
      ops: [
        { kind: 'insert', index: 1, item: c },
        { kind: 'patch', id: 'a', before: { x: 0 }, after: { x: 50 } },
        { kind: 'remove', index: 2, item: b },
      ],
    };
    const next = applyChange(doc, change);
    expect(next.items.map((i) => [i.id, i.x])).toEqual([
      ['a', 50],
      ['c', 200],
    ]);
    // The input document is never mutated.
    expect(doc.items.map((i) => i.id)).toEqual(['a', 'b']);
  });

  it('finds an item by id when its index has shifted', () => {
    const next = applyChange(makeDoc([a, b, c]), {
      label: 'remove',
      ops: [{ kind: 'remove', index: 0, item: c }],
    });
    expect(next.items.map((i) => i.id)).toEqual(['a', 'b']);
  });

  it('throws on operations that target missing items', () => {
    const doc = makeDoc([a]);
    expect(() =>
      applyChange(doc, { label: 'x', ops: [{ kind: 'remove', index: 0, item: b }] }),
    ).toThrow(/missing item b/);
    expect(() =>
      applyChange(doc, {
        label: 'x',
        ops: [{ kind: 'patch', id: 'zzz', before: {}, after: { x: 1 } }],
      }),
    ).toThrow(/missing item zzz/);
  });

  it('applies group, title and replace operations', () => {
    const doc = makeDoc([a]);
    const other = makeDoc([b]);
    const next = applyChange(doc, {
      label: 'meta',
      ops: [
        { kind: 'groups', before: [], after: [{ id: 'g', name: 'G' }] },
        { kind: 'title', before: doc.title, after: 'Renamed' },
      ],
    });
    expect(next.groups).toEqual([{ id: 'g', name: 'G' }]);
    expect(next.title).toBe('Renamed');
    expect(
      applyChange(doc, { label: 'r', ops: [{ kind: 'replace', before: doc, after: other }] }),
    ).toBe(other);
  });

  it('is exactly reversed by its inverse', () => {
    const doc = makeDoc([a, b], [{ id: 'g', name: 'G' }]);
    const change: Change = {
      label: 'everything',
      ops: [
        { kind: 'insert', index: 2, item: c },
        {
          kind: 'patch',
          id: 'b',
          before: { name: 'b', rotation: 0 },
          after: { name: 'B', rotation: 90 },
        },
        { kind: 'remove', index: 0, item: a },
        { kind: 'groups', before: doc.groups, after: [] },
        { kind: 'title', before: doc.title, after: 'New' },
      ],
    };
    const roundTrip = applyChange(applyChange(doc, change), invertChange(change));
    expect(roundTrip).toEqual(doc);
  });
});

/**
 * A seeded generator of random but valid changes, covering all six operation
 * types. Each operation is built against the document as it stands after the
 * previous ones, exactly as the reducer builds them.
 */
function randomChange(doc: PlanDocument, random: () => number, serial: { next: number }) {
  const pick = <T>(list: readonly T[]): T | undefined => list[Math.floor(random() * list.length)];
  const ops: Operation[] = [];
  let current = doc;
  const count = 1 + Math.floor(random() * 6);
  for (let i = 0; i < count; i += 1) {
    const roll = random();
    const target = pick(current.items);
    let op: Operation;
    if (roll < 0.25 || !target) {
      const item = makeItem({ id: `r${serial.next++}`, x: Math.round(random() * 1000) });
      op = { kind: 'insert', index: Math.floor(random() * (current.items.length + 1)), item };
    } else if (roll < 0.45) {
      op = { kind: 'remove', index: current.items.indexOf(target), item: target };
    } else if (roll < 0.75) {
      const next: PlanItem = {
        ...target,
        x: target.x + 10,
        rotation: (target.rotation + 15) % 360,
        tags: random() < 0.5 ? [] : [pick(AMENITY_TAGS) ?? 'quiet'],
      };
      op = diffItem(target, next) ?? { kind: 'title', before: current.title, after: 'Same' };
    } else if (roll < 0.85) {
      op = {
        kind: 'groups',
        before: current.groups,
        after: [{ id: `g${serial.next++}`, name: 'G' }],
      };
    } else if (roll < 0.95) {
      op = { kind: 'title', before: current.title, after: `Title ${serial.next++}` };
    } else {
      op = {
        kind: 'replace',
        before: current,
        after: makeDoc([makeItem({ id: `r${serial.next++}` })]),
      };
    }
    ops.push(op);
    current = applyChange(current, { label: 'step', ops: [op] });
  }
  return { change: { label: 'random', ops }, after: current };
}

describe('apply and invert, on random changes', () => {
  it('returns to the exact original document for 500 seeded random changes', () => {
    const random = seeded(2024);
    const serial = { next: 1 };
    let doc = makeDoc([a, b, c], [{ id: 'g', name: 'G' }]);
    for (let run = 0; run < 500; run += 1) {
      const { change, after } = randomChange(doc, random, serial);
      expect(applyChange(doc, change)).toEqual(after);
      expect(applyChange(after, invertChange(change))).toEqual(doc);
      doc = after;
    }
  });
});

describe('selection in a change', () => {
  it('swaps the recorded selection when inverted', () => {
    const change: Change = {
      label: 'Delete 1 item',
      ops: [{ kind: 'remove', index: 0, item: a }],
      selection: { before: ['a'], after: [] },
    };
    expect(invertChange(change).selection).toEqual({ before: [], after: ['a'] });
    expect(invertChange({ label: 'x', ops: [] }).selection).toBeUndefined();
  });
});

describe('record, undo and redo', () => {
  const change: Change = {
    label: 'Move a',
    ops: [{ kind: 'patch', id: 'a', before: { x: 0 }, after: { x: 9 } }],
  };

  it('ignores empty changes', () => {
    expect(record(EMPTY_HISTORY, { label: 'noop', ops: [] })).toBe(EMPTY_HISTORY);
  });

  it('undoes and redoes, and a new change clears the redo stack', () => {
    const doc0 = makeDoc([a]);
    const doc1 = applyChange(doc0, change);
    const h1 = record(EMPTY_HISTORY, change);

    const undone = undo(doc1, h1);
    expect(undone?.doc.items[0]?.x).toBe(0);
    expect(undone?.history.future).toHaveLength(1);

    const redone = redo(undone!.doc, undone!.history);
    expect(redone?.doc.items[0]?.x).toBe(9);

    const h2 = record(undone!.history, change);
    expect(h2.future).toEqual([]);
  });

  it('returns null when there is nothing to undo or redo', () => {
    expect(undo(makeDoc([]), EMPTY_HISTORY)).toBeNull();
    expect(redo(makeDoc([]), EMPTY_HISTORY)).toBeNull();
  });

  it('keeps at most HISTORY_LIMIT entries, dropping the oldest', () => {
    let history = EMPTY_HISTORY;
    for (let i = 0; i < HISTORY_LIMIT + 5; i += 1)
      history = record(history, { ...change, label: `step ${i}` });
    expect(history.past).toHaveLength(HISTORY_LIMIT);
    expect(history.past[0]?.label).toBe('step 5');
  });
});

describe('diffItem', () => {
  it('returns only the fields that changed', () => {
    const op = diffItem(a, { ...a, x: 5, tags: ['quiet'] });
    expect(op).toEqual({
      kind: 'patch',
      id: 'a',
      before: { x: 0, tags: [] },
      after: { x: 5, tags: ['quiet'] },
    });
  });

  it('treats equal tag arrays as unchanged and returns null for no change', () => {
    expect(diffItem({ ...a, tags: ['quiet'] }, { ...a, tags: ['quiet'] })).toBeNull();
  });

  it('skips items missing from the second snapshot', () => {
    expect(diffItems([a, b], [{ ...a, y: 1 }])).toHaveLength(1);
  });
});

describe('record, merging a burst of changes', () => {
  const nudge = (id: string, from: number, to: number, at: number): Change => ({
    label: 'Nudge 1 item',
    ops: [{ kind: 'patch', id, before: { x: from }, after: { x: to } }],
    selection: { before: [id], after: [id] },
    coalesce: { key: 'nudge', at },
  });

  it('folds changes with the same key inside the window into one invertible step', () => {
    const doc = makeDoc([a, b]);
    const steps = [nudge('a', 0, 10, 0), nudge('a', 10, 20, 40), nudge('a', 20, 30, 80)];
    const history = steps.reduce(record, EMPTY_HISTORY);
    expect(history.past).toHaveLength(1);
    const merged = history.past[0]!;
    expect(merged.ops).toEqual([{ kind: 'patch', id: 'a', before: { x: 0 }, after: { x: 30 } }]);
    const moved = applyChange(doc, merged);
    expect(moved.items[0]?.x).toBe(30);
    expect(applyChange(moved, invertChange(merged))).toEqual(doc);
  });

  it('keeps steps apart across a pause, another key or another selection', () => {
    const first = record(EMPTY_HISTORY, nudge('a', 0, 10, 0));
    expect(record(first, nudge('a', 10, 20, COALESCE_WINDOW_MS + 1)).past).toHaveLength(2);
    expect(
      record(first, { ...nudge('a', 10, 20, 5), coalesce: { key: 'other', at: 5 } }).past,
    ).toHaveLength(2);
    expect(record(first, nudge('b', 100, 110, 5)).past).toHaveLength(2);
    expect(record(first, { label: 'plain', ops: nudge('a', 10, 20, 5).ops }).past).toHaveLength(2);
  });

  it('concatenates operations that are not all patches', () => {
    const insert: Change = {
      label: 'Add',
      ops: [{ kind: 'insert', index: 0, item: c }],
      coalesce: { key: 'add', at: 0 },
    };
    const history = record(record(EMPTY_HISTORY, insert), {
      ...insert,
      coalesce: { key: 'add', at: 1 },
    });
    expect(history.past[0]?.ops).toHaveLength(2);
  });
});
