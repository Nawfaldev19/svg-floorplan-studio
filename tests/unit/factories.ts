import { CURRENT_SCHEMA_VERSION, type PlanDocument, type PlanItem } from '../../src/core/types';

export function makeItem(overrides: Partial<PlanItem> & { id: string }): PlanItem {
  return {
    kind: 'desk',
    name: overrides.id,
    x: 0,
    y: 0,
    width: 160,
    height: 80,
    rotation: 0,
    tags: [],
    groupId: null,
    ...overrides,
  };
}

export function makeDoc(items: PlanItem[], groups: PlanDocument['groups'] = []): PlanDocument {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    title: 'Test floor',
    gridSize: 10,
    items,
    groups,
  };
}

/** A small seeded generator (a linear congruential one), so every run sees the same values. */
export function seeded(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1_103_515_245 + 12_345) % 2 ** 31;
    return state / 2 ** 31;
  };
}
