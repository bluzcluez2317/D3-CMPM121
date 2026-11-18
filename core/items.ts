import { gridValue, isPassable, terrainAt } from "./terrain.ts";

export type Item =
  | "Note piece"
  | "Note"
  | "Axe"
  | "Candle"
  | "Broken Boat"
  | "Wooden Board"
  | "Fixed Boat"
  | "Dry Wood";

const ITEMS: Item[] = [
  "Note piece",
  "Note",
  "Axe",
  "Candle",
  "Broken Boat",
  "Wooden Board",
  "Fixed Boat",
  "Dry Wood",
];

const _SPAWNED: Item[] = [
  "Note piece",
  "Note piece",
  "Note piece",
  "Axe",
  "Candle",
  "Broken Boat",
  "Wooden Board",
  "Dry Wood",
];

const DENSITY = 0.05;

export function itemAt(seed: number, x: number, y: number): Item | null {
  if (x === 0 && y === 0) return null;
  if (!isPassable(terrainAt(seed, x, y))) return null;
  const roll = gridValue(seed + 3, x, y);
  if (roll >= DENSITY) return null;
  return ITEMS[Math.floor((roll / DENSITY) * ITEMS.length)];
}
