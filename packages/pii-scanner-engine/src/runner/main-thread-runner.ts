/**
 * `MainThreadRunner` — exécute `scanText` sur le thread courant. Aucun
 * Worker, aucune sérialisation. Trivialement testable.
 *
 * C'est l'implémentation **par défaut** de `runScan` en `v0.2.0` : la
 * couche pool Worker est livrée (cf. `worker-pool-runner.ts`) mais reste
 * inactive tant que la façade ne l'a pas câblée — l'idée est de séparer
 * la livraison du contrat (engine S2) de l'activation côté UI (S3), et
 * d'éviter d'embarquer un Worker dans tous les contextes (CLI, tests).
 */
import type { Detector, Finding } from "@rezdevops/pii-detectors";
import { coreDetectors } from "@rezdevops/pii-detectors";

import { scanText } from "../scan-text.js";
import type { Runner, ScanJob } from "./types.js";

/**
 * Reconstruit une liste de `Detector` à partir de leurs `id`. Hors de la
 * liste blanche, l'identifiant est ignoré silencieusement (un futur
 * détecteur introduit en v0.3 ne fera pas planter une UI v0.2 qui
 * envoie son ancien id par mégarde).
 *
 * Exporté pour partage avec `WorkerPoolRunner` (côté worker).
 */
export function resolveDetectors(
  detectorIds: ReadonlyArray<string>,
): ReadonlyArray<Detector> {
  const byId = new Map<string, Detector>(coreDetectors.map((d) => [d.id, d]));
  const out: Detector[] = [];
  for (const id of detectorIds) {
    const det = byId.get(id);
    if (det) {
      out.push(det);
    }
  }
  return out;
}

export class MainThreadRunner implements Runner {
  async runScanText(job: ScanJob): Promise<readonly Finding[]> {
    const detectors = resolveDetectors(job.detectorIds);
    const report = scanText(job.text, detectors);
    return report.findings;
  }

  dispose(): void {
    // Rien à libérer — main-thread, pas de ressources allouées.
  }
}

/**
 * Factory ergonomique : `createMainThreadRunner()` se lit mieux dans
 * la façade que `new MainThreadRunner()`.
 */
export function createMainThreadRunner(): Runner {
  return new MainThreadRunner();
}
