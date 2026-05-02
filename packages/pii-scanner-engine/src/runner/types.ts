/**
 * Contrat d'un `Runner` — abstraction qui découple `runScan` du moyen
 * d'exécution. Deux implémentations sont livrées en `v0.2.0` :
 *
 * - `MainThreadRunner` — exécute `scanText` sur le thread courant.
 *   Toujours disponible (Node, navigateur, contextes restreints sans
 *   `Worker`). Sert de fallback **et** d'implémentation par défaut tant
 *   que l'app Angular n'a pas branché le pool en S3.
 * - `WorkerPoolRunner` — instancie un mini-pool de Web Workers exposés
 *   via Comlink. À utiliser dans le navigateur quand `runScan` est
 *   appelé sur des fichiers susceptibles de bloquer l'UI.
 *
 * Le contrat est délibérément minimal (`runScanText` + `dispose`) pour
 * faciliter l'écriture d'un futur `Runner` (Tauri, Worker Node) sans
 * modifier la façade.
 */
import type { Detector, Finding } from "@rezdevops/pii-detectors";

/**
 * Spécification d'un job de scan adressé au Runner.
 */
export interface ScanJob {
  /** Texte à scanner. Le Runner ne mute pas la chaîne. */
  readonly text: string;
  /**
   * Identifiants des détecteurs à appliquer. Les `Detector` ne sont
   * **pas** transmis directement au Runner : les fonctions ne sont pas
   * sérialisables vers un Worker. Le Runner reconstruit la liste à partir
   * de `coreDetectors` côté worker.
   */
  readonly detectorIds: ReadonlyArray<string>;
}

export interface Runner {
  /** Exécute `scanText` et retourne les findings agrégés. */
  runScanText(job: ScanJob): Promise<readonly Finding[]>;
  /**
   * Libère les ressources du runner (workers, ports). Idempotent. Une
   * implémentation main-thread peut être un no-op.
   */
  dispose(): Promise<void> | void;
}

/**
 * Helper pour la façade : extrait les `id` d'une liste de détecteurs.
 */
export function detectorIds(
  detectors: ReadonlyArray<Detector>,
): ReadonlyArray<string> {
  return detectors.map((d) => d.id);
}
