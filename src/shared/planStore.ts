// Bridge between the browser's localStorage and the core storage helpers:
// safe access, the startup load with its fallback notice, and pending-save flushing.
import { createDemoPlan } from '../core/seed';
import { BACKUP_KEY, backUpUnreadablePlan, loadPlan, type KeyValueStore } from '../core/storage';
import type { PlanDocument } from '../core/types';

/** Web Storage can throw on access (privacy modes, sandboxed frames); fall back to no persistence. */
export function browserStore(): KeyValueStore | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

const pendingSaves = new Set<() => void>();

/**
 * Registers a function that writes any unsaved edit. The router calls every
 * registered function before it switches views, so the next view reads the
 * latest plan from storage. Returns the function that unregisters it.
 */
export function registerPendingSave(flush: () => void): () => void {
  pendingSaves.add(flush);
  return () => {
    pendingSaves.delete(flush);
  };
}

/** Runs every function registered with {@link registerPendingSave}, writing unsaved edits now. */
export function flushPendingSaves(): void {
  for (const flush of pendingSaves) flush();
}

interface InitialPlan {
  /** The plan to open. */
  readonly doc: PlanDocument;
  /** A message to show when the saved plan could not be used, otherwise null. */
  readonly notice: string | null;
}

/**
 * The plan to open at startup: the saved plan if it is valid, otherwise the demo plan.
 *
 * @param store - Web Storage, or null when the browser blocks it.
 * @remarks
 * A saved plan that fails validation is first copied to `BACKUP_KEY`, so the
 * first autosave of the demo plan cannot destroy it.
 */
export function loadInitialPlan(store: KeyValueStore | null): InitialPlan {
  if (!store) {
    return {
      doc: createDemoPlan(),
      notice: 'Browser storage is unavailable, so changes will not be kept.',
    };
  }
  const result = loadPlan(store);
  switch (result.status) {
    case 'loaded':
      return { doc: result.document, notice: null };
    case 'empty':
      return { doc: createDemoPlan(), notice: null };
    case 'corrupt':
      return {
        doc: createDemoPlan(),
        notice: backUpUnreadablePlan(store)
          ? `Your saved plan could not be read, so the demo plan was loaded instead. The unreadable copy is kept in this browser's storage under “${BACKUP_KEY}”.`
          : 'Your saved plan could not be read, so the demo plan was loaded instead.',
      };
  }
}
