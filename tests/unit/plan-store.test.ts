import { describe, expect, it } from 'vitest';
import { savePlan, BACKUP_KEY, STORAGE_KEY, type KeyValueStore } from '../../src/core/storage';
import { createDemoPlan } from '../../src/core/seed';
import {
  flushPendingSaves,
  loadInitialPlan,
  registerPendingSave,
} from '../../src/shared/planStore';

function memoryStore(): KeyValueStore & { readonly values: Map<string, string> } {
  const values = new Map<string, string>();
  return {
    values,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
  };
}

describe('loadInitialPlan', () => {
  it('loads the saved plan, or the demo when nothing is saved', () => {
    const store = memoryStore();
    expect(loadInitialPlan(store)).toMatchObject({ notice: null });
    const plan = { ...createDemoPlan(), title: 'Saved floor' };
    savePlan(store, plan);
    expect(loadInitialPlan(store)).toEqual({ doc: plan, notice: null });
  });

  it('backs up an unreadable plan before the demo replaces it', () => {
    const store = memoryStore();
    store.setItem(STORAGE_KEY, '{"schemaVersion":2}');
    const initial = loadInitialPlan(store);
    expect(initial.notice).toContain(`under “${BACKUP_KEY}”`);
    expect(store.values.get(BACKUP_KEY)).toBe('{"schemaVersion":2}');
    expect(initial.doc.items).toHaveLength(51);
  });

  it('explains what happened when storage fails or is missing', () => {
    const failing: KeyValueStore = {
      getItem() {
        throw new Error('denied');
      },
      setItem() {
        throw new Error('denied');
      },
    };
    expect(loadInitialPlan(failing).notice).toBe(
      'Your saved plan could not be read, so the demo plan was loaded instead.',
    );
    expect(loadInitialPlan(null).notice).toMatch(/storage is unavailable/);
  });
});

describe('pending saves', () => {
  it('runs every registered save until it is unregistered', () => {
    let saves = 0;
    const unregister = registerPendingSave(() => {
      saves += 1;
    });
    flushPendingSaves();
    unregister();
    flushPendingSaves();
    expect(saves).toBe(1);
  });
});
