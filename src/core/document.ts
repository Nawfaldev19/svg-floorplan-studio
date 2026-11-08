/**
 * The plan file format: a Zod schema with bounds, cross-field checks,
 * normalisation with notes, and the migration from schema version 1. The one
 * validation boundary for imported files and stored plans.
 *
 * @see docs/adr/0006-validate-every-import-then-normalise.md
 * @see docs/reference/file-format.md
 * @packageDocumentation
 */
import { z } from 'zod';
import { KIND_SPECS } from './catalog';
import { normalizeDegrees } from './geometry';
import {
  MAX_COORDINATE,
  MAX_GRID_SIZE,
  MAX_IMPORT_BYTES,
  MAX_ITEMS,
  MAX_NAME_LENGTH,
  MIN_GRID_SIZE,
} from './limits';
import {
  AMENITY_TAGS,
  CURRENT_SCHEMA_VERSION,
  ITEM_KINDS,
  type PlanDocument,
  type PlanItem,
} from './types';

// Zod can compile schemas with `new Function` for speed, and probes for that on
// first use. The app is served with a Content Security Policy that forbids eval,
// where the probe is reported as a violation, so use the interpreted parser.
z.config({ jitless: true });

const coordinate = z.number().gte(-MAX_COORDINATE).lte(MAX_COORDINATE);
const length = z.number().positive().lte(MAX_COORDINATE);
const name = z.string().trim().max(MAX_NAME_LENGTH);
const id = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[A-Za-z0-9_-]+$/, 'ids may only contain letters, digits, "-" and "_"');
/**
 * Tags are deduplicated during normalisation, so the schema allows a few
 * repeats; after that an item holds at most one of each amenity.
 */
const tags = z.array(z.enum(AMENITY_TAGS)).max(AMENITY_TAGS.length * 4);

const itemSchemaV2 = z.object({
  id,
  kind: z.enum(ITEM_KINDS),
  name,
  x: coordinate,
  y: coordinate,
  width: length,
  height: length,
  rotation: z.number(),
  tags,
  groupId: id.nullable(),
});

const documentSchemaV2 = z.object({
  schemaVersion: z.literal(2),
  title: name,
  gridSize: z.number().gte(MIN_GRID_SIZE).lte(MAX_GRID_SIZE),
  items: z.array(itemSchemaV2).max(MAX_ITEMS),
  groups: z.array(z.object({ id, name })).max(MAX_ITEMS),
});

/**
 * Version 1 is a simpler, earlier layout the importer still accepts: items are
 * anchored at their top-left corner and rotation is in radians. It exists to
 * show how a versioned importer upgrades older files without breaking them.
 */
const documentSchemaV1 = z.object({
  schemaVersion: z.literal(1),
  name,
  items: z
    .array(
      z.object({
        id,
        kind: z.enum(ITEM_KINDS),
        label: name,
        left: coordinate,
        top: coordinate,
        w: length,
        h: length,
        angleRad: z.number(),
        amenities: tags.optional(),
      }),
    )
    .max(MAX_ITEMS),
});

type DocumentV1 = z.infer<typeof documentSchemaV1>;
type DocumentV2 = z.infer<typeof documentSchemaV2>;

/**
 * Converts a version 1 document to the version 2 layout: top-left anchors
 * become centres and radians become degrees.
 *
 * @remarks
 * The result can fall outside version 2's bounds (a large `left` plus a large
 * `w`, or an angle so large that converting it overflows), so
 * {@link parseDocument} validates it again with the version 2 schema.
 *
 * @see docs/adr/0014-validate-migrated-files-against-current-schema.md
 */
export function migrateV1(doc: DocumentV1): DocumentV2 {
  return {
    schemaVersion: 2,
    title: doc.name,
    gridSize: 10,
    groups: [],
    items: doc.items.map((item) => ({
      id: item.id,
      kind: item.kind,
      name: item.label,
      x: item.left + item.w / 2,
      y: item.top + item.h / 2,
      width: item.w,
      height: item.h,
      rotation: (item.angleRad * 180) / Math.PI,
      tags: item.amenities ?? [],
      groupId: null,
    })),
  };
}

/** Outcome of {@link parseDocument}: a valid document with notes, or a short list of errors. */
export type ParseResult =
  | { readonly ok: true; readonly document: PlanDocument; readonly notes: readonly string[] }
  | { readonly ok: false; readonly errors: readonly string[] };

/** Most errors shown for one file; enough to act on, small enough to render instantly. */
const MAX_REPORTED_ERRORS = 8;

/** Keeps the first errors and says how many more there were. */
function limitErrors(errors: readonly string[]): string[] {
  if (errors.length <= MAX_REPORTED_ERRORS) return [...errors];
  const more = errors.length - MAX_REPORTED_ERRORS;
  return [...errors.slice(0, MAX_REPORTED_ERRORS), `…and ${more} more problem(s).`];
}

function formatIssues(error: z.ZodError): string[] {
  return limitErrors(
    error.issues.map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join('.') : 'document';
      return `${path}: ${issue.message}`;
    }),
  );
}

/**
 * Cross-field rules that a schema cannot express, plus gentle normalisation:
 * sizes are raised to the kind's minimum, rotation is wrapped into [0, 360),
 * duplicate tags are removed and groups with fewer than two members dissolve.
 */
function normalize(doc: DocumentV2): ParseResult {
  const errors: string[] = [];
  const notes: string[] = [];

  const itemIds = new Set<string>();
  for (const item of doc.items) {
    if (itemIds.has(item.id)) errors.push(`items: duplicate id "${item.id}"`);
    itemIds.add(item.id);
  }
  const groupIds = new Set(doc.groups.map((g) => g.id));
  if (groupIds.size !== doc.groups.length) errors.push('groups: duplicate group id');
  for (const groupId of groupIds) {
    if (itemIds.has(groupId)) errors.push(`groups: id "${groupId}" is also an item id`);
  }
  for (const item of doc.items) {
    if (item.groupId !== null && !groupIds.has(item.groupId)) {
      errors.push(`items: "${item.id}" refers to unknown group "${item.groupId}"`);
    }
  }
  if (errors.length > 0) return { ok: false, errors: limitErrors(errors) };

  const memberCount = new Map<string, number>();
  for (const item of doc.items) {
    if (item.groupId) memberCount.set(item.groupId, (memberCount.get(item.groupId) ?? 0) + 1);
  }
  const liveGroups = doc.groups.filter((g) => (memberCount.get(g.id) ?? 0) >= 2);
  if (liveGroups.length < doc.groups.length) {
    notes.push(
      `${doc.groups.length - liveGroups.length} group(s) with fewer than two items were dissolved.`,
    );
  }
  const liveGroupIds = new Set(liveGroups.map((g) => g.id));

  let resized = 0;
  const items: PlanItem[] = doc.items.map((item) => {
    const min = KIND_SPECS[item.kind].minSize;
    const width = Math.max(item.width, min.width);
    const height = Math.max(item.height, min.height);
    if (width !== item.width || height !== item.height) resized += 1;
    return {
      ...item,
      width,
      height,
      rotation: normalizeDegrees(item.rotation),
      tags: [...new Set(item.tags)],
      groupId: item.groupId !== null && liveGroupIds.has(item.groupId) ? item.groupId : null,
    };
  });
  if (resized > 0) notes.push(`${resized} item(s) were enlarged to their minimum size.`);

  return {
    ok: true,
    notes,
    document: {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      title: doc.title,
      gridSize: doc.gridSize,
      items,
      groups: liveGroups,
    },
  };
}

/**
 * Rejects a file by its size alone, before any of it is read into memory.
 *
 * @param bytes - `File.size` of the chosen file.
 * @returns Null when the file may be read, otherwise the message to show.
 */
export function checkImportSize(bytes: number): string | null {
  if (bytes <= MAX_IMPORT_BYTES) return null;
  const megabytes = (n: number) => `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `The file is ${megabytes(bytes)}. Plans larger than ${megabytes(MAX_IMPORT_BYTES)} are not imported.`;
}

/**
 * Parses untrusted JSON text into a valid, current-version document. Never throws.
 *
 * @remarks
 * Steps: `JSON.parse`, dispatch on `schemaVersion`, a Zod schema with bounds
 * that drops unknown keys, migration for version 1 followed by a
 * second check against the version 2 schema, then cross-field rules and
 * normalisation. Errors are capped at eight lines plus a count.
 *
 * @example
 * ```ts
 * const result = parseDocument(await file.text());
 * if (result.ok) use(result.document);
 * else show(result.errors);
 * ```
 */
export function parseDocument(text: string): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, errors: ['The file is not valid JSON.'] };
  }

  const version =
    typeof raw === 'object' && raw !== null && 'schemaVersion' in raw
      ? raw.schemaVersion
      : undefined;

  if (version === 2) {
    const parsed = documentSchemaV2.safeParse(raw);
    return parsed.success
      ? normalize(parsed.data)
      : { ok: false, errors: formatIssues(parsed.error) };
  }
  if (version === 1) {
    const parsed = documentSchemaV1.safeParse(raw);
    if (!parsed.success) return { ok: false, errors: formatIssues(parsed.error) };
    // The migrated layout must meet the current bounds too (ADR 0014).
    const migrated = documentSchemaV2.safeParse(migrateV1(parsed.data));
    if (!migrated.success) {
      return {
        ok: false,
        errors: formatIssues(migrated.error).map(
          (error) => `after upgrading from version 1, ${error}`,
        ),
      };
    }
    const result = normalize(migrated.data);
    return result.ok
      ? { ...result, notes: ['Upgraded from schema version 1.', ...result.notes] }
      : result;
  }
  return {
    ok: false,
    errors: [
      version === undefined
        ? 'Missing "schemaVersion". Is this a Floorplan Studio plan?'
        : `Unsupported schema version ${JSON.stringify(version)}. This build reads versions 1 and 2.`,
    ],
  };
}

/** The JSON text written by export and autosave: two-space indented, no extra metadata. */
export function serializeDocument(doc: PlanDocument): string {
  return JSON.stringify(doc, null, 2);
}
