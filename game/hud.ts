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
  }
}

// The readout, as ordinary page elements that CSS can style and that assistive
// tools can read. It changes only as events play.
export class Hud {
  private readonly seed: number;
  private readonly counts: Partial<Record<Item, number>>;

  constructor(state: GameState) {
    this.seed = state.seed;
    this.counts = { ...state.inventory };
    this.showPosition(state.player.x, state.player.y);
    this.showInventory();
  }

  show(event: GameEvent) {
    element("live").textContent = describe(event);
    if (event.type === "moved") this.showPosition(event.to.x, event.to.y);
    if (event.type === "collected") {
      this.counts[event.item] = event.total;
      this.showInventory();
    }
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
