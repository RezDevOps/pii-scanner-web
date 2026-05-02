/**
 * Façade interne des parseurs : sélection du parseur correspondant au
 * `FileFormat` détecté. Chaque parseur reste exporté individuellement
 * pour les tests et les variantes (CLI, Tauri).
 */
import type { FileFormat } from "../types.js";

import { csvParser, tsvParser } from "./csv-parser.js";
import { jsonParser } from "./json-parser.js";
import { mdParser, txtParser } from "./text-parser.js";
import type { FileParser } from "./types.js";

export type { FileParser, ParserInput, TextChunk } from "./types.js";
export { csvParser, tsvParser, CSV_PARSER_FORMATS } from "./csv-parser.js";
export { jsonParser } from "./json-parser.js";
export {
  mdParser,
  txtParser,
  TEXT_PARSERS,
  TEXT_PARSER_FORMATS,
} from "./text-parser.js";

/**
 * Index format → parseur. Les formats reportés en `v0.2.1` ne figurent
 * volontairement pas ici : la couche supérieure (`runScan`) gère la
 * `DeferredFormatError` en amont.
 */
const PARSER_BY_FORMAT: Readonly<Partial<Record<FileFormat, FileParser>>> = {
  csv: csvParser,
  tsv: tsvParser,
  txt: txtParser,
  md: mdParser,
  json: jsonParser,
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
