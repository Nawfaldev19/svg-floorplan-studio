// The "?" help dialog listing every shortcut from KEYMAP.
import { Dialog } from '../shared/Dialog';
import { ShortcutList } from '../shared/ShortcutList';

/**
 * The "?" help: every shortcut, generated from the keymap.
 *
 * @param props - `open`: whether it is shown; `onClose`: called on Close or Escape.
 */
export function ShortcutsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog
      open={open}
      title="Keyboard shortcuts"
      confirmLabel="Close"
      wide
      onConfirm={onClose}
      onClose={onClose}
    >
      <p>
        Keys marked “canvas focused” work while the plan canvas has focus, so they never fire while
        you use a button, list or field; Delete also works in the outline. Ctrl is ⌘ on a Mac.
      </p>
      <ShortcutList headingLevel="h3" />
    </Dialog>
  );
}
