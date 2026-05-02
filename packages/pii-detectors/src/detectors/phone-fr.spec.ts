import { describe, expect, it } from "vitest";
import { phoneFrDetector } from "./phone-fr.js";

describe("phoneFrDetector", () => {
  it.each([
    ["06 12 34 56 78", "mobile", "espaces"],
    ["06.12.34.56.78", "mobile", "points"],
    ["06-12-34-56-78", "mobile", "tirets"],
    ["0612345678", "mobile", "compact"],
    ["+33 6 12 34 56 78", "mobile", "international espacé"],
    ["+33612345678", "mobile", "international compact"],
    ["0033612345678", "mobile", "préfixe 0033"],
    ["01 23 45 67 89", "fixe", "fixe géographique"],
    ["09 70 12 34 56", "non-geo", "fixe non géographique"],
    ["08 92 70 12 39", "svp", "service à valeur ajoutée"],
  ])("détecte « %s » comme %s (%s)", (input, kind) => {
    const findings = phoneFrDetector.detect(`Tél : ${input} merci.`);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.value).toBe(input);
    expect(findings[0]?.metadata).toMatchObject({ kind });
  });

  it("ne capture pas une suite de chiffres trop longue collée à un téléphone", () => {
    // Le téléphone est noyé dans un identifiant de 14 chiffres → pas de match.
    expect(phoneFrDetector.detect("REF06123456789012")).toEqual([]);
  });

  it("ne capture pas un format incomplet", () => {
    expect(phoneFrDetector.detect("06 12 34 56")).toEqual([]);
  });

  it("ne capture pas un faux préfixe (00 sans 33)", () => {
    expect(phoneFrDetector.detect("0044 612345678")).toEqual([]);
  });

  it("détecte plusieurs téléphones avec leurs positions", () => {
    const text = "Lui : 06 11 22 33 44 / Elle : +33 7 55 66 77 88";
    const findings = phoneFrDetector.detect(text);
    expect(findings).toHaveLength(2);
    for (const f of findings) {
      expect(text.slice(f.location.start, f.location.end)).toBe(f.value);
    }
  });
});
