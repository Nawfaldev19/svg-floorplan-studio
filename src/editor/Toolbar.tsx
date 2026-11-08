// The editor toolbar: mode, add, history, selection and file controls in one
// WAI-ARIA toolbar with a single Tab stop, condensed into menus on narrow screens.
import {
  BrickWall,
  Copy,
  DoorOpen,
  Download,
  Ellipsis,
  FolderOpen,
  Group,
  Keyboard,
  MousePointer2,
  Paintbrush,
  Plus,
  RectangleHorizontal,
  Redo2,
  Sofa,
  Sprout,
  Trash2,
  Undo2,
  Ungroup,
  Upload,
  type LucideIcon,
} from 'lucide-react';
import { useRef, type Dispatch } from 'react';
import { KIND_SPECS } from '../core/catalog';
import { canRedo, canUndo, type EditorAction, type EditorState } from '../core/editor';
import { ITEM_KINDS, type ItemKind } from '../core/types';
import { Button } from '../shared/Button';
import { MenuButton, type MenuEntry } from '../shared/MenuButton';
import styles from './EditorPage.module.css';
import { FileMenu } from './FileMenu';
import type { FileActions } from './useFileActions';
import type { EditorLayout } from './useEditorLayout';
import { useRovingFocus } from './useRovingFocus';

const KIND_ICONS: Readonly<Record<ItemKind, LucideIcon>> = {
  desk: RectangleHorizontal,
  meetingRoom: DoorOpen,
  lounge: Sofa,
  planter: Sprout,
  wall: BrickWall,
};

interface ToolbarProps {
  /** Editor state, for enabled states and undo/redo labels. */
  readonly state: EditorState;
  /** Editor dispatch. */
  readonly dispatch: Dispatch<EditorAction>;
  /** Adds an item of a kind at the centre of the view. */
  readonly onAdd: (kind: ItemKind) => void;
  /** Preset, import and export actions. */
  readonly files: FileActions;
  /** Opens the shortcut help. */
  readonly onShowShortcuts: () => void;
  /** The current layout, which decides what is on the toolbar and what is in menus. */
  readonly layout: EditorLayout;
}

const ICON = 18;

/** "Rename Larkspur room" becomes "rename Larkspur room", keeping proper names as typed. */
function lowerFirst(label: string): string {
  return label.charAt(0).toLowerCase() + label.slice(1);
}

/** A selection command, shown as a toolbar button or a menu item depending on the layout. */
interface SelectionTool {
  readonly label: string;
  readonly icon: LucideIcon;
  readonly disabled: boolean;
  readonly run: () => void;
  readonly keyshortcuts: string;
  readonly hint: string;
}

function toMenuEntry(tool: SelectionTool): MenuEntry {
  const Icon = tool.icon;
  return {
    label: tool.label,
    icon: <Icon size={ICON} aria-hidden="true" />,
    disabled: tool.disabled,
    onSelect: tool.run,
    keyshortcuts: tool.keyshortcuts,
    hint: tool.hint,
  };
}

/**
 * The editor toolbar. Buttons carry `aria-keyshortcuts` for their shortcut,
 * and arrow keys, Home and End move between enabled controls.
 *
 * @remarks
 * Every command is always reachable; the layout only decides where it lives.
 * On `wide` screens everything is a button. On `desktop` the file tools and
 * the shortcut help move into a "More tools" menu; on `tablet` the add tools
 * become an "Add" menu and grouping joins the overflow; on `phone` only the
 * modes, Add, undo and redo stay on the bar.
 *
 * @see docs/adr/0015-responsive-editor-with-drawers-and-overflow-menu.md
 */
export function Toolbar({ state, dispatch, onAdd, files, onShowShortcuts, layout }: ToolbarProps) {
  const ref = useRef<HTMLDivElement>(null);
  const roving = useRovingFocus(ref);
  const selectedCount = state.selection.length;
  const selectedGroups = state.doc.items.some(
    (item) => item.groupId !== null && state.selection.includes(item.id),
  );
  const lastLabel = state.history.past.at(-1)?.label;
  const nextLabel = state.history.future[0]?.label;

  const tools: Readonly<Record<'duplicate' | 'group' | 'ungroup' | 'delete', SelectionTool>> = {
    duplicate: {
      label: 'Duplicate',
      icon: Copy,
      disabled: selectedCount === 0,
      run: () => {
        dispatch({ type: 'duplicate' });
      },
      keyshortcuts: 'Control+D Meta+D',
      hint: 'Ctrl/⌘ D',
    },
    group: {
      label: 'Group',
      icon: Group,
      disabled: selectedCount < 2,
      run: () => {
        dispatch({ type: 'group' });
      },
      keyshortcuts: 'Control+G Meta+G',
      hint: 'Ctrl/⌘ G',
    },
    ungroup: {
      label: 'Ungroup',
      icon: Ungroup,
      disabled: !selectedGroups,
      run: () => {
        dispatch({ type: 'ungroup' });
      },
      keyshortcuts: 'Control+Shift+G Meta+Shift+G',
      hint: 'Ctrl/⌘ Shift G',
    },
    delete: {
      label: 'Delete',
      icon: Trash2,
      disabled: selectedCount === 0,
      run: () => {
        dispatch({ type: 'delete' });
      },
      keyshortcuts: 'Delete',
      hint: 'Del',
    },
  };

  const onBar: readonly (keyof typeof tools)[] =
    layout === 'phone'
      ? []
      : layout === 'tablet'
        ? ['duplicate', 'delete']
        : ['duplicate', 'group', 'ungroup', 'delete'];
  const inMenu = (Object.keys(tools) as (keyof typeof tools)[]).filter((t) => !onBar.includes(t));

  const fileEntries: readonly MenuEntry[] = [
    ...files.presets.map((preset) => ({
      label: `Load ${preset.label.toLowerCase()}…`,
      icon: <FolderOpen size={ICON} aria-hidden="true" />,
      onSelect: () => {
        files.requestPreset(preset.id);
      },
    })),
    { separator: true },
    {
      label: 'Import…',
      icon: <Upload size={ICON} aria-hidden="true" />,
      onSelect: files.chooseFile,
    },
    {
      label: 'Export',
      icon: <Download size={ICON} aria-hidden="true" />,
      onSelect: files.exportPlan,
    },
    { separator: true },
    {
      label: 'Keyboard shortcuts',
      icon: <Keyboard size={ICON} aria-hidden="true" />,
      onSelect: onShowShortcuts,
      keyshortcuts: '?',
      hint: '?',
    },
  ];
  const moreEntries: readonly MenuEntry[] = [
    ...inMenu.map((t) => toMenuEntry(tools[t])),
    ...(inMenu.length > 0 ? [{ separator: true } as const] : []),
    ...fileEntries,
  ];

  return (
    <div
      ref={ref}
      className={styles.toolbar}
      role="toolbar"
      aria-label="Editor tools"
      onFocus={(e) => {
        roving.focused(e.target);
      }}
      onKeyDown={(e) => {
        if (roving.keyPressed(e.target, e.key)) {
          e.preventDefault();
          // Arrow keys move within the toolbar here; they must not reach the editor.
          e.stopPropagation();
        }
      }}
    >
      <div className={styles.toolGroup} role="group" aria-label="Mode">
        <Button
          variant="ghost"
          compact={layout !== 'wide'}
          icon={<MousePointer2 size={ICON} aria-hidden="true" />}
          aria-pressed={state.mode === 'edit'}
          onClick={() => {
            dispatch({ type: 'setMode', mode: 'edit' });
          }}
          title="Select and edit (T toggles)"
        >
          Select
        </Button>
        <Button
          variant="ghost"
          compact={layout !== 'wide'}
          icon={<Paintbrush size={ICON} aria-hidden="true" />}
          aria-pressed={state.mode === 'tag'}
          onClick={() => {
            dispatch({ type: 'setMode', mode: 'tag' });
          }}
          title="Tag brush (T toggles)"
        >
          Tag brush
        </Button>
      </div>

      <div className={styles.toolGroup} role="group" aria-label="Add item">
        {layout === 'phone' || layout === 'tablet' ? (
          <MenuButton
            label="Add"
            showLabel={layout === 'tablet'}
            icon={<Plus size={ICON} aria-hidden="true" />}
            entries={ITEM_KINDS.map((kind) => {
              const Icon = KIND_ICONS[kind];
              const spec = KIND_SPECS[kind];
              return {
                label: spec.label,
                icon: <Icon size={ICON} aria-hidden="true" />,
                onSelect: () => {
                  onAdd(kind);
                },
                keyshortcuts: spec.shortcut.toUpperCase(),
                hint: spec.shortcut.toUpperCase(),
              };
            })}
          />
        ) : (
          ITEM_KINDS.map((kind) => {
            const Icon = KIND_ICONS[kind];
            const spec = KIND_SPECS[kind];
            return (
              <Button
                key={kind}
                variant="ghost"
                compact
                icon={<Icon size={ICON} aria-hidden="true" />}
                onClick={() => {
                  onAdd(kind);
                }}
                title={`Add ${spec.label.toLowerCase()} (${spec.shortcut.toUpperCase()})`}
                aria-keyshortcuts={spec.shortcut.toUpperCase()}
              >
                {`Add ${spec.label.toLowerCase()}`}
              </Button>
            );
          })
        )}
      </div>

      <div className={styles.toolGroup} role="group" aria-label="History">
        <Button
          variant="ghost"
          compact
          icon={<Undo2 size={ICON} aria-hidden="true" />}
          disabled={!canUndo(state)}
          onClick={() => {
            dispatch({ type: 'undo' });
          }}
          title={lastLabel ? `Undo ${lowerFirst(lastLabel)}` : 'Nothing to undo'}
          aria-keyshortcuts="Control+Z Meta+Z"
        >
          Undo
        </Button>
        <Button
          variant="ghost"
          compact
          icon={<Redo2 size={ICON} aria-hidden="true" />}
          disabled={!canRedo(state)}
          onClick={() => {
            dispatch({ type: 'redo' });
          }}
          title={nextLabel ? `Redo ${lowerFirst(nextLabel)}` : 'Nothing to redo'}
          aria-keyshortcuts="Control+Shift+Z Meta+Shift+Z"
        >
          Redo
        </Button>
      </div>

      {onBar.length > 0 && (
        <div className={styles.toolGroup} role="group" aria-label="Selection">
          {onBar.map((key) => {
            const tool = tools[key];
            const Icon = tool.icon;
            return (
              <Button
                key={key}
                variant="ghost"
                compact
                icon={<Icon size={ICON} aria-hidden="true" />}
                disabled={tool.disabled}
                onClick={tool.run}
                title={`${tool.label} (${tool.hint})`}
                aria-keyshortcuts={tool.keyshortcuts}
              >
                {tool.label}
              </Button>
            );
          })}
        </div>
      )}

      <div className={styles.toolGroupEnd}>
        {layout === 'wide' ? (
          <>
            <FileMenu actions={files} showLabels />
            <Button
              variant="ghost"
              compact
              icon={<Keyboard size={ICON} aria-hidden="true" />}
              onClick={onShowShortcuts}
              title="Shortcuts (?)"
              aria-keyshortcuts="?"
            >
              Shortcuts
            </Button>
          </>
        ) : (
          <MenuButton
            label="More tools"
            align="end"
            icon={<Ellipsis size={ICON} aria-hidden="true" />}
            entries={moreEntries}
          />
        )}
      </div>
    </div>
  );
}
