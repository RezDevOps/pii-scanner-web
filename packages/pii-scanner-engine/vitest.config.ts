/**
 * Configuration Vitest pour `@rezdevops/pii-scanner-engine`.
 *
 * Environnement Node : en S1 l'engine n'expose que `scanText()` qui ne touche
 * ni au DOM ni à `File`. Quand les parseurs binaires arrivent (S2), on
 * basculera sur `happy-dom` ou un environnement dédié si besoin.
 *
 * Alias `@rezdevops/pii-detectors` → source TypeScript du package frère :
 * Vitest n'a pas besoin du build (`pnpm -r build`) pour exécuter les tests
 * de l'engine, ce qui réduit la boucle de feedback à un seul `pnpm test`.
 */
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.spec.ts", "tests/**/*.spec.ts"],
    reporters: ["default"],
    clearMocks: true,
    restoreMocks: true,
  },
  resolve: {
    alias: {
      "@rezdevops/pii-detectors": fileURLToPath(
        new URL("../pii-detectors/src/index.ts", import.meta.url),
      ),
    },
  },
});
