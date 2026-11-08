/**
 * Bounds of the file format. The importer rejects anything outside them, so the
 * editor enforces the same numbers: it must never produce a plan it cannot load.
 *
 * @see docs/adr/0009-editor-enforces-file-format-limits.md
 * @packageDocumentation
 */

/** Most items a plan may hold; also caps the number of groups. */
export const MAX_ITEMS = 10_000;
/** Largest absolute coordinate, and the largest width or height, in centimetres. */
export const MAX_COORDINATE = 1_000_000;
/** Longest item, group or plan name, after trimming. */
export const MAX_NAME_LENGTH = 120;
/**
 * Smallest grid step in centimetres. Snapping, nudging and the drawn grid all
 * use the step, so a tiny one would make them invisible or degenerate.
 */
export const MIN_GRID_SIZE = 1;
/** Largest grid step in centimetres. */
export const MAX_GRID_SIZE = 500;
/** Largest file the importer will read at all, checked before the text is parsed. */
export const MAX_IMPORT_BYTES = 8 * 1024 * 1024;

/**
 * Clamps a coordinate into `[-MAX_COORDINATE, MAX_COORDINATE]`.
 *
 * @example
 * ```ts
 * clampCoordinate(2_000_000); // 1_000_000
 * ```
 */
export function clampCoordinate(value: number): number {
  return Math.min(MAX_COORDINATE, Math.max(-MAX_COORDINATE, value));
}

/**
 * Trims a name and cuts it to the maximum length.
 *
 * @returns The cleaned name; empty when `name` held only whitespace.
 */
export function cleanName(name: string): string {
  return name.trim().slice(0, MAX_NAME_LENGTH).trim();
}
