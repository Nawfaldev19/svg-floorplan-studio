/**
 * Document model for a floor plan: the types every other module shares.
 *
 * Units are centimetres. An item's `x`/`y` is its centre, which makes
 * rotation a pure function of the item (no pivot bookkeeping).
 *
 * @see docs/adr/0005-centre-anchored-items-and-degrees.md
 * @packageDocumentation
 */

/** Stable identifier of an item, unique within a plan (`item-42`). */
export type ItemId = string;
/** Stable identifier of a group, unique within a plan (`group-43`). */
export type GroupId = string;

/** Every kind of item a plan can hold, in toolbar order. */
export const ITEM_KINDS = ['desk', 'meetingRoom', 'lounge', 'planter', 'wall'] as const;
/** One of {@link ITEM_KINDS}. */
export type ItemKind = (typeof ITEM_KINDS)[number];

/** Every amenity an item can be tagged with, in the order help and legends list them. */
export const AMENITY_TAGS = ['standing', 'dualMonitor', 'quiet', 'window', 'stepFree'] as const;
/** One of {@link AMENITY_TAGS}. */
export type AmenityTag = (typeof AMENITY_TAGS)[number];

/**
 * One thing on the floor. Items are immutable: every edit produces a new
 * object, which is what lets the culling cache key bounds by identity.
 */
export interface PlanItem {
  /** Unique within the plan; letters, digits, `-` and `_` only. */
  readonly id: ItemId;
  /** Decides the shape, default size and minimum size (see `KIND_SPECS`). */
  readonly kind: ItemKind;
  /** Display name, trimmed, at most `MAX_NAME_LENGTH` characters. */
  readonly name: string;
  /** Centre, horizontal, in centimetres. */
  readonly x: number;
  /** Centre, vertical (down is positive), in centimetres. */
  readonly y: number;
  /** Unrotated width in centimetres. */
  readonly width: number;
  /** Unrotated height in centimetres. */
  readonly height: number;
  /** Clockwise degrees in [0, 360). */
  readonly rotation: number;
  /** Amenities offered, without duplicates. */
  readonly tags: readonly AmenityTag[];
  /** The group this item belongs to, or null. A group always has two or more members. */
  readonly groupId: GroupId | null;
}

/** A named set of items that select and move together. It holds no transform of its own. */
export interface PlanGroup {
  /** Unique within the plan. */
  readonly id: GroupId;
  /** Display name, for example "Fern pod". */
  readonly name: string;
}

/** The file-format version this build writes. The importer also reads version 1. */
export const CURRENT_SCHEMA_VERSION = 2;

/** A whole floor plan: what autosave stores and what export writes. */
export interface PlanDocument {
  /** Always {@link CURRENT_SCHEMA_VERSION} once loaded; older files are migrated. */
  readonly schemaVersion: typeof CURRENT_SCHEMA_VERSION;
  /** Plan name shown in the editor, the viewer and the export file name. */
  readonly title: string;
  /** Snap step in centimetres. */
  readonly gridSize: number;
  /** Paint order: later items draw on top and win hit tests. */
  readonly items: readonly PlanItem[];
  /** Groups referenced by `PlanItem.groupId`. */
  readonly groups: readonly PlanGroup[];
}

/** Fields of an item that may change after creation. */
export type ItemPatch = Partial<Omit<PlanItem, 'id'>>;
