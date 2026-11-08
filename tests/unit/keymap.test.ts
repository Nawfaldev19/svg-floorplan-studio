import { describe, expect, it } from 'vitest';
import { KEYMAP, POINTER_HELP, resolveShortcut, type KeyInput } from '../../src/core/keymap';

const key = (k: string, mods: Partial<Omit<KeyInput, 'key'>> = {}): KeyInput => ({
  key: k,
  mod: false,
  shift: false,
  alt: false,
  ...mods,
});

describe('resolveShortcut', () => {
  it.each([
    [key('z', { mod: true }), { type: 'undo' }],
    [key('Z', { mod: true, shift: true }), { type: 'redo' }],
    [key('y', { mod: true }), { type: 'redo' }],
    [key('d', { mod: true }), { type: 'duplicate' }],
    [key('g', { mod: true }), { type: 'group' }],
    [key('g', { mod: true, shift: true }), { type: 'ungroup' }],
    [key('a', { mod: true }), { type: 'selectAll' }],
    [key('c', { mod: true }), { type: 'copy' }],
    [key('x', { mod: true }), { type: 'cut' }],
    [key('v', { mod: true }), { type: 'paste' }],
    [key('['), { type: 'rotateBy', degrees: -15 }],
    [key(']'), { type: 'rotateBy', degrees: 15 }],
    [key('{', { shift: true }), { type: 'rotateBy', degrees: -90 }],
    [key('}', { shift: true }), { type: 'rotateBy', degrees: 90 }],
    [key('Delete'), { type: 'delete' }],
    [key('Backspace'), { type: 'delete' }],
    [key('Escape'), { type: 'clearSelection' }],
    [key('='), { type: 'zoom', direction: 'in' }],
    [key('-'), { type: 'zoom', direction: 'out' }],
    [key('0'), { type: 'zoom', direction: 'reset' }],
    [key('f'), { type: 'zoom', direction: 'fit' }],
    [key('t'), { type: 'toggleTagMode' }],
    [key('d'), { type: 'add', kind: 'desk' }],
    [key('W'), { type: 'add', kind: 'wall' }],
    [key('[', { shift: true }), { type: 'rotateBy', degrees: -90 }],
    [key('+'), { type: 'zoom', direction: 'in' }],
    [key('?', { shift: true }), { type: 'showShortcuts' }],
  ])('maps %o', (input, expected) => {
    expect(resolveShortcut(input, 'edit')).toEqual(expected);
  });

  it('turns arrows into nudges, large with Shift', () => {
    expect(resolveShortcut(key('ArrowLeft'), 'edit')).toEqual({
      type: 'nudge',
      dx: -1,
      dy: 0,
      large: false,
    });
    expect(resolveShortcut(key('ArrowDown', { shift: true }), 'edit')).toEqual({
      type: 'nudge',
      dx: 0,
      dy: 1,
      large: true,
    });
  });

  it('only picks tags by number in tag mode', () => {
    expect(resolveShortcut(key('3'), 'tag')).toEqual({ type: 'pickTag', index: 2 });
    expect(resolveShortcut(key('3'), 'edit')).toBeNull();
    expect(resolveShortcut(key('6'), 'tag')).toBeNull();
  });

  it('ignores unknown keys, unknown mod combos and Alt-modified add keys', () => {
    expect(resolveShortcut(key('q'), 'edit')).toBeNull();
    expect(resolveShortcut(key('k', { mod: true }), 'edit')).toBeNull();
    expect(resolveShortcut(key('d', { alt: true }), 'edit')).toBeNull();
  });
});

describe('scope and modes', () => {
  it('leaves the tag brush with Escape before clearing the selection', () => {
    expect(resolveShortcut(key('Escape'), 'tag')).toEqual({ type: 'setMode', mode: 'edit' });
  });

  it('only runs character keys and arrows while the canvas has focus', () => {
    expect(resolveShortcut(key('d'), 'edit', 'elsewhere')).toBeNull();
    expect(resolveShortcut(key('ArrowUp'), 'edit', 'elsewhere')).toBeNull();
    expect(resolveShortcut(key(']'), 'edit', 'elsewhere')).toBeNull();
    expect(resolveShortcut(key('z', { mod: true }), 'edit', 'elsewhere')).toEqual({
      type: 'undo',
    });
    expect(resolveShortcut(key('ArrowUp'), 'edit', 'outline')).toBeNull();
  });

  it('deletes only from the canvas or the outline, never from a toolbar button', () => {
    expect(resolveShortcut(key('Backspace'), 'edit', 'elsewhere')).toBeNull();
    expect(resolveShortcut(key('Delete'), 'edit', 'elsewhere')).toBeNull();
    expect(resolveShortcut(key('Delete'), 'edit', 'outline')).toEqual({ type: 'delete' });
    expect(resolveShortcut(key('Backspace'), 'edit', 'canvas')).toEqual({ type: 'delete' });
  });
});

describe('KEYMAP', () => {
  it('is the source of the resolver: every binding resolves to its own command', () => {
    for (const entry of KEYMAP) {
      for (const binding of entry.bindings) {
        const input = key(binding.key, {
          mod: binding.mod ?? false,
          shift: binding.shift ?? false,
          alt: binding.alt ?? false,
        });
        expect(resolveShortcut(input, binding.mode ?? 'edit')).toEqual(binding.command);
      }
    }
  });

  it('describes every entry for the help, with no duplicate key labels', () => {
    const labels = [...KEYMAP, ...POINTER_HELP].map((entry) => entry.keys);
    expect(new Set(labels).size).toBe(labels.length);
    for (const entry of KEYMAP) expect(entry.description.length).toBeGreaterThan(3);
  });
});
