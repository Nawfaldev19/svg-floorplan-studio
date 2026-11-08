// Editor state hook: the core reducer plus debounced, validated autosave that
// never loses the last edit when the user leaves the editor or the page.
import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { createEditorState, editorReducer } from '../core/editor';
import { savePlan, STORAGE_KEY } from '../core/storage';
import type { PlanDocument } from '../core/types';
import { subscribe, usePageHandler } from '../shared/pageHandlers';
import { browserStore, loadInitialPlan, registerPendingSave } from '../shared/planStore';

const AUTOSAVE_DELAY_MS = 400;

/** What the status bar says about persistence. */
export type SaveStatus = 'saved' | 'saving' | 'error' | 'unavailable';

/**
 * The editor's state, dispatch and save status. Saving waits 400 ms after the
 * last change, and any pending save is written at once before the router
 * leaves the editor, when the editor unmounts, and when the page is hidden or
 * closed, so a last-moment edit is never lost.
 *
 * @returns `state` and `dispatch` from the reducer; `saveStatus`; `saveError`,
 *   the browser's message when the last write failed; `notice`, set when
 *   the saved plan could not be loaded at startup; and `otherTab`, true once
 *   another tab of the same site has saved the plan (the last save wins).
 */
export function useEditor() {
  const [store] = useState(browserStore);
  const [initial] = useState(() => loadInitialPlan(store));
  const [state, dispatch] = useReducer(editorReducer, initial.doc, createEditorState);
  const [lastSave, setLastSave] = useState<{ revision: number; error: string | null }>({
    revision: 0,
    error: null,
  });
  const latest = useRef<{ revision: number; doc: PlanDocument }>({ revision: 0, doc: initial.doc });
  const savedRevision = useRef(0);
  const [otherTab, setOtherTab] = useState(false);

  // Storage reports writes from other tabs only, never this tab's own saves.
  usePageHandler(window, 'onstorage', (change) => {
    if (change.key === STORAGE_KEY) setOtherTab(true);
  });

  const flush = useCallback(() => {
    const { revision, doc } = latest.current;
    if (!store || revision === savedRevision.current) return;
    savedRevision.current = revision;
    setLastSave({ revision, error: savePlan(store, doc) });
  }, [store]);

  useEffect(() => {
    latest.current = { revision: state.revision, doc: state.doc };
    if (state.revision === 0) return;
    const timer = window.setTimeout(flush, AUTOSAVE_DELAY_MS);
    return () => {
      window.clearTimeout(timer);
    };
  }, [state.revision, state.doc, flush]);

  useEffect(() => {
    const stops = [
      subscribe(window, 'onpagehide', flush),
      subscribe(document, 'onvisibilitychange', () => {
        if (document.visibilityState === 'hidden') flush();
      }),
      registerPendingSave(flush),
    ];
    return () => {
      for (const stop of stops) stop();
      flush();
    };
  }, [flush]);

  const saveStatus: SaveStatus = !store
    ? 'unavailable'
    : lastSave.error
      ? 'error'
      : lastSave.revision === state.revision || state.revision === 0
        ? 'saved'
        : 'saving';

  return {
    state,
    dispatch,
    saveStatus,
    saveError: lastSave.error,
    notice: initial.notice,
    otherTab,
  };
}
