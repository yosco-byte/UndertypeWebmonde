import { DialogueLine } from "./DialogueBox";
import { gameState } from "./GameState";

export interface PNJData {
  id:           string;
  mapId:        string;
  
  triggerTileY: number;

  spawnTileX:   number;
  spawnTileY:   number;
  tileSize:     number;
  spriteUrl:    string;
  frameW:       number;
  frameH:       number;
  scale:        number;
  dialogue:     DialogueLine[];

  condition?:   () => boolean;

  walk?: {
    
    frameW: number;
    
    frameH: number;
    
    frameCount: number;
    
    fps: number;
   
    speed: number;
 
    stopDistance: number;
    
    startDelay?: number;
  };

  exit?: { tileX: number; tileY: number };
}

export const PNJ_REGISTRY: PNJData[] = [

  {
    id:           "grinch",
    mapId:        "ruins_2",
    triggerTileY: 12,
    spawnTileX:   9,
    spawnTileY:   9,
    tileSize:     16,
    spriteUrl:    "assets/sprites/grinch.png",
    frameW:       30,
    frameH:       58,
    scale:        2,
    
    condition: () => !gameState.grinchDefeated,
    dialogue: [
      { speaker: "Grinch", text: "Yo je suis le Grinch ! Une gentille créature de Noël !" },
     { speaker: "Grinch", text: "Tu es nouveau dans le webground, ça se voit." },
     { speaker: "Grinch", text: "Quelqu'un doit t'apprendre comment ça marche !" },
     { speaker: "Grinch", text: "Je me dévoue." },
    ],
  },

  {
    id:           "monika",
    mapId:        "ruins_2",
    triggerTileY: -1,
    spawnTileX:   9,
    spawnTileY:   7,  
    tileSize:     16,
    spriteUrl:    "assets/sprites/Monika.png",
    frameW:       18,  
    frameH:       32,
    scale:        2,
    condition: () => gameState.grinchDefeated,
    walk: {
      frameW: 18,       
      frameH: 32,
      frameCount: 4,    
      fps: 6,
      speed: 30,        
      stopDistance: 15, 
      startDelay: 1,   
    },
    dialogue: [
      { speaker: "Monika", text: "Quel monstre ! S'attaquer à un innocent !" },
      { speaker: "Monika", text: "Hm ? N'ai pas peur de moi. Je suis Monika. Je veille sur les ruines." },
      { speaker: "Monika", text: "Vient, je vais te guider." },
    ],
   
    exit: { tileX: 9, tileY: 4 },
  },

];