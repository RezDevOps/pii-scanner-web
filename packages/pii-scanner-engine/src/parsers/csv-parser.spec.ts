// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";

import { csvParser, tsvParser } from "./csv-parser.js";
import type { TextChunk } from "./types.js";

async function collect(iter: AsyncIterable<TextChunk>): Promise<TextChunk[]> {
  const out: TextChunk[] = [];
  for await (const chunk of iter) {
    out.push(chunk);
  }
  return out;
}

describe("csvParser", () => {
  it("émet une chunk par cellule non vide, avec colonne et ligne 1-based", async () => {
    const file = new File(
      ["nom,email\nAlice,alice@example.com\nBob,bob@example.org\n"],
      "users.csv",
      { type: "text/csv" },
    );
    const chunks = await collect(csvParser.parse(file));
    expect(chunks).toEqual([
      { text: "Alice", line: 2, path: "nom" },
      { text: "alice@example.com", line: 2, path: "email" },
      { text: "Bob", line: 3, path: "nom" },
      { text: "bob@example.org", line: 3, path: "email" },
    ]);
  });

  it("ignore les cellules vides", async () => {
    const file = new File(
      ["nom,email\nAlice,\n,bob@example.org\n"],
      "sparse.csv",
    );
    const chunks = await collect(csvParser.parse(file));
    expect(chunks).toEqual([
      { text: "Alice", line: 2, path: "nom" },
      { text: "bob@example.org", line: 3, path: "email" },
    ]);
  });

  it("respecte les guillemets pour les valeurs contenant des virgules", async () => {
    const file = new File(
      ['adresse\n"12, rue de Rivoli, 75001 Paris"\n'],
      "addr.csv",
    );
    const chunks = await collect(csvParser.parse(file));
    expect(chunks).toEqual([
      { text: "12, rue de Rivoli, 75001 Paris", line: 2, path: "adresse" },
    ]);
  });

  it("lève une erreur lisible sur un CSV mal formé", async () => {
    // Quote non fermé → fatal: { type: "Quotes" }
    const file = new File(['nom\n"Alice'], "broken.csv");
    await expect(async () => {
      for await (const _ of csvParser.parse(file)) {
        void _;
      }
    }).rejects.toThrow(/Erreur CSV/);
  });

  it("annonce le format `csv`", () => {
    expect(csvParser.format).toBe("csv");
  });
});

describe("tsvParser", () => {
  it("scinde sur la tabulation", async () => {
    const file = new File(
      ["nom\temail\nAlice\talice@example.com\n"],
      "users.tsv",
      { type: "text/tab-separated-values" },
    );
    const chunks = await collect(tsvParser.parse(file));
    expect(chunks).toEqual([
      { text: "Alice", line: 2, path: "nom" },
      { text: "alice@example.com", line: 2, path: "email" },
    ]);
  });

  it("annonce le format `tsv`", () => {
    expect(tsvParser.format).toBe("tsv");
  });
});
