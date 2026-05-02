/**
 * Façade publique de l'engine — point d'entrée principal pour les
 * variantes consommatrices (app Angular, futur CLI, futur Tauri).
 *
 * Deux APIs miroirs :
 * - `runScan(files, options?)` : Promise résolue avec le `ScanReport`
 *   final. Pratique pour un caller qui n'a pas besoin de progression.
 * - `runScanStream(files, options?)` : `AsyncIterable<ScanProgress>`
 *   pour piloter une UI (barre de progression, table incrémentale).
 *
 * **Pas de RxJS** : l'engine n'a pas de dépendance Angular (cf. cadrage
 * § 6.2). L'app Angular wrappera trivialement `runScanStream` dans un
 * `Observable` ou un `signal` selon ses préférences.
 */
import {
  coreDetectors,
  type Detector,
  type Finding,
} from "@rezdevops/pii-detectors";

import {
  DeferredFormatError,
  UnsupportedFormatError,
  detectFormat,
} from "./format.js";
import { getParserForFormat } from "./parsers/index.js";
import { createMainThreadRunner, type Runner } from "./runner/index.js";
import type {
  FileFormat,
  FileScanResult,
  ScanProgress,
  ScanReport,
} from "./types.js";
import { ENGINE_VERSION } from "./version.js";

/**
 * `File`-compatible minimal accepté par la façade. Utilise le DOM `File`
 * (avec `name`, `size`, `type`, `text()`, `arrayBuffer()`) ou un objet
 * synthétique.
 *
 * Les deux méthodes (`text()` + `arrayBuffer()`) sont requises depuis
 * v0.2.1 pour couvrir les parseurs binaires (XLSX, PDF, DOCX). Toute
 * implémentation de `File`/`Blob` du DOM les fournit nativement.
 */
export interface ScanInputFile {
  readonly name: string;
  readonly size: number;
  readonly type?: string;
  text(): Promise<string>;
  arrayBuffer(): Promise<ArrayBuffer>;
}

export interface RunScanOptions {
  /**
   * Détecteurs à appliquer. Défaut : `coreDetectors` (les 5 livrés en
   * v0.1.0). Une UI v1 pourra exposer une sélection (cf. cadrage § 4.4).
   */
  readonly detectors?: ReadonlyArray<Detector>;
  /**
   * Runner d'exécution. Défaut : `createMainThreadRunner()`. La façade
   * **n'instancie pas** un `WorkerPoolRunner` par défaut — c'est le
   * caller (app Angular en S3) qui décide d'activer le pool, pour ne
   * pas embarquer un Worker dans tous les contextes (CLI, tests).
   */
  readonly runner?: Runner;
  /**
   * Horloge injectable. Défaut : `Date.now`. Utile pour tests
   * déterministes.
   */
  readonly now?: () => number;
  /**
   * Génère l'identifiant du `ScanReport`. Défaut : `crypto.randomUUID`
   * si disponible, sinon une chaîne pseudo-aléatoire dérivée de `now`.
   * Utile pour tests déterministes.
   */
  readonly idFactory?: () => string;
}

/**
 * Lance le scan et retourne le rapport final.
 */
export async function runScan(
  files: ReadonlyArray<ScanInputFile>,
  options: RunScanOptions = {},
): Promise<ScanReport> {
  const results: FileScanResult[] = [];
  for await (const event of runScanStream(files, options)) {
    if (event.type === "file-completed") {
      results.push(event.result);
    }
    // Les `file-failed` ne contribuent pas au rapport final ; un futur
    // ScanReport étendu (v0.3) pourra exposer `errors[]` à part. En
    // v0.2.0 on suit le contrat type minimal.
  }
  return {
    id: resolveIdFactory(options)(),
    generatedAt: new Date(resolveNow(options)()).toISOString(),
    engineVersion: ENGINE_VERSION,
    files: results,
  };
}

/**
 * Variante streaming : émet un évènement par étape (start/complete/fail).
 * Le rapport final est reconstituable côté caller en agrégeant les
 * `file-completed`, ou via `runScan()` qui le fait pour vous.
 */
export async function* runScanStream(
  files: ReadonlyArray<ScanInputFile>,
  options: RunScanOptions = {},
): AsyncGenerator<ScanProgress, void, void> {
  const runner = options.runner ?? createMainThreadRunner();
  const detectors = options.detectors ?? coreDetectors;
  const detectorIds = detectors.map((d) => d.id);
  const now = resolveNow(options);
  const totalFiles = files.length;

  try {
    for (let i = 0; i < totalFiles; i++) {
      const file = files[i];
      if (!file) {
        continue;
      }
      yield {
        type: "file-started",
        fileIndex: i,
        totalFiles,
        fileName: file.name,
      };

      // 1. Détection format
      let format: FileFormat;
      try {
        format = detectFormat(file);
      } catch (err) {
        yield buildFailure(i, totalFiles, file, err);
        continue;
      }

      // 2. Sélection parseur
      const parser = getParserForFormat(format);
      if (!parser) {
        // Sécurité : tout `FileFormat` détecté devrait avoir un parseur,
        // sinon `detectFormat` aurait déjà levé `DeferredFormatError`.
        // On émet quand même un évènement explicite pour traquer un
        // futur écart.
        yield {
          type: "file-failed",
          fileIndex: i,
          totalFiles,
          fileName: file.name,
          errorCode: "parser-error",
          errorMessage: `Aucun parseur enregistré pour le format « ${format} ».`,
        };
        continue;
      }

      // 3. Scan
      const startedAt = now();
      const findings: Finding[] = [];
      try {
        for await (const chunk of parser.parse(file)) {
          if (chunk.text.length === 0) {
            continue;
          }
          const found = await runner.runScanText({
            text: chunk.text,
            detectorIds,
          });
          // Enrichit chaque finding avec line/path du chunk si dispo —
          // sans réécrire ce que les détecteurs ont déjà mis (priorité
          // au plus précis).
          for (const f of found) {
            findings.push(enrichFinding(f, chunk.line, chunk.path));
          }
        }
      } catch (err) {
        yield buildFailure(i, totalFiles, file, err);
        continue;
      }
      const durationMs = Math.max(0, now() - startedAt);

      const result: FileScanResult = {
        fileName: file.name,
        format,
        size: file.size,
        findings,
        durationMs,
      };
      yield {
        type: "file-completed",
        fileIndex: i,
        totalFiles,
        fileName: file.name,
        result,
      };
    }
  } finally {
    // Si l'utilisateur a fourni un runner, on ne le dispose pas (sa
    // responsabilité). Si on a créé le runner par défaut, on le ferme.
    if (!options.runner) {
      await runner.dispose();
    }
  }
}

function buildFailure(
  fileIndex: number,
  totalFiles: number,
  file: ScanInputFile,
  err: unknown,
): ScanProgress {
  if (err instanceof DeferredFormatError) {
    return {
      type: "file-failed",
      fileIndex,
      totalFiles,
      fileName: file.name,
      errorCode: "deferred-format",
      errorMessage: err.message,
    };
  }
  if (err instanceof UnsupportedFormatError) {
    return {
      type: "file-failed",
      fileIndex,
      totalFiles,
      fileName: file.name,
      errorCode: "unsupported-format",
      errorMessage: err.message,
    };
  }
  // Toute autre erreur = parser-error (ou runner-error si on voulait
  // distinguer ; en v0.2.0 on agrège).
  const message = err instanceof Error ? err.message : String(err);
  return {
    type: "file-failed",
    fileIndex,
    totalFiles,
    fileName: file.name,
    errorCode: "parser-error",
    errorMessage: message,
  };
}

function enrichFinding(
  finding: Finding,
  line: number | undefined,
  path: string | undefined,
): Finding {
  // Si le détecteur a déjà fourni une `line`, on respecte (sa précision
  // est meilleure). Sinon on ajoute celle du parseur (utile pour CSV où
  // la ligne du fichier global est plus parlante que la position dans
  // la cellule).
  const location =
    line !== undefined && finding.location.line === undefined
      ? { ...finding.location, line }
      : finding.location;
  const metadata =
    path !== undefined
      ? { ...(finding.metadata ?? {}), path }
      : finding.metadata;
  return metadata
    ? { ...finding, location, metadata }
    : { ...finding, location };
}

function resolveNow(options: RunScanOptions): () => number {
  return options.now ?? Date.now;
}

function resolveIdFactory(options: RunScanOptions): () => string {
  if (options.idFactory) {
    return options.idFactory;
  }
  return () => {
    // `crypto.randomUUID` est disponible Node 20+ ET navigateurs
    // récents. On garde un fallback `Date.now` + `Math.random` pour
    // les contextes exotiques (Worker classique sans `crypto.subtle`).
    if (
      typeof crypto !== "undefined" &&
      typeof crypto.randomUUID === "function"
    ) {
      return crypto.randomUUID();
    }
    return `scan-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  };
}
