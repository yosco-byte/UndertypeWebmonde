import { Input } from "./Input";
import { sceneManager } from "./SceneManager";
import { OverworldScene } from "./OverworldScene";
import { BossGrinch } from "./BossGrinch";
import { BossMonika } from "./BossMonika";
import { BossOmori } from "./BossOmori";
import { gameState } from "./GameState";
import { BossVirus } from "./virus";


const TARGET_FPS = 60;
const MAX_DT = 1 / 15; 

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


    sceneManager.register(
      "overworld",
      () => new OverworldScene(input, W, H, gameState.returnMapId, gameState.returnX, gameState.returnY)
    );

  
    sceneManager.register(
      "bossGrinch",
      () => new BossGrinch(input, W, H)
    );

  
    sceneManager.register(
      "bossMonika",
      () => new BossMonika(input, W, H)
    );

  
    sceneManager.register(
      "bossOmori",
      () => new BossOmori(input, W, H)
    );
    
    sceneManager.register(
      "bossVirus", 
      () => new BossVirus(input, W, H));

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

  
    if (dt > MAX_DT) dt = MAX_DT;

  
    if (sceneManager.getCurrentId() === "overworld") {
    
      if (
        this.input.isDown("KeyI") &&
        this.input.isDown("KeyO") &&
        this.input.isDown("KeyP")
      ) {
        sceneManager.goto("bossMonika");
      }
   
      if (
        this.input.isDown("KeyU") &&
        this.input.isDown("KeyI") &&
        this.input.isDown("KeyO")
      ) {
        gameState.monikaDefeated = true;
        sceneManager.goto("bossOmori");
      }
    }
    
    if (
      this.input.isDown("KeyJ") &&
      this.input.isDown("KeyU") &&
      this.input.isDown("KeyI") &&
      sceneManager.getCurrentId() !== "bossVirus"
      ) {
      sceneManager.goto("bossVirus");
    }
      
    sceneManager.update(dt);
    sceneManager.render(this.ctx);

    this.input.flush();

    this.rafId = requestAnimationFrame(this.loop);
  };
}
