# HTMLtale 🎮

Jeu éducatif HTML/CSS/Markdown — parodie d'Undertale.

## Installation & lancement

```bash
npm install
npm run dev        # lance le serveur de dev (http://localhost:5173)
npm run build      # compile dans /docs (prêt pour GitHub Pages)
```

## Déploiement sur GitHub Pages

1. Lance `npm run build` → un dossier `docs/` est généré
2. Push le tout sur GitHub
3. Dans Settings → Pages → Source : **Deploy from branch**, branche `main`, dossier `/docs`
4. Ton jeu sera accessible sur `https://<ton-pseudo>.github.io/<nom-du-repo>/`

> **Si ton repo est dans un sous-dossier** (ex: `https://user.github.io/htmltale/`),
> modifie `vite.config.ts` → `base: '/htmltale/'`

## Ajouter les sprites Undertale

Dépose tes fichiers dans `public/assets/` :

```
public/
  assets/
    sprites/
      frisk.png       ← spritesheet du joueur (3 frames × 4 directions)
    tilesets/
      ruins.png       ← tileset des Ruines (tuiles 32×32)
```

### Format du spritesheet `frisk.png`

| Ligne | Direction |
|-------|-----------|
| 0     | bas       |
| 1     | gauche    |
| 2     | droite    |
| 3     | haut      |

Chaque ligne : **3 frames** de `19 × 29 px`.
(Si ton sprite a des dimensions différentes, change `FRAME_W` / `FRAME_H` / `FRAME_COUNT` dans `src/overworld/Player.ts`.)

**Sans sprites** : un bonhomme placeholder coloré s'affiche automatiquement.

## Structure du projet

```
src/
  engine/
    Game.ts           ← boucle principale (RAF + delta time)
    Input.ts          ← clavier (isDown / wasPressed / flush)
    Camera.ts         ← suit le joueur, clamp sur la map
    AssetLoader.ts    ← chargement images avec fallback
  overworld/
    Player.ts         ← déplacement, animation, collision
    TileMap.ts        ← rendu + queries (isBlocked, transitionAt)
    maps/
      MapData.ts      ← types (MapData, Transition, TileType)
      maps.ts         ← définition des maps (ruins_1, ruins_2…)
  scenes/
    SceneManager.ts   ← registration + goto() + update/render
    OverworldScene.ts ← scène overworld (map + joueur + fondu)
  main.ts             ← point d'entrée
  style.css
index.html
```

## Ajouter une nouvelle map

Dans `src/overworld/maps/maps.ts` :

```ts
export const nouvelleMap: MapData = {
  id: "ma_map",
  name: "Ma Salle",
  width: 20,
  height: 15,
  tiles: [ /* 0=sol, 1=mur, 2=transition */ ],
  transitions: [
    { tileX: 10, tileY: 14, targetMapId: "ruins_1", spawnX: 200, spawnY: 100 }
  ],
  colors: { bg: "#...", floor: "#...", wall: "#...", transition: "#..." },
};

// Puis enregistre-la :
export const MAP_REGISTRY = {
  ruins_1, ruins_2, ma_map: nouvelleMap,
};
```

## Raccourcis clavier

| Touche         | Action    |
|----------------|-----------|
| ← ↑ ↓ →       | Déplacement |
| Z / Q / S / D  | Déplacement (AZERTY) |
| W / A / S / D  | Déplacement (QWERTY) |
