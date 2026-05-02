/**
 * Logique pure du rapport (filtres, tri, labels). Extraite du
 * composant `ReportComponent` pour rester testable sans Angular
 * Material.
 *
 * Garde ici **uniquement** les fonctions pures et les constantes —
 * tout ce qui touche au DOM ou au cycle de vie Angular reste dans le
 * composant.
 */
import type { Severity } from "@rezdevops/pii-detectors";

import type { EnrichedFinding } from "./scan.service";

export const SEVERITY_ORDER: readonly Severity[] = [
  "critical",
  "high",
  "medium",
  "low",
];

export const SEVERITY_LABEL: Readonly<Record<Severity, string>> = {
  critical: "Critique",
  high: "Élevée",
  medium: "Moyenne",
  low: "Faible",
};

export const SEVERITY_RANK: Readonly<Record<Severity, number>> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export interface FilterCriteria {
  readonly fileName: string;
  readonly detectorId: string;
  readonly severity: Severity | undefined;
}

/**
 * Filtre l'ensemble des findings selon les critères. Composition par
 * AND : un finding doit satisfaire tous les critères non-vides.
 */
export function applyFilters(
  findings: readonly EnrichedFinding[],
  criteria: FilterCriteria,
): EnrichedFinding[] {
  return findings.filter((f) => {
    if (criteria.fileName && f.fileName !== criteria.fileName) return false;
    if (criteria.detectorId && f.finding.detector !== criteria.detectorId)
      return false;
    if (criteria.severity && f.finding.severity !== criteria.severity)
      return false;
    return true;
  });
}

/**
 * Accesseur de tri pour `MatTableDataSource.sortingDataAccessor`.
 * Convertit les colonnes lisibles en clés triables (rang numérique
 * pour la sévérité).
 */
export function sortingDataAccessor(
  row: EnrichedFinding,
  column: string,
): string | number {
  switch (column) {
    case "severity":
      return SEVERITY_RANK[row.finding.severity];
    case "detector":
      return row.finding.detector;
    case "confidence":
      return row.finding.confidence;
    case "file":
      return row.fileName;
    default:
      return "";
  }
}
