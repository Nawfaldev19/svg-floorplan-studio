/**
 * Built-in plans: the demo floor, the deterministic 3,000-desk stress floor
 * and a blank floor. All names are fictional.
 *
 * @packageDocumentation
 */
import { KIND_SPECS } from './catalog';
import {
  AMENITY_TAGS,
  CURRENT_SCHEMA_VERSION,
  type AmenityTag,
  type ItemKind,
  type PlanDocument,
  type PlanGroup,
  type PlanItem,
} from './types';

/**
 * Small deterministic generator (xorshift32) so seeded plans are identical on every load.
 *
 * @param seed - Any integer; 0 is replaced by 1 because xorshift cannot leave the zero state.
 * @returns A function that yields numbers in [0, 1).
 */
export function createRandom(seed: number): () => number {
  let state = seed >>> 0 || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return state / 0x1_0000_0000;
  };
}

class PlanBuilder {
  private serial = 1;
  readonly items: PlanItem[] = [];
  readonly groups: PlanGroup[] = [];

  add(
    kind: ItemKind,
    name: string,
    x: number,
    y: number,
    options: Partial<Pick<PlanItem, 'width' | 'height' | 'rotation' | 'tags' | 'groupId'>> = {},
  ): PlanItem {
    const size = KIND_SPECS[kind].defaultSize;
    const item: PlanItem = {
      id: `item-${this.serial++}`,
      kind,
      name,
      x,
      y,
      width: options.width ?? size.width,
      height: options.height ?? size.height,
      rotation: options.rotation ?? 0,
      tags: options.tags ?? [],
      groupId: options.groupId ?? null,
    };
    this.items.push(item);
    return item;
  }

  group(name: string): string {
    const id = `group-${this.serial++}`;
    this.groups.push({ id, name });
    return id;
  }
}

const POD_NAMES = ['Fern', 'Moss', 'Lichen', 'Bracken', 'Clover', 'Sorrel'];

/**
 * The demo floor of the Larkspur Commons co-working space: about sixty items
 * with walls, meeting rooms, desk pods, lounges and planters.
 */
export function createDemoPlan(): PlanDocument {
  const b = new PlanBuilder();
  const W = 3000;
  const H = 1800;

  b.add('wall', 'North wall', W / 2, 0, { width: W, height: 20 });
  b.add('wall', 'South wall', W / 2, H, { width: W, height: 20 });
  b.add('wall', 'West wall', 0, H / 2, { width: 20, height: H });
  b.add('wall', 'East wall', W, H / 2, { width: 20, height: H });
  b.add('wall', 'Studio partition', 900, 450, { width: 20, height: 900 });

  b.add('meetingRoom', 'Larkspur room', 450, 230, {
    width: 600,
    height: 340,
    tags: ['quiet', 'stepFree'],
  });
  b.add('meetingRoom', 'Thistle room', 450, 680, { width: 600, height: 340, tags: ['window'] });
  b.add('meetingRoom', 'Phone nook', 2820, 200, { width: 220, height: 220, tags: ['quiet'] });

  POD_NAMES.forEach((pod, podIndex) => {
    const groupId = b.group(`${pod} pod`);
    const cx = 1300 + (podIndex % 3) * 520;
    const cy = 320 + Math.floor(podIndex / 3) * 520;
    const nearWindow = podIndex < 3;
    const offsets: readonly (readonly [number, number, number])[] = [
      [-85, -45, 0],
      [85, -45, 0],
      [-85, 45, 180],
      [85, 45, 180],
    ];
    offsets.forEach(([dx, dy, rotation], deskIndex) => {
      const tags: AmenityTag[] = [];
      if (nearWindow) tags.push('window');
      if (deskIndex === 0) tags.push('standing');
      if (deskIndex % 2 === 1) tags.push('dualMonitor');
      if (podIndex === 4) tags.push('stepFree');
      b.add('desk', `${pod} desk ${deskIndex + 1}`, cx + dx, cy + dy, { rotation, tags, groupId });
    });
  });

  const quietDesks = b.group('Quiet bench');
  for (let i = 0; i < 6; i += 1) {
    b.add('desk', `Quiet bench ${i + 1}`, 1250 + i * 170, 1520, {
      width: 160,
      height: 70,
      tags: i % 3 === 0 ? ['quiet', 'standing'] : ['quiet'],
      groupId: quietDesks,
    });
  }

  b.add('lounge', 'Garden lounge', 2650, 1350, {
    width: 420,
    height: 300,
    tags: ['window', 'stepFree'],
  });
  b.add('lounge', 'Reading corner', 450, 1400, { width: 360, height: 260, tags: ['quiet'] });
  b.add('lounge', 'Coffee point', 2700, 750, { width: 260, height: 200, tags: ['stepFree'] });

  const planterSpots: readonly (readonly [number, number])[] = [
    [960, 100],
    [960, 1700],
    [1120, 1100],
    [1640, 1100],
    [2160, 1100],
    [2600, 520],
    [2440, 1700],
    [2900, 1000],
    [120, 1000],
    [700, 1000],
  ];
  planterSpots.forEach(([x, y], i) => b.add('planter', `Planter ${i + 1}`, x, y));

  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    title: 'Larkspur Commons, level 2',
    gridSize: 10,
    items: b.items,
    groups: b.groups,
  };
}

/** A large deterministic plan for exercising viewport culling (default 3,000 desks). */
export function createStressPlan(count = 3000, seed = 7): PlanDocument {
  const b = new PlanBuilder();
  const random = createRandom(seed);
  const columns = Math.ceil(Math.sqrt(count * 1.6));
  for (let i = 0; i < count; i += 1) {
    const col = i % columns;
    const line = Math.floor(i / columns);
    const tags = AMENITY_TAGS.filter(() => random() < 0.2);
    b.add('desk', `Desk ${i + 1}`, col * 200 + 100, line * 140 + 70, {
      rotation: random() < 0.1 ? 90 : 0,
      tags,
    });
  }
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    title: `Stress floor (${count.toLocaleString('en-US')} desks)`,
    gridSize: 10,
    items: b.items,
    groups: b.groups,
  };
}

/** An empty plan titled "Untitled floor" with a 10 cm grid. */
export function createBlankPlan(): PlanDocument {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    title: 'Untitled floor',
    gridSize: 10,
    items: [],
    groups: [],
  };
}
