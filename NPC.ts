import { assets } from "./AssetLoader";
import { PNJData } from "./pnj";

export class NPC {
  readonly id: string;
  x: number;
  y: number;
  visible = false;

  private sprite: HTMLImageElement | null = null;
  private frameW: number;
  private frameH: number;
  private scale: number;
  private data: PNJData;

 
  private walking = false;
  private animFrame = 0;
  private animTimer = 0;
  private idleDelay = 0; 
 
  private fixedTarget: { x: number; y: number } | null = null;
  private stopDistanceOverride: number | null = null;

  private onArrived?: () => void;

  constructor(data: PNJData) {
    this.data   = data;
    this.id     = data.id;
    this.x      = data.spawnTileX * data.tileSize + data.tileSize / 2;
    this.y      = data.spawnTileY * data.tileSize;
    this.frameW = data.frameW;
    this.frameH = data.frameH;
    this.scale  = data.scale;

    assets.load(data.spriteUrl).then((img) => { this.sprite = img; });
  }


  startWalking(onArrived?: () => void): void {
    if (!this.data.walk) return;
    this.walking = true;
    this.fixedTarget = null;
    this.stopDistanceOverride = null;
    this.animFrame = 0;
    this.animTimer = 0;
    this.idleDelay = this.data.walk.startDelay ?? 0;
    this.onArrived = onArrived;
  }

  walkTo(targetX: number, targetY: number, onArrived?: () => void, stopDistance = 4): void {
    if (!this.data.walk) return;
    this.walking = true;
    this.fixedTarget = { x: targetX, y: targetY };
    this.stopDistanceOverride = stopDistance;
    this.animFrame = 0;
    this.animTimer = 0;
    this.idleDelay = 0;
    this.onArrived = onArrived;
  }

  update(dt: number, playerX: number, playerY: number): void {
    const walk = this.data.walk;
    if (!walk || !this.walking || !this.visible) return;


    if (this.idleDelay > 0) {
      this.idleDelay -= dt;
      return;
    }

    const targetX = this.fixedTarget ? this.fixedTarget.x : playerX;
    const targetY = this.fixedTarget ? this.fixedTarget.y : playerY;
    const stopDistance = this.stopDistanceOverride ?? walk.stopDistance;

    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const dist = Math.hypot(dx, dy);

    if (dist <= stopDistance) {
      
      this.walking = false;
      this.animFrame = 0;
      const cb = this.onArrived;
      this.onArrived = undefined;
      cb?.();
      return;
    }

   
    const len = dist || 1;
    this.x += (dx / len) * walk.speed * dt;
    this.y += (dy / len) * walk.speed * dt;

    this.animTimer += dt;
    const frameDuration = 1 / walk.fps;
    if (this.animTimer >= frameDuration) {
      this.animTimer -= frameDuration;
      this.animFrame = (this.animFrame + 1) % walk.frameCount;
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (!this.visible) return;
    const cx = Math.round(this.x);
    const cy = Math.round(this.y);

    if (this.sprite) {
      ctx.imageSmoothingEnabled = false;

      if (this.data.walk) {
     
        const walk = this.data.walk;
        const sx = this.animFrame * walk.frameW;
        const destW = walk.frameW * this.scale;
        const destH = walk.frameH * this.scale;
        ctx.drawImage(
          this.sprite,
          sx, 0, walk.frameW, walk.frameH,
          cx - destW / 2, cy - destH,
          destW, destH
        );
      } else {
        ctx.drawImage(
          this.sprite,
          0, 0, this.frameW, this.frameH,
          cx - (this.frameW * this.scale) / 2,
          cy - this.frameH * this.scale,
          this.frameW * this.scale,
          this.frameH * this.scale
        );
      }
    } else {
      ctx.fillStyle = "#9b59b6";
      ctx.fillRect(cx - 10, cy - 30, 20, 30);
    }
  }
}