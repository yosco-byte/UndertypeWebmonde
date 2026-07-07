import { Scene, sceneManager } from "./SceneManager";
import { Input } from "./Input";
import { assets } from "./AssetLoader";
import { DialogueLine } from "./DialogueBox";
import { gameState } from "./GameState";


const PLAYER_NAME   = "Psin";
const PLAYER_LV      = 2;
const PLAYER_MAX_HP  = 25;

const PLAYER_DMG_NORMAL  = 2;
const PLAYER_DMG_PERFECT = 4;

const OMORI_MAX_HP = 15;

const OMORI_SPRITE_URL = "assets/sprites/Omori.png";
const OMORI_DISPLAY_W  = 90;
const OMORI_DISPLAY_H  = 120;

const HEART_SPRITE_URL = "assets/sprites/heart.png";

const BOSS_MUSIC_URL    = "assets/music/Boss3.mp3";
const BOSS_MUSIC_VOLUME = 0.6;

const KNIFE_DMG   = 3;
const SCORE_GOOD  = 500;
const SCORE_BAD   = -1000;
const TAG_DMG_BAD = 3;

const MAX_ATTACKS = 15;

const ALL_TAGS_GOOD = ["<p>", "<div>", "</p>", "<span>", "</div>"];
const ALL_TAGS_BAD  = ["<div", "<p>>", "<<span>", "</br/>", "<html>>"];


const DIALOGUE_INTRO: DialogueLine[] = [
  { speaker: "Omori", text: "* ...Tu es encore là." },
  { speaker: "Omori", text: "* Très bien. Voyons ce que tu vaux vraiment." },
];

const DIALOGUE_VICTORY: DialogueLine[] = [
  { speaker: "Omori", text: "* ...Je vois." },
  { speaker: "Omori", text: "* [Texte Dialogue Victoire Omori]" },
];

const DIALOGUE_DISMISS_ACT: DialogueLine[] = [
  { speaker: "Système", text: "* Ça ne servirait à rien contre lui." },
];
const DIALOGUE_DISMISS_ITEM: DialogueLine[] = [
  { speaker: "Système", text: "* Tu n'as rien qui puisse t'aider ici." },
];
const DIALOGUE_DISMISS_MERCY: DialogueLine[] = [
  { speaker: "Omori", text: "* ...Il n'y a pas de pitié à espérer ici." },
];

const DIALOGUE_GAMEOVER: DialogueLine[] = [
  { speaker: "Système", text: "* ...Tu as été vaincu." },
];


type Phase =
  | "fadeIn"
  | "dialogueIntro"
  | "playerTurn"
  | "fightRhythm"
  | "dismiss"
  | "attack"
  | "victory"
  | "gameOver"
  | "fadeOutBlack"
  | "fadeOutWhite";

/** Un projectile générique : couteau (dégâts fixes) ou balise (score comme Monika). */
interface Projectile {
  isKnife: boolean;
  bad: boolean;
  text: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  scale: number;
  /** décalage fixe par rapport à une "ancre de formation" (utilisé par les
   *  attaques en formation, ex: la silhouette du crâne) */
  anchorOffsetX?: number;
  anchorOffsetY?: number;
  /** délai (s) avant que le couteau ne "démarre" — utilisé par l'attaque transition */
  delay?: number;
  done: boolean;
}


class BattleDialogue {
  private lines: DialogueLine[] = [];
  private lineIndex = 0;
  private charIndex = 0;
  private charTimer = 0;
  private readonly CHAR_SPEED = 0.035;
  active = false;
  onComplete?: () => void;

  start(lines: DialogueLine[], onComplete?: () => void): void {
    if (lines.length === 0) { onComplete?.(); return; }
    this.lines = lines;
    this.lineIndex = 0;
    this.charIndex = 0;
    this.charTimer = 0;
    this.active = true;
    this.onComplete = onComplete;
  }

  update(dt: number): void {
    if (!this.active) return;
    const line = this.lines[this.lineIndex];
    if (!line) return;
    if (this.charIndex < line.text.length) {
      this.charTimer += dt;
      while (this.charTimer >= this.CHAR_SPEED && this.charIndex < line.text.length) {
        this.charTimer -= this.CHAR_SPEED;
        this.charIndex++;
      }
    }
  }

  advance(): void {
    if (!this.active) return;
    const line = this.lines[this.lineIndex];
    if (!line) return;
    if (this.charIndex < line.text.length) {
      this.charIndex = line.text.length;
    } else {
      this.lineIndex++;
      this.charIndex = 0;
      this.charTimer = 0;
      if (this.lineIndex >= this.lines.length) {
        this.active = false;
        this.onComplete?.();
      }
    }
  }

  render(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
    if (!this.active) return;
    const line = this.lines[this.lineIndex];
    if (!line) return;

    ctx.fillStyle = "#000";
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, w, h);

    const displayed = line.text.slice(0, this.charIndex);
    ctx.font = "16px 'Courier New', monospace";
    ctx.fillStyle = "#fff";

    const PADDING = 16;
    const MAX_W = w - PADDING * 2;
    const LINE_HEIGHT = 22;
    const words = displayed.split(" ");
    let currentLine = "";
    let lineY = y + PADDING + 12;
    for (const word of words) {
      const test = currentLine ? currentLine + " " + word : word;
      if (ctx.measureText(test).width > MAX_W && currentLine) {
        ctx.fillText(currentLine, x + PADDING, lineY);
        currentLine = word;
        lineY += LINE_HEIGHT;
      } else {
        currentLine = test;
      }
    }
    if (currentLine) ctx.fillText(currentLine, x + PADDING, lineY);

    if (this.charIndex >= line.text.length) {
      const blink = Math.floor(Date.now() / 400) % 2 === 0;
      if (blink) {
        ctx.font = "14px 'Courier New', monospace";
        ctx.fillText("▼", x + w - 24, y + h - 10);
      }
    }
  }
}

const SKULL_SHAPE_POINTS: [number, number][] = [
  [-30, -30], [-15, -40], [0, -42], [15, -40], [30, -30],
  [-36, -10], [36, -10],
  [-30, 10], [30, 10],
  [-20, 26], [-8, 32], [8, 32], [20, 26],
  [-16, -6], [-8, -6],
  [8, -6], [16, -6],
  [-12, 20], [-4, 24], [4, 24], [12, 20],
];

export class BossOmori implements Scene {
  private hp = PLAYER_MAX_HP;
  private omoriHp = OMORI_MAX_HP;
  private score = 0;
  private attacksUsed = 0;

  private baseBoxW = 180;
  private baseBoxH = 140;
  private boxScale = 1;
  private get boxW(): number { return this.baseBoxW * this.boxScale; }
  private get boxH(): number { return this.baseBoxH * this.boxScale; }
  private boxX = 0;
  private boxY = 0;

  // Dimensions de la box "normale" (scale = 1), utilisées pour faire venir
  // les couteaux de loin même quand la box est rétrécie (attaque CSS shrink),
  // afin de laisser au joueur le temps de les voir arriver.
  private get fullBoxW(): number { return this.baseBoxW; }
  private get fullBoxH(): number { return this.baseBoxH; }
  private get fullBoxX(): number { return (this.viewportW - this.fullBoxW) / 2; }
  private get fullBoxY(): number { return this.boxY; }

  private heartX = 0;
  private heartY = 0;
  private readonly HEART_SIZE = 16;
  private heartSprite: HTMLImageElement | null = null;
  private heartColor: "red" | "green" = "red";
  /** true pendant l'attaque "color" : le cœur est cloué à la ligne basse, ne peut que sauter */
  private heartGrounded = false;
  private heartVy = 0;
  private readonly GRAVITY = 700;
  private readonly JUMP_VELOCITY = -260;

  private controlsInvertX = false;
  private controlsInvertY = false;

  private omoriSprite: HTMLImageElement | null = null;
  private omoriX = 0;
  private omoriY = 0;

  private bossMusic: HTMLAudioElement | null = null;

  private projectiles: Projectile[] = [];
  private speedMultiplier = 1;
  private flickerActive = false;

  private cssCommandText: string | null = null;

  /** Attaque couteaux : schéma FIXE, toujours le même, sur un cycle de 4.5s répété. */
  private readonly KNIFE_WAVE_CYCLE = 4.5;
  private knifeWaveCycleCount = -1;
  private knifeWaveCycleIndex = -1;
  /** 3 couteaux depuis la droite, puis 2 depuis la gauche, puis 5 en diagonale — toujours dans cet ordre. */
  private readonly KNIFE_WAVE_SCHEDULE: { t: number; spawn: () => void }[] = [
    { t: 0.0, spawn: () => this.spawnKnifeGroupRight(3) },
    { t: 1.4, spawn: () => this.spawnKnifeGroupLeft(2) },
    { t: 2.6, spawn: () => this.spawnKnifeGroupDiagonal(5) },
  ];

  /** Attaque "scale" — le cœur (et sa hitbox) est agrandi. */
  private heartScale = 1;
  private scaleRainTimer = 0;

  /** Attaque "grid" — couteaux qui tombent selon un schéma de colonnes fixe. */
  private readonly GRID_LANES = 4;
  private readonly GRID_PATTERN = [0, 2, 1, 3, 0, 3, 1, 2];
  private gridWaveTimer = 0;
  private gridWaveIndex = 0;

  /** Attaque "transition" — couteaux immobiles qui foncent d'un coup après un délai. */
  private transitionRainTimer = 0;

  /** Attaque "ring" — anneau de couteaux en rotation qui se resserre. */
  private ringAngle = 0;
  private ringRadius = 0;

  /** Attaque "clock" — couteaux envoyés depuis les 4 côtés dans un ordre fixe. */
  private readonly CLOCK_SIDES: ("top" | "right" | "bottom" | "left")[] = ["top", "right", "bottom", "left"];
  private clockWaveTimer = 0;
  private clockWaveIndex = 0;

  private phase: Phase = "fadeIn";
  private phaseTimer = 0;
  private attackDuration = 0;

  private menuSelected = 0;

  private rhythmBarPos = 0;
  private rhythmBarDir = 1;
  private readonly RHYTHM_SPEED = 1.1;
  private readonly RHYTHM_ZONE_W = 0.03;
  private rhythmHit = false;
  private rhythmPerfect = false;
  private rhythmResultTimer = 0;

  private fadeAlpha = 1;
  private fadeColor: "black" | "white" = "black";
  private fadeSpeed = 2;
  private fadeTarget = 0;
  private fadeDoneCallback?: () => void;

  private shakeTime = 0;
  private shakeIntensity = 0;

  private dialogue = new BattleDialogue();

  constructor(
    private readonly input: Input,
    private readonly viewportW: number,
    private readonly viewportH: number
  ) {}


  onEnter(): void {
    this.hp = PLAYER_MAX_HP;
    this.omoriHp = OMORI_MAX_HP;
    this.score = 0;
    this.attacksUsed = 0;
    this.boxScale = 1;
    this.heartColor = "red";
    this.heartGrounded = false;
    this.controlsInvertX = false;
    this.controlsInvertY = false;
    this.speedMultiplier = 1;
    this.flickerActive = false;
    this.cssCommandText = null;
    this.projectiles = [];

    this.recomputeBoxLayout();
    this.heartX = this.boxX + this.boxW / 2;
    this.heartY = this.boxY + this.boxH / 2;

    this.omoriX = this.viewportW / 2;
    this.omoriY = this.boxY - 100;

    this.phase = "fadeIn";
    this.fadeAlpha = 1;
    this.fadeColor = "black";

    assets.load(OMORI_SPRITE_URL).then((img) => { this.omoriSprite = img; });
    assets.load(HEART_SPRITE_URL).then((img) => { this.heartSprite = img; });

    this.bossMusic = new Audio(BOSS_MUSIC_URL);
    this.bossMusic.loop = true;
    this.bossMusic.volume = BOSS_MUSIC_VOLUME;
    this.bossMusic.play().catch(() => {});

    this.startFade("black", 1, 0, () => {
      this.dialogue.start(DIALOGUE_INTRO, () => this.startPlayerTurn());
      this.phase = "dialogueIntro";
    });
  }

  onExit(): void {
    if (this.bossMusic) {
      this.bossMusic.pause();
      this.bossMusic.currentTime = 0;
      this.bossMusic = null;
    }
  }

  private recomputeBoxLayout(): void {
    this.boxX = (this.viewportW - this.boxW) / 2;
    this.boxY = this.viewportH * 0.32;
  }

  private stopMusic(): void {
    if (this.bossMusic) {
      this.bossMusic.pause();
      this.bossMusic.currentTime = 0;
      this.bossMusic = null;
    }
  }


  private startFade(color: "black" | "white", from: number, to: number, onComplete?: () => void): void {
    this.fadeColor = color;
    this.fadeAlpha = from;
    this.fadeSpeed = 2;
    this.fadeTarget = to;
    this.fadeDoneCallback = onComplete;
  }

  private updateFade(dt: number): void {
    if (this.fadeAlpha === this.fadeTarget) return;
    const dir = this.fadeTarget > this.fadeAlpha ? 1 : -1;
    this.fadeAlpha += dir * this.fadeSpeed * dt;
    if ((dir > 0 && this.fadeAlpha >= this.fadeTarget) || (dir < 0 && this.fadeAlpha <= this.fadeTarget)) {
      this.fadeAlpha = this.fadeTarget;
      const cb = this.fadeDoneCallback;
      this.fadeDoneCallback = undefined;
      cb?.();
    }
  }

  private triggerShake(duration: number, intensity: number): void {
    this.shakeTime = duration;
    this.shakeIntensity = intensity;
  }


  private startPlayerTurn(): void {
    this.phase = "playerTurn";
    this.menuSelected = 0;
  }

  private confirmMenuSelection(): void {
    if (this.menuSelected === 0) {
      this.startFightRhythm();
    } else if (this.menuSelected === 1) {
      this.dialogue.start(DIALOGUE_DISMISS_ACT, () => this.startPlayerTurn());
      this.phase = "dismiss";
    } else if (this.menuSelected === 2) {
      this.dialogue.start(DIALOGUE_DISMISS_ITEM, () => this.startPlayerTurn());
      this.phase = "dismiss";
    } else {
      this.dialogue.start(DIALOGUE_DISMISS_MERCY, () => this.startPlayerTurn());
      this.phase = "dismiss";
    }
  }

  private getRhythmZoneBounds(): [number, number] {
    const start = 0.5 - this.RHYTHM_ZONE_W / 2;
    return [start, start + this.RHYTHM_ZONE_W];
  }

  private startFightRhythm(): void {
    this.phase = "fightRhythm";
    this.rhythmBarPos = 0;
    this.rhythmBarDir = 1;
    this.rhythmHit = false;
    this.rhythmPerfect = false;
    this.rhythmResultTimer = 0;
  }

  private updateFightRhythm(dt: number): void {
    if (this.rhythmHit) {
      this.rhythmResultTimer -= dt;
      if (this.rhythmResultTimer <= 0) {
        const dmg = this.rhythmPerfect ? PLAYER_DMG_PERFECT : PLAYER_DMG_NORMAL;
        this.omoriHp = Math.max(0, this.omoriHp - dmg);
        this.triggerShake(0.2, this.rhythmPerfect ? 9 : 4);
        if (this.omoriHp <= 0) {
          this.startVictory();
        } else {
          this.startNextAttack();
        }
      }
      return;
    }

    this.rhythmBarPos += this.rhythmBarDir * this.RHYTHM_SPEED * dt;
    if (this.rhythmBarPos >= 1) { this.rhythmBarPos = 1; this.rhythmBarDir = -1; }
    if (this.rhythmBarPos <= 0) { this.rhythmBarPos = 0; this.rhythmBarDir = 1; }

    if (this.input.wasPressed("KeyZ") || this.input.wasPressed("Enter")) {
      this.rhythmHit = true;
      const [zoneStart, zoneEnd] = this.getRhythmZoneBounds();
      this.rhythmPerfect = this.rhythmBarPos >= zoneStart && this.rhythmBarPos <= zoneEnd;
      this.rhythmResultTimer = 0.8;
    }
  }


  private startVictory(): void {
    this.phase = "victory";
    this.projectiles = [];
    this.dialogue.start(DIALOGUE_VICTORY, () => this.endBattle(true));
  }

  private triggerGameOver(): void {
    this.phase = "gameOver";
    this.projectiles = [];
    this.dialogue.start(DIALOGUE_GAMEOVER, () => this.endBattle(false));
  }

  private endBattle(victory: boolean): void {
    this.stopMusic();
    this.startFade(victory ? "white" : "black", 0, 1, () => {
      sceneManager.goto("overworld");
    });
  }


  private startNextAttack(): void {
    if (this.attacksUsed >= MAX_ATTACKS) {
      this.startPlayerTurn();
      return;
    }
    const index = this.attacksUsed;
    this.attacksUsed++;
    this.phase = "attack";
    this.phaseTimer = 0;
    this.projectiles = [];
    this.cssCommandText = null;

    const attacks = [
      () => this.attackKnifeWave(),
      () => this.attackTagsRain(),
      () => this.attackCssColor(),
      () => this.attackCssShrink(),
      () => this.attackCssFlexDirection(),
      () => this.attackKnifeCross(),
      () => this.attackCssOpacity(),
      () => this.attackCssRotate(),
      () => this.attackTagsSpiral(),
      () => this.attackFinalCombo(),
      () => this.attackCssScale(),
      () => this.attackCssGrid(),
      () => this.attackCssTransition(),
      () => this.attackKnifeRing(),
      () => this.attackCssAnimationDelay(),
    ];
    attacks[index % attacks.length]();
  }

  private endAttack(): void {
    this.projectiles = [];
    this.cssCommandText = null;
    this.heartGrounded = false;
    this.controlsInvertX = false;
    this.controlsInvertY = false;
    this.boxScale = 1;
    this.speedMultiplier = 1;
    this.flickerActive = false;
    this.heartColor = "red";
    this.heartScale = 1;
    this.recomputeBoxLayout();
    this.heartX = Math.max(this.boxX + this.HEART_SIZE / 2, Math.min(this.boxX + this.boxW - this.HEART_SIZE / 2, this.heartX));
    this.heartY = Math.max(this.boxY + this.HEART_SIZE / 2, Math.min(this.boxY + this.boxH - this.HEART_SIZE / 2, this.heartY));
    this.startPlayerTurn();
  }


  private spawnKnife(x: number, y: number, vx: number, vy: number, scale = 1): void {
    this.projectiles.push({ isKnife: true, bad: false, text: "†", x, y, vx, vy, scale, done: false });
  }

  private spawnTag(x: number, y: number, vx: number, vy: number, bad: boolean): void {
    const pool = bad ? ALL_TAGS_BAD : ALL_TAGS_GOOD;
    const text = pool[Math.floor(Math.random() * pool.length)];
    this.projectiles.push({ isKnife: false, bad, text, x, y, vx, vy, scale: 1, done: false });
  }


  /** Envoie `count` couteaux depuis la droite de la boîte, qui filent vers la gauche. */
  private spawnKnifeGroupRight(count: number): void {
    for (let i = 0; i < count; i++) {
      const y = this.boxY + ((i + 1) / (count + 1)) * this.boxH;
      this.spawnKnife(this.boxX + this.boxW + 20, y, -125, 0);
    }
  }

  /** Envoie `count` couteaux depuis la gauche de la boîte, qui filent vers la droite. */
  private spawnKnifeGroupLeft(count: number): void {
    for (let i = 0; i < count; i++) {
      const y = this.boxY + ((i + 1) / (count + 1)) * this.boxH;
      this.spawnKnife(this.boxX - 20, y, 125, 0);
    }
  }

  /** Envoie `count` couteaux alignés en diagonale (coin haut-gauche vers bas-droit). */
  private spawnKnifeGroupDiagonal(count: number): void {
    for (let i = 0; i < count; i++) {
      const offset = (i - (count - 1) / 2) * 22;
      this.spawnKnife(this.boxX - 20 + offset, this.boxY - 20 - offset, 95, 95);
    }
  }

  /**
   * Phase de couteaux : dure exactement 20 secondes.
   * Le schéma est TOUJOURS le même, répété en boucle sur des cycles de 4.5s :
   * 3 couteaux à droite → 2 à gauche → 5 en diagonale.
   */
  private attackKnifeWave(): void {
    this.attackDuration = 20;
    this.knifeWaveCycleCount = -1;
    this.knifeWaveCycleIndex = -1;
  }

  private updateKnifeWave(dt: number): void {
    const t = this.phaseTimer;

    if (t < this.attackDuration - 1.5) {
      const cycleT   = t % this.KNIFE_WAVE_CYCLE;
      const cycleNum = Math.floor(t / this.KNIFE_WAVE_CYCLE);
      if (cycleNum !== this.knifeWaveCycleCount) {
        this.knifeWaveCycleCount = cycleNum;
        this.knifeWaveCycleIndex = -1;
      }
      for (let i = this.knifeWaveCycleIndex + 1; i < this.KNIFE_WAVE_SCHEDULE.length; i++) {
        if (cycleT >= this.KNIFE_WAVE_SCHEDULE[i].t) {
          this.KNIFE_WAVE_SCHEDULE[i].spawn();
          this.knifeWaveCycleIndex = i;
        } else break;
      }
    }

    for (const p of this.projectiles) {
      if (p.done) continue;
      p.x += p.vx * dt * this.speedMultiplier;
      p.y += p.vy * dt * this.speedMultiplier;
      this.checkKnifeCollision(p);
      if (
        p.x < this.boxX - 60 || p.x > this.boxX + this.boxW + 60 ||
        p.y < this.boxY - 60 || p.y > this.boxY + this.boxH + 60
      ) p.done = true;
    }
    this.projectiles = this.projectiles.filter(p => !p.done);

    if (t >= this.attackDuration && this.projectiles.length === 0) this.endAttack();
  }


  private tagsRainTimer = 0;

  private attackTagsRain(): void {
    this.attackDuration = 7;
    this.tagsRainTimer = 0;
  }

  private updateTagsRain(dt: number): void {
    this.tagsRainTimer += dt;
    if (this.tagsRainTimer >= 0.5 && this.phaseTimer < this.attackDuration - 1) {
      this.tagsRainTimer = 0;
      const x = this.boxX + Math.random() * this.boxW;
      const bad = Math.random() < 0.45;
      this.spawnTag(x, this.boxY - 20, 0, 45 + Math.random() * 20, bad);
    }
    for (const p of this.projectiles) {
      if (p.done) continue;
      p.y += p.vy * dt * this.speedMultiplier;
      this.checkTagCollision(p);
      if (p.y > this.boxY + this.boxH + 30) p.done = true;
    }
    this.projectiles = this.projectiles.filter(p => !p.done);
    if (this.phaseTimer >= this.attackDuration) this.endAttack();
  }


  private cssRainTimer = 0;

  private attackCssColor(): void {
    this.attackDuration = 15;
    this.cssCommandText = "heart { color: #2ecc71; position: fixed; bottom: 0; }";
    this.heartColor = "green";
    this.heartGrounded = true;
    this.heartVy = 0;
    this.heartY = this.boxY + this.boxH - this.HEART_SIZE / 2;
    this.cssRainTimer = 0;
  }

  private updateCssColor(dt: number): void {
    this.cssRainTimer += dt;
    if (this.cssRainTimer >= 0.45) {
      this.cssRainTimer = 0;
      const fromKnife = Math.random() < 0.5;
      const x = this.boxX + Math.random() * this.boxW;
      if (fromKnife) {
        this.spawnKnife(x, this.boxY - 20, 0, 90);
      } else {
        this.spawnTag(x, this.boxY - 20, 0, 70, Math.random() < 0.4);
      }
    }
    for (const p of this.projectiles) {
      if (p.done) continue;
      p.y += p.vy * dt * this.speedMultiplier;
      if (p.isKnife) this.checkKnifeCollision(p); else this.checkTagCollision(p);
      if (p.y > this.boxY + this.boxH + 30) p.done = true;
    }
    this.projectiles = this.projectiles.filter(p => !p.done);

    if (this.phaseTimer >= this.attackDuration) this.endAttack();
  }


  private shrinkTimer = 0;

  private attackCssShrink(): void {
    this.attackDuration = 20;
    this.cssCommandText = ".bullet-box { width: 50%; height: 50%; }";
    this.boxScale = 0.5;
    this.recomputeBoxLayout();
    this.heartX = this.boxX + this.boxW / 2;
    this.heartY = this.boxY + this.boxH / 2;
    this.shrinkTimer = 0;
  }

  private updateCssShrink(dt: number): void {
    this.shrinkTimer += dt;
    if (this.shrinkTimer >= 0.45 && this.phaseTimer < this.attackDuration - 0.5) {
      this.shrinkTimer = 0;

      // Les couteaux partent des bords de la box "normale" (comme si elle
      // n'était pas rétrécie), pour laisser au joueur le temps de les voir
      // venir même si la box affichée est petite. Seule la cible finale se
      // trouve dans la box réellement rétrécie.
      const fbx = this.fullBoxX, fby = this.fullBoxY, fbw = this.fullBoxW, fbh = this.fullBoxH;

      const side = Math.floor(Math.random() * 4);
      let sx: number, sy: number;
      if (side === 0) { sx = fbx + Math.random() * fbw; sy = fby; }
      else if (side === 1) { sx = fbx + Math.random() * fbw; sy = fby + fbh; }
      else if (side === 2) { sx = fbx; sy = fby + Math.random() * fbh; }
      else { sx = fbx + fbw; sy = fby + Math.random() * fbh; }

      const targetX = this.boxX + 0.2 * this.boxW + Math.random() * this.boxW * 0.6;
      const targetY = this.boxY + 0.2 * this.boxH + Math.random() * this.boxH * 0.6;
      const dx = targetX - sx, dy = targetY - sy;
      const len = Math.hypot(dx, dy) || 1;
      const speed = 80 + Math.random() * 40;
      this.spawnKnife(sx, sy, (dx / len) * speed, (dy / len) * speed);
    }

    for (const p of this.projectiles) {
      if (p.done) continue;
      p.x += p.vx * dt * this.speedMultiplier;
      p.y += p.vy * dt * this.speedMultiplier;
      this.checkKnifeCollision(p);
      if (
        p.x < this.fullBoxX - 20 || p.x > this.fullBoxX + this.fullBoxW + 20 ||
        p.y < this.fullBoxY - 20 || p.y > this.fullBoxY + this.fullBoxH + 20
      ) p.done = true;
    }
    this.projectiles = this.projectiles.filter(p => !p.done);

    if (this.phaseTimer >= this.attackDuration) this.endAttack();
  }


  private formationY = 0;
  private formationSpawned = false;

  private attackCssFlexDirection(): void {
    this.attackDuration = 8;
    this.cssCommandText = ".controls { flex-direction: column-reverse; }";
    this.controlsInvertY = true;
    this.formationY = this.boxY - 60;
    this.formationSpawned = false;
  }

  private updateCssFlexDirection(dt: number): void {
    if (!this.formationSpawned && this.phaseTimer >= 0.6) {
      this.formationSpawned = true;
      const anchorX = this.boxX + this.boxW / 2;
      for (const [ox, oy] of SKULL_SHAPE_POINTS) {
        const bad = Math.random() < 0.5;
        this.spawnTag(anchorX + ox, this.formationY + oy, 0, 0, bad);
        const p = this.projectiles[this.projectiles.length - 1];
        p.anchorOffsetX = ox;
        p.anchorOffsetY = oy;
      }
    }

    if (this.formationSpawned) {
      this.formationY += 35 * dt * this.speedMultiplier;
      const anchorX = this.boxX + this.boxW / 2;
      for (const p of this.projectiles) {
        if (p.done) continue;
        p.x = anchorX + (p.anchorOffsetX ?? 0);
        p.y = this.formationY + (p.anchorOffsetY ?? 0);
        this.checkTagCollision(p);
        if (p.y > this.boxY + this.boxH + 60) p.done = true;
      }
      this.projectiles = this.projectiles.filter(p => !p.done);
    }

    if (this.phaseTimer >= this.attackDuration && (this.projectiles.length === 0 || this.formationY > this.boxY + this.boxH + 60)) {
      this.endAttack();
    }
  }


  private crossTimer = 0;
  private crossWaves = 0;

  private attackKnifeCross(): void {
    this.attackDuration = 6;
    this.crossTimer = 0;
    this.crossWaves = 0;
  }

  private updateKnifeCross(dt: number): void {
    this.crossTimer += dt;
    if (this.crossTimer >= 1.2 && this.crossWaves < 4) {
      this.crossTimer = 0;
      this.crossWaves++;
      const cx = this.boxX + this.boxW / 2;
      const cy = this.boxY + this.boxH / 2;
      const dirs: [number, number][] = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
      for (const [dx, dy] of dirs) {
        this.spawnKnife(cx + dx * 90, cy + dy * 90, -dx * 70, -dy * 70);
      }
    }
    for (const p of this.projectiles) {
      if (p.done) continue;
      p.x += p.vx * dt * this.speedMultiplier;
      p.y += p.vy * dt * this.speedMultiplier;
      this.checkKnifeCollision(p);
      if (p.x < this.boxX - 100 || p.x > this.boxX + this.boxW + 100 || p.y < this.boxY - 100 || p.y > this.boxY + this.boxH + 100) p.done = true;
    }
    this.projectiles = this.projectiles.filter(p => !p.done);
    if (this.phaseTimer >= this.attackDuration && this.crossWaves >= 4) this.endAttack();
  }


  private opacityRainTimer = 0;

  private attackCssOpacity(): void {
    this.attackDuration = 8;
    this.cssCommandText = ".danger { opacity: 0.1; }";
    this.opacityRainTimer = 0;
    this.flickerActive = true;
  }

  private updateCssOpacity(dt: number): void {
    this.opacityRainTimer += dt;
    if (this.opacityRainTimer >= 0.4) {
      this.opacityRainTimer = 0;
      const x = this.boxX + Math.random() * this.boxW;
      if (Math.random() < 0.5) this.spawnKnife(x, this.boxY - 20, 0, 75);
      else this.spawnTag(x, this.boxY - 20, 0, 60, Math.random() < 0.4);
    }
    for (const p of this.projectiles) {
      if (p.done) continue;
      p.y += p.vy * dt * this.speedMultiplier;
      if (p.isKnife) this.checkKnifeCollision(p); else this.checkTagCollision(p);
      if (p.y > this.boxY + this.boxH + 30) p.done = true;
    }
    this.projectiles = this.projectiles.filter(p => !p.done);
    if (this.phaseTimer >= this.attackDuration) this.endAttack();
  }


  private rotateRainTimer = 0;

  private attackCssRotate(): void {
    this.attackDuration = 8;
    this.cssCommandText = ".player { transform: rotate(180deg); }";
    this.controlsInvertX = true;
    this.controlsInvertY = true;
    this.rotateRainTimer = 0;
  }

  private updateCssRotate(dt: number): void {
    this.rotateRainTimer += dt;
    if (this.rotateRainTimer >= 0.5) {
      this.rotateRainTimer = 0;
      const x = this.boxX + Math.random() * this.boxW;
      this.spawnKnife(x, this.boxY + this.boxH + 20, 0, -80);
    }
    for (const p of this.projectiles) {
      if (p.done) continue;
      p.y += p.vy * dt * this.speedMultiplier;
      this.checkKnifeCollision(p);
      if (p.y < this.boxY - 30) p.done = true;
    }
    this.projectiles = this.projectiles.filter(p => !p.done);
    if (this.phaseTimer >= this.attackDuration) this.endAttack();
  }


  private spiralAngle = 0;
  private spiralTimer = 0;

  private attackTagsSpiral(): void {
    this.attackDuration = 7;
    this.spiralAngle = 0;
    this.spiralTimer = 0;
  }

  private updateTagsSpiral(dt: number): void {
    this.spiralTimer += dt;
    this.spiralAngle += dt * 3;
    if (this.spiralTimer >= 0.25) {
      this.spiralTimer = 0;
      const cx = this.boxX + this.boxW / 2;
      const cy = this.boxY + this.boxH / 2;
      const radius = Math.max(this.boxW, this.boxH) * 0.7;
      const x = cx + Math.cos(this.spiralAngle) * radius;
      const y = cy + Math.sin(this.spiralAngle) * radius;
      const dx = cx - x, dy = cy - y;
      const len = Math.hypot(dx, dy) || 1;
      this.spawnTag(x, y, (dx / len) * 45, (dy / len) * 45, Math.random() < 0.4);
    }
    for (const p of this.projectiles) {
      if (p.done) continue;
      p.x += p.vx * dt * this.speedMultiplier;
      p.y += p.vy * dt * this.speedMultiplier;
      this.checkTagCollision(p);
      const cx = this.boxX + this.boxW / 2, cy = this.boxY + this.boxH / 2;
      if (Math.hypot(p.x - cx, p.y - cy) < 6) p.done = true;
    }
    this.projectiles = this.projectiles.filter(p => !p.done);
    if (this.phaseTimer >= this.attackDuration) this.endAttack();
  }


  private finalTimer = 0;

  private attackFinalCombo(): void {
    this.attackDuration = 9;
    this.cssCommandText = "* { animation-duration: 0.1s !important; }";
    this.speedMultiplier = 1.6;
    this.finalTimer = 0;
  }

  private updateFinalCombo(dt: number): void {
    this.finalTimer += dt;
    if (this.finalTimer >= 0.35 && this.phaseTimer < this.attackDuration - 1.5) {
      this.finalTimer = 0;
      const x = this.boxX + Math.random() * this.boxW;
      if (Math.random() < 0.5) {
        this.spawnKnife(x, this.boxY - 20, (Math.random() - 0.5) * 30, 90);
      } else {
        this.spawnTag(x, this.boxY - 20, (Math.random() - 0.5) * 20, 75, Math.random() < 0.45);
      }
    }
    for (const p of this.projectiles) {
      if (p.done) continue;
      p.x += p.vx * dt * this.speedMultiplier;
      p.y += p.vy * dt * this.speedMultiplier;
      if (p.isKnife) this.checkKnifeCollision(p); else this.checkTagCollision(p);
      if (p.y > this.boxY + this.boxH + 40) p.done = true;
    }
    this.projectiles = this.projectiles.filter(p => !p.done);
    if (this.phaseTimer >= this.attackDuration) this.endAttack();
  }


  /**
   * Nouvelle attaque — "transform: scale()"
   * Le cœur (et donc sa hitbox) est agrandi, ce qui le rend bien plus facile à toucher.
   * Pendant ce temps, une pluie de couteaux et de balises continue de tomber.
   */
  private attackCssScale(): void {
    this.attackDuration = 10;
    this.cssCommandText = ".heart { transform: scale(2.5); }";
    this.heartScale = 2.5;
    this.scaleRainTimer = 0;
  }

  private updateCssScale(dt: number): void {
    this.scaleRainTimer += dt;
    if (this.scaleRainTimer >= 0.3 && this.phaseTimer < this.attackDuration - 1) {
      this.scaleRainTimer = 0;
      const x = this.boxX + Math.random() * this.boxW;
      if (Math.random() < 0.5) {
        this.spawnKnife(x, this.boxY - 20, (Math.random() - 0.5) * 20, 95);
      } else {
        this.spawnTag(x, this.boxY - 20, (Math.random() - 0.5) * 20, 80, Math.random() < 0.4);
      }
    }
    for (const p of this.projectiles) {
      if (p.done) continue;
      p.x += p.vx * dt * this.speedMultiplier;
      p.y += p.vy * dt * this.speedMultiplier;
      if (p.isKnife) this.checkKnifeCollision(p); else this.checkTagCollision(p);
      if (p.y > this.boxY + this.boxH + 30) p.done = true;
    }
    this.projectiles = this.projectiles.filter(p => !p.done);
    if (this.phaseTimer >= this.attackDuration) this.endAttack();
  }


  /**
   * Nouvelle attaque — "grid-template-columns: repeat(4, 1fr)"
   * Les couteaux tombent dans des colonnes fixes, toujours selon le même schéma de voies.
   */
  private attackCssGrid(): void {
    this.attackDuration = 10;
    this.cssCommandText = ".arena { grid-template-columns: repeat(4, 1fr); }";
    this.gridWaveTimer = 0;
    this.gridWaveIndex = 0;
  }

  private updateCssGrid(dt: number): void {
    this.gridWaveTimer += dt;
    if (this.gridWaveTimer >= 0.5 && this.phaseTimer < this.attackDuration - 1) {
      this.gridWaveTimer = 0;
      const lane = this.GRID_PATTERN[this.gridWaveIndex % this.GRID_PATTERN.length];
      this.gridWaveIndex++;
      const laneW = this.boxW / this.GRID_LANES;
      const x = this.boxX + laneW * (lane + 0.5);
      this.spawnKnife(x, this.boxY - 20, 0, 105);
    }
    for (const p of this.projectiles) {
      if (p.done) continue;
      p.y += p.vy * dt * this.speedMultiplier;
      this.checkKnifeCollision(p);
      if (p.y > this.boxY + this.boxH + 30) p.done = true;
    }
    this.projectiles = this.projectiles.filter(p => !p.done);
    if (this.phaseTimer >= this.attackDuration) this.endAttack();
  }


  /**
   * Nouvelle attaque — "transition: transform 0.1s ease-in"
   * Des couteaux immobiles apparaissent, puis foncent d'un coup vers le cœur après un court délai.
   */
  private attackCssTransition(): void {
    this.attackDuration = 9;
    this.cssCommandText = ".couteau { transition: transform 0.1s ease-in; }";
    this.transitionRainTimer = 0;
  }

  private updateCssTransition(dt: number): void {
    this.transitionRainTimer += dt;
    if (this.transitionRainTimer >= 0.6 && this.phaseTimer < this.attackDuration - 1.5) {
      this.transitionRainTimer = 0;
      const x = this.boxX + Math.random() * this.boxW;
      const y = this.boxY + Math.random() * this.boxH;
      this.projectiles.push({ isKnife: true, bad: false, text: "†", x, y, vx: 0, vy: 0, scale: 1, done: false, delay: 0.9 });
    }
    for (const p of this.projectiles) {
      if (p.done) continue;
      if (p.delay !== undefined && p.delay > 0) {
        p.delay -= dt;
        if (p.delay <= 0) {
          const dx = this.heartX - p.x, dy = this.heartY - p.y;
          const len = Math.hypot(dx, dy) || 1;
          p.vx = (dx / len) * 220;
          p.vy = (dy / len) * 220;
        }
      } else {
        p.x += p.vx * dt * this.speedMultiplier;
        p.y += p.vy * dt * this.speedMultiplier;
      }
      this.checkKnifeCollision(p);
      if (
        p.x < this.boxX - 40 || p.x > this.boxX + this.boxW + 40 ||
        p.y < this.boxY - 40 || p.y > this.boxY + this.boxH + 40
      ) p.done = true;
    }
    this.projectiles = this.projectiles.filter(p => !p.done);
    if (this.phaseTimer >= this.attackDuration) this.endAttack();
  }


  /**
   * Nouvelle attaque — "animation: spin 2s linear infinite"
   * Un anneau de couteaux tourne autour du cœur et se resserre progressivement.
   */
  private attackKnifeRing(): void {
    this.attackDuration = 10;
    this.cssCommandText = "@keyframes spin { to { transform: rotate(360deg); } } .ring { animation: spin 2s linear infinite; }";
    this.ringAngle  = 0;
    this.ringRadius = Math.max(this.boxW, this.boxH) * 0.6;
    const cx = this.boxX + this.boxW / 2, cy = this.boxY + this.boxH / 2;
    const knifeCount = 8;
    for (let i = 0; i < knifeCount; i++) {
      const a = (i / knifeCount) * Math.PI * 2;
      this.spawnKnife(cx + Math.cos(a) * this.ringRadius, cy + Math.sin(a) * this.ringRadius, 0, 0);
      const p = this.projectiles[this.projectiles.length - 1];
      p.anchorOffsetX = a;
    }
  }

  private updateKnifeRing(dt: number): void {
    this.ringAngle  += dt * 1.6;
    this.ringRadius  = Math.max(20, this.ringRadius - dt * 9);
    const cx = this.boxX + this.boxW / 2, cy = this.boxY + this.boxH / 2;
    for (const p of this.projectiles) {
      if (p.done) continue;
      const a = (p.anchorOffsetX ?? 0) + this.ringAngle;
      p.x = cx + Math.cos(a) * this.ringRadius;
      p.y = cy + Math.sin(a) * this.ringRadius;
      this.checkKnifeCollision(p);
    }
    if (this.phaseTimer >= this.attackDuration) {
      this.projectiles = [];
      this.endAttack();
    }
  }


  /**
   * Nouvelle attaque — "animation-delay: calc(var(--i) * 0.3s)"
   * Des couteaux sont envoyés depuis les 4 côtés de la boîte, toujours dans le même ordre :
   * haut → droite → bas → gauche → haut → ...
   */
  private attackCssAnimationDelay(): void {
    this.attackDuration = 11;
    this.cssCommandText = ".couteau { animation-delay: calc(var(--i) * 0.3s); }";
    this.clockWaveTimer = 0;
    this.clockWaveIndex = 0;
  }

  private updateCssAnimationDelay(dt: number): void {
    this.clockWaveTimer += dt;
    if (this.clockWaveTimer >= 0.55 && this.phaseTimer < this.attackDuration - 1.5) {
      this.clockWaveTimer = 0;
      const side = this.CLOCK_SIDES[this.clockWaveIndex % this.CLOCK_SIDES.length];
      this.clockWaveIndex++;
      const cx = this.boxX + this.boxW / 2, cy = this.boxY + this.boxH / 2;
      const speed = 100;
      let x = cx, y = cy, vx = 0, vy = 0;
      if (side === "top")    { x = cx; y = this.boxY - 20;             vx = 0;      vy = speed;  }
      if (side === "right")  { x = this.boxX + this.boxW + 20; y = cy; vx = -speed; vy = 0;      }
      if (side === "bottom") { x = cx; y = this.boxY + this.boxH + 20; vx = 0;      vy = -speed; }
      if (side === "left")   { x = this.boxX - 20; y = cy;             vx = speed;  vy = 0;      }
      this.spawnKnife(x, y, vx, vy);
    }
    for (const p of this.projectiles) {
      if (p.done) continue;
      p.x += p.vx * dt * this.speedMultiplier;
      p.y += p.vy * dt * this.speedMultiplier;
      this.checkKnifeCollision(p);
      if (
        p.x < this.boxX - 40 || p.x > this.boxX + this.boxW + 40 ||
        p.y < this.boxY - 40 || p.y > this.boxY + this.boxH + 40
      ) p.done = true;
    }
    this.projectiles = this.projectiles.filter(p => !p.done);
    if (this.phaseTimer >= this.attackDuration) this.endAttack();
  }


  private checkKnifeCollision(p: Projectile): void {
    if (p.done) return;
    const dist = Math.hypot(p.x - this.heartX, p.y - this.heartY);
    if (dist < (this.HEART_SIZE * this.heartScale + 6) / 2 + 4) {
      p.done = true;
      this.hp = Math.max(0, this.hp - KNIFE_DMG);
      this.triggerShake(0.3, 6);
      if (this.hp <= 0) this.triggerGameOver();
    }
  }

  private checkTagCollision(p: Projectile): void {
    if (p.done) return;
    const dist = Math.hypot(p.x - this.heartX, p.y - this.heartY);
    if (dist < (this.HEART_SIZE * this.heartScale + 6) / 2 + 4) {
      p.done = true;
      if (p.bad) {
        this.score += SCORE_BAD;
        this.hp = Math.max(0, this.hp - TAG_DMG_BAD);
        this.triggerShake(0.3, 6);
        if (this.hp <= 0) this.triggerGameOver();
      } else {
        this.score += SCORE_GOOD;
      }
    }
  }


  update(dt: number): void {
    this.updateFade(dt);
    if (this.shakeTime > 0) this.shakeTime -= dt;

    this.dialogue.update(dt);
    const advancePressed = this.input.wasPressed("KeyZ") || this.input.wasPressed("Enter");
    if (this.dialogue.active && advancePressed) {
      this.dialogue.advance();
      return;
    }

    switch (this.phase) {
      case "playerTurn":
        this.updatePlayerMenu();
        break;
      case "fightRhythm":
        this.updateFightRhythm(dt);
        break;
      case "attack":
        this.phaseTimer += dt;
        this.updateHeartMovement(dt);
        this.updateCurrentAttack(dt);
        break;
      default:
        break;
    }
  }

  private updatePlayerMenu(): void {
    if (this.input.wasPressed("ArrowLeft") || this.input.wasPressed("KeyQ") || this.input.wasPressed("KeyA")) {
      this.menuSelected = (this.menuSelected + 3) % 4;
    } else if (this.input.wasPressed("ArrowRight") || this.input.wasPressed("KeyD")) {
      this.menuSelected = (this.menuSelected + 1) % 4;
    } else if (this.input.wasPressed("KeyZ") || this.input.wasPressed("Enter")) {
      this.confirmMenuSelection();
    }
  }

  private updateCurrentAttack(dt: number): void {
    const index = this.attacksUsed - 1;
    switch (index % 15) {
      case 0: this.updateKnifeWave(dt); break;
      case 1: this.updateTagsRain(dt); break;
      case 2: this.updateCssColor(dt); break;
      case 3: this.updateCssShrink(dt); break;
      case 4: this.updateCssFlexDirection(dt); break;
      case 5: this.updateKnifeCross(dt); break;
      case 6: this.updateCssOpacity(dt); break;
      case 7: this.updateCssRotate(dt); break;
      case 8: this.updateTagsSpiral(dt); break;
      case 9: this.updateFinalCombo(dt); break;
      case 10: this.updateCssScale(dt); break;
      case 11: this.updateCssGrid(dt); break;
      case 12: this.updateCssTransition(dt); break;
      case 13: this.updateKnifeRing(dt); break;
      case 14: this.updateCssAnimationDelay(dt); break;
    }
  }

  /** Déplacement du cœur — gère le mode normal, le mode "cloué au sol + saut", et les inversions de contrôle. */
  private updateHeartMovement(dt: number): void {
    const SPEED = 110;
    let dx = 0, dy = 0;
    if (this.input.isDown("ArrowLeft") || this.input.isDown("KeyQ") || this.input.isDown("KeyA")) dx = -1;
    else if (this.input.isDown("ArrowRight") || this.input.isDown("KeyD")) dx = 1;
    if (this.input.isDown("ArrowUp") || this.input.isDown("KeyW")) dy = -1;
    else if (this.input.isDown("ArrowDown") || this.input.isDown("KeyS")) dy = 1;

    if (this.controlsInvertX) dx = -dx;
    if (this.controlsInvertY) dy = -dy;

    if (dx !== 0 && dy !== 0) { dx *= 0.707; dy *= 0.707; }

    const half = (this.HEART_SIZE * this.heartScale) / 2;

    if (this.heartGrounded) {
      this.heartX = Math.max(this.boxX + half, Math.min(this.boxX + this.boxW - half, this.heartX + dx * SPEED * dt));

      const wantsJump = this.input.isDown("Space") || this.input.isDown("ArrowUp") || this.input.isDown("KeyW");
      const groundY = this.boxY + this.boxH - half;
      const isOnGround = this.heartY >= groundY - 0.5;

      if (isOnGround && wantsJump) {
        this.heartVy = this.JUMP_VELOCITY;
      }
      this.heartVy += this.GRAVITY * dt;
      this.heartY += this.heartVy * dt;
      if (this.heartY > groundY) {
        this.heartY = groundY;
        this.heartVy = 0;
      }
    } else {
      this.heartX = Math.max(this.boxX + half, Math.min(this.boxX + this.boxW - half, this.heartX + dx * SPEED * dt));
      this.heartY = Math.max(this.boxY + half, Math.min(this.boxY + this.boxH - half, this.heartY + dy * SPEED * dt));
    }
  }


  render(ctx: CanvasRenderingContext2D): void {
    let shakeX = 0, shakeY = 0;
    if (this.shakeTime > 0) {
      shakeX = (Math.random() * 2 - 1) * this.shakeIntensity;
      shakeY = (Math.random() * 2 - 1) * this.shakeIntensity;
    }

    ctx.save();
    ctx.translate(shakeX, shakeY);

    ctx.fillStyle = "#000";
    ctx.fillRect(-20, -20, this.viewportW + 40, this.viewportH + 40);

    this.renderOmori(ctx);
    this.renderBox(ctx);
    this.renderProjectiles(ctx);
    this.renderHeart(ctx);
    this.renderCssCommand(ctx);
    this.renderHUD(ctx);

    if (this.phase === "playerTurn") this.renderActionButtons(ctx);
    if (this.phase === "fightRhythm") this.renderRhythmBar(ctx);

    ctx.restore();

    this.dialogue.render(ctx, 16, this.viewportH - 100, this.viewportW - 32, 84);

    if (this.fadeAlpha > 0) {
      ctx.fillStyle = this.fadeColor === "black"
        ? `rgba(0,0,0,${this.fadeAlpha})`
        : `rgba(255,255,255,${this.fadeAlpha})`;
      ctx.fillRect(0, 0, this.viewportW, this.viewportH);
    }
  }

  private renderOmori(ctx: CanvasRenderingContext2D): void {
    const cx = this.omoriX, cy = this.omoriY;
    ctx.imageSmoothingEnabled = false;
    if (this.omoriSprite) {
      ctx.drawImage(this.omoriSprite, cx - OMORI_DISPLAY_W / 2, cy - OMORI_DISPLAY_H / 2, OMORI_DISPLAY_W, OMORI_DISPLAY_H);
    } else {
      ctx.fillStyle = "#2b2b3a";
      ctx.fillRect(cx - 30, cy - 40, 60, 70);
      ctx.fillStyle = "#fff";
      ctx.font = "10px monospace";
      ctx.textAlign = "center";
      ctx.fillText("OMORI (placeholder)", cx, cy + 50);
      ctx.textAlign = "left";
    }
  }

  private renderBox(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = "#000";
    ctx.fillRect(this.boxX, this.boxY, this.boxW, this.boxH);
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 4;
    ctx.strokeRect(this.boxX, this.boxY, this.boxW, this.boxH);
  }

  private renderProjectiles(ctx: CanvasRenderingContext2D): void {
    for (const p of this.projectiles) {
      if (this.flickerActive && Math.sin(Date.now() / 60 + p.x) > 0.6) continue;

      if (p.isKnife) {
        ctx.save();
        ctx.translate(p.x, p.y);
        const angle = Math.atan2(p.vy, p.vx || 0.001);
        ctx.rotate(angle + Math.PI / 2);
        ctx.fillStyle = "#dcdcdc";
        ctx.beginPath();
        ctx.moveTo(0, -10 * p.scale);
        ctx.lineTo(4 * p.scale, 6 * p.scale);
        ctx.lineTo(-4 * p.scale, 6 * p.scale);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#8a6a4a";
        ctx.fillRect(-2 * p.scale, 6 * p.scale, 4 * p.scale, 6 * p.scale);
        ctx.restore();
      } else {
        ctx.font = "bold 13px 'Courier New', monospace";
        ctx.fillStyle = "#e0e0e0";
        ctx.fillText(p.text, p.x - ctx.measureText(p.text).width / 2, p.y);
      }
    }
  }

  private renderHeart(ctx: CanvasRenderingContext2D): void {
    const s = this.HEART_SIZE * this.heartScale;
    if (this.heartSprite) {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(this.heartSprite, this.heartX - s / 2, this.heartY - s / 2, s, s);
      return;
    }
    ctx.fillStyle = this.heartColor === "green" ? "#2ecc71" : "#ff1744";
    ctx.save();
    ctx.translate(this.heartX, this.heartY);
    ctx.beginPath();
    ctx.moveTo(0, s * 0.35);
    ctx.bezierCurveTo(-s * 0.6, -s * 0.4, -s * 0.9, s * 0.15, 0, s * 0.6);
    ctx.bezierCurveTo(s * 0.9, s * 0.15, s * 0.6, -s * 0.4, 0, s * 0.35);
    ctx.fill();
    ctx.restore();
  }

  private renderCssCommand(ctx: CanvasRenderingContext2D): void {
    if (!this.cssCommandText) return;
    ctx.font = "bold 13px 'Courier New', monospace";
    ctx.fillStyle = "#7ee787";
    ctx.textAlign = "center";
    ctx.fillText(this.cssCommandText, this.viewportW / 2, this.boxY - 14);
    ctx.textAlign = "left";
  }

  private renderHUD(ctx: CanvasRenderingContext2D): void {
    const hudY = this.boxY + this.boxH + 40;
    const lx = this.boxX;

    ctx.textAlign = "left";
    ctx.font = "bold 16px 'Courier New', monospace";
    ctx.fillStyle = "#fff";
    ctx.fillText(PLAYER_NAME, lx, hudY);
    ctx.fillText(`LV ${PLAYER_LV}`, lx + 80, hudY);

    ctx.font = "bold 14px 'Courier New', monospace";
    ctx.fillText("HP", lx + 150, hudY);

    const bx = lx + 180, by = hudY - 13, bw = 100, bh = 17;
    ctx.fillStyle = "#5a0000";
    ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = "#ff0000";
    ctx.fillRect(bx, by, bw * Math.max(0, this.hp / PLAYER_MAX_HP), bh);
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.strokeRect(bx, by, bw, bh);

    ctx.font = "bold 13px 'Courier New', monospace";
    ctx.fillStyle = "#fff";
    ctx.fillText(`${this.hp} / ${PLAYER_MAX_HP}`, bx + bw + 10, hudY);

    const obw = 100, obh = 10;
    const obx = this.omoriX - obw / 2, oby = this.omoriY - OMORI_DISPLAY_H / 2 - 20;
    ctx.fillStyle = "#333";
    ctx.fillRect(obx, oby, obw, obh);
    ctx.fillStyle = "#7ee787";
    ctx.fillRect(obx, oby, obw * Math.max(0, this.omoriHp / OMORI_MAX_HP), obh);
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(obx, oby, obw, obh);

    ctx.font = "bold 13px 'Courier New', monospace";
    ctx.fillStyle = "#ffd700";
    ctx.textAlign = "right";
    ctx.fillText(`SCORE : ${this.score}`, this.viewportW - 16, hudY);
    ctx.textAlign = "left";
  }

  private renderActionButtons(ctx: CanvasRenderingContext2D): void {
    const labels = ["FIGHT", "ACT", "ITEM", "MERCY"];
    const y = this.viewportH - 75;
    const h = 44;
    const gap = 10;
    const w = (this.viewportW - 32 - gap * 3) / 4;

    labels.forEach((label, i) => {
      const x = 16 + i * (w + gap);
      const selected = i === this.menuSelected;
      ctx.strokeStyle = "#ff8c00";
      ctx.lineWidth = 3;
      ctx.strokeRect(x, y, w, h);
      ctx.font = "bold 15px 'Courier New', monospace";
      ctx.fillStyle = selected ? "#fff" : "#ff8c00";
      ctx.textAlign = "center";
      ctx.fillText((selected ? "❤ " : "  ") + label, x + w / 2, y + h / 2 + 5);
    });
    ctx.textAlign = "left";
  }

  private renderRhythmBar(ctx: CanvasRenderingContext2D): void {
    const bw = 300, bh = 30;
    const bx = (this.viewportW - bw) / 2;
    const by = this.viewportH - 80;

    ctx.fillStyle = "#222";
    ctx.fillRect(bx, by, bw, bh);

    const [zoneStart, zoneEnd] = this.getRhythmZoneBounds();
    ctx.fillStyle = "#cc0000";
    ctx.fillRect(bx + bw * zoneStart, by, bw * (zoneEnd - zoneStart), bh);

    const curX = bx + this.rhythmBarPos * bw;
    ctx.fillStyle = "#fff";
    ctx.fillRect(curX - 2, by - 4, 4, bh + 8);

    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.strokeRect(bx, by, bw, bh);

    if (this.rhythmHit) {
      ctx.font = "bold 18px 'Courier New', monospace";
      ctx.fillStyle = this.rhythmPerfect ? "#ffd700" : "#aaa";
      ctx.textAlign = "center";
      ctx.fillText(this.rhythmPerfect ? "PARFAIT ! (×2)" : "OK", this.viewportW / 2, by - 12);
      ctx.textAlign = "left";
    }
  }
}
