/**
 * Point d'entrée public de `@rezdevops/pii-scanner-engine`.
 *
 * Stable depuis la `v0.1.0` : `scanText` est le seul contrat exposé. Les
 * parseurs (CSV/XLSX/PDF/...), le pool de Web Workers et la génération des
 * exports arrivent en S2/S3 sans changer la signature de `scanText`.
 */

import type { Finding } from "@rezdevops/pii-detectors";

export { scanText } from "./scan-text.js";
export type { TextScanReport } from "./scan-text.js";

/**
 * Format de fichier reconnu par l'engine. Toute valeur hors de cette liste est
 * rejetée explicitement (pas de fallback silencieux).
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
  /** Durée du scan en millisecondes (mesurée côté worker). */
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

export const VERSION = "0.1.0";
