import { describe, expect, it } from "vitest";
import { emailDetector } from "./email.js";

describe("emailDetector", () => {
  it("détecte une adresse simple isolée", () => {
    const findings = emailDetector.detect("Contact : alice@example.com.");
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      detector: "email",
      value: "alice@example.com",
      confidence: "high",
      severity: "medium",
    });
  });

  it("détecte plusieurs adresses dans le même texte avec leurs positions", () => {
    const text = "à : a@x.fr et cc : b.b+filter@sub.example.org";
    const findings = emailDetector.detect(text);
    expect(findings.map((f) => f.value)).toEqual([
      "a@x.fr",
      "b.b+filter@sub.example.org",
    ]);
    // Vérifie que les positions pointent bien sur les sous-chaînes.
    for (const f of findings) {
      expect(text.slice(f.location.start, f.location.end)).toBe(f.value);
    }
  });

  it("ne capture pas un texte sans adresse", () => {
    expect(emailDetector.detect("Ce texte ne contient aucun e-mail.")).toEqual(
      [],
    );
  });

  it("ne capture pas un nom de domaine seul", () => {
    expect(emailDetector.detect("https://example.com/contact")).toEqual([]);
  });

  it("est idempotent (deux appels successifs renvoient le même résultat)", () => {
    const text = "x@y.fr et z@w.fr";
    expect(emailDetector.detect(text)).toEqual(emailDetector.detect(text));
  });
});
