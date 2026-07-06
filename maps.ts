import { MapData, TileType } from "./MapData";

const W = TileType.Wall;
const F = TileType.Floor;
const T = TileType.Transition;

export const ruins1: MapData = {
  id: "ruins_1",
  name: "Entrée des Ruines",

  tileSize: 32,
  width:    20,
  height:   6,

  mapImageUrl: "assets/maps/ruins_1.png",

  spawnX: 4 * 32 + 16,
  spawnY: 2 * 32 + 16,

  colors: {
    bg:         "#100812",
    floor:      "#2a1c35",
    wall:       "#100812",
    transition: "#44224a",
  },

 
  tiles: [
    W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,
    W,F,F,F,F,F,F,F,F,W,W,W,W,W,W,W,W,W,W,W,
    W,F,F,F,F,F,F,F,F,W,W,W,W,W,W,W,W,W,T,W,
    W,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,W,
    W,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,W,
    W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,
  ],

  transitions: [
    {
      tileX: 18, tileY: 2,
      targetMapId: "ruins_2",
      spawnX: 9 * 16 + 8,
      spawnY: 13 * 16 + 8,  
    },
  ],
};

export const ruins2: MapData = {
  id: "ruins_2",
  name: "Couloir des Ruines",

  tileSize: 16,
  width:    19,
  height:   16,

  mapImageUrl: "assets/maps/ruins_2.png",

  spawnX: 9 * 16 + 8,
  spawnY: 13 * 16 + 8,  

  colors: {
    bg:         "#0d0014",
    floor:      "#1a0a2e",
    wall:       "#0d0014",
    transition: "#3a1f55",
  },


  tiles: [
    W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,
    F,F,F,F,F,F,F,W,F,F,F,W,F,F,F,F,F,F,F,
    F,F,F,F,F,F,F,W,F,F,F,W,F,F,F,F,F,F,F,
    F,F,F,F,F,F,W,W,F,F,F,W,F,F,F,F,F,F,F,
    F,F,F,F,F,F,W,W,T,T,T,W,F,F,F,F,F,F,F,
    F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,
    F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,
    F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,
    F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,
    F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,
    F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,
    F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,
    F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,
    F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,
    F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,
    W,W,W,W,W,W,W,T,T,T,T,T,W,W,W,W,W,W,W,  
  ],

  transitions: [
    { tileX: 7,  tileY: 15, targetMapId: "ruins_1", spawnX: 17 * 32 + 16, spawnY: 3 * 32 + 16 },
    { tileX: 8,  tileY: 15, targetMapId: "ruins_1", spawnX: 17 * 32 + 16, spawnY: 3 * 32 + 16 },
    { tileX: 9,  tileY: 15, targetMapId: "ruins_1", spawnX: 17 * 32 + 16, spawnY: 3 * 32 + 16 },
    { tileX: 10, tileY: 15, targetMapId: "ruins_1", spawnX: 17 * 32 + 16, spawnY: 3 * 32 + 16 },
    { tileX: 11, tileY: 15, targetMapId: "ruins_1", spawnX: 17 * 32 + 16, spawnY: 3 * 32 + 16 },
  ],
};

export const MAP_REGISTRY: Record<string, MapData> = {
  ruins_1: ruins1,
  ruins_2: ruins2,
};