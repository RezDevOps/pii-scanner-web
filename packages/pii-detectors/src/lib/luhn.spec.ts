import { describe, expect, it } from "vitest";
import { isLuhnValid } from "./luhn.js";

describe("isLuhnValid", () => {
  it("valide un SIRET INSEE de référence", () => {
    // SIRET utilisé par l'INSEE pour expliquer Luhn dans sa notice publique.
    expect(isLuhnValid("73282932000074")).toBe(true);
  });

  it("valide un PAN de test Visa", () => {
    expect(isLuhnValid("4111111111111111")).toBe(true);
  });

  it("rejette une chaîne dont la clé est fausse", () => {
    expect(isLuhnValid("73282932000075")).toBe(false);
  });

  it("rejette une chaîne vide", () => {
    expect(isLuhnValid("")).toBe(false);
  });

  it("rejette une chaîne contenant un caractère non numérique", () => {
    expect(isLuhnValid("4111-1111-1111-1111")).toBe(false);
    expect(isLuhnValid("4111111111111A11")).toBe(false);
  });

  it("est insensible à un seul chiffre", () => {
    // Un seul chiffre `0` est techniquement valide (somme = 0).
    expect(isLuhnValid("0")).toBe(true);
  });
});
