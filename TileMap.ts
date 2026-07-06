import { MapData, TileType, Transition } from "./MapData";
import { assets } from "./AssetLoader";

export class TileMap {
  
  readonly pixelW: number;
  readonly pixelH: number;
  readonly mapName: string;
  readonly tileSize: number;

  private mapImage: HTMLImageElement | null = null;
  private imageReady = false;

  
  private debugMode = false;

  constructor(private data: MapData) {
    this.tileSize  = data.tileSize;
    this.pixelW    = data.width  * data.tileSize;
    this.pixelH    = data.height * data.tileSize;
    this.mapName   = data.name;

    
    if (data.mapImageUrl) {
      assets.load(data.mapImageUrl).then((img) => {
        this.mapImage   = img;
        this.imageReady = img !== null;
      });
    }

   
    window.addEventListener("keydown", (e) => {
      if (e.code === "KeyM") {
        e.preventDefault();
        this.debugMode = !this.debugMode;
        console.log(`[TileMap] Mode debug : ${this.debugMode ? "ON" : "OFF"}`);
      }
    });
  }




  tileAt(wx: number, wy: number): TileType {
    const tx = Math.floor(wx / this.tileSize);
    const ty = Math.floor(wy / this.tileSize);
    return this.tileAtGrid(tx, ty);
  }

  tileAtGrid(tx: number, ty: number): TileType {
    const { width, height, tiles } = this.data;
    if (tx < 0 || ty < 0 || tx >= width || ty >= height) return TileType.Wall;
    return tiles[ty * width + tx];
  }


  isBlocked(x: number, y: number, w: number, h: number): boolean {
    const corners: [number, number][] = [
      [x,         y        ],
      [x + w - 1, y        ],
      [x,         y + h - 1],
      [x + w - 1, y + h - 1],
    ];
    return corners.some(([cx, cy]) => this.tileAt(cx, cy) === TileType.Wall);
  }


  transitionAt(centerX: number, centerY: number): Transition | null {
    const tx = Math.floor(centerX / this.tileSize);
    const ty = Math.floor(centerY / this.tileSize);
    if (this.tileAtGrid(tx, ty) !== TileType.Transition) return null;
    return (
      this.data.transitions.find((t) => t.tileX === tx && t.tileY === ty) ??
      null
    );
  }

  

  render(ctx: CanvasRenderingContext2D): void {
    if (this.imageReady && this.mapImage) {
    
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(this.mapImage, 0, 0, this.pixelW, this.pixelH);
    } else {
   
      this.renderFallback(ctx);
    }

  
    if (this.debugMode) {
      this.renderDebugGrid(ctx);
    }
  }

  private renderFallback(ctx: CanvasRenderingContext2D): void {
    const { width, height, tiles, colors } = this.data;
    const S = this.tileSize;

    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, this.pixelW, this.pixelH);

    for (let ty = 0; ty < height; ty++) {
      for (let tx = 0; tx < width; tx++) {
        const tile = tiles[ty * width + tx];
        const px   = tx * S;
        const py   = ty * S;

        if (tile === TileType.Floor) {
          ctx.fillStyle = colors.floor;
          ctx.fillRect(px, py, S, S);
          ctx.strokeStyle = "rgba(255,255,255,0.04)";
          ctx.lineWidth = 0.5;
          ctx.strokeRect(px + 0.5, py + 0.5, S - 1, S - 1);

        } else if (tile === TileType.Transition) {
          ctx.fillStyle = colors.transition;
          ctx.fillRect(px, py, S, S);
          const cx = px + S / 2, cy = py + S / 2;
          ctx.fillStyle = "rgba(255,255,200,0.4)";
          ctx.beginPath();
          ctx.moveTo(cx, cy + S * 0.3);
          ctx.lineTo(cx - S * 0.2, cy);
          ctx.lineTo(cx + S * 0.2, cy);
          ctx.closePath();
          ctx.fill();
        }
      }
    }
  }

  private renderDebugGrid(ctx: CanvasRenderingContext2D): void {
    const { width, height, tiles } = this.data;
    const S = this.tileSize;

    for (let ty = 0; ty < height; ty++) {
      for (let tx = 0; tx < width; tx++) {
        const tile = tiles[ty * width + tx];
        const px   = tx * S;
        const py   = ty * S;

        if (tile === TileType.Wall) {
          ctx.fillStyle = "rgba(255, 0, 0, 0.25)";
          ctx.fillRect(px, py, S, S);
        } else if (tile === TileType.Transition) {
          ctx.fillStyle = "rgba(0, 255, 200, 0.35)";
          ctx.fillRect(px, py, S, S);
        }
        ctx.strokeStyle = "rgba(255,255,255,0.12)";
        ctx.lineWidth   = 0.5;
        ctx.strokeRect(px, py, S, S);

       
        if (tx % 5 === 0 && ty % 5 === 0) {
          ctx.fillStyle = "rgba(255,255,255,0.6)";
          ctx.font      = "9px monospace";
          ctx.fillText(`${tx},${ty}`, px + 2, py + 10);
        }
      }
    }

    
    ctx.fillStyle = "rgba(0,0,0,0.65)";
    ctx.fillRect(4, 4, 180, 52);
    ctx.font = "11px monospace";
    ctx.fillStyle = "rgba(255,0,0,0.8)";
    ctx.fillText("█ Wall  (bloquant)", 10, 18);
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.fillText("□ Floor (passable)", 10, 32);
    ctx.fillStyle = "rgba(0,255,200,0.8)";
    ctx.fillText("█ Transition", 10, 46);
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.font = "10px monospace";
    ctx.fillText("KeyM = toggle debug", 10, 60);
  }
}