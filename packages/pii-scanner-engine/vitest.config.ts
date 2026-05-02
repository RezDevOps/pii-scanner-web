/**
 * Configuration Vitest pour `@rezdevops/pii-scanner-engine`.
 *
 * Environnement par défaut : `node`. Les fichiers de test qui touchent à
 * l'API File / Blob / FileReader / TextDecoder DOM déclarent en tête de
 * fichier `// @vitest-environment happy-dom` pour basculer ponctuellement
 * sur happy-dom. Ça garde les tests purs (scan-text, runner, format) en
 * Node (~3× plus rapide) et n'active happy-dom que pour les parseurs et
 * la façade.
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
