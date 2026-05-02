// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";

import { jsonParser } from "./json-parser.js";
import type { TextChunk } from "./types.js";

async function collect(iter: AsyncIterable<TextChunk>): Promise<TextChunk[]> {
  const out: TextChunk[] = [];
  for await (const chunk of iter) {
    out.push(chunk);
  }
  return out;
}

function jsonFile(name: string, body: unknown): File {
  return new File([JSON.stringify(body)], name, { type: "application/json" });
}

describe("jsonParser", () => {
  it("émet une chunk par valeur string, ignore nombres/bool/null", async () => {
    const chunks = await collect(
      jsonParser.parse(
        jsonFile("data.json", {
          name: "Alice",
          age: 30,
          active: true,
          deleted: null,
          notes: "alice@example.com",
        }),
      ),
    );
    const texts = chunks.map((c) => c.text).sort();
    expect(texts).toEqual(["Alice", "alice@example.com"]);
  });

  it("préserve l'ordre des clés `Object.keys`", async () => {
    const chunks = await collect(
      jsonParser.parse(
        jsonFile("ordered.json", { a: "first", b: "second", c: "third" }),
      ),
    );
    expect(chunks.map((c) => c.text)).toEqual(["first", "second", "third"]);
  });

  it("note le chemin avec notation pointée pour les identifiants ECMAScript", async () => {
    const chunks = await collect(
      jsonParser.parse(jsonFile("path.json", { user: { email: "a@b.fr" } })),
    );
    expect(chunks).toEqual([{ text: "a@b.fr", path: "$.user.email" }]);
  });

  it("note le chemin avec notation crochets pour les clés exotiques", async () => {
    const chunks = await collect(
      jsonParser.parse(jsonFile("weird.json", { "user-id": "u-42" })),
    );
    expect(chunks).toEqual([{ text: "u-42", path: '$["user-id"]' }]);
  });

  it("indexe correctement les éléments d'un tableau", async () => {
    const chunks = await collect(
      jsonParser.parse(
        jsonFile("arr.json", {
          users: [{ email: "u0@x.fr" }, { email: "u1@x.fr" }],
        }),
      ),
    );
    expect(chunks).toEqual([
      { text: "u0@x.fr", path: "$.users[0].email" },
      { text: "u1@x.fr", path: "$.users[1].email" },
    ]);
  });

  it("supporte les structures profondes sans saturer le stack", async () => {
    // Construit un objet imbriqué de profondeur 200.
    let nested: unknown = "feuille@x.fr";
    for (let i = 0; i < 200; i++) {
      nested = { child: nested };
    }
    const chunks = await collect(
      jsonParser.parse(jsonFile("deep.json", nested)),
    );
    expect(chunks).toHaveLength(1);
    expect(chunks[0]?.text).toBe("feuille@x.fr");
    // Path = "$" + 200 segments ".child".
    expect(chunks[0]?.path).toBe("$" + ".child".repeat(200));
  });

  it("lève une erreur lisible sur JSON invalide", async () => {
    const file = new File(["{ this is not json"], "broken.json");
    await expect(async () => {
      // for-await pour déclencher l'évaluation du générateur.
      for await (const _ of jsonParser.parse(file)) {
        void _;
      }
    }).rejects.toThrow(/n'est pas un JSON valide/);
  });

  it("annonce le format `json`", () => {
    expect(jsonParser.format).toBe("json");
  });
});
