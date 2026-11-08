/**
 * Undo and redo built from small invertible operations: applying, inverting,
 * recording with a cap, and diffing items into minimal patches.
 *
 * @see docs/adr/0003-history-as-invertible-operations.md
 * @packageDocumentation
 */
import type { ItemId, ItemPatch, PlanDocument, PlanGroup, PlanItem } from './types';

/**
 * Undo/redo is built from small, invertible operations instead of whole-document
 * snapshots. A drag of three items stores three tiny patches, not three thousand
 * item copies, so a long history costs very little memory.
 *
 * @remarks
 * Every variant has an exact inverse (see {@link invertChange}); a seeded
 * randomised test checks the round trip for all six kinds.
 */
export type Operation =
  | { readonly kind: 'insert'; readonly index: number; readonly item: PlanItem }
  | { readonly kind: 'remove'; readonly index: number; readonly item: PlanItem }
  | {
      readonly kind: 'patch';
      readonly id: ItemId;
      readonly before: ItemPatch;
      readonly after: ItemPatch;
    }
  | {
      readonly kind: 'groups';
      readonly before: readonly PlanGroup[];
      readonly after: readonly PlanGroup[];
    }
  | { readonly kind: 'title'; readonly before: string; readonly after: string }
  | { readonly kind: 'replace'; readonly before: PlanDocument; readonly after: PlanDocument };

/** One undo step: a labelled list of operations plus the selection around it. */
export interface Change {
  /** Human-readable, used for "Undo move" labels and screen-reader announcements. */
  readonly label: string;
  /** Applied in order; inverted in reverse order. */
  readonly ops: readonly Operation[];
  /** What was selected before and after, so undo and redo also restore the selection. */
  readonly selection?: {
    readonly before: readonly ItemId[];
    readonly after: readonly ItemId[];
  };
  /**
   * Marks a change that may merge into the previous one (see {@link record}):
   * `key` names the kind of edit and `at` is when it happened, in milliseconds.
   */
  readonly coalesce?: { readonly key: string; readonly at: number };
}

/** The undo and redo stacks. */
export interface History {
  /** Applied changes, oldest first; at most {@link HISTORY_LIMIT}. */
  readonly past: readonly Change[];
  /** Undone changes, next redo first. Cleared by any new change. */
  readonly future: readonly Change[];
}

/** Most changes kept for undo; the oldest is dropped first. */
export const HISTORY_LIMIT = 200;

/**
 * Longest pause, in milliseconds, between two changes with the same
 * `coalesce` key for them to become one undo step. A held arrow key repeats
 * every 30–50 ms after an initial delay of up to about 500 ms, so a whole
 * burst of repeats stays well inside it.
 */
export const COALESCE_WINDOW_MS = 1000;

/** A history with nothing to undo or redo. */
export const EMPTY_HISTORY: History = { past: [], future: [] };

function invertOperation(op: Operation): Operation {
  switch (op.kind) {
    case 'insert':
      return { kind: 'remove', index: op.index, item: op.item };
    case 'remove':
      return { kind: 'insert', index: op.index, item: op.item };
    case 'patch':
      return { kind: 'patch', id: op.id, before: op.after, after: op.before };
    case 'groups':
      return { kind: 'groups', before: op.after, after: op.before };
    case 'title':
      return { kind: 'title', before: op.after, after: op.before };
    case 'replace':
      return { kind: 'replace', before: op.after, after: op.before };
  }
}

/**
 * The change that undoes `change`: every operation inverted, in reverse order,
 * with the recorded selection swapped.
 *
 * @example
 * ```ts
 * applyChange(applyChange(doc, change), invertChange(change)); // deep-equals doc
 * ```
 */
export function invertChange(change: Change): Change {
  const inverted: Change = { label: change.label, ops: change.ops.map(invertOperation).reverse() };
  const { selection } = change;
  return selection
    ? { ...inverted, selection: { before: selection.after, after: selection.before } }
    : inverted;
}

/**
 * Applies every operation of a change in order. Items are copied once per
 * change and looked up through an index map, so large patches stay linear.
 *
 * @returns A new document; `doc` is not modified.
 * @throws Error when a `remove` or `patch` names an item that is not in the
 *   document. The reducer never produces such a change (stale gestures are
 *   filtered first), so this signals a programming error.
 */
export function applyChange(doc: PlanDocument, change: Change): PlanDocument {
  let current = doc;
  let items: PlanItem[] | null = null;
  let indexById: Map<ItemId, number> | null = null;

  const ensureItems = (): PlanItem[] => {
    items ??= current.items.slice();
    return items;
  };
  const ensureIndex = (): Map<ItemId, number> => {
    indexById ??= new Map(ensureItems().map((item, i) => [item.id, i]));
    return indexById;
  };
  const flushItems = () => {
    if (items) current = { ...current, items };
    items = null;
    indexById = null;
  };

  for (const op of change.ops) {
    switch (op.kind) {
      case 'insert': {
        const list = ensureItems();
        list.splice(Math.min(op.index, list.length), 0, op.item);
        indexById = null;
        break;
      }
      case 'remove': {
        const list = ensureItems();
        const at = list[op.index]?.id === op.item.id ? op.index : ensureIndex().get(op.item.id);
        if (at === undefined) throw new Error(`Cannot remove missing item ${op.item.id}`);
        list.splice(at, 1);
        indexById = null;
        break;
      }
      case 'patch': {
        const list = ensureItems();
        const at = ensureIndex().get(op.id);
        const existing = at === undefined ? undefined : list[at];
        if (at === undefined || !existing) throw new Error(`Cannot patch missing item ${op.id}`);
        list[at] = { ...existing, ...op.after };
        break;
      }
      case 'groups':
        flushItems();
        current = { ...current, groups: op.after };
        break;
      case 'title':
        flushItems();
        current = { ...current, title: op.after };
        break;
      case 'replace':
        items = null;
        indexById = null;
        current = op.after;
        break;
    }
  }
  flushItems();
  return current;
}

function sameIds(a: readonly ItemId[] | undefined, b: readonly ItemId[] | undefined): boolean {
  return a === b || (!!a && !!b && a.length === b.length && a.every((id, i) => id === b[i]));
}

/** Whether `next` continues `last`: same key, within the window, same selection in between. */
function continues(last: Change, next: Change): boolean {
  const a = last.coalesce;
  const b = next.coalesce;
  return (
    !!a &&
    !!b &&
    a.key === b.key &&
    b.at >= a.at &&
    b.at - a.at <= COALESCE_WINDOW_MS &&
    sameIds(last.selection?.after, next.selection?.before)
  );
}

type PatchOperation = Extract<Operation, { kind: 'patch' }>;

function isPatch(op: Operation): op is PatchOperation {
  return op.kind === 'patch';
}

/**
 * One change that does what `first` and then `next` do. Patches to the same
 * item are folded into one, so a long burst stays as small as a single step.
 */
function mergeChanges(first: Change, next: Change): Change {
  const all = [...first.ops, ...next.ops];
  let ops: Operation[] = all;
  if (all.every(isPatch)) {
    const byId = new Map<ItemId, PatchOperation>();
    for (const op of all) {
      const seen = byId.get(op.id);
      byId.set(
        op.id,
        seen
          ? {
              ...op,
              before: { ...op.before, ...seen.before },
              after: { ...seen.after, ...op.after },
            }
          : op,
      );
    }
    ops = [...byId.values()];
  }
  const selection =
    first.selection && next.selection
      ? { before: first.selection.before, after: next.selection.after }
      : (next.selection ?? first.selection);
  return { ...next, ops, ...(selection ? { selection } : {}) };
}

/**
 * Pushes a change, clears the redo stack and enforces {@link HISTORY_LIMIT}.
 * Empty changes are ignored.
 *
 * @remarks
 * A change that {@link Change.coalesce | continues} the latest one (same key,
 * at most {@link COALESCE_WINDOW_MS} later, nothing undone in between, the
 * same selection) is merged into it instead of pushed, so holding an arrow key
 * gives one undo step rather than hundreds.
 */
export function record(history: History, change: Change): History {
  if (change.ops.length === 0) return history;
  const last = history.past.at(-1);
  if (last && history.future.length === 0 && continues(last, change)) {
    return { past: [...history.past.slice(0, -1), mergeChanges(last, change)], future: [] };
  }
  const past = [...history.past, change];
  return { past: past.slice(Math.max(0, past.length - HISTORY_LIMIT)), future: [] };
}

/** The result of an undo or redo. */
export interface HistoryStep {
  /** The document after the step. */
  readonly doc: PlanDocument;
  /** The stacks after the step. */
  readonly history: History;
  /** The change that was undone or redone, as recorded (not inverted). */
  readonly change: Change;
}

/** Reverts the latest change. Returns null when there is nothing to undo. */
export function undo(doc: PlanDocument, history: History): HistoryStep | null {
  const change = history.past.at(-1);
  if (!change) return null;
  return {
    doc: applyChange(doc, invertChange(change)),
    history: { past: history.past.slice(0, -1), future: [change, ...history.future] },
    change,
  };
}

/** Re-applies the most recently undone change. Returns null when there is nothing to redo. */
export function redo(doc: PlanDocument, history: History): HistoryStep | null {
  const change = history.future[0];
  if (!change) return null;
  return {
    doc: applyChange(doc, change),
    history: { past: [...history.past, change], future: history.future.slice(1) },
    change,
  };
}

const PATCHABLE_KEYS = [
  'kind',
  'name',
  'x',
  'y',
  'width',
  'height',
  'rotation',
  'tags',
  'groupId',
] as const satisfies readonly (keyof ItemPatch)[];

function sameValue(a: unknown, b: unknown): boolean {
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((v, i) => v === b[i]);
  }
  return a === b;
}

type PatchKey = (typeof PATCHABLE_KEYS)[number];

function pickFields(item: PlanItem, keys: readonly PatchKey[]): ItemPatch {
  return Object.fromEntries(keys.map((key) => [key, item[key]]));
}

/** Builds a minimal patch operation, or null when nothing changed. */
export function diffItem(before: PlanItem, after: PlanItem): Operation | null {
  const changed = PATCHABLE_KEYS.filter((key) => !sameValue(before[key], after[key]));
  if (changed.length === 0) return null;
  return {
    kind: 'patch',
    id: before.id,
    before: pickFields(before, changed),
    after: pickFields(after, changed),
  };
}

/** Patch operations for every item whose fields differ between two snapshots of the same ids. */
export function diffItems(before: readonly PlanItem[], after: readonly PlanItem[]): Operation[] {
  const afterById = new Map(after.map((item) => [item.id, item]));
  const ops: Operation[] = [];
  for (const prev of before) {
    const next = afterById.get(prev.id);
    if (!next) continue;
    const op = diffItem(prev, next);
    if (op) ops.push(op);
  }
  return ops;
}
