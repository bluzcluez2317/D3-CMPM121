import { assertEquals } from "@std/assert";
import {
  apply,
  type GameState,
  isPassable,
  newGame,
  terrainAt,
  WOOD_LIGHT,
} from "./mod.ts";
import { itemAt } from "./items.ts";

// Each test has a Given-When-Then shape: https://martinfowler.com/bliki/GivenWhenThen.html
const SEED = 121;

// A state with the player just west of a cell that is, or is not, passable.
// Searching keeps these tests honest if the terrain formula changes.

function besideEasternCell(passable: boolean): GameState {
  for (let x = 2; x < 10_000; x++) {
    const here = isPassable(terrainAt(SEED, x, 0));
    const east = isPassable(terrainAt(SEED, x + 1, 0));
    const clear = itemAt(SEED, x, 0) === null &&
      itemAt(SEED, x + 1, 0) === null;
    if (here && east === passable && clear) {
      return {
        seed: SEED,
        player: { x, y: 0 },
        inventory: {},
        taken: [],
        light: 0,
      };
    }
  }
  throw new Error("Found no suitable cell on this row.");
}

Deno.test("four note pieces craft one note", () => {
  const state = {
    ...newGame(SEED),
    inventory: { "Note piece": 4 },
  } as GameState;
  const events = apply(state, { type: "craft", recipe: "note" });
  assertEquals(events.map((e) => e.type), ["crafted"]);
  assertEquals(state.inventory, { "Note": 1 });
});

Deno.test("crafting without ingredients changes nothing", () => {
  const state = {
    ...newGame(SEED),
    inventory: { "Note piece": 3 },
  } as GameState;
  const events = apply(state, { type: "craft", recipe: "note" });
  assertEquals(events, [{
    type: "missing",
    recipe: "note",
    items: ["Note piece"],
  }]);
  assertEquals(state.inventory, { "Note piece": 3 });
});

Deno.test("dry wood extends the candle without using it up", () => {
  const state = {
    ...newGame(SEED),
    inventory: { "Candle": 1, "Dry Wood": 1 },
    light: 5,
  } as GameState;
  apply(state, { type: "craft", recipe: "fuel" });
  assertEquals(state.light, 5 + WOOD_LIGHT);
  assertEquals(state.inventory, { "Candle": 1 });
});

Deno.test("an item is collected once, then the cell is empty", () => {
  let state: GameState | undefined;
  for (let x = 2; x < 10_000 && !state; x++) {
    if (
      isPassable(terrainAt(SEED, x, 0)) && itemAt(SEED, x, 0) === null &&
      itemAt(SEED, x + 1, 0) !== null
    ) {
      state = {
        seed: SEED,
        player: { x, y: 0 },
        inventory: {},
        taken: [],
        light: 0,
      };
    }
  }
  if (!state) throw new Error("Found no item on this row.");
  const item = itemAt(SEED, state.player.x + 1, 0)!;

  const first = apply(state, { type: "move", direction: "east" });
  assertEquals(first.map((e) => e.type), ["moved", "collected"]);
  assertEquals(state.inventory[item], 1);

  apply(state, { type: "move", direction: "west" });
  const second = apply(state, { type: "move", direction: "east" });
  assertEquals(second.map((e) => e.type), ["moved"]);
  assertEquals(state.inventory[item], 1);
});

Deno.test("moving onto passable terrain moves the player", () => {
  const state = besideEasternCell(true);
  const { x, y } = state.player;

  const events = apply(state, { type: "move", direction: "east" });

  assertEquals(state.player, { x: x + 1, y });
  assertEquals(events, [{
    type: "moved",
    from: { x, y },
    to: { x: x + 1, y },
  }]);
});

Deno.test("a blocked move changes nothing and reports why", () => {
  const state = besideEasternCell(false);
  const snapshot = JSON.parse(JSON.stringify(state));
  const { x, y } = state.player;
  const target = { x: x + 1, y };

  const events = apply(state, { type: "move", direction: "east" });

  assertEquals(state, snapshot);
  assertEquals(events, [{
    type: "blocked",
    at: { x, y },
    toward: target,
    terrain: terrainAt(SEED, target.x, target.y),
  }]);
});

Deno.test("an event keeps its cells while state moves on", () => {
  const state = besideEasternCell(true);
  const { x, y } = state.player;

  const first = apply(state, { type: "move", direction: "east" });
  const second = apply(state, { type: "move", direction: "west" });
  apply(state, { type: "move", direction: "east" });

  // Both retained events still report the cells from when they happened, even
  // though state.player has since changed.
  assertEquals(first, [{
    type: "moved",
    from: { x, y },
    to: { x: x + 1, y },
  }]);
  assertEquals(second, [{
    type: "moved",
    from: { x: x + 1, y },
    to: { x, y },
  }]);
});
