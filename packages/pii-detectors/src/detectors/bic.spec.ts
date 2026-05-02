import { describe, expect, it } from "vitest";
import { bicDetector } from "./bic.js";

describe("bicDetector", () => {
  it("a l'identité canonique attendue", () => {
    expect(bicDetector.id).toBe("bic");
    expect(bicDetector.label).toMatch(/BIC/);
    expect(bicDetector.source).toMatch(/ISO 9362/);
  });

  it("détecte un BIC 8 caractères (BNP Paribas Paris)", () => {
    const findings = bicDetector.detect("Banque : BNPAFRPP, RIB ci-joint.");
    expect(findings).toHaveLength(1);
    const finding = findings[0]!;
    expect(finding.value).toBe("BNPAFRPP");
    expect(finding.confidence).toBe("high");
    expect(finding.severity).toBe("high");
    expect(finding.metadata).toEqual({
      institution: "BNPA",
      country: "FR",
      location: "PP",
      length: 8,
    });
  });

  it("détecte un BIC 11 caractères avec code branche", () => {
    const findings = bicDetector.detect("Adresser le virement à SOGEFRPPXXX.");
    expect(findings).toHaveLength(1);
    const finding = findings[0]!;
    expect(finding.value).toBe("SOGEFRPPXXX");
    expect(finding.metadata).toMatchObject({
      institution: "SOGE",
      country: "FR",
      location: "PP",
      branch: "XXX",
      length: 11,
    });
  });

  it("détecte plusieurs BIC dans un même texte", () => {
    const text = "France BNPAFRPP, Allemagne DEUTDEFF500, Suisse UBSWCHZH80A.";
    const findings = bicDetector.detect(text);
    expect(findings.map((f) => f.value)).toEqual([
      "BNPAFRPP",
      "DEUTDEFF500",
      "UBSWCHZH80A",
    ]);
  });

  it("rejette un code pays inexistant (ZZ)", () => {
    expect(bicDetector.detect("Faux BIC : ABCDZZPP.")).toEqual([]);
  });

  it("rejette une chaîne dont la longueur est 9 ou 10 (hors ISO 9362)", () => {
    expect(bicDetector.detect("X = ABCDFRPPX")).toEqual([]);
    expect(bicDetector.detect("X = ABCDFRPPXX")).toEqual([]);
  });

  it("rejette si le code institution contient un chiffre", () => {
    expect(bicDetector.detect("BIC : BNP1FRPP.")).toEqual([]);
  });

  it("rejette si le code pays contient un chiffre", () => {
    expect(bicDetector.detect("BIC : BNPAF1PP.")).toEqual([]);
  });

  it("accepte un code emplacement et un code branche alphanumériques (ex. UBSWCHZH80A)", () => {
    const findings = bicDetector.detect("UBSWCHZH80A");
    expect(findings).toHaveLength(1);
    expect(findings[0]!.metadata).toMatchObject({
      country: "CH",
      location: "ZH",
      branch: "80A",
    });
  });

  it("ignore les BIC accolés à d'autres caractères alphanum (lookaround)", () => {
    expect(bicDetector.detect("XBNPAFRPP")).toEqual([]);
    expect(bicDetector.detect("BNPAFRPPY")).toEqual([]);
    expect(bicDetector.detect("BNPAFRPP9")).toEqual([]);
  });

  it("respecte les frontières mots usuelles (ponctuation, espaces, fin de chaîne)", () => {
    for (const text of ["BNPAFRPP.", "BNPAFRPP,", "BNPAFRPP ", "BNPAFRPP\n"]) {
      const findings = bicDetector.detect(text);
      expect(findings).toHaveLength(1);
      expect(findings[0]!.value).toBe("BNPAFRPP");
    }
  });

  it("est pure : appels successifs renvoient des findings égaux", () => {
    const text = "Premier : BNPAFRPP, second : DEUTDEFF.";
    const a = bicDetector.detect(text);
    const b = bicDetector.detect(text);
    expect(a).toEqual(b);
  });

  it("expose la position correcte (start/end)", () => {
    const text = "Le BIC vaut BNPAFRPP au 12/05.";
    const findings = bicDetector.detect(text);
    expect(findings[0]!.location).toEqual({
      start: text.indexOf("BNPAFRPP"),
      end: text.indexOf("BNPAFRPP") + 8,
    });
  });
});
