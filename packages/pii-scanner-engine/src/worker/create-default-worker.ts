/**
 * Crée un Web Worker chargeant le `scan-worker.js` de l'engine.
 *
 * Ergonomie pour les consommateurs du package : au lieu de leur
 * demander de résoudre eux-mêmes l'URL via le sous-export
 * `@rezdevops/pii-scanner-engine/worker` (qui dépend du bundler), on
 * leur fournit cette fabrique. Le `import.meta.url` est résolu **dans
 * le contexte de l'engine** (donc dans `node_modules/.../dist/worker/`),
 * et `./scan-worker.js` est relatif à ce contexte — l'app n'a rien à
 * configurer.
 *
 * Disponible depuis v0.3.0. Compatible bundlers ESM modernes (esbuild
 * via Angular CLI 20, Vite, Rollup).
 *
 * Utilisation côté caller :
 *
 *   import { createWorkerPoolRunner, createDefaultScanWorker } from
 *     "@rezdevops/pii-scanner-engine";
 *   const runner = createWorkerPoolRunner({
 *     workerFactory: () => createDefaultScanWorker(),
 *   });
 *
 * Si le bundler de l'app ne supporte pas `new URL(... , import.meta.url)`
 * dans `new Worker(...)`, le caller peut toujours fournir une
 * `workerFactory` custom à `createWorkerPoolRunner` — cette fabrique
 * n'est qu'un confort.
 */
export function createDefaultScanWorker(): Worker {
  return new Worker(new URL("./scan-worker.js", import.meta.url), {
    type: "module",
  });
}
