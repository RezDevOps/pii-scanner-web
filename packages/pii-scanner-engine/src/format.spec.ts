import { describe, expect, it } from "vitest";

import {
  ACTIVE_FORMATS,
  ACTIVE_FORMATS_V0_2_0,
  DEFERRED_FORMATS_V0_2_1,
  UnsupportedFormatError,
  detectFormat,
  tryDetectFormat,
} from "./format.js";

describe("detectFormat", () => {
  it("reconnaît les formats texte", () => {
    expect(detectFormat({ name: "clients.csv" })).toBe("csv");
    expect(detectFormat({ name: "clients.tsv" })).toBe("tsv");
    expect(detectFormat({ name: "notes.txt" })).toBe("txt");
    expect(detectFormat({ name: "rapport.md" })).toBe("md");
    expect(detectFormat({ name: "rapport.markdown" })).toBe("md");
    expect(detectFormat({ name: "data.json" })).toBe("json");
    expect(detectFormat({ name: "log.ndjson" })).toBe("json");
  });

  it("reconnaît les formats binaires activés en v0.2.1", () => {
    expect(detectFormat({ name: "clients.xlsx" })).toBe("xlsx");
    expect(detectFormat({ name: "legacy.xls" })).toBe("xls");
    expect(detectFormat({ name: "contrat.pdf" })).toBe("pdf");
    expect(detectFormat({ name: "rapport.docx" })).toBe("docx");
    expect(detectFormat({ name: "page.html" })).toBe("html");
    expect(detectFormat({ name: "old.htm" })).toBe("html");
  });

  it("est insensible à la casse de l'extension", () => {
    expect(detectFormat({ name: "Clients.CSV" })).toBe("csv");
    expect(detectFormat({ name: "DATA.JSON" })).toBe("json");
    expect(detectFormat({ name: "Doc.PDF" })).toBe("pdf");
  });

  it("ne se laisse pas piéger par un point dans le nom", () => {
    // Le format est déterminé par le DERNIER segment après le point.
    expect(detectFormat({ name: "v1.2.dump.csv" })).toBe("csv");
  });

  it("lève UnsupportedFormatError pour une extension inconnue", () => {
    expect(() => detectFormat({ name: "archive.zip" })).toThrowError(
      UnsupportedFormatError,
    );
    expect(() => detectFormat({ name: "image.jpg" })).toThrowError(
      UnsupportedFormatError,
    );
  });

  it("lève UnsupportedFormatError pour un nom sans extension", () => {
    expect(() => detectFormat({ name: "README" })).toThrowError(
      UnsupportedFormatError,
    );
  });
});

describe("tryDetectFormat", () => {
  it("retourne le format en cas de succès", () => {
    expect(tryDetectFormat({ name: "data.csv" })).toEqual({ format: "csv" });
    expect(tryDetectFormat({ name: "doc.pdf" })).toEqual({ format: "pdf" });
    expect(tryDetectFormat({ name: "page.html" })).toEqual({ format: "html" });
  });

  it("retourne un objet d'erreur typé pour les formats inconnus", () => {
    expect(tryDetectFormat({ name: "archive.zip" })).toEqual({
      error: "unsupported",
    });
  });
});

describe("constantes de roadmap", () => {
  it("ACTIVE_FORMATS expose 10 formats (5 texte + 5 binaires)", () => {
    expect(ACTIVE_FORMATS).toHaveLength(10);
  });

  it("ACTIVE_FORMATS_V0_2_0 reste à 5 (rétrocompat, deprecated)", () => {
    expect(ACTIVE_FORMATS_V0_2_0).toHaveLength(5);
  });

  it("DEFERRED_FORMATS_V0_2_1 est vide depuis v0.2.1 (deprecated)", () => {
    expect(DEFERRED_FORMATS_V0_2_1).toHaveLength(0);
  });
});
