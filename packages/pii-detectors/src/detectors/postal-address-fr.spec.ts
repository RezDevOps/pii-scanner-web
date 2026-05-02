import { describe, expect, it } from "vitest";
import { postalAddressFrDetector } from "./postal-address-fr.js";

describe("postalAddressFrDetector", () => {
  it("a l'identité canonique attendue", () => {
    expect(postalAddressFrDetector.id).toBe("postal-address-fr");
    expect(postalAddressFrDetector.label).toMatch(/adresse/i);
  });

  it("détecte une adresse classique avec rue", () => {
    const findings = postalAddressFrDetector.detect(
      "Adresse : 12 rue de la Paix 75002 Paris",
    );
    expect(findings).toHaveLength(1);
    const finding = findings[0]!;
    expect(finding.confidence).toBe("low");
    expect(finding.severity).toBe("high");
    expect(finding.metadata).toMatchObject({
      postalCode: "75002",
      city: "Paris",
    });
  });

  it("détecte une adresse avec virgule entre voie et CP", () => {
    const findings = postalAddressFrDetector.detect(
      "5 avenue des Champs-Élysées, 75008 Paris.",
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]!.metadata).toMatchObject({
      postalCode: "75008",
      city: "Paris",
    });
  });

  it("détecte une adresse avec suffixe bis/ter", () => {
    const findings = postalAddressFrDetector.detect(
      "12 bis rue Voltaire 69003 Lyon",
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]!.metadata).toMatchObject({ postalCode: "69003" });
  });

  it("détecte une adresse avec abréviation (av., bd., rte)", () => {
    const findings = postalAddressFrDetector.detect("3 av. Foch 75116 Paris");
    expect(findings).toHaveLength(1);
    expect(findings[0]!.metadata).toMatchObject({ postalCode: "75116" });
  });

  it("détecte une adresse avec type place", () => {
    const findings = postalAddressFrDetector.detect(
      "1 place Bellecour 69002 Lyon",
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]!.metadata).toMatchObject({ city: "Lyon" });
  });

  it("rejette une adresse dont le code postal est invalide (96xxx)", () => {
    expect(
      postalAddressFrDetector.detect("12 rue de la Paix 96000 Paris"),
    ).toEqual([]);
  });

  it("rejette une chaîne sans type de voie reconnu", () => {
    expect(
      postalAddressFrDetector.detect("12 machin de la Paix 75002 Paris"),
    ).toEqual([]);
  });

  it("rejette une chaîne sans numéro de voie", () => {
    expect(
      postalAddressFrDetector.detect("rue de la Paix 75002 Paris"),
    ).toEqual([]);
  });

  it("rejette une chaîne sans code postal", () => {
    expect(postalAddressFrDetector.detect("12 rue de la Paix Paris")).toEqual(
      [],
    );
  });

  it("détecte plusieurs adresses dans le même texte", () => {
    const text =
      "Domicile : 12 rue de la Paix 75002 Paris. Bureau : 5 boulevard Haussmann 75009 Paris.";
    const findings = postalAddressFrDetector.detect(text);
    expect(findings).toHaveLength(2);
    expect(findings.map((f) => f.metadata?.postalCode)).toEqual([
      "75002",
      "75009",
    ]);
  });

  it("est pure : appels successifs renvoient des findings égaux", () => {
    const text = "12 rue de la Paix 75002 Paris";
    expect(postalAddressFrDetector.detect(text)).toEqual(
      postalAddressFrDetector.detect(text),
    );
  });

  it("expose une position cohérente (start ≤ end)", () => {
    const text = "Adresse : 12 rue de la Paix 75002 Paris.";
    const findings = postalAddressFrDetector.detect(text);
    expect(findings[0]!.location.end).toBeGreaterThan(
      findings[0]!.location.start,
    );
  });
});
