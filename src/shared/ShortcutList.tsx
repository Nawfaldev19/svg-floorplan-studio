// Renders KEYMAP and POINTER_HELP as definition lists for the help dialog and the landing page.
import { KEYMAP, POINTER_HELP, type KeyScope } from '../core/keymap';
import styles from './ShortcutList.module.css';

const SCOPE_NOTE: Readonly<Record<KeyScope, string>> = {
  editor: '',
  selection: ' (canvas or outline focused)',
  canvas: ' (canvas focused)',
};

/**
 * Every editor shortcut and pointer gesture, read from the keymap itself.
 *
 * @param props - `headingLevel`: the level of the "Keyboard" and "Pointer"
 *   headings, so the list fits the outline of the page it is placed in.
 */
export function ShortcutList({ headingLevel }: { headingLevel: 'h2' | 'h3' }) {
  const Heading = headingLevel;
  return (
    <div className={styles.columns}>
      <div>
        <Heading className={styles.heading}>Keyboard</Heading>
        <dl className={styles.list}>
          {KEYMAP.map((entry) => (
            <div key={entry.keys} className={styles.entry}>
              <dt>
                <kbd>{entry.keys}</kbd>
              </dt>
              <dd>
                {entry.description}
                {entry.scope !== 'editor' && (
                  <span className={styles.scope}>{SCOPE_NOTE[entry.scope]}</span>
                )}
              </dd>
            </div>
          ))}
        </dl>
      </div>
      <div>
        <Heading className={styles.heading}>Pointer</Heading>
        <dl className={styles.list}>
          {POINTER_HELP.map((entry) => (
            <div key={entry.keys} className={styles.entry}>
              <dt>
                <kbd>{entry.keys}</kbd>
              </dt>
              <dd>{entry.description}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
