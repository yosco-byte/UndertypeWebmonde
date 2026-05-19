import { defineConfig } from "vite";
export default defineConfig({
    root: ".", // fichiers à la racine du projet, pas dans src/
    // Pour GitHub Pages : mettre le nom du repo ici si sous-dossier
    // ex: base: '/htmltale/'
    base: "./",
    build: {
        outDir: "docs", // GitHub Pages lit depuis /docs sur la branche main
        emptyOutDir: true,
    },
});
