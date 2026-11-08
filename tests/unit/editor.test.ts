import { describe, expect, it } from 'vitest';
import {
  canRedo,
  canUndo,
  createEditorState,
  editorReducer,
  type EditorAction,
  type EditorState,
} from '../../src/core/editor';
import { parseDocument, serializeDocument } from '../../src/core/document';
import { COALESCE_WINDOW_MS } from '../../src/core/history';
import { MAX_COORDINATE, MAX_ITEMS, MAX_NAME_LENGTH } from '../../src/core/limits';
import { createDemoPlan } from '../../src/core/seed';
import { savePlan, type KeyValueStore } from '../../src/core/storage';
import { makeDoc, makeItem, seeded } from './factories';

function run(state: EditorState, ...actions: EditorAction[]): EditorState {
  return actions.reduce(editorReducer, state);
}

const base = () =>
  createEditorState(
    makeDoc(
      [
        makeItem({ id: 'item-1', x: 0, groupId: 'group-9' }),
        makeItem({ id: 'item-2', x: 200, groupId: 'group-9' }),
        makeItem({ id: 'item-3', x: 400 }),
      ],
      [{ id: 'group-9', name: 'Pod' }],
    ),
  );

describe('createEditorState', () => {
  it('continues id numbering after the highest existing serial', () => {
    expect(base().serial).toBe(10);
    expect(createEditorState(makeDoc([])).serial).toBe(1);
  });
});

describe('selection actions', () => {
  it('expands a plain selection to whole groups and announces it', () => {
    const s = run(base(), { type: 'select', ids: ['item-1'] });
    expect(s.selection).toEqual(['item-1', 'item-2']);
    expect(s.announcement).toBe('Selected 2 items');
  });

  it('selects exactly when asked and drops unknown ids', () => {
    expect(
      run(base(), { type: 'select', ids: ['item-1', 'ghost'], exact: true }).selection,
    ).toEqual(['item-1']);
  });

  it('toggles, selects all and clears', () => {
    let s = run(base(), { type: 'toggle', id: 'item-3' });
    expect(s.selection).toEqual(['item-3']);
    s = run(s, { type: 'selectAll' });
    expect(s.selection).toHaveLength(3);
    s = run(s, { type: 'clearSelection' });
    expect(s.selection).toEqual([]);
    expect(run(s, { type: 'clearSelection' })).toBe(s);
  });

  it('changes mode and active tag without touching history', () => {
    const s = run(base(), { type: 'setMode', mode: 'tag' }, { type: 'setActiveTag', tag: 'quiet' });
    expect(s.mode).toBe('tag');
    expect(s.activeTag).toBe('quiet');
    expect(canUndo(s)).toBe(false);
    expect(run(s, { type: 'setMode', mode: 'edit' }).announcement).toBe('Edit mode');
  });
});

describe('document edits', () => {
  it('adds a snapped item with a fresh id and selects it', () => {
    const s = run(base(), { type: 'add', kind: 'planter', at: { x: 123, y: 47 } });
    const added = s.doc.items.at(-1);
    expect(added).toMatchObject({
      id: 'item-10',
      kind: 'planter',
      name: 'Planter 1',
      x: 120,
      y: 50,
    });
    expect(s.selection).toEqual(['item-10']);
    expect(s.serial).toBe(11);
    expect(s.revision).toBe(1);
  });

  it('commits a gesture as one undoable step', () => {
    const s0 = base();
    const before = s0.doc.items.slice(0, 2);
    const after = before.map((i) => ({ ...i, y: i.y + 50 }));
    const s1 = run(s0, { type: 'commitItems', label: 'Move 2 items', before, after });
    expect(s1.doc.items.map((i) => i.y)).toEqual([50, 50, 0]);
    expect(s1.history.past).toHaveLength(1);
    const s2 = run(s1, { type: 'undo' });
    expect(s2.doc).toEqual(s0.doc);
    expect(s2.announcement).toBe('Undid: Move 2 items');
    expect(canRedo(s2)).toBe(true);
    expect(run(s2, { type: 'redo' }).doc).toEqual(s1.doc);
  });

  it('ignores a gesture that changed nothing', () => {
    const s0 = base();
    expect(
      run(s0, { type: 'commitItems', label: 'Move', before: s0.doc.items, after: s0.doc.items }),
    ).toBe(s0);
  });

  it('nudges the selection', () => {
    const s = run(base(), { type: 'select', ids: ['item-3'] }, { type: 'nudge', dx: -10, dy: 50 });
    expect(s.doc.items[2]).toMatchObject({ x: 390, y: 50 });
  });

  it('applies inspector edits through the same limits as handles', () => {
    const s = run(base(), {
      type: 'updateItem',
      id: 'item-3',
      patch: { width: 1, rotation: -45 },
      label: 'Edit',
    });
    expect(s.doc.items[2]).toMatchObject({ width: 60, rotation: 315 });
    expect(run(base(), { type: 'updateItem', id: 'nope', patch: { x: 1 }, label: 'Edit' })).toEqual(
      base(),
    );
  });

  it('duplicates the selection, copying whole groups into new groups', () => {
    const s = run(base(), { type: 'select', ids: ['item-1'] }, { type: 'duplicate' });
    expect(s.doc.items).toHaveLength(5);
    expect(s.doc.groups).toEqual([
      { id: 'group-9', name: 'Pod' },
      { id: 'group-10', name: 'Pod copy' },
    ]);
    const copies = s.doc.items.slice(3);
    expect(copies.map((c) => [c.id, c.groupId, c.x])).toEqual([
      ['item-11', 'group-10', 20],
      ['item-12', 'group-10', 220],
    ]);
    expect(s.selection).toEqual(['item-11', 'item-12']);
    expect(run(s, { type: 'undo' }).doc).toEqual(base().doc);
  });

  it('duplicates a lone group member without a group', () => {
    const s = run(base(), { type: 'select', ids: ['item-1'], exact: true }, { type: 'duplicate' });
    expect(s.doc.items.at(-1)?.groupId).toBeNull();
    expect(s.doc.groups).toHaveLength(1);
  });

  it('deletes the selection and dissolves groups left with one member', () => {
    const s = run(base(), { type: 'select', ids: ['item-2'], exact: true }, { type: 'delete' });
    expect(s.doc.items.map((i) => i.id)).toEqual(['item-1', 'item-3']);
    expect(s.doc.items[0]?.groupId).toBeNull();
    expect(s.doc.groups).toEqual([]);
    expect(s.selection).toEqual([]);
    expect(run(s, { type: 'undo' }).doc).toEqual(base().doc);
  });

  it('groups a selection, dissolving any group it empties', () => {
    const s = run(
      base(),
      { type: 'select', ids: ['item-2', 'item-3'], exact: true },
      { type: 'group' },
    );
    expect(s.doc.groups).toEqual([{ id: 'group-10', name: 'Group 2' }]);
    expect(s.doc.items.map((i) => i.groupId)).toEqual([null, 'group-10', 'group-10']);
    expect(run(s, { type: 'undo' }).doc).toEqual(base().doc);
  });

  it('refuses to group fewer than two items and to ungroup ungrouped items', () => {
    const one = run(base(), { type: 'select', ids: ['item-3'] });
    expect(run(one, { type: 'group' })).toBe(one);
    expect(run(one, { type: 'ungroup' })).toBe(one);
  });

  it('ungroups every member of a touched group', () => {
    const s = run(base(), { type: 'select', ids: ['item-1'], exact: true }, { type: 'ungroup' });
    expect(s.doc.items.every((i) => i.groupId === null)).toBe(true);
    expect(s.doc.groups).toEqual([]);
  });

  it('paints the active tag on, or off when the first item already has it', () => {
    const on = run(
      base(),
      { type: 'setActiveTag', tag: 'quiet' },
      { type: 'paintTag', ids: ['item-1', 'item-3', 'item-1'] },
    );
    expect(on.doc.items.map((i) => i.tags)).toEqual([['quiet'], [], ['quiet']]);
    expect(on.announcement).toBe('Tag 2 items');
    const off = run(on, { type: 'paintTag', ids: ['item-3', 'item-2'] });
    expect(off.doc.items.map((i) => i.tags)).toEqual([['quiet'], [], []]);
    expect(run(on, { type: 'paintTag', ids: ['ghost'] })).toBe(on);
  });

  it('renames the plan, ignoring blank or unchanged titles', () => {
    const s = run(base(), { type: 'setTitle', title: '  Level 3 ' });
    expect(s.doc.title).toBe('Level 3');
    expect(run(s, { type: 'setTitle', title: '   ' })).toBe(s);
    expect(run(s, { type: 'setTitle', title: 'Level 3' })).toBe(s);
  });

  it('replaces the document undoably and never reuses ids afterwards', () => {
    const demo = createDemoPlan();
    const s = run(
      base(),
      { type: 'select', ids: ['item-3'] },
      { type: 'replaceDocument', doc: demo, label: 'Load demo' },
    );
    expect(s.doc).toBe(demo);
    expect(s.selection).toEqual([]);
    expect(s.serial).toBeGreaterThan(demo.items.length);
    const undone = run(s, { type: 'undo' });
    expect(undone.doc).toEqual(base().doc);
    expect(undone.serial).toBe(s.serial);
  });

  it('keeps only surviving ids selected after undo', () => {
    const s = run(base(), { type: 'add', kind: 'desk', at: { x: 0, y: 0 } }, { type: 'undo' });
    expect(s.selection).toEqual([]);
  });

  it('does nothing on undo or redo with empty history', () => {
    const s = base();
    expect(run(s, { type: 'undo' })).toBe(s);
    expect(run(s, { type: 'redo' })).toBe(s);
  });
});

describe('clipboard and arranging', () => {
  it('copies and pastes, landing each paste a step further away', () => {
    const copied = run(base(), { type: 'select', ids: ['item-3'] }, { type: 'copy' });
    expect(copied.announcement).toBe('Copied 1 item');
    expect(copied.revision).toBe(0);
    const once = run(copied, { type: 'paste' });
    const twice = run(once, { type: 'paste' });
    expect(twice.doc.items.slice(3).map((i) => i.x)).toEqual([420, 440]);
    expect(twice.selection).toEqual(['item-11']);
    expect(run(base(), { type: 'paste' })).toEqual(base());
  });

  it('pastes a copied group as a new group', () => {
    const s = run(base(), { type: 'select', ids: ['item-1'] }, { type: 'copy' }, { type: 'paste' });
    expect(s.doc.groups).toHaveLength(2);
    expect(new Set(s.doc.items.slice(3).map((i) => i.groupId))).toEqual(new Set(['group-10']));
  });

  it('cuts as one undoable step labelled "Cut", and pastes a cut back in place', () => {
    const cut = run(base(), { type: 'select', ids: ['item-3'] }, { type: 'cut' });
    expect(cut.doc.items).toHaveLength(2);
    expect(cut.history.past.at(-1)?.label).toBe('Cut 1 item');
    expect(cut.announcement).toBe('Cut 1 item');
    const pasted = run(cut, { type: 'paste' });
    expect(pasted.doc.items.at(-1)).toMatchObject({ x: 400, y: 0, name: 'item-3' });
    // The second paste of the same cut is offset like any other paste.
    expect(run(pasted, { type: 'paste' }).doc.items.at(-1)).toMatchObject({ x: 420, y: 20 });
    expect(run(base(), { type: 'cut' })).toEqual(base());
  });

  it('keeps the clipboard when the document is replaced', () => {
    const s = run(
      base(),
      { type: 'select', ids: ['item-3'] },
      { type: 'copy' },
      { type: 'replaceDocument', doc: makeDoc([]), label: 'New' },
      { type: 'paste' },
    );
    expect(s.doc.items).toHaveLength(1);
  });

  it('aligns, distributes and rotates the selection as single history steps', () => {
    const aligned = run(base(), { type: 'selectAll' }, { type: 'align', edge: 'left' });
    expect(aligned.history.past.at(-1)?.label).toBe('Align left edges of 3 items');
    const distributed = run(
      base(),
      { type: 'selectAll' },
      { type: 'distribute', axis: 'vertical' },
    );
    expect(distributed).toMatchObject({ revision: 0 });
    const rotated = run(
      base(),
      { type: 'select', ids: ['item-3'] },
      { type: 'rotateBy', degrees: -15 },
    );
    expect(rotated.doc.items[2]?.rotation).toBe(345);
    expect(run(base(), { type: 'align', edge: 'left' })).toEqual(base());
  });
});

describe('limits of the file format', () => {
  it('numbers copies instead of growing "copy copy copy", so names stay short', () => {
    let s = run(base(), { type: 'select', ids: ['item-3'] });
    for (let i = 0; i < 30; i += 1) s = run(s, { type: 'duplicate' });
    const names = s.doc.items.map((item) => item.name);
    expect(names.slice(3, 6)).toEqual(['item-3 copy', 'item-3 copy 2', 'item-3 copy 3']);
    expect(new Set(names).size).toBe(names.length);
    expect(Math.max(...names.map((n) => n.length))).toBeLessThanOrEqual(MAX_NAME_LENGTH);
  });

  it('cuts names that are already at the length limit to fit the copy suffix', () => {
    const long = 'x'.repeat(MAX_NAME_LENGTH);
    const s = run(
      createEditorState(makeDoc([makeItem({ id: 'item-1', name: long })])),
      { type: 'selectAll' },
      { type: 'duplicate' },
    );
    expect(s.doc.items[1]?.name).toBe(`${'x'.repeat(MAX_NAME_LENGTH - 5)} copy`);
  });

  it('clamps coordinates and sizes to the limits the importer accepts', () => {
    const s = run(base(), {
      type: 'updateItem',
      id: 'item-3',
      patch: { x: 2_000_000, width: 5_000_000 },
      label: 'Change position of item-3',
    });
    expect(s.doc.items[2]).toMatchObject({ x: MAX_COORDINATE, width: MAX_COORDINATE });
    const nudged = run(s, { type: 'select', ids: ['item-3'] }, { type: 'nudge', dx: 10, dy: 0 });
    expect(nudged.doc.items[2]?.x).toBe(MAX_COORDINATE);
    expect(parseDocument(serializeDocument(nudged.doc)).ok).toBe(true);
  });

  it('trims and shortens names and titles', () => {
    const s = run(
      base(),
      {
        type: 'updateItem',
        id: 'item-3',
        patch: { name: `  ${'n'.repeat(200)} ` },
        label: 'Rename',
      },
      { type: 'setTitle', title: 't'.repeat(200) },
    );
    expect(s.doc.items[2]?.name).toHaveLength(MAX_NAME_LENGTH);
    expect(s.doc.title).toHaveLength(MAX_NAME_LENGTH);
    expect(
      run(base(), { type: 'updateItem', id: 'item-3', patch: { name: '   ' }, label: 'Rename' }),
    ).toEqual(base());
  });

  it('refuses to grow the plan past the item limit and says why', () => {
    const items = Array.from({ length: MAX_ITEMS }, (_, i) => makeItem({ id: `item-${i + 1}` }));
    const full = createEditorState(makeDoc(items));
    const added = run(full, { type: 'add', kind: 'desk', at: { x: 0, y: 0 } });
    expect(added.doc).toBe(full.doc);
    expect(added.announcement).toBe('The plan already holds the maximum of 10,000 items.');
    const pasted = run(full, { type: 'selectAll' }, { type: 'copy' }, { type: 'paste' });
    expect(pasted.doc.items).toHaveLength(MAX_ITEMS);
  });
});

describe('gestures that outlive their items', () => {
  it('skips items deleted while the gesture was running instead of throwing', () => {
    const s0 = run(base(), { type: 'select', ids: ['item-3'] });
    const before = [s0.doc.items[2]!];
    const after = [{ ...before[0]!, x: 999 }];
    const deleted = run(s0, { type: 'delete' });
    const committed = run(deleted, { type: 'commitItems', label: 'Move 1 item', before, after });
    expect(committed).toBe(deleted);
    expect(run(committed, { type: 'undo' }).doc).toEqual(base().doc);
  });

  it('patches only the fields the gesture changed onto the current items', () => {
    const s0 = base();
    const before = [s0.doc.items[2]!];
    const renamed = run(s0, {
      type: 'updateItem',
      id: 'item-3',
      patch: { name: 'Renamed' },
      label: 'Rename',
    });
    const s = run(renamed, {
      type: 'commitItems',
      label: 'Move 1 item',
      before,
      after: [{ ...before[0]!, y: 50 }],
    });
    expect(s.doc.items[2]).toMatchObject({ name: 'Renamed', y: 50 });
    expect(run(s, { type: 'undo' }).doc).toEqual(renamed.doc);
  });
});

describe('history and the selection', () => {
  it('restores the selection on undo and redo', () => {
    const deleted = run(base(), { type: 'select', ids: ['item-3'] }, { type: 'delete' });
    expect(deleted.selection).toEqual([]);
    const undone = run(deleted, { type: 'undo' });
    expect(undone.selection).toEqual(['item-3']);
    expect(run(undone, { type: 'redo' }).selection).toEqual([]);
  });

  it('restores the selection of a duplicate on redo', () => {
    const s = run(base(), { type: 'select', ids: ['item-3'] }, { type: 'duplicate' });
    const redone = run(s, { type: 'undo' }, { type: 'redo' });
    expect(redone.selection).toEqual(s.selection);
  });
});

describe('announcements', () => {
  it('says where a nudged item ended up', () => {
    const s = run(base(), { type: 'select', ids: ['item-3'] }, { type: 'nudge', dx: 10, dy: -20 });
    expect(s.announcement).toBe('Nudge 1 item. item-3 at 410, -20 cm.');
  });

  it('gives the corner of a moved multi-selection and the angle of a turned item', () => {
    const moved = run(base(), { type: 'selectAll' }, { type: 'nudge', dx: 10, dy: 0 });
    expect(moved.announcement).toBe('Nudge 3 items. Top-left corner at -70, -40 cm.');
    const turned = run(
      base(),
      { type: 'select', ids: ['item-3'] },
      { type: 'rotateBy', degrees: 15 },
    );
    expect(turned.announcement).toBe('Rotate clockwise 1 item. item-3 turned to 15°.');
    const resized = run(base(), {
      type: 'updateItem',
      id: 'item-3',
      patch: { width: 200 },
      label: 'Change width of item-3',
    });
    expect(resized.announcement).toBe('Change width of item-3. item-3 200 × 80 cm.');
  });

  it('changes the announcement id even when the message repeats', () => {
    const once = run(base(), { type: 'selectAll' });
    const twice = run(once, { type: 'selectAll' });
    expect(twice.announcement).toBe(once.announcement);
    expect(twice.announcementId).toBe(once.announcementId + 1);
  });
});

describe('groups', () => {
  it('renames a group as an undoable step and ignores blank or unchanged names', () => {
    const s = run(base(), { type: 'renameGroup', id: 'group-9', name: '  Window pod ' });
    expect(s.doc.groups).toEqual([{ id: 'group-9', name: 'Window pod' }]);
    expect(s.history.past.at(-1)?.label).toBe('Rename Pod to Window pod');
    expect(run(s, { type: 'undo' }).doc.groups).toEqual([{ id: 'group-9', name: 'Pod' }]);
    expect(run(s, { type: 'renameGroup', id: 'group-9', name: ' ' })).toBe(s);
    expect(run(s, { type: 'renameGroup', id: 'group-9', name: 'Window pod' })).toBe(s);
    expect(run(s, { type: 'renameGroup', id: 'nope', name: 'X' })).toBe(s);
  });

  it('never gives two groups the same default name', () => {
    const doc = makeDoc(
      [
        makeItem({ id: 'item-1', groupId: 'group-1' }),
        makeItem({ id: 'item-2', groupId: 'group-1' }),
        makeItem({ id: 'item-3' }),
        makeItem({ id: 'item-4' }),
      ],
      [{ id: 'group-1', name: 'Group 2' }],
    );
    const s = run(
      createEditorState(doc),
      { type: 'select', ids: ['item-3', 'item-4'], exact: true },
      { type: 'group' },
    );
    expect(s.doc.groups.map((g) => g.name)).toEqual(['Group 2', 'Group 3']);
  });

  it('names a new item with the next free number', () => {
    const doc = makeDoc([makeItem({ id: 'item-1', kind: 'planter', name: 'Planter 2' })]);
    const s = run(createEditorState(doc), { type: 'add', kind: 'planter', at: { x: 0, y: 0 } });
    expect(s.doc.items.at(-1)?.name).toBe('Planter 3');
  });
});

describe('rotating a selection', () => {
  it('turns a multi-selection about its centre, keeping its layout', () => {
    const s = run(base(), { type: 'selectAll' }, { type: 'rotateBy', degrees: 90 });
    const positions = s.doc.items.map((i) => [Math.round(i.x), Math.round(i.y), i.rotation]);
    expect(positions).toEqual([
      [200, -200, 90],
      [200, 0, 90],
      [200, 200, 90],
    ]);
  });
});

describe('ids from imported plans', () => {
  const memory = (): KeyValueStore => {
    const data = new Map<string, string>();
    return {
      getItem: (key) => data.get(key) ?? null,
      setItem: (key, value) => data.set(key, value),
    };
  };

  it('mints distinct, valid ids after ids with huge numeric suffixes, so autosave keeps working', () => {
    const doc = makeDoc([
      makeItem({ id: 'item-9007199254740993' }),
      makeItem({ id: `item-1${'9'.repeat(25)}` }),
      makeItem({ id: 'item-999999999999999' }),
    ]);
    const add = { type: 'add', kind: 'desk', at: { x: 0, y: 0 } } as const;
    const s = run(createEditorState(doc), add, add, { type: 'selectAll' }, { type: 'group' });
    const ids = [...s.doc.items.map((i) => i.id), ...s.doc.groups.map((g) => g.id)];
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.slice(3, 5)).toEqual(['item-1000000000000000', 'item-1000000000000001']);
    expect(s.doc.groups.map((g) => g.id)).toEqual(['group-1000000000000002']);
    expect(savePlan(memory(), s.doc)).toBeNull();
  });

  it('skips an id that is already taken instead of minting it twice', () => {
    const doc = makeDoc([makeItem({ id: 'item-5' }), makeItem({ id: 'group-6' })]);
    const state = { ...createEditorState(doc), serial: 5 };
    const s = run(state, { type: 'add', kind: 'desk', at: { x: 0, y: 0 } });
    expect(s.doc.items.at(-1)?.id).toBe('item-6');
    expect(s.serial).toBe(7);
  });
});

describe('holding an arrow key', () => {
  const nudge = (at?: number): EditorAction =>
    at === undefined ? { type: 'nudge', dx: 10, dy: 0 } : { type: 'nudge', dx: 10, dy: 0, at };

  it('merges nudges of the same selection into one undo step', () => {
    const start = run(base(), { type: 'select', ids: ['item-3'] });
    const repeats = Array.from({ length: 40 }, (_, i) => nudge(1000 + i * 33));
    const held = run(start, ...repeats);
    expect(held.history.past).toHaveLength(1);
    expect(held.doc.items[2]?.x).toBe(800);
    const undone = run(held, { type: 'undo' });
    expect(undone.doc).toEqual(start.doc);
    expect(undone.selection).toEqual(['item-3']);
  });

  it('starts a new step after a pause, a new selection or another edit', () => {
    const start = run(base(), { type: 'select', ids: ['item-3'] });
    const paused = run(start, nudge(0), nudge(COALESCE_WINDOW_MS + 1));
    expect(paused.history.past).toHaveLength(2);
    const reselected = run(start, nudge(0), { type: 'select', ids: ['item-1'] }, nudge(10));
    expect(reselected.history.past).toHaveLength(2);
    const edited = run(start, nudge(0), { type: 'rotateBy', degrees: 15 }, nudge(20));
    expect(edited.history.past).toHaveLength(3);
    const untimed = run(start, nudge(), nudge());
    expect(untimed.history.past).toHaveLength(2);
  });

  it('does not merge into a step that was undone and redone into the future', () => {
    const start = run(base(), { type: 'select', ids: ['item-3'] });
    const s = run(start, nudge(0), nudge(10), { type: 'undo' }, nudge(20));
    expect(s.history.past).toHaveLength(1);
    expect(s.history.future).toHaveLength(0);
    expect(s.doc.items[2]?.x).toBe(410);
  });
});

describe('rotating back and forth', () => {
  it('restores an uneven multi-selection exactly after +θ then −θ, for seeded random layouts', () => {
    const random = seeded(7);
    for (let trial = 0; trial < 50; trial += 1) {
      const items = Array.from({ length: 2 + Math.floor(random() * 4) }, (_, i) =>
        makeItem({
          id: `item-${i + 1}`,
          x: Math.round(random() * 4000 - 2000),
          y: Math.round(random() * 4000 - 2000),
          width: 20 + Math.round(random() * 400),
          height: 20 + Math.round(random() * 400),
          rotation: Math.round(random() * 359),
        }),
      );
      const degrees = [15, 45, 90, -15][trial % 4] ?? 15;
      const start = run(createEditorState(makeDoc(items)), { type: 'selectAll' });
      const back = run(
        start,
        { type: 'rotateBy', degrees },
        { type: 'rotateBy', degrees: -degrees },
      );
      back.doc.items.forEach((item, i) => {
        const original = items[i]!;
        expect(item.x).toBeCloseTo(original.x, 6);
        expect(item.y).toBeCloseTo(original.y, 6);
        expect(item.rotation).toBeCloseTo(original.rotation, 6);
      });
    }
  });

  it('comes back to the start after 24 turns of 15°', () => {
    const doc = makeDoc([
      makeItem({ id: 'item-1', kind: 'meetingRoom', x: 0, y: 0, width: 100, height: 100 }),
      makeItem({ id: 'item-2', kind: 'planter', x: 200, y: 0, width: 10, height: 10 }),
    ]);
    const turns = Array.from({ length: 24 }, (): EditorAction => ({
      type: 'rotateBy',
      degrees: 15,
    }));
    const s = run(createEditorState(doc), { type: 'selectAll' }, ...turns);
    s.doc.items.forEach((item, i) => {
      expect(item.x).toBeCloseTo(doc.items[i]!.x, 6);
      expect(item.y).toBeCloseTo(doc.items[i]!.y, 6);
    });
  });
});
