// The editor screen: wires the reducer, camera, keyboard shortcuts, panels,
// status bar and live region together, per layout. Rules live in src/core, not here.
import { ListTree, Maximize, SlidersHorizontal, ZoomIn, ZoomOut } from 'lucide-react';
import { useCallback, useId, useMemo, useRef, useState } from 'react';
import { fitItems } from '../core/culling';
import { resolveShortcut, type KeyTarget, type ShortcutCommand } from '../core/keymap';
import { selectionBounds } from '../core/selection';
import { plural } from '../core/text';
import { AMENITY_TAGS, type ItemKind, type PlanDocument } from '../core/types';
import { fitBox, screenToWorld, zoomAt, type Size, type Viewport } from '../core/viewport';
import { Button } from '../shared/Button';
import { usePageHandler } from '../shared/pageHandlers';
import { useElementSize } from '../shared/useElementSize';
import { DrawerPane } from './DrawerPane';
import styles from './EditorPage.module.css';
import { useFileActions } from './useFileActions';
import { Inspector } from './Inspector';
import { OutlinePanel } from './OutlinePanel';
import { PlanCanvas } from './PlanCanvas';
import { ShortcutsDialog } from './ShortcutsDialog';
import { TagPalette } from './TagPalette';
import { isTextEntry } from './textEntry';
import { Toolbar } from './Toolbar';
import { useEditor, type SaveStatus } from './useEditor';
import { hasDrawers, useEditorLayout } from './useEditorLayout';

const ZOOM_STEP = 1.25;

type PanelId = 'outline' | 'inspector';

const PANEL_TITLE: Readonly<Record<PanelId, string>> = {
  outline: 'Outline',
  inspector: 'Inspector',
};

function keyTarget(target: unknown): KeyTarget {
  if (!(target instanceof Element)) return 'elsewhere';
  const role = target.getAttribute('role');
  return role === 'application' ? 'canvas' : role === 'listbox' ? 'outline' : 'elsewhere';
}

/** The parts of a key press the editor reads; React's and the browser's key objects both fit. */
interface KeyPress {
  readonly target: unknown;
  readonly key: string;
  readonly metaKey: boolean;
  readonly ctrlKey: boolean;
  readonly shiftKey: boolean;
  readonly altKey: boolean;
  preventDefault(): void;
}

const SAVE_LABEL: Readonly<Record<SaveStatus, string>> = {
  saved: 'All changes saved',
  saving: 'Saving…',
  error: 'Not saved',
  unavailable: 'Not saved (storage unavailable)',
};

/**
 * The editor view at `#/editor`.
 *
 * @remarks
 * Shortcuts are resolved through `resolveShortcut` from one `onKeyDown` on the
 * page. Nothing fires while focus is in a text field, select or radio group,
 * or while a modal dialog is open; character keys and arrows need the canvas
 * focused (WCAG 2.1.4). If focus ever falls back to the page body (the
 * focused element was removed), a document handler takes the same keys, so
 * shortcuts keep working. The camera is local state, not part of the reducer,
 * so zooming is never undone and edits never move the view.
 *
 * Below 1024 px the canvas fills the screen and the outline and inspector
 * become drawers opened from the status bar; the drawers cover the canvas
 * without resizing it, so opening one never moves the view. Crossing the
 * breakpoint with focus in a panel opens that panel's drawer instead of hiding
 * the focused control.
 *
 * @see docs/adr/0010-one-keymap-with-canvas-scoped-keys.md
 * @see docs/adr/0015-responsive-editor-with-drawers-and-overflow-menu.md
 */
export function EditorPage() {
  const { state, dispatch, saveStatus, saveError, notice, otherTab } = useEditor();
  const canvasWrap = useRef<HTMLDivElement>(null);
  const size = useElementSize(canvasWrap);
  const [spaceHeld, setSpaceHeld] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  // The camera fits `fitTarget` until the user zooms or pans. It is a snapshot taken
  // on load, on import or preset, and on "Fit plan", so ordinary edits never move it.
  const [fitTarget, setFitTarget] = useState<PlanDocument>(state.doc);
  const [viewport, setViewport] = useState<Viewport | null>(null);
  const layout = useEditorLayout();
  const drawers = hasDrawers(layout);
  const [panel, setPanel] = useState<PanelId | null>(null);
  const toggles = useRef<Partial<Record<PanelId, HTMLButtonElement | null>>>({});
  const sidebar = useRef<HTMLElement>(null);
  const zoomBar = useRef<HTMLDivElement>(null);
  const paneId = useId();
  const [drawersSeen, setDrawersSeen] = useState(drawers);

  // On a layout change (a resize or a rotated tablet), adjust the panel while
  // rendering, before the sidebar can be hidden under the focused control.
  if (drawersSeen !== drawers) {
    setDrawersSeen(drawers);
    if (!drawers) {
      setPanel(null);
    } else if (panel === null) {
      const focused = document.activeElement;
      const holder = (['inspector', 'outline'] as const).find((id) =>
        document.getElementById(`${paneId}-${id}`)?.contains(focused),
      );
      if (holder) setPanel(holder);
    }
  }
  const files = useFileActions({
    doc: state.doc,
    dispatch,
    onReplaced: (doc) => {
      setFitTarget(doc);
      setViewport(null);
    },
  });

  const closePanel = (id: PanelId) => {
    setPanel(null);
    toggles.current[id]?.focus();
  };

  const fitted = useMemo(() => fitItems(fitTarget.items, size), [fitTarget, size]);
  const effective = viewport ?? fitted;

  const updateViewport = useCallback(
    (update: (vp: Viewport) => Viewport) => {
      setViewport((current) => update(current ?? fitted));
    },
    [fitted],
  );

  // Releasing Space in another window never reaches this page, so forget it on blur.
  usePageHandler(window, 'onblur', () => {
    setSpaceHeld(false);
  });

  const center = { x: size.width / 2, y: size.height / 2 };

  /**
   * The part of the canvas nothing covers: left of an open tablet drawer and
   * above both the zoom controls and an open phone sheet.
   */
  const uncoveredArea = (): Size => {
    const canvas = canvasWrap.current?.getBoundingClientRect();
    if (!canvas) return size;
    const drawer = drawers && panel ? sidebar.current?.getBoundingClientRect() : undefined;
    const bar = zoomBar.current?.getBoundingClientRect();
    const right = layout === 'tablet' && drawer ? drawer.left : canvas.right;
    const bottom = Math.min(
      canvas.bottom,
      bar ? bar.top : canvas.bottom,
      layout === 'phone' && drawer ? drawer.top : canvas.bottom,
    );
    return { width: Math.max(0, right - canvas.left), height: Math.max(0, bottom - canvas.top) };
  };

  const zoom = (direction: 'in' | 'out' | 'reset' | 'fit') => {
    if (direction === 'fit') {
      const bounds = selectionBounds(state.doc, state.selection);
      if (bounds) {
        const area = uncoveredArea();
        setViewport(fitBox(bounds, area, Math.min(96, area.width / 8, area.height / 8)));
      } else {
        setFitTarget(state.doc);
        setViewport(null);
      }
      return;
    }
    const factor =
      direction === 'in' ? ZOOM_STEP : direction === 'out' ? 1 / ZOOM_STEP : 1 / effective.scale;
    updateViewport((vp) => zoomAt(vp, center, factor));
  };

  const addAtCenter = (kind: ItemKind) => {
    dispatch({ type: 'add', kind, at: screenToWorld(effective, center) });
  };

  const run = (command: ShortcutCommand) => {
    switch (command.type) {
      case 'nudge': {
        const step = state.doc.gridSize * (command.large ? 5 : 1);
        // A held arrow key repeats; nudges close together merge into one undo step.
        const at = performance.now();
        dispatch({ type: 'nudge', dx: command.dx * step, dy: command.dy * step, at });
        return;
      }
      case 'add':
        addAtCenter(command.kind);
        return;
      case 'zoom':
        zoom(command.direction);
        return;
      case 'toggleTagMode':
        dispatch({ type: 'setMode', mode: state.mode === 'tag' ? 'edit' : 'tag' });
        return;
      case 'pickTag': {
        const tag = AMENITY_TAGS[command.index];
        if (tag) dispatch({ type: 'setActiveTag', tag });
        return;
      }
      case 'showShortcuts':
        setShowShortcuts(true);
        return;
      default:
        dispatch(command);
    }
  };

  const onKey = (e: KeyPress) => {
    if (isTextEntry(e.target) || document.querySelector('dialog[open]')) return;
    const target = keyTarget(e.target);
    if (e.key === ' ' && target === 'canvas') {
      e.preventDefault();
      setSpaceHeld(true);
      return;
    }
    const command = resolveShortcut(
      { key: e.key, mod: e.metaKey || e.ctrlKey, shift: e.shiftKey, alt: e.altKey },
      state.mode,
      target,
    );
    if (!command) return;
    e.preventDefault();
    run(command);
  };

  // Keys pressed while nothing has focus land on the body, outside the editor's
  // own onKeyDown; take them here so a removed control never disables shortcuts.
  usePageHandler(document, 'onkeydown', (e) => {
    if (e.target === document.body) onKey(e);
  });

  const zoomPercent = Math.round(effective.scale * 100);
  // An invisible suffix that alternates, so a repeated identical message is still spoken.
  const repeatMark = state.announcementId % 2 === 1 ? ' ' : '';

  return (
    <div
      className={styles.editor}
      data-layout={layout}
      data-drawer={drawers && panel ? panel : undefined}
      onKeyDown={onKey}
      onKeyUp={(e) => {
        if (e.key === ' ') setSpaceHeld(false);
      }}
    >
      <h1 className="visually-hidden">Floor plan editor</h1>
      <Toolbar
        state={state}
        dispatch={dispatch}
        onAdd={addAtCenter}
        files={files}
        layout={layout}
        onShowShortcuts={() => {
          setShowShortcuts(true);
        }}
      />
      <div className={styles.workspace}>
        <div className={styles.stage}>
          <div ref={canvasWrap} className={styles.canvasWrap}>
            <PlanCanvas
              state={state}
              dispatch={dispatch}
              viewport={effective}
              updateViewport={updateViewport}
              size={size}
              spaceHeld={spaceHeld}
            />
          </div>
          <div ref={zoomBar} className={styles.zoom} role="group" aria-label="Zoom">
            <Button
              variant="secondary"
              icon={<ZoomOut size={16} aria-hidden="true" />}
              aria-label="Zoom out"
              onClick={() => {
                zoom('out');
              }}
            />
            <button
              type="button"
              className={styles.zoomValue}
              onClick={() => {
                zoom('reset');
              }}
              aria-label={`Zoom ${zoomPercent}%. Reset to 100%`}
            >
              {zoomPercent}%
            </button>
            <Button
              variant="secondary"
              icon={<ZoomIn size={16} aria-hidden="true" />}
              aria-label="Zoom in"
              onClick={() => {
                zoom('in');
              }}
            />
            <Button
              variant="secondary"
              icon={<Maximize size={16} aria-hidden="true" />}
              aria-label={state.selection.length > 0 ? 'Fit selection' : 'Fit plan'}
              onClick={() => {
                zoom('fit');
              }}
            />
          </div>
          {state.mode === 'tag' && <TagPalette state={state} dispatch={dispatch} />}
        </div>
        <aside
          ref={sidebar}
          className={styles.sidebar}
          aria-label="Item details"
          hidden={drawers && panel === null}
        >
          <DrawerPane
            id={`${paneId}-inspector`}
            title={PANEL_TITLE.inspector}
            drawer={drawers}
            open={panel === 'inspector'}
            onClose={() => {
              closePanel('inspector');
            }}
            className={styles.inspectorPane}
          >
            <Inspector state={state} dispatch={dispatch} />
          </DrawerPane>
          <DrawerPane
            id={`${paneId}-outline`}
            title={PANEL_TITLE.outline}
            drawer={drawers}
            open={panel === 'outline'}
            onClose={() => {
              closePanel('outline');
            }}
            className={styles.outlinePane}
          >
            <OutlinePanel state={state} dispatch={dispatch} />
          </DrawerPane>
        </aside>
      </div>
      <footer className={styles.status}>
        {drawers && (
          <div className={styles.panelToggles} role="group" aria-label="Panels">
            {(['outline', 'inspector'] as const).map((id) => (
              <Button
                key={id}
                ref={(element) => {
                  toggles.current[id] = element;
                }}
                variant="ghost"
                icon={
                  id === 'outline' ? (
                    <ListTree size={18} aria-hidden="true" />
                  ) : (
                    <SlidersHorizontal size={18} aria-hidden="true" />
                  )
                }
                aria-expanded={panel === id}
                aria-controls={`${paneId}-${id}`}
                onClick={() => {
                  setPanel(panel === id ? null : id);
                }}
              >
                {PANEL_TITLE[id]}
              </Button>
            ))}
          </div>
        )}
        {saveStatus === 'error' ? (
          <span className={styles.saveError} role="alert">
            {SAVE_LABEL.error}: {saveError}
          </span>
        ) : (
          <span
            className={
              saveStatus === 'saved' || saveStatus === 'saving' ? styles.saveQuiet : undefined
            }
          >
            {SAVE_LABEL[saveStatus]}
          </span>
        )}
        {otherTab && (
          <span className={styles.saveError} role="alert">
            Another tab saved this plan; saving here replaces that version.
          </span>
        )}
        <span className={styles.counts}>
          {plural(state.doc.items.length, 'item')} · {state.selection.length} selected
        </span>
        <span className={styles.statusMode}>{state.mode === 'tag' ? 'Tag brush' : 'Select'}</span>
        <span role="status" aria-live="polite" className={styles.announcement}>
          {state.announcement || notice}
          {repeatMark}
        </span>
      </footer>
      {files.elements}
      <ShortcutsDialog
        open={showShortcuts}
        onClose={() => {
          setShowShortcuts(false);
        }}
      />
    </div>
  );
}
