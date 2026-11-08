import { useCallback, useReducer, useState } from 'react';
import { describe, expect, it } from 'vitest';
import { renderHook } from 'vitest-browser-react';
import { createEditorState, editorReducer, type EditorState } from '../../src/core/editor';
import { CURRENT_SCHEMA_VERSION, type PlanDocument, type PlanItem } from '../../src/core/types';
import { IDENTITY_VIEWPORT, type Viewport } from '../../src/core/viewport';
import { useCanvasGestures, type PointerSample } from '../../src/editor/useCanvasGestures';

// Drives the gesture hook through PointerSample objects, with the real reducer
// and a 1:1 camera (one screen pixel is one centimetre), so each rule of a
// drag can be checked without synthesising browser input.

const desk = (id: string, x: number, y: number): PlanItem => ({
  id,
  kind: 'desk',
  name: id,
  x,
  y,
  width: 100,
  height: 50,
  rotation: 0,
  tags: [],
  groupId: null,
});

const plan: PlanDocument = {
  schemaVersion: CURRENT_SCHEMA_VERSION,
  title: 'Gestures',
  gridSize: 10,
  items: [desk('item-1', 100, 100), desk('item-2', 400, 100)],
  groups: [],
};

function sample(at: { x: number; y: number }, extra: Partial<PointerSample> = {}): PointerSample {
  return {
    pointerId: 1,
    pointerType: 'mouse',
    button: 0,
    clientX: at.x,
    clientY: at.y,
    shiftKey: false,
    altKey: false,
    target: null,
    ...extra,
  };
}

async function setup(initial: (doc: PlanDocument) => EditorState = createEditorState) {
  const { result, act } = await renderHook(() => {
    const [state, dispatch] = useReducer(editorReducer, plan, initial);
    const [viewport, setViewport] = useState<Viewport>(IDENTITY_VIEWPORT);
    const updateViewport = useCallback((update: (vp: Viewport) => Viewport) => {
      setViewport(update);
    }, []);
    const gestures = useCanvasGestures({
      svgRef: { current: null },
      state,
      dispatch,
      viewport,
      updateViewport,
      spaceHeld: false,
    });
    return { state, viewport, gestures };
  });
  const current = () => result.current;
  /** Runs one handler call and lets React render, as separate browser reports would. */
  const step = (fn: (g: ReturnType<typeof current>['gestures']) => void) =>
    act(() => {
      fn(current().gestures);
      return Promise.resolve();
    });
  return { current, step, act };
}

describe('useCanvasGestures', () => {
  it('treats a press that moves less than the threshold as a click, and a longer drag as one snapped move', async () => {
    const { current, step } = await setup();
    await step((g) => {
      g.down(sample({ x: 100, y: 100 }));
    });
    await step((g) => {
      g.move(sample({ x: 102, y: 100 }));
    });
    expect(current().gestures.preview).toBeNull();
    await step((g) => {
      g.up(sample({ x: 102, y: 100 }));
    });
    expect(current().state.selection).toEqual(['item-1']);
    expect(current().state.history.past).toHaveLength(0);

    await step((g) => {
      g.down(sample({ x: 100, y: 100 }));
    });
    await step((g) => {
      g.move(sample({ x: 133, y: 100 }));
    });
    expect(current().gestures.preview?.get('item-1')?.x).toBe(130);
    await step((g) => {
      g.up(sample({ x: 137, y: 104 }));
    });
    const moved = current().state.doc.items[0];
    expect([moved?.x, moved?.y]).toEqual([140, 100]);
    expect(current().state.history.past.map((c) => c.label)).toEqual(['Move 1 item']);
  });

  it('resizes from a handle with the opposite corner fixed', async () => {
    const { current, step } = await setup((doc) => ({
      ...createEditorState(doc),
      selection: ['item-1'],
    }));
    const handle = document.createElement('div');
    handle.dataset.handle = 'se';
    await step((g) => {
      g.down(sample({ x: 150, y: 125 }, { target: handle }));
    });
    await step((g) => {
      g.move(sample({ x: 190, y: 145 }));
    });
    await step((g) => {
      g.up(sample({ x: 190, y: 145 }));
    });
    const resized = current().state.doc.items[0];
    expect(resized).toMatchObject({ width: 140, height: 70, x: 120, y: 110 });
  });

  it('pinches with two fingers without editing, and ignores a third finger', async () => {
    const { current, step } = await setup();
    const touch = (pointerId: number, x: number, y: number) =>
      sample({ x, y }, { pointerId, pointerType: 'touch' });
    await step((g) => {
      g.down(touch(1, 200, 300));
    });
    await step((g) => {
      g.down(touch(2, 300, 300));
    });
    await step((g) => {
      g.down(touch(3, 250, 400));
    });
    await step((g) => {
      g.move(touch(2, 400, 300));
    });
    expect(current().viewport.scale).toBeCloseTo(2);
    await step((g) => {
      g.up(touch(3, 250, 400));
    });
    await step((g) => {
      g.up(touch(2, 400, 300));
    });
    await step((g) => {
      g.up(touch(1, 200, 300));
    });
    expect(current().state.history.past).toHaveLength(0);
    expect(current().state.doc).toBe(plan);
  });

  it('drops a drag on abort (Escape), so the release changes nothing', async () => {
    const { current, step } = await setup();
    await step((g) => {
      g.down(sample({ x: 400, y: 100 }));
    });
    await step((g) => {
      g.move(sample({ x: 480, y: 160 }));
    });
    expect(current().gestures.preview).not.toBeNull();
    let dropped = false;
    await step((g) => {
      dropped = g.abort();
    });
    expect(dropped).toBe(true);
    expect(current().gestures.preview).toBeNull();
    await step((g) => {
      g.up(sample({ x: 480, y: 160 }));
    });
    expect(current().state.doc).toBe(plan);
    expect(current().gestures.abort()).toBe(false);
  });

  it('selects with a marquee even when press, move and release land in the same frame', async () => {
    const { current, act } = await setup();
    await act(() => {
      const g = current().gestures;
      g.down(sample({ x: 0, y: 0 }));
      g.move(sample({ x: 500, y: 200 }));
      g.up(sample({ x: 500, y: 200 }));
      return Promise.resolve();
    });
    expect(current().state.selection).toEqual(['item-1', 'item-2']);
  });

  it('pans with one finger on empty space in the tag brush, painting nothing', async () => {
    const { current, step } = await setup((doc) => ({ ...createEditorState(doc), mode: 'tag' }));
    const touch = (x: number, y: number) => sample({ x, y }, { pointerType: 'touch' });
    await step((g) => {
      g.down(touch(700, 500));
    });
    await step((g) => {
      g.move(touch(760, 520));
    });
    await step((g) => {
      g.up(touch(760, 520));
    });
    expect(current().viewport).toMatchObject({ offsetX: 60, offsetY: 20 });
    expect(current().state.history.past).toHaveLength(0);
  });
});
