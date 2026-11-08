import { describe, expect, it } from 'vitest';
import {
  checkImportSize,
  migrateV1,
  parseDocument,
  serializeDocument,
} from '../../src/core/document';
import { MAX_IMPORT_BYTES, MAX_ITEMS } from '../../src/core/limits';
import { createDemoPlan } from '../../src/core/seed';
import { makeDoc, makeItem } from './factories';

function parse(value: unknown) {
  return parseDocument(JSON.stringify(value));
}

describe('parseDocument', () => {
  it('round-trips the demo plan through JSON unchanged', () => {
    const demo = createDemoPlan();
    const result = parseDocument(serializeDocument(demo));
    expect(result).toEqual({ ok: true, document: demo, notes: [] });
  });

  it('rejects text that is not JSON', () => {
    expect(parseDocument('{nope')).toEqual({ ok: false, errors: ['The file is not valid JSON.'] });
  });

  it('rejects documents without or with an unknown schema version', () => {
    const missing = parse({ title: 'x' });
    const future = parse({ schemaVersion: 99 });
    expect(missing.ok).toBe(false);
    expect(future.ok).toBe(false);
    if (!missing.ok) expect(missing.errors[0]).toMatch(/Missing "schemaVersion"/);
    if (!future.ok) expect(future.errors[0]).toMatch(/Unsupported schema version 99/);
  });

  it('reports schema problems with their path', () => {
    const doc = makeDoc([makeItem({ id: 'a' })]);
    const result = parse({ ...doc, items: [{ ...doc.items[0], width: -5, kind: 'sofa' }] });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.startsWith('items.0.width'))).toBe(true);
      expect(result.errors.some((e) => e.startsWith('items.0.kind'))).toBe(true);
    }
  });

  it('rejects ids with unsafe characters, duplicate ids and dangling group references', () => {
    expect(parse(makeDoc([makeItem({ id: 'a b' })])).ok).toBe(false);
    const dup = parse(makeDoc([makeItem({ id: 'a' }), makeItem({ id: 'a' })]));
    expect(dup).toEqual({ ok: false, errors: ['items: duplicate id "a"'] });
    const dangling = parse(makeDoc([makeItem({ id: 'a', groupId: 'ghost' })]));
    expect(dangling.ok).toBe(false);
    const dupGroups = parse(
      makeDoc(
        [],
        [
          { id: 'g', name: 'x' },
          { id: 'g', name: 'y' },
        ],
      ),
    );
    expect(dupGroups).toEqual({ ok: false, errors: ['groups: duplicate group id'] });
  });

  it('caps the error list so a hostile file cannot flood the dialog', () => {
    const items = Array.from({ length: 50 }, () => makeItem({ id: 'same' }));
    const result = parse(makeDoc(items));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toHaveLength(9);
      expect(result.errors.at(-1)).toBe('…and 41 more problem(s).');
    }
    const doc = makeDoc(Array.from({ length: 20 }, (_, i) => makeItem({ id: `k${i}` })));
    const badKinds = parse({ ...doc, items: doc.items.map((item) => ({ ...item, kind: 'sofa' })) });
    expect(badKinds.ok).toBe(false);
    if (!badKinds.ok) expect(badKinds.errors.at(-1)).toBe('…and 12 more problem(s).');
  });

  it('drops unknown keys, including "__proto__", without touching any prototype', () => {
    const text = serializeDocument(makeDoc([makeItem({ id: 'a' })])).replace(
      '"schemaVersion": 2,',
      '"schemaVersion": 2, "__proto__": { "polluted": true }, "extra": "x",',
    );
    const result = parseDocument(text);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(Object.keys(result.document)).not.toContain('extra');
      expect(Object.hasOwn(result.document, '__proto__')).toBe(false);
    }
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it('rejects oversized documents', () => {
    const items = Array.from({ length: MAX_ITEMS + 1 }, (_, i) => makeItem({ id: `i${i}` }));
    expect(parse(makeDoc(items)).ok).toBe(false);
  });

  it('normalises sizes, rotation, tags and lonely groups with notes', () => {
    const result = parse(
      makeDoc(
        [
          makeItem({
            id: 'a',
            width: 1,
            height: 1,
            rotation: -90,
            tags: ['quiet', 'quiet'],
            groupId: 'g',
          }),
          makeItem({ id: 'b' }),
        ],
        [{ id: 'g', name: 'Lonely' }],
      ),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const [a] = result.document.items;
    expect(a).toMatchObject({
      width: 60,
      height: 40,
      rotation: 270,
      tags: ['quiet'],
      groupId: null,
    });
    expect(result.document.groups).toEqual([]);
    expect(result.notes).toEqual([
      '1 group(s) with fewer than two items were dissolved.',
      '1 item(s) were enlarged to their minimum size.',
    ]);
  });
});

describe('schema version 1 migration', () => {
  const v1 = {
    schemaVersion: 1,
    name: 'Old floor',
    items: [
      {
        id: 'd1',
        kind: 'desk',
        label: 'Old desk',
        left: 0,
        top: 0,
        w: 200,
        h: 100,
        angleRad: Math.PI / 2,
      },
    ],
  };

  it('moves the anchor to the centre and converts radians to degrees', () => {
    const migrated = migrateV1(v1 as Parameters<typeof migrateV1>[0]);
    expect(migrated.items[0]).toMatchObject({
      x: 100,
      y: 50,
      rotation: 90,
      name: 'Old desk',
      tags: [],
    });
    expect(migrated.title).toBe('Old floor');
  });

  it('is applied automatically on import and mentioned in the notes', () => {
    const result = parse(v1);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.document.schemaVersion).toBe(2);
      expect(result.notes[0]).toBe('Upgraded from schema version 1.');
    }
  });

  it('still validates version 1 input', () => {
    expect(parse({ ...v1, items: [{ id: 'x' }] }).ok).toBe(false);
  });

  it('checks the upgraded plan against the current bounds as well', () => {
    const [item] = v1.items;
    // A valid left edge plus a valid width puts the centre past the coordinate limit.
    const outside = parse({ ...v1, items: [{ ...item, left: 1_000_000, w: 1_000_000 }] });
    expect(outside.ok).toBe(false);
    if (!outside.ok) {
      expect(outside.errors[0]).toMatch(/^after upgrading from version 1, items\.0\.x/);
    }
    // An angle whose conversion to degrees overflows is refused, not stored as NaN.
    const overflow = parse({ ...v1, items: [{ ...item, angleRad: 1e308 }] });
    expect(overflow.ok).toBe(false);
  });
});

describe('checkImportSize', () => {
  it('accepts files up to the limit and rejects larger ones before reading them', () => {
    expect(checkImportSize(MAX_IMPORT_BYTES)).toBeNull();
    expect(checkImportSize(MAX_IMPORT_BYTES + 1)).toMatch(
      /^The file is 8\.0 MB\. Plans larger than 8\.0 MB/,
    );
    expect(checkImportSize(1024 ** 3)).toMatch(/^The file is 1024\.0 MB/);
  });
});

describe('parseDocument, edge cases from imported files', () => {
  it('rejects a grid step below 1 cm, which would make snapping and the grid degenerate', () => {
    const result = parse({ ...makeDoc([]), gridSize: 1e-9 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[0]).toMatch(/^gridSize:/);
    expect(parse({ ...makeDoc([]), gridSize: 1 }).ok).toBe(true);
  });

  it('accepts repeated tags and keeps one of each', () => {
    const item = { ...makeItem({ id: 'a' }), tags: Array.from({ length: 6 }, () => 'quiet') };
    const result = parse({ ...makeDoc([]), items: [item] });
    expect(result.ok && result.document.items[0]?.tags).toEqual(['quiet']);
  });

  it('rejects a group id that is also an item id', () => {
    const doc = makeDoc(
      [makeItem({ id: 'pod', groupId: 'pod' }), makeItem({ id: 'b', groupId: 'pod' })],
      [{ id: 'pod', name: 'Pod' }],
    );
    const result = parse(doc);
    expect(result).toEqual({ ok: false, errors: ['groups: id "pod" is also an item id'] });
  });
});
