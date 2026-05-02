import { describe, expect, it } from "vitest";
import { siretDetector } from "./siret.js";

describe("siretDetector", () => {
  it("détecte un SIRET INSEE de référence (Luhn standard)", () => {
    const findings = siretDetector.detect("Notre SIRET : 73282932000074.");
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      detector: "siret",
      value: "73282932000074",
      confidence: "high",
      severity: "high",
    });
    expect(findings[0]?.metadata).toMatchObject({
      siren: "732829320",
      nic: "00074",
    });
  });

  it("détecte un SIRET imprimé avec espaces (forme officielle)", () => {
    const findings = siretDetector.detect("SIRET : 732 829 320 00074.");
    expect(findings).toHaveLength(1);
    expect(findings[0]?.value).toBe("732 829 320 00074");
  });

  it("applique l'exception La Poste : somme des 14 chiffres ≡ 0 (mod 5)", () => {
    // Synthétique : SIREN La Poste (356000000) + NIC choisi pour que la somme
    // des 14 chiffres soit 25, multiple de 5. Échouerait Luhn standard mais
    // doit être validé par la dérogation.
    const laPoste = "35600000000038";
    expect(siretDetector.detect(laPoste)).toHaveLength(1);
  });

  it("rejette un SIRET dont la clé Luhn est fausse", () => {
    expect(siretDetector.detect("73282932000075")).toEqual([]);
  });

  it("rejette un SIRET La Poste dont la somme n'est pas multiple de 5", () => {
    // Sum = 26, non divisible par 5.
    expect(siretDetector.detect("35600000000048")).toEqual([]);
  });

  it("ne capture pas une suite de 13 ou 15 chiffres (mauvaise longueur)", () => {
    expect(siretDetector.detect("7328293200007")).toEqual([]);
    expect(siretDetector.detect("732829320000749")).toEqual([]);
  });
});
