/**
 * The single table of keyboard shortcuts and the pure resolver that reads it.
 * The help dialog, the landing page and docs/reference/keyboard.md all come
 * from {@link KEYMAP}; a unit test fails if the reference page drifts.
 *
 * @see docs/adr/0010-one-keymap-with-canvas-scoped-keys.md
 * @packageDocumentation
 */
import { AMENITY_SPECS, KIND_SPECS } from './catalog';
import type { EditorMode } from './editor';
import { AMENITY_TAGS, ITEM_KINDS, type ItemKind } from './types';

/** The parts of a key press the editor cares about, independent of any UI framework. */
export interface KeyInput {
  /** The browser's `key` value for the press, such as `z`, `Z` or `ArrowLeft`. */
  readonly key: string;
  /** Ctrl on Windows/Linux, Cmd on macOS. */
  readonly mod: boolean;
  /** Shift is held. */
  readonly shift: boolean;
  /** Alt (Option) is held. */
  readonly alt: boolean;
}

/**
 * Where the key was pressed. Character keys and arrows only act on the canvas,
 * so they never fire while focus is on a button, list or checkbox (WCAG 2.1.4),
 * and speech-input users cannot trigger them by accident.
 */
export type KeyTarget = 'canvas' | 'outline' | 'elsewhere';

/**
 * Where a shortcut works: `editor` anywhere in the editor, `selection` on the
 * canvas or the outline (the two places that show what is selected), and
 * `canvas` on the canvas only.
 */
export type KeyScope = 'editor' | 'selection' | 'canvas';

const SCOPE_TARGETS: Readonly<Record<KeyScope, readonly KeyTarget[]>> = {
  editor: ['canvas', 'outline', 'elsewhere'],
  selection: ['canvas', 'outline'],
  canvas: ['canvas'],
};

/** What a shortcut asks the editor to do. Most variants map one-to-one onto an `EditorAction`. */
export type ShortcutCommand =
  | { readonly type: 'undo' }
  | { readonly type: 'redo' }
  | { readonly type: 'delete' }
  | { readonly type: 'duplicate' }
  | { readonly type: 'copy' }
  | { readonly type: 'cut' }
  | { readonly type: 'paste' }
  | { readonly type: 'rotateBy'; readonly degrees: number }
  | { readonly type: 'group' }
  | { readonly type: 'ungroup' }
  | { readonly type: 'selectAll' }
  | { readonly type: 'clearSelection' }
  | { readonly type: 'nudge'; readonly dx: number; readonly dy: number; readonly large: boolean }
  | { readonly type: 'add'; readonly kind: ItemKind }
  | { readonly type: 'zoom'; readonly direction: 'in' | 'out' | 'reset' | 'fit' }
  | { readonly type: 'toggleTagMode' }
  | { readonly type: 'setMode'; readonly mode: EditorMode }
  | { readonly type: 'pickTag'; readonly index: number }
  | { readonly type: 'showShortcuts' };

interface KeyBinding {
  /** The browser's `key` value, lower-cased for single characters. */
  readonly key: string;
  readonly mod?: boolean;
  /** Omitted: Shift may or may not be held. */
  readonly shift?: boolean;
  /** Omitted: Alt may or may not be held. */
  readonly alt?: boolean;
  /** Omitted: active in every mode. */
  readonly mode?: EditorMode;
  readonly command: ShortcutCommand;
}

/** One line of the shortcut help, with the bindings it stands for. */
export interface ShortcutEntry {
  /** How the keys are written in help, e.g. "Ctrl/⌘ Z". */
  readonly keys: string;
  /** What the shortcut does, as shown in help. */
  readonly description: string;
  /** Where focus must be for the shortcut to work. */
  readonly scope: KeyScope;
  /** Concrete key combinations; the resolver tries them in table order. */
  readonly bindings: readonly KeyBinding[];
}

const MOD = 'Ctrl/⌘';

const ARROWS: readonly (readonly [string, number, number])[] = [
  ['ArrowLeft', -1, 0],
  ['ArrowRight', 1, 0],
  ['ArrowUp', 0, -1],
  ['ArrowDown', 0, 1],
];

const entry = (
  keys: string,
  description: string,
  bindings: readonly KeyBinding[],
  scope: KeyScope = 'editor',
): ShortcutEntry => ({ keys, description, bindings, scope });

const kindKeys = ITEM_KINDS.map((kind) => KIND_SPECS[kind].shortcut.toUpperCase()).join(' ');
const kindNames = ITEM_KINDS.map((kind) => KIND_SPECS[kind].label.toLowerCase()).join(', ');
const tagNames = AMENITY_TAGS.map((tag, i) => `${i + 1} ${AMENITY_SPECS[tag].label}`).join(', ');

/**
 * Every keyboard shortcut, in the order the help lists them. The resolver and
 * the shortcuts dialog both read this table, so the help can never drift.
 */
export const KEYMAP: readonly ShortcutEntry[] = [
  entry(`${MOD} Z`, 'Undo', [{ key: 'z', mod: true, shift: false, command: { type: 'undo' } }]),
  entry(`${MOD} Shift Z or ${MOD} Y`, 'Redo', [
    { key: 'z', mod: true, shift: true, command: { type: 'redo' } },
    { key: 'y', mod: true, command: { type: 'redo' } },
  ]),
  entry(`${MOD} C, X, V`, 'Copy, cut and paste the selection', [
    { key: 'c', mod: true, command: { type: 'copy' } },
    { key: 'x', mod: true, command: { type: 'cut' } },
    { key: 'v', mod: true, command: { type: 'paste' } },
  ]),
  entry(`${MOD} D`, 'Duplicate', [{ key: 'd', mod: true, command: { type: 'duplicate' } }]),
  entry(`${MOD} G`, 'Group (add Shift to ungroup)', [
    { key: 'g', mod: true, shift: false, command: { type: 'group' } },
    { key: 'g', mod: true, shift: true, command: { type: 'ungroup' } },
  ]),
  entry(`${MOD} A`, 'Select all', [{ key: 'a', mod: true, command: { type: 'selectAll' } }]),
  entry(
    'Delete or Backspace',
    'Delete the selection',
    [
      { key: 'Delete', command: { type: 'delete' } },
      { key: 'Backspace', command: { type: 'delete' } },
    ],
    'selection',
  ),
  entry('Esc', 'Leave the tag brush, then clear the selection', [
    { key: 'Escape', mode: 'tag', command: { type: 'setMode', mode: 'edit' } },
    { key: 'Escape', command: { type: 'clearSelection' } },
  ]),
  entry(
    'Arrow keys',
    'Nudge the selection one grid step (Shift: five steps)',
    ARROWS.flatMap(([key, dx, dy]): KeyBinding[] => [
      { key, shift: false, command: { type: 'nudge', dx, dy, large: false } },
      { key, shift: true, command: { type: 'nudge', dx, dy, large: true } },
    ]),
    'canvas',
  ),
  entry(
    '[ and ]',
    'Rotate 15° anticlockwise or clockwise (Shift: 90°)',
    [
      { key: '[', shift: false, command: { type: 'rotateBy', degrees: -15 } },
      { key: ']', shift: false, command: { type: 'rotateBy', degrees: 15 } },
      { key: '[', shift: true, command: { type: 'rotateBy', degrees: -90 } },
      { key: ']', shift: true, command: { type: 'rotateBy', degrees: 90 } },
      { key: '{', command: { type: 'rotateBy', degrees: -90 } },
      { key: '}', command: { type: 'rotateBy', degrees: 90 } },
    ],
    'canvas',
  ),
  entry(
    kindKeys,
    `Add a ${kindNames}`,
    ITEM_KINDS.map((kind): KeyBinding => ({
      key: KIND_SPECS[kind].shortcut,
      alt: false,
      command: { type: 'add', kind },
    })),
    'canvas',
  ),
  entry(
    '+ − 0',
    'Zoom in, zoom out, zoom to 100%',
    [
      { key: '+', command: { type: 'zoom', direction: 'in' } },
      { key: '=', command: { type: 'zoom', direction: 'in' } },
      { key: '-', command: { type: 'zoom', direction: 'out' } },
      { key: '0', command: { type: 'zoom', direction: 'reset' } },
    ],
    'canvas',
  ),
  entry(
    'F',
    'Fit the selection, or the whole plan',
    [{ key: 'f', command: { type: 'zoom', direction: 'fit' } }],
    'canvas',
  ),
  entry('T', 'Toggle the tag brush', [{ key: 't', command: { type: 'toggleTagMode' } }], 'canvas'),
  entry(
    '1 to 5',
    `In the tag brush, pick the tag: ${tagNames}`,
    AMENITY_TAGS.map((_, index): KeyBinding => ({
      key: String(index + 1),
      mode: 'tag',
      command: { type: 'pickTag', index },
    })),
    'canvas',
  ),
  entry('?', 'Show these shortcuts', [{ key: '?', command: { type: 'showShortcuts' } }], 'canvas'),
];

/** Pointer gestures, listed next to the shortcuts in the help. */
export const POINTER_HELP: readonly { readonly keys: string; readonly description: string }[] = [
  { keys: 'Wheel', description: 'Pan the editor canvas (the viewer scrolls the page)' },
  { keys: `${MOD} + wheel or pinch`, description: 'Zoom at the pointer' },
  { keys: 'Space + drag, or middle button', description: 'Pan' },
  { keys: 'Shift + click', description: 'Add to or remove from the selection' },
  { keys: 'Alt + click', description: 'Pick one member of a group' },
  { keys: 'Alt while dragging', description: 'Move or resize without snapping to the grid' },
  { keys: 'Shift while resizing', description: 'Keep the proportions' },
  { keys: 'Shift while rotating', description: 'Snap to 15° steps' },
  { keys: 'Esc while dragging', description: 'Cancel the drag' },
  { keys: 'Touch: tap or drag an item', description: 'Select it, or select and move it' },
  { keys: 'Touch: drag empty space', description: 'Pan' },
  { keys: 'Touch: pinch with two fingers', description: 'Zoom' },
];

const BINDINGS = KEYMAP.flatMap((item) =>
  item.bindings.map((binding) => ({ binding, scope: item.scope })),
);

function matches(binding: KeyBinding, key: string, input: KeyInput, mode: EditorMode): boolean {
  return (
    binding.key === key &&
    (binding.mod ?? false) === input.mod &&
    (binding.shift === undefined || binding.shift === input.shift) &&
    (binding.alt === undefined || binding.alt === input.alt) &&
    (binding.mode === undefined || binding.mode === mode)
  );
}

/**
 * Pure keyboard map. Returns null for keys the editor does not handle here.
 *
 * @param mode - The editor mode; some bindings exist only in the tag brush.
 * @param target - Where focus is; a binding resolves only where its entry's scope allows.
 * @example
 * ```ts
 * resolveShortcut({ key: 'Z', mod: true, shift: false, alt: false }, 'edit'); // { type: 'undo' }
 * resolveShortcut({ key: 'd', mod: false, shift: false, alt: false }, 'edit', 'elsewhere'); // null
 * ```
 */
export function resolveShortcut(
  input: KeyInput,
  mode: EditorMode,
  target: KeyTarget = 'canvas',
): ShortcutCommand | null {
  const key = input.key.length === 1 ? input.key.toLowerCase() : input.key;
  const found = BINDINGS.find(({ binding }) => matches(binding, key, input, mode));
  if (!found || !SCOPE_TARGETS[found.scope].includes(target)) return null;
  return found.binding.command;
}
