// Small legend glyph for an amenity, used beside its label in lists and buttons.
import type { AmenityTag } from '../core/types';
import { AmenityMark } from './AmenityMark';
import styles from './plan.module.css';

/**
 * The legend glyph for an amenity, matching the marks drawn on the plan.
 * Decorative (`aria-hidden`): the adjacent text names the amenity.
 */
export function Swatch({ tag }: { tag: AmenityTag }) {
  return (
    <svg className={styles.swatch} viewBox="-6 -6 12 12" aria-hidden="true">
      <AmenityMark tag={tag} cx={0} cy={0} r={5.5} />
    </svg>
  );
}
