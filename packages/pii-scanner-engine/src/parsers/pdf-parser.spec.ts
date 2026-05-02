/**
 * Tests du parseur PDF. Le fixture est un PDF 2 pages généré une fois
 * via `reportlab` (Python) puis inliné dans `__fixtures__/binary-fixtures.ts`.
 *
 * Page 1 :
 *   "Bonjour Marie"
 *   "email: marie.dupont@example.fr"
 *   "telephone: 06 12 34 56 78"
 * Page 2 :
 *   "Page 2 - Confidentiel"
 *   "IBAN: FR76 3000 4000 0312 3456 7890 187"
 *
 * Note : reportlab utilise un encoding compressé ASCII85+Flate ; PDF.js
 * sait le décoder nativement. On vérifie que le texte se retrouve dans
 * les chunks émis, sans imposer un format de normalisation strict (PDF.js
 * peut intercaler des espaces selon les positions des glyphes).
 */
import { describe, expect, it } from "vitest";

import {
  MINIMAL_PDF_BASE64,
  base64ToArrayBuffer,
} from "./__fixtures__/binary-fixtures.js";
import type { ParserInput } from "./types.js";

import { pdfParser } from "./pdf-parser.js";

function makePdfInput(name = "fixture.pdf"): ParserInput {
  const buffer = base64ToArrayBuffer(MINIMAL_PDF_BASE64);
  return {
    name,
    size: buffer.byteLength,
    text: () =>
      Promise.reject(new Error("text() ne doit pas être appelé sur un pdf")),
    arrayBuffer: () => Promise.resolve(buffer),
  };
}

describe("pdfParser", () => {
  it("expose le format `pdf`", () => {
    expect(pdfParser.format).toBe("pdf");
  });

  it("émet un chunk par page (le fixture en a 2)", async () => {
    const chunks = [];
    for await (const c of pdfParser.parse(makePdfInput())) {
      chunks.push(c);
    }
    expect(chunks).toHaveLength(2);
  });

  it("annote chaque chunk avec `path = page[N]` et `line = N`", async () => {
    const chunks = [];
    for await (const c of pdfParser.parse(makePdfInput())) {
      chunks.push(c);
    }
    expect(chunks[0]?.path).toBe("page[1]");
    expect(chunks[0]?.line).toBe(1);
    expect(chunks[1]?.path).toBe("page[2]");
    expect(chunks[1]?.line).toBe(2);
  });

  it("retrouve le contenu textuel attendu sur la page 1", async () => {
    const chunks = [];
    for await (const c of pdfParser.parse(makePdfInput())) {
      chunks.push(c);
    }
    const page1 = chunks[0]?.text ?? "";
    expect(page1).toContain("Bonjour Marie");
    expect(page1).toContain("marie.dupont@example.fr");
    expect(page1).toContain("06 12 34 56 78");
  });

  it("retrouve le contenu textuel attendu sur la page 2", async () => {
    const chunks = [];
    for await (const c of pdfParser.parse(makePdfInput())) {
      chunks.push(c);
    }
    const page2 = chunks[1]?.text ?? "";
    expect(page2).toContain("Confidentiel");
    expect(page2).toContain("FR76");
  });
});
