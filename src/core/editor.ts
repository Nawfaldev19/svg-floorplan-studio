/**
 * The editor reducer: every editing rule as one pure function from state and
 * action to new state. It records history, keeps edits inside the file
 * format, mints ids from a counter and writes the live-region announcement.
 *
 * @see docs/adr/0001-framework-free-core.md
 * @see docs/reference/features.md
 * @packageDocumentation
 */
import {
  alignItems,
  distributeItems,
  rotateItemsBy,
  type AlignEdge,
  type DistributeAxis,
} from './arrange';
import { KIND_SPECS } from './catalog';
import { boundsOf, snapTo, unionOf, type Point } from './geometry';
import {
  applyChange,
  diffItem,
  diffItems,
  EMPTY_HISTORY,
  record,
  redo,
  undo,
  type Change,
  type History,
  type Operation,
} from './history';
import { cleanName, MAX_ITEMS } from './limits';
import { expandToGroups, toggleInSelection } from './selection';
import { formatCm, nextGroupName, plural, uniqueName } from './text';
import { sanitizeGeometry } from './transform';
import type {
  AmenityTag,
  GroupId,
  ItemId,
  ItemKind,
  ItemPatch,
  PlanDocument,
  PlanGroup,
  PlanItem,
} from './types';

/** `edit` selects and transforms; `tag` turns pointer strokes into the amenity brush. */
export type EditorMode = 'edit' | 'tag';

/** Everything the editor reducer owns. Zoom and pan live outside it, because they are not edits. */
export interface EditorState {
  /** The plan being edited. */
  readonly doc: PlanDocument;
  /** Selected item ids, in the order they were selected. */
  readonly selection: readonly ItemId[];
  /** Undo and redo stacks. */
  readonly history: History;
  /** Current pointer mode. */
  readonly mode: EditorMode;
  /** The amenity the tag brush adds or removes. */
  readonly activeTag: AmenityTag;
  /** Next number used to mint ids; keeps the reducer pure and deterministic. */
  readonly serial: number;
  /** Latest message for the screen-reader live region. */
  readonly announcement: string;
  /** Changes with every announcement, so the UI can repeat an identical message. */
  readonly announcementId: number;
  /** Increments on every document change; drives autosave. */
  readonly revision: number;
  /** Items copied with Ctrl/⌘+C, kept outside the document so they survive replacing it. */
  readonly clipboard: Clipboard | null;
}

interface Clipboard {
  readonly items: readonly PlanItem[];
  readonly groups: readonly PlanGroup[];
  /**
   * How many times this clipboard was pasted; each paste lands a step further
   * away. A cut starts at -1, so its first paste lands where the items were.
   */
  readonly pastes: number;
}

/**
 * Every input the reducer understands. Components and keyboard shortcuts only
 * ever dispatch these; they never change the document directly.
 */
export type EditorAction =
  | { readonly type: 'select'; readonly ids: readonly ItemId[]; readonly exact?: boolean }
  | { readonly type: 'toggle'; readonly id: ItemId; readonly exact?: boolean }
  | { readonly type: 'selectAll' }
  | { readonly type: 'clearSelection' }
  | { readonly type: 'setMode'; readonly mode: EditorMode }
  | { readonly type: 'setActiveTag'; readonly tag: AmenityTag }
  | { readonly type: 'add'; readonly kind: ItemKind; readonly at: Point }
  | {
      readonly type: 'commitItems';
      readonly label: string;
      readonly before: readonly PlanItem[];
      readonly after: readonly PlanItem[];
    }
  | {
      readonly type: 'nudge';
      readonly dx: number;
      readonly dy: number;
      /**
       * When the key was pressed, in milliseconds. Nudges of the same selection
       * less than `COALESCE_WINDOW_MS` apart become one undo step; without it,
       * every nudge is its own step.
       */
      readonly at?: number;
    }
  | {
      readonly type: 'updateItem';
      readonly id: ItemId;
      readonly patch: ItemPatch;
      readonly label: string;
    }
  | { readonly type: 'duplicate' }
  | { readonly type: 'copy' }
  | { readonly type: 'cut' }
  | { readonly type: 'paste' }
  | { readonly type: 'align'; readonly edge: AlignEdge }
  | { readonly type: 'distribute'; readonly axis: DistributeAxis }
  | { readonly type: 'rotateBy'; readonly degrees: number }
  | { readonly type: 'delete' }
  | { readonly type: 'group' }
  | { readonly type: 'ungroup' }
  | { readonly type: 'renameGroup'; readonly id: GroupId; readonly name: string }
  | { readonly type: 'paintTag'; readonly ids: readonly ItemId[] }
  | { readonly type: 'setTitle'; readonly title: string }
  | {
      readonly type: 'replaceDocument';
      readonly doc: PlanDocument;
      readonly label: string;
      readonly announcement?: string;
    }
  | { readonly type: 'undo' }
  | { readonly type: 'redo' };

/**
 * Ids the editor mints look like `item-12`. Imported ids may use any digits,
 * so only suffixes of up to 15 digits count towards the counter: the counter
 * then stays a safe integer, and `item-${n}` never turns into exponent
 * notation or outgrows the 64-character id limit.
 */
const SERIAL_PATTERN = /^(?:item|group)-(\d{1,15})$/;

function nextSerialFor(doc: PlanDocument): number {
  let max = 0;
  for (const entry of [...doc.items, ...doc.groups]) {
    const match = SERIAL_PATTERN.exec(entry.id);
    if (match?.[1]) max = Math.max(max, Number(match[1]));
  }
  return max + 1;
}

/**
 * Hands out `item-N` and `group-N` ids from the counter, skipping any id the
 * plan already uses (an imported id with a longer suffix, for example).
 */
function idMinter(doc: PlanDocument, start: number) {
  const taken = new Set<string>([...doc.items, ...doc.groups].map((entry) => entry.id));
  let serial = start;
  return {
    mint(prefix: 'item' | 'group'): string {
      let id = `${prefix}-${serial++}`;
      while (taken.has(id)) id = `${prefix}-${serial++}`;
      taken.add(id);
      return id;
    },
    /** The counter after the ids minted so far. */
    next: () => serial,
  };
}

/**
 * Initial state for a loaded plan: nothing selected, empty history, edit mode.
 *
 * @remarks
 * The id counter starts above the highest `item-N` / `group-N` in the plan
 * (suffixes of up to 15 digits), and minting skips any id already in use, so
 * new ids never collide with loaded ones and always pass the file format.
 */
export function createEditorState(doc: PlanDocument): EditorState {
  return {
    doc,
    selection: [],
    history: EMPTY_HISTORY,
    mode: 'edit',
    activeTag: 'standing',
    serial: nextSerialFor(doc),
    announcement: '',
    announcementId: 0,
    revision: 0,
    clipboard: null,
  };
}

function announce(state: EditorState, announcement: string): EditorState {
  return { ...state, announcement, announcementId: state.announcementId + 1 };
}

const PLAN_FULL = `The plan already holds the maximum of ${MAX_ITEMS.toLocaleString('en-US')} items.`;

function existing(doc: PlanDocument, ids: readonly ItemId[]): ItemId[] {
  const present = new Set(doc.items.map((item) => item.id));
  return ids.filter((id) => present.has(id));
}

function commit(
  state: EditorState,
  change: Change,
  extra: Partial<Pick<EditorState, 'selection' | 'serial' | 'announcement'>> = {},
): EditorState {
  if (change.ops.length === 0) return state;
  const selection = extra.selection ?? state.selection;
  const recorded: Change = { ...change, selection: { before: state.selection, after: selection } };
  return {
    ...state,
    doc: applyChange(state.doc, recorded),
    history: record(state.history, recorded),
    revision: state.revision + 1,
    announcement: extra.announcement ?? change.label,
    announcementId: state.announcementId + 1,
    selection,
    serial: extra.serial ?? state.serial,
  };
}

/**
 * Says where things ended up, not just what happened, so someone who cannot see
 * the canvas knows the result: "Desk 3 at 120, 340 cm, turned to 15°."
 */
function describeResult(items: readonly PlanItem[], ops: readonly Operation[]): string {
  const changed = new Set<string>();
  for (const op of ops) {
    if (op.kind === 'patch') for (const key of Object.keys(op.after)) changed.add(key);
  }
  const moved = changed.has('x') || changed.has('y');
  const only = items.length === 1 ? items[0] : undefined;
  if (!only) {
    const box = unionOf(items.map(boundsOf));
    return moved && box
      ? `Top-left corner at ${formatCm(box.minX)}, ${formatCm(box.minY)} cm.`
      : '';
  }
  const parts: string[] = [];
  if (moved) parts.push(`at ${formatCm(only.x)}, ${formatCm(only.y)} cm`);
  if (changed.has('width') || changed.has('height')) {
    parts.push(`${formatCm(only.width)} × ${formatCm(only.height)} cm`);
  }
  if (changed.has('rotation')) parts.push(`turned to ${formatCm(only.rotation)}°`);
  return parts.length > 0 ? `${only.name} ${parts.join(', ')}.` : '';
}

/** Commits patches to existing items and announces the result. */
function commitPatches(
  state: EditorState,
  label: string,
  ops: readonly Operation[],
  after: readonly PlanItem[],
  coalesce?: Change['coalesce'],
): EditorState {
  const summary = describeResult(after, ops);
  const change: Change = coalesce ? { label, ops, coalesce } : { label, ops };
  return commit(state, change, { announcement: summary ? `${label}. ${summary}` : label });
}

/** Clamps every changed item to the format's limits, then commits the differences. */
function commitGeometry(
  state: EditorState,
  label: string,
  before: readonly PlanItem[],
  after: readonly PlanItem[],
  coalesce?: Change['coalesce'],
): EditorState {
  const clean = after.map(sanitizeGeometry);
  return commitPatches(state, label, diffItems(before, clean), clean, coalesce);
}

/**
 * Applies a finished gesture. The gesture's own before/after pair says which
 * fields it changed; those fields are then patched onto the items as they are
 * now. Items that no longer exist are skipped, so a gesture that outlived its
 * items (deleted or undone with the keyboard mid-drag) can never break history.
 */
function commitGesture(
  state: EditorState,
  label: string,
  before: readonly PlanItem[],
  after: readonly PlanItem[],
): EditorState {
  const live = new Map(state.doc.items.map((item) => [item.id, item]));
  const start = new Map(before.map((item) => [item.id, item]));
  const ops: Operation[] = [];
  const moved: PlanItem[] = [];
  for (const next of after) {
    const prev = start.get(next.id);
    const current = live.get(next.id);
    const gesture = prev ? diffItem(prev, next) : null;
    if (!current || gesture?.kind !== 'patch') continue;
    const target = sanitizeGeometry({ ...current, ...gesture.after });
    const op = diffItem(current, target);
    if (op) {
      ops.push(op);
      moved.push(target);
    }
  }
  return commitPatches(state, label, ops, moved);
}

/**
 * After items lose group membership, any group left with fewer than two
 * members is meaningless. Returns the operations that dissolve such groups.
 */
function dissolveSmallGroups(
  items: readonly PlanItem[],
  groups: readonly PlanGroup[],
  keep?: GroupId,
): Operation[] {
  const members = new Map<GroupId, PlanItem[]>();
  for (const item of items) {
    if (item.groupId) members.set(item.groupId, [...(members.get(item.groupId) ?? []), item]);
  }
  const dissolved = groups.filter((g) => g.id !== keep && (members.get(g.id)?.length ?? 0) < 2);
  if (dissolved.length === 0) return [];
  const ops: Operation[] = [];
  for (const group of dissolved) {
    for (const lone of members.get(group.id) ?? []) {
      ops.push({
        kind: 'patch',
        id: lone.id,
        before: { groupId: group.id },
        after: { groupId: null },
      });
    }
  }
  const gone = new Set(dissolved.map((g) => g.id));
  ops.push({ kind: 'groups', before: groups, after: groups.filter((g) => !gone.has(g.id)) });
  return ops;
}

function selectedItems(state: EditorState): PlanItem[] {
  const wanted = new Set(state.selection);
  return state.doc.items.filter((item) => wanted.has(item.id));
}

function addItem(state: EditorState, kind: ItemKind, at: Point): EditorState {
  if (state.doc.items.length >= MAX_ITEMS) return announce(state, PLAN_FULL);
  const spec = KIND_SPECS[kind];
  const ids = idMinter(state.doc, state.serial);
  const id = ids.mint('item');
  const names = new Set(state.doc.items.map((item) => item.name));
  let number = state.doc.items.filter((item) => item.kind === kind).length + 1;
  while (names.has(`${spec.label} ${number}`)) number += 1;
  const item: PlanItem = {
    id,
    kind,
    name: `${spec.label} ${number}`,
    x: snapTo(at.x, state.doc.gridSize),
    y: snapTo(at.y, state.doc.gridSize),
    width: spec.defaultSize.width,
    height: spec.defaultSize.height,
    rotation: 0,
    tags: [],
    groupId: null,
  };
  return commit(
    state,
    {
      label: `Add ${item.name}`,
      ops: [{ kind: 'insert', index: state.doc.items.length, item: sanitizeGeometry(item) }],
    },
    { selection: [id], serial: ids.next(), announcement: `Added ${item.name}` },
  );
}

function duplicateSelection(state: EditorState): EditorState {
  const originals = selectedItems(state);
  return insertCopies(state, originals, state.doc.groups, state.doc.gridSize * 2, 'Duplicate');
}

/**
 * Inserts copies of `originals` shifted by `offset`, with fresh ids and names
 * that are not taken yet. Groups with two or more copied members are recreated
 * as new groups.
 */
function insertCopies(
  state: EditorState,
  originals: readonly PlanItem[],
  sourceGroups: readonly PlanGroup[],
  offset: number,
  verb: string,
): EditorState {
  if (originals.length === 0) return state;
  if (state.doc.items.length + originals.length > MAX_ITEMS) return announce(state, PLAN_FULL);
  const ids = idMinter(state.doc, state.serial);
  const itemNames = new Set(state.doc.items.map((item) => item.name));
  const groupNames = new Set(state.doc.groups.map((group) => group.name));

  const groupCounts = new Map<GroupId, number>();
  for (const item of originals) {
    if (item.groupId) groupCounts.set(item.groupId, (groupCounts.get(item.groupId) ?? 0) + 1);
  }
  const groupMap = new Map<GroupId, GroupId>();
  const newGroups: PlanGroup[] = [];
  for (const group of sourceGroups) {
    if ((groupCounts.get(group.id) ?? 0) >= 2) {
      const copyId = ids.mint('group');
      const name = uniqueName(group.name, groupNames);
      groupNames.add(name);
      groupMap.set(group.id, copyId);
      newGroups.push({ id: copyId, name });
    }
  }

  const copies: PlanItem[] = originals.map((item) => {
    const name = uniqueName(item.name, itemNames);
    itemNames.add(name);
    return sanitizeGeometry({
      ...item,
      id: ids.mint('item'),
      name,
      x: item.x + offset,
      y: item.y + offset,
      groupId: item.groupId ? (groupMap.get(item.groupId) ?? null) : null,
    });
  });

  const ops: Operation[] = [];
  if (newGroups.length > 0) {
    ops.push({
      kind: 'groups',
      before: state.doc.groups,
      after: [...state.doc.groups, ...newGroups],
    });
  }
  copies.forEach((item, i) => {
    ops.push({ kind: 'insert', index: state.doc.items.length + i, item });
  });
  return commit(
    state,
    { label: `${verb} ${plural(copies.length, 'item')}`, ops },
    { selection: copies.map((c) => c.id), serial: ids.next() },
  );
}

function copySelection(state: EditorState): EditorState {
  const items = selectedItems(state);
  if (items.length === 0) return state;
  const groupIds = new Set(
    items.map((item) => item.groupId).filter((id): id is GroupId => id !== null),
  );
  const groups = state.doc.groups.filter((group) => groupIds.has(group.id));
  return {
    ...announce(state, `Copied ${plural(items.length, 'item')}`),
    clipboard: { items, groups, pastes: 0 },
  };
}

function cutSelection(state: EditorState): EditorState {
  const copied = copySelection(state);
  if (copied === state || !copied.clipboard) return state;
  return {
    ...deleteSelection(copied, 'Cut'),
    clipboard: { ...copied.clipboard, pastes: -1 },
  };
}

function paste(state: EditorState): EditorState {
  const clipboard = state.clipboard;
  if (!clipboard) return state;
  const pastes = clipboard.pastes + 1;
  const next = insertCopies(
    state,
    clipboard.items,
    clipboard.groups,
    state.doc.gridSize * 2 * pastes,
    'Paste',
  );
  return { ...next, clipboard: { ...clipboard, pastes } };
}

/** Commits a whole-selection geometry change produced by a pure arrange function. */
function arrangeSelection(
  state: EditorState,
  label: string,
  minimum: number,
  arrange: (items: readonly PlanItem[]) => PlanItem[],
): EditorState {
  const items = selectedItems(state);
  if (items.length < minimum) return state;
  return commitGeometry(state, `${label} ${plural(items.length, 'item')}`, items, arrange(items));
}

const EDGE_LABEL: Readonly<Record<AlignEdge, string>> = {
  left: 'Align left edges of',
  centerX: 'Align centres of',
  right: 'Align right edges of',
  top: 'Align top edges of',
  centerY: 'Align middles of',
  bottom: 'Align bottom edges of',
};

function deleteSelection(state: EditorState, verb = 'Delete'): EditorState {
  const wanted = new Set(state.selection);
  const removals: Operation[] = [];
  state.doc.items.forEach((item, index) => {
    if (wanted.has(item.id)) removals.push({ kind: 'remove', index, item });
  });
  if (removals.length === 0) return state;
  // Remove from the end so earlier indexes stay valid while applying.
  removals.reverse();
  const remaining = state.doc.items.filter((item) => !wanted.has(item.id));
  const ops = [...removals, ...dissolveSmallGroups(remaining, state.doc.groups)];
  return commit(
    state,
    { label: `${verb} ${plural(removals.length, 'item')}`, ops },
    { selection: [] },
  );
}

function groupSelection(state: EditorState): EditorState {
  const members = selectedItems(state);
  if (members.length < 2) return state;
  const ids = idMinter(state.doc, state.serial);
  const groupId = ids.mint('group');
  const taken = new Set(state.doc.groups.map((g) => g.name));
  const group: PlanGroup = { id: groupId, name: nextGroupName(taken, state.doc.groups.length + 1) };
  const memberIds = new Set(members.map((m) => m.id));

  const ops: Operation[] = [
    { kind: 'groups', before: state.doc.groups, after: [...state.doc.groups, group] },
  ];
  for (const item of members) {
    if (item.groupId !== groupId) {
      ops.push({
        kind: 'patch',
        id: item.id,
        before: { groupId: item.groupId },
        after: { groupId },
      });
    }
  }
  const after = state.doc.items.map((item) =>
    memberIds.has(item.id) ? { ...item, groupId } : item,
  );
  ops.push(...dissolveSmallGroups(after, [...state.doc.groups, group], groupId));
  return commit(
    state,
    { label: `Group ${plural(members.length, 'item')}`, ops },
    { serial: ids.next() },
  );
}

function ungroupSelection(state: EditorState): EditorState {
  const groupIds = new Set(
    selectedItems(state)
      .map((item) => item.groupId)
      .filter((g): g is GroupId => g !== null),
  );
  if (groupIds.size === 0) return state;
  const ops: Operation[] = [];
  for (const item of state.doc.items) {
    if (item.groupId && groupIds.has(item.groupId)) {
      ops.push({
        kind: 'patch',
        id: item.id,
        before: { groupId: item.groupId },
        after: { groupId: null },
      });
    }
  }
  ops.push({
    kind: 'groups',
    before: state.doc.groups,
    after: state.doc.groups.filter((g) => !groupIds.has(g.id)),
  });
  return commit(state, { label: `Ungroup ${plural(groupIds.size, 'group')}`, ops });
}

function renameGroup(state: EditorState, id: GroupId, raw: string): EditorState {
  const name = cleanName(raw);
  const group = state.doc.groups.find((g) => g.id === id);
  if (!group || name === '' || name === group.name) return state;
  return commit(state, {
    label: `Rename ${group.name} to ${name}`,
    ops: [
      {
        kind: 'groups',
        before: state.doc.groups,
        after: state.doc.groups.map((g) => (g.id === id ? { ...g, name } : g)),
      },
    ],
  });
}

/**
 * A brush stroke either adds or removes the active tag. The first item touched
 * decides which, so dragging across a mixed area gives a predictable result.
 */
function paintTag(state: EditorState, ids: readonly ItemId[]): EditorState {
  const byId = new Map(state.doc.items.map((item) => [item.id, item]));
  const touched = [...new Set(ids)].map((id) => byId.get(id)).filter((i): i is PlanItem => !!i);
  const first = touched[0];
  if (!first) return state;
  const tag = state.activeTag;
  const adding = !first.tags.includes(tag);
  const ops: Operation[] = [];
  for (const item of touched) {
    const has = item.tags.includes(tag);
    if (has === adding) continue;
    const tags = adding ? [...item.tags, tag] : item.tags.filter((t) => t !== tag);
    const op = diffItem(item, { ...item, tags });
    if (op) ops.push(op);
  }
  const verb = adding ? 'Tag' : 'Untag';
  return commit(state, { label: `${verb} ${plural(ops.length, 'item')}`, ops });
}

/**
 * Applies one action. Pure and deterministic: the same state and action always
 * give the same result, which is what lets every rule be unit-tested in Node.
 *
 * @remarks
 * Invariants kept by every branch: the document stays within the file
 * format's limits; groups with fewer than two members are dissolved; ids are
 * never reused, even after undoing a document replacement; each user gesture
 * becomes at most one history entry, and a burst of nudges (a held arrow key)
 * becomes one entry too.
 *
 * @example
 * ```ts
 * let state = createEditorState(createDemoPlan());
 * state = editorReducer(state, { type: 'add', kind: 'desk', at: { x: 0, y: 0 } });
 * state = editorReducer(state, { type: 'undo' });
 * ```
 */
export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'select': {
      const ids = existing(
        state.doc,
        action.exact ? action.ids : expandToGroups(state.doc, action.ids),
      );
      return {
        ...announce(
          state,
          ids.length === 0 ? 'Selection cleared' : `Selected ${plural(ids.length, 'item')}`,
        ),
        selection: ids,
      };
    }
    case 'toggle': {
      const selection = toggleInSelection(
        state.doc,
        state.selection,
        action.id,
        action.exact ?? false,
      );
      return { ...announce(state, `Selected ${plural(selection.length, 'item')}`), selection };
    }
    case 'selectAll': {
      const selection = state.doc.items.map((item) => item.id);
      return { ...announce(state, `Selected ${plural(selection.length, 'item')}`), selection };
    }
    case 'clearSelection':
      return state.selection.length === 0
        ? state
        : { ...announce(state, 'Selection cleared'), selection: [] };
    case 'setMode':
      return {
        ...announce(state, action.mode === 'tag' ? 'Tag brush on' : 'Edit mode'),
        mode: action.mode,
      };
    case 'setActiveTag':
      return { ...state, activeTag: action.tag };
    case 'add':
      return addItem(state, action.kind, action.at);
    case 'commitItems':
      return commitGesture(state, action.label, action.before, action.after);
    case 'nudge': {
      const items = selectedItems(state);
      const moved = items.map((item) => ({
        ...item,
        x: item.x + action.dx,
        y: item.y + action.dy,
      }));
      const coalesce = action.at === undefined ? undefined : { key: 'nudge', at: action.at };
      return commitGeometry(state, `Nudge ${plural(items.length, 'item')}`, items, moved, coalesce);
    }
    case 'updateItem': {
      const item = state.doc.items.find((i) => i.id === action.id);
      if (!item) return state;
      const { name, ...rest } = action.patch;
      const cleaned = name === undefined ? '' : cleanName(name);
      const next = { ...item, ...rest, ...(cleaned === '' ? {} : { name: cleaned }) };
      return commitGeometry(state, action.label, [item], [next]);
    }
    case 'duplicate':
      return duplicateSelection(state);
    case 'copy':
      return copySelection(state);
    case 'cut':
      return cutSelection(state);
    case 'paste':
      return paste(state);
    case 'align':
      return arrangeSelection(state, EDGE_LABEL[action.edge], 2, (items) =>
        alignItems(items, action.edge),
      );
    case 'distribute':
      return arrangeSelection(state, `Distribute (${action.axis})`, 3, (items) =>
        distributeItems(items, action.axis),
      );
    case 'rotateBy':
      return arrangeSelection(
        state,
        `Rotate ${action.degrees > 0 ? 'clockwise' : 'anticlockwise'}`,
        1,
        (items) => rotateItemsBy(items, action.degrees),
      );
    case 'delete':
      return deleteSelection(state);
    case 'group':
      return groupSelection(state);
    case 'ungroup':
      return ungroupSelection(state);
    case 'renameGroup':
      return renameGroup(state, action.id, action.name);
    case 'paintTag':
      return paintTag(state, action.ids);
    case 'setTitle': {
      const title = cleanName(action.title);
      if (title === '' || title === state.doc.title) return state;
      return commit(state, {
        label: 'Rename plan',
        ops: [{ kind: 'title', before: state.doc.title, after: title }],
      });
    }
    case 'replaceDocument':
      return commit(
        state,
        { label: action.label, ops: [{ kind: 'replace', before: state.doc, after: action.doc }] },
        {
          selection: [],
          serial: Math.max(state.serial, nextSerialFor(action.doc)),
          announcement: action.announcement ?? action.label,
        },
      );
    case 'undo':
    case 'redo': {
      const step =
        action.type === 'undo' ? undo(state.doc, state.history) : redo(state.doc, state.history);
      if (!step) return state;
      const recorded = step.change.selection;
      const selection = recorded
        ? action.type === 'undo'
          ? recorded.before
          : recorded.after
        : state.selection;
      return {
        ...announce(state, `${action.type === 'undo' ? 'Undid' : 'Redid'}: ${step.change.label}`),
        doc: step.doc,
        history: step.history,
        selection: existing(step.doc, selection),
        // Undoing "replace" could reintroduce ids; never hand out one twice.
        serial: Math.max(state.serial, nextSerialFor(step.doc)),
        revision: state.revision + 1,
      };
    }
  }
}

/** Whether there is a change to undo. */
export function canUndo(state: EditorState): boolean {
  return state.history.past.length > 0;
}

/** Whether there is an undone change to redo. */
export function canRedo(state: EditorState): boolean {
  return state.history.future.length > 0;
}
