// ===== scenes/SceneManager.ts =====
// Gère les transitions entre scènes (overworld, combat, menu…).

export interface Scene {
  /** Appelé une fois lors de l'activation */
  onEnter(): void;
  /** Appelé une fois lors de la désactivation */
  onExit(): void;
  /** Mise à jour (dt en secondes) */
  update(dt: number): void;
  /** Rendu sur le canvas */
  render(ctx: CanvasRenderingContext2D): void;
}

export type SceneFactory = () => Scene;

export class SceneManager {
  private scenes = new Map<string, SceneFactory>();
  private current: Scene | null = null;
  private currentId: string | null = null;

  /** Enregistre une scène par son id */
  register(id: string, factory: SceneFactory): void {
    this.scenes.set(id, factory);
  }

  /** Change la scène active */
  goto(id: string, ...args: unknown[]): void {
    if (!this.scenes.has(id)) {
      console.error(`[SceneManager] Scène inconnue : "${id}"`);
      return;
    }
    this.current?.onExit();
    const factory = this.scenes.get(id)!;
    // On passe les args via une variable temporaire (pattern simple)
    SceneManager._pendingArgs = args;
    this.current = factory();
    this.currentId = id;
    this.current.onEnter();
  }

  update(dt: number): void {
    this.current?.update(dt);
  }

  render(ctx: CanvasRenderingContext2D): void {
    this.current?.render(ctx);
  }

  getCurrentId(): string | null {
    return this.currentId;
  }

  // Mécanisme léger pour passer des arguments à la factory
  static _pendingArgs: unknown[] = [];
  static takePendingArgs(): unknown[] {
    const a = SceneManager._pendingArgs;
    SceneManager._pendingArgs = [];
    return a;
  }
}

export const sceneManager = new SceneManager();
