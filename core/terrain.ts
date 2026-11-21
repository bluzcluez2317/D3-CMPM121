//House Spawn data
const HOUSE_TOP = -9;

// Based on the design from: https://github.com/rndmcnlly/outdoor-chef/blob/main/core/content.ts#L43
const HOUSE_MAP = [
  "GGGGGGG",
  "GWW.WWG",
  "GW..BWG",
  "GW...WG",
  "GW...WG",
  "GWWWWWG",
  "GGGGG",
];

//Working on spawning shed
const SHED_TOP = 22;
//const SHED_SIDE = -12;

const SHED_MAP = [
  "FFFFFFFFFF",
  "FFFFFFFFFFFFF",
  "FFWWWWWFFFF",
  "FFW....WFF",
  "FFW....WFF",
  "FFW....WFF",
  "FF.....WFF",
  "FFW....WFF",
  "FFW....WFF",
  "FFW....WFF",
  "FFWWWWWFFFF",
  "FFFFFFFFFF",
  "FFFFFFFFFFFFF",
];

export const OVERRIDES: Record<string, Terrain> = {
  "W": "houseWall",
  ".": "houseFloor",
  B: "body",
  G: "grass",
  "F": "forest",
};

// The world is a pure function of a seed and coordinates. Nothing here is stored,
// so the world can be effectively unbounded while saved state stays small.

export type Terrain =
  | "grass"
  | "forest"
  | "water"
  | "rock"
  | "houseWall"
  | "houseFloor"
  | "body";

export function mapLetterHouse(x: number, y: number): string | null {
  const row = HOUSE_MAP[y - HOUSE_TOP];
  if (!row) return null;
  const letter = row[x + (row.length - 1) / 2];
  return letter && letter !== " " ? letter : null;
}

export function mapLetterShed(x: number, y: number): string | null {
  const row = SHED_MAP[y - SHED_TOP];
  //const col = SHED_MAP[x - SHED_SIDE];
  if (!row) return null;
  const letter = row[x + (row.length - 1) / 2];
  return letter && letter !== " " ? letter : null;
}

export function terrainAt(seed: number, x: number, y: number): Terrain {
  const letter1 = mapLetterHouse(x, y);
  const letter2 = mapLetterShed(x, y);
  if (letter1) return OVERRIDES[letter1];
  if (letter2) return OVERRIDES[letter2];
  const raw = 0.65 * noise(seed, x, y, 9) + 0.35 * noise(seed + 1, x, y, 3);
  // Every game starts at the origin, so flatten the land there. Otherwise some
  // seeds would start inside a lake or walled into a pocket.
  const height = 0.5 + (raw - 0.5) * Math.min(1, Math.hypot(x, y) / 10);
  if (height < 0.3) return "water";
  if (height > 0.7) return "rock";
  return noise(seed + 2, x, y, 6) < 0.45 ? "forest" : "grass";
}

export function isPassable(terrain: Terrain): boolean {
  return terrain !== "water" && terrain !== "rock" && terrain != "houseWall";
}

// Value noise: random numbers at coarse grid points, blended between them, so
// that terrain forms regions instead of static.
function noise(seed: number, x: number, y: number, scale: number): number {
  const left = Math.floor(x / scale);
  const top = Math.floor(y / scale);
  const blendX = smooth(x / scale - left);
  const blendY = smooth(y / scale - top);
  return mix(
    mix(gridValue(seed, left, top), gridValue(seed, left + 1, top), blendX),
    mix(
      gridValue(seed, left, top + 1),
      gridValue(seed, left + 1, top + 1),
      blendX,
    ),
    blendY,
  );
}

function smooth(t: number): number {
  return t * t * (3 - 2 * t);
}

function mix(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// A hash, not a generator: the same inputs give the same number in [0, 1), with
// no memory of earlier calls.
export function gridValue(seed: number, x: number, y: number): number {
  let hash = Math.imul(seed, 0x9e3779b1) ^ Math.imul(x, 0x85ebca6b) ^
    Math.imul(y, 0xc2b2ae35);
  hash = Math.imul(hash ^ (hash >>> 15), 0x2c1b3c6d);
  hash = Math.imul(hash ^ (hash >>> 12), 0x297a2d39);
  return ((hash ^ (hash >>> 15)) >>> 0) / 2 ** 32;
}
