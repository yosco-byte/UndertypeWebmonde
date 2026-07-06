export class Camera {
  x: number = 0;
  y: number = 0;

  private readonly halfW: number;
  private readonly halfH: number;

  constructor(
    public readonly viewportW: number,
    public readonly viewportH: number
  ) {
    this.halfW = viewportW / 2;
    this.halfH = viewportH / 2;
  }

  follow(
    targetX: number,
    targetY: number,
    mapPixelW: number,
    mapPixelH: number
  ): void {
    
    if (mapPixelW <= this.viewportW) {
      this.x = -(this.viewportW - mapPixelW) / 2;
    } else {
      this.x = Math.max(0, Math.min(targetX - this.halfW, mapPixelW - this.viewportW));
    }

    if (mapPixelH <= this.viewportH) {
      this.y = -(this.viewportH - mapPixelH) / 2;
    } else {
      this.y = Math.max(0, Math.min(targetY - this.halfH, mapPixelH - this.viewportH));
    }
  }

  apply(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(-Math.round(this.x), -Math.round(this.y));
  }

  restore(ctx: CanvasRenderingContext2D): void {
    ctx.restore();
  }


  worldToScreen(wx: number, wy: number): { sx: number; sy: number } {
    return { sx: wx - this.x, sy: wy - this.y };
  }
}