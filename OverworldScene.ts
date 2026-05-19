// ===== scenes/OverworldScene.ts =====
// Scène principale de l'overworld.
// Gère : rendu tilemap, joueur, caméra, transitions avec fondu.

import { Scene, sceneManager } from "./SceneManager";
import { Input } from "./Input";
import { Camera } from "./Camera";
import { Player } from "./Player";
import { TileMap } from "./TileMap";
import { MapData } from "./MapData";
import { MAP_REGISTRY } from "./maps";

// ─── Fade ────────────────────────────────────────────────

type FadeState = "none" | "out" | "in";

interface FadeData {
  state: FadeState;
  alpha: number; // 0 = transparent, 1 = noir plein
  speed: number; // unités par seconde
  onComplete?: () => void;
}

// ─── OverworldScene ──────────────────────────────────────

export class OverworldScene implements Scene {
  private map!: TileMap;
  private player!: Player;
  private camera!: Camera;

  private fade: FadeData = { state: "none", alpha: 0, speed: 2 };

  // Cooldown pour éviter de re-déclencher la transition immédiatement
  private transitionCooldown = 0;

  constructor(
    private readonly input: Input,
    private readonly viewportW: number,
    private readonly viewportH: number,
    private startMapId: string = "ruins_1",
    private startX?: number,
    private startY?: number
  ) {}

  // ── Cycle de vie ─────────────────────────────────────

  onEnter(): void {
    this.loadMap(this.startMapId, this.startX, this.startY);
    // Fondu entrant au chargement
    this.fade = { state: "in", alpha: 1, speed: 2.5 };
  }

  onExit(): void {
    // Rien de spécial pour l'instant
  }

  // ── Chargement d'une map ─────────────────────────────

  private loadMap(mapId: string, spawnX?: number, spawnY?: number): void {
    const data: MapData = MAP_REGISTRY[mapId];
    if (!data) {
      console.error(`[OverworldScene] Map introuvable : "${mapId}"`);
      return;
    }

    this.map = new TileMap(data);
    this.camera = new Camera(this.viewportW, this.viewportH);

    // Position de spawn par défaut : premier sol trouvé
    if (spawnX !== undefined && spawnY !== undefined) {
      this.player = new Player(spawnX, spawnY);
    } else {
      const spawn = this.findDefaultSpawn(data);
      this.player = new Player(spawn.x, spawn.y);
    }

    this.transitionCooldown = 0.8;
  }

  /** Trouve la première tuile sol pour y spawner le joueur */
  private findDefaultSpawn(data: MapData): { x: number; y: number } {
    for (let ty = 0; ty < data.height; ty++) {
      for (let tx = 0; tx < data.width; tx++) {
        if (data.tiles[ty * data.width + tx] === 0) {
          return {
            x: tx * 32 + 16,
            y: ty * 32 + 16,
          };
        }
      }
    }
    return { x: 32, y: 32 };
  }

  // ── Update ───────────────────────────────────────────

  update(dt: number): void {
    // Fondu
    this.updateFade(dt);

    // Si fondu sortant en cours → ne pas bouger
    if (this.fade.state === "out") return;

    if (this.transitionCooldown > 0) this.transitionCooldown -= dt;

    // Joueur
    this.player.update(dt, this.input, this.map);

    // Caméra
    this.camera.follow(
      this.player.x,
      this.player.y,
      this.map.pixelW,
      this.map.pixelH
    );

    // Transitions
    if (this.transitionCooldown <= 0) {
      const t = this.map.transitionAt(this.player.x, this.player.y);
      if (t) {
        const { targetMapId, spawnX, spawnY } = t;
        this.startFadeOut(() => {
          this.loadMap(targetMapId, spawnX, spawnY);
          this.fade = { state: "in", alpha: 1, speed: 2.5 };
        });
      }
    }
  }

  private updateFade(dt: number): void {
    if (this.fade.state === "none") return;

    if (this.fade.state === "out") {
      this.fade.alpha = Math.min(1, this.fade.alpha + this.fade.speed * dt);
      if (this.fade.alpha >= 1) {
        this.fade.state = "none";
        this.fade.onComplete?.();
      }
    } else if (this.fade.state === "in") {
      this.fade.alpha = Math.max(0, this.fade.alpha - this.fade.speed * dt);
      if (this.fade.alpha <= 0) {
        this.fade.state = "none";
      }
    }
  }

  private startFadeOut(onComplete: () => void): void {
    if (this.fade.state === "out") return;
    this.fade = { state: "out", alpha: 0, speed: 2.5, onComplete };
  }

  // ── Render ───────────────────────────────────────────

  render(ctx: CanvasRenderingContext2D): void {
    // Fond noir global
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, this.viewportW, this.viewportH);

    // Monde (décalé par la caméra)
    this.camera.apply(ctx);
    this.map.render(ctx);
    this.player.render(ctx);
    this.camera.restore(ctx);

    // HUD (en coordonnées écran)
    this.renderHUD(ctx);

    // Fondu
    if (this.fade.state !== "none" && this.fade.alpha > 0) {
      ctx.fillStyle = `rgba(0, 0, 0, ${this.fade.alpha})`;
      ctx.fillRect(0, 0, this.viewportW, this.viewportH);
    }
  }

  private renderHUD(ctx: CanvasRenderingContext2D): void {
    // Nom de la map en bas
    const mapName = this.map ? this.map.mapName : "";
    if (mapName) {
      ctx.font = "14px 'Courier New', monospace";
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.fillText(mapName, 12, this.viewportH - 12);
    }

    // Indicateur de contrôles (coin haut-droite)
    ctx.font = "11px 'Courier New', monospace";
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.textAlign = "right";
    ctx.fillText("← ↑ ↓ → ou ZQSD", this.viewportW - 10, 20);
    ctx.textAlign = "left";
  }
}
