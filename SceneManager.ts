export interface Scene {
 
  onEnter(): void;

  onExit(): void;
  
  update(dt: number): void;
 
  render(ctx: CanvasRenderingContext2D): void;
}

export type SceneFactory = () => Scene;

export class SceneManager {
  private scenes = new Map<string, SceneFactory>();
  private current: Scene | null = null;
  private currentId: string | null = null;

  
  register(id: string, factory: SceneFactory): void {
    this.scenes.set(id, factory);
  }


  goto(id: string, ...args: unknown[]): void {
    if (!this.scenes.has(id)) {
      console.error(`[SceneManager] Scène inconnue : "${id}"`);
      return;
    }
    this.current?.onExit();
    const factory = this.scenes.get(id)!;
   
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

 
  static _pendingArgs: unknown[] = [];
  static takePendingArgs(): unknown[] {
    const a = SceneManager._pendingArgs;
    SceneManager._pendingArgs = [];
    return a;
  }
}

export const sceneManager = new SceneManager();
