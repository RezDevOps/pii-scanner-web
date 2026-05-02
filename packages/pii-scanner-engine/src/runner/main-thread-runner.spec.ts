import { describe, expect, it } from "vitest";

import { coreDetectors } from "@rezdevops/pii-detectors";

import {
  MainThreadRunner,
  createMainThreadRunner,
  resolveDetectors,
} from "./main-thread-runner.js";

describe("resolveDetectors", () => {
  it("retourne les détecteurs cœur correspondants", () => {
    const result = resolveDetectors(["email", "iban"]);
    expect(result.map((d) => d.id)).toEqual(["email", "iban"]);
  });

  it("ignore silencieusement les identifiants inconnus (compat ascendante)", () => {
    const result = resolveDetectors(["email", "future-detector-x"]);
    expect(result.map((d) => d.id)).toEqual(["email"]);
  });

  it("retourne une liste vide si aucun id ne matche", () => {
    expect(resolveDetectors(["unknown"])).toEqual([]);
  });

  it("préserve l'ordre des `id` fournis", () => {
    const ids = ["iban", "email", "phone-fr"];
    const result = resolveDetectors(ids);
    expect(result.map((d) => d.id)).toEqual(ids);
  });
});

describe("MainThreadRunner", () => {
  it("retourne les findings de tous les détecteurs cœur", async () => {
    const runner = new MainThreadRunner();
    const text = "Contact: alice@example.com — IBAN test";
    const findings = await runner.runScanText({
      text,
      detectorIds: coreDetectors.map((d) => d.id),
    });
    expect(findings.some((f) => f.detector === "email")).toBe(true);
    expect(findings.find((f) => f.detector === "email")?.value).toBe(
      "alice@example.com",
    );
  });

  it("dispose() est idempotent et ne lève pas", () => {
    const runner = new MainThreadRunner();
    expect(() => runner.dispose()).not.toThrow();
    expect(() => runner.dispose()).not.toThrow();
  });
});

describe("createMainThreadRunner", () => {
  it("retourne une instance utilisable directement", async () => {
    const runner = createMainThreadRunner();
    const findings = await runner.runScanText({
      text: "alice@example.com",
      detectorIds: ["email"],
    });
    expect(findings).toHaveLength(1);
  });
});
