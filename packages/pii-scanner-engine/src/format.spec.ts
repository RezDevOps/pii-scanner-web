import { describe, expect, it } from "vitest";

import {
  ACTIVE_FORMATS_V0_2_0,
  DEFERRED_FORMATS_V0_2_1,
  DeferredFormatError,
  UnsupportedFormatError,
  detectFormat,
  tryDetectFormat,
} from "./format.js";

describe("detectFormat", () => {
  it("reconnaît les formats actifs en v0.2.0", () => {
    expect(detectFormat({ name: "clients.csv" })).toBe("csv");
    expect(detectFormat({ name: "clients.tsv" })).toBe("tsv");
    expect(detectFormat({ name: "notes.txt" })).toBe("txt");
    expect(detectFormat({ name: "rapport.md" })).toBe("md");
    expect(detectFormat({ name: "rapport.markdown" })).toBe("md");
    expect(detectFormat({ name: "data.json" })).toBe("json");
    expect(detectFormat({ name: "log.ndjson" })).toBe("json");
  });

  it("est insensible à la casse de l'extension", () => {
    expect(detectFormat({ name: "Clients.CSV" })).toBe("csv");
    expect(detectFormat({ name: "DATA.JSON" })).toBe("json");
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

  it("lève DeferredFormatError pour les formats reportés en v0.2.1", () => {
    for (const ext of ["xlsx", "xls", "pdf", "docx", "html", "htm"]) {
      expect(() => detectFormat({ name: `fichier.${ext}` })).toThrowError(
        DeferredFormatError,
      );
    }
  });
});

describe("tryDetectFormat", () => {
  it("retourne le format en cas de succès", () => {
    expect(tryDetectFormat({ name: "data.csv" })).toEqual({ format: "csv" });
  });

  it("retourne un objet d'erreur typé pour les formats non scannables", () => {
    expect(tryDetectFormat({ name: "doc.pdf" })).toEqual({ error: "deferred" });
    expect(tryDetectFormat({ name: "archive.zip" })).toEqual({
      error: "unsupported",
    });
  });
});

describe("constantes de roadmap", () => {
  it("expose 5 formats actifs et 5 formats reportés", () => {
    expect(ACTIVE_FORMATS_V0_2_0).toHaveLength(5);
    expect(DEFERRED_FORMATS_V0_2_1).toHaveLength(5);
  });

  it("ne chevauche jamais l'actif et le différé", () => {
    const active = new Set<string>(ACTIVE_FORMATS_V0_2_0);
    for (const fmt of DEFERRED_FORMATS_V0_2_1) {
      expect(active.has(fmt)).toBe(false);
    }
  });
});
