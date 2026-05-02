import { describe, expect, it } from "vitest";
import { maskValue } from "./mask.js";

describe("maskValue", () => {
  it("retourne la valeur intacte avec mask='none'", () => {
    expect(maskValue("abc123", "none")).toBe("abc123");
    expect(maskValue("", "none")).toBe("");
  });

  it("masque entièrement avec mask='full'", () => {
    expect(maskValue("abc123", "full")).toBe("***");
    expect(maskValue("4242424242424242", "full")).toBe("***");
  });

  it("conserve les 4 derniers caractères avec mask='partial'", () => {
    expect(maskValue("4242424242424242", "partial")).toBe("************4242");
    expect(maskValue("alice@example.com", "partial")).toBe("*************.com");
  });

  it("masque entièrement les chaînes ≤ 4 caractères en partial (rien à montrer)", () => {
    expect(maskValue("ab", "partial")).toBe("***");
    expect(maskValue("abcd", "partial")).toBe("***");
  });
});
