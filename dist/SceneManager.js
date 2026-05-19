// ===== scenes/SceneManager.ts =====
// Gère les transitions entre scènes (overworld, combat, menu…).
export class SceneManager {
    constructor() {
        this.scenes = new Map();
        this.current = null;
        this.currentId = null;
    }
    /** Enregistre une scène par son id */
    register(id, factory) {
        this.scenes.set(id, factory);
    }
    /** Change la scène active */
    goto(id, ...args) {
        if (!this.scenes.has(id)) {
            console.error(`[SceneManager] Scène inconnue : "${id}"`);
            return;
        }
        this.current?.onExit();
        const factory = this.scenes.get(id);
        // On passe les args via une variable temporaire (pattern simple)
        SceneManager._pendingArgs = args;
        this.current = factory();
        this.currentId = id;
        this.current.onEnter();
    }
    update(dt) {
        this.current?.update(dt);
    }
    render(ctx) {
        this.current?.render(ctx);
    }
    getCurrentId() {
        return this.currentId;
    }
    static takePendingArgs() {
        const a = SceneManager._pendingArgs;
        SceneManager._pendingArgs = [];
        return a;
    }
}
// Mécanisme léger pour passer des arguments à la factory
SceneManager._pendingArgs = [];
export const sceneManager = new SceneManager();
