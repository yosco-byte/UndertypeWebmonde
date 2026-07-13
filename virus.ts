import { Scene, sceneManager } from "./SceneManager";
import { Input } from "./Input";
import { assets } from "./AssetLoader";
import { DialogueLine } from "./DialogueBox";
import { gameState } from "./GameState";


const PLAYER_NAME    = "Psin";
const PLAYER_LV      = 3;
const PLAYER_MAX_HP  = 30;

const PLAYER_DMG_NORMAL  = 3;
const PLAYER_DMG_PERFECT = 6; // critique en zone rouge

const VIRUS_MAX_HP = 45;

const VIRUS_SPRITE_URL = "assets/sprites/virus.jpg";
const VIRUS_DISPLAY_W  = 100;
const VIRUS_DISPLAY_H  = 130;

const HEART_SPRITE_URL = "assets/sprites/heart.png";

const BOSS_MUSIC_URL    = "public/assets/music/BossVirus.mp3";
const BOSS_MUSIC_VOLUME = 0.6;

const CRI_SOUND_URL = "public/assets/music/cri.mp3";

const TAG_DMG_BAD  = 3;
const SCORE_GOOD   = 500;
const SCORE_BAD    = -1000;

const MAX_ATTACKS = 10;

// Balises "trojan" : mal formées (dangereuses) et bien formées (score)
const ALL_TAGS_GOOD = ["<p>", "<div>", "</p>", "<span>", "</div>"];
const ALL_TAGS_BAD  = ["<div", "<p>>", "<<span>", "</br/>", "<html>>"];
const TROJAN_TAG     = "<trojan>";

const VIRUS_TOOLTIP = "Virus corrompt tout ce qui entre à son contact";


const DIALOGUE_INTRO: DialogueLine[] = [
  { speaker: "Virus", text: ". . ." },
  { speaker: "Système", text: "* Une entité corrompue bloque le passage." },
  { speaker: "Système", text: "* Son code semble... instable." },
];

const DIALOGUE_VICTORY: DialogueLine[] = [
  { speaker: "Virus", text: ". . ." },
  { speaker: "Système", text: "* Le processus a été terminé." },
];

const DIALOGUE_DISMISS_ACT: DialogueLine[] = [
  { speaker: "Système", text: "* Impossible d'analyser un virus actif." },
];
const DIALOGUE_DISMISS_ITEM: DialogueLine[] = [
  { speaker: "Système", text: "* Aucun objet ne peut stopper une infection." },
];
const DIALOGUE_DISMISS_MERCY: DialogueLine[] = [
  { speaker: "Virus", text: ". . ." },
];

const DIALOGUE_GAMEOVER: DialogueLine[] = [
  { speaker: "Système", text: "* ...Système corrompu." },
];

// Phrases qui peuvent apparaître entre les phases d'attaque (40% de chance)
const BETWEEN_PHASE_LINES: string[] = [
  "aide moi...",
  "erreur...",
  "pourquoi...",
  ". . .",
  "ça fait mal...",
  "arrête...",
];
const BETWEEN_PHASE_CHANCE = 0.4;


type Phase =
  | "fadeIn"
  | "dialogueIntro"
  | "playerTurn"
  | "fightRhythm"
  | "dismiss"
  | "betweenPhrase"
  | "attack"
  | "victory"
  | "gameOver"
  | "fadeOutBlack"
  | "fadeOutWhite";


interface Projectile {
  isTag: boolean;
  bad: boolean;
  isTrojan: boolean;
  isBig: boolean; // trojan 25% plus gros -> DOT
  text: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  scale: number;
  rotation?: number;
  anchorOffsetX?: number;
  anchorOffsetY?: number;
  delay?: number;
  done: boolean;
}

interface HorseHead {
  x: number;
  y: number;
  baseY: number;
  side: "left" | "right";
  speed: number;
  swingT: number;
  active: boolean;
  done: boolean;
}

interface RansomAsterisk {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  done: boolean;
}

interface WormTag {
  x: number;
  y: number;
  vx: number;
  vy: number;
  gen: number; // génération de scission
  splitTimer: number;
  done: boolean;
}

interface SpywareTag {
  x: number;
  y: number;
  speed: number;
  spawnDelay: number;
  active: boolean;
  done: boolean;
}

interface SkullLaser {
  side: "top" | "left" | "right";
  pos: number; // position le long du côté (0..1)
  charging: number;
  firing: number;
  fired: boolean;
}

interface DinoBar {
  x: number;
  width: number;
  gapY: number | null; // si présent : c'est une barre flappy avec un trou
  gapHeight: number;
  height: number; // hauteur depuis le bas (barre classique)
  done: boolean;
}

interface RotatingSkull {
  angle: number;
  radius: number;
  speed: number;
  isRed: boolean;
  redTimer: number;
  laserFired: boolean;
  laserTimer: number;
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

    if (line.speaker) {
      ctx.font = "bold 13px 'Courier New', monospace";
      ctx.fillStyle = "#fff";
      ctx.fillText(line.speaker, x + 16, y + 20);
    }

    const displayed = line.text.slice(0, this.charIndex);
    ctx.font = "16px 'Courier New', monospace";
    ctx.fillStyle = "#fff";

    const PADDING = 16;
    const MAX_W = w - PADDING * 2;
    const LINE_HEIGHT = 22;
    const words = displayed.split(" ");
    let currentLine = "";
    let lineY = y + PADDING + (line.speaker ? 24 : 12);
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


export class BossVirus implements Scene {
  private hp = PLAYER_MAX_HP;
  private virusHp = VIRUS_MAX_HP;
  private score = 0;
  private attacksUsed = 0;

  private baseBoxW = 180;
  private baseBoxH = 140;
  private boxScale = 1;
  private get boxW(): number { return this.baseBoxW * this.boxScale; }
  private get boxH(): number { return this.baseBoxH * this.boxScale; }
  private boxX = 0;
  private boxY = 0;

  private get fullBoxW(): number { return this.baseBoxW; }
  private get fullBoxH(): number { return this.baseBoxH; }
  private get fullBoxX(): number { return (this.viewportW - this.fullBoxW) / 2; }
  private get fullBoxY(): number { return this.boxY; }

  private heartX = 0;
  private heartY = 0;
  private readonly HEART_SIZE = 16;
  private heartSprite: HTMLImageElement | null = null;
  private heartColor: "red" | "green" = "red";

  private heartGrounded = false;
  private heartVy = 0;
  private readonly GRAVITY = 700;
  private readonly JUMP_VELOCITY = -260;

  private axisLock: "none" | "horizontal" | "vertical" = "none";

  private virusSprite: HTMLImageElement | null = null;
  private virusX = 0;
  private virusY = 0;

  private bossMusic: HTMLAudioElement | null = null;
  private criSound: HTMLAudioElement | null = null;

  private projectiles: Projectile[] = [];
  private horses: HorseHead[] = [];
  private asterisks: RansomAsterisk[] = [];
  private wormTags: WormTag[] = [];
  private spywareTags: SpywareTag[] = [];
  private skullLasers: SkullLaser[] = [];
  private dinoBars: DinoBar[] = [];
  private rotatingSkulls: RotatingSkull[] = [];

  private speedMultiplier = 1;
  private cssCommandText: string | null = null;

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

  private tooltipEl: HTMLDivElement | null = null;

  private dotTimer = 0;
  private dotTicksLeft = 0;

  private ransomTextTimer = 0;
  private ransomSpawnTimer = 0;

  private wormSplitsLeft = 0;

  private ddosSafeLaneX = 0;
  private ddosSafeLaneW = 0;

  private spywareSpawnTimer = 0;
  private spywareSpawnCount = 0;

  private skullGridTimer = 0;

  private dinoSpawnTimer = 0;
  private readonly DINO_GROUND_Y_RATIO = 0.92;

  private keyloggerTimer = 0;
  private lastHeartDir: { x: number; y: number } = { x: 0, y: 0 };

  private skullRotTimer = 0;

  constructor(
    private readonly input: Input,
    private readonly viewportW: number,
    private readonly viewportH: number
  ) {}


  onEnter(): void {
    this.hp = PLAYER_MAX_HP;
    this.virusHp = VIRUS_MAX_HP;
    this.score = 0;
    this.attacksUsed = 0;
    this.boxScale = 1;
    this.heartColor = "red";
    this.heartGrounded = false;
    this.axisLock = "none";
    this.speedMultiplier = 1;
    this.cssCommandText = null;
    this.projectiles = [];
    this.horses = [];
    this.asterisks = [];
    this.wormTags = [];
    this.spywareTags = [];
    this.skullLasers = [];
    this.dinoBars = [];
    this.rotatingSkulls = [];
    this.dotTicksLeft = 0;

    this.recomputeBoxLayout();
    this.heartX = this.boxX + this.boxW / 2;
    this.heartY = this.boxY + this.boxH / 2;

    this.virusX = this.viewportW / 2;
    this.virusY = this.boxY - 100;

    this.phase = "fadeIn";
    this.fadeAlpha = 1;
    this.fadeColor = "black";

    assets.load(VIRUS_SPRITE_URL).then((img) => { this.virusSprite = img; });
    assets.load(HEART_SPRITE_URL).then((img) => { this.heartSprite = img; });

    this.bossMusic = new Audio(BOSS_MUSIC_URL);
    this.bossMusic.loop = true;
    this.bossMusic.volume = BOSS_MUSIC_VOLUME;
    this.bossMusic.play().catch(() => {});

    this.criSound = new Audio(CRI_SOUND_URL);
    this.criSound.volume = 0.7;

    this.setupTooltip();

    this.startFade("black", 1, 0, () => {
      this.dialogue.start(DIALOGUE_INTRO, () => this.startPlayerTurn());
      this.phase = "dialogueIntro";
      this.playCri();
    });
  }

  onExit(): void {
    if (this.bossMusic) {
      this.bossMusic.pause();
      this.bossMusic.currentTime = 0;
      this.bossMusic = null;
    }
    this.teardownTooltip();
  }

  private setupTooltip(): void {
    const canvas = document.querySelector("canvas");
    if (!canvas) return;
    canvas.title = VIRUS_TOOLTIP;

    const el = document.createElement("div");
    el.title = VIRUS_TOOLTIP;
    el.style.position = "absolute";
    el.style.pointerEvents = "auto";
    el.style.background = "transparent";
    el.style.zIndex = "50";
    document.body.appendChild(el);
    this.tooltipEl = el;
    this.repositionTooltip();
  }

  private repositionTooltip(): void {
    if (!this.tooltipEl) return;
    const canvas = document.querySelector("canvas");
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = rect.width / this.viewportW;
    const scaleY = rect.height / this.viewportH;
    const w = VIRUS_DISPLAY_W * scaleX;
    const h = VIRUS_DISPLAY_H * scaleY;
    this.tooltipEl.style.left = `${rect.left + (this.virusX - VIRUS_DISPLAY_W / 2) * scaleX}px`;
    this.tooltipEl.style.top = `${rect.top + (this.virusY - VIRUS_DISPLAY_H / 2) * scaleY}px`;
    this.tooltipEl.style.width = `${w}px`;
    this.tooltipEl.style.height = `${h}px`;
  }

  private teardownTooltip(): void {
    const canvas = document.querySelector("canvas");
    if (canvas) canvas.removeAttribute("title");
    if (this.tooltipEl) {
      this.tooltipEl.remove();
      this.tooltipEl = null;
    }
  }

  private playCri(): void {
    if (!this.criSound) return;
    try {
      this.criSound.currentTime = 0;
      this.criSound.play().catch(() => {});
    } catch { /* ignore */ }
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
        // zone rouge = critique
        const dmg = this.rhythmPerfect ? PLAYER_DMG_PERFECT : PLAYER_DMG_NORMAL;
        this.virusHp = Math.max(0, this.virusHp - dmg);
        this.triggerShake(0.2, this.rhythmPerfect ? 9 : 4);
        this.playCri();
        if (this.virusHp <= 0) {
          this.startVictory();
        } else {
          this.maybeStartBetweenPhrase(() => this.startNextAttack());
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
    this.clearAllAttackEntities();
    this.dialogue.start(DIALOGUE_VICTORY, () => this.endBattle(true));
  }

  private triggerGameOver(): void {
    this.phase = "gameOver";
    this.clearAllAttackEntities();
    this.dialogue.start(DIALOGUE_GAMEOVER, () => this.endBattle(false));
  }

  private endBattle(victory: boolean): void {
    this.stopMusic();
    if (victory) {
      (gameState as any).virusDefeated = true;
    }
    this.startFade(victory ? "white" : "black", 0, 1, () => {
      sceneManager.goto("overworld");
    });
  }

  // --- Phrases aléatoires entre les phases d'attaque (40% de chance) ---
  private maybeStartBetweenPhrase(onDone: () => void): void {
    if (Math.random() < BETWEEN_PHASE_CHANCE) {
      const text = BETWEEN_PHASE_LINES[Math.floor(Math.random() * BETWEEN_PHASE_LINES.length)];
      this.phase = "betweenPhrase";
      this.dialogue.start([{ speaker: "Virus", text }], onDone);
      this.playCri();
    } else {
      onDone();
    }
  }

  private clearAllAttackEntities(): void {
    this.projectiles = [];
    this.horses = [];
    this.asterisks = [];
    this.wormTags = [];
    this.spywareTags = [];
    this.skullLasers = [];
    this.dinoBars = [];
    this.rotatingSkulls = [];
    this.cssCommandText = null;
  }

  private startNextAttack(): void {
    if (this.attacksUsed >= MAX_ATTACKS) {
      this.attacksUsed = 0; // les attaques se répètent après le dixième pattern
    }
    const index = this.attacksUsed;
    this.attacksUsed++;
    this.phase = "attack";
    this.phaseTimer = 0;
    this.clearAllAttackEntities();

    const attacks = [
      () => this.attackTrojanTags(),        // 1. balises trojan
      () => this.attackHorseHeads(),        // 2. têtes de chevaux pixel
      () => this.attackRansomware(),        // 3. ransomware
      () => this.attackWorm(),              // 4. worm
      () => this.attackDdos(),              // 5. DDOS
      () => this.attackSpyware(),           // 6. spyware
      () => this.attackSkullLasersGrid(),   // 7. crânes lasers grille
      () => this.attackDinoFlappy(),        // 8. dino/flappy
      () => this.attackKeyloggerRain(),     // 9. pluie + keylogger
      () => this.attackRotatingSkulls(),    // 10. crânes tournants
    ];
    attacks[index % attacks.length]();
  }

  private endAttack(): void {
    this.clearAllAttackEntities();
    this.heartGrounded = false;
    this.axisLock = "none";
    this.boxScale = 1;
    this.speedMultiplier = 1;
    this.heartColor = "red";
    this.dotTicksLeft = 0;
    this.recomputeBoxLayout();
    this.heartX = Math.max(this.boxX + this.HEART_SIZE / 2, Math.min(this.boxX + this.boxW - this.HEART_SIZE / 2, this.heartX));
    this.heartY = Math.max(this.boxY + this.HEART_SIZE / 2, Math.min(this.boxY + this.boxH - this.HEART_SIZE / 2, this.heartY));
    this.maybeStartBetweenPhrase(() => this.startPlayerTurn());
  }

  // ============================================================
  // HELPERS DE SPAWN
  // ============================================================

  private spawnTag(x: number, y: number, vx: number, vy: number, bad: boolean, isTrojan = false, isBig = false): void {
    let text: string;
    if (isTrojan) {
      text = TROJAN_TAG;
    } else {
      const pool = bad ? ALL_TAGS_BAD : ALL_TAGS_GOOD;
      text = pool[Math.floor(Math.random() * pool.length)];
    }
    this.projectiles.push({
      isTag: true, bad, isTrojan, isBig, text, x, y, vx, vy,
      scale: isBig ? 1.25 : 1, done: false,
    });
  }

  private checkTagCollision(p: Projectile): void {
    if (p.done) return;
    const hitRadius = (this.HEART_SIZE + 6) / 2 * p.scale + 4;
    const dist = Math.hypot(p.x - this.heartX, p.y - this.heartY);
    if (dist < hitRadius) {
      p.done = true;
      if (p.bad) {
        this.score += SCORE_BAD;
        this.hp = Math.max(0, this.hp - TAG_DMG_BAD);
        this.triggerShake(0.3, 6);
        this.playCri();
        if (this.hp <= 0) this.triggerGameOver();
      } else {
        this.score += SCORE_GOOD;
        if (p.isBig) {
          // trojan bien formé mais gros : inflige 1 PV/s pendant 6s au contact
          this.dotTicksLeft = 6;
          this.dotTimer = 0;
        }
      }
    }
  }

  private updateDot(dt: number): void {
    if (this.dotTicksLeft <= 0) return;
    this.dotTimer += dt;
    if (this.dotTimer >= 1) {
      this.dotTimer -= 1;
      this.dotTicksLeft--;
      this.hp = Math.max(0, this.hp - 1);
      this.triggerShake(0.15, 3);
      if (this.hp <= 0) this.triggerGameOver();
    }
  }

  // ============================================================
  // ATTAQUE 1 : BALISES "TROJAN"
  // Mal formées => dégâts. Bien formées => score.
  // 25% des bonnes sont 25% plus grosses : au contact, DOT 1PV/s x 6s.
  // ============================================================

  private trojanRainTimer = 0;

  private attackTrojanTags(): void {
    this.attackDuration = 16;
    this.trojanRainTimer = 0;
    this.cssCommandText = "<trojan> — payload actif";
  }

  private updateTrojanTags(dt: number): void {
    this.trojanRainTimer += dt;
    if (this.trojanRainTimer >= 0.45 && this.phaseTimer < this.attackDuration - 1) {
      this.trojanRainTimer = 0;
      const x = this.boxX + Math.random() * this.boxW;
      const bad = Math.random() < 0.45;
      const isBig = !bad && Math.random() < 0.25;
      this.spawnTag(x, this.boxY - 20, 0, 45 + Math.random() * 25, bad, true, isBig);
    }
    for (const p of this.projectiles) {
      if (p.done) continue;
      p.y += p.vy * dt * this.speedMultiplier;
      this.checkTagCollision(p);
      if (p.y > this.boxY + this.boxH + 30) p.done = true;
    }
    this.projectiles = this.projectiles.filter(p => !p.done);
    this.updateDot(dt);
    if (this.phaseTimer >= this.attackDuration && this.projectiles.length === 0) this.endAttack();
  }

  // ============================================================
  // ATTAQUE 2 : TÊTES DE CHEVAUX PIXEL
  // Traversent la box depuis les côtés en mouvement de balancier,
  // à grande vitesse, pendant plusieurs secondes.
  // ============================================================

  private horseSpawnTimer = 0;

  private attackHorseHeads(): void {
    this.attackDuration = 12;
    this.horseSpawnTimer = 0;
    this.cssCommandText = null;
  }

  private spawnHorse(): void {
    const side: "left" | "right" = Math.random() < 0.5 ? "left" : "right";
    const baseY = this.boxY + this.boxH * (0.2 + Math.random() * 0.6);
    this.horses.push({
      x: side === "left" ? this.boxX - 40 : this.boxX + this.boxW + 40,
      y: baseY,
      baseY,
      side,
      speed: 260 + Math.random() * 80,
      swingT: Math.random() * Math.PI * 2,
      active: true,
      done: false,
    });
  }

  private updateHorseHeads(dt: number): void {
    this.horseSpawnTimer += dt;
    if (this.horseSpawnTimer >= 0.9 && this.phaseTimer < this.attackDuration - 1) {
      this.horseSpawnTimer = 0;
      this.spawnHorse();
    }

    for (const h of this.horses) {
      if (h.done) continue;
      const dir = h.side === "left" ? 1 : -1;
      h.x += dir * h.speed * dt;
      h.swingT += dt * 6;
      h.y = h.baseY + Math.sin(h.swingT) * 26;

      const dist = Math.hypot(h.x - this.heartX, h.y - this.heartY);
      if (dist < (this.HEART_SIZE + 20) / 2 + 6) {
        h.done = true;
        this.hp = Math.max(0, this.hp - TAG_DMG_BAD);
        this.triggerShake(0.35, 7);
        this.playCri();
        if (this.hp <= 0) this.triggerGameOver();
      }
      if (h.x < this.boxX - 60 || h.x > this.boxX + this.boxW + 60) h.done = true;
    }
    this.horses = this.horses.filter(h => !h.done);

    if (this.phaseTimer >= this.attackDuration && this.horses.length === 0) this.endAttack();
  }

  private renderHorseHead(ctx: CanvasRenderingContext2D, h: HorseHead): void {
    // Tête de cheval en pixel art (petite grille de blocs)
    const px = 3; // taille d'un "pixel"
    ctx.save();
    ctx.translate(h.x, h.y);
    if (h.side === "right") ctx.scale(-1, 1);

    // Palette
    const dark = "#2b1b12";
    const mid  = "#5a3b24";
    const light = "#8a6a4a";
    const eye = "#e8e8e8";
    const mane = "#1a1a1a";

    // grille simplifiée d'une tête de cheval de profil (12x10)
    const grid: string[] = [
      "....mmmm....",
      "...m8888m...",
      "..m888888m..",
      ".m88888888..",
      "m8888888888.",
      "m888e888888.",
      ".m88888888..",
      "..m8dd88m...",
      "...mdddm....",
      "....mddm....",
    ];
    const colorMap: Record<string, string> = { "8": mid, "d": dark, "e": eye, "m": mane };
    for (let row = 0; row < grid.length; row++) {
      const line = grid[row];
      for (let col = 0; col < line.length; col++) {
        const c = line[col];
        if (c === ".") continue;
        ctx.fillStyle = colorMap[c] ?? light;
        ctx.fillRect((col - line.length / 2) * px, (row - grid.length / 2) * px, px, px);
      }
    }
    ctx.restore();
  }

  // ============================================================
  // ATTAQUE 3 : RANSOMWARE
  // "FILES_ENCRYPTED.LOCKED" apparaît, puis des * attaquent au hasard.
  // Le joueur ne peut se déplacer que sur un seul axe (aléatoire).
  // ============================================================

  private attackRansomware(): void {
    this.attackDuration = 14;
    this.ransomTextTimer = 2; // affichage du texte pendant 2s avant le début des tirs
    this.ransomSpawnTimer = 0;
    this.axisLock = Math.random() < 0.5 ? "horizontal" : "vertical";
    this.cssCommandText = null;
  }

  private updateRansomware(dt: number): void {
    if (this.ransomTextTimer > 0) {
      this.ransomTextTimer -= dt;
      this.cssCommandText = "FILES_ENCRYPTED.LOCKED";
      return;
    }
    this.cssCommandText = `AXE VERROUILLÉ : ${this.axisLock === "horizontal" ? "HORIZONTAL" : "VERTICAL"}`;

    this.ransomSpawnTimer += dt;
    if (this.ransomSpawnTimer >= 0.18 && this.phaseTimer < this.attackDuration - 1) {
      this.ransomSpawnTimer = 0;
      // tir depuis un point aléatoire du pourtour, direction aléatoire vers l'intérieur
      const side = Math.floor(Math.random() * 4);
      let x = 0, y = 0;
      if (side === 0) { x = this.boxX + Math.random() * this.boxW; y = this.boxY - 15; }
      else if (side === 1) { x = this.boxX + Math.random() * this.boxW; y = this.boxY + this.boxH + 15; }
      else if (side === 2) { x = this.boxX - 15; y = this.boxY + Math.random() * this.boxH; }
      else { x = this.boxX + this.boxW + 15; y = this.boxY + Math.random() * this.boxH; }

      const targetX = this.boxX + Math.random() * this.boxW;
      const targetY = this.boxY + Math.random() * this.boxH;
      const dx = targetX - x, dy = targetY - y;
      const len = Math.hypot(dx, dy) || 1;
      const speed = 130 + Math.random() * 70;
      this.asterisks.push({ x, y, vx: (dx / len) * speed, vy: (dy / len) * speed, life: 4, done: false });
    }

    for (const a of this.asterisks) {
      if (a.done) continue;
      a.x += a.vx * dt;
      a.y += a.vy * dt;
      a.life -= dt;
      const dist = Math.hypot(a.x - this.heartX, a.y - this.heartY);
      if (dist < (this.HEART_SIZE + 8) / 2 + 4) {
        a.done = true;
        this.hp = Math.max(0, this.hp - TAG_DMG_BAD);
        this.triggerShake(0.3, 6);
        this.playCri();
        if (this.hp <= 0) this.triggerGameOver();
      }
      if (a.life <= 0 || a.x < this.boxX - 60 || a.x > this.boxX + this.boxW + 60 || a.y < this.boxY - 60 || a.y > this.boxY + this.boxH + 60) {
        a.done = true;
      }
    }
    this.asterisks = this.asterisks.filter(a => !a.done);

    if (this.phaseTimer >= this.attackDuration && this.asterisks.length === 0) this.endAttack();
  }

  // ============================================================
  // ATTAQUE 4 : WORM
  // Une balise mal orthographiée apparaît au centre, se scinde en 2,
  // qui se scindent chacune en 2, etc. pendant 10 secondes.
  // ============================================================

  private wormMisspelled = ["<wrom>", "<wrm0>", "<w0rm>", "<worrm>"];
  private wormSplitInterval = 1.6;
  private wormSplitTimerGlobal = 0;

  private attackWorm(): void {
    this.attackDuration = 10;
    this.wormSplitTimerGlobal = 0;
    this.cssCommandText = "processus répliqué...";
    this.wormTags = [{
      x: this.boxX + this.boxW / 2,
      y: this.boxY + this.boxH / 2,
      vx: 0, vy: 0,
      gen: 0,
      splitTimer: this.wormSplitInterval,
      done: false,
    }];
  }

  private updateWorm(dt: number): void {
    this.wormSplitTimerGlobal += dt;

    const toAdd: WormTag[] = [];
    for (const w of this.wormTags) {
      if (w.done) continue;

      if (w.vx === 0 && w.vy === 0) {
        // toujours au centre, se dirige progressivement vers le joueur au fil du temps
        const dx = this.heartX - w.x, dy = this.heartY - w.y;
        const len = Math.hypot(dx, dy) || 1;
        w.vx = (dx / len) * (40 + w.gen * 12);
        w.vy = (dy / len) * (40 + w.gen * 12);
      }
      w.x += w.vx * dt;
      w.y += w.vy * dt;

      w.splitTimer -= dt;
      if (w.splitTimer <= 0 && this.phaseTimer < this.attackDuration - 1.5 && w.gen < 5) {
        w.done = true; // le parent disparaît, remplacé par 2 copies
        for (let i = 0; i < 2; i++) {
          const angle = Math.random() * Math.PI * 2;
          toAdd.push({
            x: w.x, y: w.y,
            vx: Math.cos(angle) * (50 + w.gen * 10),
            vy: Math.sin(angle) * (50 + w.gen * 10),
            gen: w.gen + 1,
            splitTimer: this.wormSplitInterval,
            done: false,
          });
        }
        continue;
      }

      const dist = Math.hypot(w.x - this.heartX, w.y - this.heartY);
      if (dist < (this.HEART_SIZE + 12) / 2 + 4) {
        w.done = true;
        this.hp = Math.max(0, this.hp - TAG_DMG_BAD);
        this.triggerShake(0.3, 6);
        this.playCri();
        if (this.hp <= 0) this.triggerGameOver();
        continue;
      }

      if (w.x < this.fullBoxX - 30 || w.x > this.fullBoxX + this.fullBoxW + 30 ||
          w.y < this.fullBoxY - 30 || w.y > this.fullBoxY + this.fullBoxH + 30) {
        w.done = true;
      }
    }
    this.wormTags = this.wormTags.filter(w => !w.done).concat(toAdd);

    if (this.phaseTimer >= this.attackDuration) {
      this.wormTags = [];
      this.endAttack();
    }
  }

  // ============================================================
  // ATTAQUE 5 : DDOS
  // Pluie de balises (dont des trojan) tellement dense que la box
  // est saturée. Un seul chemin (colonne aléatoire) reste libre.
  // ============================================================

  private ddosSpawnTimer = 0;
  private readonly DDOS_COLUMNS = 6;

  private attackDdos(): void {
    this.attackDuration = 13;
    this.ddosSpawnTimer = 0;
    const lane = Math.floor(Math.random() * this.DDOS_COLUMNS);
    this.ddosSafeLaneW = this.boxW / this.DDOS_COLUMNS;
    this.ddosSafeLaneX = this.boxX + lane * this.ddosSafeLaneW;
    this.cssCommandText = "DDOS EN COURS — trouve le chemin";
  }

  private updateDdos(dt: number): void {
    // le chemin sûr se déplace lentement pour rester "aléatoire" comme demandé
    this.ddosSpawnTimer += dt;
    if (this.ddosSpawnTimer >= 3.0 && this.phaseTimer < this.attackDuration - 2) {
      this.ddosSpawnTimer = 0;
      const lane = Math.floor(Math.random() * this.DDOS_COLUMNS);
      this.ddosSafeLaneX = this.boxX + lane * this.ddosSafeLaneW;
    }

    // spawn dense de balises tombantes, sauf dans la colonne sûre
    if (Math.random() < 0.9 && this.phaseTimer < this.attackDuration - 1.5) {
      const col = Math.floor(Math.random() * this.DDOS_COLUMNS);
      const laneX = this.boxX + col * this.ddosSafeLaneW;
      if (Math.abs(laneX - this.ddosSafeLaneX) > 1) {
        const x = laneX + this.ddosSafeLaneW / 2;
        const isTrojan = Math.random() < 0.35;
        const bad = isTrojan ? Math.random() < 0.7 : Math.random() < 0.5;
        this.spawnTag(x, this.boxY - 20, 0, 100 + Math.random() * 40, bad, isTrojan);
      }
    }

    for (const p of this.projectiles) {
      if (p.done) continue;
      p.y += p.vy * dt * this.speedMultiplier;
      this.checkTagCollision(p);
      if (p.y > this.boxY + this.boxH + 30) p.done = true;
    }
    this.projectiles = this.projectiles.filter(p => !p.done);

    if (this.phaseTimer >= this.attackDuration && this.projectiles.length === 0) this.endAttack();
  }

  private renderDdosSafeLane(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = "#2ecc71";
    ctx.fillRect(this.ddosSafeLaneX, this.boxY, this.ddosSafeLaneW, this.boxH);
    ctx.restore();
  }

  // ============================================================
  // ATTAQUE 6 : SPYWARE
  // "spyware" s'affiche, puis des balises apparaissent près du joueur
  // et le suivent. +1 balise chaque seconde pendant 15s. Total 18s.
  // ============================================================

  private attackSpyware(): void {
    this.attackDuration = 18;
    this.spywareSpawnTimer = 0;
    this.spywareSpawnCount = 0;
    this.cssCommandText = "spyware";
  }

  private updateSpyware(dt: number): void {
    if (this.phaseTimer < 1.2) {
      this.cssCommandText = "spyware";
    } else {
      this.cssCommandText = null;
    }

    if (this.spywareSpawnCount < 15 && this.phaseTimer >= 1.2) {
      this.spywareSpawnTimer += dt;
      if (this.spywareSpawnTimer >= 1.0) {
        this.spywareSpawnTimer = 0;
        this.spywareSpawnCount++;
        const angle = Math.random() * Math.PI * 2;
        const dist = 40 + Math.random() * 20;
        this.spywareTags.push({
          x: this.heartX + Math.cos(angle) * dist,
          y: this.heartY + Math.sin(angle) * dist,
          speed: 55 + Math.random() * 20,
          spawnDelay: 0,
          active: true,
          done: false,
        });
      }
    }

    for (const s of this.spywareTags) {
      if (s.done) continue;
      const dx = this.heartX - s.x, dy = this.heartY - s.y;
      const len = Math.hypot(dx, dy) || 1;
      s.x += (dx / len) * s.speed * dt;
      s.y += (dy / len) * s.speed * dt;

      if (len < (this.HEART_SIZE + 10) / 2 + 4) {
        s.done = true;
        this.hp = Math.max(0, this.hp - TAG_DMG_BAD);
        this.triggerShake(0.3, 6);
        this.playCri();
        if (this.hp <= 0) this.triggerGameOver();
      }
    }
    this.spywareTags = this.spywareTags.filter(s => !s.done);

    if (this.phaseTimer >= this.attackDuration) {
      this.spywareTags = [];
      this.endAttack();
    }
  }

  // ============================================================
  // ATTAQUE 7 : CRÂNES LASERS (QUADRILLAGE)
  // Têtes de mort pixel en dehors de la box (haut, gauche, droite).
  // Tirent en même temps -> quadrillage de lasers.
  // ============================================================

  private skullGridWaveTimer = 0;
  private skullGridWaveCount = 0;

  private attackSkullLasersGrid(): void {
    this.attackDuration = 16;
    this.skullGridWaveTimer = 0;
    this.skullGridWaveCount = 0;
    this.skullLasers = [
      { side: "top", pos: 0.5, charging: 0, firing: 0, fired: false },
      { side: "left", pos: 0.5, charging: 0, firing: 0, fired: false },
      { side: "right", pos: 0.5, charging: 0, firing: 0, fired: false },
    ];
    this.cssCommandText = null;
  }

  private updateSkullLasersGrid(dt: number): void {
    this.skullGridWaveTimer += dt;

    const CHARGE_TIME = 0.8;
    const FIRE_TIME = 0.35;
    const CYCLE = CHARGE_TIME + FIRE_TIME + 1.2;

    if (this.skullGridWaveTimer >= CYCLE && this.phaseTimer < this.attackDuration - 1.5) {
      this.skullGridWaveTimer = 0;
      this.skullGridWaveCount++;
      for (const s of this.skullLasers) {
        s.pos = 0.15 + Math.random() * 0.7;
        s.charging = CHARGE_TIME;
        s.firing = 0;
        s.fired = false;
      }
    }

    for (const s of this.skullLasers) {
      if (s.charging > 0) {
        s.charging -= dt;
        if (s.charging <= 0) {
          s.charging = 0;
          s.firing = FIRE_TIME;
          s.fired = true;
          this.triggerShake(0.15, 3);
        }
      } else if (s.firing > 0) {
        s.firing -= dt;
        // collision : laser plein-écran depuis ce côté
        let hit = false;
        if (s.side === "top") {
          const laserX = this.boxX + s.pos * this.boxW;
          if (Math.abs(this.heartX - laserX) < 12) hit = true;
        } else if (s.side === "left" || s.side === "right") {
          const laserY = this.boxY + s.pos * this.boxH;
          if (Math.abs(this.heartY - laserY) < 12) hit = true;
        }
        if (hit) {
          this.hp = Math.max(0, this.hp - TAG_DMG_BAD);
          this.triggerShake(0.3, 6);
          this.playCri();
          s.firing = 0; // un seul dégât par tir
          if (this.hp <= 0) this.triggerGameOver();
        }
      }
    }

    if (this.phaseTimer >= this.attackDuration) {
      this.skullLasers = [];
      this.endAttack();
    }
  }

  private renderSkull(ctx: CanvasRenderingContext2D, x: number, y: number, scale = 1): void {
    const px = 3 * scale;
    ctx.save();
    ctx.translate(x, y);
    const bone = "#e8e8e8";
    const dark = "#111";
    const grid: string[] = [
      ".bbbbbb.",
      "bbbbbbbb",
      "bbdbbdbb",
      "bbdbbdbb",
      "bbbbbbbb",
      ".bdbdbd.",
      "..b..b..",
    ];
    for (let row = 0; row < grid.length; row++) {
      const line = grid[row];
      for (let col = 0; col < line.length; col++) {
        const c = line[col];
        if (c === ".") continue;
        ctx.fillStyle = c === "d" ? dark : bone;
        ctx.fillRect((col - line.length / 2) * px, (row - grid.length / 2) * px, px, px);
      }
    }
    ctx.restore();
  }

  private renderSkullLasersGrid(ctx: CanvasRenderingContext2D): void {
    for (const s of this.skullLasers) {
      let sx = 0, sy = 0;
      if (s.side === "top") { sx = this.boxX + s.pos * this.boxW; sy = this.boxY - 24; }
      if (s.side === "left") { sx = this.boxX - 24; sy = this.boxY + s.pos * this.boxH; }
      if (s.side === "right") { sx = this.boxX + this.boxW + 24; sy = this.boxY + s.pos * this.boxH; }

      this.renderSkull(ctx, sx, sy);

      if (s.charging > 0) {
        // ligne d'alerte pointillée
        ctx.save();
        ctx.strokeStyle = "rgba(255,60,60,0.5)";
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        if (s.side === "top") { ctx.moveTo(sx, this.boxY); ctx.lineTo(sx, this.boxY + this.boxH); }
        else { ctx.moveTo(this.boxX, sy); ctx.lineTo(this.boxX + this.boxW, sy); }
        ctx.stroke();
        ctx.restore();
      } else if (s.firing > 0) {
        ctx.save();
        ctx.strokeStyle = "#ff2222";
        ctx.lineWidth = 6;
        ctx.beginPath();
        if (s.side === "top") { ctx.moveTo(sx, this.boxY); ctx.lineTo(sx, this.boxY + this.boxH); }
        else { ctx.moveTo(this.boxX, sy); ctx.lineTo(this.boxX + this.boxW, sy); }
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  // ============================================================
  // ATTAQUE 8 : DINO / FLAPPY
  // Le cœur reste au sol (façon dino chrome), des barres arrivent
  // par la droite : soit à sauter, soit avec un trou façon flappy bird.
  // ============================================================

  private attackDinoFlappy(): void {
    this.attackDuration = 18;
    this.dinoSpawnTimer = 0;
    this.heartGrounded = true;
    this.heartVy = 0;
    const groundY = this.boxY + this.boxH * this.DINO_GROUND_Y_RATIO;
    this.heartY = groundY - this.HEART_SIZE / 2;
    this.cssCommandText = null;
  }

  private updateDinoFlappy(dt: number): void {
    this.dinoSpawnTimer += dt;
    if (this.dinoSpawnTimer >= 1.8 && this.phaseTimer < this.attackDuration - 2) {
      this.dinoSpawnTimer = 0;
      const isFlappyStyle = Math.random() < 0.4;
      if (isFlappyStyle) {
        const gapHeight = this.boxH * 0.28;
        const gapY = this.boxY + this.boxH * (0.15 + Math.random() * 0.45);
        this.dinoBars.push({ x: this.boxX + this.boxW + 20, width: 18, gapY, gapHeight, height: 0, done: false });
      } else {
        const height = this.boxH * (0.2 + Math.random() * 0.35);
        this.dinoBars.push({ x: this.boxX + this.boxW + 20, width: 14, gapY: null, gapHeight: 0, height, done: false });
      }
    }

    for (const b of this.dinoBars) {
      if (b.done) continue;
      b.x -= 170 * dt * this.speedMultiplier;

      const heartLeft = this.heartX - this.HEART_SIZE / 2;
      const heartRight = this.heartX + this.HEART_SIZE / 2;
      const heartTop = this.heartY - this.HEART_SIZE / 2;
      const heartBottom = this.heartY + this.HEART_SIZE / 2;
      const barLeft = b.x - b.width / 2;
      const barRight = b.x + b.width / 2;
      const overlapX = heartRight > barLeft && heartLeft < barRight;

      if (overlapX) {
        const groundY = this.boxY + this.boxH * this.DINO_GROUND_Y_RATIO;
        if (b.gapY !== null) {
          // barre flappy : sûr uniquement dans le trou
          const gapTop = b.gapY - b.gapHeight / 2;
          const gapBottom = b.gapY + b.gapHeight / 2;
          const inGap = heartTop > gapTop && heartBottom < gapBottom;
          if (!inGap) {
            this.hp = Math.max(0, this.hp - TAG_DMG_BAD);
            this.triggerShake(0.3, 6);
            this.playCri();
            b.done = true;
            if (this.hp <= 0) this.triggerGameOver();
          }
        } else {
          // barre classique : dangereuse sauf si on saute par-dessus
          const barTop = groundY - b.height;
          const isAbove = heartBottom < barTop;
          if (!isAbove) {
            this.hp = Math.max(0, this.hp - TAG_DMG_BAD);
            this.triggerShake(0.3, 6);
            this.playCri();
            b.done = true;
            if (this.hp <= 0) this.triggerGameOver();
          }
        }
      }
      if (b.x < this.boxX - 40) b.done = true;
    }
    this.dinoBars = this.dinoBars.filter(b => !b.done);

    if (this.phaseTimer >= this.attackDuration) {
      this.dinoBars = [];
      this.endAttack();
    }
  }

  private renderDinoBars(ctx: CanvasRenderingContext2D): void {
    const groundY = this.boxY + this.boxH * this.DINO_GROUND_Y_RATIO;
    ctx.strokeStyle = "rgba(255,255,255,0.3)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.boxX, groundY);
    ctx.lineTo(this.boxX + this.boxW, groundY);
    ctx.stroke();

    for (const b of this.dinoBars) {
      ctx.fillStyle = "#7ee787";
      if (b.gapY !== null) {
        const gapTop = b.gapY - b.gapHeight / 2;
        const gapBottom = b.gapY + b.gapHeight / 2;
        ctx.fillRect(b.x - b.width / 2, this.boxY, b.width, gapTop - this.boxY);
        ctx.fillRect(b.x - b.width / 2, gapBottom, b.width, groundY - gapBottom);
      } else {
        ctx.fillRect(b.x - b.width / 2, groundY - b.height, b.width, b.height);
      }
    }
  }

  // ============================================================
  // ATTAQUE 9 : PLUIE MIXTE + KEYLOGGER
  // 20% bonnes, 40% trojan, 40% mauvaises balises en pluie.
  // En parallèle : une balise "keylogger" apparaît dans la direction
  // opposée au déplacement du joueur et fonce sur lui, l'obligeant
  // à changer de direction sans arrêt.
  // ============================================================

  private mixedRainTimer = 0;
  private keyloggerSpawnCooldown = 0;

  private attackKeyloggerRain(): void {
    this.attackDuration = 16;
    this.mixedRainTimer = 0;
    this.keyloggerSpawnCooldown = 1.5;
    this.lastHeartDir = { x: 0, y: -1 };
    this.cssCommandText = "keylogger actif";
  }

  private updateKeyloggerRain(dt: number): void {
    this.mixedRainTimer += dt;
    if (this.mixedRainTimer >= 0.4 && this.phaseTimer < this.attackDuration - 1) {
      this.mixedRainTimer = 0;
      const x = this.boxX + Math.random() * this.boxW;
      const roll = Math.random();
      let bad: boolean, isTrojan: boolean;
      if (roll < 0.2) { bad = false; isTrojan = false; }        // 20% bonne
      else if (roll < 0.6) { bad = Math.random() < 0.5; isTrojan = true; } // 40% trojan
      else { bad = true; isTrojan = false; }                    // 40% mauvaise
      this.spawnTag(x, this.boxY - 20, 0, 70 + Math.random() * 30, bad, isTrojan);
    }

    for (const p of this.projectiles) {
      if (p.done) continue;
      p.y += p.vy * dt * this.speedMultiplier;
      this.checkTagCollision(p);
      if (p.y > this.boxY + this.boxH + 30) p.done = true;
    }
    this.projectiles = this.projectiles.filter(p => !p.done);

    // keylogger : pop dans la direction opposée au dernier déplacement du joueur
    this.keyloggerSpawnCooldown -= dt;
    if (this.keyloggerSpawnCooldown <= 0 && this.spywareTags.length === 0) {
      this.keyloggerSpawnCooldown = 2.2;
      const dirX = -this.lastHeartDir.x || 0;
      const dirY = -this.lastHeartDir.y || 0;
      const len = Math.hypot(dirX, dirY) || 1;
      const dist = 55;
      this.spywareTags.push({
        x: this.heartX + (dirX / len) * dist,
        y: this.heartY + (dirY / len) * dist,
        speed: 190,
        spawnDelay: 0,
        active: true,
        done: false,
      });
    }

    for (const s of this.spywareTags) {
      if (s.done) continue;
      const dx = this.heartX - s.x, dy = this.heartY - s.y;
      const len = Math.hypot(dx, dy) || 1;
      s.x += (dx / len) * s.speed * dt;
      s.y += (dy / len) * s.speed * dt;
      if (len < (this.HEART_SIZE + 10) / 2 + 4) {
        s.done = true;
        this.hp = Math.max(0, this.hp - TAG_DMG_BAD);
        this.triggerShake(0.3, 6);
        this.playCri();
        if (this.hp <= 0) this.triggerGameOver();
      }
    }
    this.spywareTags = this.spywareTags.filter(s => !s.done);

    if (this.phaseTimer >= this.attackDuration && this.projectiles.length === 0 && this.spywareTags.length === 0) {
      this.endAttack();
    }
  }

  // ============================================================
  // ATTAQUE 10 : CRÂNES TOURNANTS
  // Des crânes volent en orbite autour de la box. Quand un crâne
  // devient rouge, il tire un laser à haute vitesse vers le joueur.
  // Tirs en alternance, haute tension, pendant 20 secondes.
  // ============================================================

  private attackRotatingSkulls(): void {
    this.attackDuration = 20;
    this.skullRotTimer = 0;
    const count = 5;
    this.rotatingSkulls = [];
    for (let i = 0; i < count; i++) {
      this.rotatingSkulls.push({
        angle: (i / count) * Math.PI * 2,
        radius: Math.max(this.boxW, this.boxH) * 0.65,
        speed: 0.9,
        isRed: false,
        redTimer: 1.2 + i * 0.5, // décalage pour l'alternance
        laserFired: false,
        laserTimer: 0,
      });
    }
    this.cssCommandText = null;
  }

  private updateRotatingSkulls(dt: number): void {
    const cx = this.boxX + this.boxW / 2, cy = this.boxY + this.boxH / 2;

    for (const s of this.rotatingSkulls) {
      s.angle += s.speed * dt;
      s.redTimer -= dt;

      if (s.redTimer <= 0 && !s.isRed) {
        s.isRed = true;
        s.laserTimer = 0.5; // temps de "charge" visible avant le tir
      } else if (s.isRed && !s.laserFired) {
        s.laserTimer -= dt;
        if (s.laserTimer <= 0) {
          s.laserFired = true;
          this.triggerShake(0.2, 4);

          const sx = cx + Math.cos(s.angle) * s.radius;
          const sy = cy + Math.sin(s.angle) * s.radius;
          const dx = this.heartX - sx, dy = this.heartY - sy;
          const len = Math.hypot(dx, dy) || 1;
          // laser instantané haute vitesse : collision immédiate si aligné
          const dot = (dx / len) * (this.heartX - sx) + (dy / len) * (this.heartY - sy);
          if (dot > 0) {
            this.hp = Math.max(0, this.hp - TAG_DMG_BAD);
            this.triggerShake(0.3, 7);
            this.playCri();
            if (this.hp <= 0) this.triggerGameOver();
          }
        }
      } else if (s.isRed && s.laserFired) {
        // cooldown avant de redevenir blanc et reprendre le cycle
        s.laserTimer -= dt;
        if (s.laserTimer <= -1.0) {
          s.isRed = false;
          s.laserFired = false;
          s.redTimer = 2.0 + Math.random() * 1.5;
        }
      }
    }

    if (this.phaseTimer >= this.attackDuration) {
      this.rotatingSkulls = [];
      this.endAttack();
    }
  }

  private renderRotatingSkulls(ctx: CanvasRenderingContext2D): void {
    const cx = this.boxX + this.boxW / 2, cy = this.boxY + this.boxH / 2;
    for (const s of this.rotatingSkulls) {
      const sx = cx + Math.cos(s.angle) * s.radius;
      const sy = cy + Math.sin(s.angle) * s.radius;

      if (s.isRed && s.laserFired) {
        ctx.save();
        ctx.strokeStyle = "#ff2222";
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(this.heartX, this.heartY);
        ctx.stroke();
        ctx.restore();
      } else if (s.isRed) {
        ctx.save();
        ctx.strokeStyle = "rgba(255,60,60,0.6)";
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(this.heartX, this.heartY);
        ctx.stroke();
        ctx.restore();
      }

      ctx.save();
      ctx.translate(sx, sy);
      const px = 3;
      const bone = s.isRed ? "#ff4444" : "#e8e8e8";
      const dark = "#111";
      const grid: string[] = [
        ".bbbbbb.",
        "bbbbbbbb",
        "bbdbbdbb",
        "bbdbbdbb",
        "bbbbbbbb",
        ".bdbdbd.",
        "..b..b..",
      ];
      for (let row = 0; row < grid.length; row++) {
        const line = grid[row];
        for (let col = 0; col < line.length; col++) {
          const c = line[col];
          if (c === ".") continue;
          ctx.fillStyle = c === "d" ? dark : bone;
          ctx.fillRect((col - line.length / 2) * px, (row - grid.length / 2) * px, px, px);
        }
      }
      ctx.restore();
    }
  }

  // ============================================================
  // MOUVEMENT DU JOUEUR
  // ============================================================

  private updateHeartMovement(dt: number): void {
    const SPEED = 110;
    let dx = 0, dy = 0;
    if (this.input.isDown("ArrowLeft") || this.input.isDown("KeyQ") || this.input.isDown("KeyA")) dx = -1;
    else if (this.input.isDown("ArrowRight") || this.input.isDown("KeyD")) dx = 1;
    if (this.input.isDown("ArrowUp") || this.input.isDown("KeyW")) dy = -1;
    else if (this.input.isDown("ArrowDown") || this.input.isDown("KeyS")) dy = 1;

    // Attaque ransomware : axe unique
    if (this.axisLock === "horizontal") dy = 0;
    if (this.axisLock === "vertical") dx = 0;

    if (dx !== 0 && dy !== 0) { dx *= 0.707; dy *= 0.707; }

    if (dx !== 0 || dy !== 0) {
      this.lastHeartDir = { x: dx, y: dy };
    }

    const half = (this.HEART_SIZE * 1) / 2;

    if (this.heartGrounded) {
      // Attaque dino/flappy : le cœur reste au sol, ne peut que sauter
      this.heartX = Math.max(this.boxX + half, Math.min(this.boxX + this.boxW - half, this.heartX + dx * SPEED * dt));

      const wantsJump = this.input.isDown("Space") || this.input.isDown("ArrowUp") || this.input.isDown("KeyW");
      const groundY = this.boxY + this.boxH * this.DINO_GROUND_Y_RATIO - half;
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

  // ============================================================
  // BOUCLE PRINCIPALE
  // ============================================================

  update(dt: number): void {
    this.updateFade(dt);
    if (this.shakeTime > 0) this.shakeTime -= dt;

    this.dialogue.update(dt);
    const advancePressed = this.input.wasPressed("KeyZ") || this.input.wasPressed("Enter");
    if (this.dialogue.active && advancePressed) {
      this.dialogue.advance();
      return;
    }

    this.repositionTooltip();

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
    switch (index % 10) {
      case 0: this.updateTrojanTags(dt); break;
      case 1: this.updateHorseHeads(dt); break;
      case 2: this.updateRansomware(dt); break;
      case 3: this.updateWorm(dt); break;
      case 4: this.updateDdos(dt); break;
      case 5: this.updateSpyware(dt); break;
      case 6: this.updateSkullLasersGrid(dt); break;
      case 7: this.updateDinoFlappy(dt); break;
      case 8: this.updateKeyloggerRain(dt); break;
      case 9: this.updateRotatingSkulls(dt); break;
    }
  }

  // ============================================================
  // RENDU
  // ============================================================

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

    this.renderVirus(ctx);
    this.renderBox(ctx);

    const index = this.attacksUsed - 1;
    if (this.phase === "attack") {
      switch (index % 10) {
        case 4: this.renderDdosSafeLane(ctx); break; // sous les projectiles
      }
    }

    this.renderProjectiles(ctx);
    this.renderHorses(ctx);
    this.renderAsterisks(ctx);
    this.renderWormTags(ctx);
    this.renderSpywareTags(ctx);

    if (this.phase === "attack") {
      switch (index % 10) {
        case 6: this.renderSkullLasersGrid(ctx); break;
        case 7: this.renderDinoBars(ctx); break;
        case 9: this.renderRotatingSkulls(ctx); break;
      }
    }

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

  private renderVirus(ctx: CanvasRenderingContext2D): void {
    const cx = this.virusX, cy = this.virusY;
    ctx.imageSmoothingEnabled = false;
    if (this.virusSprite) {
      ctx.drawImage(this.virusSprite, cx - VIRUS_DISPLAY_W / 2, cy - VIRUS_DISPLAY_H / 2, VIRUS_DISPLAY_W, VIRUS_DISPLAY_H);
    } else {
      ctx.fillStyle = "#1a2e1a";
      ctx.fillRect(cx - 35, cy - 45, 70, 80);
      ctx.fillStyle = "#7ee787";
      ctx.font = "10px monospace";
      ctx.textAlign = "center";
      ctx.fillText("VIRUS (placeholder)", cx, cy + 55);
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
      ctx.save();
      ctx.font = `bold ${Math.round(13 * p.scale)}px 'Courier New', monospace`;
      ctx.fillStyle = p.isTrojan ? "#ff8c00" : (p.bad ? "#ff5555" : "#e0e0e0");
      ctx.fillText(p.text, p.x - ctx.measureText(p.text).width / 2, p.y);
      ctx.restore();
    }
  }

  private renderHorses(ctx: CanvasRenderingContext2D): void {
    for (const h of this.horses) {
      this.renderHorseHead(ctx, h);
    }
  }

  private renderAsterisks(ctx: CanvasRenderingContext2D): void {
    ctx.font = "bold 16px 'Courier New', monospace";
    ctx.fillStyle = "#ff4444";
    for (const a of this.asterisks) {
      ctx.fillText("*", a.x - 5, a.y + 5);
    }
  }

  private renderWormTags(ctx: CanvasRenderingContext2D): void {
    ctx.font = "bold 12px 'Courier New', monospace";
    ctx.fillStyle = "#ff66aa";
    for (const w of this.wormTags) {
      const text = this.wormMisspelled[w.gen % this.wormMisspelled.length];
      ctx.fillText(text, w.x - ctx.measureText(text).width / 2, w.y);
    }
  }

  private renderSpywareTags(ctx: CanvasRenderingContext2D): void {
    ctx.font = "bold 12px 'Courier New', monospace";
    ctx.fillStyle = "#ffcc00";
    for (const s of this.spywareTags) {
      ctx.fillText("<spy>", s.x - 16, s.y);
    }
  }

  private renderHeart(ctx: CanvasRenderingContext2D): void {
    const s = this.HEART_SIZE;
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
    const obx = this.virusX - obw / 2, oby = this.virusY - VIRUS_DISPLAY_H / 2 - 20;
    ctx.fillStyle = "#333";
    ctx.fillRect(obx, oby, obw, obh);
    ctx.fillStyle = "#7ee787";
    ctx.fillRect(obx, oby, obw * Math.max(0, this.virusHp / VIRUS_MAX_HP), obh);
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
      ctx.fillText(this.rhythmPerfect ? "CRITIQUE ! (×2)" : "OK", this.viewportW / 2, by - 12);
      ctx.textAlign = "left";
    }
  }
}
