// The inspector panel: name, position, size, rotation and amenities of one item,
// group controls and arranging for a selection, or the plan title when nothing is selected.
import { useId, useState, type Dispatch } from 'react';
import { AMENITY_SPECS, KIND_SPECS } from '../core/catalog';
import type { EditorAction, EditorState } from '../core/editor';
import { MAX_NAME_LENGTH } from '../core/limits';
import { AMENITY_TAGS, type PlanItem } from '../core/types';
import { Swatch } from '../plan/Swatch';
import { Button } from '../shared/Button';
import { ArrangePanel } from './ArrangePanel';
import styles from './Inspector.module.css';
import { NumberField } from './NumberField';

interface InspectorProps {
  /** Editor state. */
  readonly state: EditorState;
  /** Editor dispatch. */
  readonly dispatch: Dispatch<EditorAction>;
}

function TextField({
  label,
  value,
  onCommit,
}: {
  label: string;
  value: string;
  onCommit: (value: string) => void;
}) {
  const id = useId();
  const [draft, setDraft] = useState<string | null>(null);
  const commit = () => {
    if (draft === null) return;
    setDraft(null);
    const trimmed = draft.trim();
    if (trimmed !== '' && trimmed !== value) onCommit(trimmed);
  };
  return (
    <div className={styles.field}>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        className={styles.input}
        value={draft ?? value}
        maxLength={MAX_NAME_LENGTH}
        onChange={(e) => {
          setDraft(e.target.value);
        }}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') setDraft(null);
        }}
      />
    </div>
  );
}

function ItemInspector({ item, dispatch }: { item: PlanItem; dispatch: Dispatch<EditorAction> }) {
  const update = (field: string, patch: Partial<PlanItem>) => {
    dispatch({ type: 'updateItem', id: item.id, patch, label: `Change ${field} of ${item.name}` });
  };
  const spec = KIND_SPECS[item.kind];
  return (
    <>
      <p className={styles.kind}>{spec.label}</p>
      <TextField
        key={`${item.id}-name`}
        label="Name"
        value={item.name}
        onCommit={(name) => {
          update('name', { name });
        }}
      />
      <div className={styles.grid}>
        <NumberField
          key={`${item.id}-x`}
          label="X"
          unit="cm"
          value={item.x}
          onCommit={(x) => {
            update('position', { x });
          }}
        />
        <NumberField
          key={`${item.id}-y`}
          label="Y"
          unit="cm"
          value={item.y}
          onCommit={(y) => {
            update('position', { y });
          }}
        />
        <NumberField
          key={`${item.id}-w`}
          label="Width"
          unit="cm"
          value={item.width}
          onCommit={(width) => {
            update('width', { width });
          }}
        />
        <NumberField
          key={`${item.id}-h`}
          label="Height"
          unit="cm"
          value={item.height}
          onCommit={(height) => {
            update('height', { height });
          }}
        />
        <NumberField
          key={`${item.id}-r`}
          label="Rotation"
          unit="°"
          value={item.rotation}
          onCommit={(rotation) => {
            update('rotation', { rotation });
          }}
        />
      </div>
      <p className={styles.hint}>
        Minimum size {spec.minSize.width} × {spec.minSize.height} cm.
      </p>
      <fieldset className={styles.tags}>
        <legend>Amenities</legend>
        {AMENITY_TAGS.map((tag) => {
          const checked = item.tags.includes(tag);
          return (
            <label key={tag} className={styles.tagOption}>
              <input
                type="checkbox"
                checked={checked}
                onChange={() => {
                  update('amenities', {
                    tags: checked ? item.tags.filter((t) => t !== tag) : [...item.tags, tag],
                  });
                }}
              />
              <Swatch tag={tag} />
              {AMENITY_SPECS[tag].label}
            </label>
          );
        })}
      </fieldset>
    </>
  );
}

/** Rename or dissolve the group the selection belongs to, or group a loose selection. */
function GroupControls({ state, dispatch }: InspectorProps) {
  const headingId = useId();
  const wanted = new Set(state.selection);
  const selected = state.doc.items.filter((item) => wanted.has(item.id));
  const groupIds = new Set(selected.map((item) => item.groupId));
  const [onlyGroupId] = groupIds.size === 1 ? [...groupIds] : [null];
  const group = onlyGroupId ? state.doc.groups.find((g) => g.id === onlyGroupId) : undefined;

  if (group) {
    const members = state.doc.items.filter((item) => item.groupId === group.id).length;
    return (
      <div className={styles.arrange} role="group" aria-labelledby={headingId}>
        <h3 id={headingId} className={styles.subheading}>
          Group of {members}
        </h3>
        <TextField
          key={`${group.id}-${group.name}`}
          label="Group name"
          value={group.name}
          onCommit={(name) => {
            dispatch({ type: 'renameGroup', id: group.id, name });
          }}
        />
        <Button
          className={styles.inlineAction}
          onClick={() => {
            dispatch({ type: 'ungroup' });
          }}
        >
          Ungroup {group.name}
        </Button>
      </div>
    );
  }
  if (selected.length < 2) return null;
  return (
    <Button
      className={styles.inlineAction}
      onClick={() => {
        dispatch({ type: 'group' });
      }}
    >
      Group selection
    </Button>
  );
}

/**
 * The keyboard way to edit geometry: labelled fields that commit on Enter or
 * blur, so typing a number is one undo step.
 *
 * @see docs/adr/0008-listbox-and-inspector-as-keyboard-alternative.md
 */
export function Inspector({ state, dispatch }: InspectorProps) {
  const headingId = useId();
  const count = state.selection.length;
  const item = count === 1 ? state.doc.items.find((i) => i.id === state.selection[0]) : undefined;
  // A selection that is exactly one group needs no hint about grouping.
  const groupOf = new Set(
    state.doc.items.filter((i) => state.selection.includes(i.id)).map((i) => i.groupId),
  );
  const oneGroup = groupOf.size === 1 && !groupOf.has(null);

  return (
    <div className={styles.panel} role="region" aria-labelledby={headingId}>
      {/* tabIndex -1: an opening drawer moves focus here (DrawerPane). */}
      <h2 id={headingId} className={styles.heading} tabIndex={-1}>
        {item ? 'Item' : count > 1 ? `${count} items selected` : 'Plan'}
      </h2>
      {item && <ItemInspector item={item} dispatch={dispatch} />}
      {count > 1 && (
        <p className={styles.hint}>
          Drag any selected item to move them together, or use the arrow keys.
          {!oneGroup && (
            <>
              {' '}
              Group them with <kbd>Ctrl</kbd>/<kbd>⌘</kbd> + <kbd>G</kbd>.
            </>
          )}
        </p>
      )}
      {count > 0 && <GroupControls state={state} dispatch={dispatch} />}
      {count > 0 && <ArrangePanel count={count} dispatch={dispatch} />}
      {count === 0 && (
        <>
          <TextField
            key={`title-${state.doc.title}`}
            label="Plan title"
            value={state.doc.title}
            onCommit={(title) => {
              dispatch({ type: 'setTitle', title });
            }}
          />
          <p className={styles.hint}>
            {state.doc.items.length} items, {state.doc.groups.length} groups. Select an item on the
            canvas or in the outline to edit it.
          </p>
        </>
      )}
    </div>
  );
}
