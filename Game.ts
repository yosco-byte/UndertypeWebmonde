// ===== engine/Game.ts =====
// Boucle de jeu principale avec timestep fixe (60 fps cible).

import { Input } from "./Input";
import { sceneManager } from "./SceneManager";
import { OverworldScene } from "./OverworldScene";

const TARGET_FPS = 60;
const MAX_DT = 1 / 15; // évite les gros sauts si l'onglet est mis en pause

export class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private input: Input;

  private lastTime = 0;
  private rafId = 0;

  readonly W = 720;
  readonly H = 500;

  constructor() {
    this.canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
    this.canvas.width = this.W;
    this.canvas.height = this.H;
    this.ctx = this.canvas.getContext("2d")!;
    this.ctx.imageSmoothingEnabled = false;

    this.input = new Input();
    this.setupScenes();
  }

  private setupScenes(): void {
    const input = this.input;
    const W = this.W;
    const H = this.H;

    // Overworld — démarre sur ruins_1
    sceneManager.register(
      "overworld",
      () => new OverworldScene(input, W, H, "ruins_1")
    );

    // TODO : ajouter la scène de combat ici
    // sceneManager.register("battle", () => new BattleScene(input, W, H));

    sceneManager.goto("overworld");
  }

  start(): void {
    this.lastTime = performance.now();
    this.rafId = requestAnimationFrame(this.loop);
  }

  stop(): void {
    cancelAnimationFrame(this.rafId);
  }

  private loop = (now: number): void => {
    let dt = (now - this.lastTime) / 1000;
    this.lastTime = now;

    // Évite les spirales de la mort
    if (dt > MAX_DT) dt = MAX_DT;

    sceneManager.update(dt);
    sceneManager.render(this.ctx);

    this.input.flush();

    this.rafId = requestAnimationFrame(this.loop);
  };
}
