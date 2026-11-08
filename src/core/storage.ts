/**
 * Persistence in Web Storage. Reads go through the import validator, writes
 * are validated first, and an unreadable saved plan is copied aside before
 * anything can replace it. Nothing here throws.
 *
 * @see docs/adr/0009-editor-enforces-file-format-limits.md
 * @packageDocumentation
 */
import { parseDocument, serializeDocument } from './document';
import type { PlanDocument } from './types';

/** The `localStorage` key that holds the autosaved plan. */
export const STORAGE_KEY = 'floorplan-studio.plan';
/** Where an unreadable saved plan is copied before anything can overwrite it. */
export const BACKUP_KEY = 'floorplan-studio.plan.unreadable';

/** The subset of the Web Storage API used here, so tests can pass an in-memory stand-in. */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** Outcome of {@link loadPlan}. */
export type LoadResult =
  | { readonly status: 'empty' }
  | { readonly status: 'loaded'; readonly document: PlanDocument }
  | { readonly status: 'corrupt'; readonly errors: readonly string[] };

/**
 * Reads and validates the saved plan.
 *
 * @remarks
 * Storage content is treated as untrusted (it can be edited in developer tools
 * or by another script on the origin), so it goes through the same
 * {@link parseDocument} as an imported file. A storage access error is
 * reported as `corrupt` rather than thrown.
 */
export function loadPlan(store: KeyValueStore): LoadResult {
  let text: string | null;
  try {
    text = store.getItem(STORAGE_KEY);
  } catch (error) {
    return { status: 'corrupt', errors: [`Storage is unavailable: ${String(error)}`] };
  }
  if (text === null) return { status: 'empty' };
  const result = parseDocument(text);
  return result.ok
    ? { status: 'loaded', document: result.document }
    : { status: 'corrupt', errors: result.errors };
}

/**
 * Saves the plan and returns an error message instead of throwing, for example
 * when the quota is exceeded. The text is checked with the same parser that
 * loads it, so a plan the loader would reject is never written over a good one.
 *
 * @returns Null on success, otherwise a message for the status bar.
 */
export function savePlan(store: KeyValueStore, doc: PlanDocument): string | null {
  const text = serializeDocument(doc);
  const check = parseDocument(text);
  if (!check.ok) return `The plan breaks the file format (${check.errors.join('; ')})`;
  try {
    store.setItem(STORAGE_KEY, text);
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

/**
 * Copies an unreadable saved plan to `BACKUP_KEY`, so the first autosave of the
 * replacement plan does not destroy it. Returns whether a copy was made.
 */
export function backUpUnreadablePlan(store: KeyValueStore): boolean {
  try {
    const text = store.getItem(STORAGE_KEY);
    if (text === null) return false;
    store.setItem(BACKUP_KEY, text);
    return true;
  } catch {
    return false;
  }
}
