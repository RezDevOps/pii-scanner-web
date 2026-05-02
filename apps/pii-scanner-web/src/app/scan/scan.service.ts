/**
 * Service Angular qui orchestre les scans PII via la façade
 * `runScanStream` de `@rezdevops/pii-scanner-engine`.
 *
 * Décisions :
 * - **API à base de signals** (`@angular/core`) plutôt que RxJS — l'engine
 *   est zero-RxJS (cf. cadrage § 6.2), on garde la même posture côté UI :
 *   pas de wrapping artificiel.
 * - **WorkerPoolRunner branché par défaut** quand `Worker` est disponible.
 *   Fallback `MainThreadRunner` en environnement sans Worker (tests Vitest
 *   pur Node, futur SSR).
 * - **Le service possède le runner** : `ngOnDestroy` appelle `dispose()` —
 *   les Workers sont libérés en fin de vie du service. Cohérent avec le
 *   contrat « le caller qui crée le runner le dispose » de la façade.
 *
 * Le service ne fait *aucune* logique métier (parsing, détection,
 * sévérité) : tout reste dans l'engine. Il se contente de :
 * 1. Mettre à jour les signals d'état pendant le scan
 * 2. Agréger les résultats finaux dans un `ScanReport`
 * 3. Exposer les findings prêts à filtrer côté UI (forme `EnrichedFinding`)
 */
import {
  Injectable,
  OnDestroy,
  computed,
  signal,
  type Signal,
} from "@angular/core";
import {
  createMainThreadRunner,
  createWorkerPoolRunner,
  runScanStream,
  type FileScanResult,
  type Runner,
  type ScanInputFile,
  type ScanProgress,
  type ScanReport,
} from "@rezdevops/pii-scanner-engine";
import type { Finding } from "@rezdevops/pii-detectors";

/**
 * État d'un fichier dans la file. Reflète directement les évènements
 * `ScanProgress` émis par la façade, mais persisté pour permettre
 * l'affichage d'une file complète (avec les fichiers déjà traités).
 */
export type FileQueueStatus = "pending" | "scanning" | "completed" | "failed";

export interface FileQueueEntry {
  /** Identifiant stable côté UI (clef de track-by). */
  readonly id: string;
  /** Nom du fichier d'origine. */
  readonly fileName: string;
  /** Taille en octets, telle que rapportée par `File.size`. */
  readonly size: number;
  /** Statut courant. */
  readonly status: FileQueueStatus;
  /** Résultat de scan, présent uniquement si `status === "completed"`. */
  readonly result?: FileScanResult;
  /** Code d'erreur normalisé, présent uniquement si `status === "failed"`. */
  readonly errorCode?: string;
  /** Message d'erreur lisible, présent uniquement si `status === "failed"`. */
  readonly errorMessage?: string;
}

/**
 * Finding enrichi pour la table du rapport — porte le nom de fichier et
 * un id stable pour le mat-table. Conserve l'ensemble du `Finding`
 * d'origine (location, metadata, …).
 */
export interface EnrichedFinding {
  readonly id: string;
  readonly fileName: string;
  readonly fileFormat: FileScanResult["format"];
  readonly finding: Finding;
}

@Injectable({ providedIn: "root" })
export class ScanService implements OnDestroy {
  /**
   * Fabrique de Worker injectable. Permet d'injecter un faux Worker
   * dans les tests, et de basculer sur `MainThreadRunner` quand
   * `Worker` n'est pas disponible (SSR, certains environnements de test).
   */
  private workerFactory: (() => Worker) | null = null;

  /**
   * Runner courant. Lazily instancié au premier scan : si `Worker` est
   * dispo (et qu'un workerFactory a été configuré), on prend le pool.
   * Sinon main-thread. Réutilisé d'un scan à l'autre.
   */
  private runner: Runner | null = null;

  // ---- Signals d'état ----
  private readonly _queue = signal<readonly FileQueueEntry[]>([]);
  private readonly _isScanning = signal(false);
  private readonly _report = signal<ScanReport | null>(null);

  /** File des fichiers (état évolutif au fil des évènements). */
  readonly queue: Signal<readonly FileQueueEntry[]> = this._queue.asReadonly();

  /** Vrai pendant qu'un scan est en cours. */
  readonly isScanning: Signal<boolean> = this._isScanning.asReadonly();

  /** Dernier rapport agrégé, `null` tant qu'aucun scan n'a abouti. */
  readonly report: Signal<ScanReport | null> = this._report.asReadonly();

  /** Findings enrichis (table du rapport). */
  readonly findings: Signal<readonly EnrichedFinding[]> = computed(() => {
    const report = this._report();
    if (!report) return [];
    const out: EnrichedFinding[] = [];
    for (const file of report.files) {
      file.findings.forEach((finding, idx) => {
        out.push({
          id: `${file.fileName}#${idx}`,
          fileName: file.fileName,
          fileFormat: file.format,
          finding,
        });
      });
    }
    return out;
  });

  /** Progression normalisée (0 à 1) — utile pour une mat-progress-bar. */
  readonly progress: Signal<number> = computed(() => {
    const queue = this._queue();
    if (queue.length === 0) return 0;
    const done = queue.filter(
      (e) => e.status === "completed" || e.status === "failed",
    ).length;
    return done / queue.length;
  });

  /**
   * Configure le service pour utiliser un pool de Web Workers via la
   * `workerFactory` fournie. Appelé typiquement dans le bootstrap de
   * l'app — l'app résout l'URL du worker (couplage bundler).
   *
   * Doit être appelé avant le premier scan ; sinon le service tombe
   * sur `MainThreadRunner`.
   */
  configureWorkerFactory(factory: () => Worker): void {
    this.workerFactory = factory;
  }

  /**
   * Lance un scan sur la liste de fichiers fournie. Retourne le
   * `ScanReport` final (résolu après le dernier évènement).
   *
   * Met à jour les signals `queue` / `isScanning` / `report` au fil de
   * l'exécution. Si un scan est déjà en cours, lève une erreur (un
   * service = un scan à la fois ; pour scanner plusieurs lots en
   * parallèle, créer plusieurs services — pas le cas en S3).
   */
  async scan(files: readonly File[]): Promise<ScanReport> {
    if (this._isScanning()) {
      throw new Error("Un scan est déjà en cours.");
    }
    if (files.length === 0) {
      throw new Error("Au moins un fichier requis.");
    }

    this._isScanning.set(true);
    this._report.set(null);

    // Initialise la file avec tous les fichiers en `pending`.
    const initial: FileQueueEntry[] = files.map((file, idx) => ({
      id: `${idx}-${file.name}`,
      fileName: file.name,
      size: file.size,
      status: "pending" as const,
    }));
    this._queue.set(initial);

    const runner = this.ensureRunner();
    const inputs: readonly ScanInputFile[] = files;
    const completed: FileScanResult[] = [];

    try {
      for await (const event of runScanStream(inputs, { runner })) {
        this.applyEvent(event);
        if (event.type === "file-completed") {
          completed.push(event.result);
        }
      }
      const report: ScanReport = {
        id: cryptoRandomId(),
        generatedAt: new Date().toISOString(),
        engineVersion: ENGINE_VERSION_HINT,
        files: completed,
      };
      this._report.set(report);
      return report;
    } finally {
      this._isScanning.set(false);
    }
  }

  /**
   * Réinitialise l'état (file + rapport). Le runner reste vivant pour
   * éviter de payer le coût de relance des Workers.
   */
  reset(): void {
    this._queue.set([]);
    this._report.set(null);
  }

  ngOnDestroy(): void {
    this.runner?.dispose();
    this.runner = null;
  }

  // ---- Internes ----

  private ensureRunner(): Runner {
    if (this.runner) return this.runner;
    if (this.workerFactory && typeof Worker !== "undefined") {
      try {
        this.runner = createWorkerPoolRunner({
          workerFactory: this.workerFactory,
        });
        return this.runner;
      } catch (err) {
        // Fallback silencieux — l'erreur sera visible dans la console
        // du navigateur, mais on ne casse pas le scan.
        console.warn(
          "[pii-scanner-web] WorkerPoolRunner indisponible, fallback main-thread.",
          err,
        );
      }
    }
    this.runner = createMainThreadRunner();
    return this.runner;
  }

  private applyEvent(event: ScanProgress): void {
    this._queue.update((current) => {
      const next = current.slice();
      const idx = event.fileIndex;
      const existing = next[idx];
      if (!existing) return current;
      switch (event.type) {
        case "file-started":
          next[idx] = { ...existing, status: "scanning" };
          break;
        case "file-completed":
          next[idx] = {
            ...existing,
            status: "completed",
            result: event.result,
          };
          break;
        case "file-failed":
          next[idx] = {
            ...existing,
            status: "failed",
            errorCode: event.errorCode,
            errorMessage: event.errorMessage,
          };
          break;
      }
      return next;
    });
  }
}

// La constante `VERSION` de l'engine est volontairement importée à part
// pour ne pas casser le tree-shaking de la façade. Le service ne s'en
// sert que pour annoter le rapport reconstruit après le stream.
import { VERSION as ENGINE_VERSION_HINT } from "@rezdevops/pii-scanner-engine";

function cryptoRandomId(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (c && typeof c.randomUUID === "function") {
    return c.randomUUID();
  }
  return `scan-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
