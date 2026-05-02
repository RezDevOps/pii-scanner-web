// @vitest-environment happy-dom
//
// happy-dom est requis pour disposer de `File` / `Blob` natifs : Node 20
// les fournit en global mais Vitest en mode `node` n'expose pas
// l'implémentation DOM stricte qu'attendent nos parseurs.
import { describe, expect, it } from "vitest";

import { mdParser, txtParser } from "./text-parser.js";
import type { TextChunk } from "./types.js";

async function collect(iter: AsyncIterable<TextChunk>): Promise<TextChunk[]> {
  const out: TextChunk[] = [];
  for await (const chunk of iter) {
    out.push(chunk);
  }
  return out;
}

describe("txtParser", () => {
  it("rend chaque ligne avec son numéro 1-based", async () => {
    const file = new File(
      ["alice@example.com\nbob@example.org\n"],
      "users.txt",
      {
        type: "text/plain",
      },
    );
    const chunks = await collect(txtParser.parse(file));
    // 2 lignes + 1 ligne vide finale (split sur \n).
    expect(chunks).toEqual([
      { text: "alice@example.com", line: 1 },
      { text: "bob@example.org", line: 2 },
      { text: "", line: 3 },
    ]);
  });

  it("normalise les fins de ligne CRLF (Windows) sans dupliquer", async () => {
    const file = new File(["a\r\nb\r\nc"], "win.txt", { type: "text/plain" });
    const chunks = await collect(txtParser.parse(file));
    expect(chunks.map((c) => c.text)).toEqual(["a", "b", "c"]);
  });

  it("annonce le format `txt`", () => {
    expect(txtParser.format).toBe("txt");
  });
});

describe("mdParser", () => {
  it("traite le markdown comme du texte brut (pas d'interprétation)", async () => {
    const file = new File(
      ["# Titre\n\nVoici un email : alice@example.com\n"],
      "doc.md",
      { type: "text/markdown" },
    );
    const chunks = await collect(mdParser.parse(file));
    // 4 lignes (titre, vide, contenu, vide finale).
    expect(chunks.map((c) => c.text)).toEqual([
      "# Titre",
      "",
      "Voici un email : alice@example.com",
      "",
    ]);
  });

  it("annonce le format `md`", () => {
    expect(mdParser.format).toBe("md");
  });
});
