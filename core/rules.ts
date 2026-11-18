// The rules of the game. There is no clock here: a command updates the state at
// once, and the events it returns are a record of what happened. Whoever called
// apply() decides how, or whether, to show them over time.

import { isPassable, type Terrain, terrainAt } from "./terrain.ts";
import { type Item, itemAt } from "./items.ts";

export type Cell = { x: number; y: number };

export type Direction = "north" | "south" | "east" | "west";

export const CANDLE_LIGHT = 60;
export const WOOD_LIGHT = 40;

export type RecipeName = "note" | "boat" | "fuel";

export type GameState = {
  seed: number;
  player: Cell;
  inventory: Partial<Record<Item, number>>;
  taken: string[];
  light: number;
};

// Command: https://gameprogrammingpatterns.com/command.html
export type Command =
  | { type: "move"; direction: Direction }
  | { type: "craft"; recipe: RecipeName };

// Domain Event: https://martinfowler.com/eaaDev/DomainEvent.html
export type GameEvent =
  | { type: "moved"; from: Cell; to: Cell }
  | { type: "blocked"; at: Cell; toward: Cell; terrain: Terrain }
  | { type: "collected"; item: Item; at: Cell; total: number }
  | {
    type: "crafted";
    recipe: RecipeName;
    inventory: Partial<Record<Item, number>>;
  }
  | { type: "missing"; recipe: RecipeName; items: Item[] }
  | { type: "light"; light: number };

type Recipe = {
  needs: Partial<Record<Item, number>>; // consumed
  tool?: Item; // required but not consumed
  makes?: Item;
  light?: number;
};

const RECIPES: Record<RecipeName, Recipe> = {
  note: { needs: { "Note piece": 4 }, makes: "Note" },
  boat: { needs: { "Broken Boat": 1, "Wooden Board": 1 }, makes: "Fixed Boat" },
  fuel: { needs: { "Dry Wood": 1 }, tool: "Candle", light: WOOD_LIGHT },
};

const STEPS: Record<Direction, Cell> = {
  north: { x: 0, y: -1 },
  south: { x: 0, y: 1 },
  east: { x: 1, y: 0 },
  west: { x: -1, y: 0 },
};

// Singleton, avoided on purpose: tests make as many games as they need. https://gameprogrammingpatterns.com/singleton.html
export function newGame(seed: number): GameState {
  return { seed, player: { x: 0, y: 0 }, inventory: {}, taken: [], light: 0 };
}

// The single way in. It updates the state it is given and returns the events.
export function apply(state: GameState, command: Command): GameEvent[] {
  switch (command.type) {
    case "move":
      return move(state, command.direction);
    case "craft":
      return craft(state, command.recipe);
  }
}

function move(state: GameState, direction: Direction): GameEvent[] {
  const step = STEPS[direction];
  // Events are retained and played back later, while state keeps changing. So an
  // event gets cells of its own, never an object that state still holds.
  // Aliasing Bug: https://martinfowler.com/bliki/AliasingBug.html
  // Cells in events act as a Value Object: https://martinfowler.com/bliki/ValueObject.html
  const from = { ...state.player };
  const to = { x: from.x + step.x, y: from.y + step.y };
  const terrain = terrainAt(state.seed, to.x, to.y);
  if (!isPassable(terrain)) {
    return [{ type: "blocked", at: from, toward: to, terrain }];
  }
  state.player.x = to.x;
  state.player.y = to.y;
  const events: GameEvent[] = [{ type: "moved", from, to }];

  if (state.light > 0) {
    state.light--;
    events.push({ type: "light", light: state.light });
  }

  const item = itemAt(state.seed, to.x, to.y);
  const key = `${to.x},${to.y}`;
  if (item && !state.taken.includes(key)) {
    state.taken.push(key);
    const total = (state.inventory[item] ?? 0) + 1;
    state.inventory[item] = total;
    events.push({ type: "collected", item, at: { ...to }, total });
    if (item === "Candle") {
      state.light += CANDLE_LIGHT;
      events.push({ type: "light", light: state.light });
    }
  }
  return events;
}

function craft(state: GameState, name: RecipeName): GameEvent[] {
  const recipe = RECIPES[name];
  const needs = Object.entries(recipe.needs) as [Item, number][];
  const missing = needs
    .filter(([item, count]) => (state.inventory[item] ?? 0) < count)
    .map(([item]) => item);
  if (recipe.tool && !state.inventory[recipe.tool]) missing.push(recipe.tool);
  if (missing.length > 0) {
    return [{ type: "missing", recipe: name, items: missing }];
  }

  for (const [item, count] of needs) {
    const left = (state.inventory[item] ?? 0) - count;
    if (left > 0) state.inventory[item] = left;
    else delete state.inventory[item]; // no "x0" entries in the HUD
  }
  if (recipe.makes) {
    state.inventory[recipe.makes] = (state.inventory[recipe.makes] ?? 0) + 1;
  }

  const events: GameEvent[] = [
    { type: "crafted", recipe: name, inventory: { ...state.inventory } },
  ];
  if (recipe.light) {
    state.light += recipe.light;
    events.push({ type: "light", light: state.light });
  }
  return events;
}
