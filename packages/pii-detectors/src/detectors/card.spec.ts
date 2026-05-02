import { describe, expect, it } from "vitest";
import { cardDetector, detectCardBrand } from "./card.js";

/**
 * PAN de TEST publics (Stripe / Adyen / payment-gateway), JAMAIS associés
 * à un titulaire réel. Tous valident Luhn par construction.
 *  - 4242 4242 4242 4242 = Visa de test Stripe
 *  - 5555 5555 5555 4444 = Mastercard de test Stripe
 *  - 3782 822463 10005   = Amex de test Stripe (15 chiffres)
 *  - 6011 1111 1111 1117 = Discover de test
 *  - 3530 1113 3330 0000 = JCB de test (Adyen)
 *  - 3056 9309 0259 04   = Diners de test (Adyen, 14 chiffres)
 */
const TEST_PANS = {
  visa: "4242424242424242",
  visa13: "4222222222222",
  mastercard: "5555555555554444",
  mastercard2bin: "2223003122003222",
  amex: "378282246310005",
  discover: "6011111111111117",
  jcb: "3530111333300000",
  diners: "30569309025904",
} as const;

describe("cardDetector", () => {
  it("a l'identité canonique attendue", () => {
    expect(cardDetector.id).toBe("card");
    expect(cardDetector.label).toMatch(/PAN|carte/i);
    expect(cardDetector.source).toMatch(/ISO\/IEC 7812-1|Luhn/);
  });

  it("détecte un Visa 16 chiffres et identifie la marque", () => {
    const findings = cardDetector.detect(`Carte : ${TEST_PANS.visa}`);
    expect(findings).toHaveLength(1);
    const finding = findings[0]!;
    expect(finding.confidence).toBe("high");
    expect(finding.severity).toBe("critical");
    expect(finding.metadata).toMatchObject({
      brand: "visa",
      length: 16,
      last4: "4242",
      bin: "424242",
    });
  });

  it("détecte un Visa 13 chiffres (legacy)", () => {
    const findings = cardDetector.detect(TEST_PANS.visa13);
    expect(findings).toHaveLength(1);
    expect(findings[0]!.metadata).toMatchObject({
      brand: "visa",
      length: 13,
    });
  });

  it("détecte un Mastercard 5x", () => {
    const findings = cardDetector.detect(TEST_PANS.mastercard);
    expect(findings).toHaveLength(1);
    expect(findings[0]!.metadata).toMatchObject({ brand: "mastercard" });
  });

  it("détecte un Mastercard série 2 (BIN 2221-2720)", () => {
    const findings = cardDetector.detect(TEST_PANS.mastercard2bin);
    expect(findings).toHaveLength(1);
    expect(findings[0]!.metadata).toMatchObject({ brand: "mastercard" });
  });

  it("détecte un Amex 15 chiffres (préfixe 34/37)", () => {
    const findings = cardDetector.detect(`AMEX = ${TEST_PANS.amex}`);
    expect(findings).toHaveLength(1);
    expect(findings[0]!.metadata).toMatchObject({
      brand: "amex",
      length: 15,
    });
  });

  it("détecte un Discover (préfixe 6011 ou 65)", () => {
    expect(cardDetector.detect(TEST_PANS.discover)[0]!.metadata?.brand).toBe(
      "discover",
    );
  });

  it("détecte un JCB (préfixe 3528-3589)", () => {
    expect(cardDetector.detect(TEST_PANS.jcb)[0]!.metadata?.brand).toBe("jcb");
  });

  it("détecte un Diners 14 chiffres", () => {
    expect(cardDetector.detect(TEST_PANS.diners)[0]!.metadata?.brand).toBe(
      "diners",
    );
  });

  it("accepte la forme imprimée avec espaces (XXXX XXXX XXXX XXXX)", () => {
    const findings = cardDetector.detect("4242 4242 4242 4242");
    expect(findings).toHaveLength(1);
    expect(findings[0]!.metadata).toMatchObject({ brand: "visa" });
  });

  it("accepte la forme avec tirets (XXXX-XXXX-XXXX-XXXX)", () => {
    const findings = cardDetector.detect("4242-4242-4242-4242");
    expect(findings).toHaveLength(1);
    expect(findings[0]!.metadata).toMatchObject({ brand: "visa" });
  });

  it("rejette une chaîne de chiffres ne validant pas Luhn", () => {
    expect(cardDetector.detect("4242424242424241")).toEqual([]);
  });

  it("rejette une chaîne valide Luhn mais sans préfixe de marque connu", () => {
    // 1234567890123452 valide Luhn mais commence par `1` (non couvert).
    expect(cardDetector.detect("1234567890123452")).toEqual([]);
  });

  it("rejette une longueur hors [13, 19]", () => {
    expect(cardDetector.detect("4242424242")).toEqual([]); // 10 chiffres
    expect(cardDetector.detect("42424242424242424242")).toEqual([]); // 20 chiffres
  });

  it("ignore les chiffres adjacents (lookaround)", () => {
    // 17 chiffres autour d'un PAN 16 — ne doit rien matcher si cela dépasse 19.
    const text = `99${TEST_PANS.visa}99`;
    // 4 chiffres en plus → 20 chiffres total → le lookaround en bord va
    // chercher 13-19 chiffres consécutifs à l'intérieur, mais comme le
    // lookbehind/lookahead exclut les bords numériques, il ne trouvera rien.
    expect(cardDetector.detect(text)).toEqual([]);
  });

  it("détecte plusieurs PAN dans le même texte", () => {
    const text = `Visa ${TEST_PANS.visa}, Mastercard ${TEST_PANS.mastercard}.`;
    const findings = cardDetector.detect(text);
    expect(findings).toHaveLength(2);
    expect(findings.map((f) => f.metadata?.brand)).toEqual([
      "visa",
      "mastercard",
    ]);
  });

  it("est pure : appels successifs renvoient des findings égaux", () => {
    const text = `PAN = ${TEST_PANS.amex}`;
    expect(cardDetector.detect(text)).toEqual(cardDetector.detect(text));
  });

  it("expose la position correcte (start/end)", () => {
    const text = `Carte ${TEST_PANS.visa} OK`;
    const findings = cardDetector.detect(text);
    expect(findings[0]!.location).toEqual({
      start: text.indexOf(TEST_PANS.visa),
      end: text.indexOf(TEST_PANS.visa) + TEST_PANS.visa.length,
    });
  });
});

describe("detectCardBrand (primitive)", () => {
  it("identifie Visa par le préfixe 4", () => {
    expect(detectCardBrand("4242424242424242")).toBe("visa");
  });

  it("identifie Mastercard série 5", () => {
    expect(detectCardBrand("5555555555554444")).toBe("mastercard");
  });

  it("identifie Mastercard série 2 (2221-2720)", () => {
    expect(detectCardBrand("2223003122003222")).toBe("mastercard");
    expect(detectCardBrand("2720000000000000")).toBe("mastercard");
  });

  it("ne classe pas Mastercard hors plage 2 (2221-2720)", () => {
    // 2220xxxx... commence par 2220, hors plage Mastercard.
    expect(detectCardBrand("2220000000000000")).toBeNull();
  });

  it("renvoie null pour un préfixe non couvert", () => {
    expect(detectCardBrand("0000000000000000")).toBeNull();
    expect(detectCardBrand("9999999999999999")).toBeNull();
  });

  it("renvoie null si la longueur ne matche pas la marque", () => {
    // Visa accepte 13/16/19 — pas 15.
    expect(detectCardBrand("424242424242424")).toBeNull();
  });
});
