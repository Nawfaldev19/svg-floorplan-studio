// Radio group that picks the amenity the tag brush paints.
import type { Dispatch } from 'react';
import { AMENITY_SPECS } from '../core/catalog';
import type { EditorAction, EditorState } from '../core/editor';
import { AMENITY_TAGS } from '../core/types';
import { Swatch } from '../plan/Swatch';
import styles from './EditorPage.module.css';

/**
 * Shown in tag-brush mode: picks which amenity a stroke adds or removes.
 *
 * @param props - `state`: editor state (for the active tag); `dispatch`: editor dispatch.
 */
export function TagPalette({
  state,
  dispatch,
}: {
  state: EditorState;
  dispatch: Dispatch<EditorAction>;
}) {
  return (
    <fieldset className={styles.palette}>
      <legend className={styles.paletteLegend}>
        Brush paints <span className="visually-hidden">(keys 1 to 5)</span>
      </legend>
      {AMENITY_TAGS.map((tag, index) => (
        <label key={tag} className={styles.paletteOption}>
          <input
            type="radio"
            name="active-tag"
            value={tag}
            checked={state.activeTag === tag}
            onChange={() => {
              dispatch({ type: 'setActiveTag', tag });
            }}
          />
          <Swatch tag={tag} />
          {AMENITY_SPECS[tag].label}
          <kbd aria-hidden="true">{index + 1}</kbd>
        </label>
      ))}
      <p className={styles.paletteHint}>
        Click or drag across items. The first item decides whether the stroke adds or removes the
        tag.
      </p>
    </fieldset>
  );
}
