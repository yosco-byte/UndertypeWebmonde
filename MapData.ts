export const enum TileType {
  Floor      = 0,
  Wall       = 1,
  Transition = 2,
}

export interface Transition {
  tileX: number;
  tileY: number;
  targetMapId: string;
  spawnX: number;
  spawnY: number;
}

export interface MapData {
  id: string;
  name: string;

  tileSize: number;
  width: number;
  height: number;
  tiles: TileType[];
  transitions: Transition[];
  colors: {
    bg: string;
    floor: string;
    wall: string;
    transition: string;
  }
  spawnX?: number;
  spawnY?: number;
  mapImageUrl?: string;
  tilesetUrl?: string;
  musicUrl?: string;
}
