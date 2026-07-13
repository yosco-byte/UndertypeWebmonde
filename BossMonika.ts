import { Scene, sceneManager } from "./SceneManager";
import { Input } from "./Input";
import { assets } from "./AssetLoader";
import { DialogueLine } from "./DialogueBox";
import { gameState } from "./GameState";



const PLAYER_NAME    = "Psin";
const PLAYER_LV      = 1;
const PLAYER_MAX_HP  = 20;

const MONIKA_SPRITE_URL = "assets/sprites/Monika_boss.png";
const HEART_SPRITE_URL  = "assets/sprites/heart.png";
const MONIKA_DISPLAY_W  = 80;
const MONIKA_DISPLAY_H  = 140;

const BOSS_MUSIC_URL    = "public/assets/music/BossMonika.mp3";
const BOSS_MUSIC_VOLUME = 0.6;



const ALL_TAGS: { text: string; bad: boolean }[] = [
  { text: "<div",   bad: true  },   
  { text: "<p>>",   bad: true  },   
  { text: "<<span>",bad: true  },   
  { text: "</br/>", bad: true  },   
  { text: "<html>>",bad: true  },   
  { text: "<p>",    bad: false },   
  { text: "<div>",  bad: false },   
  { text: "</p>",   bad: false },   
  { text: "<span>", bad: false },   
  { text: "</div>", bad: false },   
];

const SCORE_GOOD  =  500;   
const SCORE_BAD   = -1000;  
const DMG_BAD     = 3;      


const MONIKA_MAX_HITS = 10;


// --- Attaque 3 : FLEUR ---
const FLEUR_WORD               = "FLEUR";
const FLEUR_HASH                = "#";
const FLEUR_CONVERGE_DURATION   = 0.9;  
const FLEUR_DISPLAY_DURATION    = 0.5;  
const FLEUR_DESCEND_DURATION    = 1.1; 
const FLEUR_STAR_COUNT          = 14;   
const FLEUR_STAR_SPEED          = 150;
const FLEUR_STAR_LIFETIME       = 2.2;
const FLEUR_END_DELAY           = 0.4;  


const DIALOGUE_INTRO: DialogueLine[] = [
  { speaker: "Monika", text: "Tu veux partir à ce point ?" },
];

const DIALOGUE_AFTER_ATK1: DialogueLine[] = [];

const DIALOGUE_AFTER_ATK2: DialogueLine[] = [];

const DIALOGUE_AFTER_ATK3: DialogueLine[] = [];

const DIALOGUE_INSPECT: DialogueLine[] = [
  { speaker: "Système", text: 'if (action.isSelected(Menu.ANALYZE)) {' },
  { speaker: "Système", text: '  Memory goodMemory = player.recallSharedMemoriesWith(boss);' },
  { speaker: "Système", text: '  if (goodMemory != null) { boss.reduceHostility(); }' },
  { speaker: "Système", text: '  System.out.println; }' },
];


const MISSPELLED_TAGS_BAD: string[] = [
  "<dvi>",
  "<spn>",
  "</hmtl>",
  "<bdoy>",
  "<inptu>",
  "</tabel>",
  "<butotn>",
  "<imge>",
  "</dvi>",
  "<hrefe>",
];

const MISSPELLED_TAGS_GOOD: string[] = [
  "<p>",
  "<div>",
  "</p>",
  "<span>",
  "</div>",
];

const ATK4_DURATION            = 15;
const ATK4_SPAWN_INTERVAL      = 0.55;
const ATK4_GOOD_CHANCE         = 0.3;   
const ATK4_SURPRISE_CHANCE     = 0.35;  
const ATK4_SURPRISE_SCALE      = 2;    
const ATK4_SURPRISE_MIN_DELAY  = 0.4;   
const ATK4_SURPRISE_MAX_DELAY  = 1.4;  


const DIALOGUE_AFTER_ATK4: DialogueLine[] = [];


const DIALOGUE_VICTORY: DialogueLine[] = [];

const DIALOGUE_GAMEOVER: DialogueLine[] = [
  { speaker: "Monika", text: "Je suis désolé, mon ami... Nous nous reverrons." },
];


type Phase =
  | "fadeIn"
  | "dialogueIntro"
  | "attack1"         
  | "dialogueAfterAtk1"
  | "playerTurn"       
  | "fightRhythm"      
  | "actMenu"          
  | "inspectDialogue"  
  | "dialogueAfterAct"
  | "attack2"          
  | "dialogueAfterAtk2"
  | "attack3"          
  | "dialogueAfterAtk3"
  | "attack4"          
  | "dialogueAfterAtk4"
  | "playerTurn2"
  | "fightRhythm2"
  | "actMenu2"
  | "inspectDialogue2"
  | "victory"
  | "gameOver"
  | "fadeOutWhite";


interface FleurStar {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  done: boolean;
}


interface MisspelledTag {
  text: string;
  bad: boolean;
  x: number;
  y: number;
  startX: number;
  speedY: number;
  zigzagAmp: number;
  zigzagFreq: number;
  time: number;
  scale: number;        
  surpriseAt: number;   
  surprised: boolean;   
  done: boolean;
}


interface FallingTag {
  text: string;
  bad: boolean;
  x: number;
  y: number;
  speedY: number;
  zigzagAmp: number;   
  zigzagFreq: number;  
  time: number;        
  startX: number;      
  done: boolean;
  collected: boolean;
}


interface BouncingTag {
  text: string;
  bad: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;   
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
    this.lines     = lines;
    this.lineIndex = 0;
    this.charIndex = 0;
    this.charTimer = 0;
    this.active    = true;
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
      ctx.fillText(line.speaker, x + 14, y + 20);
    }

    const displayed = line.text.slice(0, this.charIndex);
    ctx.font = "15px 'Courier New', monospace";
    ctx.fillStyle = "#fff";

    const PADDING = 14;
    const MAX_W   = w - PADDING * 2;
    const LINE_H  = 21;
    const words   = displayed.split(" ");
    let cur  = "";
    let lineY = y + (line.speaker ? 38 : 20);

    for (const word of words) {
      const test = cur ? cur + " " + word : word;
      if (ctx.measureText(test).width > MAX_W && cur) {
        ctx.fillText(cur, x + PADDING, lineY);
        cur = word;
        lineY += LINE_H;
      } else {
        cur = test;
      }
    }
    if (cur) ctx.fillText(cur, x + PADDING, lineY);

    if (this.charIndex >= line.text.length) {
      const blink = Math.floor(Date.now() / 400) % 2 === 0;
      if (blink) {
        ctx.font = "13px 'Courier New', monospace";
        ctx.fillText("▼", x + w - 22, y + h - 8);
      }
    }
  }
}



export class BossMonika implements Scene {

  
  private hp    = PLAYER_MAX_HP;
  private score = 0;

  
  private boxX!: number;
  private boxY!: number;
  private readonly boxW = 225;
  private readonly boxH = 225;

  
  private heartX = 0;
  private heartY = 0;
  private readonly HEART_SIZE = 16;
  private heartSprite: HTMLImageElement | null = null;

 
  private monikaSprite: HTMLImageElement | null = null;
  private monikaX = 0;
  private monikaY = 0;
  private monikaHitsLeft = MONIKA_MAX_HITS;  

  private bossMusic: HTMLAudioElement | null = null;

  
  private fallingTags: FallingTag[] = [];
  private atk1Timer = 0;
  private atk1SpawnTimer = 0;
  private readonly ATK1_DURATION = 15;  
  private readonly SPAWN_INTERVAL = 0.6; 
  
  private bouncingTags: BouncingTag[] = [];
  private atk2Timer = 0;
  private readonly ATK2_DURATION  = 10;
  private readonly BOUNCE_SPAWN_INTERVAL = 0.5;
  private atk2SpawnTimer = 0;

  
  private fleurSubPhase: "converge" | "display" | "descend" | "explode" | "done" = "converge";
  private fleurTimer = 0;
  private fleurTargetX = 0;
  private fleurTargetY = 0;     
  private fleurWordX = 0;        
  private fleurHashX = 0;        
  private fleurCurrentY = 0;     
  private fleurStars: FleurStar[] = [];

  
  private misspelledTags: MisspelledTag[] = [];
  private atk4Timer = 0;
  private atk4SpawnTimer = 0;

  
  private attackIndex = -1;

  
  private rhythmBarPos   = 0;       
  private rhythmBarDir   = 1;      
  private readonly RHYTHM_SPEED = 0.8;  
  private rhythmHit      = false;   
  private rhythmPerfect  = false;  
  private rhythmResultTimer = 0;   

 
  private actSelected = 0;        
  private menuSelected = 0;          
  private readonly ACT_OPTIONS = ["Parler", "Inspecter l'élément"];


  private phase: Phase = "fadeIn";

  
  private fadeAlpha  = 1;
  private _fadeTarget = 0;
  private fadeSpeed  = 2;
  private fadeColor: "black" | "white" = "black";
  private fadeDoneCallback?: () => void;

  
  private shakeTime      = 0;
  private shakeIntensity = 0;

  
  private dialogue = new BattleDialogue();

  constructor(
    private readonly input: Input,
    private readonly viewportW: number,
    private readonly viewportH: number,
  ) {}



  onEnter(): void {
    this.boxX = (this.viewportW - this.boxW) / 2;
    this.boxY = this.viewportH * 0.32;

    this.heartX = this.boxX + this.boxW / 2;
    this.heartY = this.boxY + this.boxH / 2;

    this.monikaX = this.viewportW / 2;
    this.monikaY = this.boxY;

    this.hp             = PLAYER_MAX_HP;
    this.score          = 0;
    this.monikaHitsLeft = MONIKA_MAX_HITS;
    this.phase          = "fadeIn";
    this.fadeAlpha      = 1;
    this.fadeColor      = "black";
    this.attackIndex    = -1;

    assets.load(MONIKA_SPRITE_URL).then(img => { this.monikaSprite = img; });
    assets.load(HEART_SPRITE_URL).then(img  => { this.heartSprite  = img; });

    this.bossMusic = new Audio(BOSS_MUSIC_URL);
    this.bossMusic.loop = true;
    this.bossMusic.volume = BOSS_MUSIC_VOLUME;
    this.bossMusic.play().catch(() => {});

   
    this.startFade("black", 1, 0, () => {
      this.phase = "dialogueIntro";
      this.dialogue.start(DIALOGUE_INTRO, () => this.startAttack1());
    });
  }

  onExit(): void {
    this.stopMusic();
  }

  private stopMusic(): void {
    if (this.bossMusic) {
      this.bossMusic.pause();
      this.bossMusic.currentTime = 0;
      this.bossMusic = null;
    }
  }



  private startFade(color: "black"|"white", from: number, to: number, onComplete?: () => void): void {
    this.fadeColor  = color;
    this.fadeAlpha  = from;
    this.fadeSpeed  = 2.5;
    this._fadeTarget = to;
    this.fadeDoneCallback = onComplete;
  }

  private updateFade(dt: number): void {
    if (this.fadeAlpha === this._fadeTarget) return;
    const dir = this._fadeTarget > this.fadeAlpha ? 1 : -1;
    this.fadeAlpha += dir * this.fadeSpeed * dt;
    if ((dir > 0 && this.fadeAlpha >= this._fadeTarget) ||
        (dir < 0 && this.fadeAlpha <= this._fadeTarget)) {
      this.fadeAlpha = this._fadeTarget;
      const cb = this.fadeDoneCallback;
      this.fadeDoneCallback = undefined;
      cb?.();
    }
  }

  

  private triggerShake(duration: number, intensity: number): void {
    this.shakeTime      = duration;
    this.shakeIntensity = intensity;
  }



  private startAttack1(): void {
    this.phase         = "attack1";
    this.atk1Timer     = 0;
    this.atk1SpawnTimer = 0;
    this.fallingTags   = [];
    this.heartX = this.boxX + this.boxW / 2;
    this.heartY = this.boxY + this.boxH / 2;
  }

  private spawnFallingTag(): void {
    const entry = ALL_TAGS[Math.floor(Math.random() * ALL_TAGS.length)];
    const startX = this.boxX + 20 + Math.random() * (this.boxW - 40);
    this.fallingTags.push({
      text:       entry.text,
      bad:        entry.bad,
      x:          startX,
      y:          this.boxY - 10,
      speedY:     60 + Math.random() * 40,
      zigzagAmp:  20 + Math.random() * 20,
      zigzagFreq: 2 + Math.random() * 2,
      time:       0,
      startX,
      done:       false,
      collected:  false,
    });
  }

  private updateAttack1(dt: number): void {
    this.atk1Timer      += dt;
    this.atk1SpawnTimer += dt;

    if (this.atk1SpawnTimer >= this.SPAWN_INTERVAL) {
      this.atk1SpawnTimer = 0;
      this.spawnFallingTag();
    }

    for (const tag of this.fallingTags) {
      if (tag.done) continue;
      tag.time += dt;
      tag.y    += tag.speedY * dt;
      tag.x     = tag.startX + Math.sin(tag.time * tag.zigzagFreq) * tag.zigzagAmp;

      
      if (tag.y > this.boxY + this.boxH + 10) {
        tag.done = true;
        continue;
      }
      
      tag.x = Math.max(this.boxX + 5, Math.min(this.boxX + this.boxW - 5, tag.x));

     
      const dist = Math.hypot(tag.x - this.heartX, tag.y - this.heartY);
      if (dist < this.HEART_SIZE) {
        tag.done      = true;
        tag.collected = true;
        if (tag.bad) {
          this.hp    = Math.max(0, this.hp - DMG_BAD);
          this.score += SCORE_BAD;
          this.triggerShake(0.35, 7);
          if (this.hp <= 0) this.triggerGameOver();
        } else {
          this.score += SCORE_GOOD;
        }
      }
    }

    this.fallingTags = this.fallingTags.filter(t => !t.done);

   
    if (this.atk1Timer >= this.ATK1_DURATION) {
      this.fallingTags = [];
      this.phase = "dialogueAfterAtk1";
      this.dialogue.start(DIALOGUE_AFTER_ATK1, () => this.startPlayerTurn());
    }
  }



  private startPlayerTurn(second = false): void {
    this.phase = second ? "playerTurn2" : "playerTurn";
    this.menuSelected = 0;
  }



  private startFightRhythm(second = false): void {
    this.phase          = second ? "fightRhythm2" : "fightRhythm";
    this.rhythmBarPos   = 0;
    this.rhythmBarDir   = 1;
    this.rhythmHit      = false;
    this.rhythmPerfect  = false;
    this.rhythmResultTimer = 0;
  }

  private updateFightRhythm(dt: number, second = false): void {
    if (this.rhythmHit) {
      this.rhythmResultTimer -= dt;
      if (this.rhythmResultTimer <= 0) {
       
        const dmg = this.rhythmPerfect ? 3 : 1;
        this.monikaHitsLeft -= dmg;
        this.triggerShake(0.2, this.rhythmPerfect ? 9 : 4);
        if (this.monikaHitsLeft <= 0) {
          
          this.phase = "victory";
          this.dialogue.start(DIALOGUE_VICTORY, () => this.endBattle(true));
        } else {
          this.startNextAttack();
        }
      }
      return;
    }

   
    this.rhythmBarPos += this.rhythmBarDir * this.RHYTHM_SPEED * dt;
    if (this.rhythmBarPos >= 1) { this.rhythmBarPos = 1; this.rhythmBarDir = -1; }
    if (this.rhythmBarPos <= 0) { this.rhythmBarPos = 0; this.rhythmBarDir =  1; }

    if (this.input.wasPressed("KeyZ") || this.input.wasPressed("Enter")) {
      this.rhythmHit    = true;
      
      this.rhythmPerfect = this.rhythmBarPos >= 0.485 && this.rhythmBarPos <= 0.515;
      this.rhythmResultTimer = 0.8;
    }
  }


  private startActMenu(second = false): void {
    this.phase       = second ? "actMenu2" : "actMenu";
    this.actSelected = 0;
  }

  private updateActMenu(dt: number, second = false): void {
    if (this.input.wasPressed("ArrowUp")) {
      this.actSelected = Math.max(0, this.actSelected - 1);
    }
    if (this.input.wasPressed("ArrowDown")) {
      this.actSelected = Math.min(this.ACT_OPTIONS.length - 1, this.actSelected + 1);
    }
    if (this.input.wasPressed("KeyZ") || this.input.wasPressed("Enter")) {
      if (this.actSelected === 1) {
        
        this.phase = second ? "inspectDialogue2" : "inspectDialogue";
        this.dialogue.start(DIALOGUE_INSPECT, () => {
          this.startNextAttack();
        });
      } else {
        const talkLine: DialogueLine[] = [{ speaker: "Monika", text: "test" }];
        this.dialogue.start(talkLine, () => {
          this.startNextAttack();
        });
        this.phase = second ? "inspectDialogue2" : "inspectDialogue";
      }
    }
    if (this.input.wasPressed("Escape") || this.input.wasPressed("KeyX")) {
      this.startPlayerTurn(second);
    }
  }


  private startNextAttack(): void {
    this.attackIndex = (this.attackIndex + 1) % 3;
    if (this.attackIndex === 0) {
      this.startAttack2();
    } else if (this.attackIndex === 1) {
      this.startAttack3();
    } else {
      this.startAttack4();
    }
  }

  private startAttack2(): void {
    this.phase         = "attack2";
    this.atk2Timer     = 0;
    this.atk2SpawnTimer = 0;
    this.bouncingTags  = [];
    this.heartX = this.boxX + this.boxW / 2;
    this.heartY = this.boxY + this.boxH / 2;
  }

  private spawnBouncingTag(): void {
    const entry = ALL_TAGS[Math.floor(Math.random() * ALL_TAGS.length)];
    const speed = 80 + Math.random() * 60;

    
    const side = Math.floor(Math.random() * 4);
    let sx: number, sy: number, vx: number, vy: number;

    if (side === 0) {
     
      sx = this.boxX + Math.random() * this.boxW;
      sy = this.boxY - 8;
      vx = (Math.random() - 0.5) * speed;
      vy = speed * (0.5 + Math.random() * 0.5);
    } else if (side === 1) {
    
      sx = this.boxX + Math.random() * this.boxW;
      sy = this.boxY + this.boxH + 8;
      vx = (Math.random() - 0.5) * speed;
      vy = -speed * (0.5 + Math.random() * 0.5);
    } else if (side === 2) {
   
      sx = this.boxX - 8;
      sy = this.boxY + Math.random() * this.boxH;
      vx = speed * (0.5 + Math.random() * 0.5);
      vy = (Math.random() - 0.5) * speed;
    } else {
    
      sx = this.boxX + this.boxW + 8;
      sy = this.boxY + Math.random() * this.boxH;
      vx = -speed * (0.5 + Math.random() * 0.5);
      vy = (Math.random() - 0.5) * speed;
    }

    this.bouncingTags.push({
      text: entry.text,
      bad:  entry.bad,
      x:    sx,
      y:    sy,
      vx,
      vy,
      life: 10,
      done: false,
    });
  }

  private updateAttack2(dt: number): void {
    this.atk2Timer      += dt;
    this.atk2SpawnTimer += dt;

    if (this.atk2SpawnTimer >= this.BOUNCE_SPAWN_INTERVAL) {
      this.atk2SpawnTimer = 0;
      this.spawnBouncingTag();
    }

    for (const tag of this.bouncingTags) {
      if (tag.done) continue;

      tag.x    += tag.vx * dt;
      tag.y    += tag.vy * dt;
      tag.life -= dt;

      
      if (tag.x < this.boxX + 5)              { tag.x = this.boxX + 5;              tag.vx *= -1; }
      if (tag.x > this.boxX + this.boxW - 5)  { tag.x = this.boxX + this.boxW - 5;  tag.vx *= -1; }
      if (tag.y < this.boxY + 5)              { tag.y = this.boxY + 5;              tag.vy *= -1; }
      if (tag.y > this.boxY + this.boxH - 5)  { tag.y = this.boxY + this.boxH - 5;  tag.vy *= -1; }

      if (tag.life <= 0) { tag.done = true; continue; }

     
      const dist = Math.hypot(tag.x - this.heartX, tag.y - this.heartY);
      if (dist < this.HEART_SIZE) {
        tag.done = true;
        if (tag.bad) {
          this.hp    = Math.max(0, this.hp - DMG_BAD);
          this.score += SCORE_BAD;
          this.triggerShake(0.35, 7);
          if (this.hp <= 0) this.triggerGameOver();
        } else {
          this.score += SCORE_GOOD;
        }
      }
    }

    this.bouncingTags = this.bouncingTags.filter(t => !t.done);

    if (this.atk2Timer >= this.ATK2_DURATION) {
      this.bouncingTags = [];
      this.phase = "dialogueAfterAtk2";
      this.dialogue.start(DIALOGUE_AFTER_ATK2, () => this.startPlayerTurn(true));
    }
  }


  
  private startAttack3(): void {
    this.phase = "attack3";
    this.fleurSubPhase = "converge";
    this.fleurTimer = 0;
    this.fleurStars = [];
    this.fleurTargetX = this.monikaX;
    this.fleurTargetY = this.monikaY + 16;
    this.fleurCurrentY = this.fleurTargetY;
    this.fleurWordX = this.viewportW + 60;
    this.fleurHashX = -60;
    this.heartX = this.boxX + this.boxW / 2;
    this.heartY = this.boxY + this.boxH / 2;
  }

  private spawnFleurStars(): void {
    this.fleurStars = [];
    const cx = this.boxX + this.boxW / 2;
    const cy = this.boxY + this.boxH / 2;
    for (let i = 0; i < FLEUR_STAR_COUNT; i++) {
      const angle = (Math.PI * 2 * i) / FLEUR_STAR_COUNT + Math.random() * 0.2;
      const speed = FLEUR_STAR_SPEED * (0.8 + Math.random() * 0.4);
      this.fleurStars.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: FLEUR_STAR_LIFETIME,
        done: false,
      });
    }
    this.triggerShake(0.4, 10);
  }

  private updateAttack3(dt: number): void {
    this.fleurTimer += dt;

    switch (this.fleurSubPhase) {
      case "converge": {
        const t = Math.min(1, this.fleurTimer / FLEUR_CONVERGE_DURATION);
        const startWordX = this.viewportW + 60;
        const startHashX = -60;
        this.fleurWordX = startWordX + (this.fleurTargetX - startWordX) * t;
        this.fleurHashX = startHashX + (this.fleurTargetX - startHashX) * t;
        if (t >= 1) {
          this.fleurSubPhase = "display";
          this.fleurTimer = 0;
        }
        break;
      }
      case "display": {
        if (this.fleurTimer >= FLEUR_DISPLAY_DURATION) {
          this.fleurSubPhase = "descend";
          this.fleurTimer = 0;
          this.fleurCurrentY = this.fleurTargetY;
        }
        break;
      }
      case "descend": {
        const t = Math.min(1, this.fleurTimer / FLEUR_DESCEND_DURATION);
        const boxMidY = this.boxY + this.boxH / 2;
        this.fleurCurrentY = this.fleurTargetY + (boxMidY - this.fleurTargetY) * t;
        if (t >= 1) {
          this.spawnFleurStars();
          this.fleurSubPhase = "explode";
          this.fleurTimer = 0;
        }
        break;
      }
      case "explode": {
        for (const star of this.fleurStars) {
          if (star.done) continue;
          star.x += star.vx * dt;
          star.y += star.vy * dt;
          star.life -= dt;

          if (star.x < this.boxX + 4) { star.x = this.boxX + 4; star.vx *= -1; }
          if (star.x > this.boxX + this.boxW - 4) { star.x = this.boxX + this.boxW - 4; star.vx *= -1; }
          if (star.y < this.boxY + 4) { star.y = this.boxY + 4; star.vy *= -1; }
          if (star.y > this.boxY + this.boxH - 4) { star.y = this.boxY + this.boxH - 4; star.vy *= -1; }

          if (star.life <= 0) { star.done = true; continue; }

          const dist = Math.hypot(star.x - this.heartX, star.y - this.heartY);
          if (dist < this.HEART_SIZE) {
            star.done = true;
            this.hp = Math.max(0, this.hp - DMG_BAD);
            this.score += SCORE_BAD;
            this.triggerShake(0.35, 7);
            if (this.hp <= 0) this.triggerGameOver();
          }
        }
        this.fleurStars = this.fleurStars.filter(s => !s.done);

        if (this.fleurStars.length === 0 && this.fleurTimer >= FLEUR_END_DELAY) {
          this.fleurSubPhase = "done";
        }
        break;
      }
      case "done": {
        this.fleurStars = [];
        this.phase = "dialogueAfterAtk3";
        this.dialogue.start(DIALOGUE_AFTER_ATK3, () => this.startPlayerTurn(true));
        break;
      }
    }
  }

  private startAttack4(): void {
    this.phase = "attack4";
    this.atk4Timer = 0;
    this.atk4SpawnTimer = 0;
    this.misspelledTags = [];
    this.heartX = this.boxX + this.boxW / 2;
    this.heartY = this.boxY + this.boxH / 2;
  }

  private spawnMisspelledTag(): void {
    const isGood = Math.random() < ATK4_GOOD_CHANCE;
    const pool = isGood ? MISSPELLED_TAGS_GOOD : MISSPELLED_TAGS_BAD;
    const text = pool[Math.floor(Math.random() * pool.length)];
    const startX = this.boxX + 20 + Math.random() * (this.boxW - 40);
    const willSurprise = !isGood && Math.random() < ATK4_SURPRISE_CHANCE;
    this.misspelledTags.push({
      text,
      bad: !isGood,
      x: startX,
      y: this.boxY - 10,
      startX,
      speedY: 55 + Math.random() * 35,
      zigzagAmp: 15 + Math.random() * 20,
      zigzagFreq: 1.5 + Math.random() * 2,
      time: 0,
      scale: 1,
      surpriseAt: willSurprise
        ? ATK4_SURPRISE_MIN_DELAY + Math.random() * (ATK4_SURPRISE_MAX_DELAY - ATK4_SURPRISE_MIN_DELAY)
        : -1, 
      surprised: false,
      done: false,
    });
  }

  private updateAttack4(dt: number): void {
    this.atk4Timer      += dt;
    this.atk4SpawnTimer += dt;

    if (this.atk4SpawnTimer >= ATK4_SPAWN_INTERVAL) {
      this.atk4SpawnTimer = 0;
      this.spawnMisspelledTag();
    }

    for (const tag of this.misspelledTags) {
      if (tag.done) continue;
      tag.time += dt;
      tag.y    += tag.speedY * dt;
      tag.x     = tag.startX + Math.sin(tag.time * tag.zigzagFreq) * tag.zigzagAmp;

      
      if (!tag.surprised && tag.surpriseAt >= 0 && tag.time >= tag.surpriseAt) {
        tag.surprised = true;
        tag.scale = ATK4_SURPRISE_SCALE;
        this.triggerShake(0.15, 5);
      }

      if (tag.y > this.boxY + this.boxH + 10) {
        tag.done = true;
        continue;
      }

      tag.x = Math.max(this.boxX + 5, Math.min(this.boxX + this.boxW - 5, tag.x));

    
      const dist = Math.hypot(tag.x - this.heartX, tag.y - this.heartY);
      if (dist < this.HEART_SIZE * ((tag.scale - 1) * 0.5 + 1)) {
        tag.done = true;
        if (tag.bad) {
          this.hp    = Math.max(0, this.hp - DMG_BAD);
          this.score += SCORE_BAD;
          this.triggerShake(0.35, 7);
          if (this.hp <= 0) this.triggerGameOver();
        } else {
          this.score += SCORE_GOOD;
        }
      }
    }

    this.misspelledTags = this.misspelledTags.filter(t => !t.done);

    if (this.atk4Timer >= ATK4_DURATION) {
      this.misspelledTags = [];
      this.phase = "dialogueAfterAtk4";
      this.dialogue.start(DIALOGUE_AFTER_ATK4, () => this.startPlayerTurn(true));
    }
  }

  private triggerGameOver(): void {
    this.phase = "gameOver";
    this.fallingTags = [];
    this.bouncingTags = [];
    this.fleurStars = [];
    this.misspelledTags = [];
    this.dialogue.start(DIALOGUE_GAMEOVER, () => this.endBattle(false));
  }

  private endBattle(victory = false): void {
    this.stopMusic();
    if (victory) {
      gameState.monikaDefeated = true;
    
      this.startFade("white", 0, 1, () => {
        sceneManager.goto("bossOmori");
      });
    } else {
      this.startFade("black", 0, 1, () => {
        sceneManager.goto("overworld");
      });
    }
  }

  private checkCheatCode(): void {
    if (
      this.input.isDown("KeyU") &&
      this.input.isDown("KeyI") &&
      this.input.isDown("KeyO")
    ) {
      gameState.monikaDefeated = true;
      this.startFade("white", 0, 1, () => {
        sceneManager.goto("bossOmori");
      });
    }
  }

  private updateHeartMovement(dt: number): void {
    const SPEED = 120;
    let dx = 0, dy = 0;
    if (this.input.isDown("ArrowLeft") || this.input.isDown("KeyQ") || this.input.isDown("KeyA")) dx = -1;
    else if (this.input.isDown("ArrowRight") || this.input.isDown("KeyD")) dx = 1;
    if (this.input.isDown("ArrowUp") || this.input.isDown("KeyW")) dy = -1;
    else if (this.input.isDown("ArrowDown") || this.input.isDown("KeyS")) dy = 1;
    if (dx !== 0 && dy !== 0) { dx *= 0.707; dy *= 0.707; }
    const half = this.HEART_SIZE / 2;
    this.heartX = Math.max(this.boxX + half, Math.min(this.boxX + this.boxW - half, this.heartX + dx * SPEED * dt));
    this.heartY = Math.max(this.boxY + half, Math.min(this.boxY + this.boxH - half, this.heartY + dy * SPEED * dt));
  }

  update(dt: number): void {
    this.updateFade(dt);
    if (this.shakeTime > 0) this.shakeTime -= dt;

    if (this.phase !== "fadeOutWhite") this.checkCheatCode();

    this.dialogue.update(dt);
    const advance = this.input.wasPressed("KeyZ") || this.input.wasPressed("Enter");
    if (this.dialogue.active && advance) {
      this.dialogue.advance();
      return;
    }

    switch (this.phase) {
      case "attack1":
        this.updateAttack1(dt);
        this.updateHeartMovement(dt);
        break;

      case "playerTurn":
        if (this.input.wasPressed("ArrowLeft"))  this.menuSelected = Math.max(0, this.menuSelected - 1);
        if (this.input.wasPressed("ArrowRight")) this.menuSelected = Math.min(3, this.menuSelected + 1);
        if (advance) {
          if (this.menuSelected === 0) this.startFightRhythm(false);
          else if (this.menuSelected === 1) this.startActMenu(false);
        }
        break;

      case "fightRhythm":
        this.updateFightRhythm(dt, false);
        break;

      case "actMenu":
        this.updateActMenu(dt, false);
        break;

      case "inspectDialogue":
        break; 

      case "attack2":
        this.updateAttack2(dt);
        this.updateHeartMovement(dt);
        break;

      case "attack3":
        this.updateAttack3(dt);
        this.updateHeartMovement(dt);
        break;

      case "dialogueAfterAtk3":
        break;

      case "attack4":
        this.updateAttack4(dt);
        this.updateHeartMovement(dt);
        break;

      case "dialogueAfterAtk4":
        break;

      case "playerTurn2":
        if (this.input.wasPressed("ArrowLeft"))  this.menuSelected = Math.max(0, this.menuSelected - 1);
        if (this.input.wasPressed("ArrowRight")) this.menuSelected = Math.min(3, this.menuSelected + 1);
        if (advance) {
          if (this.menuSelected === 0) this.startFightRhythm(true);
          else if (this.menuSelected === 1) this.startActMenu(true);
        }
        break;

      case "fightRhythm2":
        this.updateFightRhythm(dt, true);
        break;

      case "actMenu2":
        this.updateActMenu(dt, true);
        break;

      case "inspectDialogue2":
        break;

      default:
        break;
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    let sx = 0, sy = 0;
    if (this.shakeTime > 0) {
      sx = (Math.random() * 2 - 1) * this.shakeIntensity;
      sy = (Math.random() * 2 - 1) * this.shakeIntensity;
    }

    ctx.save();
    ctx.translate(sx, sy);

    ctx.fillStyle = "#000";
    ctx.fillRect(-20, -20, this.viewportW + 40, this.viewportH + 40);

    this.renderMonika(ctx);
    this.renderBulletBox(ctx);
    this.renderTags(ctx);
    this.renderHUD(ctx);

    const isPlayerTurn = this.phase === "playerTurn" || this.phase === "playerTurn2";
    const isActMenu    = this.phase === "actMenu"     || this.phase === "actMenu2";
    const isFight      = this.phase === "fightRhythm" || this.phase === "fightRhythm2";

    if (!this.dialogue.active) {
      if (isPlayerTurn) this.renderActionButtons(ctx);
      if (isActMenu)    this.renderActMenu(ctx);
      if (isFight)      this.renderRhythmBar(ctx);
    }

    ctx.restore();

   
    const dlgY = this.viewportH - 110;
    this.dialogue.render(ctx, 16, dlgY, this.viewportW - 32, 94);

    if (this.fadeAlpha > 0) {
      ctx.fillStyle = this.fadeColor === "black"
        ? `rgba(0,0,0,${this.fadeAlpha})`
        : `rgba(255,255,255,${this.fadeAlpha})`;
      ctx.fillRect(0, 0, this.viewportW, this.viewportH);
    }
  }



  private renderMonika(ctx: CanvasRenderingContext2D): void {
    ctx.imageSmoothingEnabled = false;
    if (this.monikaSprite) {
      ctx.drawImage(
        this.monikaSprite,
        this.monikaX - MONIKA_DISPLAY_W / 2,
        this.monikaY - MONIKA_DISPLAY_H,
        MONIKA_DISPLAY_W,
        MONIKA_DISPLAY_H
      );
    } else {
     
      ctx.fillStyle = "#fff";
      ctx.fillRect(this.monikaX - 30, this.monikaY - 80, 60, 80);
      ctx.fillStyle = "#aaa";
      ctx.font = "10px monospace";
      ctx.textAlign = "center";
      ctx.fillText("MONIKA", this.monikaX, this.monikaY + 10);
      ctx.textAlign = "left";
    }

    
    const bw = 120, bh = 10;
    const bx = this.monikaX - bw / 2;
    const by = this.monikaY - MONIKA_DISPLAY_H - 18;
    ctx.fillStyle = "#5a0000";
    ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = "#ff0000";
    ctx.fillRect(bx, by, bw * (this.monikaHitsLeft / MONIKA_MAX_HITS), bh);
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(bx, by, bw, bh);
  }

  private renderBulletBox(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = "#000";
    ctx.fillRect(this.boxX, this.boxY, this.boxW, this.boxH);
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 4;
    ctx.strokeRect(this.boxX, this.boxY, this.boxW, this.boxH);
    this.renderHeart(ctx);
  }

  private renderHeart(ctx: CanvasRenderingContext2D): void {
    const s = this.HEART_SIZE;
    if (this.heartSprite) {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(this.heartSprite, this.heartX - s / 2, this.heartY - s / 2, s, s);
      return;
    }
    ctx.fillStyle = "#ff1744";
    ctx.save();
    ctx.translate(this.heartX, this.heartY);
    ctx.beginPath();
    ctx.moveTo(0, s * 0.35);
    ctx.bezierCurveTo(-s * 0.6, -s * 0.4, -s * 0.9, s * 0.15, 0, s * 0.6);
    ctx.bezierCurveTo(s * 0.9, s * 0.15, s * 0.6, -s * 0.4, 0, s * 0.35);
    ctx.fill();
    ctx.restore();
  }

  private renderTags(ctx: CanvasRenderingContext2D): void {
    ctx.font = "bold 13px 'Courier New', monospace";

    if (this.phase === "attack1") {
      for (const tag of this.fallingTags) {
        ctx.fillStyle = "#e0e0e0";
        ctx.fillText(tag.text, tag.x - ctx.measureText(tag.text).width / 2, tag.y);
      }
    }

    if (this.phase === "attack2") {
      for (const tag of this.bouncingTags) {
        ctx.fillStyle = "#e0e0e0";
        ctx.fillText(tag.text, tag.x - ctx.measureText(tag.text).width / 2, tag.y);
      }
    }

    if (this.phase === "attack3") {
      this.renderFleurAttack(ctx);
    }

    if (this.phase === "attack4") {
      for (const tag of this.misspelledTags) {
        const fontSize = Math.round(13 * tag.scale);
        ctx.font = `bold ${fontSize}px 'Courier New', monospace`;
        ctx.fillStyle = !tag.bad ? "#7CFC9A" : (tag.surprised ? "#ff5555" : "#e0e0e0");
        ctx.fillText(tag.text, tag.x - ctx.measureText(tag.text).width / 2, tag.y);
      }
      ctx.font = "bold 13px 'Courier New', monospace";
    }
  }

  private renderFleurAttack(ctx: CanvasRenderingContext2D): void {
    ctx.textAlign = "center";

    if (this.fleurSubPhase === "converge") {
      ctx.font = "bold 20px 'Courier New', monospace";
      ctx.fillStyle = "#ffb6d9";
      ctx.fillText(FLEUR_WORD, this.fleurWordX, this.fleurTargetY);
      ctx.fillStyle = "#fff";
      ctx.fillText(FLEUR_HASH, this.fleurHashX, this.fleurTargetY);
    } else if (this.fleurSubPhase === "display") {
      ctx.font = "bold 36px 'Courier New', monospace";
      ctx.fillStyle = "#ffb6d9";
      ctx.fillText(FLEUR_WORD, this.fleurTargetX, this.fleurTargetY);
    } else if (this.fleurSubPhase === "descend") {
      ctx.font = "bold 36px 'Courier New', monospace";
      ctx.fillStyle = "#ffb6d9";
      ctx.fillText(FLEUR_WORD, this.fleurTargetX, this.fleurCurrentY);
    } else if (this.fleurSubPhase === "explode" || this.fleurSubPhase === "done") {
      ctx.font = "bold 15px 'Courier New', monospace";
      ctx.fillStyle = "#ffd700";
      for (const star of this.fleurStars) {
        ctx.fillText("★", star.x, star.y);
      }
    }

    ctx.textAlign = "left";
  }

  private renderHUD(ctx: CanvasRenderingContext2D): void {
    const hudY = this.boxY + this.boxH + 35;
    const lx   = this.boxX;

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

    ctx.font = "bold 14px 'Courier New', monospace";
    ctx.fillStyle = "#fff";
    ctx.fillText(`${this.hp} / ${PLAYER_MAX_HP}`, bx + bw + 10, hudY);

    
    ctx.font = "bold 14px 'Courier New', monospace";
    ctx.fillStyle = "#ffd700";
    ctx.textAlign = "right";
    ctx.fillText(`SCORE : ${this.score}`, this.viewportW - 16, hudY);
    ctx.textAlign = "left";
  }

  private renderActionButtons(ctx: CanvasRenderingContext2D): void {
    const btnLabels = ["FIGHT", "ACT", "ITEM", "MERCY"];
    const y   = this.viewportH - 75;
    const h   = 44;
    const gap = 10;
    const w   = (this.viewportW - 32 - gap * 3) / 4;

    btnLabels.forEach((label, i) => {
      const x = 16 + i * (w + gap);
      ctx.strokeStyle = "#ff8c00";
      ctx.lineWidth   = 3;
      ctx.strokeRect(x, y, w, h);
      ctx.fillStyle   = "#ff8c00";
      ctx.font        = "bold 15px 'Courier New', monospace";
      ctx.textAlign   = "center";

      
      const isSelected = i === this.menuSelected;
      ctx.fillStyle = isSelected ? "#fff" : "#ff8c00";
      ctx.fillText(
        (isSelected ? "❤ " : "  ") + label,
        x + w / 2 - (isSelected ? 10 : 0),
        y + h / 2 + 5
      );
    });


  }

  private renderActMenu(ctx: CanvasRenderingContext2D): void {
    const panelW = 260, panelH = 80;
    const px = (this.viewportW - panelW) / 2;
    const py = this.viewportH - panelH - 16;

    ctx.fillStyle = "#000";
    ctx.fillRect(px, py, panelW, panelH);
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.strokeRect(px, py, panelW, panelH);

    this.ACT_OPTIONS.forEach((opt, i) => {
      ctx.font      = "bold 15px 'Courier New', monospace";
      ctx.fillStyle = i === this.actSelected ? "#ffd700" : "#fff";
      ctx.fillText(
        (i === this.actSelected ? "❤ " : "  ") + opt,
        px + 16,
        py + 24 + i * 26
      );
    });


  }

  private renderRhythmBar(ctx: CanvasRenderingContext2D): void {
    const bw = 300, bh = 30;
    const bx = (this.viewportW - bw) / 2;
    const by = this.viewportH - 80;

  
    ctx.fillStyle = "#222";
    ctx.fillRect(bx, by, bw, bh);

  
    const zoneX = bx + bw * 0.485;
    const zoneW = bw * 0.03;
    ctx.fillStyle = "#cc0000";
    ctx.fillRect(zoneX, by, zoneW, bh);

    
    const curX = bx + this.rhythmBarPos * bw;
    ctx.fillStyle = "#fff";
    ctx.fillRect(curX - 2, by - 4, 4, bh + 8);

  
    ctx.strokeStyle = "#fff";
    ctx.lineWidth   = 2;
    ctx.strokeRect(bx, by, bw, bh);

    
    if (this.rhythmHit) {
      ctx.font      = "bold 18px 'Courier New', monospace";
      ctx.fillStyle = this.rhythmPerfect ? "#ffd700" : "#aaa";
      ctx.textAlign = "center";
      ctx.fillText(
        this.rhythmPerfect ? "PARFAIT ! (×3)" : "OK",
        this.viewportW / 2,
        by - 12
      );
      ctx.textAlign = "left";
}
  }
}
