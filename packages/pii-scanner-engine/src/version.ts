/**
 * Source unique de vérité pour la version de l'engine. Importée par
 * `scan-text.ts`, `run-scan.ts` et re-exportée par `index.ts` (sous le
 * nom `VERSION`).
 *
 * À chaque bump de `package.json`, mettre à jour ici. La CI vérifiera
 * (en S3+) la cohérence via un test de lint dédié.
 */
export const ENGINE_VERSION = "1.0.0";
