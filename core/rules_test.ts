import { assertEquals } from "@std/assert";
import {
  apply,
  type GameState,
  isPassable,
  newGame,
  terrainAt,
  WOOD_LIGHT,
} from "./mod.ts";
import { itemAt, itemPlacements } from "./items.ts";

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
  const { x, y, item } = itemPlacements(SEED)[0];
  const approaches = [
    { direction: "east", back: "west", dx: 1, dy: 0 },
    { direction: "west", back: "east", dx: -1, dy: 0 },
    { direction: "south", back: "north", dx: 0, dy: 1 },
    { direction: "north", back: "south", dx: 0, dy: -1 },
  ] as const;
  // Stand beside the item, on a cell that is walkable and empty.
  const approach = approaches.find(({ dx, dy }) =>
    isPassable(terrainAt(SEED, x - dx, y - dy)) &&
    itemAt(SEED, x - dx, y - dy) === null
  );
  if (!approach) throw new Error("Found no cell beside the item.");
  const state: GameState = {
    seed: SEED,
    player: { x: x - approach.dx, y: y - approach.dy },
    inventory: {},
    taken: [],
    light: 0,
  };

  const first = apply(state, { type: "move", direction: approach.direction });
  assertEquals(first.map((e) => e.type).includes("collected"), true);
  assertEquals(state.inventory[item], 1);

  apply(state, { type: "move", direction: approach.back });
  const second = apply(state, { type: "move", direction: approach.direction });
  assertEquals(second.map((e) => e.type).includes("collected"), false);
  assertEquals(state.inventory[item], 1);
});

Deno.test("each seed scatters exactly the intended items", () => {
  for (const seed of [121, 7, 99]) {
    const counts: Record<string, number> = {};
    for (const { item } of itemPlacements(seed)) {
      counts[item] = (counts[item] ?? 0) + 1;
    }
    assertEquals(counts["Note piece"], 4);
    assertEquals(counts["Broken Boat"], 1);
    assertEquals(counts["Wooden Board"], 1);
    assertEquals(counts["Candle"], 1);
    assertEquals(counts["Note"], undefined);
    assertEquals(counts["Fixed Boat"], undefined);
  }
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
