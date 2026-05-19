// ===== overworld/maps/MapData.ts =====

/** Types de tuiles */
export const enum TileType {
  Floor = 0,      // sol — passable
  Wall = 1,       // mur — bloquant
  Transition = 2, // zone de passage vers une autre map
}

/** Zone de transition : rectangle en coordonnées tuiles */
export interface Transition {
  /** Colonne de la tuile déclencheur */
  tileX: number;
  tileY: number;
  /** ID de la map cible */
  targetMapId: string;
  /** Position de spawn du joueur dans la map cible (en pixels) */
  spawnX: number;
  spawnY: number;
}

/** Données complètes d'une map */
export interface MapData {
  id: string;
  name: string;
  /** Largeur en tuiles */
  width: number;
  /** Hauteur en tuiles */
  height: number;
  /** Tableau plat row-major : tiles[y * width + x] */
  tiles: TileType[];
  transitions: Transition[];
  /** Couleurs fallback (si pas de tileset chargé) */
  colors: {
    bg: string;
    floor: string;
    wall: string;
    transition: string;
  };
  /** Chemin vers l'image tileset (optionnel) */
  tilesetUrl?: string;
  /** Chemin vers la musique de fond (optionnel) */
  musicUrl?: string;
}
