// The SVG drawing of one plan item, shared by the editor canvas and the viewer.
import { memo } from 'react';
import { KIND_SPECS } from '../core/catalog';
import { shortenToWords } from '../core/text';
import type { PlanItem } from '../core/types';
import { AmenityMark } from './AmenityMark';
import styles from './plan.module.css';

const KIND_CLASS: Readonly<Record<PlanItem['kind'], string | undefined>> = {
  desk: styles.desk,
  meetingRoom: styles.meetingRoom,
  lounge: styles.lounge,
  planter: styles.planter,
  wall: styles.wall,
};

interface PlanItemShapeProps {
  /** The item, drawn in world units inside the caller's camera transform. */
  readonly item: PlanItem;
  /** Current zoom, used to keep labels and marks a constant screen size. */
  readonly scale: number;
  /** Faded, for items outside the viewer's active highlight. */
  readonly dimmed?: boolean;
  /** Drawn with a stronger outline: the viewer's selection or the brush stroke in progress. */
  readonly emphasized?: boolean;
}

const LABEL_PX = 12;
const MARK_PX = 4.5;
/** Average glyph width of the bold label font as a fraction of its size (measured: 0.50–0.54). */
const CHAR_WIDTH = 0.54;
const LABEL_PADDING_PX = 3;

/** Shortens a label to whole words so it stays inside an item `widthPx` wide. */
function fitLabel(name: string, widthPx: number): string {
  return shortenToWords(
    name,
    Math.floor((widthPx - LABEL_PADDING_PX * 2) / (LABEL_PX * CHAR_WIDTH)),
  );
}

/**
 * Draws one item in world units. Shared by the editor canvas and the viewer.
 *
 * @remarks
 * Memoised: during a drag only the moving items get new objects, so the rest
 * of the plan does not re-render. Labels are shortened to whole words using
 * an average glyph width, so one may end a word early or run slightly long.
 */
export const PlanItemShape = memo(function PlanItemShape({
  item,
  scale,
  dimmed = false,
  emphasized = false,
}: PlanItemShapeProps) {
  const shape = KIND_SPECS[item.kind].shape;
  const hw = item.width / 2;
  const hh = item.height / 2;
  const label =
    item.kind !== 'wall' && item.width * scale > 56 && item.height * scale > 20
      ? fitLabel(item.name, item.width * scale)
      : '';
  const showMarks = item.tags.length > 0 && item.width * scale > 36 && item.height * scale > 16;
  // Keep text upright when the item is turned more than a quarter turn.
  const flipText = item.rotation > 90 && item.rotation < 270;
  const classes = [
    styles.item,
    KIND_CLASS[item.kind],
    dimmed ? styles.dimmed : '',
    emphasized ? styles.emphasized : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <g className={classes} transform={`translate(${item.x} ${item.y}) rotate(${item.rotation})`}>
      {shape === 'ellipse' ? (
        <ellipse rx={hw} ry={hh} />
      ) : (
        <rect
          x={-hw}
          y={-hh}
          width={item.width}
          height={item.height}
          rx={item.kind === 'wall' ? 0 : 6}
        />
      )}
      {label && (
        <text
          className={styles.label}
          fontSize={LABEL_PX / scale}
          transform={flipText ? 'rotate(180)' : undefined}
          dy="0.35em"
        >
          {label}
        </text>
      )}
      {showMarks &&
        item.tags.map((tag, i) => (
          <AmenityMark
            key={tag}
            tag={tag}
            cx={-hw + (MARK_PX * 2.6 * (i + 1)) / scale}
            cy={-hh + (MARK_PX * 2.4) / scale}
            r={MARK_PX / scale}
          />
        ))}
    </g>
  );
});
