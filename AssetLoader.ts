export class AssetLoader {
  private cache = new Map<string, HTMLImageElement | null>();

  
  async load(url: string): Promise<HTMLImageElement | null> {
    if (this.cache.has(url)) return this.cache.get(url)!;

    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        this.cache.set(url, img);
        resolve(img);
      };
      img.onerror = () => {
        console.warn(`[AssetLoader] Sprite non trouvé : ${url} — fallback actif`);
        this.cache.set(url, null);
        resolve(null);
      };
      img.src = url;
    });
  }

  get(url: string): HTMLImageElement | null {
    return this.cache.get(url) ?? null;
  }

  async loadAll(urls: string[]): Promise<void> {
    await Promise.all(urls.map((u) => this.load(u)));
  }
}

export const assets = new AssetLoader();
