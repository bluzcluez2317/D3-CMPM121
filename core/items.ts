import { gridValue, isPassable, terrainAt } from "./terrain.ts";

const RADIUS = 40;

export type Item =
  | "Note piece"
  | "Note"
  | "Axe"
  | "Candle"
  | "Broken Boat"
  | "Wooden Board"
  | "Fixed Boat"
  | "Dry Wood";

const QUOTAS: [Item, number][] = [
  ["Note piece", 4],
  ["Broken Boat", 1],
  ["Wooden Board", 1],
  ["Candle", 1],
  ["Dry Wood", 3],
  ["Axe", 1],
];

export type Placement = { x: number; y: number; item: Item };

const cache = new Map<number, Map<string, Placement>>();

const key = (x: number, y: number) => `${x},${y}`;

function reachableCells(seed: number): { x: number; y: number }[] {
  const seen = new Set([key(0, 0)]);
  const queue = [{ x: 0, y: 0 }];
  for (let i = 0; i < queue.length; i++) {
    const { x, y } = queue[i];
    for (const [dx, dy] of [[0, -1], [0, 1], [1, 0], [-1, 0]]) {
      const nx = x + dx;
      const ny = y + dy;
      if (Math.abs(nx) > RADIUS || Math.abs(ny) > RADIUS) continue;
      if (seen.has(key(nx, ny))) continue;
      if (!isPassable(terrainAt(seed, nx, ny))) continue;
      seen.add(key(nx, ny));
      queue.push({ x: nx, y: ny });
    }
  }
  return queue.slice(1);
}

function placementsFor(seed: number): Map<string, Placement> {
  const cached = cache.get(seed);
  if (cached) return cached;

  const cells = reachableCells(seed);
  const total = QUOTAS.reduce((sum, [, count]) => sum + count, 0);
  if (cells.length < total) throw new Error("Not enough room for the items.");

  const placed = new Map<string, Placement>();
  let n = 0;
  for (const [item, count] of QUOTAS) {
    for (let i = 0; i < count; i++, n++) {
      let index = Math.floor(gridValue(seed + 1000, n, 0) * cells.length);
      // If that cell is taken, slide to the next free one.
      while (placed.has(key(cells[index].x, cells[index].y))) {
        index = (index + 1) % cells.length;
      }
      const { x, y } = cells[index];
      placed.set(key(x, y), { x, y, item });
    }
  }
  cache.set(seed, placed);
  return placed;
}

export function itemAt(seed: number, x: number, y: number): Item | null {
  return placementsFor(seed).get(key(x, y))?.item ?? null;
}

// For tests and tools: where everything is.
export function itemPlacements(seed: number): Placement[] {
  return [...placementsFor(seed).values()];
}
