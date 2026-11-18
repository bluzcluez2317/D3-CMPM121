import {
  type GameEvent,
  type GameState,
  type Item,
  terrainAt,
} from "../core/mod.ts";

function element(id: string): HTMLElement {
  return document.getElementById(id)!;
}

function describe(event: GameEvent): string {
  switch (event.type) {
    case "moved":
      return `moved to ${event.to.x}, ${event.to.y}`;
    case "blocked":
      return `blocked by ${event.terrain} at ${event.toward.x}, ${event.toward.y}`;
    case "collected":
      return `picked up ${event.item} (${event.total})`;
    case "crafted":
      return `crafted: ${event.recipe}`;
    case "missing":
      return `cannot craft ${event.recipe}, need ${event.items.join(", ")}`;
    case "light":
      return `light: ${event.light}`;
  }
}

// The readout, as ordinary page elements that CSS can style and that assistive
// tools can read. It changes only as events play.
export class Hud {
  private readonly seed: number;
  private readonly counts: Partial<Record<Item, number>>;
  private light: number;

  constructor(state: GameState) {
    this.seed = state.seed;
    this.light = state.light;
    this.counts = { ...state.inventory };
    this.showPosition(state.player.x, state.player.y);
    this.showInventory();
    this.showLight();
  }

  show(event: GameEvent) {
    element("live").textContent = describe(event);
    if (event.type !== "light") element("live").textContent = describe(event);
    if (event.type === "moved") this.showPosition(event.to.x, event.to.y);
    if (event.type === "collected") {
      this.counts[event.item] = event.total;
      this.showInventory();
    }
    if (event.type === "crafted") {
      for (const key of Object.keys(this.counts)) {
        delete this.counts[key as Item];
      }
      Object.assign(this.counts, event.inventory);
      this.showInventory();
    }
    if (event.type === "light") {
      this.light = event.light;
      this.showLight();
    }
  }

  private showLight() {
    element("light").textContent = this.light > 0
      ? `${this.light} steps`
      : "dark";
  }

  private showInventory() {
    const text = Object.entries(this.counts)
      .map(([item, count]) => `${item} x${count}`)
      .join(", ");
    element("inventory").textContent = text || "empty";
  }

  private showPosition(x: number, y: number) {
    element("position").textContent = `${x}, ${y}`;
    element("terrain").textContent = terrainAt(this.seed, x, y);
  }
}
