// A button that opens a menu of actions (WAI-ARIA menu button pattern), used for the editor's add and overflow menus.
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Button } from './Button';
import { usePageHandler } from './pageHandlers';
import styles from './MenuButton.module.css';

/** One line of a {@link MenuButton} menu: an action, or a divider between groups of actions. */
export type MenuEntry =
  | {
      /** Visible text, also the item's accessible name. */
      readonly label: string;
      /** Leading icon, `aria-hidden`. */
      readonly icon?: ReactNode;
      /** Runs after the menu has closed and focus is back on the menu button. */
      readonly onSelect: () => void;
      /** Shown but not actionable (`aria-disabled`), so the menu keeps its shape. */
      readonly disabled?: boolean;
      /** Shortcut hint drawn after the label, for example `Ctrl+D`. */
      readonly hint?: string;
      /** The same shortcut in `aria-keyshortcuts` syntax. */
      readonly keyshortcuts?: string;
    }
  | {
      /** Marks a divider. */
      readonly separator: true;
    };

interface MenuButtonProps {
  /** Text of the button, also its accessible name and the menu's name. */
  readonly label: string;
  /** Icon shown on the button, `aria-hidden`. */
  readonly icon: ReactNode;
  /** The menu's entries, in order. */
  readonly entries: readonly MenuEntry[];
  /** Show the label next to the icon; otherwise it is only the accessible name and tooltip. */
  readonly showLabel?: boolean;
  /** Which edge of the button the menu lines up with. */
  readonly align?: 'start' | 'end';
}

type Item = Exclude<MenuEntry, { separator: true }>;

function isItem(entry: MenuEntry): entry is Item {
  return !('separator' in entry);
}

function menuItems(root: HTMLElement | null): HTMLElement[] {
  return [...(root?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])];
}

/**
 * A menu button following the WAI-ARIA Authoring Practices: Enter, Space,
 * Down or a click opens the menu on its first item and Up opens it on the
 * last; Up, Down, Home and End move between items; Escape closes it and
 * returns focus to the button; Tab, focus leaving the menu, or a press
 * anywhere outside it closes it.
 *
 * @remarks
 * Choosing an item closes the menu and puts focus back on the button before
 * the action runs, so an action that opens a modal dialog returns focus to
 * the button when that dialog closes.
 *
 * @see docs/adr/0015-responsive-editor-with-drawers-and-overflow-menu.md
 */
export function MenuButton({
  label,
  icon,
  entries,
  showLabel = false,
  align = 'start',
}: MenuButtonProps) {
  const buttonId = useId();
  const menuId = useId();
  const wrap = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState<'first' | 'last' | null>(null);

  useEffect(() => {
    if (!open) return;
    const list = menuItems(wrap.current);
    (open === 'first' ? list[0] : list.at(-1))?.focus();
  }, [open]);

  // Not every press moves focus (a click on plain text, or any click in Safari,
  // which does not focus buttons), so watch presses outside while open.
  usePageHandler(
    document,
    'onpointerdown',
    (press) => {
      if (!(press.target instanceof Node) || !wrap.current?.contains(press.target)) setOpen(null);
    },
    open !== null,
  );

  const close = () => {
    button.current?.focus();
    setOpen(null);
  };

  return (
    <div
      ref={wrap}
      className={styles.wrap}
      onBlur={(e) => {
        if (open && !wrap.current?.contains(e.relatedTarget)) setOpen(null);
      }}
    >
      <Button
        ref={button}
        id={buttonId}
        variant="ghost"
        compact={!showLabel}
        icon={icon}
        title={showLabel ? undefined : label}
        aria-haspopup="menu"
        aria-expanded={open !== null}
        aria-controls={open ? menuId : undefined}
        onClick={() => {
          setOpen(open ? null : 'first');
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            e.stopPropagation();
            setOpen(e.key === 'ArrowDown' ? 'first' : 'last');
          }
        }}
      >
        {label}
      </Button>
      {open && (
        <div
          id={menuId}
          role="menu"
          aria-labelledby={buttonId}
          className={`${styles.menu} ${align === 'end' ? styles.end : ''}`}
          // Keep focus where it is on press, so a click never blurs the menu before it lands.
          onPointerDown={(e) => {
            e.preventDefault();
          }}
          onKeyDown={(e) => {
            const list = menuItems(wrap.current);
            const index = list.indexOf(e.target as HTMLElement);
            const target = {
              ArrowDown: list[(index + 1) % list.length],
              ArrowUp: list[(index - 1 + list.length) % list.length],
              Home: list[0],
              End: list.at(-1),
            }[e.key];
            if (target) {
              e.preventDefault();
              e.stopPropagation();
              target.focus();
            } else if (e.key === 'Escape') {
              e.preventDefault();
              e.stopPropagation();
              close();
            } else if (e.key === 'Tab') {
              setOpen(null);
            }
          }}
        >
          {entries.map((entry, index) =>
            isItem(entry) ? (
              <button
                key={entry.label}
                type="button"
                role="menuitem"
                tabIndex={-1}
                className={styles.item}
                aria-disabled={entry.disabled ? true : undefined}
                aria-keyshortcuts={entry.keyshortcuts}
                onClick={() => {
                  if (entry.disabled) return;
                  close();
                  entry.onSelect();
                }}
              >
                {entry.icon}
                <span>{entry.label}</span>
                {entry.hint && (
                  <span className={styles.hint} aria-hidden="true">
                    {entry.hint}
                  </span>
                )}
              </button>
            ) : (
              // Separators never move, so their position is a stable key.
              <div key={`separator-${index}`} role="separator" className={styles.separator} />
            ),
          )}
        </div>
      )}
    </div>
  );
}
