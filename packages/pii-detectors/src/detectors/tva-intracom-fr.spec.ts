import { describe, expect, it } from "vitest";
import {
  computeTvaIntracomFrKey,
  tvaIntracomFrDetector,
} from "./tva-intracom-fr.js";

/**
 * SIREN synthétiques utilisés pour générer dynamiquement la clé TVA :
 *  - 732829320 = exemple INSEE/DGFiP très utilisé dans la documentation.
 *  - 552081317 = autre exemple public (Air France).
 *  - 408450960 = Société Générale (donnée publique INSEE).
 */
const SAMPLE_SIRENS = ["732829320", "552081317", "408450960"];

function buildTvaFr(siren: string): string {
  return `FR${computeTvaIntracomFrKey(siren)}${siren}`;
}

describe("tvaIntracomFrDetector", () => {
  it("a l'identité canonique attendue", () => {
    expect(tvaIntracomFrDetector.id).toBe("tva-intracom-fr");
    expect(tvaIntracomFrDetector.label).toMatch(/TVA/);
    expect(tvaIntracomFrDetector.source).toMatch(/DGFiP/);
  });

  it("détecte un numéro TVA FR valide accolé au texte", () => {
    const tva = buildTvaFr("732829320");
    const findings = tvaIntracomFrDetector.detect(`Numéro TVA : ${tva}.`);
    expect(findings).toHaveLength(1);
    const finding = findings[0]!;
    expect(finding.value).toBe(tva);
    expect(finding.confidence).toBe("high");
    expect(finding.severity).toBe("medium");
    expect(finding.metadata).toMatchObject({
      country: "FR",
      siren: "732829320",
      normalized: tva,
    });
  });

  it("accepte la forme imprimée avec espaces (FR XX XXX XXX XXX)", () => {
    const key = computeTvaIntracomFrKey("732829320");
    const text = `Mon numéro est FR ${key} 732 829 320, merci.`;
    const findings = tvaIntracomFrDetector.detect(text);
    expect(findings).toHaveLength(1);
    expect(findings[0]!.metadata).toMatchObject({
      siren: "732829320",
      normalized: `FR${key}732829320`,
    });
  });

  it("accepte la casse minuscule du préfixe (`fr`)", () => {
    const key = computeTvaIntracomFrKey("552081317");
    const findings = tvaIntracomFrDetector.detect(`fr${key}552081317`);
    expect(findings).toHaveLength(1);
    expect(findings[0]!.metadata).toMatchObject({ siren: "552081317" });
  });

  it("rejette si la clé ne correspond pas au SIREN", () => {
    // Clé 99 incorrecte pour SIREN 732829320 (la vraie est 44 ou similaire)
    const text = "FR99732829320";
    const findings = tvaIntracomFrDetector.detect(text);
    expect(findings).toEqual([]);
  });

  it("rejette si la longueur normalisée n'est pas 13", () => {
    expect(tvaIntracomFrDetector.detect("FR4473282932")).toEqual([]);
    expect(tvaIntracomFrDetector.detect("FR4473282932099")).toEqual([]);
  });

  it("rejette les variantes alphanumériques de clé (limite documentée)", () => {
    // Clé `K7` n'est pas un format numérique — non couvert.
    expect(tvaIntracomFrDetector.detect("FRK7732829320")).toEqual([]);
  });

  it("détecte plusieurs TVA FR dans le même texte", () => {
    const a = buildTvaFr("732829320");
    const b = buildTvaFr("552081317");
    const text = `Premier ${a}, second ${b}.`;
    const findings = tvaIntracomFrDetector.detect(text);
    expect(findings.map((f) => f.metadata?.siren)).toEqual([
      "732829320",
      "552081317",
    ]);
  });

  it("est pure : appels successifs renvoient des findings égaux", () => {
    const text = `TVA = ${buildTvaFr("408450960")}`;
    expect(tvaIntracomFrDetector.detect(text)).toEqual(
      tvaIntracomFrDetector.detect(text),
    );
  });

  it("expose la position correcte (start/end)", () => {
    const tva = buildTvaFr("732829320");
    const text = `prefix ${tva} suffix`;
    const findings = tvaIntracomFrDetector.detect(text);
    expect(findings[0]!.location).toEqual({
      start: text.indexOf(tva),
      end: text.indexOf(tva) + tva.length,
    });
  });

  it("calcule des clés cohérentes pour les SIREN connus", () => {
    for (const siren of SAMPLE_SIRENS) {
      const key = computeTvaIntracomFrKey(siren);
      expect(key).toMatch(/^\d{2}$/u);
      // Ré-injecter dans le détecteur doit produire un finding valide.
      const findings = tvaIntracomFrDetector.detect(`FR${key}${siren}`);
      expect(findings).toHaveLength(1);
    }
  });

  it("rejette une entrée non-SIREN (lettres dans le corps)", () => {
    expect(tvaIntracomFrDetector.detect("FR44ABCDEFGHI")).toEqual([]);
  });

  it("computeTvaIntracomFrKey lève sur entrée invalide", () => {
    expect(() => computeTvaIntracomFrKey("123")).toThrow();
    expect(() => computeTvaIntracomFrKey("12345678X")).toThrow();
  });
});
