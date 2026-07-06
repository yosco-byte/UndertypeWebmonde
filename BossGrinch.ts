import { Scene, sceneManager } from "./SceneManager";
import { Input } from "./Input";
import { assets } from "./AssetLoader";
import { DialogueLine } from "./DialogueBox";
import { gameState } from "./GameState";


const PLAYER_NAME = "Psin";
const PLAYER_LV = 1;
const PLAYER_MAX_HP = 20;


const GRINCH_SPRITE_URL = "assets/sprites/grinch_boss_idle.png";


const GRINCH_ANIM_SHEET_URL = "assets/sprites/grinch_boss_anim.png";
const GRINCH_ANIM_FRAME_COUNT = 4;  
const GRINCH_ANIM_FPS = 1;           


const HEART_SPRITE_URL = "assets/sprites/heart.png";


const GRINCH_DISPLAY_SIZE = 64;


const DIALOGUE_1: DialogueLine[] = [
  { speaker: "Grinch", text: "Tu vois le coeur ? C'est toi ! C'est ton âme." },
  { speaker: "Grinch", text: "C'est ça qui fait que tu n'es pas une simple machine." },
  { speaker: "Grinch", text: "Toi qui est si humain, ça veut dire que tu peux réparer le monde" },
  { speaker: "Grinch", text: "Ce monde est composé de balise, certaines sont corrompu. Tu dois les attraper pour les réparer" },
  { speaker: "Grinch", text: "Par exemple, celle-ci, attrape les." },
];
const DIALOGUE_2: DialogueLine[] = [
  { speaker: "Grinch", text: "Imbécile" },
];

const DIALOGUE_DODGED: DialogueLine[] = [
  { speaker: "Grinch", text: "Je vois...Tu es malin. Tu l'a senti... Mon envie de sang ?" },
  { speaker: "Grinch", text: "Après tout, on est pareil... POUR CA QUE TU DOIS MOURIR !" },
];
const DIALOGUE_3: DialogueLine[] = [
  { speaker: "Grinch", text: "Ici, c'est tuer ou être tué" },
  { speaker: "Grinch", text: "Comment ignorer une tel cible facile ?! Tu m'as pris pour le père Noël ?" },
];
const DIALOGUE_FINAL: DialogueLine[] = [
  { speaker: "Grinch", text: "Qu'est ce que..?" },
  { speaker: "Grinch", text: "*Il voit quelqu'un au loin.*" },
  { speaker: "Grinch", text: "NON... PAS T-..." },
];

const BAD_TAGS = ["<pp>", "</div", "<html>>", "<<span>", "</br/>", "<div"];


const ACTION_BUTTONS = ["FIGHT", "ACT", "ITEM", "MERCY"];


type Phase =
  | "fadeIn"
  | "dialogue1"
  | "attack1"
  | "dialogue2"
  | "grinchAnim"
  | "dialogue3"
  | "attackFinal"
  | "dialogueFinal"
  | "fadeOutWhite";

interface OrbitTag {
  x: number;
  y: number;
  angle: number;
  radius: number;
  orbitSpeed: number;
  state: "orbit" | "falling";
  releaseAt: number;  
  fallSpeed: number;
  done: boolean;        
}

interface ClosingTag {
  text: string;
  angle: number;    
  radius: number;     
  speed: number;
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

export class BossGrinch implements Scene {
  
  private hp = PLAYER_MAX_HP;

 
  private boxX!: number;
  private boxY!: number;
  private boxW = 200;
  private boxH = 200;

  
  private heartX = 0;
  private heartY = 0;
  private readonly HEART_SIZE = 16; 
  private heartSprite: HTMLImageElement | null = null;

  
  private grinchSprite: HTMLImageElement | null = null;
  private grinchAnimSheet: HTMLImageElement | null = null;
  
  private grinchAnimFrameW = 0;
  private grinchAnimFrameH = 0;
  private grinchX = 0;
  private grinchY = 0;
  private animFrame = 0;
  private animTimer = 0;

  
  private orbitTags: OrbitTag[] = [];
  private attack1Timer = 0;
 
  private attack1WasHit = false;
  private readonly ORBIT_RADIUS = 70;
  private readonly FALL_SPEED = 35; 

 
  private closingTags: ClosingTag[] = [];
  private closingStartRadius = 260;
  private closingReached = false;

  
  private phase: Phase = "fadeIn";
  private phaseTimer = 0;

  
  private fadeAlpha = 1;      // 1 = écran noir/blanc plein
  private fadeColor: "black" | "white" = "black";
  private fadeSpeed = 2;
  private fadeDoneCallback?: () => void;
  private _fadeTarget = 0;

 
  private shakeTime = 0;
  private shakeIntensity = 0;

  private dialogue = new BattleDialogue();

  
  private onBattleEnd?: () => void;

  constructor(
    private readonly input: Input,
    private readonly viewportW: number,
    private readonly viewportH: number,
    onBattleEnd?: () => void
  ) {
    this.onBattleEnd = onBattleEnd;
  }

  

  onEnter(): void {
    this.boxW = 100;
    this.boxH = 100;
    this.boxX = (this.viewportW - this.boxW) / 2;
    this.boxY = this.viewportH * 0.4;

    this.heartX = this.boxX + this.boxW / 2;
    this.heartY = this.boxY + this.boxH / 2;

    this.grinchX = this.viewportW / 2;
    this.grinchY = this.boxY - 90;

    this.hp = PLAYER_MAX_HP;
    this.phase = "fadeIn";
    this.phaseTimer = 0;
    this.fadeAlpha = 1;
    this.fadeColor = "black";

    
    assets.load(GRINCH_SPRITE_URL).then((img) => { this.grinchSprite = img; });
    assets.load(GRINCH_ANIM_SHEET_URL).then((img) => {
      this.grinchAnimSheet = img;
      if (img) {
       
        this.grinchAnimFrameW = Math.floor(img.naturalWidth / GRINCH_ANIM_FRAME_COUNT);
        this.grinchAnimFrameH = img.naturalHeight;

        if (img.naturalWidth % GRINCH_ANIM_FRAME_COUNT !== 0) {
          console.warn(
            `[BossGrinch] Attention : la largeur du spritesheet (${img.naturalWidth}px) ` +
            `n'est pas divisible par GRINCH_ANIM_FRAME_COUNT (${GRINCH_ANIM_FRAME_COUNT}). ` +
            `Largeur de frame utilisée : ${this.grinchAnimFrameW}px (arrondie). ` +
            `Vérifie que ton spritesheet a bien ${GRINCH_ANIM_FRAME_COUNT} frames de largeur égale.`
          );
        }
      }
    });
    assets.load(HEART_SPRITE_URL).then((img) => { this.heartSprite = img; });

  
    assets.load("assets/sprites/Monika.png");

    
    this.startFade("black", 1, 0, () => {
      this.dialogue.start(DIALOGUE_1, () => this.startAttack1());
      this.phase = "dialogue1";
    });
  }

  onExit(): void {}

  private startFade(
    color: "black" | "white",
    from: number,
    to: number,
    onComplete?: () => void
  ): void {
    this.fadeColor = color;
    this.fadeAlpha = from;
    this.fadeSpeed = 2;
    this.fadeDoneCallback = onComplete;
    this._fadeTarget = to;
  }

  private updateFade(dt: number): void {
    if (this.fadeAlpha === this._fadeTarget) return;
    const dir = this._fadeTarget > this.fadeAlpha ? 1 : -1;
    this.fadeAlpha += dir * this.fadeSpeed * dt;
    if ((dir > 0 && this.fadeAlpha >= this._fadeTarget) || (dir < 0 && this.fadeAlpha <= this._fadeTarget)) {
      this.fadeAlpha = this._fadeTarget;
      const cb = this.fadeDoneCallback;
      this.fadeDoneCallback = undefined;
      cb?.();
    }
  }

  private startAttack1(): void {
    this.phase = "attack1";
    this.attack1Timer = 0;
    this.orbitTags = [];
    this.attack1WasHit = false;

    const COUNT = 8;
    for (let i = 0; i < COUNT; i++) {
      const angle = (Math.PI * 2 * i) / COUNT;
      this.orbitTags.push({
        x: this.grinchX + Math.cos(angle) * this.ORBIT_RADIUS,
        y: this.grinchY + Math.sin(angle) * this.ORBIT_RADIUS,
        angle,
        radius: this.ORBIT_RADIUS,
        orbitSpeed: 0.7 + Math.random() * 0.3,
        state: "orbit",
      
        releaseAt: 1.0 + i * 0.5,
        fallSpeed: this.FALL_SPEED,
        done: false,
      });
    }
  }

  private updateAttack1(dt: number): void {
    this.attack1Timer += dt;

    for (const tag of this.orbitTags) {
      if (tag.done) continue;

      if (tag.state === "orbit") {
        tag.angle += tag.orbitSpeed * dt;
        tag.x = this.grinchX + Math.cos(tag.angle) * tag.radius;
        tag.y = this.grinchY + Math.sin(tag.angle) * tag.radius;

        if (this.attack1Timer >= tag.releaseAt) {
        
          tag.state = "falling";
        }
      } else {
     
        tag.y += tag.fallSpeed * dt;

        
        const dist = Math.hypot(tag.x - this.heartX, tag.y - this.heartY);
        if (dist < (this.HEART_SIZE + 10) / 2 + 4) {
          tag.done = true;
          this.onPlayerHitByTag();
          this.endAttack1();
          return; 
        }

        if (tag.y > this.viewportH + 40) {
          tag.done = true;
        }
      }
    }

    
    if (this.orbitTags.every((t) => t.done)) {
      this.endAttack1();
    }
  }

  private endAttack1(): void {
    this.orbitTags = [];
    if (this.attack1WasHit) {
         this.dialogue.start(DIALOGUE_2, () => this.startGrinchAnim());
      this.phase = "dialogue2";
    } else {
     
      this.dialogue.start(DIALOGUE_DODGED, () => this.startAttackFinal());
      this.phase = "dialogue2";
    }
  }

  
  private onPlayerHitByTag(): void {
    this.hp = 1;
    this.attack1WasHit = true;
    this.triggerShake(0.35, 6);
  }

  

  private startGrinchAnim(): void {
    this.phase = "grinchAnim";
    this.animFrame = 0;
    this.animTimer = 0;
    this.phaseTimer = 0;
  }

  private updateGrinchAnim(dt: number): void {
    if (!this.grinchAnimSheet || this.grinchAnimFrameW <= 0) {
      
      this.phaseTimer += dt;
      if (this.phaseTimer >= 1.2) this.endGrinchAnim();
      return;
    }

    this.animTimer += dt;
    const frameDuration = 1 / GRINCH_ANIM_FPS;
    if (this.animTimer >= frameDuration) {
      this.animTimer -= frameDuration;
      this.animFrame++;
      if (this.animFrame >= GRINCH_ANIM_FRAME_COUNT) {
        this.endGrinchAnim();
        return;
      }
    }
  }

  private endGrinchAnim(): void {
    this.dialogue.start(DIALOGUE_3, () => this.startAttackFinal());
    this.phase = "dialogue3";
  }

 

  private startAttackFinal(): void {
    this.phase = "attackFinal";
    this.closingReached = false;
    this.closingTags = [];
    const count = 14;
    for (let i = 0; i < count; i++) {
      this.closingTags.push({
        text: BAD_TAGS[i % BAD_TAGS.length],
        angle: (Math.PI * 2 * i) / count,
        radius: this.closingStartRadius,
        speed: 22 + Math.random() * 6, 
      });
    }
  }

  private updateAttackFinal(dt: number): void {
    let minRadius = Infinity;
    for (const tag of this.closingTags) {
      tag.radius -= tag.speed * dt;
      if (tag.radius < minRadius) minRadius = tag.radius;
    }

    const boxRadius = Math.max(this.boxW, this.boxH) / 2;
    if (!this.closingReached && minRadius <= boxRadius + 14) {
      this.triggerShake(1.0, 9);
    }

    if (minRadius <= boxRadius) {
      this.endAttackFinal();
    }
  }

  private endAttackFinal(): void {
    this.closingReached = true;
    this.triggerShake(0.6, 10);
    this.dialogue.start(DIALOGUE_FINAL, () => this.endBattle());
    this.phase = "dialogueFinal";
  }

  private endBattle(): void {
    gameState.grinchDefeated = true;
    this.startFade("white", 0, 1, () => {
      this.phase = "fadeOutWhite";
      this.onBattleEnd?.();
      sceneManager.goto("overworld");
    });
  }

  private triggerShake(duration: number, intensity: number): void {
    this.shakeTime = duration;
    this.shakeIntensity = intensity;
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
      case "attack1":
        this.updateAttack1(dt);
        this.updateHeartMovement(dt);
        break;
      case "grinchAnim":
        this.updateGrinchAnim(dt);
        break;
      case "attackFinal":
        this.updateAttackFinal(dt);
        this.updateHeartMovement(dt);
        break;
      default:
        break;
    }
  }

  
  private updateHeartMovement(dt: number): void {
    const SPEED = 110;
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

    this.renderGrinch(ctx);
    this.renderBulletBox(ctx);
    this.renderAttack1Tags(ctx);
    this.renderHUD(ctx);

    if (!this.dialogue.active) {
      this.renderActionButtons(ctx);
    }

    ctx.restore();

    
    this.dialogue.render(
      ctx,
      16,
      this.viewportH - 100,
      this.viewportW - 32,
      84
    );

    if (this.fadeAlpha > 0) {
      ctx.fillStyle = this.fadeColor === "black"
        ? `rgba(0,0,0,${this.fadeAlpha})`
        : `rgba(255,255,255,${this.fadeAlpha})`;
      ctx.fillRect(0, 0, this.viewportW, this.viewportH);
    }
  }

  private renderGrinch(ctx: CanvasRenderingContext2D): void {
    const cx = this.grinchX;
    const cy = this.grinchY;

    ctx.imageSmoothingEnabled = false;

    if (this.phase === "grinchAnim" && this.grinchAnimSheet && this.grinchAnimFrameW > 0) {
      
      const frame = Math.min(this.animFrame, GRINCH_ANIM_FRAME_COUNT - 1);
      const sx = frame * this.grinchAnimFrameW;
      const destW = GRINCH_DISPLAY_SIZE, destH = GRINCH_DISPLAY_SIZE * (this.grinchAnimFrameH / this.grinchAnimFrameW);
      ctx.drawImage(
        this.grinchAnimSheet,
        sx, 0, this.grinchAnimFrameW, this.grinchAnimFrameH,
        cx - destW / 2, cy - destH / 2,
        destW, destH
      );
    } else if (this.grinchSprite) {
      const w = GRINCH_DISPLAY_SIZE, h = GRINCH_DISPLAY_SIZE;
      ctx.drawImage(this.grinchSprite, cx - w / 2, cy - h / 2, w, h);
    } else {
      
      ctx.fillStyle = "#2e7d32";
      ctx.fillRect(cx - 30, cy - 40, 60, 70);
      ctx.fillStyle = "#1b5e20";
      ctx.beginPath();
      ctx.arc(cx, cy - 50, 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = "10px monospace";
      ctx.textAlign = "center";
      ctx.fillText("GRINCH (placeholder)", cx, cy + 50);
      ctx.textAlign = "left";
    }
  }

  private renderAttack1Tags(ctx: CanvasRenderingContext2D): void {
    if (this.phase !== "attack1") return;
    ctx.font = "bold 15px 'Courier New', monospace";
    ctx.fillStyle = "#e0e0e0";
    for (const tag of this.orbitTags) {
      if (tag.done) continue;
      ctx.fillText("<p", tag.x - 8, tag.y + 4);
    }
  }

  

  private renderBulletBox(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = "#000";
    ctx.fillRect(this.boxX, this.boxY, this.boxW, this.boxH);
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 4;
    ctx.strokeRect(this.boxX, this.boxY, this.boxW, this.boxH);

    this.renderHeart(ctx);

    
    if (this.phase === "attackFinal" || this.phase === "dialogueFinal") {
      ctx.font = "bold 13px 'Courier New', monospace";
      ctx.fillStyle = "#ff1744";
      const cx = this.boxX + this.boxW / 2;
      const cy = this.boxY + this.boxH / 2;
      for (const tag of this.closingTags) {
        const tx = cx + Math.cos(tag.angle) * tag.radius;
        const ty = cy + Math.sin(tag.angle) * tag.radius;
        ctx.fillText(tag.text, tx - 12, ty + 4);
      }
    }
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

  private renderHUD(ctx: CanvasRenderingContext2D): void {
    const hudY = this.boxY + this.boxH + 40;
    const leftX = this.boxX;

    ctx.textAlign = "left";
    ctx.font = "bold 17px 'Courier New', monospace";
    ctx.fillStyle = "#fff";
    ctx.fillText(PLAYER_NAME, leftX, hudY);
    ctx.fillText(`LV ${PLAYER_LV}`, leftX + 90, hudY);

    
    ctx.font = "bold 15px 'Courier New', monospace";
    ctx.fillText("HP", leftX + 160, hudY);

    
    const barX = leftX + 195, barY = hudY - 14, barW = 100, barH = 18;
    ctx.fillStyle = "#5a0000";
    ctx.fillRect(barX, barY, barW, barH);
    ctx.fillStyle = "#ff0000";
    const hpRatio = Math.max(0, this.hp / PLAYER_MAX_HP);
    ctx.fillRect(barX, barY, barW * hpRatio, barH);
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.strokeRect(barX, barY, barW, barH);

    ctx.font = "bold 15px 'Courier New', monospace";
    ctx.fillStyle = "#fff";
    ctx.fillText(`${this.hp} / ${PLAYER_MAX_HP}`, barX + barW + 12, hudY);
  }

  private renderActionButtons(ctx: CanvasRenderingContext2D): void {
    const y = this.viewportH - 70;
    const h = 42;
    const gap = 10;
    const w = (this.viewportW - 32 - gap * 3) / 4;

    ACTION_BUTTONS.forEach((label, i) => {
      const x = 16 + i * (w + gap);
      ctx.strokeStyle = "#ff8c00";
      ctx.lineWidth = 3;
      ctx.strokeRect(x, y, w, h);
      ctx.fillStyle = "#ff8c00";
      ctx.font = "bold 16px 'Courier New', monospace";
      ctx.textAlign = "center";
      ctx.fillText(label, x + w / 2, y + h / 2 + 6);
    });
    ctx.textAlign = "left";
  }
}