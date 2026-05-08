/**
 * Script de Web Worker du scan PII, exposé via Comlink.
 *
 * **Worker app-side (depuis v1.2.0)**. Avant v1.2, le worker était
 * livré dans le `dist/` du package npm `@rezdevops/pii-scanner-engine`
 * et instancié via `createDefaultScanWorker()`. Mais le pattern
 * `new Worker(new URL("./scan-worker.js", import.meta.url))` ciblant
 * un fichier situé dans `node_modules/.../dist/worker/` n'était pas
 * re-bundlé proprement par esbuild Angular (en dev comme en prod).
 * Symptômes : worker introuvable en dev, ou worker créé mais events
 * jamais reçus en prod.
 *
 * Solution v1.2 : on garde la logique de scan dans l'engine (importée
 * via la surface publique `@rezdevops/pii-scanner-engine`), mais le
 * **script worker lui-même vit côté app**. Esbuild Angular sait
 * bundler `new Worker(new URL("./worker/scan-worker.ts", import.meta.url))`
 * depuis un fichier source TS de l'app — ce qu'il ne savait pas
 * faire depuis un dist npm pré-compilé.
 *
 * Le worker n'effectue aucun appel réseau : seuls `resolveDetectors`
 * et `scanText` (engine) + `expose` (Comlink) sont importés. La CSP
 * `connect-src 'none'` du host (cf. `index.html`) bloquerait toute
 * tentative de toute façon.
 *
 * La pure existence d'un `import` sur Comlink rend ce fichier non
 * exécutable en environnement Node. Les tests unitaires de
 * `MainThreadRunner` et de la façade `runScan` n'instancient PAS ce
 * script : ils reposent sur le fallback main-thread.
 */
import { expose } from "comlink";

import type { Finding } from "@rezdevops/pii-detectors";
import {
  resolveDetectors,
  scanText,
  type ScanWorkerApi,
} from "@rezdevops/pii-scanner-engine";

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
