import { describe, expect, it } from 'vitest';
import reference from '../../docs/reference/keyboard.md?raw';
import { KEYMAP, POINTER_HELP, type KeyScope } from '../../src/core/keymap';

const SCOPE: Readonly<Record<KeyScope, string>> = {
  editor: 'Anywhere in the editor',
  selection: 'Canvas or outline focused',
  canvas: 'Canvas focused',
};

/** The cells of every table line between two HTML-comment markers, header and divider excluded. */
function tableBetween(markdown: string, name: string): string[][] {
  const start = markdown.indexOf(`<!-- ${name}:start -->`);
  const end = markdown.indexOf(`<!-- ${name}:end -->`);
  if (start < 0 || end < start) throw new Error(`markers for "${name}" not found`);
  return markdown
    .slice(start, end)
    .split('\n')
    .filter((line) => line.startsWith('|'))
    .slice(2)
    .map((line) =>
      line
        .slice(1, -1)
        .split('|')
        .map((cell) => cell.trim()),
    );
}

// docs/reference/keyboard.md documents KEYMAP; this keeps the two in step.
describe('docs/reference/keyboard.md', () => {
  it('lists every KEYMAP entry, in order, with its scope', () => {
    expect(tableBetween(reference, 'keymap')).toEqual(
      KEYMAP.map((entry) => [entry.keys, entry.description, SCOPE[entry.scope]]),
    );
  });

  it('lists every pointer gesture from POINTER_HELP, in order', () => {
    expect(tableBetween(reference, 'pointer')).toEqual(
      POINTER_HELP.map((entry) => [entry.keys, entry.description]),
    );
  });
});
