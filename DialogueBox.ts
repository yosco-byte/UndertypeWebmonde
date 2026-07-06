
export interface DialogueLine {
  text: string;

  speaker?: string;
}

export class DialogueBox {
  private lines: DialogueLine[] = [];
  private lineIndex = 0;
  private charIndex = 0;
  private charTimer = 0;

 
  private readonly CHAR_SPEED = 0.04;

  
  active = false;

  
  onComplete?: () => void;




  start(lines: DialogueLine[], onComplete?: () => void): void {
    this.lines      = lines;
    this.lineIndex  = 0;
    this.charIndex  = 0;
    this.charTimer  = 0;
    this.active     = true;
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



  render(ctx: CanvasRenderingContext2D, viewportW: number, viewportH: number): void {
    if (!this.active) return;

    const line = this.lines[this.lineIndex];
    if (!line) return;

    const BOX_H      = 110;
    const BOX_MARGIN = 16;
    const BOX_Y      = viewportH - BOX_H - BOX_MARGIN;
    const BOX_W      = viewportW - BOX_MARGIN * 2;

   
    ctx.fillStyle = "#000";
    ctx.fillRect(BOX_MARGIN, BOX_Y, BOX_W, BOX_H);

   
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 3;
    ctx.strokeRect(BOX_MARGIN, BOX_Y, BOX_W, BOX_H);

   
    if (line.speaker) {
      ctx.font      = "bold 14px 'Courier New', monospace";
      ctx.fillStyle = "#fff";
      ctx.fillText(line.speaker, BOX_MARGIN + 16, BOX_Y + 22);
    }

  
    const displayed = line.text.slice(0, this.charIndex);
    ctx.font      = "16px 'Courier New', monospace";
    ctx.fillStyle = "#fff";

    
    const MAX_W    = BOX_W - 32;
    const words    = displayed.split(" ");
    let currentLine = "";
    let lineY       = BOX_Y + (line.speaker ? 50 : 36);

    for (const word of words) {
      const test = currentLine ? currentLine + " " + word : word;
      if (ctx.measureText(test).width > MAX_W && currentLine) {
        ctx.fillText(currentLine, BOX_MARGIN + 16, lineY);
        currentLine = word;
        lineY += 22;
      } else {
        currentLine = test;
      }
    }
    if (currentLine) ctx.fillText(currentLine, BOX_MARGIN + 16, lineY);

  
    if (this.charIndex >= line.text.length) {
      const blink = Math.floor(Date.now() / 400) % 2 === 0;
      if (blink) {
        ctx.fillStyle = "#fff";
        ctx.font      = "14px 'Courier New', monospace";
        ctx.fillText("▼", BOX_MARGIN + BOX_W - 24, BOX_Y + BOX_H - 10);
      }
    }
  }
}