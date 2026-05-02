/**
 * Tests de `applyFilters` (logique de filtrage du composant rapport).
 */
import { describe, expect, it } from "vitest";
import type { Finding } from "@rezdevops/pii-detectors";

import { applyFilters } from "./report.utils";
import type { EnrichedFinding } from "./scan.service";

function mkFinding(
  detector: Finding["detector"],
  severity: Finding["severity"],
): Finding {
  return {
    detector,
    value: "x@example.com",
    location: { start: 0, end: 13 },
    confidence: "high",
    severity,
  };
}

function mkEnriched(
  id: string,
  fileName: string,
  detector: Finding["detector"],
  severity: Finding["severity"],
): EnrichedFinding {
  return {
    id,
    fileName,
    fileFormat: "csv",
    finding: mkFinding(detector, severity),
  };
}

describe("applyFilters", () => {
  const data: readonly EnrichedFinding[] = [
    mkEnriched("1", "a.csv", "email", "medium"),
    mkEnriched("2", "a.csv", "iban", "critical"),
    mkEnriched("3", "b.csv", "email", "low"),
  ];

  it("retourne tout sans filtre", () => {
    expect(
      applyFilters(data, {
        fileName: "",
        detectorId: "",
        severity: undefined,
      }),
    ).toHaveLength(3);
  });

  it("filtre par fichier", () => {
    const out = applyFilters(data, {
      fileName: "a.csv",
      detectorId: "",
      severity: undefined,
    });
    expect(out).toHaveLength(2);
    expect(out.every((f) => f.fileName === "a.csv")).toBe(true);
  });

  it("filtre par détecteur", () => {
    const out = applyFilters(data, {
      fileName: "",
      detectorId: "email",
      severity: undefined,
    });
    expect(out).toHaveLength(2);
    expect(out.every((f) => f.finding.detector === "email")).toBe(true);
  });

  it("filtre par sévérité", () => {
    const out = applyFilters(data, {
      fileName: "",
      detectorId: "",
      severity: "critical",
    });
    expect(out).toHaveLength(1);
    expect(out[0]?.finding.severity).toBe("critical");
  });

  it("compose les filtres", () => {
    const out = applyFilters(data, {
      fileName: "a.csv",
      detectorId: "email",
      severity: "medium",
    });
    expect(out).toHaveLength(1);
    expect(out[0]?.id).toBe("1");
  });
});
