import { describe, expect, it } from "vitest";
import { dateOfBirthDetector, isCalendarDateValid } from "./date-of-birth.js";

describe("dateOfBirthDetector", () => {
  it("a l'identité canonique attendue", () => {
    expect(dateOfBirthDetector.id).toBe("date-of-birth");
    expect(dateOfBirthDetector.label).toMatch(/date/i);
  });

  it("détecte une date au format français JJ/MM/AAAA", () => {
    const findings = dateOfBirthDetector.detect("Né le 14/07/1989 à Lille.");
    expect(findings).toHaveLength(1);
    const finding = findings[0]!;
    expect(finding.value).toBe("14/07/1989");
    expect(finding.confidence).toBe("low");
    expect(finding.severity).toBe("medium");
    expect(finding.metadata).toMatchObject({
      format: "dmy",
      iso: "1989-07-14",
    });
  });

  it("détecte une date au format JJ-MM-AAAA", () => {
    const findings = dateOfBirthDetector.detect("Date 01-01-2000 OK.");
    expect(findings).toHaveLength(1);
    expect(findings[0]!.metadata).toMatchObject({ iso: "2000-01-01" });
  });

  it("détecte une date au format JJ.MM.AAAA", () => {
    const findings = dateOfBirthDetector.detect("Date 31.12.1999 OK.");
    expect(findings).toHaveLength(1);
    expect(findings[0]!.metadata).toMatchObject({ iso: "1999-12-31" });
  });

  it("détecte une date au format ISO AAAA-MM-JJ", () => {
    const findings = dateOfBirthDetector.detect("ISO : 1989-07-14");
    expect(findings).toHaveLength(1);
    expect(findings[0]!.metadata).toMatchObject({
      format: "iso",
      iso: "1989-07-14",
    });
  });

  it("rejette une date impossible (31/02/AAAA)", () => {
    expect(dateOfBirthDetector.detect("31/02/2000")).toEqual([]);
  });

  it("rejette une date impossible (32/01/AAAA)", () => {
    expect(dateOfBirthDetector.detect("32/01/2000")).toEqual([]);
  });

  it("rejette le 29 février d'une année non bissextile", () => {
    expect(dateOfBirthDetector.detect("29/02/2023")).toEqual([]);
  });

  it("accepte le 29 février d'une année bissextile (2024)", () => {
    const findings = dateOfBirthDetector.detect("29/02/2024");
    expect(findings).toHaveLength(1);
    expect(findings[0]!.metadata?.iso).toBe("2024-02-29");
  });

  it("rejette une année hors fenêtre [1900, 2100]", () => {
    expect(dateOfBirthDetector.detect("01/01/1899")).toEqual([]);
    expect(dateOfBirthDetector.detect("01/01/2101")).toEqual([]);
  });

  it("ne mélange pas les séparateurs au sein d'une même date", () => {
    // Le pattern force le même séparateur via une back-reference.
    expect(dateOfBirthDetector.detect("14/07-1989")).toEqual([]);
  });

  it("détecte plusieurs dates dans le même texte", () => {
    const findings = dateOfBirthDetector.detect(
      "Né le 14/07/1989 et arrivé le 2024-02-29.",
    );
    expect(findings).toHaveLength(2);
    expect(findings.map((f) => f.metadata?.iso)).toEqual([
      "1989-07-14",
      "2024-02-29",
    ]);
  });

  it("ignore les chiffres adjacents (lookaround)", () => {
    expect(dateOfBirthDetector.detect("914/07/19899")).toEqual([]);
  });

  it("est pure : appels successifs renvoient des findings égaux", () => {
    const text = "14/07/1989";
    expect(dateOfBirthDetector.detect(text)).toEqual(
      dateOfBirthDetector.detect(text),
    );
  });

  it("expose la position correcte (start/end)", () => {
    const text = "Date : 14/07/1989.";
    const findings = dateOfBirthDetector.detect(text);
    expect(findings[0]!.location).toEqual({
      start: text.indexOf("14/07/1989"),
      end: text.indexOf("14/07/1989") + 10,
    });
  });
});

describe("isCalendarDateValid (primitive)", () => {
  it("accepte les dates valides", () => {
    expect(isCalendarDateValid(2000, 2, 29)).toBe(true);
    expect(isCalendarDateValid(2024, 2, 29)).toBe(true);
    expect(isCalendarDateValid(1900, 1, 1)).toBe(true);
  });

  it("rejette les bissextiles non valides", () => {
    expect(isCalendarDateValid(1900, 2, 29)).toBe(false); // règle 100/400
    expect(isCalendarDateValid(2023, 2, 29)).toBe(false);
  });

  it("rejette les mois invalides", () => {
    expect(isCalendarDateValid(2000, 0, 1)).toBe(false);
    expect(isCalendarDateValid(2000, 13, 1)).toBe(false);
  });

  it("rejette les jours hors plage", () => {
    expect(isCalendarDateValid(2000, 4, 31)).toBe(false); // avril a 30 jours
    expect(isCalendarDateValid(2000, 6, 31)).toBe(false); // juin a 30 jours
    expect(isCalendarDateValid(2000, 1, 0)).toBe(false);
    expect(isCalendarDateValid(2000, 1, 32)).toBe(false);
  });
});
