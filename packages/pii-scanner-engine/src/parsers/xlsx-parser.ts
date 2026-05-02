/**
 * Parseur Excel — couvre `.xlsx` (Office Open XML) et `.xls` (Excel 97-2003
 * binaire) via SheetJS Community Edition (`xlsx` sur npm).
 *
 * Stratégie : `XLSX.read(arrayBuffer, { type: "array", cellDates: true })`
 * → workbook. On itère feuille par feuille, ligne par ligne, cellule par
 * cellule. Pour chaque cellule non-vide on émet un `TextChunk` avec :
 * - `text` : représentation textuelle (`cell.w` si présent — c'est le
 *   format affiché par Excel — sinon `String(cell.v)`).
 * - `path` : `SheetName!A1` (notation Excel native, lisible).
 * - `line` : numéro de ligne 1-based dans la feuille.
 *
 * Les formules ne sont **pas** évaluées : on lit la valeur cachée
 * (`cell.v` / `cell.w`) que SheetJS extrait du fichier. Si la cellule ne
 * contient qu'une formule sans valeur cachée, on ignore.
 *
 * Choix de dépendance : voir `docs/adr/0005-sheetjs-pour-xlsx.md`.
 */
import { read, utils, type CellObject, type WorkSheet } from "xlsx";

import type { FileFormat } from "../types.js";
import type { FileParser, ParserInput, TextChunk } from "./types.js";

/**
 * Crée un parseur SheetJS pour `.xlsx` ou `.xls`. Le format de sortie
 * est le même — SheetJS abstrait la différence à la lecture.
 */
function createXlsxParser(format: "xlsx" | "xls"): FileParser {
  return {
    format,
    async *parse(input: ParserInput): AsyncIterable<TextChunk> {
      const buf = await input.arrayBuffer();
      // `type: "array"` accepte un `Uint8Array` ou un `ArrayBuffer` —
      // on passe l'`ArrayBuffer` directement.
      const wb = read(new Uint8Array(buf), {
        type: "array",
        cellDates: true,
        // `cellNF: false` : on n'a pas besoin du masque de format
        // numérique brut, `cell.w` suffit pour le texte affiché.
        cellNF: false,
        // `cellHTML: false` : pas de génération d'HTML — économise.
        cellHTML: false,
      });
      for (const sheetName of wb.SheetNames) {
        const ws = wb.Sheets[sheetName];
        if (!ws) {
          continue;
        }
        yield* parseSheet(sheetName, ws);
      }
    },
  };
}

async function* parseSheet(
  sheetName: string,
  ws: WorkSheet,
): AsyncIterable<TextChunk> {
  const ref = ws["!ref"];
  if (typeof ref !== "string" || ref.length === 0) {
    // Feuille vide.
    return;
  }
  const range = utils.decode_range(ref);
  for (let r = range.s.r; r <= range.e.r; r++) {
    for (let c = range.s.c; c <= range.e.c; c++) {
      const addr = utils.encode_cell({ r, c });
      const cell = ws[addr] as CellObject | undefined;
      if (!cell) {
        continue;
      }
      const text = cellToText(cell);
      if (text.length === 0) {
        continue;
      }
      yield {
        text,
        path: `${sheetName}!${addr}`,
        line: r + 1,
      };
    }
  }
}

/**
 * Convertit une cellule SheetJS en chaîne. Préfère `cell.w` (rendu
 * Excel, déjà localisé) sinon stringifie `cell.v` selon son type.
 */
function cellToText(cell: CellObject): string {
  // `cell.w` est calculé pour les types numériques/date avec format —
  // pour les strings, `cell.w` est égal à `cell.v` ou absent. On le
  // préfère car il respecte le format affiché à l'utilisateur.
  if (typeof cell.w === "string" && cell.w.length > 0) {
    return cell.w;
  }
  const v = cell.v;
  if (v === null || v === undefined) {
    return "";
  }
  if (typeof v === "string") {
    return v;
  }
  if (typeof v === "number" || typeof v === "boolean") {
    return String(v);
  }
  if (v instanceof Date) {
    // Format ISO 8601 stable, lisible par les détecteurs.
    return v.toISOString();
  }
  // Type inconnu (ex. erreur Excel `#REF!`) — on stringifie.
  return String(v);
}

export const xlsxParser: FileParser = createXlsxParser("xlsx");
export const xlsParser: FileParser = createXlsxParser("xls");

/** Liste blanche des formats traités par cette famille de parseurs. */
export const XLSX_PARSER_FORMATS: ReadonlyArray<FileFormat> = ["xlsx", "xls"];

export const XLSX_PARSERS: ReadonlyArray<FileParser> = [xlsxParser, xlsParser];
