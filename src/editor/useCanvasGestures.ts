// Pointer gestures on the editor canvas, previewed outside the document and committed once on release.
import { useCallback, useRef, useState, type Dispatch, type RefObject } from 'react';
import type { EditorAction, EditorState } from '../core/editor';
import { boxFromPoints, distance, type Box, type Point } from '../core/geometry';
import { expandToGroups, hitTest, itemsInsideBox } from '../core/selection';
import { plural } from '../core/text';
import { isHandle, moveItems, resizeItem, rotateItem, type Handle } from '../core/transform';
import type { ItemId, PlanDocument, PlanItem } from '../core/types';
import { panBy, pinchViewport, screenToWorld, type Viewport } from '../core/viewport';

/**
 * The fields of a browser pointer report that gestures need. React's synthetic
 * pointer objects satisfy this shape, which keeps the hook easy to drive in tests.
 */
export interface PointerSample {
  /** Identifies the pointer across down, move and up. */
  readonly pointerId: number;
  /** `mouse`, `pen` or `touch`; touch on empty space pans instead of drawing a marquee. */
  readonly pointerType: string;
  /** 0 primary, 1 middle; other buttons are ignored. */
  readonly button: number;
  /** Viewport x in CSS pixels. */
  readonly clientX: number;
  /** Viewport y in CSS pixels. */
  readonly clientY: number;
  /** Shift: toggle selection, keep proportions, snap rotation. */
  readonly shiftKey: boolean;
  /** Alt: pick one group member, move or resize without snapping. */
  readonly altKey: boolean;
  /** The element under the pointer, used to find a resize handle. */
  readonly target: unknown;
}

/** Gestures that edit items remember the document they started from. */
type EditGesture =
  | {
      readonly kind: 'move';
      readonly doc: PlanDocument;
      readonly startWorld: Point;
      readonly startScreen: Point;
      readonly anchor: PlanItem;
      readonly originals: readonly PlanItem[];
      /** Screen distance the pointer must travel before the press becomes a drag. */
      readonly threshold: number;
      /** Selection to fall back to if the press turns out to be a click, not a drag. */
      readonly clickSelects: readonly ItemId[] | null;
      /** Set once the pointer has moved; a press without movement changes nothing. */
      active: boolean;
    }
  | {
      readonly kind: 'resize';
      readonly doc: PlanDocument;
      readonly handle: Handle;
      readonly original: PlanItem;
      active: boolean;
    }
  | {
      readonly kind: 'rotate';
      readonly doc: PlanDocument;
      readonly original: PlanItem;
      active: boolean;
    };

type Gesture =
  | EditGesture
  | { readonly kind: 'pan'; last: Point }
  | { readonly kind: 'pinch' }
  | {
      readonly kind: 'marquee';
      readonly startWorld: Point;
      readonly base: readonly ItemId[];
      /** Set on the first move. Kept on the gesture, not in render state, so a press, move and release within one frame still selects. */
      moved: boolean;
    }
  | { readonly kind: 'paint'; readonly ids: ItemId[] };

interface Preview {
  /** The document the preview was computed against; a different one means it is stale. */
  readonly doc: PlanDocument;
  readonly items: ReadonlyMap<ItemId, PlanItem>;
}

/** Screen distance a press must travel before it counts as a drag rather than a click. */
const DRAG_THRESHOLD_PX = 3;
/** A fingertip wobbles more than a mouse, so a tap needs more room before it moves an item. */
const TOUCH_DRAG_THRESHOLD_PX = 8;
const HIT_TOLERANCE_PX = 6;
const ROTATE_SNAP_DEGREES = 15;
const PRIMARY_BUTTON = 0;
const MIDDLE_BUTTON = 1;

/** Inputs to {@link useCanvasGestures}. */
export interface CanvasGestureOptions {
  /** The canvas SVG, used for coordinates and pointer capture. */
  readonly svgRef: RefObject<SVGSVGElement | null>;
  /** Editor state at this render. */
  readonly state: EditorState;
  /** Editor dispatch; receives at most one edit per gesture. */
  readonly dispatch: Dispatch<EditorAction>;
  /** The camera, for screen-to-world conversion. */
  readonly viewport: Viewport;
  /** Applies a camera change while panning or pinching. */
  readonly updateViewport: (update: (vp: Viewport) => Viewport) => void;
  /** Space is held, so a primary-button drag pans. */
  readonly spaceHeld: boolean;
}

function handleFromTarget(target: unknown): Handle | 'rotate' | null {
  if (!(target instanceof Element)) return null;
  const value = target.closest('[data-handle]')?.getAttribute('data-handle') ?? null;
  if (value === 'rotate') return 'rotate';
  return isHandle(value) ? value : null;
}

/** The items an edit gesture would produce for this pointer sample. */
function editResult(current: EditGesture, world: Point, sample: PointerSample, grid: number) {
  switch (current.kind) {
    case 'move': {
      const delta = { x: world.x - current.startWorld.x, y: world.y - current.startWorld.y };
      return moveItems(current.originals, current.anchor, delta, sample.altKey ? null : grid);
    }
    case 'resize':
      return [
        resizeItem(current.original, current.handle, world, {
          keepAspect: sample.shiftKey,
          snapStep: sample.altKey ? null : grid,
        }),
      ];
    case 'rotate':
      return [rotateItem(current.original, world, sample.shiftKey ? ROTATE_SNAP_DEGREES : null)];
  }
}

function isEdit(gesture: Gesture): gesture is EditGesture {
  return gesture.kind === 'move' || gesture.kind === 'resize' || gesture.kind === 'rotate';
}

/**
 * Pointer gestures for the editor canvas: move, resize, rotate, marquee,
 * tag painting, pan and two-finger pinch. Work in progress is shown as a
 * preview; the document changes once, on release, so one drag is one undo step.
 * If the document changes underneath a drag (a keyboard delete or undo while
 * the button is held), the drag is dropped instead of committing stale items;
 * Escape drops it on purpose (`abort`).
 *
 * @returns Handlers for the SVG's pointer props, `abort` for Escape, plus `preview` (item
 *   overrides to draw), `marquee` (the box being dragged) and `painted` (items
 *   in the current brush stroke).
 * @see docs/adr/0004-preview-gestures-outside-the-document.md
 */
export function useCanvasGestures({
  svgRef,
  state,
  dispatch,
  viewport,
  updateViewport,
  spaceHeld,
}: CanvasGestureOptions) {
  const gesture = useRef<Gesture | null>(null);
  const pointers = useRef(new Map<number, Point>());
  /** The two touch points at the previous pinch sample. */
  const pinchFrom = useRef<readonly [Point, Point] | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [marquee, setMarquee] = useState<Box | null>(null);
  const [painted, setPainted] = useState<ReadonlySet<ItemId>>(new Set());

  const { doc, selection, mode } = state;
  const grid = doc.gridSize;

  const toScreen = useCallback(
    (sample: PointerSample): Point => {
      const rect = svgRef.current?.getBoundingClientRect();
      return { x: sample.clientX - (rect?.left ?? 0), y: sample.clientY - (rect?.top ?? 0) };
    },
    [svgRef],
  );

  const reset = useCallback(() => {
    gesture.current = null;
    setPreview(null);
    setMarquee(null);
    setPainted(new Set());
  }, []);

  const down = useCallback(
    (sample: PointerSample) => {
      // Right-clicks and extra buttons do nothing; a third finger never interrupts a pinch.
      if (sample.button !== PRIMARY_BUTTON && sample.button !== MIDDLE_BUTTON) return;
      if (gesture.current?.kind === 'pinch') return;

      const screen = toScreen(sample);
      pointers.current.set(sample.pointerId, screen);
      svgRef.current?.setPointerCapture(sample.pointerId);

      if (pointers.current.size === 2) {
        const [a, b] = [...pointers.current.values()] as [Point, Point];
        pinchFrom.current = [a, b];
        setPreview(null);
        setMarquee(null);
        gesture.current = { kind: 'pinch' };
        return;
      }

      const world = screenToWorld(viewport, screen);
      if (sample.button === MIDDLE_BUTTON || spaceHeld) {
        gesture.current = { kind: 'pan', last: screen };
        return;
      }

      const handle = handleFromTarget(sample.target);
      const single =
        selection.length === 1 ? doc.items.find((i) => i.id === selection[0]) : undefined;
      if (handle && single) {
        gesture.current =
          handle === 'rotate'
            ? { kind: 'rotate', doc, original: single, active: false }
            : { kind: 'resize', doc, handle, original: single, active: false };
        return;
      }

      const hit = hitTest(doc, world, HIT_TOLERANCE_PX / viewport.scale);

      // Empty canvas on a touch screen: one finger pans, in either mode.
      if (!hit && sample.pointerType === 'touch') {
        gesture.current = { kind: 'pan', last: screen };
        return;
      }

      if (mode === 'tag') {
        const ids = hit ? [hit.id] : [];
        gesture.current = { kind: 'paint', ids };
        setPainted(new Set(ids));
        return;
      }

      if (hit) {
        if (sample.shiftKey) {
          dispatch({ type: 'toggle', id: hit.id, exact: sample.altKey });
          gesture.current = null;
          return;
        }
        const own = sample.altKey ? [hit.id] : expandToGroups(doc, [hit.id]);
        const alreadySelected = selection.includes(hit.id);
        const ids = alreadySelected ? selection : own;
        if (!alreadySelected) dispatch({ type: 'select', ids, exact: true });
        const wanted = new Set(ids);
        gesture.current = {
          kind: 'move',
          doc,
          startWorld: world,
          startScreen: screen,
          anchor: hit,
          originals: doc.items.filter((item) => wanted.has(item.id)),
          threshold: sample.pointerType === 'touch' ? TOUCH_DRAG_THRESHOLD_PX : DRAG_THRESHOLD_PX,
          // Pressing an item inside a larger selection keeps the selection so it
          // can be dragged; releasing without dragging narrows it to that item.
          clickSelects: alreadySelected && own.length < selection.length ? own : null,
          active: false,
        };
        return;
      }

      // Empty canvas with a mouse or pen: draw a marquee.
      if (!sample.shiftKey) dispatch({ type: 'clearSelection' });
      gesture.current = {
        kind: 'marquee',
        startWorld: world,
        base: sample.shiftKey ? selection : [],
        moved: false,
      };
    },
    [toScreen, svgRef, viewport, spaceHeld, selection, doc, mode, dispatch],
  );

  const move = useCallback(
    (sample: PointerSample) => {
      if (!pointers.current.has(sample.pointerId)) return;
      const screen = toScreen(sample);
      pointers.current.set(sample.pointerId, screen);
      const current = gesture.current;
      if (!current) return;
      const world = screenToWorld(viewport, screen);

      if (isEdit(current)) {
        if (current.doc !== doc) {
          reset();
          return;
        }
        if (
          current.kind === 'move' &&
          !current.active &&
          distance(screen, current.startScreen) < current.threshold
        ) {
          return;
        }
        current.active = true;
        const result = editResult(current, world, sample, grid);
        setPreview({ doc, items: new Map(result.map((item) => [item.id, item])) });
        return;
      }

      switch (current.kind) {
        case 'pinch': {
          const from = pinchFrom.current;
          const [a, b] = [...pointers.current.values()];
          if (!from || !a || !b) return;
          const to = [a, b] as const;
          updateViewport((vp) => pinchViewport(vp, from, to));
          pinchFrom.current = to;
          return;
        }
        case 'pan': {
          const dx = screen.x - current.last.x;
          const dy = screen.y - current.last.y;
          current.last = screen;
          updateViewport((vp) => panBy(vp, dx, dy));
          return;
        }
        case 'marquee':
          current.moved = true;
          setMarquee(boxFromPoints([current.startWorld, world]));
          return;
        case 'paint': {
          const hit = hitTest(doc, world, HIT_TOLERANCE_PX / viewport.scale);
          if (hit && !current.ids.includes(hit.id)) {
            current.ids.push(hit.id);
            setPainted(new Set(current.ids));
          }
          return;
        }
      }
    },
    [toScreen, viewport, updateViewport, grid, doc, reset],
  );

  const up = useCallback(
    (sample: PointerSample) => {
      if (!pointers.current.delete(sample.pointerId)) return;
      if (svgRef.current?.hasPointerCapture(sample.pointerId)) {
        svgRef.current.releasePointerCapture(sample.pointerId);
      }
      const current = gesture.current;
      if (current?.kind === 'pinch') {
        // Wait until every finger has lifted before starting anything new.
        if (pointers.current.size === 0) reset();
        return;
      }
      if (!current) return;
      const world = screenToWorld(viewport, toScreen(sample));

      if (isEdit(current) && current.doc === doc) {
        if (!current.active) {
          if (current.kind === 'move' && current.clickSelects) {
            dispatch({ type: 'select', ids: current.clickSelects, exact: true });
          }
        } else {
          // Commit what this final sample produces, not the last rendered preview.
          const after = editResult(current, world, sample, grid);
          const before = current.kind === 'move' ? current.originals : [current.original];
          const label =
            current.kind === 'move'
              ? `Move ${plural(after.length, 'item')}`
              : `${current.kind === 'resize' ? 'Resize' : 'Rotate'} ${current.original.name}`;
          dispatch({ type: 'commitItems', label, before, after });
        }
      } else if (current.kind === 'marquee' && current.moved) {
        const box = boxFromPoints([current.startWorld, world]);
        const tooSmall =
          (box.maxX - box.minX) * viewport.scale < DRAG_THRESHOLD_PX &&
          (box.maxY - box.minY) * viewport.scale < DRAG_THRESHOLD_PX;
        if (!tooSmall) {
          dispatch({ type: 'select', ids: [...current.base, ...itemsInsideBox(doc, box)] });
        }
      } else if (current.kind === 'paint' && current.ids.length > 0) {
        dispatch({ type: 'paintTag', ids: current.ids });
      }
      reset();
    },
    [svgRef, toScreen, viewport, doc, grid, dispatch, reset],
  );

  const cancel = useCallback(
    (sample: PointerSample) => {
      pointers.current.delete(sample.pointerId);
      reset();
    },
    [reset],
  );

  /**
   * Drops the gesture in progress (Escape while dragging), so releasing the
   * pointer afterwards changes nothing. Panning and pinching are camera moves
   * and are left alone.
   *
   * @returns Whether an edit, marquee or brush stroke was dropped.
   */
  const abort = useCallback((): boolean => {
    const current = gesture.current;
    if (!current || current.kind === 'pan' || current.kind === 'pinch') return false;
    reset();
    return true;
  }, [reset]);

  return {
    down,
    move,
    up,
    cancel,
    abort,
    // A preview computed against an older document is never shown.
    preview: preview?.doc === doc ? preview.items : null,
    marquee,
    painted,
  };
}
