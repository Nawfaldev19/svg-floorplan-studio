// Selection outlines, resize handles and the rotate knob, drawn at a constant screen size.
import { cornersOf, type Box } from '../core/geometry';
import { HANDLE_DIRECTION, HANDLES, handleCursor } from '../core/transform';
import type { PlanItem } from '../core/types';
import styles from './PlanCanvas.module.css';

const HANDLE_PX = 10;
/** Invisible pointer target around each handle, large enough for touch (WCAG 2.5.8). */
const HANDLE_HIT_PX = 24;
const KNOB_GAP_PX = 28;
/**
 * Above this many outlined members only the group box is drawn: thousands of
 * outlines (Ctrl+A on a large floor) would cost more than the items themselves.
 */
const MAX_MEMBER_OUTLINES = 400;

interface SelectionOverlayProps {
  /**
   * Selected items to outline, with any gesture preview applied. A single item
   * gets handles; for a multi-selection pass only the members in view.
   */
  readonly items: readonly PlanItem[];
  /** Overall bounds of the selection, for the multi-selection box. */
  readonly bounds: Box | null;
  /** Current zoom, used to size handles in screen pixels. */
  readonly scale: number;
}

function outlinePoints(item: PlanItem): string {
  return cornersOf(item)
    .map((p) => `${p.x},${p.y}`)
    .join(' ');
}

/**
 * Outline plus resize and rotate handles, sized in screen pixels regardless of
 * zoom. Every outline is drawn twice, a wide surface-coloured halo under a
 * focus-coloured line, so it stays visible on any fill, including dark walls.
 * Past {@link MAX_MEMBER_OUTLINES} members only the group box is drawn.
 */
export function SelectionOverlay({ items, bounds, scale }: SelectionOverlayProps) {
  const only = items.length === 1 ? items[0] : undefined;

  if (only) {
    const outline = outlinePoints(only);
    const size = HANDLE_PX / scale;
    const hit = HANDLE_HIT_PX / scale;
    const hw = only.width / 2;
    const hh = only.height / 2;
    const knobY = -hh - KNOB_GAP_PX / scale;
    return (
      <g>
        <polygon className={styles.halo} points={outline} />
        <polygon className={styles.outline} points={outline} />
        <g transform={`translate(${only.x} ${only.y}) rotate(${only.rotation})`}>
          <line className={styles.halo} x1={0} y1={-hh} x2={0} y2={knobY} />
          <line className={styles.knobStem} x1={0} y1={-hh} x2={0} y2={knobY} />
          <circle className={styles.knob} cx={0} cy={knobY} r={size / 1.6} aria-hidden="true" />
          <circle
            className={styles.hitArea}
            data-handle="rotate"
            cx={0}
            cy={knobY}
            r={hit / 2}
            aria-hidden="true"
          />
          {HANDLES.map((handle) => {
            const dir = HANDLE_DIRECTION[handle];
            const cx = dir.x * hw;
            const cy = dir.y * hh;
            return (
              <g
                key={handle}
                data-handle={handle}
                style={{ cursor: handleCursor(handle, only.rotation) }}
              >
                <rect
                  className={styles.handle}
                  x={cx - size / 2}
                  y={cy - size / 2}
                  width={size}
                  height={size}
                  aria-hidden="true"
                />
                <rect
                  className={styles.hitArea}
                  x={cx - hit / 2}
                  y={cy - hit / 2}
                  width={hit}
                  height={hit}
                  aria-hidden="true"
                />
              </g>
            );
          })}
        </g>
      </g>
    );
  }

  if (!bounds) return null;
  const members = items.length <= MAX_MEMBER_OUTLINES ? items : [];
  return (
    <g data-outlines={members.length}>
      {members.map((item) => (
        <polygon key={`halo-${item.id}`} className={styles.halo} points={outlinePoints(item)} />
      ))}
      {members.map((item) => (
        <polygon key={item.id} className={styles.memberOutline} points={outlinePoints(item)} />
      ))}
      <rect
        className={styles.groupBox}
        x={bounds.minX}
        y={bounds.minY}
        width={bounds.maxX - bounds.minX}
        height={bounds.maxY - bounds.minY}
      />
    </g>
  );
}
