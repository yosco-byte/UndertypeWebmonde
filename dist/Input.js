// ===== engine/Input.ts =====
// Gère l'état du clavier : touche enfoncée, vient d'être pressée, relâchée.
export class Input {
    constructor() {
        this.held = new Set();
        this.pressed = new Set();
        this.released = new Set();
        window.addEventListener("keydown", (e) => {
            if (!this.held.has(e.code))
                this.pressed.add(e.code);
            this.held.add(e.code);
            // Empêche le scroll de la page avec les flèches
            if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) {
                e.preventDefault();
            }
        });
        window.addEventListener("keyup", (e) => {
            this.held.delete(e.code);
            this.released.add(e.code);
        });
    }
    /** Touche maintenue enfoncée */
    isDown(code) {
        return this.held.has(code);
    }
    /** Touche pressée CE frame uniquement */
    wasPressed(code) {
        return this.pressed.has(code);
    }
    /** Touche relâchée CE frame uniquement */
    wasReleased(code) {
        return this.released.has(code);
    }
    /** À appeler en FIN de frame, après update de la scène */
    flush() {
        this.pressed.clear();
        this.released.clear();
    }
}
