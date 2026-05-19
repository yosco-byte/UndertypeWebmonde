// ===== overworld/Player.ts =====
// Joueur : déplacement 4 directions, animation sprite, collision tilemap.
 
import { Input } from "./Input";
import { TileMap, TILE_SIZE } from "./TileMap";
import { assets } from "./AssetLoader";
 
// ─── Types ───────────────────────────────────────────────
 
export type Direction = "down" | "left" | "right" | "up";
 
/** Config du spritesheet de Frisk/Chara.
 *  Layout attendu (peut être modifié ici) :
 *    Ligne 0 → marche BAS   (3 frames)
 *    Ligne 1 → marche GAUCHE(2 frames)
 *    Ligne 2 → marche DROITE(2 frames)
 *    Ligne 3 → marche HAUT  (3 frames)
 */
const SPRITE_URL = "/assets/sprites/frisk.png";
const FRAME_W = 19; // largeur d'une frame dans le spritesheet
const FRAME_H = 34; // hauteur d'une frame
const DIR_FRAME_COUNT: Record<Direction, number> = {
  down: 3,
  left: 2,
  right: 2,
  up: 3,
};
const ANIM_FPS = 8; // frames d'animation par seconde
 
const DIR_ROW: Record<Direction, number> = {
  down: 0,
  left: 1,
  right: 2,
  up: 3,
};
 
// ─── Constantes joueur ───────────────────────────────────
 
const SPEED = 120; // pixels/seconde
const HITBOX_W = 16;
const HITBOX_H = 16;
 
// ─── Classe ──────────────────────────────────────────────
 
export class Player {
  /** Centre X en pixels monde */
  x: number;
  /** Centre Y en pixels monde */
  y: number;
 
  private direction: Direction = "down";
  private moving = false;
 
  private frameIndex = 0;
  private frameTimer = 0;
 
  private sprite: HTMLImageElement | null = null;
 
  constructor(spawnX: number, spawnY: number) {
    this.x = spawnX;
    this.y = spawnY;
 
    // Chargement sprite (async — fallback si absent)
    assets.load(SPRITE_URL).then((img) => {
      this.sprite = img;
    });
  }
 
  // ── Update ────────────────────────────────────────────
 
  update(dt: number, input: Input, map: TileMap): void {
    let dx = 0;
    let dy = 0;
 
    // Lecture des touches (flèches + ZQSD / WASD)
    if (input.isDown("ArrowLeft") || input.isDown("KeyQ") || input.isDown("KeyA")) {
      dx = -1;
      this.direction = "left";
    } else if (input.isDown("ArrowRight") || input.isDown("KeyD")) {
      dx = 1;
      this.direction = "right";
    }
 
    if (input.isDown("ArrowUp") || input.isDown("KeyZ") || input.isDown("KeyW")) {
      dy = -1;
      this.direction = "up";
    } else if (input.isDown("ArrowDown") || input.isDown("KeyS")) {
      dy = 1;
      this.direction = "down";
    }
 
    // Normalisation diagonale
    if (dx !== 0 && dy !== 0) {
      dx *= 0.707;
      dy *= 0.707;
    }
 
    this.moving = dx !== 0 || dy !== 0;
 
    // Déplacement avec résolution de collision (axe par axe)
    const stepX = dx * SPEED * dt;
    const stepY = dy * SPEED * dt;
 
    this.moveAxis(stepX, 0, map);
    this.moveAxis(0, stepY, map);
 
    // Animation
    if (this.moving) {
      this.frameTimer += dt;
      if (this.frameTimer >= 1 / ANIM_FPS) {
        this.frameTimer -= 1 / ANIM_FPS;
        this.frameIndex = (this.frameIndex + 1) % DIR_FRAME_COUNT[this.direction];
      }
    } else {
      this.frameIndex = 0;
      this.frameTimer = 0;
    }
  }
 
  private moveAxis(dx: number, dy: number, map: TileMap): void {
    const nx = this.x + dx;
    const ny = this.y + dy;
    const left = nx - HITBOX_W / 2;
    const top = ny - HITBOX_H / 2;
 
    if (!map.isBlocked(left, top, HITBOX_W, HITBOX_H)) {
      this.x = nx;
      this.y = ny;
    }
  }
 
  // ── Render ───────────────────────────────────────────
 
  render(ctx: CanvasRenderingContext2D): void {
    const drawX = Math.round(this.x);
    const drawY = Math.round(this.y);
 
    if (this.sprite) {
      this.renderSprite(ctx, drawX, drawY);
    } else {
      this.renderFallback(ctx, drawX, drawY);
    }
  }
 
  private renderSprite(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number
  ): void {
    const sprite = this.sprite!;
    const row = DIR_ROW[this.direction];
    const sx = this.frameIndex * FRAME_W;
    const sy = row * FRAME_H;
 
    // Dessin centré sur (cx, cy)
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(
      sprite,
      sx, sy, FRAME_W, FRAME_H,
      cx - FRAME_W, cy - FRAME_H,
      FRAME_W * 2, FRAME_H * 2   // ×2 pour lisibilité pixel art
    );
  }
 
  /** Rendu de secours : bonhomme simple en canvas 2D */
  private renderFallback(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number
  ): void {
    const t = Date.now() / 1000;
 
    // Corps
    ctx.fillStyle = "#8b4513"; // marron peau
    ctx.fillRect(cx - 7, cy - 20, 14, 14);
 
    // Tête
    ctx.fillStyle = "#f5c9a0";
    ctx.fillRect(cx - 6, cy - 28, 12, 12);
 
    // Yeux
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(cx - 4, cy - 25, 3, 3);
    ctx.fillRect(cx + 1, cy - 25, 3, 3);
 
    // Jambes animées si en mouvement
    if (this.moving) {
      const leg = Math.sin(t * 10) * 4;
      ctx.fillStyle = "#4a3728";
      ctx.fillRect(cx - 6, cy - 6, 5, 8 + leg);
      ctx.fillRect(cx + 1, cy - 6, 5, 8 - leg);
    } else {
      ctx.fillStyle = "#4a3728";
      ctx.fillRect(cx - 6, cy - 6, 5, 8);
      ctx.fillRect(cx + 1, cy - 6, 5, 8);
    }
 
    // Indicateur direction (petit point coloré)
    const arrowColors: Record<Direction, string> = {
      down: "#ff6b6b",
      up: "#74c0fc",
      left: "#a9e34b",
      right: "#ffd43b",
    };
    ctx.fillStyle = arrowColors[this.direction];
    ctx.fillRect(cx - 2, cy - 34, 4, 4);
  }
 
  // ── Accesseurs ───────────────────────────────────────
 
  /** Tuile courante du joueur (coin haut-gauche de la hitbox) */
  get tileX(): number {
    return Math.floor((this.x - HITBOX_W / 2) / TILE_SIZE);
  }
 
  get tileY(): number {
    return Math.floor((this.y - HITBOX_H / 2) / TILE_SIZE);
  }
}