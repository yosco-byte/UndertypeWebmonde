
import { Input } from "./Input";
import { TileMap } from "./TileMap";
import { assets } from "./AssetLoader";

export type Direction = "down" | "left" | "right" | "up";

const SPRITE_URL = "/assets/sprites/frisk.png";
const FRAME_W = 19;
const FRAME_H = 34;
const DIR_FRAME_COUNT: Record<Direction, number> = {
  down:  3,
  left:  2,
  right: 2,
  up:    3,
};
const ANIM_FPS = 8;

const DIR_ROW: Record<Direction, number> = {
  down:  0,
  left:  1,
  right: 2,
  up:    3,
};

const SPEED = 120;


const HITBOX_W        = 14;
const HITBOX_H        = 10;
const HITBOX_OFFSET_Y = 24; 

export class Player {
  x: number;
  y: number;

  private direction: Direction = "down";
  private moving = false;

  private frameIndex = 0;
  private frameTimer = 0;

  private sprite: HTMLImageElement | null = null;
  private _tileSize: number;

  constructor(spawnX: number, spawnY: number, tileSize = 32) {
    this.x = spawnX;
    this.y = spawnY;
    this._tileSize = tileSize;

    assets.load(SPRITE_URL).then((img) => {
      this.sprite = img;
    });
  }

  update(dt: number, input: Input, map: TileMap): void {
    let dx = 0;
    let dy = 0;

    if (input.isDown("ArrowLeft") || input.isDown("KeyQ") || input.isDown("KeyA")) {
      dx = -1; this.direction = "left";
    } else if (input.isDown("ArrowRight") || input.isDown("KeyD")) {
      dx = 1; this.direction = "right";
    }

    if (input.isDown("ArrowUp") || input.isDown("KeyZ") || input.isDown("KeyW")) {
      dy = -1; this.direction = "up";
    } else if (input.isDown("ArrowDown") || input.isDown("KeyS")) {
      dy = 1; this.direction = "down";
    }

    if (dx !== 0 && dy !== 0) { dx *= 0.707; dy *= 0.707; }

    this.moving = dx !== 0 || dy !== 0;

    this.moveAxis(dx * SPEED * dt, 0, map);
    this.moveAxis(0, dy * SPEED * dt, map);

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
    const nx   = this.x + dx;
    const ny   = this.y + dy;
    const left = nx - HITBOX_W / 2;
    const top  = ny + HITBOX_OFFSET_Y;

    if (!map.isBlocked(left, top, HITBOX_W, HITBOX_H)) {
      this.x = nx;
      this.y = ny;
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    const drawX = Math.round(this.x);
    const drawY = Math.round(this.y);

    if (this.sprite) {
      this.renderSprite(ctx, drawX, drawY);
    } else {
      this.renderFallback(ctx, drawX, drawY);
    }
  }

  private renderSprite(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
    const sprite = this.sprite!;
    const row = DIR_ROW[this.direction];
    const sx  = this.frameIndex * FRAME_W;
    const sy  = row * FRAME_H;

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(
      sprite,
      sx, sy, FRAME_W, FRAME_H,
      cx - FRAME_W, cy - FRAME_H,
      FRAME_W * 2, FRAME_H * 2
    );
  }

  private renderFallback(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
    const t = Date.now() / 1000;
    ctx.fillStyle = "#8b4513";
    ctx.fillRect(cx - 7, cy - 20, 14, 14);
    ctx.fillStyle = "#f5c9a0";
    ctx.fillRect(cx - 6, cy - 28, 12, 12);
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(cx - 4, cy - 25, 3, 3);
    ctx.fillRect(cx + 1, cy - 25, 3, 3);
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
    const arrowColors: Record<Direction, string> = {
      down: "#ff6b6b", up: "#74c0fc", left: "#a9e34b", right: "#ffd43b",
    };
    ctx.fillStyle = arrowColors[this.direction];
    ctx.fillRect(cx - 2, cy - 34, 4, 4);
  }

  get tileX(): number {
    return Math.floor((this.x - HITBOX_W / 2) / this._tileSize);
  }

  get tileY(): number {
    return Math.floor((this.y + HITBOX_OFFSET_Y) / this._tileSize);
  }
}
