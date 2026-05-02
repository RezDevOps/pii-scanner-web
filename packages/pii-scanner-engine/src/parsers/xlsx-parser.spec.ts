/**
 * Tests du parseur XLSX. Le fixture est généré une fois via openpyxl
 * (Python) et inliné dans `__fixtures__/binary-fixtures.ts`.
 *
 * Structure du fixture :
 *   Sheet "Clients" :
 *     A1=Nom         B1=Email                C1=Téléphone       D1=Solde
 *     A2=Marie Dupont B2=marie.dupont@…       C2=06 12 34 56 78  D2=1250.5
 *     A3=Jean Martin  B3=jean.martin@test.org C3=(vide)
 *   Sheet "Notes" :
 *     A1=Confidentiel
 */
import { describe, expect, it } from "vitest";

import {
  MINIMAL_XLSX_BASE64,
  base64ToArrayBuffer,
} from "./__fixtures__/binary-fixtures.js";
import type { ParserInput } from "./types.js";

import { xlsParser, xlsxParser } from "./xlsx-parser.js";

function makeXlsxInput(name = "fixture.xlsx"): ParserInput {
  const buffer = base64ToArrayBuffer(MINIMAL_XLSX_BASE64);
  return {
    name,
    size: buffer.byteLength,
    text: () =>
      Promise.reject(new Error("text() ne doit pas être appelé sur un xlsx")),
    arrayBuffer: () => Promise.resolve(buffer),
  };
}

describe("xlsxParser", () => {
  it("expose le format `xlsx`", () => {
    expect(xlsxParser.format).toBe("xlsx");
  });

  it("itère toutes les cellules non-vides du workbook", async () => {
    const chunks = [];
    for await (const c of xlsxParser.parse(makeXlsxInput())) {
      chunks.push(c);
    }
    // Sheet "Clients" :
    //   ligne 1 : Nom, Email, Téléphone, Solde → 4
    //   ligne 2 : Marie Dupont, marie.dupont@example.fr, 06 12 34 56 78, 1250.5 → 4
    //   ligne 3 : Jean Martin, jean.martin@test.org → 2 (C3 vide)
    // Sheet "Notes" :
    //   ligne 1 : Confidentiel → 1
    // Total : 4+4+2+1 = 11 chunks
    expect(chunks).toHaveLength(11);
  });

  it("annote chaque cellule avec un path `Sheet!Address`", async () => {
    const chunks = [];
    for await (const c of xlsxParser.parse(makeXlsxInput())) {
      chunks.push(c);
    }
    const emailChunk = chunks.find((c) => c.text === "marie.dupont@example.fr");
    expect(emailChunk).toBeDefined();
    expect(emailChunk?.path).toBe("Clients!B2");
    expect(emailChunk?.line).toBe(2);
  });

  it("inclut la feuille `Notes`", async () => {
    const chunks = [];
    for await (const c of xlsxParser.parse(makeXlsxInput())) {
      chunks.push(c);
    }
    const notesChunk = chunks.find((c) => c.text === "Confidentiel");
    expect(notesChunk).toBeDefined();
    expect(notesChunk?.path).toBe("Notes!A1");
    expect(notesChunk?.line).toBe(1);
  });

  it("convertit les nombres en chaîne (cell.w prioritaire ou String(cell.v))", async () => {
    const chunks = [];
    for await (const c of xlsxParser.parse(makeXlsxInput())) {
      chunks.push(c);
    }
    const soldeChunk = chunks.find((c) => c.path === "Clients!D2");
    expect(soldeChunk).toBeDefined();
    // openpyxl écrit 1250.5 sans format particulier ; SheetJS l'expose
    // soit via cell.w (déjà localisé) soit via cell.v stringifié.
    // On accepte les deux représentations stables.
    // Accepte `1250.5` (en-locale-neutral) ou `1250,5` (FR) ou
    // `1 250.5` / `1.250,5` (séparateurs de milliers selon la locale).
    expect(soldeChunk?.text).toMatch(/^1[\s.]?250[.,]5$/);
  });

  it("xlsParser expose le format `xls`", () => {
    expect(xlsParser.format).toBe("xls");
  });

  it("xlsParser parse aussi des `.xlsx` (SheetJS détecte le format auto)", async () => {
    // SheetJS lit indistinctement xlsx/xls — l'extension est juste
    // documentaire. On valide la reuse du même fixture.
    const chunks = [];
    for await (const c of xlsParser.parse(makeXlsxInput("fixture.xls"))) {
      chunks.push(c);
    }
    expect(chunks.length).toBeGreaterThan(0);
  });
});
