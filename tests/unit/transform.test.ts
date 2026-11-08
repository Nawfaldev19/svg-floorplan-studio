import { describe, expect, it } from 'vitest';
import { cornersOf } from '../../src/core/geometry';
import { MAX_COORDINATE } from '../../src/core/limits';
import {
  handleCursor,
  isHandle,
  moveItems,
  resizeItem,
  rotateItem,
  sanitizeGeometry,
} from '../../src/core/transform';
import { makeItem } from './factories';

describe('moveItems', () => {
  const a = makeItem({ id: 'a', x: 3, y: 7 });
  const b = makeItem({ id: 'b', x: 100, y: 100 });

  it('moves everything by the raw delta without snapping', () => {
    expect(moveItems([a, b], a, { x: 12, y: -4 }, null).map((i) => [i.x, i.y])).toEqual([
      [15, 3],
      [112, 96],
    ]);
  });

  it('snaps the anchor to the grid and keeps relative offsets', () => {
    const moved = moveItems([a, b], a, { x: 12, y: -4 }, 10);
    expect(moved[0]).toMatchObject({ x: 20, y: 0 });
    expect(moved[1]).toMatchObject({ x: 117, y: 93 });
  });
});

describe('resizeItem', () => {
  const desk = makeItem({ id: 'd', x: 0, y: 0, width: 200, height: 100 });

  it('drags the east edge while the west edge stays put', () => {
    const r = resizeItem(desk, 'e', { x: 150, y: 999 }, { keepAspect: false, snapStep: null });
    expect(r).toMatchObject({ width: 250, height: 100, x: 25, y: 0 });
  });

  it('keeps the opposite corner fixed in world space for rotated items', () => {
    const turned = { ...desk, rotation: 30 };
    const fixedBefore = cornersOf(turned)[0]; // local top-left is opposite the south-east handle
    const r = resizeItem(turned, 'se', { x: 200, y: 200 }, { keepAspect: false, snapStep: null });
    const fixedAfter = cornersOf(r)[0];
    expect(fixedAfter.x).toBeCloseTo(fixedBefore.x, 6);
    expect(fixedAfter.y).toBeCloseTo(fixedBefore.y, 6);
  });

  it('never shrinks below the kind minimum, even when dragged past the anchor', () => {
    const r = resizeItem(desk, 'w', { x: 500, y: 0 }, { keepAspect: false, snapStep: null });
    expect(r.width).toBe(60);
  });

  it('snaps new sizes to the grid', () => {
    const r = resizeItem(desk, 's', { x: 0, y: 77 }, { keepAspect: false, snapStep: 10 });
    expect(r.height).toBe(130);
  });

  it('keeps the aspect ratio from a corner and from an edge', () => {
    const corner = resizeItem(desk, 'se', { x: 300, y: 60 }, { keepAspect: true, snapStep: null });
    expect(corner.width / corner.height).toBeCloseTo(2);
    expect(corner.width).toBeCloseTo(400);
    const edge = resizeItem(desk, 'n', { x: 0, y: -150 }, { keepAspect: true, snapStep: null });
    expect(edge.width / edge.height).toBeCloseTo(2);
    expect(edge.height).toBeCloseTo(200);
  });

  it('keeps the ratio from a horizontal edge too', () => {
    const edge = resizeItem(desk, 'e', { x: 300, y: 0 }, { keepAspect: true, snapStep: null });
    expect(edge.width).toBeCloseTo(400);
    expect(edge.height).toBeCloseTo(200);
  });
});

describe('rotateItem', () => {
  const desk = makeItem({ id: 'd', x: 0, y: 0 });

  it('treats a pointer straight above as 0° and to the right as 90°', () => {
    expect(rotateItem(desk, { x: 0, y: -50 }, null).rotation).toBeCloseTo(0);
    expect(rotateItem(desk, { x: 50, y: 0 }, null).rotation).toBeCloseTo(90);
  });

  it('snaps to the given increment', () => {
    expect(rotateItem(desk, { x: 50, y: -40 }, 15).rotation).toBe(45);
    expect(rotateItem(desk, { x: -1, y: -100 }, 15).rotation).toBe(0);
  });
});

describe('helpers', () => {
  it('recognises handle names', () => {
    expect(isHandle('ne')).toBe(true);
    expect(isHandle('rotate')).toBe(false);
    expect(isHandle(null)).toBe(false);
  });

  it('clamps inspector edits', () => {
    expect(
      sanitizeGeometry(makeItem({ id: 'x', width: 5, height: 5, rotation: 400 })),
    ).toMatchObject({
      width: 60,
      height: 40,
      rotation: 40,
    });
  });

  it('keeps any edit inside the bounds of the file format', () => {
    expect(
      sanitizeGeometry(makeItem({ id: 'x', x: -5e6, y: 5e6, width: 5e6, height: 2e6 })),
    ).toMatchObject({
      x: -MAX_COORDINATE,
      y: MAX_COORDINATE,
      width: MAX_COORDINATE,
      height: MAX_COORDINATE,
    });
  });
});

describe('handleCursor', () => {
  it('matches the handle direction on an upright item', () => {
    expect(handleCursor('e', 0)).toBe('ew-resize');
    expect(handleCursor('n', 0)).toBe('ns-resize');
    expect(handleCursor('se', 0)).toBe('nwse-resize');
    expect(handleCursor('ne', 0)).toBe('nesw-resize');
  });

  it('turns with the item, snapped to the nearest 45°', () => {
    expect(handleCursor('e', 90)).toBe('ns-resize');
    expect(handleCursor('e', 45)).toBe('nwse-resize');
    expect(handleCursor('n', 100)).toBe('ew-resize');
    expect(handleCursor('w', 180)).toBe('ew-resize');
  });
});
