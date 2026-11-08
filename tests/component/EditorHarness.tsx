import { useReducer } from 'react';
import { createEditorState, editorReducer } from '../../src/core/editor';
import type { PlanDocument } from '../../src/core/types';
import { FileMenu } from '../../src/editor/FileMenu';
import { useFileActions } from '../../src/editor/useFileActions';
import { Inspector } from '../../src/editor/Inspector';
import { OutlinePanel } from '../../src/editor/OutlinePanel';

/**
 * Renders real editor panels around the real reducer, so component tests
 * exercise the same state transitions as the app. Nothing is mocked.
 */
export function EditorHarness({ plan }: { plan: PlanDocument }) {
  const [state, dispatch] = useReducer(editorReducer, plan, createEditorState);
  const files = useFileActions({ doc: state.doc, dispatch, onReplaced: () => undefined });
  return (
    <div>
      <p data-testid="title">{state.doc.title}</p>
      <p data-testid="count">{state.doc.items.length}</p>
      <p data-testid="history">{state.history.past.map((c) => c.label).join(' | ')}</p>
      <button
        type="button"
        onClick={() => {
          dispatch({ type: 'undo' });
        }}
      >
        Undo for test
      </button>
      <FileMenu actions={files} showLabels />
      {files.elements}
      <Inspector state={state} dispatch={dispatch} />
      <div style={{ height: 300, display: 'flex' }}>
        <OutlinePanel state={state} dispatch={dispatch} />
      </div>
    </div>
  );
}
