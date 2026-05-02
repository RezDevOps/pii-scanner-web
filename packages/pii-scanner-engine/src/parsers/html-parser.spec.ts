// @vitest-environment happy-dom
/**
 * Tests du parseur HTML. happy-dom fournit `DOMParser`, `document`,
 * `Node` etc. dans cet environnement de test.
 *
 * Stratégie : on teste les invariants documentés du parseur sans
 * accrocher la sortie aux numéros internes (ex. on n'exige pas un path
 * exact si un frère « inattendu » a été inséré par happy-dom comme
 * `<head>` implicite — on cible des structures bien définies).
 */
import { describe, expect, it } from "vitest";

import type { ParserInput, TextChunk } from "./types.js";

import { htmlParser } from "./html-parser.js";

/** Helper : fabrique un `ParserInput` synthétique à partir d'une chaîne. */
function makeInput(html: string, name = "page.html"): ParserInput {
  const buf = new TextEncoder().encode(html);
  return {
    name,
    size: buf.byteLength,
    text: () => Promise.resolve(html),
    arrayBuffer: () =>
      Promise.resolve(
        buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
      ),
  };
}

async function collect(input: ParserInput): Promise<TextChunk[]> {
  const out: TextChunk[] = [];
  for await (const c of htmlParser.parse(input)) {
    out.push(c);
  }
  return out;
}

describe("htmlParser", () => {
  it("expose le format `html`", () => {
    expect(htmlParser.format).toBe("html");
  });

  it("extrait le texte d'un document simple", async () => {
    const html =
      "<!doctype html><html><body><h1>Bonjour</h1><p>contact: jean@dupont.fr</p></body></html>";
    const chunks = await collect(makeInput(html));
    const texts = chunks.map((c) => c.text);
    expect(texts).toContain("Bonjour");
    expect(texts).toContain("contact: jean@dupont.fr");
  });

  it("ignore le contenu de <script>, <style>, <noscript>", async () => {
    const html = `<!doctype html><html><body>
      <script>const apiKey = "AKIAIOSFODNN7EXAMPLE";</script>
      <style>body { color: red }</style>
      <noscript>email: hidden@example.com</noscript>
      <p>visible</p>
    </body></html>`;
    const chunks = await collect(makeInput(html));
    const allText = chunks.map((c) => c.text).join(" ");
    expect(allText).toContain("visible");
    expect(allText).not.toContain("AKIAIOSFODNN7EXAMPLE");
    expect(allText).not.toContain("color: red");
    expect(allText).not.toContain("hidden@example.com");
  });

  it("filtre les nœuds purement blancs (indentation)", async () => {
    const html = `<!doctype html><html><body>
      <p>réel</p>
    </body></html>`;
    const chunks = await collect(makeInput(html));
    // Seul "réel" doit remonter — ni les "\n      " ni les sauts de ligne
    // entre balises.
    expect(chunks).toHaveLength(1);
    expect(chunks[0]?.text).toBe("réel");
  });

  it("annote le path avec un index quand plusieurs frères de même tag existent", async () => {
    const html =
      "<!doctype html><html><body><p>un</p><p>deux</p><p>trois</p></body></html>";
    const chunks = await collect(makeInput(html));
    // 3 paragraphes = 3 chunks, leurs paths doivent être différents et
    // contenir une indexation (p[1] / p[2] / p[3]).
    expect(chunks).toHaveLength(3);
    const paths = chunks.map((c) => c.path ?? "");
    expect(paths[0]).toMatch(/p\[1\]$/);
    expect(paths[1]).toMatch(/p\[2\]$/);
    expect(paths[2]).toMatch(/p\[3\]$/);
  });

  it("garde un path court quand un tag est unique parmi ses frères", async () => {
    const html =
      "<!doctype html><html><body><h1>titre</h1><p>texte</p></body></html>";
    const chunks = await collect(makeInput(html));
    // h1 et p sont uniques dans body : pas d'index.
    const h1 = chunks.find((c) => c.text === "titre");
    const p = chunks.find((c) => c.text === "texte");
    expect(h1?.path).not.toMatch(/\[\d+\]/);
    expect(p?.path).not.toMatch(/\[\d+\]/);
    // Sanity : le path se termine bien par le tag.
    expect(h1?.path).toMatch(/h1$/);
    expect(p?.path).toMatch(/p$/);
  });

  it("traverse les imbrications profondes", async () => {
    const html =
      "<!doctype html><html><body><div><section><article><p>nested</p></article></section></div></body></html>";
    const chunks = await collect(makeInput(html));
    expect(chunks).toHaveLength(1);
    expect(chunks[0]?.text).toBe("nested");
    expect(chunks[0]?.path).toMatch(/article > p$/);
  });

  it("ne lève pas sur du HTML vide", async () => {
    const chunks = await collect(makeInput(""));
    expect(chunks).toEqual([]);
  });

  it("ne lève pas sur du HTML mal formé (pas de <html>)", async () => {
    const html = "<p>orphan</p>";
    const chunks = await collect(makeInput(html));
    // `DOMParser` synthétise un document complet — on doit retrouver le
    // texte sans crash.
    expect(chunks.map((c) => c.text)).toContain("orphan");
  });

  it("préserve le texte avec entités HTML (les entités sont décodées par DOMParser)", async () => {
    const html =
      "<!doctype html><html><body><p>email&nbsp;: a&#64;b.fr</p></body></html>";
    const chunks = await collect(makeInput(html));
    expect(chunks[0]?.text).toContain("a@b.fr");
  });
});
