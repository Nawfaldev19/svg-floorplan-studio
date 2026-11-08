// The one-metre survey grid behind the plan, as a tiled SVG pattern.
import { useId } from 'react';
import type { Box } from '../core/geometry';
import styles from './plan.module.css';

/**
 * One-metre survey grid, drawn only across the visible area.
 *
 * @param props - `visible`: the world box to cover; `scale`: current zoom, used
 *   to keep lines one pixel wide. Hidden below 15% zoom, where it would be noise.
 */
export function GridBackdrop({ visible, scale }: { visible: Box; scale: number }) {
  const id = useId();
  if (scale < 0.15) return null;
  return (
    <>
      <defs>
        <pattern id={id} width={100} height={100} patternUnits="userSpaceOnUse">
          <path className={styles.gridLine} d="M100 0H0V100" strokeWidth={1 / scale} />
        </pattern>
      </defs>
      <rect
        x={visible.minX}
        y={visible.minY}
        width={visible.maxX - visible.minX}
        height={visible.maxY - visible.minY}
        fill={`url(#${id})`}
      />
    </>
  );
}
