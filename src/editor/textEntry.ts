// Tells whether keys belong to the focused control, so editor-wide keys (shortcuts, Escape to close a drawer) leave them alone.

/**
 * Fields where keys belong to the control: typing, choosing an option, moving between radios.
 *
 * @param target - The element a key went to.
 * @returns `true` for text inputs, text areas, selects, radios and editable content.
 */
export function isTextEntry(target: unknown): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  if (target instanceof HTMLInputElement) return target.type !== 'checkbox';
  return target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement;
}
