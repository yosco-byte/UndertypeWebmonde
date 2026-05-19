// ===== overworld/maps/maps.ts =====
// Définition des deux premières maps. Le joueur commence dans ruins_1
// et peut rejoindre ruins_2 en atteignant la zone de transition.
//
// Légende :
//   W = mur (1)
//   F = sol (0)
//   T = transition (2)

import { MapData, TileType } from "./MapData";

const W = TileType.Wall;
const F = TileType.Floor;
const T = TileType.Transition;

// ──────────────────────────────────────────────────────────
//  MAP 1 : Entrée des Ruines
//  25 × 18 tuiles
// ──────────────────────────────────────────────────────────
export const ruins1: MapData = {
  id: "ruins_1",
  name: "Entrée des Ruines",
  width: 25,
  height: 18,
  // prettier-ignore
  tiles: [
    W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,
    W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,
    W,W,F,F,F,F,F,F,F,F,F,F,F,W,W,W,W,W,W,W,W,W,W,W,W,
    W,W,F,W,W,W,W,W,W,W,W,W,F,W,W,W,W,W,W,W,W,W,W,W,W,
    W,W,F,W,W,W,W,W,W,W,W,W,F,W,W,W,W,W,W,W,W,W,W,W,W,
    W,W,F,W,W,W,W,W,W,W,W,W,F,F,F,F,F,F,W,W,W,W,W,W,W,
    W,W,F,W,W,W,W,W,W,W,W,W,W,W,W,W,W,F,W,W,W,W,W,W,W,
    W,W,F,F,F,F,F,F,W,W,W,W,W,W,W,W,W,F,W,W,W,W,W,W,W,
    W,W,W,W,W,W,W,F,W,W,W,W,W,W,W,W,W,F,W,W,W,W,W,W,W,
    W,W,W,W,W,W,W,F,F,F,F,F,F,F,F,F,F,F,W,W,W,W,W,W,W,
    W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,F,W,W,W,W,W,W,W,
    W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,F,W,W,W,W,W,W,W,
    W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,F,F,F,F,F,W,W,W,
    W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,F,W,W,W,
    W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,F,W,W,W,
    W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,F,W,W,W,
    W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,T,T,T,W,W,W,
    W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,
  ],
  transitions: [
    { tileX: 19, tileY: 16, targetMapId: "ruins_2", spawnX: 3 * 32 + 16, spawnY: 2 * 32 + 16 },
    { tileX: 20, tileY: 16, targetMapId: "ruins_2", spawnX: 3 * 32 + 16, spawnY: 2 * 32 + 16 },
    { tileX: 21, tileY: 16, targetMapId: "ruins_2", spawnX: 3 * 32 + 16, spawnY: 2 * 32 + 16 },
  ],
  colors: {
    bg: "#100812",
    floor: "#2a1c35",
    wall: "#100812",
    transition: "#44224a",
  },
  tilesetUrl: "/assets/tilesets/ruins.png",
};

// ──────────────────────────────────────────────────────────
//  MAP 2 : Couloir des Ruines
//  20 × 16 tuiles — salle plus ouverte
// ──────────────────────────────────────────────────────────
export const ruins2: MapData = {
  id: "ruins_2",
  name: "Couloir des Ruines",
  width: 20,
  height: 16,
  // prettier-ignore
  tiles: [
    W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,
    W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,
    W,W,T,F,F,F,F,F,F,F,F,F,F,F,F,F,W,W,W,W,
    W,W,F,F,F,F,F,F,F,F,F,F,F,F,F,F,W,W,W,W,
    W,W,F,W,W,W,W,W,W,W,W,W,W,W,F,F,W,W,W,W,
    W,W,F,W,W,W,W,W,W,W,W,W,W,W,F,F,W,W,W,W,
    W,W,F,W,W,W,W,W,W,W,W,W,W,W,F,F,W,W,W,W,
    W,W,F,W,W,W,W,W,W,W,W,W,W,W,F,F,W,W,W,W,
    W,W,F,W,W,W,W,W,W,W,W,W,W,W,F,F,W,W,W,W,
    W,W,F,W,W,W,W,W,W,W,W,W,W,W,F,F,W,W,W,W,
    W,W,F,F,F,F,F,F,F,F,F,F,F,F,F,F,W,W,W,W,
    W,W,F,F,F,F,F,F,F,F,F,F,F,F,F,F,W,W,W,W,
    W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,
    W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,
    W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,
    W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,
  ],
  transitions: [
    // Retour vers ruins_1
    { tileX: 2, tileY: 2, targetMapId: "ruins_1", spawnX: 21 * 32 + 16, spawnY: 15 * 32 + 16 },
  ],
  colors: {
    bg: "#0d0b14",
    floor: "#221933",
    wall: "#0d0b14",
    transition: "#3a1f55",
  },
  tilesetUrl: "/assets/tilesets/ruins.png",
};

/** Registre global des maps : id → MapData */
export const MAP_REGISTRY: Record<string, MapData> = {
  ruins_1: ruins1,
  ruins_2: ruins2,
};
