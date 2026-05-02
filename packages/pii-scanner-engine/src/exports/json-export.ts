/**
 * Sérialiseur JSON pour `ScanReport`.
 *
 * Garanties :
 *  - Schéma versionné (`reportSchema`) — toute évolution incrémente la
 *    version (cf. `REPORT_SCHEMA_VERSION`).
 *  - Sortie déterministe : ordre des clés stable, indentation 2 espaces.
 *  - Inclut une synthèse `summary` (compteurs par sévérité, par détecteur,
 *    par fichier) calculée côté export pour épargner cette charge à
 *    l'engine en hot-path.
 */

import type { Finding } from "@rezdevops/pii-detectors";
import type { FileScanResult, ScanReport } from "../types.js";
import { maskValue } from "./mask.js";
import {
  type ExportOptions,
  type MaskLevel,
  REPORT_SCHEMA_VERSION,
} from "./types.js";

interface JsonFinding {
  readonly detector: string;
  readonly value: string;
  readonly confidence: string;
  readonly severity: string;
  readonly location: Finding["location"];
  readonly metadata?: Finding["metadata"];
}

interface JsonFile {
  readonly fileName: string;
  readonly format: string;
  readonly size: number;
  readonly durationMs: number;
  readonly findingCount: number;
  readonly findings: readonly JsonFinding[];
}

interface JsonSummary {
  readonly totalFiles: number;
  readonly totalFindings: number;
  readonly bySeverity: Readonly<Record<string, number>>;
  readonly byDetector: Readonly<Record<string, number>>;
  readonly byFile: Readonly<Record<string, number>>;
}

interface JsonReport {
  readonly reportSchema: typeof REPORT_SCHEMA_VERSION;
  readonly reportId: string;
  readonly generatedAt: string;
  readonly engineVersion: string;
  readonly maskLevel: MaskLevel;
  readonly summary: JsonSummary;
  readonly files: readonly JsonFile[];
}

function buildSummary(report: ScanReport): JsonSummary {
  const bySeverity: Record<string, number> = {};
  const byDetector: Record<string, number> = {};
  const byFile: Record<string, number> = {};
  let total = 0;
  for (const file of report.files) {
    byFile[file.fileName] = file.findings.length;
    total += file.findings.length;
    for (const finding of file.findings) {
      bySeverity[finding.severity] = (bySeverity[finding.severity] ?? 0) + 1;
      byDetector[finding.detector] = (byDetector[finding.detector] ?? 0) + 1;
    }
  }
  return {
    totalFiles: report.files.length,
    totalFindings: total,
    bySeverity,
    byDetector,
    byFile,
  };
}

function buildJsonFile(file: FileScanResult, mask: MaskLevel): JsonFile {
  const findings: JsonFinding[] = file.findings.map((f) => {
    const json: JsonFinding = {
      detector: f.detector,
      value: maskValue(f.value, mask),
      confidence: f.confidence,
      severity: f.severity,
      location: f.location,
    };
    return f.metadata !== undefined ? { ...json, metadata: f.metadata } : json;
  });
  return {
    fileName: file.fileName,
    format: file.format,
    size: file.size,
    durationMs: file.durationMs,
    findingCount: file.findings.length,
    findings,
  };
}

/**
 * Construit la représentation JSON d'un `ScanReport`. La sortie est
 * sérialisable directement par `JSON.stringify` (pas de cycles, pas de
 * fonctions, pas de `BigInt`).
 *
 * @param report rapport produit par `runScan`.
 * @param options options d'export (mask).
 */
export function buildJsonReport(
  report: ScanReport,
  options: ExportOptions = {},
): JsonReport {
  const mask = options.mask ?? "partial";
  return {
    reportSchema: REPORT_SCHEMA_VERSION,
    reportId: report.id,
    generatedAt: report.generatedAt,
    engineVersion: report.engineVersion,
    maskLevel: mask,
    summary: buildSummary(report),
    files: report.files.map((f) => buildJsonFile(f, mask)),
  };
}

/**
 * Sérialise un `ScanReport` en chaîne JSON indentée (2 espaces).
 */
export function toJsonReport(
  report: ScanReport,
  options: ExportOptions = {},
): string {
  return `${JSON.stringify(buildJsonReport(report, options), null, 2)}\n`;
}
