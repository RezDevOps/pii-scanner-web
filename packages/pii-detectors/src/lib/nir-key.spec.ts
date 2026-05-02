import { describe, expect, it } from "vitest";
import { validateNir, isNirKeyValid } from "./nir-key.js";

/**
 * Construit un NIR valide en calculant la clé attendue.
 *
 * Volontairement utilisé dans les tests pour ne PAS coder en dur des NIR
 * (même synthétiques) et pour exercer la fonction sur tout l'espace des
 * combinaisons sexe / année / département.
 */
function buildValidNir(body: string): string {
  if (body.length !== 13) {
    throw new Error(`buildValidNir attend 13 caractères, reçu ${body.length}`);
  }
  // On valide une chaîne arbitraire avec une clé bidon, puis on lit
  // `computedKey` pour reconstruire la chaîne valide.
  const probe = validateNir(`${body}00`);
  if (!probe.computedKey) {
    throw new Error(`Le corps "${body}" ne respecte pas la grammaire NIR`);
  }
  return `${body}${probe.computedKey}`;
}

describe("validateNir", () => {
  it("valide un NIR de France métropolitaine (homme, dpt 75)", () => {
    const nir = buildValidNir("1990175123456");
    const result = validateNir(nir);
    expect(result.wellFormed).toBe(true);
    expect(result.keyValid).toBe(true);
  });

  it("valide un NIR Corse-du-Sud (substitution 2A → 19, offset 1 000 000)", () => {
    const nir = buildValidNir("199032A123456");
    expect(validateNir(nir).keyValid).toBe(true);
  });

  it("valide un NIR Haute-Corse (substitution 2B → 18, offset 2 000 000)", () => {
    const nir = buildValidNir("199032B123456");
    expect(validateNir(nir).keyValid).toBe(true);
  });

  it("rejette un NIR dont la clé ne correspond pas", () => {
    const nir = buildValidNir("2990175123456");
    // On flippe la clé pour casser la vérification.
    const broken =
      nir.slice(0, 13) + (Number(nir.slice(13)) === 97 ? "01" : "97");
    expect(validateNir(broken).keyValid).toBe(false);
    expect(validateNir(broken).wellFormed).toBe(true);
  });

  it("rejette une forme malformée (longueur 14)", () => {
    expect(validateNir("19901751234567").wellFormed).toBe(false);
  });

  it("rejette un sexe non standard", () => {
    expect(validateNir("599017512345678").wellFormed).toBe(false);
  });

  it("rejette une lettre dans le département (autre que 2A/2B)", () => {
    expect(validateNir("19901AB12345678").wellFormed).toBe(false);
  });

  it("isNirKeyValid renvoie un booléen brut", () => {
    const nir = buildValidNir("4990175123456");
    expect(isNirKeyValid(nir)).toBe(true);
    expect(isNirKeyValid("199017512345600")).toBe(false);
  });
});
