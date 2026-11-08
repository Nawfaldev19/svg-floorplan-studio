// Modal confirmation dialog built on the native <dialog> element.
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { Button } from './Button';
import styles from './Dialog.module.css';

interface DialogProps {
  /** Whether the dialog is shown (as a modal). */
  readonly open: boolean;
  /** Heading, also the dialog's accessible name. */
  readonly title: string;
  /** Body content. */
  readonly children: ReactNode;
  /** Text of the confirming button. */
  readonly confirmLabel: string;
  /** Text of the cancelling button; omit for a single-button dialog. */
  readonly cancelLabel?: string;
  /** `danger` styles the confirming button as destructive or as an error acknowledgement. */
  readonly tone?: 'primary' | 'danger';
  /** Wider body for reference content such as the shortcut list; it can scroll and is a Tab stop. */
  readonly wide?: boolean;
  /** Called when the confirming button is pressed. */
  readonly onConfirm: () => void;
  /** Called on Cancel, on Escape and whenever the dialog closes. */
  readonly onClose: () => void;
}

/**
 * Thin wrapper over the native <dialog> element: the browser supplies the
 * focus trap, Esc handling, inert background and focus restoration. Focus
 * starts on the safe choice: Cancel when there is one, otherwise the only button.
 */
export function Dialog({
  open,
  title,
  children,
  confirmLabel,
  cancelLabel,
  tone = 'primary',
  wide = false,
  onConfirm,
  onClose,
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      (cancelRef.current ?? confirmRef.current)?.focus();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={`${styles.dialog} ${wide ? styles.wide : ''}`}
      aria-labelledby={titleId}
      onClose={onClose}
    >
      <h2 id={titleId} className={styles.title}>
        {title}
      </h2>
      {/* Long reference content scrolls; a Tab stop lets keyboard users scroll it (WCAG 2.1.1). */}
      <div
        className={styles.body}
        {...(wide ? { tabIndex: 0, role: 'region', 'aria-labelledby': titleId } : {})}
      >
        {children}
      </div>
      <div className={styles.actions}>
        {cancelLabel && (
          <Button ref={cancelRef} variant="ghost" onClick={onClose}>
            {cancelLabel}
          </Button>
        )}
        <Button ref={confirmRef} variant={tone} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </dialog>
  );
}
