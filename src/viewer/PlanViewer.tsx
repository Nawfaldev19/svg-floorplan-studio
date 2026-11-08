// The embeddable, read-only plan viewer: amenity highlighting, picking, culling,
// and keyboard navigation between items with a roving tabindex.
import { Maximize, ZoomIn, ZoomOut } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AMENITY_SPECS, KIND_SPECS } from '../core/catalog';
import { fitItems, visibleItems } from '../core/culling';
import type { Point } from '../core/geometry';
import { hitTest, readingOrder } from '../core/selection';
import {
  AMENITY_TAGS,
  type AmenityTag,
  type ItemId,
  type PlanDocument,
  type PlanItem,
} from '../core/types';
import {
  panBy,
  pinchViewport,
  screenToWorld,
  visibleWorldBox,
  worldToScreen,
  zoomAt,
  type Viewport,
} from '../core/viewport';
import { GridBackdrop } from '../plan/GridBackdrop';
import { PlanItemShape } from '../plan/PlanItemShape';
import { Swatch } from '../plan/Swatch';
import { useWheelZoom } from '../plan/useWheelZoom';
import { Button } from '../shared/Button';
import { useElementSize } from '../shared/useElementSize';
import styles from './PlanViewer.module.css';

/** Props of {@link PlanViewer}. The host owns the selection and the highlight (controlled component). */
export interface PlanViewerProps {
  /** The plan to show. Pass a validated document, for example from `parseDocument`. */
  readonly plan: PlanDocument;
  /** Amenity to emphasise; every other item is dimmed. */
  readonly highlight: AmenityTag | null;
  /** Called when a legend button is pressed; null clears the highlight. */
  readonly onHighlightChange: (tag: AmenityTag | null) => void;
  /** The item shown as selected, or null. */
  readonly selectedId: ItemId | null;
  /** Called when an item is clicked or activated with Enter or Space; null for a click on empty space or a wall. */
  readonly onSelect: (item: PlanItem | null) => void;
}

function describe(item: PlanItem): string {
  const tags = item.tags.map((t) => AMENITY_SPECS[t].label.toLowerCase());
  return `${item.name}, ${KIND_SPECS[item.kind].label.toLowerCase()}${tags.length ? `, ${tags.join(', ')}` : ''}`;
}

const CLICK_SLOP_PX = 4;
const PAN_STEP_PX = 80;
const ZOOM_STEP = 1.25;
/** Keep a focused item at least this far inside the edges; otherwise centre it. */
const EDGE_MARGIN_PX = 40;

const NAVIGATION: Readonly<Record<string, (index: number, count: number) => number>> = {
  ArrowRight: (i, n) => Math.min(i + 1, n - 1),
  ArrowDown: (i, n) => Math.min(i + 1, n - 1),
  ArrowLeft: (i) => Math.max(i - 1, 0),
  ArrowUp: (i) => Math.max(i - 1, 0),
  Home: () => 0,
  End: (_, n) => n - 1,
};

const PAN: Readonly<Record<string, readonly [number, number]>> = {
  ArrowRight: [-PAN_STEP_PX, 0],
  ArrowLeft: [PAN_STEP_PX, 0],
  ArrowDown: [0, -PAN_STEP_PX],
  ArrowUp: [0, PAN_STEP_PX],
};

/**
 * Read-only, embeddable plan. It owns its own zoom and pan; the host owns
 * which item is selected and which amenity is highlighted.
 *
 * The items form one Tab stop (roving tabindex). Arrow keys move between them
 * in reading order and the view follows, so every item stays reachable after
 * zooming in. The focused item is never culled, and a new `plan` never leaves
 * the plan without a Tab stop. Shift+arrows pan and + / − zoom, so the whole
 * view also works without a pointer. On touch screens one finger pans, two
 * fingers pinch to zoom, and while the whole plan is in view a vertical swipe
 * scrolls the page instead.
 *
 * @example
 * ```tsx
 * const [highlight, setHighlight] = useState<AmenityTag | null>(null);
 * const [picked, setPicked] = useState<PlanItem | null>(null);
 * <PlanViewer
 *   plan={plan}
 *   highlight={highlight}
 *   onHighlightChange={setHighlight}
 *   selectedId={picked?.id ?? null}
 *   onSelect={setPicked}
 * />;
 * ```
 *
 * @see docs/reference/features.md (F-13, F-14)
 */
export function PlanViewer({
  plan,
  highlight,
  onHighlightChange,
  selectedId,
  onSelect,
}: PlanViewerProps) {
  const wrap = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const itemRefs = useRef(new Map<ItemId, SVGGElement>());
  const size = useElementSize(wrap);
  const [viewport, setViewport] = useState<Viewport | null>(null);
  const [currentId, setCurrentId] = useState<ItemId | null>(null);
  const [focusRequest, setFocusRequest] = useState(0);
  /** One-finger or mouse press: a click unless it moves, then a pan. */
  const press = useRef<{ start: Point; last: Point; moved: boolean } | null>(null);
  /** Every pointer that is down, in canvas pixels. */
  const pointers = useRef(new Map<number, Point>());
  /** The two touch points at the previous pinch sample, while two fingers are down. */
  const pinchFrom = useRef<readonly [Point, Point] | null>(null);

  const fitted = useMemo(() => fitItems(plan.items, size, 24), [plan.items, size]);
  const vp = viewport ?? fitted;
  const updateViewport = useCallback(
    (update: (current: Viewport) => Viewport) => {
      setViewport((current) => update(current ?? fitted));
    },
    [fitted],
  );
  useWheelZoom(svgRef, updateViewport, { panWithWheel: false });

  const order = useMemo(() => readingOrder(plan.items), [plan.items]);
  // A remembered or host-selected id can vanish when the host passes a new plan;
  // fall back to the first item so the plan always keeps a Tab stop.
  const tabStop =
    [currentId, selectedId].find((id) => id !== null && order.some((item) => item.id === id)) ??
    order[0]?.id ??
    null;

  const visible = useMemo(() => visibleWorldBox(vp, size), [vp, size]);
  const shown = useMemo(
    () => visibleItems(plan.items, visible, tabStop),
    [plan.items, visible, tabStop],
  );
  const center = { x: size.width / 2, y: size.height / 2 };
  const matchCount = highlight ? plan.items.filter((i) => i.tags.includes(highlight)).length : 0;

  // Focus the item the keyboard moved to, after it has been rendered.
  useEffect(() => {
    if (focusRequest > 0 && currentId) itemRefs.current.get(currentId)?.focus();
  }, [focusRequest, currentId]);

  const moveTo = (item: PlanItem) => {
    const at = worldToScreen(vp, item);
    const inside =
      at.x > EDGE_MARGIN_PX &&
      at.y > EDGE_MARGIN_PX &&
      at.x < size.width - EDGE_MARGIN_PX &&
      at.y < size.height - EDGE_MARGIN_PX;
    if (!inside) setViewport(panBy(vp, center.x - at.x, center.y - at.y));
    setCurrentId(item.id);
    setFocusRequest((n) => n + 1);
  };

  return (
    <div className={styles.viewer}>
      <div className={styles.legend} role="group" aria-label="Highlight an amenity">
        {AMENITY_TAGS.map((tag) => (
          <button
            key={tag}
            type="button"
            className={styles.chip}
            aria-pressed={highlight === tag}
            onClick={() => {
              onHighlightChange(highlight === tag ? null : tag);
            }}
          >
            <Swatch tag={tag} />
            {AMENITY_SPECS[tag].label}
          </button>
        ))}
      </div>
      <p className={styles.summary} aria-live="polite">
        {highlight
          ? `${matchCount} of ${plan.items.length} items offer “${AMENITY_SPECS[highlight].label}”.`
          : `${plan.items.length} items. Choose an amenity to highlight it.`}
      </p>
      <div ref={wrap} className={styles.stage}>
        <svg
          ref={svgRef}
          className={styles.canvas}
          width={size.width}
          height={size.height}
          role="group"
          aria-label={`${plan.title} plan. Arrow keys move between items, Enter shows one, Shift with an arrow pans, plus and minus zoom.`}
          data-rendered-items={shown.length}
          // While the whole plan is in view there is nothing to pan vertically,
          // so a vertical swipe may scroll the page (see PlanViewer.module.css).
          data-fitted={viewport === null ? '' : undefined}
          onKeyDown={(e) => {
            if (e.key === '+' || e.key === '=' || e.key === '-') {
              e.preventDefault();
              setViewport(zoomAt(vp, center, e.key === '-' ? 1 / ZOOM_STEP : ZOOM_STEP));
              return;
            }
            const pan = PAN[e.key];
            if (pan && e.shiftKey) {
              e.preventDefault();
              setViewport(panBy(vp, pan[0], pan[1]));
              return;
            }
            const step = NAVIGATION[e.key];
            if (!step || order.length === 0) return;
            e.preventDefault();
            const index = Math.max(
              0,
              order.findIndex((item) => item.id === tabStop),
            );
            const next = order[step(index, order.length)];
            if (next) moveTo(next);
          }}
          onPointerDown={(e) => {
            if (e.button !== 0) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const p = { x: e.clientX - rect.left, y: e.clientY - rect.top };
            pointers.current.set(e.pointerId, p);
            e.currentTarget.setPointerCapture(e.pointerId);
            if (pointers.current.size === 2) {
              // A second finger turns the press into a pinch; a third is ignored.
              const [a, b] = [...pointers.current.values()] as [Point, Point];
              pinchFrom.current = [a, b];
              press.current = null;
            } else if (pointers.current.size === 1) {
              press.current = { start: p, last: p, moved: false };
            }
          }}
          onPointerMove={(e) => {
            if (!pointers.current.has(e.pointerId)) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const p = { x: e.clientX - rect.left, y: e.clientY - rect.top };
            pointers.current.set(e.pointerId, p);
            const from = pinchFrom.current;
            if (from) {
              const [a, b] = [...pointers.current.values()];
              if (!a || !b) return;
              const to = [a, b] as const;
              updateViewport((v) => pinchViewport(v, from, to));
              pinchFrom.current = to;
              return;
            }
            const current = press.current;
            if (!current) return;
            if (Math.hypot(p.x - current.start.x, p.y - current.start.y) > CLICK_SLOP_PX)
              current.moved = true;
            if (current.moved) {
              const dx = p.x - current.last.x;
              const dy = p.y - current.last.y;
              updateViewport((v) => panBy(v, dx, dy));
            }
            current.last = p;
          }}
          onPointerUp={(e) => {
            if (!pointers.current.delete(e.pointerId)) return;
            if (pinchFrom.current) {
              // Fingers left over from a pinch never click or pan.
              if (pointers.current.size < 2) pinchFrom.current = null;
              return;
            }
            const current = press.current;
            press.current = null;
            if (!current || current.moved) return;
            const world = screenToWorld(vp, current.last);
            const hit = hitTest(plan, world, 4 / vp.scale);
            const picked = hit?.kind === 'wall' ? null : hit;
            if (picked) setCurrentId(picked.id);
            onSelect(picked);
          }}
          onPointerCancel={(e) => {
            pointers.current.delete(e.pointerId);
            if (pointers.current.size < 2) pinchFrom.current = null;
            press.current = null;
          }}
        >
          <g transform={`translate(${vp.offsetX} ${vp.offsetY}) scale(${vp.scale})`}>
            <GridBackdrop visible={visible} scale={vp.scale} />
            {shown.map((item) =>
              item.kind === 'wall' ? (
                <PlanItemShape
                  key={item.id}
                  item={item}
                  scale={vp.scale}
                  dimmed={highlight !== null}
                />
              ) : (
                <g
                  key={item.id}
                  ref={(element) => {
                    if (element) itemRefs.current.set(item.id, element);
                    else itemRefs.current.delete(item.id);
                  }}
                  role="button"
                  tabIndex={item.id === tabStop ? 0 : -1}
                  aria-label={describe(item)}
                  aria-pressed={item.id === selectedId}
                  className={styles.focusable}
                  onFocus={() => {
                    setCurrentId(item.id);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelect(item);
                    }
                  }}
                >
                  <PlanItemShape
                    item={item}
                    scale={vp.scale}
                    dimmed={highlight !== null && !item.tags.includes(highlight)}
                    emphasized={item.id === selectedId}
                  />
                </g>
              ),
            )}
          </g>
        </svg>
        <div className={styles.zoom} role="group" aria-label="Zoom">
          <Button
            variant="secondary"
            icon={<ZoomOut size={16} aria-hidden="true" />}
            aria-label="Zoom out"
            onClick={() => {
              setViewport(zoomAt(vp, center, 1 / ZOOM_STEP));
            }}
          />
          <Button
            variant="secondary"
            icon={<ZoomIn size={16} aria-hidden="true" />}
            aria-label="Zoom in"
            onClick={() => {
              setViewport(zoomAt(vp, center, ZOOM_STEP));
            }}
          />
          <Button
            variant="secondary"
            icon={<Maximize size={16} aria-hidden="true" />}
            aria-label="Fit plan"
            onClick={() => {
              setViewport(null);
            }}
          />
        </div>
      </div>
    </div>
  );
}
