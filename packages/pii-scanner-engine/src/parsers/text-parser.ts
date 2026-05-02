/**
 * Parseur passthrough pour TXT et MD : restitue le contenu brut, ligne
 * par ligne. Permet à `scanText` de localiser les findings à la ligne
 * près sans réécrire les coordonnées.
 *
 * Pas de découpage Markdown intelligent (titres, code blocks…). Le texte
 * est traité comme du plein texte ; les détecteurs n'ont pas besoin de
 * connaître la structure éditoriale.
 */
import type { FileFormat } from "../types.js";
import type { FileParser, ParserInput, TextChunk } from "./types.js";

/**
 * Crée un parseur passthrough pour le format demandé (`txt` ou `md`).
 * Une instance dédiée par format évite de confondre les rapports.
 */
export function createTextParser(format: "txt" | "md"): FileParser {
  return {
    format,
    async *parse(input: ParserInput): AsyncIterable<TextChunk> {
      const content = await input.text();
      // `split` sur `\n` puis trim de `\r` final : conserve les
      // numéros de ligne 1-based et tolère les fichiers CRLF (Windows)
      // sans dupliquer les lignes vides.
      const lines = content.split("\n");
      for (let i = 0; i < lines.length; i++) {
        // Casts safe : i < lines.length garantit un index valide,
        // et noUncheckedIndexedAccess force la garde explicite.
        const raw = lines[i];
        if (raw === undefined) {
          continue;
        }
        const trimmed = raw.endsWith("\r") ? raw.slice(0, -1) : raw;
        // On émet aussi les lignes vides : un détecteur qui matche
        // sur plusieurs lignes en aurait besoin (pas notre cas en
        // v0.2.0, mais le contrat reste honnête).
        yield {
          text: trimmed,
          line: i + 1,
        };
      }
    },
  };
}

export const txtParser: FileParser = createTextParser("txt");
export const mdParser: FileParser = createTextParser("md");

/** Re-export pratique pour itérer sur tous les parseurs texte. */
export const TEXT_PARSERS: ReadonlyArray<FileParser> = [txtParser, mdParser];

/** Liste blanche des formats traités par cette famille de parseurs. */
export const TEXT_PARSER_FORMATS: ReadonlyArray<FileFormat> = ["txt", "md"];
