// The editor's SVG canvas: culled item shapes, the selection overlay, the marquee and pointer gestures.
import { useId, useMemo, useRef, type Dispatch } from 'react';
import { visibleItems } from '../core/culling';
import type { EditorAction, EditorState } from '../core/editor';
import { boundsOf, unionOf } from '../core/geometry';
import { plural } from '../core/text';
import { visibleWorldBox, type Size, type Viewport } from '../core/viewport';
import { GridBackdrop } from '../plan/GridBackdrop';
import { PlanItemShape } from '../plan/PlanItemShape';
import { useWheelZoom } from '../plan/useWheelZoom';
import styles from './PlanCanvas.module.css';
import { SelectionOverlay } from './SelectionOverlay';
import { useCanvasGestures } from './useCanvasGestures';

interface PlanCanvasProps {
  /** Editor state. */
  readonly state: EditorState;
  /** Editor dispatch. */
  readonly dispatch: Dispatch<EditorAction>;
  /** The camera to draw with. */
  readonly viewport: Viewport;
  /** Applies a camera change (pan, pinch, wheel). */
  readonly updateViewport: (update: (vp: Viewport) => Viewport) => void;
  /** Size of the canvas in CSS pixels. */
  readonly size: Size;
  /** Space is held on the canvas: a drag pans, and the cursor says so. */
  readonly spaceHeld: boolean;
}

/**
 * The editable canvas. It has `role="application"` so screen readers pass
 * keys through, a role description and a hidden help text, and it renders
 * only the items inside the view (`data-rendered-items` reports how many).
 * Selection outlines are culled the same way. Escape while dragging drops the
 * drag.
 */
export function PlanCanvas({
  state,
  dispatch,
  viewport,
  updateViewport,
  size,
  spaceHeld,
}: PlanCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const helpId = useId();
  const gestures = useCanvasGestures({
    svgRef,
    state,
    dispatch,
    viewport,
    updateViewport,
    spaceHeld,
  });
  const { preview, marquee, painted } = gestures;
  useWheelZoom(svgRef, updateViewport, { panWithWheel: true });

  const items = useMemo(
    () => (preview ? state.doc.items.map((item) => preview.get(item.id) ?? item) : state.doc.items),
    [state.doc.items, preview],
  );
  const visible = useMemo(() => visibleWorldBox(viewport, size), [viewport, size]);
  const shown = useMemo(() => visibleItems(items, visible), [items, visible]);
  const selected = useMemo(() => {
    const wanted = new Set(state.selection);
    return items.filter((item) => wanted.has(item.id));
  }, [items, state.selection]);
  const selectedBounds = useMemo(() => unionOf(selected.map(boundsOf)), [selected]);
  // Outlines are culled like the items they belong to; the group box always covers the whole selection.
  const selectedShown = useMemo(() => visibleItems(selected, visible), [selected, visible]);

  const cursor = spaceHeld ? styles.panCursor : state.mode === 'tag' ? styles.paintCursor : '';

  return (
    <>
      <svg
        ref={svgRef}
        className={`${styles.canvas} ${cursor}`}
        role="application"
        aria-roledescription="floor plan canvas"
        aria-label={`${state.doc.title}: ${plural(state.doc.items.length, 'item')}`}
        aria-describedby={helpId}
        tabIndex={0}
        data-rendered-items={shown.length}
        width={size.width}
        height={size.height}
        onPointerDown={(e) => {
          e.currentTarget.focus({ preventScroll: true });
          gestures.down(e);
        }}
        onPointerMove={(e) => {
          gestures.move(e);
        }}
        onPointerUp={(e) => {
          gestures.up(e);
        }}
        onPointerCancel={(e) => {
          gestures.cancel(e);
        }}
        onContextMenu={(e) => {
          e.preventDefault();
        }}
        onKeyDown={(e) => {
          // Escape during a drag drops it; it must not also clear the selection.
          if (e.key === 'Escape' && gestures.abort()) {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
      >
        <g
          transform={`translate(${viewport.offsetX} ${viewport.offsetY}) scale(${viewport.scale})`}
        >
          <GridBackdrop visible={visible} scale={viewport.scale} />
          {shown.map((item) => (
            <PlanItemShape
              key={item.id}
              item={item}
              scale={viewport.scale}
              emphasized={painted.has(item.id)}
            />
          ))}
          <SelectionOverlay
            items={selected.length === 1 ? selected : selectedShown}
            bounds={selectedBounds}
            scale={viewport.scale}
          />
          {marquee && (
            <rect
              className={styles.marquee}
              x={marquee.minX}
              y={marquee.minY}
              width={marquee.maxX - marquee.minX}
              height={marquee.maxY - marquee.minY}
            />
          )}
        </g>
      </svg>
      <p id={helpId} className="visually-hidden">
        Arrow keys move the selection; Shift with an arrow moves it further. Delete removes it.
        Letter keys add items. Press question mark for every shortcut. Use the outline list to
        choose items without a pointer.
      </p>
    </>
  );
}
