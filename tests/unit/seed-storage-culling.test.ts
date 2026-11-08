import { describe, expect, it } from 'vitest';
import { cachedBounds, fitItems, visibleItems } from '../../src/core/culling';
import { parseDocument, serializeDocument } from '../../src/core/document';
import {
  createBlankPlan,
  createDemoPlan,
  createRandom,
  createStressPlan,
} from '../../src/core/seed';
import {
  backUpUnreadablePlan,
  loadPlan,
  savePlan,
  STORAGE_KEY,
  type KeyValueStore,
} from '../../src/core/storage';
import { makeDoc, makeItem } from './factories';

class MemoryStore implements KeyValueStore {
  readonly values = new Map<string, string>();
  getItem(key: string) {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

describe('seed plans', () => {
  it('builds a valid demo plan with unique ids and grouped pods', () => {
    const demo = createDemoPlan();
    const ids = new Set(demo.items.map((i) => i.id));
    expect(ids.size).toBe(demo.items.length);
    expect(demo.items).toHaveLength(51);
    expect(demo.groups).toHaveLength(7);
    expect(parseDocument(serializeDocument(demo)).ok).toBe(true);
  });

  it('builds the same stress plan every time', () => {
    const one = createStressPlan(500, 3);
    expect(one.items).toHaveLength(500);
    expect(createStressPlan(500, 3)).toEqual(one);
    expect(createStressPlan(500, 4)).not.toEqual(one);
  });

  it('produces numbers in [0, 1) from the seeded generator, even for seed 0', () => {
    const random = createRandom(0);
    for (let i = 0; i < 1000; i += 1) {
      const value = random();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('starts blank plans empty', () => {
    expect(createBlankPlan().items).toEqual([]);
  });
});

describe('storage', () => {
  it('reports empty, then loads what was saved', () => {
    const store = new MemoryStore();
    expect(loadPlan(store)).toEqual({ status: 'empty' });
    const demo = createDemoPlan();
    expect(savePlan(store, demo)).toBeNull();
    expect(loadPlan(store)).toEqual({ status: 'loaded', document: demo });
  });

  it('flags corrupt content instead of throwing', () => {
    const store = new MemoryStore();
    store.setItem(STORAGE_KEY, '{"schemaVersion": 2, "items": "nope"}');
    expect(loadPlan(store).status).toBe('corrupt');
  });

  it('returns errors from a failing store', () => {
    const broken: KeyValueStore = {
      getItem() {
        throw new Error('denied');
      },
      setItem() {
        throw new Error('quota exceeded');
      },
    };
    expect(loadPlan(broken)).toEqual({
      status: 'corrupt',
      errors: ['Storage is unavailable: Error: denied'],
    });
    expect(savePlan(broken, createBlankPlan())).toBe('quota exceeded');
    const throwsString: KeyValueStore = {
      getItem: () => null,
      setItem() {
        throw 'plain failure'; // eslint-disable-line @typescript-eslint/only-throw-error -- simulates a non-Error throw from a browser API
      },
    };
    expect(savePlan(throwsString, createBlankPlan())).toBe('plain failure');
  });
});

describe('never losing a saved plan', () => {
  it('refuses to save a plan the loader would reject, keeping the good one', () => {
    const store = new MemoryStore();
    const good = createDemoPlan();
    savePlan(store, good);
    const broken = makeDoc([makeItem({ id: 'a', name: 'x'.repeat(500) })]);
    expect(savePlan(store, broken)).toMatch(/^The plan breaks the file format \(items\.0\.name/);
    expect(loadPlan(store)).toEqual({ status: 'loaded', document: good });
  });
});

describe('backUpUnreadablePlan', () => {
  it('copies the saved text, and reports when there is nothing to copy or storage fails', () => {
    const store = new MemoryStore();
    expect(backUpUnreadablePlan(store)).toBe(false);
    store.setItem(STORAGE_KEY, 'not json');
    expect(backUpUnreadablePlan(store)).toBe(true);
    const failing: KeyValueStore = {
      getItem() {
        throw new Error('denied');
      },
      setItem() {
        throw new Error('denied');
      },
    };
    expect(backUpUnreadablePlan(failing)).toBe(false);
  });
});

describe('culling', () => {
  it('keeps only items whose rotated bounds touch the visible box', () => {
    const near = makeItem({ id: 'near', x: 0, y: 0 });
    const far = makeItem({ id: 'far', x: 5000, y: 0 });
    const turned = makeItem({ id: 'turned', x: 150, y: 0, width: 200, height: 10, rotation: 90 });
    const box = { minX: -100, minY: -100, maxX: 140, maxY: 100 };
    expect(visibleItems([near, far, turned], box).map((i) => i.id)).toEqual(['near']);
  });

  it('always keeps the given item, even off screen', () => {
    const far = makeItem({ id: 'far', x: 5000, y: 0 });
    const box = { minX: -100, minY: -100, maxX: 100, maxY: 100 };
    expect(visibleItems([far], box)).toEqual([]);
    expect(visibleItems([far], box, 'far')).toEqual([far]);
  });

  it('fits items to a screen, and centres the origin for an empty plan', () => {
    const fitted = fitItems([makeItem({ id: 'a', x: 0, y: 0 })], { width: 400, height: 400 }, 0);
    expect(fitted.scale).toBeCloseTo(2.5);
    expect(fitItems([], { width: 400, height: 200 })).toEqual({
      scale: 1,
      offsetX: 200,
      offsetY: 100,
    });
  });

  it('caches bounds per immutable item', () => {
    const item = makeItem({ id: 'a' });
    expect(cachedBounds(item)).toBe(cachedBounds(item));
  });
});
