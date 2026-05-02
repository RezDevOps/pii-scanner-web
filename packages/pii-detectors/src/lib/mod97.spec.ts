import { describe, expect, it } from "vitest";
import { isIbanMod97Valid } from "./mod97.js";

describe("isIbanMod97Valid", () => {
  it.each([
    ["FR1420041010050500013M02606", "FR — exemple canonique CFONB"],
    ["DE89370400440532013000", "DE — Deutsche Bank exemple public"],
    ["GB29NWBK60161331926819", "GB — exemple ISO 13616 public"],
    ["BE68539007547034", "BE — exemple Wikipedia public"],
    ["CH9300762011623852957", "CH — exemple Credit Suisse public"],
    ["NL91ABNA0417164300", "NL — exemple ABN AMRO public"],
  ])("valide %s (%s)", (iban) => {
    expect(isIbanMod97Valid(iban)).toBe(true);
  });

  it("rejette un IBAN dont la clé MOD 97 est fausse", () => {
    // Modification d'un seul chiffre du milieu : la clé devient invalide.
    expect(isIbanMod97Valid("FR1420041010050500013M02607")).toBe(false);
  });

  it("rejette un IBAN avec un caractère hors alphabet ISO", () => {
    expect(isIbanMod97Valid("FR142004101005050001*M02606")).toBe(false);
  });

  it("rejette une chaîne vide", () => {
    expect(isIbanMod97Valid("")).toBe(false);
  });
});
