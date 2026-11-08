/**
 * The item catalogue: per-kind shape, sizes and add shortcut, and per-amenity
 * label, colour and glyph. Adding a kind starts here
 * (docs/how-to/add-an-item-kind.md).
 *
 * @packageDocumentation
 */
import type { AmenityTag, ItemKind } from './types';

type ShapeKind = 'rect' | 'ellipse';

/** What the editor needs to know about one item kind. */
export interface KindSpec {
  /** Name shown in the toolbar, outline and announcements. */
  readonly label: string;
  /** Outline used for drawing and for hit tests. */
  readonly shape: ShapeKind;
  /** Size of a newly added item, in centimetres. */
  readonly defaultSize: { readonly width: number; readonly height: number };
  /** Smallest size the editor and the importer allow, in centimetres. */
  readonly minSize: { readonly width: number; readonly height: number };
  /** Single-key shortcut that adds this kind. */
  readonly shortcut: string;
}

/** The catalogue of item kinds. `KEYMAP` and the toolbar read their add shortcuts from here. */
export const KIND_SPECS: Readonly<Record<ItemKind, KindSpec>> = {
  desk: {
    label: 'Desk',
    shape: 'rect',
    defaultSize: { width: 160, height: 80 },
    minSize: { width: 60, height: 40 },
    shortcut: 'd',
  },
  meetingRoom: {
    label: 'Meeting room',
    shape: 'rect',
    defaultSize: { width: 400, height: 300 },
    minSize: { width: 150, height: 150 },
    shortcut: 'm',
  },
  lounge: {
    label: 'Lounge',
    shape: 'ellipse',
    defaultSize: { width: 240, height: 180 },
    minSize: { width: 80, height: 80 },
    shortcut: 'l',
  },
  planter: {
    label: 'Planter',
    shape: 'ellipse',
    defaultSize: { width: 60, height: 60 },
    minSize: { width: 20, height: 20 },
    shortcut: 'p',
  },
  wall: {
    label: 'Wall',
    shape: 'rect',
    defaultSize: { width: 400, height: 15 },
    minSize: { width: 20, height: 5 },
    shortcut: 'w',
  },
};

type AmenityGlyph = 'triangle' | 'square' | 'circle' | 'diamond' | 'plus';

/** How one amenity is named and drawn. */
export interface AmenitySpec {
  /** Name shown in legends, checkboxes and item details. */
  readonly label: string;
  /** CSS custom property that holds the swatch colour. */
  readonly colorVar: string;
  /** Each tag also has its own shape, so tags never rely on colour alone (WCAG 1.4.1). */
  readonly glyph: AmenityGlyph;
}

/** The catalogue of amenities, keyed by tag. */
export const AMENITY_SPECS: Readonly<Record<AmenityTag, AmenitySpec>> = {
  standing: { label: 'Standing desk', colorVar: '--amenity-standing', glyph: 'triangle' },
  dualMonitor: { label: 'Dual monitor', colorVar: '--amenity-dual-monitor', glyph: 'square' },
  quiet: { label: 'Quiet area', colorVar: '--amenity-quiet', glyph: 'circle' },
  window: { label: 'By a window', colorVar: '--amenity-window', glyph: 'diamond' },
  stepFree: { label: 'Step-free access', colorVar: '--amenity-step-free', glyph: 'plus' },
};
