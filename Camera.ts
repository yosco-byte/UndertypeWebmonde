// ===== engine/Camera.ts =====
// Caméra 2D qui suit le joueur et reste dans les limites de la map.

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

  /**
   * Centre la caméra sur (targetX, targetY)
   * en clampant dans [0, mapPixelW] × [0, mapPixelH].
   */
  follow(
    targetX: number,
    targetY: number,
    mapPixelW: number,
    mapPixelH: number
  ): void {
    this.x = Math.max(0, Math.min(targetX - this.halfW, mapPixelW - this.viewportW));
    this.y = Math.max(0, Math.min(targetY - this.halfH, mapPixelH - this.viewportH));
  }

  /** Applique le décalage de la caméra au contexte canvas */
  apply(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(-Math.round(this.x), -Math.round(this.y));
  }

  /** Restaure le contexte */
  restore(ctx: CanvasRenderingContext2D): void {
    ctx.restore();
  }

  /** Convertit des coordonnées monde → écran */
  worldToScreen(wx: number, wy: number): { sx: number; sy: number } {
    return { sx: wx - this.x, sy: wy - this.y };
  }
}
