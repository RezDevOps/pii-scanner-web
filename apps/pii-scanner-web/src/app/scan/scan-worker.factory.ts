/**
 * Fabrique de Worker pour le pool de scan.
 *
 * Délègue à `createDefaultScanWorker` exposé par l'engine depuis v0.3.0 :
 * la résolution d'URL (`new URL("./scan-worker.js", import.meta.url)`)
 * se fait à l'intérieur du package engine, donc indépendamment du
 * bundler de l'app. Si le bundler de l'app évolue, l'engine continue
 * de fonctionner sans modification côté app.
 *
 * Si le runtime n'expose pas `Worker` (SSR, certains tests), le
 * `ScanService` retombe sur `MainThreadRunner` — l'app reste
 * fonctionnelle, juste monothread.
 */
import { createDefaultScanWorker } from "@rezdevops/pii-scanner-engine";

export function createScanWorker(): Worker {
  return createDefaultScanWorker();
}
