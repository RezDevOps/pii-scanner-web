/**
 * Types publics de `@rezdevops/pii-scanner-engine`.
 *
 * Stable depuis la `v0.1.0` pour `FileFormat` / `FileScanResult` /
 * `ScanReport`. Étendus en `v0.2.0` avec `ScanProgress` (events de la
 * façade `runScanStream`).
 *
 * Les types liés aux parseurs (`TextChunk`, `FileParser`) et au pool
 * d'exécution (`Runner`) restent dans leurs sous-modules respectifs et
 * ne sont pas re-exportés ici, pour bien marquer la frontière entre
 * « API top-level stable » et « points d'extension internes ».
 */
import type { Finding } from "@rezdevops/pii-detectors";

/**
 * Format de fichier reconnu par l'engine. Toute valeur hors de cette liste est
 * rejetée explicitement par `detectFormat()` (pas de fallback silencieux).
 *
 * Cinq formats sont actifs en `v0.2.0` (`csv`, `tsv`, `txt`, `md`, `json`) ;
 * les cinq formats binaires (`xlsx`, `xls`, `pdf`, `docx`, `html`) restent
 * déclarés ici pour stabiliser le type public mais déclenchent une
 * `DeferredFormatError` à la détection (cf. cadrage § 4.2 et CHANGELOG
 * `[0.2.0]`).
 */
export type FileFormat =
  | "csv"
  | "tsv"
  | "xlsx"
  | "xls"
  | "pdf"
  | "docx"
  | "txt"
  | "md"
  | "json"
  | "html";

/**
 * Résultat de scan pour un fichier donné. Les *findings* portent leur
 * localisation native (engine ne réécrit pas les coordonnées des détecteurs).
 */
export interface FileScanResult {
  /** Nom du fichier d'origine, tel que fourni par le navigateur. */
  readonly fileName: string;
  /** Format détecté à partir de l'extension et du type MIME. */
  readonly format: FileFormat;
  /** Taille en octets, telle que rapportée par `File.size`. */
  readonly size: number;
  /** Findings agrégés sur le contenu du fichier. */
  readonly findings: readonly Finding[];
  /** Durée du scan en millisecondes (mesurée côté caller). */
  readonly durationMs: number;
}

/**
 * Rapport global d'un scan multi-fichiers.
 */
export interface ScanReport {
  /** Identifiant du scan (UUID v4 généré par l'engine). */
  readonly id: string;
  /** Date ISO 8601 de génération du rapport. */
  readonly generatedAt: string;
  /** Version de l'engine ayant produit le rapport. */
  readonly engineVersion: string;
  /** Résultats par fichier. */
  readonly files: readonly FileScanResult[];
}

/**
 * Évènement émis par `runScanStream` au fil du scan. Permet à l'UI (S3) de
 * piloter une barre de progression sans attendre la fin du scan global.
 *
 * Trois variantes :
 * - `file-started` : le scan d'un fichier vient de commencer.
 * - `file-completed` : un fichier est terminé, son `FileScanResult` est joint.
 * - `file-failed` : un fichier a échoué (format non supporté, parseur en
 *   erreur, etc.). Le scan global continue avec les fichiers suivants.
 *
 * Une fois le dernier évènement `file-completed`/`file-failed` émis, le
 * stream se termine et l'appelant peut récupérer le `ScanReport` final via
 * la `Promise` retournée en parallèle par `runScan()`.
 */
export type ScanProgress =
  | {
      readonly type: "file-started";
      /** Index 0-based dans la liste des fichiers fournis à `runScan`. */
      readonly fileIndex: number;
      /** Nombre total de fichiers à scanner. */
      readonly totalFiles: number;
      /** Nom du fichier en cours. */
      readonly fileName: string;
    }
  | {
      readonly type: "file-completed";
      readonly fileIndex: number;
      readonly totalFiles: number;
      readonly fileName: string;
      readonly result: FileScanResult;
    }
  | {
      readonly type: "file-failed";
      readonly fileIndex: number;
      readonly totalFiles: number;
      readonly fileName: string;
      /** Code d'erreur normalisé (ex. `unsupported-format`, `deferred-format`, `parser-error`). */
      readonly errorCode: ScanErrorCode;
      /** Message lisible, déjà localisé en français. */
      readonly errorMessage: string;
    };

/**
 * Codes d'erreur stables exposés par l'engine. Ils permettent à l'UI de
 * router les messages (toast, table, modal) sans parser les chaînes.
 */
export type ScanErrorCode =
  | "unsupported-format"
  | "deferred-format"
  | "parser-error"
  | "runner-error";
