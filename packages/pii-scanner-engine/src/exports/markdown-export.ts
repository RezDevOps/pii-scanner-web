/**
 * Sérialiseur Markdown pour `ScanReport`.
 *
 * Cible lecteur : DPO, juriste, dirigeant non-tech (cadrage § 10 critère 2).
 * Optimise la lisibilité plutôt que la densité d'information :
 *  - Verdict global en haut (score sévérité maximale, nombre de findings).
 *  - Synthèse par fichier en tableau.
 *  - Détail par fichier en sous-section, avec table des findings dans
 *    l'ordre de leur position.
 *  - Valeurs masquées par défaut (`partial`).
 */

import type { Finding, Severity } from "@rezdevops/pii-detectors";
import type { FileScanResult, ScanReport } from "../types.js";
import { maskValue } from "./mask.js";
import type { ExportOptions, MaskLevel } from "./types.js";

const SEVERITY_LABEL: Readonly<Record<Severity, string>> = Object.freeze({
  critical: "Critique",
  high: "Élevée",
  medium: "Moyenne",
  low: "Faible",
});

const SEVERITY_ORDER: readonly Severity[] = [
  "critical",
  "high",
  "medium",
  "low",
];

function highestSeverity(findings: readonly Finding[]): Severity | null {
  for (const sev of SEVERITY_ORDER) {
    if (findings.some((f) => f.severity === sev)) {
      return sev;
    }
  }
  return null;
}

function escapeTableCell(value: string): string {
  // Pipe + retour ligne sont les deux caractères qui cassent un tableau MD.
  return value.replace(/\|/gu, "\\|").replace(/\r?\n/gu, " ");
}

function formatLocation(finding: Finding): string {
  const parts: string[] = [];
  if (finding.location.line !== undefined) {
    parts.push(`L${finding.location.line}`);
  }
  if (finding.location.column !== undefined) {
    parts.push(`C${finding.location.column}`);
  }
  parts.push(`offset ${finding.location.start}`);
  return parts.join(" / ");
}

function formatFindingsTable(file: FileScanResult, mask: MaskLevel): string {
  if (file.findings.length === 0) {
    return "_Aucun finding._";
  }
  const lines: string[] = [];
  lines.push("| # | Détecteur | Sévérité | Confiance | Position | Valeur |");
  lines.push("|---|---|---|---|---|---|");
  file.findings.forEach((finding, idx) => {
    lines.push(
      `| ${idx + 1} | ${finding.detector} | ${SEVERITY_LABEL[finding.severity]} | ${finding.confidence} | ${formatLocation(finding)} | \`${escapeTableCell(maskValue(finding.value, mask))}\` |`,
    );
  });
  return lines.join("\n");
}

function formatVerdict(report: ScanReport): string {
  const total = report.files.reduce((acc, f) => acc + f.findings.length, 0);
  if (total === 0) {
    return "**Aucune donnée personnelle détectée.**";
  }
  const allFindings = report.files.flatMap((f) => f.findings);
  const top = highestSeverity(allFindings);
  const sevLabel = top ? SEVERITY_LABEL[top] : "Inconnue";
  const fileCount = report.files.filter((f) => f.findings.length > 0).length;
  return [
    `**${total} donnée${total > 1 ? "s" : ""} personnelle${total > 1 ? "s" : ""} détectée${total > 1 ? "s" : ""}** dans ${fileCount} fichier${fileCount > 1 ? "s" : ""} sur ${report.files.length}.`,
    "",
    `Sévérité maximale : **${sevLabel}**.`,
  ].join("\n");
}

function formatSummaryTable(report: ScanReport): string {
  if (report.files.length === 0) {
    return "_Aucun fichier scanné._";
  }
  const lines: string[] = [];
  lines.push("| Fichier | Format | Taille | Durée | Findings | Sévérité max |");
  lines.push("|---|---|---|---|---|---|");
  for (const file of report.files) {
    const top = highestSeverity(file.findings);
    const sevLabel = top ? SEVERITY_LABEL[top] : "—";
    lines.push(
      `| ${escapeTableCell(file.fileName)} | ${file.format} | ${file.size} o | ${file.durationMs} ms | ${file.findings.length} | ${sevLabel} |`,
    );
  }
  return lines.join("\n");
}

/**
 * Sérialise un `ScanReport` en Markdown.
 */
export function toMarkdownReport(
  report: ScanReport,
  options: ExportOptions = {},
): string {
  const mask = options.mask ?? "partial";
  const sections: string[] = [];

  sections.push("# Rapport de scan PII");
  sections.push("");
  sections.push(
    `_Généré le ${report.generatedAt} par l'engine \`${report.engineVersion}\` (rapport \`${report.id}\`)._`,
  );
  sections.push("");
  sections.push("## Verdict");
  sections.push("");
  sections.push(formatVerdict(report));
  sections.push("");
  sections.push("## Synthèse par fichier");
  sections.push("");
  sections.push(formatSummaryTable(report));
  sections.push("");

  if (report.files.length > 0) {
    sections.push("## Détail par fichier");
    sections.push("");
    for (const file of report.files) {
      sections.push(`### ${file.fileName}`);
      sections.push("");
      sections.push(formatFindingsTable(file, mask));
      sections.push("");
    }
  }

  sections.push("---");
  sections.push("");
  sections.push(
    "_Rapport produit par `pii-scanner-web` (RezDevOps) — données traitées 100 % en local, aucune information transmise sur le réseau._",
  );
  sections.push("");

  return sections.join("\n");
}
