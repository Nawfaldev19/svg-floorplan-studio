// The app's button: variants from the design tokens and an optional icon.
import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react';
import styles from './Button.module.css';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual weight; defaults to `secondary`. */
  readonly variant?: Variant;
  /** Leading icon, which should be `aria-hidden`. */
  readonly icon?: ReactNode;
  /**
   * Icon-only: the text is hidden visually but stays the accessible name.
   * Pair it with `title` so pointer users get the name as a tooltip.
   */
  readonly compact?: boolean;
  /** Forwarded to the native button (React 19 ref-as-prop). */
  readonly ref?: Ref<HTMLButtonElement>;
}

/**
 * A native `<button>` with `type="button"` by default, so it never submits a form by accident.
 * Icon-only buttons must pass `aria-label` or use `compact` with text.
 *
 * @remarks
 * Its height and an icon-only button's width come from `--size-control`, which
 * grows to 44 px on touch screens (WCAG 2.5.8; 2.5.5 where the layout allows).
 *
 * `disabled` renders `aria-disabled="true"` and ignores clicks instead of
 * setting the native attribute. A natively disabled button drops keyboard
 * focus to the page body, so pressing Undo until the history is empty, or
 * Delete on the toolbar, would strand the user outside the editor. Disabled
 * controls stay focusable, as the WAI-ARIA toolbar pattern recommends.
 */
export function Button({
  variant = 'secondary',
  icon,
  compact = false,
  className,
  children,
  type = 'button',
  disabled = false,
  onClick,
  ...rest
}: ButtonProps) {
  const iconOnly = compact || children === undefined;
  const classes = [styles.button, styles[variant], iconOnly ? styles.iconOnly : '', className ?? '']
    .filter(Boolean)
    .join(' ');
  return (
    <button
      type={type}
      className={classes}
      aria-disabled={disabled ? true : undefined}
      onClick={(e) => {
        if (disabled) e.preventDefault();
        else onClick?.(e);
      }}
      {...rest}
    >
      {icon}
      {children !== undefined && <span className={styles.text}>{children}</span>}
    </button>
  );
}
