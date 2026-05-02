import { describe, expect, it } from "vitest";
import { toMarkdownReport } from "./markdown-export.js";
import { EMPTY_REPORT, SAMPLE_REPORT } from "./__fixtures__/sample-report.js";

describe("toMarkdownReport", () => {
  it("commence par un H1 et l'identifiant du rapport", () => {
    const md = toMarkdownReport(SAMPLE_REPORT);
    expect(md).toMatch(/^# Rapport de scan PII/u);
    expect(md).toContain("scan-test-1");
    expect(md).toContain("0.4.0");
  });

  it("inclut un verdict synthétique avec le total et la sévérité max", () => {
    const md = toMarkdownReport(SAMPLE_REPORT);
    expect(md).toContain("3 données personnelles détectées");
    expect(md).toContain("**Critique**");
  });

  it("inclut un tableau de synthèse par fichier", () => {
    const md = toMarkdownReport(SAMPLE_REPORT);
    expect(md).toContain("| Fichier | Format | Taille | Durée | Findings |");
    expect(md).toContain("| clients.csv | csv | 1024 o | 42 ms | 3 |");
    expect(md).toContain("| config.json | json | 256 o | 5 ms | 0 | — |");
  });

  it("masque les valeurs en `partial` par défaut", () => {
    const md = toMarkdownReport(SAMPLE_REPORT);
    expect(md).toContain("************4242");
  });

  it("respecte mask='none' (valeurs en clair)", () => {
    const md = toMarkdownReport(SAMPLE_REPORT, { mask: "none" });
    expect(md).toContain("4242424242424242");
    expect(md).toContain("alice@example.com");
  });

  it("rend une section par fichier avec table des findings", () => {
    const md = toMarkdownReport(SAMPLE_REPORT);
    expect(md).toContain("### clients.csv");
    expect(md).toContain("| 1 | card | Critique |");
    expect(md).toContain("### config.json");
    expect(md).toContain("_Aucun finding._");
  });

  it("affiche la position au format L<line> / offset <start>", () => {
    const md = toMarkdownReport(SAMPLE_REPORT);
    expect(md).toContain("L2 / offset 10");
  });

  it("rend un message clair pour un rapport vide", () => {
    const md = toMarkdownReport(EMPTY_REPORT);
    expect(md).toContain("**Aucune donnée personnelle détectée.**");
    expect(md).toContain("_Aucun fichier scanné._");
  });

  it("est déterministe : 2 appels produisent la même sortie", () => {
    expect(toMarkdownReport(SAMPLE_REPORT)).toBe(
      toMarkdownReport(SAMPLE_REPORT),
    );
  });

  it("se termine par la mention souveraineté (pas de réseau)", () => {
    const md = toMarkdownReport(SAMPLE_REPORT);
    expect(md).toMatch(/100 % en local.*aucune information transmise/su);
  });
});
