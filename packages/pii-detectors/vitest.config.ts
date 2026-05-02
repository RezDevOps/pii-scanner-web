/**
 * Configuration Vitest pour `@rezdevops/pii-detectors`.
 *
 * Lib pure : environnement Node, pas de DOM. Les specs vivent à côté du code
 * (`src/**\/*.spec.ts`) ou dans le dossier `tests/` du package.
 */
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.spec.ts", "tests/**/*.spec.ts"],
    reporters: ["default"],
    clearMocks: true,
    restoreMocks: true,
  },
});
