/**
 * Parseur Excel — couvre `.xlsx` (Office Open XML) et `.xls` (Excel 97-2003
 * binaire) via le fork patché de SheetJS Community Edition
 * (`@e965/xlsx` sur npm).
 *
 * **Migration v1.0.0 (S5)** : `xlsx@^0.18.5` → `@e965/xlsx@^0.20.x`. Le
 * package officiel `xlsx` sur npm n'est plus patché contre les CVE
 * connues (Prototype Pollution `CVE-2023-30533` + ReDoS). `@e965/xlsx`
 * est un fork drop-in (même API, mêmes types) maintenu et patché. Cf.
 * `docs/adr/0005-sheetjs-pour-xlsx.md` mis à jour pour acter la
 * migration.
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
 *
 * **Lazy-loading (v0.4.1)** : `@e965/xlsx` (~250 ko bundle) est chargé
 * via `import()` dynamique au premier appel à `parse()`. Tant qu'on ne
 * scanne pas un .xlsx/.xls, le module SheetJS ne pèse pas dans le
 * bundle initial de l'app. Cf. `docs/adr/0007-lazy-loading-parseurs-binaires.md`.
 */
import type { CellObject, WorkSheet } from "@e965/xlsx";

import type { FileFormat } from "../types.js";
import type { FileParser, ParserInput, TextChunk } from "./types.js";

/**
 * Module SheetJS chargé paresseusement. La promesse est mise en cache
 * pour qu'un second `parse()` réutilise la même instance — un seul
 * `import()` par durée de vie du module.
 */
let xlsxModulePromise: Promise<typeof import("@e965/xlsx")> | null = null;
function loadXlsxModule(): Promise<typeof import("@e965/xlsx")> {
  if (!xlsxModulePromise) {
    xlsxModulePromise = import("@e965/xlsx");
  }
  return xlsxModulePromise;
}

/**
 * Crée un parseur SheetJS pour `.xlsx` ou `.xls`. Le format de sortie
 * est le même — SheetJS abstrait la différence à la lecture.
 */
function createXlsxParser(format: "xlsx" | "xls"): FileParser {
  return {
    format,
    async *parse(input: ParserInput): AsyncIterable<TextChunk> {
      const { read, utils } = await loadXlsxModule();
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
        yield* parseSheet(sheetName, ws, utils);
      }
    },
  };
}

async function* parseSheet(
  sheetName: string,
  ws: WorkSheet,
  utils: typeof import("@e965/xlsx").utils,
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

/**
 * Pré-chauffe le module SheetJS sans déclencher de scan. Utile si
 * l'UI veut charger le bundle en arrière-plan (ex. au survol d'un
 * bouton) plutôt que d'attendre la première dropzone .xlsx.
 *
 * @returns Une promesse résolue quand le module est en cache.
 */
export function preloadXlsxParser(): Promise<void> {
  return loadXlsxModule().then(() => undefined);
}
