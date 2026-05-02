/**
 * Tests du parseur DOCX. Le fixture .docx est inliné en base64 dans
 * `MINIMAL_DOCX_BASE64` ci-dessous : c'est un document Word minimal valide
 * (Content_Types + _rels/.rels + word/document.xml) contenant 4 paragraphes :
 *   1. "Bonjour Marie"
 *   2. (vide)
 *   3. "email: marie.dupont@example.fr"
 *   4. "Téléphone : 06 12 34 56 78"
 *
 * On vérifie que mammoth + notre wrapper produisent bien 3 chunks (paragraphe
 * vide ignoré) avec les bons paths `paragraph[N]` et lignes 1-based.
 */
import { describe, expect, it } from "vitest";

import {
  MINIMAL_DOCX_BASE64,
  base64ToArrayBuffer,
} from "./__fixtures__/binary-fixtures.js";
import type { ParserInput } from "./types.js";

import { docxParser } from "./docx-parser.js";

/** ParserInput synthétique à partir du fixture inline. */
function makeDocxInput(name = "fixture.docx"): ParserInput {
  const buffer = base64ToArrayBuffer(MINIMAL_DOCX_BASE64);
  return {
    name,
    size: buffer.byteLength,
    text: () =>
      Promise.reject(new Error("text() ne doit pas être appelé sur un docx")),
    arrayBuffer: () => Promise.resolve(buffer),
  };
}

describe("docxParser", () => {
  it("expose le format `docx`", () => {
    expect(docxParser.format).toBe("docx");
  });

  it("extrait les paragraphes non-vides du fixture, ignorant le paragraphe vide", async () => {
    const chunks = [];
    for await (const c of docxParser.parse(makeDocxInput())) {
      chunks.push(c);
    }
    expect(chunks).toHaveLength(3);
    expect(chunks.map((c) => c.text)).toEqual([
      "Bonjour Marie",
      "email: marie.dupont@example.fr",
      "Téléphone : 06 12 34 56 78",
    ]);
  });

  it("annote chaque chunk avec un path `paragraph[N]` 1-based", async () => {
    const chunks = [];
    for await (const c of docxParser.parse(makeDocxInput())) {
      chunks.push(c);
    }
    expect(chunks[0]?.path).toBe("paragraph[1]");
    expect(chunks[1]?.path).toBe("paragraph[2]");
    expect(chunks[2]?.path).toBe("paragraph[3]");
  });

  it("expose le numéro de paragraphe via `line` (utilisé pour l'enrichissement des findings)", async () => {
    const chunks = [];
    for await (const c of docxParser.parse(makeDocxInput())) {
      chunks.push(c);
    }
    expect(chunks[0]?.line).toBe(1);
    expect(chunks[1]?.line).toBe(2);
    expect(chunks[2]?.line).toBe(3);
  });
});
