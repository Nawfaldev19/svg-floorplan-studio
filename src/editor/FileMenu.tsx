// The wide toolbar's inline file controls: preset picker, Load, Import and Export.
import { Download, FolderOpen, Upload } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../shared/Button';
import styles from './EditorPage.module.css';
import type { FileActions } from './useFileActions';

/**
 * The inline file controls of the wide toolbar: a preset picker with its Load
 * button, Import and Export. Narrower layouts offer the same actions in the
 * overflow menu.
 *
 * @param props - `actions`: from `useFileActions`; `showLabels`: show
 *   Import and Export as text as well as icons.
 * @remarks
 * Choosing a preset in the select does not load it; the Load button does
 * (WCAG 3.2.2 On Input).
 */
export function FileMenu({ actions, showLabels }: { actions: FileActions; showLabels: boolean }) {
  const [presetId, setPresetId] = useState(actions.presets[0]?.id ?? '');
  return (
    <div className={styles.fileMenu}>
      {/* Choosing an option only picks it; the Load button acts (no change of context on input). */}
      <label>
        <span className="visually-hidden">Preset plan</span>
        <select
          className={styles.select}
          value={presetId}
          onChange={(e) => {
            setPresetId(e.target.value);
          }}
        >
          {actions.presets.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.label}
            </option>
          ))}
        </select>
      </label>
      <Button
        variant="ghost"
        compact
        title="Load preset"
        icon={<FolderOpen size={18} aria-hidden="true" />}
        onClick={() => {
          actions.requestPreset(presetId);
        }}
      >
        Load preset
      </Button>
      <Button
        variant="ghost"
        compact={!showLabels}
        title={showLabels ? undefined : 'Import'}
        icon={<Upload size={18} aria-hidden="true" />}
        onClick={actions.chooseFile}
      >
        Import
      </Button>
      <Button
        variant="secondary"
        compact={!showLabels}
        title={showLabels ? undefined : 'Export'}
        icon={<Download size={18} aria-hidden="true" />}
        onClick={actions.exportPlan}
      >
        Export
      </Button>
    </div>
  );
}
