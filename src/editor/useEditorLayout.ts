// Picks the editor layout for the current window width: which panels are drawers and which tools move into menus.
import { useMediaQuery } from '../shared/useMediaQuery';

/**
 * The editor's layouts, from narrowest to widest.
 *
 * - `phone` (below 600 px): full-bleed canvas, panels in a bottom sheet, add
 *   tools in a menu, everything else except undo and redo in the overflow menu.
 * - `tablet` (600–1023 px): full-bleed canvas, panels in a side drawer,
 *   duplicate and delete stay on the toolbar.
 * - `desktop` (1024–1279 px): the sidebar is always shown; file tools and
 *   the shortcut help move into the overflow menu.
 * - `wide` (1280 px and up): every tool is on the toolbar.
 *
 * @see docs/adr/0015-responsive-editor-with-drawers-and-overflow-menu.md
 */
export type EditorLayout = 'phone' | 'tablet' | 'desktop' | 'wide';

/** Whether the outline and inspector are drawers that open on request rather than a fixed sidebar. */
export function hasDrawers(layout: EditorLayout): boolean {
  return layout === 'phone' || layout === 'tablet';
}

/**
 * The layout for the current window width, updated when the window is resized
 * or a tablet is rotated.
 *
 * @remarks
 * The breakpoints live here only; CSS styles the layouts through the
 * `data-layout` attribute that `EditorPage` sets from this value, so the two
 * can never disagree.
 */
export function useEditorLayout(): EditorLayout {
  const wide = useMediaQuery('(min-width: 1280px)');
  const desktop = useMediaQuery('(min-width: 1024px)');
  const tablet = useMediaQuery('(min-width: 600px)');
  if (wide) return 'wide';
  if (desktop) return 'desktop';
  return tablet ? 'tablet' : 'phone';
}
