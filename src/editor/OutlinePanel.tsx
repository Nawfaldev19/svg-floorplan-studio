// The outline: a multi-select listbox of every item, the keyboard-first way to build a selection.
import { memo, useCallback, useEffect, useId, useRef, useState, type Dispatch } from 'react';
import { KIND_SPECS } from '../core/catalog';
import type { EditorAction, EditorState } from '../core/editor';
import type { ItemId, PlanItem } from '../core/types';
import styles from './OutlinePanel.module.css';

interface OutlinePanelProps {
  /** Editor state. */
  readonly state: EditorState;
  /** Editor dispatch. */
  readonly dispatch: Dispatch<EditorAction>;
}

const OutlineOption = memo(function OutlineOption({
  item,
  optionId,
  selected,
  active,
  groupName,
  onPick,
}: {
  item: PlanItem;
  optionId: string;
  selected: boolean;
  active: boolean;
  groupName: string | undefined;
  onPick: (id: ItemId, additive: boolean) => void;
}) {
  const touched = useRef(false);
  return (
    <li
      id={optionId}
      role="option"
      aria-selected={selected}
      className={`${styles.option} ${active ? styles.active : ''}`}
      onPointerDown={(e) => {
        // A finger on the list may be starting a scroll, so touch picks on click,
        // which the browser skips when the press turns into a scroll.
        touched.current = e.pointerType === 'touch';
        if (touched.current) return;
        // Keep focus on the listbox so aria-activedescendant stays meaningful.
        e.preventDefault();
        onPick(item.id, e.shiftKey || e.metaKey || e.ctrlKey);
      }}
      onClick={() => {
        if (touched.current) onPick(item.id, false);
        touched.current = false;
      }}
    >
      <span className={styles.name}>{item.name}</span>
      <span className={styles.meta}>
        {KIND_SPECS[item.kind].label}
        {groupName ? ` · ${groupName}` : ''}
      </span>
    </li>
  );
});

/**
 * A listbox of every item: the keyboard-first way to choose what to edit. It
 * follows the WAI-ARIA multi-select listbox model:
 *
 * - Up/Down, Home/End move and select one item.
 * - Ctrl/⌘ with Up/Down moves the focus ring only, so a set can be built.
 * - Space toggles the focused item; Shift+Up/Down moves and toggles.
 * - Shift+Space selects the range from the last picked item to the focused one.
 * - Ctrl/⌘+A selects every item (the editor-wide shortcut).
 *
 * The focused option is tracked separately from the selection. Options are
 * memoised with stable callbacks, so a selection change re-renders only the
 * options whose state changed, even on a 3,000-item plan.
 */
export function OutlinePanel({ state, dispatch }: OutlinePanelProps) {
  const headingId = useId();
  const baseId = useId();
  const { items, groups } = state.doc;
  const selected = new Set(state.selection);
  const groupNames = new Map(groups.map((g) => [g.id, g.name]));
  const list = useRef<HTMLUListElement>(null);
  const [activeId, setActiveId] = useState<ItemId | null>(null);
  const [anchorId, setAnchorId] = useState<ItemId | null>(null);
  // The selection this list last saw, and whether the list itself changed it.
  const [seen, setSeen] = useState({ selection: state.selection, fromList: false });

  // When the canvas changes the selection, bring the focus ring to it, unless it
  // is already on a selected item. Adjusting state during render is the
  // documented React pattern for reacting to a changed prop.
  if (seen.selection !== state.selection) {
    const first = state.selection[0];
    if (!seen.fromList && first && !(activeId && state.selection.includes(activeId))) {
      setActiveId(first);
    }
    setSeen({ selection: state.selection, fromList: false });
  }

  const foundIndex = activeId ? items.findIndex((i) => i.id === activeId) : -1;
  const activeIndex = Math.max(0, foundIndex);
  const activeItem = items[activeIndex];
  const optionId = (id: ItemId) => `${baseId}-${id}`;

  useEffect(() => {
    const option = activeItem ? document.getElementById(`${baseId}-${activeItem.id}`) : null;
    const box = list.current;
    if (!option || !box) return;
    // Scroll only the list. scrollIntoView would also scroll the sidebar and
    // push the inspector out of sight whenever the canvas selects an item.
    if (option.offsetTop < box.scrollTop) box.scrollTop = option.offsetTop;
    else if (option.offsetTop + option.offsetHeight > box.scrollTop + box.clientHeight)
      box.scrollTop = option.offsetTop + option.offsetHeight - box.clientHeight;
  }, [activeItem, baseId]);

  const fromList = useCallback(
    (action: EditorAction) => {
      setSeen((current) => ({ ...current, fromList: true }));
      dispatch(action);
    },
    [dispatch],
  );

  const pick = useCallback(
    (id: ItemId, additive: boolean) => {
      setActiveId(id);
      setAnchorId(id);
      fromList(
        additive ? { type: 'toggle', id, exact: true } : { type: 'select', ids: [id], exact: true },
      );
    },
    [fromList],
  );

  const toggle = (item: PlanItem) => {
    setAnchorId(item.id);
    fromList({ type: 'toggle', id: item.id, exact: true });
  };

  const moveBy = (index: number, how: 'select' | 'focus' | 'toggle') => {
    const item = items[Math.min(Math.max(index, 0), items.length - 1)];
    if (!item) return;
    setActiveId(item.id);
    if (how === 'select') {
      setAnchorId(item.id);
      fromList({ type: 'select', ids: [item.id], exact: true });
    } else if (how === 'toggle') {
      toggle(item);
    }
  };

  const selectRange = () => {
    const from = anchorId ? items.findIndex((i) => i.id === anchorId) : -1;
    const start = Math.min(from < 0 ? activeIndex : from, activeIndex);
    const end = Math.max(from < 0 ? activeIndex : from, activeIndex);
    fromList({
      type: 'select',
      ids: items.slice(start, end + 1).map((i) => i.id),
      exact: true,
    });
  };

  return (
    <div className={styles.panel} role="region" aria-labelledby={headingId}>
      {/* tabIndex -1: an opening drawer moves focus here (DrawerPane). */}
      <h2 id={headingId} className={styles.heading} tabIndex={-1}>
        Outline <span className={styles.count}>{items.length}</span>
      </h2>
      {items.length === 0 ? (
        <p className={styles.empty}>
          The plan is empty. Add a desk with <kbd>D</kbd> or the toolbar to get started.
        </p>
      ) : (
        <ul
          ref={list}
          className={styles.list}
          role="listbox"
          aria-labelledby={headingId}
          aria-multiselectable="true"
          aria-activedescendant={activeItem ? optionId(activeItem.id) : undefined}
          tabIndex={0}
          onKeyDown={(e) => {
            const mod = e.metaKey || e.ctrlKey;
            const how = mod ? 'focus' : e.shiftKey ? 'toggle' : 'select';
            const keys: Record<string, (() => void) | undefined> = {
              ArrowDown: () => {
                moveBy(activeIndex + 1, how);
              },
              ArrowUp: () => {
                moveBy(activeIndex - 1, how);
              },
              Home: mod
                ? undefined
                : () => {
                    moveBy(0, how);
                  },
              End: mod
                ? undefined
                : () => {
                    moveBy(items.length - 1, how);
                  },
              ' ': mod
                ? undefined
                : () => {
                    if (e.shiftKey) selectRange();
                    else if (activeItem) toggle(activeItem);
                  },
            };
            const run = keys[e.key];
            if (run) {
              e.preventDefault();
              // Stop the editor-wide shortcuts (arrow keys nudge items) from also firing.
              e.stopPropagation();
              run();
            }
          }}
        >
          {items.map((item, index) => (
            <OutlineOption
              key={item.id}
              item={item}
              optionId={optionId(item.id)}
              selected={selected.has(item.id)}
              active={index === activeIndex}
              groupName={item.groupId ? groupNames.get(item.groupId) : undefined}
              onPick={pick}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
