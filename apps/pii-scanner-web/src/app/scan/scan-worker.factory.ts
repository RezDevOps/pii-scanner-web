/**
 * Fabrique de Worker pour le pool de scan.
 *
 * **Depuis v1.2.0** : le script worker vit côté app
 * (`./worker/scan-worker.ts`). Esbuild Angular sait bundler
 * `new Worker(new URL("./worker/scan-worker.ts", import.meta.url))`
 * depuis un source TS de l'app, ce qui résout le bug v1.0 où le worker
 * était livré dans le dist npm de l'engine et n'était pas re-bundlé
 * proprement (cf. ADR-008).
 *
 * La logique de scan reste dans l'engine (`resolveDetectors`,
 * `scanText`, `ScanWorkerApi`), seule l'enveloppe d'exposition Comlink
 * vit côté app.
 *
 * Si le runtime n'expose pas `Worker` (SSR, certains tests), le
 * `ScanService` retombe sur `MainThreadRunner` — l'app reste
 * fonctionnelle, juste monothread.
 */
export function createScanWorker(): Worker {
  return new Worker(new URL("./worker/scan-worker.ts", import.meta.url), {
    type: "module",
  });
}
