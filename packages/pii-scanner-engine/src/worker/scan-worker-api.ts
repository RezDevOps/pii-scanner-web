/**
 * Type de l'API exposée par le worker via Comlink. Partagé entre le
 * script worker (`scan-worker.ts`) et son consommateur côté
 * thread principal (`worker-pool-runner.ts`).
 *
 * Aucun import runtime ici : ne contient que des types pour pouvoir
 * être consommé sans bundler par les deux côtés.
 */
import type { Finding } from "@rezdevops/pii-detectors";

export interface ScanWorkerApi {
  runScanText(job: {
    readonly text: string;
    readonly detectorIds: ReadonlyArray<string>;
  }): Promise<readonly Finding[]>;
}
