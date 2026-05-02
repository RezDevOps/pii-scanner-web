import { describe, expect, it } from "vitest";
import {
  coreDetectors,
  emailDetector,
  ibanDetector,
  nirDetector,
  validateNir,
} from "@rezdevops/pii-detectors";
import { scanText } from "./scan-text.js";
import { ENGINE_VERSION } from "./version.js";

describe("scanText", () => {
  it("retourne un rapport vide quand aucun finding", () => {
    const report = scanText("Texte parfaitement neutre.", coreDetectors);
    expect(report.findings).toEqual([]);
    // engineVersion est tiré de version.ts (source unique). On compare à
    // la constante exportée plutôt qu'à un littéral pour ne pas devoir
    // mettre à jour ce test à chaque bump.
    expect(report.engineVersion).toBe(ENGINE_VERSION);
    expect(report.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(report.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("agrège les findings de plusieurs détecteurs et les trie par position", () => {
    const validKey = validateNir("2900175123456" + "00").computedKey ?? "00";
    const nir = "2900175123456" + validKey;
    const text = `RIB FR1420041010050500013M02606 — contact : alice@example.com — assurance ${nir}`;
    // Sélection explicite (pas `coreDetectors`) pour ne pas devoir mettre à
    // jour ce test à chaque ajout de détecteur dans `coreDetectors` (S4 :
    // l'IBAN ci-dessus contient `02606` qui est aussi un code postal valide).
    const report = scanText(text, [ibanDetector, emailDetector, nirDetector]);

    expect(report.findings.map((f) => f.detector)).toEqual([
      "iban",
      "email",
      "nir",
    ]);
    // Positions strictement croissantes.
    for (let i = 1; i < report.findings.length; i += 1) {
      const prev = report.findings[i - 1]?.location.start ?? 0;
      const curr = report.findings[i]?.location.start ?? 0;
      expect(curr).toBeGreaterThan(prev);
    }
  });

  it("scanne avec coreDetectors étendu (12 détecteurs en v0.4.0)", () => {
    // Sanity check : `coreDetectors` doit contenir au moins les 12 détecteurs
    // attendus du périmètre v1.0 (cf. cadrage § 4.1).
    expect(coreDetectors.length).toBeGreaterThanOrEqual(12);
  });

  it("dé-duplique les findings exactement identiques (detector, start, end)", () => {
    // Le même détecteur passé deux fois ne doit pas produire de doublons.
    const report = scanText("contact alice@example.com", [
      emailDetector,
      emailDetector,
    ]);
    expect(report.findings).toHaveLength(1);
  });

  it("respecte la liste blanche de détecteurs (rien hors sélection)", () => {
    const text = "alice@example.com — RIB FR1420041010050500013M02606";
    const report = scanText(text, [ibanDetector]);
    expect(report.findings.map((f) => f.detector)).toEqual(["iban"]);
  });

  it("expose une durée mesurable via l'horloge injectée", () => {
    let t = 1_000;
    const report = scanText(
      "alice@example.com",
      [emailDetector],
      () => (t += 5),
    );
    // 1er appel : startedAt = 1005, 2e appel (fin) : 1010 → 5 ms.
    expect(report.durationMs).toBe(5);
    expect(report.generatedAt).toBe(new Date(1005).toISOString());
  });
});
