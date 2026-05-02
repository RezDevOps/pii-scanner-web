/**
 * Parseur CSV / TSV via PapaParse.
 *
 * Stratégie v0.2.0 : on charge l'intégralité du fichier en chaîne
 * (`input.text()`), puis PapaParse en mode synchrone non-streamé. Le
 * vrai streaming au sens « jamais plus d'une ligne en RAM » exigerait
 * d'exposer le `File` natif au parseur (FileReader interne PapaParse) ;
 * c'est un trade-off contre la portabilité de `ParserInput`. À
 * réévaluer en v0.3+ si profiling sur fichier > 100 Mo le justifie.
 *
 * Hypothèse forte : la première ligne est un en-tête. C'est le cas
 * dominant pour les exports comptables / RH / CRM des TPE/PME (cf.
 * cadrage § 4.2). Un mode `header: false` pourra être ajouté en
 * `v0.3` avec une option de configuration explicite.
 */
import Papa from "papaparse";

import type { FileFormat } from "../types.js";
import type { FileParser, ParserInput, TextChunk } from "./types.js";

interface CsvParserOptions {
  readonly format: Extract<FileFormat, "csv" | "tsv">;
  readonly delimiter: string;
}

function createCsvParser(opts: CsvParserOptions): FileParser {
  return {
    format: opts.format,
    async *parse(input: ParserInput): AsyncIterable<TextChunk> {
      const raw = await input.text();
      const result = Papa.parse<Record<string, string>>(raw, {
        delimiter: opts.delimiter,
        header: true,
        skipEmptyLines: "greedy",
      });
      const fatal = result.errors.find(
        (e) => e.type === "Quotes" || e.type === "Delimiter",
      );
      if (fatal) {
        const where =
          typeof fatal.row === "number" ? ` (ligne ${fatal.row + 2})` : "";
        throw new Error(
          `Erreur ${opts.format.toUpperCase()} dans « ${input.name} »${where} : ${fatal.message}`,
        );
      }
      const fields = result.meta.fields ?? [];
      const data = result.data;
      for (let r = 0; r < data.length; r++) {
        const row = data[r];
        if (!row) {
          continue;
        }
        // Décalage : ligne 1 = en-tête, première ligne de données = 2.
        const line = r + 2;
        for (const field of fields) {
          const value = row[field];
          if (typeof value === "string" && value.length > 0) {
            yield { text: value, line, path: field };
          }
        }
      }
    },
  };
}

export const csvParser: FileParser = createCsvParser({
  format: "csv",
  delimiter: ",",
});
export const tsvParser: FileParser = createCsvParser({
  format: "tsv",
  delimiter: "\t",
});

/** Liste blanche des formats traités par cette famille de parseurs. */
export const CSV_PARSER_FORMATS: ReadonlyArray<FileFormat> = ["csv", "tsv"];
