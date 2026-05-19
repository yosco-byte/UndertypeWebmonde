// ===== overworld/TileMap.ts =====
// Rendu de la tilemap et détection de collision / transitions.

import { MapData, TileType, Transition } from "./MapData";
import { assets } from "./AssetLoader";

export const TILE_SIZE = 32;

export class TileMap {
  readonly pixelW: number;
  readonly pixelH: number;
  readonly mapName: string;

  private tileset: HTMLImageElement | null = null;

  constructor(private data: MapData) {
    this.pixelW = data.width * TILE_SIZE;
    this.pixelH = data.height * TILE_SIZE;
    this.mapName = data.name;
    // Tileset chargé en arrière-plan
    if (data.tilesetUrl) {
      assets.load(data.tilesetUrl).then((img) => {
        this.tileset = img;
      });
    }
  }

  // ── Queries ──────────────────────────────────────────────

  /** Type de tuile à la position monde (px) */
  tileAt(wx: number, wy: number): TileType {
    const tx = Math.floor(wx / TILE_SIZE);
    const ty = Math.floor(wy / TILE_SIZE);
    return this.tileAtGrid(tx, ty);
  }

  tileAtGrid(tx: number, ty: number): TileType {
    if (tx < 0 || ty < 0 || tx >= this.data.width || ty >= this.data.height) {
      return TileType.Wall;
    }
    return this.data.tiles[ty * this.data.width + tx];
  }

  /** True si le rectangle (px) chevauche un mur */
  isBlocked(x: number, y: number, w: number, h: number): boolean {
    // On teste les 4 coins du rectangle joueur
    const corners = [
      [x, y],
      [x + w - 1, y],
      [x, y + h - 1],
      [x + w - 1, y + h - 1],
    ];
    return corners.some(([cx, cy]) => this.tileAt(cx, cy) === TileType.Wall);
  }

  /** Retourne la transition déclenchée par le centre du joueur, ou null */
  transitionAt(centerX: number, centerY: number): Transition | null {
    const tx = Math.floor(centerX / TILE_SIZE);
    const ty = Math.floor(centerY / TILE_SIZE);
    if (this.tileAtGrid(tx, ty) !== TileType.Transition) return null;
    return (
      this.data.transitions.find((t) => t.tileX === tx && t.tileY === ty) ??
      null
    );
  }

  // ── Render ───────────────────────────────────────────────

  render(ctx: CanvasRenderingContext2D): void {
    const { width, height, tiles, colors } = this.data;

    // Fond global
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, this.pixelW, this.pixelH);

    for (let ty = 0; ty < height; ty++) {
      for (let tx = 0; tx < width; tx++) {
        const tile = tiles[ty * width + tx];
        const px = tx * TILE_SIZE;
        const py = ty * TILE_SIZE;

        if (tile === TileType.Floor) {
          this.drawFloor(ctx, px, py, colors.floor);
        } else if (tile === TileType.Transition) {
          this.drawTransition(ctx, px, py, colors.transition);
        }
        // Wall = bg, déjà rempli
      }
    }
  }

  private drawFloor(
    ctx: CanvasRenderingContext2D,
    px: number,
    py: number,
    color: string
  ): void {
    if (this.tileset) {
      // Utilise le tileset si disponible (tuile sol = 0,0 dans le tileset)
      ctx.drawImage(this.tileset, 0, 0, TILE_SIZE, TILE_SIZE, px, py, TILE_SIZE, TILE_SIZE);
    } else {
      // Fallback : sol coloré avec légère texture
      ctx.fillStyle = color;
      ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
      // Petite grille subtile
      ctx.strokeStyle = "rgba(255,255,255,0.04)";
      ctx.lineWidth = 0.5;
      ctx.strokeRect(px + 0.5, py + 0.5, TILE_SIZE - 1, TILE_SIZE - 1);
    }
  }

  private drawTransition(
    ctx: CanvasRenderingContext2D,
    px: number,
    py: number,
    color: string
  ): void {
    // Sol de base
    this.drawFloor(ctx, px, py, color);
    // Indicateur visuel (flèche vers le bas)
    const cx = px + TILE_SIZE / 2;
    const cy = py + TILE_SIZE / 2;
    ctx.fillStyle = "rgba(255, 255, 200, 0.35)";
    ctx.beginPath();
    ctx.moveTo(cx, cy + 10);
    ctx.lineTo(cx - 7, cy);
    ctx.lineTo(cx + 7, cy);
    ctx.closePath();
    ctx.fill();
  }
}
