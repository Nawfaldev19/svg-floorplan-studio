import { describe, expect, it } from 'vitest';
import { alignItems, distributeItems, rotateItemsBy } from '../../src/core/arrange';
import { boundsOf } from '../../src/core/geometry';
import { makeItem } from './factories';

const a = makeItem({ id: 'a', x: 0, y: 0, width: 100, height: 50 });
const b = makeItem({ id: 'b', x: 300, y: 80, width: 60, height: 60 });
const c = makeItem({ id: 'c', x: 120, y: 200, width: 40, height: 100 });

describe('alignItems', () => {
  it('aligns left edges to the leftmost edge of the selection', () => {
    const lefts = alignItems([a, b, c], 'left').map((item) => boundsOf(item).minX);
    expect(lefts).toEqual([-50, -50, -50]);
  });

  it('aligns bottoms and middles on the vertical axis without moving x', () => {
    const aligned = alignItems([a, b, c], 'bottom');
    expect(aligned.map((item) => boundsOf(item).maxY)).toEqual([250, 250, 250]);
    expect(aligned.map((item) => item.x)).toEqual([0, 300, 120]);
    const middles = alignItems([a, b], 'centerY').map((item) => item.y);
    expect(middles[0]).toBeCloseTo(middles[1] ?? NaN);
  });

  it('uses rotated bounds, so a turned item aligns by what is drawn', () => {
    const turned = makeItem({ id: 't', x: 500, y: 0, width: 200, height: 20, rotation: 90 });
    const [, moved] = alignItems([a, turned], 'right');
    expect(boundsOf(moved!).maxX).toBeCloseTo(510);
  });

  it('aligns right edges, top edges and centres', () => {
    expect(alignItems([a, b], 'right').map((item) => boundsOf(item).maxX)).toEqual([330, 330]);
    expect(alignItems([a, b], 'top').map((item) => boundsOf(item).minY)).toEqual([-25, -25]);
    const centres = alignItems([a, b], 'centerX').map((item) => item.x);
    expect(centres).toEqual([140, 140]);
  });

  it('leaves a single item alone', () => {
    expect(alignItems([a], 'left')).toEqual([a]);
  });
});

describe('distributeItems', () => {
  it('makes the gaps between neighbours equal and keeps the outer items in place', () => {
    const spaced = distributeItems([a, b, c], 'horizontal');
    const boxes = spaced.map(boundsOf).sort((p, q) => p.minX - q.minX);
    const gaps = [boxes[1]!.minX - boxes[0]!.maxX, boxes[2]!.minX - boxes[1]!.maxX];
    expect(gaps[0]).toBeCloseTo(gaps[1]!);
    expect(spaced.find((i) => i.id === 'a')!.x).toBe(0);
    expect(spaced.find((i) => i.id === 'b')!.x).toBe(300);
  });

  it('works vertically and needs at least three items', () => {
    const spaced = distributeItems([a, b, c], 'vertical');
    expect(spaced.map((i) => i.x)).toEqual([0, 300, 120]);
    expect(distributeItems([a, b], 'vertical')).toEqual([a, b]);
  });
});

describe('rotateItemsBy', () => {
  it('turns several items as one shape about the mean of their centres', () => {
    const left = makeItem({ id: 'l', x: -100, y: 0, width: 100, height: 50 });
    const right = makeItem({ id: 'r', x: 100, y: 0, width: 100, height: 50 });
    const [l, r] = rotateItemsBy([left, right], 90);
    expect(l!.x).toBeCloseTo(0);
    expect(l!.y).toBeCloseTo(-100);
    expect(r!.y).toBeCloseTo(100);
    expect(r!.rotation).toBe(90);
    expect(rotateItemsBy([], 90)).toEqual([]);
  });

  it('keeps its pivot on an uneven selection, so a turn and its opposite cancel out', () => {
    const room = makeItem({ id: 'room', x: 0, y: 0, width: 100, height: 100 });
    const planter = makeItem({ id: 'planter', x: 200, y: 0, width: 10, height: 10 });
    const back = rotateItemsBy(rotateItemsBy([room, planter], 45), -45);
    expect(back[0]!.x).toBeCloseTo(0, 9);
    expect(back[1]!.x).toBeCloseTo(200, 9);
    expect(back[1]!.y).toBeCloseTo(0, 9);
  });

  it('turns each item about its centre and wraps the angle', () => {
    const [turned] = rotateItemsBy([makeItem({ id: 'r', rotation: 350 })], 15);
    expect(turned).toMatchObject({ rotation: 5, x: 0, y: 0 });
  });
});
