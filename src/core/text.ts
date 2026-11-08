/**
 * Text helpers for names and announcements. Copy names are numbered so they
 * stay within the name limit however often an item is duplicated.
 *
 * @packageDocumentation
 */
import { MAX_NAME_LENGTH } from './limits';

/**
 * A count with its noun, pluralised with a plain "s".
 *
 * @example
 * ```ts
 * plural(1, 'item'); // "1 item"
 * plural(3, 'item'); // "3 items"
 * ```
 */
export function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}

/** Whole centimetres for announcements; never prints "-0". */
export function formatCm(value: number): string {
  return String(Math.round(value) || 0);
}

const COPY_SUFFIX = / copy(?: \d+)?$/;

function fit(base: string, suffix: string): string {
  return `${base.slice(0, MAX_NAME_LENGTH - suffix.length).trimEnd()}${suffix}`;
}

/**
 * A name for a copy that is not already taken: "Desk 3" becomes "Desk 3 copy",
 * then "Desk 3 copy 2". Copying a copy numbers it instead of growing
 * "copy copy copy", so names stay within the length limit. A name that is free
 * (for example after a cut) is kept as it is.
 *
 * @param name - The original item's name.
 * @param taken - Names already used in the plan.
 * @returns A name not in `taken`, at most `MAX_NAME_LENGTH` characters long.
 *
 * @example
 * ```ts
 * uniqueName('Desk 3', new Set(['Desk 3'])); // "Desk 3 copy"
 * uniqueName('Desk 3 copy', new Set(['Desk 3', 'Desk 3 copy'])); // "Desk 3 copy 2"
 * ```
 */
export function uniqueName(name: string, taken: ReadonlySet<string>): string {
  if (!taken.has(name)) return name;
  const base = name.replace(COPY_SUFFIX, '');
  for (let n = 1; ; n += 1) {
    const candidate = fit(base, n === 1 ? ' copy' : ` copy ${n}`);
    if (!taken.has(candidate)) return candidate;
  }
}

/**
 * Shortens a name to whole words plus an ellipsis so it fits in `maxChars`.
 *
 * @remarks
 * Cutting only at word boundaries keeps the visible label made of whole words
 * of the item's accessible name, as WCAG 2.5.3 Label in Name asks, so a
 * speech-input user can say what they see. When not even the first word fits,
 * the label is left out rather than showing part of a word.
 *
 * @returns `name` when it fits, otherwise whole words and "…", or an empty string.
 * @example
 * ```ts
 * shortenToWords('Phone nook', 8); // "Phone…"
 * shortenToWords('Phone nook', 4); // ""
 * ```
 */
export function shortenToWords(name: string, maxChars: number): string {
  if (name.length <= maxChars) return name;
  // The last space that leaves room for the ellipsis ends the last whole word.
  const space = maxChars > 1 ? name.lastIndexOf(' ', maxChars - 1) : -1;
  return space > 0 ? `${name.slice(0, space).trimEnd()}…` : '';
}

/** "Group N" for the first N, from `start` upwards, that no group uses yet. */
export function nextGroupName(taken: ReadonlySet<string>, start: number): string {
  for (let n = start; ; n += 1) {
    const candidate = `Group ${n}`;
    if (!taken.has(candidate)) return candidate;
  }
}
