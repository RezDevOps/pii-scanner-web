/**
 * Crée un Web Worker chargeant le `scan-worker.js` de l'engine.
 *
 * @deprecated Depuis v1.2.0, **il est recommandé que le caller héberge
 * son propre script worker côté app** plutôt que d'utiliser cette
 * fabrique. Raison : le pattern `new Worker(new URL("./scan-worker.js",
 * import.meta.url))` ciblant un fichier situé dans le dist npm de
 * l'engine n'est pas re-bundlé proprement par esbuild Angular (et par
 * d'autres bundlers ESM, à des degrés divers). Symptômes observés en
 * v1.0 : worker introuvable en dev (Vite dep optimizer), ou worker
 * créé mais events jamais reçus en prod (esbuild). Cf. ADR-008 du repo
 * `pii-scanner-web`.
 *
 * **Pattern recommandé** : le caller crée son propre `scan-worker.ts`
 * côté app, qui importe la logique de scan via la surface publique de
 * l'engine, et instancie le worker depuis cet emplacement source :
 *
 * ```ts
 * // apps/<your-app>/src/scan/worker/scan-worker.ts
 * import { expose } from "comlink";
 * import {
 *   resolveDetectors,
 *   scanText,
 *   type ScanWorkerApi,
 * } from "@rezdevops/pii-scanner-engine";
 *
 * const api: ScanWorkerApi = {
 *   async runScanText(job) {
 *     const detectors = resolveDetectors(job.detectorIds);
 *     const report = scanText(job.text, detectors);
 *     return report.findings;
 *   },
 * };
 * expose(api);
 *
 * // apps/<your-app>/src/scan/scan-worker.factory.ts
 * export function createScanWorker(): Worker {
 *   return new Worker(
 *     new URL("./worker/scan-worker.ts", import.meta.url),
 *     { type: "module" },
 *   );
 * }
 * ```
 *
 * Cette fabrique reste exportée pour rétrocompatibilité avec les
 * consommateurs npm de v0.3.0 → v1.1.x ; à supprimer à la prochaine
 * majeure (v2.0).
 *
 * Disponible depuis v0.3.0. Dépréciée v1.2.0.
 */
export function createDefaultScanWorker(): Worker {
  return new Worker(new URL("./scan-worker.js", import.meta.url), {
    type: "module",
  });
}
