// ===== engine/Input.ts =====
// Gère l'état du clavier : touche enfoncée, vient d'être pressée, relâchée.

export class Input {
  private held = new Set<string>();
  private pressed = new Set<string>();
  private released = new Set<string>();

  constructor() {
    window.addEventListener("keydown", (e) => {
      if (!this.held.has(e.code)) this.pressed.add(e.code);
      this.held.add(e.code);
      // Empêche le scroll de la page avec les flèches
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

  /** Touche maintenue enfoncée */
  isDown(code: string): boolean {
    return this.held.has(code);
  }

  /** Touche pressée CE frame uniquement */
  wasPressed(code: string): boolean {
    return this.pressed.has(code);
  }

  /** Touche relâchée CE frame uniquement */
  wasReleased(code: string): boolean {
    return this.released.has(code);
  }

  /** À appeler en FIN de frame, après update de la scène */
  flush(): void {
    this.pressed.clear();
    this.released.clear();
  }
}
