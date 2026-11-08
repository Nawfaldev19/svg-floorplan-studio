// File actions: load a preset, import a JSON plan (size-checked and validated
// before anything changes), and export the plan as a download, with their dialogs.
import { FilePlus } from 'lucide-react';
import { useRef, useState, type Dispatch, type ReactNode } from 'react';
import { checkImportSize, parseDocument, serializeDocument } from '../core/document';
import type { EditorAction } from '../core/editor';
import { createBlankPlan, createDemoPlan, createStressPlan } from '../core/seed';
import type { PlanDocument } from '../core/types';
import { Dialog } from '../shared/Dialog';
import styles from './EditorPage.module.css';

interface FileActionOptions {
  /** The current plan, used for export. */
  readonly doc: PlanDocument;
  /** Editor dispatch; replacing the plan is one undoable `replaceDocument` action. */
  readonly dispatch: Dispatch<EditorAction>;
  /** Called with the new plan after an import or preset replaces the current one. */
  readonly onReplaced: (doc: PlanDocument) => void;
}

/** A plan the user can start from. */
interface Preset {
  /** Stable identifier, used as the select's option value. */
  readonly id: string;
  /** Name shown in the picker and the overflow menu. */
  readonly label: string;
  /** Builds a fresh copy of the plan. */
  readonly make: () => PlanDocument;
}

/** The file actions, shared by the inline controls and the editor's overflow menu. */
export interface FileActions {
  /** The presets, in display order. */
  readonly presets: readonly Preset[];
  /** Asks for confirmation, then replaces the plan with a fresh copy of the preset. */
  readonly requestPreset: (id: string) => void;
  /** Opens the browser's file picker; the chosen file is checked before anything changes. */
  readonly chooseFile: () => void;
  /** Downloads the plan as `<title>.floorplan-studio.json`. */
  readonly exportPlan: () => void;
  /** The hidden file input and the confirmation and error dialogs. Render it exactly once. */
  readonly elements: ReactNode;
}

type Pending = {
  readonly doc: PlanDocument;
  readonly label: string;
  readonly notes: readonly string[];
};

const PRESETS: readonly Preset[] = [
  { id: 'demo', label: 'Demo floor', make: createDemoPlan },
  { id: 'stress', label: 'Stress floor (3,000 desks)', make: () => createStressPlan() },
  { id: 'blank', label: 'Blank floor', make: createBlankPlan },
];

function slugify(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'plan'
  );
}

/** Some browsers cancel a download if its object URL is revoked in the same task. */
const REVOKE_DELAY_MS = 1000;

/**
 * Preset, import and export behaviour with its confirmation and error dialogs.
 *
 * @remarks
 * An import is read only if {@link checkImportSize} allows it, then parsed by
 * {@link parseDocument}. The plan is replaced only after the user confirms, so
 * a bad or unwanted file never changes anything.
 *
 * @see docs/adr/0006-validate-every-import-then-normalise.md
 */
export function useFileActions({ doc, dispatch, onReplaced }: FileActionOptions): FileActions {
  const fileInput = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [errors, setErrors] = useState<readonly string[] | null>(null);

  const exportPlan = () => {
    const blob = new Blob([serializeDocument(doc)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${slugify(doc.title)}.floorplan-studio.json`;
    link.click();
    window.setTimeout(() => {
      URL.revokeObjectURL(url);
    }, REVOKE_DELAY_MS);
  };

  const readFile = async (file: File) => {
    const tooLarge = checkImportSize(file.size);
    if (tooLarge) {
      setErrors([tooLarge]);
      return;
    }
    const result = parseDocument(await file.text());
    if (result.ok)
      setPending({ doc: result.document, label: `Import ${file.name}`, notes: result.notes });
    else setErrors(result.errors);
  };

  const requestPreset = (id: string) => {
    const preset = PRESETS.find((p) => p.id === id);
    if (preset) {
      setPending({ doc: preset.make(), label: `Load ${preset.label.toLowerCase()}`, notes: [] });
    }
  };

  const elements = (
    <>
      <input
        ref={fileInput}
        type="file"
        accept="application/json,.json"
        className="visually-hidden"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) {
            readFile(file).catch((error: unknown) => {
              setErrors([`Could not read the file: ${String(error)}`]);
            });
          }
        }}
      />
      <Dialog
        open={pending !== null}
        title="Replace the current plan?"
        confirmLabel="Replace plan"
        cancelLabel="Keep current plan"
        onClose={() => {
          setPending(null);
        }}
        onConfirm={() => {
          if (!pending) return;
          dispatch({
            type: 'replaceDocument',
            doc: pending.doc,
            label: pending.label,
            announcement: [
              `${pending.label}: ${pending.doc.items.length} items.`,
              ...pending.notes,
            ].join(' '),
          });
          onReplaced(pending.doc);
          setPending(null);
        }}
      >
        <p>
          <FilePlus size={16} aria-hidden="true" className={styles.inlineIcon} />
          {pending ? `${pending.doc.title} has ${pending.doc.items.length} items.` : ''} You can
          undo this.
        </p>
      </Dialog>
      <Dialog
        open={errors !== null}
        title="That file could not be imported"
        confirmLabel="OK"
        tone="danger"
        onClose={() => {
          setErrors(null);
        }}
        onConfirm={() => {
          setErrors(null);
        }}
      >
        <p>Nothing was changed. The file has these problems:</p>
        <ul>
          {errors?.map((error, index) => (
            // Messages can repeat, and the list never reorders, so the position is the key.
            <li key={index}>{error}</li>
          ))}
        </ul>
      </Dialog>
    </>
  );

  return {
    presets: PRESETS,
    requestPreset,
    chooseFile: () => fileInput.current?.click(),
    exportPlan,
    elements,
  };
}
