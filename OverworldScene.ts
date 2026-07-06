import { Scene, sceneManager } from "./SceneManager";
import { Input } from "./Input";
import { Camera } from "./Camera";
import { Player } from "./Player";
import { TileMap } from "./TileMap";
import { MapData } from "./MapData";
import { MAP_REGISTRY } from "./maps";
import { NPC } from "./NPC";
import { PNJ_REGISTRY, PNJData } from "./pnj";
import { DialogueBox } from "./DialogueBox";
import { gameState } from "./GameState";


type FadeState = "none" | "out" | "in";
interface FadeData { state: FadeState; alpha: number; speed: number; onComplete?: () => void; }

export class OverworldScene implements Scene {
  private map!: TileMap;
  private currentMapId!: string;
  private player!: Player;
  private camera!: Camera;
  private fade: FadeData = { state: "none", alpha: 0, speed: 2 };
  private transitionCooldown = 0;

  private npcs: NPC[] = [];
  private pnjData: PNJData[] = [];
  private triggered = new Set<string>(); 
  private dialogue = new DialogueBox();
  private cutsceneActive = false;        

  constructor(
    private readonly input: Input,
    private readonly viewportW: number,
    private readonly viewportH: number,
    private startMapId: string = "ruins_1",
    private startX?: number,
    private startY?: number
  ) {}

  onEnter(): void {
    this.loadMap(this.startMapId, this.startX, this.startY);
    this.fade = { state: "in", alpha: 1, speed: 2.5 };
  }

  onExit(): void {}

  private loadMap(mapId: string, spawnX?: number, spawnY?: number): void {
    const data: MapData = MAP_REGISTRY[mapId];
    if (!data) { console.error(`[OverworldScene] Map introuvable : "${mapId}"`); return; }

    this.currentMapId = mapId;
    this.map    = new TileMap(data);
    this.camera = new Camera(this.viewportW, this.viewportH);

    const sx = spawnX ?? data.spawnX;
    const sy = spawnY ?? data.spawnY;

    this.player = sx !== undefined && sy !== undefined
      ? new Player(sx, sy, data.tileSize)
      : new Player(...Object.values(this.findDefaultSpawn(data)) as [number, number], data.tileSize);

    this.transitionCooldown = 1.5;
    this.cutsceneActive     = false;
    this.triggered.clear();

    
    this.pnjData = PNJ_REGISTRY.filter(
      p => p.mapId === mapId && (p.condition ? p.condition() : true)
    );
    this.npcs    = this.pnjData.map(p => new NPC(p));

    
    this.pnjData.forEach((p, i) => {
      if (p.walk) {
        const npc = this.npcs[i];
        npc.visible = true;
        npc.startWalking(() => {
          this.cutsceneActive = true;
          this.dialogue.start(p.dialogue, () => {
            if (p.exit) {
            
              const exitX = p.exit.tileX * p.tileSize + p.tileSize / 2;
              const exitY = p.exit.tileY * p.tileSize;
              npc.walkTo(exitX, exitY, () => {
                npc.visible = false;        
                this.cutsceneActive = false; 
              }, 4,); 
            } else {
              this.cutsceneActive = false; 
            }
          });
        });
      }
    });
  }

  private findDefaultSpawn(data: MapData): { x: number; y: number } {
    for (let ty = 0; ty < data.height; ty++)
      for (let tx = 0; tx < data.width; tx++)
        if (data.tiles[ty * data.width + tx] === 0)
          return { x: tx * data.tileSize + data.tileSize / 2, y: ty * data.tileSize + data.tileSize / 2 };
    return { x: 32, y: 32 };
  }

  update(dt: number): void {
    this.updateFade(dt);
    if (this.fade.state === "out") return;
    if (this.transitionCooldown > 0) this.transitionCooldown -= dt;

    
    if (this.input.isDown("KeyI") && this.input.isDown("KeyO") && this.input.isDown("KeyP")) {
      sceneManager.goto("bossMonika");
      return;
    }

   
    this.npcs.forEach(npc => npc.update(dt, this.player.x, this.player.y));

   
    if (this.cutsceneActive) {
      this.dialogue.update(dt);
      if (this.input.wasPressed("KeyZ") || this.input.wasPressed("Enter")) {
        this.dialogue.advance();
      }
      return; 
    }

    this.player.update(dt, this.input, this.map);
    this.camera.follow(this.player.x, this.player.y, this.map.pixelW, this.map.pixelH);

    
    const playerTileY = Math.floor((this.player.y + 24) / this.map.tileSize);
    for (let i = 0; i < this.pnjData.length; i++) {
      const pData = this.pnjData[i];
      const npc   = this.npcs[i];
      if (this.triggered.has(pData.id)) continue;
      if (playerTileY <= pData.triggerTileY) {
        this.triggered.add(pData.id);
        npc.visible = true;
        
        this.cutsceneActive = true;
        this.dialogue.start(pData.dialogue, () => {
          if (pData.id === "grinch") {
          
            gameState.returnMapId = this.currentMapId;
            gameState.returnX = this.player.x;
            gameState.returnY = this.player.y;
           
            this.startFadeOut(() => {
              sceneManager.goto("bossGrinch");
            });
          } else {
            this.cutsceneActive = false; 
          }
        });
      }
    }
    if (this.transitionCooldown <= 0) {
      const t = this.map.transitionAt(this.player.x, this.player.y + 24);
      if (t) {
        this.startFadeOut(() => {
          this.loadMap(t.targetMapId, t.spawnX, t.spawnY);
          this.fade = { state: "in", alpha: 1, speed: 2.5 };
        });
      }
    }
  }

  private updateFade(dt: number): void {
    if (this.fade.state === "none") return;
    if (this.fade.state === "out") {
      this.fade.alpha = Math.min(1, this.fade.alpha + this.fade.speed * dt);
      if (this.fade.alpha >= 1) { this.fade.state = "none"; this.fade.onComplete?.(); }
    } else {
      this.fade.alpha = Math.max(0, this.fade.alpha - this.fade.speed * dt);
      if (this.fade.alpha <= 0) { this.fade.state = "none"; }
    }
  }

  private startFadeOut(onComplete: () => void): void {
    if (this.fade.state === "out") return;
    this.fade = { state: "out", alpha: 0, speed: 2.5, onComplete };
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, this.viewportW, this.viewportH);

    this.camera.apply(ctx);
    this.map.render(ctx);
    this.npcs.forEach(npc => npc.render(ctx));
    this.player.render(ctx);
    this.camera.restore(ctx);

    this.renderHUD(ctx);

   
    this.dialogue.render(ctx, this.viewportW, this.viewportH);

    if (this.fade.state !== "none" && this.fade.alpha > 0) {
      ctx.fillStyle = `rgba(0,0,0,${this.fade.alpha})`;
      ctx.fillRect(0, 0, this.viewportW, this.viewportH);
    }
  }

  private renderHUD(ctx: CanvasRenderingContext2D): void {
    const mapName = this.map?.mapName ?? "";
    if (mapName) {
      ctx.font = "14px 'Courier New', monospace";
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.fillText(mapName, 12, this.viewportH - 12);
    }
    ctx.font = "11px 'Courier New', monospace";
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.textAlign = "right";
    ctx.fillText("← ↑ ↓ → ou ZQSD", this.viewportW - 10, 20);
    ctx.textAlign = "left";
  }
}
