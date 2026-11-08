// A labelled numeric text field with commit-on-Enter/blur, Escape to revert and arrow-key stepping.
import { useId, useState } from 'react';
import styles from './Inspector.module.css';

interface NumberFieldProps {
  /** Visible label, also the accessible name. */
  readonly label: string;
  /** Unit shown after the field and read as part of its description, such as "cm". */
  readonly unit: string;
  /** Current value; shown rounded to one decimal place. */
  readonly value: number;
  /** Called with a finite number when the user commits a changed value. */
  readonly onCommit: (value: number) => void;
  /** Change per ArrowUp/ArrowDown press; Shift multiplies it by ten. */
  readonly step?: number;
}

/**
 * Edits a number as free text and commits on Enter or blur, so typing "1", "12",
 * "120" becomes one undo step instead of three. Escape restores the last value,
 * and ArrowUp/ArrowDown step the value and commit straight away. The unit and
 * any error are linked to the input, so they are announced with it.
 */
export function NumberField({ label, unit, value, onCommit, step = 1 }: NumberFieldProps) {
  const id = useId();
  const unitId = useId();
  const errorId = useId();
  const shown = String(Math.round(value * 10) / 10);
  const [draft, setDraft] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(false);

  const commit = () => {
    if (draft === null) return;
    const parsed = Number(draft);
    if (draft.trim() === '' || !Number.isFinite(parsed)) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    setDraft(null);
    if (parsed !== value) onCommit(parsed);
  };

  return (
    <div className={styles.field}>
      <label htmlFor={id}>{label}</label>
      <div className={styles.inputWrap}>
        <input
          id={id}
          className={styles.input}
          inputMode="decimal"
          value={draft ?? shown}
          aria-invalid={invalid}
          aria-describedby={invalid ? `${unitId} ${errorId}` : unitId}
          onChange={(e) => {
            setDraft(e.target.value);
          }}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
            if (e.key === 'Escape') {
              setDraft(null);
              setInvalid(false);
            }
            if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
              e.preventDefault();
              const typed = draft === null || draft.trim() === '' ? NaN : Number(draft);
              const base = Number.isFinite(typed) ? typed : value;
              const delta = (e.key === 'ArrowUp' ? step : -step) * (e.shiftKey ? 10 : 1);
              setDraft(null);
              setInvalid(false);
              onCommit(Math.round((base + delta) * 10) / 10);
            }
          }}
        />
        <span id={unitId} className={styles.unit} aria-hidden="true">
          {unit}
        </span>
      </div>
      {invalid && (
        <p id={errorId} className={styles.error}>
          Enter a number.
        </p>
      )}
    </div>
  );
}
