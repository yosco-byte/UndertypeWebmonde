// ===== engine/Camera.ts =====
// Caméra 2D qui suit le joueur et reste dans les limites de la map.
export class Camera {
    constructor(viewportW, viewportH) {
        this.viewportW = viewportW;
        this.viewportH = viewportH;
        this.x = 0;
        this.y = 0;
        this.halfW = viewportW / 2;
        this.halfH = viewportH / 2;
    }
    /**
     * Centre la caméra sur (targetX, targetY)
     * en clampant dans [0, mapPixelW] × [0, mapPixelH].
     */
    follow(targetX, targetY, mapPixelW, mapPixelH) {
        this.x = Math.max(0, Math.min(targetX - this.halfW, mapPixelW - this.viewportW));
        this.y = Math.max(0, Math.min(targetY - this.halfH, mapPixelH - this.viewportH));
    }
    /** Applique le décalage de la caméra au contexte canvas */
    apply(ctx) {
        ctx.save();
        ctx.translate(-Math.round(this.x), -Math.round(this.y));
    }
    /** Restaure le contexte */
    restore(ctx) {
        ctx.restore();
    }
    /** Convertit des coordonnées monde → écran */
    worldToScreen(wx, wy) {
        return { sx: wx - this.x, sy: wy - this.y };
    }
}
