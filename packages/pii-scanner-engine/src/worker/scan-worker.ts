/**
 * Script de Web Worker exposé via Comlink.
 *
 * Compilé par `tsc` vers `dist/worker/scan-worker.js`. Le consommateur
 * (côté thread principal) instancie le worker avec :
 *
 *   const w = new Worker(
 *     new URL("./worker/scan-worker.js", import.meta.url),
 *     { type: "module" },
 *   );
 *
 * Le worker n'effectue aucun appel réseau : seuls `pii-detectors` et
 * `scan-text` sont importés. La CSP `connect-src 'none'` du host (cf.
 * `index.html` de l'app) bloquerait toute tentative de toute façon.
 *
 * La pure existence d'un `import` sur Comlink rend ce fichier non
 * exécutable en environnement Node (Comlink suppose `self`/`postMessage`).
 * Les tests unitaires de `MainThreadRunner` et de la façade
 * `runScan` n'instancient PAS ce script : ils reposent sur le fallback
 * main-thread (cf. `worker-pool-runner.ts` pour la stratégie).
 */
import { expose } from "comlink";

import type { Finding } from "@rezdevops/pii-detectors";

import { resolveDetectors } from "../runner/main-thread-runner.js";
import { scanText } from "../scan-text.js";
import type { ScanWorkerApi } from "./scan-worker-api.js";

const api: ScanWorkerApi = {
  async runScanText(job) {
    const detectors = resolveDetectors(job.detectorIds);
    const report = scanText(job.text, detectors);
    // Recopie défensive : `findings` est readonly côté engine, mais
    // Comlink a besoin de cloner via structured clone — un readonly
    // array est compatible.
    const findings: readonly Finding[] = report.findings;
    return findings;
  },
};

expose(api);
