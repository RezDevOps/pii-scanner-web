import { describe, expect, it } from "vitest";
import { buildJsonReport, toJsonReport } from "./json-export.js";
import { REPORT_SCHEMA_VERSION } from "./types.js";
import { EMPTY_REPORT, SAMPLE_REPORT } from "./__fixtures__/sample-report.js";

describe("buildJsonReport", () => {
  it("produit le schéma versionné, l'identifiant et la version d'engine", () => {
    const json = buildJsonReport(SAMPLE_REPORT);
    expect(json.reportSchema).toBe(REPORT_SCHEMA_VERSION);
    expect(json.reportId).toBe("scan-test-1");
    expect(json.engineVersion).toBe("0.4.0");
    expect(json.generatedAt).toBe("2026-05-02T10:00:00.000Z");
  });

  it("calcule la synthèse (totaux, par sévérité, par détecteur, par fichier)", () => {
    const json = buildJsonReport(SAMPLE_REPORT);
    expect(json.summary).toEqual({
      totalFiles: 2,
      totalFindings: 3,
      bySeverity: { critical: 1, medium: 1, low: 1 },
      byDetector: { card: 1, email: 1, "postal-code-fr": 1 },
      byFile: { "clients.csv": 3, "config.json": 0 },
    });
  });

  it("masque les valeurs en `partial` par défaut", () => {
    const json = buildJsonReport(SAMPLE_REPORT);
    const cardFinding = json.files[0]!.findings[0]!;
    // 4242424242424242 (16 chars) → 12 étoiles + 4242
    expect(cardFinding.value).toBe("************4242");
  });

  it("respecte mask='none'", () => {
    const json = buildJsonReport(SAMPLE_REPORT, { mask: "none" });
    expect(json.files[0]!.findings[0]!.value).toBe("4242424242424242");
  });

  it("respecte mask='full'", () => {
    const json = buildJsonReport(SAMPLE_REPORT, { mask: "full" });
    expect(json.files[0]!.findings[0]!.value).toBe("***");
    expect(json.files[0]!.findings[1]!.value).toBe("***");
  });

  it("inclut le `findingCount` par fichier", () => {
    const json = buildJsonReport(SAMPLE_REPORT);
    expect(json.files[0]!.findingCount).toBe(3);
    expect(json.files[1]!.findingCount).toBe(0);
  });

  it("préserve la metadata des findings (sans la masquer)", () => {
    const json = buildJsonReport(SAMPLE_REPORT);
    expect(json.files[0]!.findings[0]!.metadata).toEqual({
      brand: "visa",
      length: 16,
      last4: "4242",
      bin: "424242",
    });
  });

  it("gère un rapport vide", () => {
    const json = buildJsonReport(EMPTY_REPORT);
    expect(json.summary.totalFiles).toBe(0);
    expect(json.summary.totalFindings).toBe(0);
    expect(json.files).toEqual([]);
  });
});

describe("toJsonReport", () => {
  it("produit du JSON valide indenté à 2 espaces, terminé par newline", () => {
    const text = toJsonReport(SAMPLE_REPORT);
    expect(text.endsWith("\n")).toBe(true);
    expect(text).toContain('\n  "reportSchema":');
    // Round-trip JSON
    const parsed: unknown = JSON.parse(text);
    expect(parsed).toEqual(buildJsonReport(SAMPLE_REPORT));
  });

  it("est déterministe : 2 appels successifs sur le même rapport produisent le même texte", () => {
    expect(toJsonReport(SAMPLE_REPORT)).toBe(toJsonReport(SAMPLE_REPORT));
  });
});
