/**
 * `WorkerPoolRunner` — distribue les jobs `scanText` sur un pool de
 * Web Workers exposés via Comlink.
 *
 * Caractéristiques :
 * - Taille du pool : `navigator.hardwareConcurrency` (capé à 1 et
 *   plafonné à `maxWorkers` côté options) ou 2 si l'API n'est pas
 *   exposée (fallback prudent : 2 workers, ni 1 ni 8).
 * - File d'attente FIFO : `runScanText` retourne une `Promise` résolue
 *   dès qu'un worker se libère et a fini le job.
 * - `dispose()` termine tous les workers, idempotent.
 *
 * **Activation** : la façade `runScan` n'instancie PAS ce runner par
 * défaut (cf. ADR 0003 et la note du `MainThreadRunner`). C'est l'app
 * Angular qui décide en S3, en passant explicitement
 * `{ runner: createWorkerPoolRunner({ workerFactory }) }` à `runScan`.
 *
 * Le `workerFactory` est injectable pour découpler ce module de la
 * stratégie d'instanciation (ESM `new URL`, paquet bundler, etc.).
 * Ça simplifie aussi les tests : on injecte un faux `Worker`.
 */
import { wrap, type Remote } from "comlink";

import type { Finding } from "@rezdevops/pii-detectors";

import type { ScanWorkerApi } from "../worker/scan-worker-api.js";
import type { Runner, ScanJob } from "./types.js";

/**
 * Worker minimal accepté par le pool. Compatible avec `Worker` du DOM,
 * mais permet aussi un faux Worker en test.
 */
export interface WorkerLike {
  terminate(): void;
}

export type WorkerFactory = () => WorkerLike;

export interface WorkerPoolRunnerOptions {
  /**
   * Fabrique d'un nouveau worker. Appelée jusqu'à `desiredSize` fois.
   */
  readonly workerFactory: WorkerFactory;
  /**
   * Taille désirée du pool. Défaut :
   * `navigator.hardwareConcurrency ?? 2`, plafonnée à 8.
   */
  readonly desiredSize?: number;
  /**
   * Plafond explicite, utile pour brider le pool (par exemple
   * en mode démo « léger »). Défaut : 8.
   */
  readonly maxWorkers?: number;
}

interface PoolEntry {
  readonly worker: WorkerLike;
  readonly api: Remote<ScanWorkerApi>;
  busy: boolean;
}

interface QueuedJob {
  readonly job: ScanJob;
  readonly resolve: (findings: readonly Finding[]) => void;
  readonly reject: (err: unknown) => void;
}

function defaultDesiredSize(): number {
  // `navigator` peut ne pas exister (Node, Worker classique sans DOM).
  if (
    typeof navigator !== "undefined" &&
    typeof navigator.hardwareConcurrency === "number"
  ) {
    return Math.max(1, navigator.hardwareConcurrency);
  }
  return 2;
}

export class WorkerPoolRunner implements Runner {
  private readonly entries: PoolEntry[] = [];
  private readonly queue: QueuedJob[] = [];
  private disposed = false;

  constructor(opts: WorkerPoolRunnerOptions) {
    const max = opts.maxWorkers ?? 8;
    const desired = Math.min(max, opts.desiredSize ?? defaultDesiredSize());
    for (let i = 0; i < desired; i++) {
      const worker = opts.workerFactory();
      // `wrap` accepte tout objet implémentant `postMessage`/`addEventListener`
      // — `Worker` natif convient. Un faux Worker en test doit aussi
      // implémenter le minimum requis par Comlink (cf. `tests/`).
      const api = wrap<ScanWorkerApi>(worker as unknown as Worker);
      this.entries.push({ worker, api, busy: false });
    }
  }

  async runScanText(job: ScanJob): Promise<readonly Finding[]> {
    if (this.disposed) {
      throw new Error("WorkerPoolRunner: déjà disposé.");
    }
    const free = this.entries.find((e) => !e.busy);
    if (free) {
      return this.dispatch(free, job);
    }
    return new Promise<readonly Finding[]>((resolve, reject) => {
      this.queue.push({ job, resolve, reject });
    });
  }

  async dispose(): Promise<void> {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    // Rejette les jobs en attente : une UI n'est plus là pour les recevoir.
    for (const pending of this.queue) {
      pending.reject(new Error("WorkerPoolRunner: disposé pendant l'attente."));
    }
    this.queue.length = 0;
    for (const entry of this.entries) {
      entry.worker.terminate();
    }
    this.entries.length = 0;
  }

  /** Taille effective du pool. Utile pour les tests. */
  get size(): number {
    return this.entries.length;
  }

  private async dispatch(
    entry: PoolEntry,
    job: ScanJob,
  ): Promise<readonly Finding[]> {
    entry.busy = true;
    try {
      const findings = await entry.api.runScanText({
        text: job.text,
        detectorIds: job.detectorIds,
      });
      return findings;
    } finally {
      entry.busy = false;
      this.drain();
    }
  }

  private drain(): void {
    if (this.disposed) {
      return;
    }
    const free = this.entries.find((e) => !e.busy);
    if (!free) {
      return;
    }
    const next = this.queue.shift();
    if (!next) {
      return;
    }
    this.dispatch(free, next.job).then(next.resolve, next.reject);
  }
}

/**
 * Factory ergonomique. Le caller fournit obligatoirement une
 * `workerFactory` : ce module ne suppose ni `import.meta.url` ni un
 * chemin de bundling particulier, pour rester portable.
 */
export function createWorkerPoolRunner(
  opts: WorkerPoolRunnerOptions,
): WorkerPoolRunner {
  return new WorkerPoolRunner(opts);
}
