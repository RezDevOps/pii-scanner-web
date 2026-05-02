/**
 * Configuration Vitest pour `pii-scanner-web` (app Angular).
 *
 * Stratégie : tests des unités logiques (ScanService, validateurs de
 * drop-zone, helpers de report) en environnement happy-dom. Les tests de
 * rendu Angular (TestBed + zone.js) sont volontairement hors-scope S3 —
 * on couvre ce qui est testable sans matériel Angular spécifique.
 *
 * Alias `@rezdevops/pii-detectors` et `@rezdevops/pii-scanner-engine`
 * pointent sur leurs sources TypeScript pour permettre `pnpm test` sans
 * dépendre du build préalable.
 */
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "happy-dom",
    include: ["src/**/*.spec.ts"],
    reporters: ["default"],
    clearMocks: true,
    restoreMocks: true,
  },
  resolve: {
    alias: {
      "@rezdevops/pii-detectors": fileURLToPath(
        new URL("../../packages/pii-detectors/src/index.ts", import.meta.url),
      ),
      "@rezdevops/pii-scanner-engine": fileURLToPath(
        new URL(
          "../../packages/pii-scanner-engine/src/index.ts",
          import.meta.url,
        ),
      ),
    },
  },
});
