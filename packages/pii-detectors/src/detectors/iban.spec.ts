import { describe, expect, it } from "vitest";
import { ibanDetector } from "./iban.js";

describe("ibanDetector", () => {
  it("détecte un IBAN FR canonique compacté", () => {
    const findings = ibanDetector.detect("RIB : FR1420041010050500013M02606");
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      detector: "iban",
      value: "FR1420041010050500013M02606",
      confidence: "high",
      severity: "critical",
    });
    expect(findings[0]?.metadata?.["country"]).toBe("FR");
  });

  it("détecte un IBAN imprimé par groupes de 4", () => {
    const findings = ibanDetector.detect(
      "Compte : FR14 2004 1010 0505 0001 3M02 606 (BNP Paribas)",
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]?.metadata?.["normalized"]).toBe(
      "FR1420041010050500013M02606",
    );
  });

  it("détecte des IBAN de plusieurs pays dans le même texte", () => {
    const findings = ibanDetector.detect(
      "Source DE89370400440532013000, destination GB29NWBK60161331926819.",
    );
    expect(findings.map((f) => f.metadata?.["country"])).toEqual(["DE", "GB"]);
  });

  it("rejette un IBAN dont la clé MOD 97 est cassée", () => {
    expect(ibanDetector.detect("FR1420041010050500013M02607")).toEqual([]);
  });

  it("rejette une chaîne au format IBAN mais avec un code pays inconnu", () => {
    expect(ibanDetector.detect("ZZ1420041010050500013M02606")).toEqual([]);
  });

  it("rejette une chaîne IBAN-like de mauvaise longueur (FR doit faire 27)", () => {
    expect(ibanDetector.detect("FR142004101005050001")).toEqual([]);
  });
});
