/**
 * Parseur DOCX — extraction texte uniquement via **mammoth**.
 *
 * `mammoth.extractRawText({ arrayBuffer })` retourne le texte brut du
 * document : un `\n\n` (ou `\n`) entre paragraphes et entre cellules de
 * tableau. On split sur `\n` et on émet un `TextChunk` par ligne non
 * vide, en numérotant les paragraphes 1-based dans `path`.
 *
 * Limitations volontaires :
 * - Pas de styles / titres : on ne distingue pas un H1 d'un paragraphe.
 *   Les détecteurs n'en ont pas besoin et ça simplifie.
 * - Pas d'images : `mammoth.extractRawText` les ignore par construction.
 * - Pas d'en-têtes/pieds de page : `mammoth` ne les expose pas en mode
 *   raw text (à confirmer si retours utilisateur le demandent).
 *
 * Choix de dépendance : voir `docs/adr/0004-mammoth-pour-docx.md`.
 */
import { extractRawText } from "mammoth";

import type { FileFormat } from "../types.js";
import type { FileParser, ParserInput, TextChunk } from "./types.js";

export const docxParser: FileParser = {
  format: "docx",
  async *parse(input: ParserInput): AsyncIterable<TextChunk> {
    const buf = await input.arrayBuffer();
    // **Bridge Node ↔ navigateur** : mammoth accepte `{ arrayBuffer }`
    // côté navigateur et `{ buffer }` côté Node, mais pas l'inverse —
    // un `ArrayBuffer` passé en Node lève `Could not find file in options`.
    // Détection au runtime via `globalThis.Buffer` (sans import statique
    // `node:buffer` pour ne pas casser le bundling navigateur).
    const NodeBuffer = (globalThis as { Buffer?: typeof Buffer }).Buffer;
    const result = await extractRawText(
      NodeBuffer ? { buffer: NodeBuffer.from(buf) } : { arrayBuffer: buf },
    );
    const text = result.value ?? "";
    if (text.length === 0) {
      return;
    }
    const lines = text.split("\n");
    let paragraphIndex = 0;
    for (const raw of lines) {
      const trimmed = raw.endsWith("\r") ? raw.slice(0, -1) : raw;
      // Paragraphes vides (séparateurs `\n\n`) : on les saute pour
      // éviter de polluer le rapport, mais on n'incrémente pas non plus
      // l'index — le compteur reflète les paragraphes *réels*.
      if (trimmed.length === 0) {
        continue;
      }
      paragraphIndex++;
      yield {
        text: trimmed,
        path: `paragraph[${paragraphIndex}]`,
        line: paragraphIndex,
      };
    }
  },
};

/** Liste blanche des formats traités par ce parseur. */
export const DOCX_PARSER_FORMATS: ReadonlyArray<FileFormat> = ["docx"];
