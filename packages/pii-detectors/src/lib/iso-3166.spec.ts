import { describe, expect, it } from "vitest";
import { ISO_3166_ALPHA2, isIso3166Alpha2 } from "./iso-3166.js";

describe("iso-3166 alpha-2", () => {
  it("contient 250 entrées (249 ISO + Kosovo XK)", () => {
    expect(ISO_3166_ALPHA2.size).toBe(250);
  });

  it("reconnaît les codes G7 + Suisse", () => {
    for (const code of ["FR", "DE", "IT", "GB", "US", "JP", "CA", "CH"]) {
      expect(isIso3166Alpha2(code)).toBe(true);
    }
  });

  it("rejette les codes inventés", () => {
    for (const code of ["ZZ", "QQ", "XA", "OO"]) {
      expect(isIso3166Alpha2(code)).toBe(false);
    }
  });

  it("est sensible à la casse (majuscules attendues)", () => {
    expect(isIso3166Alpha2("fr")).toBe(false);
    expect(isIso3166Alpha2("Fr")).toBe(false);
  });

  it("rejette toute entrée dont la longueur n'est pas 2", () => {
    expect(isIso3166Alpha2("FRA")).toBe(false);
    expect(isIso3166Alpha2("F")).toBe(false);
    expect(isIso3166Alpha2("")).toBe(false);
  });
});
