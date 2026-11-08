import { describe, expect, it } from 'vitest';
import {
  boundsOf,
  boxContainsBox,
  boxesIntersect,
  boxFromPoints,
  cornersOf,
  distance,
  itemContainsPoint,
  normalizeDegrees,
  rotateAbout,
  snapTo,
  toLocal,
  toWorld,
  unionOf,
} from '../../src/core/geometry';
import { makeItem } from './factories';

describe('normalizeDegrees', () => {
  it.each([
    [0, 0],
    [360, 0],
    [-90, 270],
    [725, 5],
    [-720, 0],
  ])('wraps %d to %d', (input, expected) => {
    expect(normalizeDegrees(input)).toBe(expected);
  });
});

describe('local and world frames', () => {
  const item = makeItem({ id: 'a', x: 100, y: 50, width: 200, height: 100, rotation: 90 });

  it('round-trips a point through the item frame', () => {
    const world = { x: 123.4, y: -56.7 };
    const back = toWorld(item, toLocal(item, world));
    expect(back.x).toBeCloseTo(world.x, 9);
    expect(back.y).toBeCloseTo(world.y, 9);
  });

  it('maps the local right edge onto world "down" for a 90° turn', () => {
    const p = toWorld(item, { x: 100, y: 0 });
    expect(p.x).toBeCloseTo(100);
    expect(p.y).toBeCloseTo(150);
  });
});

describe('bounds', () => {
  it('equals the plain box when unrotated', () => {
    const item = makeItem({ id: 'a', x: 10, y: 20, width: 40, height: 20 });
    expect(boundsOf(item)).toEqual({ minX: -10, minY: 10, maxX: 30, maxY: 30 });
  });

  it('swaps width and height at 90°', () => {
    const b = boundsOf(makeItem({ id: 'a', width: 40, height: 20, rotation: 90 }));
    expect(b.maxX - b.minX).toBeCloseTo(20);
    expect(b.maxY - b.minY).toBeCloseTo(40);
  });

  it('grows at 45° to the diagonal projection', () => {
    const b = boundsOf(makeItem({ id: 'a', width: 100, height: 100, rotation: 45 }));
    expect(b.maxX - b.minX).toBeCloseTo(100 * Math.SQRT2);
  });

  it('lists corners clockwise from the local top-left', () => {
    const [tl, tr, br, bl] = cornersOf(makeItem({ id: 'a', width: 20, height: 10 }));
    expect([tl, tr, br, bl]).toEqual([
      { x: -10, y: -5 },
      { x: 10, y: -5 },
      { x: 10, y: 5 },
      { x: -10, y: 5 },
    ]);
  });
});

describe('box helpers', () => {
  const a = { minX: 0, minY: 0, maxX: 10, maxY: 10 };

  it('detects containment and intersection', () => {
    expect(boxContainsBox(a, { minX: 1, minY: 1, maxX: 9, maxY: 9 })).toBe(true);
    expect(boxContainsBox(a, { minX: 1, minY: 1, maxX: 11, maxY: 9 })).toBe(false);
    expect(boxesIntersect(a, { minX: 10, minY: 10, maxX: 20, maxY: 20 })).toBe(true);
    expect(boxesIntersect(a, { minX: 11, minY: 0, maxX: 20, maxY: 5 })).toBe(false);
  });

  it('unions boxes and returns null for none', () => {
    expect(unionOf([])).toBeNull();
    expect(unionOf([a, { minX: -5, minY: 2, maxX: 3, maxY: 20 }])).toEqual({
      minX: -5,
      minY: 0,
      maxX: 10,
      maxY: 20,
    });
  });

  it('builds a box from points in any order', () => {
    expect(
      boxFromPoints([
        { x: 5, y: -1 },
        { x: -3, y: 4 },
      ]),
    ).toEqual({ minX: -3, minY: -1, maxX: 5, maxY: 4 });
  });
});

describe('itemContainsPoint', () => {
  it('respects rotation for rectangles', () => {
    const item = makeItem({ id: 'a', width: 200, height: 20, rotation: 90 });
    expect(itemContainsPoint(item, { x: 0, y: 90 })).toBe(true);
    expect(itemContainsPoint(item, { x: 90, y: 0 })).toBe(false);
  });

  it('uses the ellipse equation for round kinds', () => {
    const lounge = makeItem({ id: 'l', kind: 'lounge', width: 200, height: 100 });
    expect(itemContainsPoint(lounge, { x: 99, y: 0 })).toBe(true);
    // Inside the bounding box corner but outside the ellipse.
    expect(itemContainsPoint(lounge, { x: 90, y: 45 })).toBe(false);
  });

  it('widens thin shapes by the tolerance', () => {
    const wall = makeItem({ id: 'w', kind: 'wall', width: 400, height: 4 });
    expect(itemContainsPoint(wall, { x: 0, y: 6 })).toBe(false);
    expect(itemContainsPoint(wall, { x: 0, y: 6 }, 5)).toBe(true);
  });
});

describe('snapTo', () => {
  it('rounds to the nearest step and ignores non-positive steps', () => {
    expect(snapTo(14, 10)).toBe(10);
    expect(snapTo(15, 10)).toBe(20);
    expect(snapTo(-14, 10)).toBe(-10);
    expect(snapTo(7.3, 0)).toBe(7.3);
  });
});

describe('distance', () => {
  it('is the Euclidean length between two points', () => {
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });
});

describe('rotateAbout', () => {
  it('turns a point clockwise around a pivot', () => {
    const turned = rotateAbout({ x: 10, y: 0 }, { x: 0, y: 0 }, 90);
    expect(turned.x).toBeCloseTo(0);
    expect(turned.y).toBeCloseTo(10);
    expect(rotateAbout({ x: 5, y: 5 }, { x: 5, y: 5 }, 45)).toEqual({ x: 5, y: 5 });
  });
});
