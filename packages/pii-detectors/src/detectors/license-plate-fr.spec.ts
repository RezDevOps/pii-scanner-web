import { describe, expect, it } from "vitest";
import { licensePlateFrDetector } from "./license-plate-fr.js";

describe("licensePlateFrDetector", () => {
  it("a l'identité canonique attendue", () => {
    expect(licensePlateFrDetector.id).toBe("license-plate-fr");
    expect(licensePlateFrDetector.label).toMatch(/plaque/i);
  });

  it("détecte une plaque SIV avec tirets (AA-123-AA)", () => {
    const findings = licensePlateFrDetector.detect("Véhicule AB-123-CD garé.");
    expect(findings).toHaveLength(1);
    const finding = findings[0]!;
    expect(finding.value).toBe("AB-123-CD");
    expect(finding.confidence).toBe("high");
    expect(finding.severity).toBe("medium");
    expect(finding.metadata).toMatchObject({
      format: "siv",
      normalized: "AB123CD",
    });
  });

  it("détecte une plaque SIV avec espaces (AA 123 AA)", () => {
    const findings = licensePlateFrDetector.detect("Plaque AB 123 CD");
    expect(findings).toHaveLength(1);
    expect(findings[0]!.metadata).toMatchObject({ format: "siv" });
  });

  it("rejette une plaque SIV contenant I, O ou U (lettres exclues)", () => {
    expect(licensePlateFrDetector.detect("AI-123-CD")).toEqual([]);
    expect(licensePlateFrDetector.detect("AB-123-OU")).toEqual([]);
    expect(licensePlateFrDetector.detect("AB-123-IU")).toEqual([]);
  });

  it("détecte une plaque FNI ancienne (1234 AB 56)", () => {
    const findings = licensePlateFrDetector.detect("Plaque 1234 AB 56");
    expect(findings).toHaveLength(1);
    const finding = findings[0]!;
    expect(finding.confidence).toBe("medium");
    expect(finding.metadata).toMatchObject({
      format: "fni",
      department: "56",
    });
  });

  it("détecte une plaque FNI avec département DOM-TOM (974)", () => {
    const findings = licensePlateFrDetector.detect("Voiture 1234 AB 974.");
    expect(findings).toHaveLength(1);
    expect(findings[0]!.metadata).toMatchObject({ department: "974" });
  });

  it("rejette une plaque FNI avec département invalide (99)", () => {
    expect(licensePlateFrDetector.detect("Plaque 1234 AB 99")).toEqual([]);
  });

  it("rejette une plaque FNI avec département invalide (96)", () => {
    expect(licensePlateFrDetector.detect("Plaque 1234 AB 96")).toEqual([]);
  });

  it("ne capture pas un identifiant numérique sans le pattern lettre", () => {
    expect(licensePlateFrDetector.detect("ID-123-456")).toEqual([]);
  });

  it("détecte plusieurs plaques SIV dans le même texte", () => {
    const findings = licensePlateFrDetector.detect(
      "AB-123-CD et CD-456-EF garés.",
    );
    expect(findings).toHaveLength(2);
    expect(findings.map((f) => f.value)).toEqual(["AB-123-CD", "CD-456-EF"]);
  });

  it("ordonne les findings par position croissante (mix SIV+FNI)", () => {
    const text = "FNI 1234 AB 75, puis SIV CD-456-EF.";
    const findings = licensePlateFrDetector.detect(text);
    expect(findings).toHaveLength(2);
    expect(findings[0]!.metadata?.format).toBe("fni");
    expect(findings[1]!.metadata?.format).toBe("siv");
  });

  it("ignore les plaques accolées à d'autres lettres ou chiffres", () => {
    expect(licensePlateFrDetector.detect("XAB-123-CD")).toEqual([]);
    expect(licensePlateFrDetector.detect("AB-123-CDX")).toEqual([]);
  });

  it("est pure : appels successifs renvoient des findings égaux", () => {
    const text = "AB-123-CD";
    expect(licensePlateFrDetector.detect(text)).toEqual(
      licensePlateFrDetector.detect(text),
    );
  });

  it("expose la position correcte (start/end)", () => {
    const text = "Voiture AB-123-CD ici.";
    const findings = licensePlateFrDetector.detect(text);
    expect(findings[0]!.location).toEqual({
      start: text.indexOf("AB-123-CD"),
      end: text.indexOf("AB-123-CD") + 9,
    });
  });
});
