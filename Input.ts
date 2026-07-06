export class Input {
  private held = new Set<string>();
  private pressed = new Set<string>();
  private released = new Set<string>();

  constructor() {
    window.addEventListener("keydown", (e) => {
      if (!this.held.has(e.code)) this.pressed.add(e.code);
      this.held.add(e.code);
      if (
        ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(
          e.code
        )
      ) {
        e.preventDefault();
      }
    });

    window.addEventListener("keyup", (e) => {
      this.held.delete(e.code);
      this.released.add(e.code);
    });
  }

 
  isDown(code: string): boolean {
    return this.held.has(code);
  }

  
  wasPressed(code: string): boolean {
    return this.pressed.has(code);
  }


  wasReleased(code: string): boolean {
    return this.released.has(code);
  }

  flush(): void {
    this.pressed.clear();
    this.released.clear();
  }
}
