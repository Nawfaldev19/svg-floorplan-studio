import { describe, expect, it } from 'vitest';
import {
  clampScale,
  fitBox,
  MAX_SCALE,
  MIN_SCALE,
  panBy,
  pinchViewport,
  screenToWorld,
  visibleWorldBox,
  worldToScreen,
  zoomAt,
} from '../../src/core/viewport';

const vp = { offsetX: 40, offsetY: -20, scale: 2 };

describe('viewport transforms', () => {
  it('converts between screen and world both ways', () => {
    const world = { x: 12, y: 34 };
    expect(screenToWorld(vp, worldToScreen(vp, world))).toEqual(world);
    expect(worldToScreen(vp, world)).toEqual({ x: 64, y: 48 });
  });

  it('keeps the anchor point fixed while zooming', () => {
    const anchor = { x: 300, y: 200 };
    const before = screenToWorld(vp, anchor);
    const zoomed = zoomAt(vp, anchor, 1.7);
    const after = screenToWorld(zoomed, anchor);
    expect(after.x).toBeCloseTo(before.x, 9);
    expect(after.y).toBeCloseTo(before.y, 9);
    expect(zoomed.scale).toBeCloseTo(3.4);
  });

  it('clamps zoom to the supported range', () => {
    expect(zoomAt(vp, { x: 0, y: 0 }, 1000).scale).toBe(MAX_SCALE);
    expect(zoomAt(vp, { x: 0, y: 0 }, 0.0001).scale).toBe(MIN_SCALE);
    expect(clampScale(1)).toBe(1);
  });

  it('pans by screen pixels', () => {
    expect(panBy(vp, 5, -5)).toEqual({ offsetX: 45, offsetY: -25, scale: 2 });
  });
});

describe('fitBox', () => {
  it('centres the box and fits the tighter dimension', () => {
    const fitted = fitBox(
      { minX: 0, minY: 0, maxX: 1000, maxY: 500 },
      { width: 600, height: 600 },
      50,
    );
    expect(fitted.scale).toBeCloseTo(0.5);
    const centre = worldToScreen(fitted, { x: 500, y: 250 });
    expect(centre.x).toBeCloseTo(300);
    expect(centre.y).toBeCloseTo(300);
  });

  it('copes with a zero-size box and a tiny screen', () => {
    const fitted = fitBox({ minX: 5, minY: 5, maxX: 5, maxY: 5 }, { width: 10, height: 10 }, 32);
    expect(Number.isFinite(fitted.scale)).toBe(true);
  });
});

describe('visibleWorldBox', () => {
  it('returns the world area under the screen, grown by the margin', () => {
    const box = visibleWorldBox(
      { offsetX: 0, offsetY: 0, scale: 2 },
      { width: 200, height: 100 },
      10,
    );
    expect(box).toEqual({ minX: -5, minY: -5, maxX: 105, maxY: 55 });
  });
});

describe('pinchViewport', () => {
  it('keeps the world points under both fingers under them', () => {
    const from = [
      { x: 100, y: 100 },
      { x: 200, y: 100 },
    ] as const;
    const to = [
      { x: 60, y: 120 },
      { x: 260, y: 120 },
    ] as const;
    const next = pinchViewport(vp, from, to);
    expect(next.scale).toBeCloseTo(vp.scale * 2);
    for (const i of [0, 1] as const) {
      const before = screenToWorld(vp, from[i]);
      const after = screenToWorld(next, to[i]);
      expect(after.x).toBeCloseTo(before.x);
      expect(after.y).toBeCloseTo(before.y);
    }
  });

  it('only pans when the fingers keep their distance or touch', () => {
    const same = [
      { x: 0, y: 0 },
      { x: 0, y: 0 },
    ] as const;
    expect(pinchViewport(vp, same, same)).toEqual(vp);
    const moved = pinchViewport(
      vp,
      [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
      ],
      [
        { x: 5, y: 5 },
        { x: 15, y: 5 },
      ],
    );
    expect(moved).toEqual({ ...vp, offsetX: vp.offsetX + 5, offsetY: vp.offsetY + 5 });
  });
});
