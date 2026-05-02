/**
 * Façade interne des parseurs : sélection du parseur correspondant au
 * `FileFormat` détecté. Chaque parseur reste exporté individuellement
 * pour les tests et les variantes (CLI, Tauri).
 */
import type { FileFormat } from "../types.js";

import { csvParser, tsvParser } from "./csv-parser.js";
import { docxParser } from "./docx-parser.js";
import { htmlParser } from "./html-parser.js";
import { jsonParser } from "./json-parser.js";
import { pdfParser } from "./pdf-parser.js";
import { mdParser, txtParser } from "./text-parser.js";
import type { FileParser } from "./types.js";
import { xlsParser, xlsxParser } from "./xlsx-parser.js";

export type { FileParser, ParserInput, TextChunk } from "./types.js";
export { csvParser, tsvParser, CSV_PARSER_FORMATS } from "./csv-parser.js";
export { docxParser, DOCX_PARSER_FORMATS } from "./docx-parser.js";
export { htmlParser, HTML_PARSER_FORMATS } from "./html-parser.js";
export { jsonParser } from "./json-parser.js";
export { pdfParser, PDF_PARSER_FORMATS } from "./pdf-parser.js";
export {
  mdParser,
  txtParser,
  TEXT_PARSERS,
  TEXT_PARSER_FORMATS,
} from "./text-parser.js";
export {
  xlsParser,
  xlsxParser,
  XLSX_PARSERS,
  XLSX_PARSER_FORMATS,
} from "./xlsx-parser.js";

/**
 * Index format → parseur. Tous les `FileFormat` exposés par l'engine
 * y figurent depuis `v0.2.1` (parseurs binaires activés).
 */
const PARSER_BY_FORMAT: Readonly<Record<FileFormat, FileParser>> = {
  csv: csvParser,
  tsv: tsvParser,
  txt: txtParser,
  md: mdParser,
  json: jsonParser,
  xlsx: xlsxParser,
  xls: xlsParser,
  pdf: pdfParser,
  docx: docxParser,
  html: htmlParser,
};

/**
 * Retourne le parseur dédié à un format actif, ou `undefined` si le
 * format n'a pas (encore) de parseur. La façade traduit ce `undefined`
 * en `parser-error` pour préserver la cohérence des codes d'erreur
 * exposés à l'UI.
 */
export function getParserForFormat(format: FileFormat): FileParser | undefined {
  return PARSER_BY_FORMAT[format];
}
