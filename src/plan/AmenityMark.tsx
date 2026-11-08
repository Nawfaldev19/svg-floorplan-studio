// SVG glyph for one amenity: each tag has its own shape as well as its colour (WCAG 1.4.1).
import { AMENITY_SPECS } from '../core/catalog';
import type { AmenityTag } from '../core/types';
import styles from './plan.module.css';

interface AmenityMarkProps {
  /** The amenity to draw. */
  readonly tag: AmenityTag;
  /** Centre x, in the caller's units. */
  readonly cx: number;
  /** Centre y, in the caller's units. */
  readonly cy: number;
  /** Radius of the circle the glyph fits in, in the caller's units. */
  readonly r: number;
}

function points(cx: number, cy: number, r: number, pairs: readonly (readonly [number, number])[]) {
  return pairs.map(([x, y]) => `${cx + x * r},${cy + y * r}`).join(' ');
}

const TRIANGLE = [
  [0, -1],
  [0.95, 0.75],
  [-0.95, 0.75],
] as const;
const DIAMOND = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
] as const;
const PLUS = [
  [-0.35, -1],
  [0.35, -1],
  [0.35, -0.35],
  [1, -0.35],
  [1, 0.35],
  [0.35, 0.35],
  [0.35, 1],
  [-0.35, 1],
  [-0.35, 0.35],
  [-1, 0.35],
  [-1, -0.35],
  [-0.35, -0.35],
] as const;

/** One amenity as a coloured glyph. Shape and colour both identify the tag. */
export function AmenityMark({ tag, cx, cy, r }: AmenityMarkProps) {
  const spec = AMENITY_SPECS[tag];
  const common = { className: styles.mark, style: { fill: `var(${spec.colorVar})` } };
  switch (spec.glyph) {
    case 'circle':
      return <circle {...common} cx={cx} cy={cy} r={r * 0.9} />;
    case 'square':
      return (
        <rect {...common} x={cx - r * 0.8} y={cy - r * 0.8} width={r * 1.6} height={r * 1.6} />
      );
    case 'triangle':
      return <polygon {...common} points={points(cx, cy, r, TRIANGLE)} />;
    case 'diamond':
      return <polygon {...common} points={points(cx, cy, r, DIAMOND)} />;
    case 'plus':
      return <polygon {...common} points={points(cx, cy, r, PLUS)} />;
  }
}
