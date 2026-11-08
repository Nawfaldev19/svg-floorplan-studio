// One panel of the editor sidebar, which becomes a drawer with a close button, Escape handling and focus management on small screens.
import { X } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';
import { Button } from '../shared/Button';
import styles from './EditorPage.module.css';
import { isTextEntry } from './textEntry';

interface DrawerPaneProps {
  /** Element id, referenced by the toggle's `aria-controls`. */
  readonly id: string;
  /** Name of the panel, used in the close button's name ("Close outline"). */
  readonly title: string;
  /** True when the sidebar is a drawer (phone and tablet layouts). */
  readonly drawer: boolean;
  /** Whether this pane is the open drawer; ignored when `drawer` is false. */
  readonly open: boolean;
  /** Closes the drawer and returns focus to its toggle. */
  readonly onClose: () => void;
  /** Extra class for the pane, for its share of the sidebar. */
  readonly className: string | undefined;
  /** The panel itself; its first `h2` receives focus when the drawer opens. */
  readonly children: ReactNode;
}

/**
 * A sidebar panel that is always shown on wide layouts and opens as a drawer
 * on narrow ones (WAI-ARIA disclosure pattern: the toggle carries
 * `aria-expanded` and `aria-controls`).
 *
 * @remarks
 * The drawer is not modal: the canvas stays usable while it is open, so a
 * tap on another item updates the open inspector. Opening it moves focus to
 * the panel's heading, which names it for screen readers without opening the
 * on-screen keyboard; Escape (outside a text field) and the close button
 * close it and return focus to the toggle.
 *
 * @see docs/adr/0015-responsive-editor-with-drawers-and-overflow-menu.md
 */
export function DrawerPane({
  id,
  title,
  drawer,
  open,
  onClose,
  className,
  children,
}: DrawerPaneProps) {
  const ref = useRef<HTMLDivElement>(null);
  const shown = drawer && open;
  const wasShown = useRef(shown);

  useEffect(() => {
    // Leave focus alone when it is already inside: the editor opens the drawer
    // that holds the focused control when the layout changes under it.
    if (shown && !wasShown.current && !ref.current?.contains(document.activeElement)) {
      ref.current?.querySelector<HTMLElement>('h2')?.focus();
    }
    wasShown.current = shown;
  }, [shown]);

  return (
    <div
      id={id}
      ref={ref}
      className={`${styles.pane} ${className ?? ''}`}
      hidden={drawer && !open}
      onKeyDown={(e) => {
        if (!drawer || e.key !== 'Escape' || isTextEntry(e.target)) return;
        e.preventDefault();
        // Escape closes the drawer here; it must not also clear the selection.
        e.stopPropagation();
        onClose();
      }}
    >
      {drawer && (
        <Button
          variant="ghost"
          className={styles.paneClose}
          icon={<X size={18} aria-hidden="true" />}
          aria-label={`Close ${title.toLowerCase()}`}
          title={`Close ${title.toLowerCase()} (Esc)`}
          onClick={onClose}
        />
      )}
      {children}
    </div>
  );
}
