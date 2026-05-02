import { describe, expect, it } from "vitest";
import { nirDetector } from "./nir.js";
import { validateNir } from "../lib/nir-key.js";

/** Reconstruit un NIR valide à partir du corps (13 caractères). */
function buildValidNir(body: string): string {
  const probe = validateNir(`${body}00`);
  if (!probe.computedKey) {
    throw new Error(`Corps NIR invalide : ${body}`);
  }
  return `${body}${probe.computedKey}`;
}

describe("nirDetector", () => {
  it("détecte un NIR valide collé (15 chiffres consécutifs)", () => {
    const nir = buildValidNir("1990175123456");
    const findings = nirDetector.detect(`Référence : ${nir}.`);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      detector: "nir",
      value: nir,
      confidence: "high",
      severity: "critical",
    });
  });

  it("détecte un NIR imprimé avec espaces (forme bulletin de salaire)", () => {
    const nir = buildValidNir("2900175123456");
    // Forme classique sur une fiche de paie.
    const printed = `${nir.slice(0, 1)} ${nir.slice(1, 3)} ${nir.slice(3, 5)} ${nir.slice(5, 7)} ${nir.slice(7, 10)} ${nir.slice(10, 13)} ${nir.slice(13)}`;
    const findings = nirDetector.detect(`NIR : ${printed}`);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.metadata?.["normalized"]).toBe(nir);
  });

  it("détecte un NIR Corse (substitution 2A)", () => {
    const nir = buildValidNir("299032A123456");
    expect(nirDetector.detect(nir)).toHaveLength(1);
  });

  it("rejette une chaîne au format NIR mais clé invalide", () => {
    // 15 chiffres bien formés mais avec une clé délibérément fausse.
    const validNir = buildValidNir("1990175123456");
    const broken =
      validNir.slice(0, 13) + (validNir.slice(13) === "97" ? "01" : "97");
    expect(nirDetector.detect(broken)).toEqual([]);
  });

  it("rejette une suite de 15 chiffres dont le premier n'est pas un sexe valide", () => {
    expect(nirDetector.detect("599017512345600")).toEqual([]);
  });

  it("ne capture pas un NIR collé à des chiffres adjacents", () => {
    const nir = buildValidNir("1990175123456");
    expect(nirDetector.detect(`X${nir}9`)).toEqual([]);
  });
});
