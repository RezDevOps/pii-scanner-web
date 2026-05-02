import { describe, expect, it } from "vitest";
import { isFrenchPostalCode, postalCodeFrDetector } from "./postal-code-fr.js";

describe("postalCodeFrDetector", () => {
  it("a l'identité canonique attendue", () => {
    expect(postalCodeFrDetector.id).toBe("postal-code-fr");
    expect(postalCodeFrDetector.label).toMatch(/code postal/i);
  });

  it("détecte un code postal de Paris", () => {
    const findings = postalCodeFrDetector.detect(
      "Habite à Paris 75001 depuis 2020.",
    );
    expect(findings).toHaveLength(1);
    const finding = findings[0]!;
    expect(finding.value).toBe("75001");
    expect(finding.confidence).toBe("low");
    expect(finding.severity).toBe("low");
    expect(finding.metadata).toMatchObject({ department: "75" });
  });

  it("détecte un code postal de DOM-TOM", () => {
    const findings = postalCodeFrDetector.detect("Cayenne 97300, Guyane.");
    expect(findings).toHaveLength(1);
    expect(findings[0]!.metadata).toMatchObject({ department: "97" });
  });

  it("détecte un code postal Monaco (98000)", () => {
    const findings = postalCodeFrDetector.detect("Monaco 98000");
    expect(findings).toHaveLength(1);
    expect(findings[0]!.value).toBe("98000");
  });

  it("rejette 00000 et la plage 00xxx (jamais attribuée)", () => {
    expect(postalCodeFrDetector.detect("00000")).toEqual([]);
    expect(postalCodeFrDetector.detect("00500")).toEqual([]);
  });

  it("rejette la plage 96xxx (réservée non utilisée)", () => {
    expect(postalCodeFrDetector.detect("96000")).toEqual([]);
    expect(postalCodeFrDetector.detect("96500")).toEqual([]);
  });

  it("rejette la plage 99xxx", () => {
    expect(postalCodeFrDetector.detect("99000")).toEqual([]);
  });

  it("ignore les séquences de plus ou moins de 5 chiffres", () => {
    expect(postalCodeFrDetector.detect("7500")).toEqual([]);
    expect(postalCodeFrDetector.detect("750010")).toEqual([]);
  });

  it("détecte plusieurs codes postaux dans le même texte", () => {
    const findings = postalCodeFrDetector.detect(
      "De Paris 75001 à Marseille 13001 via Lyon 69001.",
    );
    expect(findings.map((f) => f.value)).toEqual(["75001", "13001", "69001"]);
  });

  it("est pure : appels successifs renvoient des findings égaux", () => {
    const text = "75001 et 13001";
    expect(postalCodeFrDetector.detect(text)).toEqual(
      postalCodeFrDetector.detect(text),
    );
  });

  it("expose la position correcte (start/end)", () => {
    const text = "Code : 75001.";
    const findings = postalCodeFrDetector.detect(text);
    expect(findings[0]!.location).toEqual({
      start: text.indexOf("75001"),
      end: text.indexOf("75001") + 5,
    });
  });
});

describe("isFrenchPostalCode (primitive)", () => {
  it("accepte les bornes valides", () => {
    expect(isFrenchPostalCode("01000")).toBe(true);
    expect(isFrenchPostalCode("95999")).toBe(true);
    expect(isFrenchPostalCode("97000")).toBe(true);
    expect(isFrenchPostalCode("98999")).toBe(true);
  });

  it("rejette les hors-plage", () => {
    expect(isFrenchPostalCode("00999")).toBe(false);
    expect(isFrenchPostalCode("96000")).toBe(false);
    expect(isFrenchPostalCode("96999")).toBe(false);
    expect(isFrenchPostalCode("99000")).toBe(false);
  });

  it("rejette tout ce qui n'est pas exactement 5 chiffres ASCII", () => {
    expect(isFrenchPostalCode("7500")).toBe(false);
    expect(isFrenchPostalCode("750010")).toBe(false);
    expect(isFrenchPostalCode("7500A")).toBe(false);
    expect(isFrenchPostalCode("")).toBe(false);
  });
});
