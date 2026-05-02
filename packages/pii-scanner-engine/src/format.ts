/**
 * Détection du format d'un fichier d'après son nom (extension) avec
 * fallback sur le `type` MIME quand l'extension est ambiguë.
 *
 * Aucune lecture du contenu : la détection est syntaxique, rapide, et
 * suffit pour tous les formats supportés depuis `v0.2.1` (CSV/TSV/TXT/
 * MD/JSON + XLSX/XLS/PDF/DOCX/HTML). Une vérification de signature de
 * fichier (magic bytes) pourra être ajoutée plus tard si on voit des
 * cas d'extension trompeuse en pratique — en `v0.2.1` on fait
 * confiance à l'extension : c'est cohérent avec le contexte (un DPO
 * sait quel fichier il traite).
 */
import type { FileFormat } from "./types.js";

/**
 * Liste blanche : extension (sans le point, en minuscules) → format canonique.
 * Toute extension hors de cette table déclenche `UnsupportedFormatError`.
 */
const EXTENSION_MAP: Readonly<Record<string, FileFormat>> = {
  csv: "csv",
  tsv: "tsv",
  txt: "txt",
  md: "md",
  markdown: "md",
  json: "json",
  ndjson: "json",
  // Formats activés en v0.2.1 (cf. CHANGELOG [0.2.1]).
  xlsx: "xlsx",
  xls: "xls",
  pdf: "pdf",
  docx: "docx",
  html: "html",
  htm: "html",
};

/**
 * Formats actifs depuis `v0.2.1`. L'ordre est documentaire (CSV en
 * tête = cas d'usage le plus fréquent en mission RGPD TPE/PME ;
 * binaires en queue).
 *
 * @deprecated `ACTIVE_FORMATS_V0_2_0` est conservé pour rétrocompat ;
 *             utiliser `ACTIVE_FORMATS` pour la liste à jour.
 */
export const ACTIVE_FORMATS_V0_2_0: ReadonlyArray<FileFormat> = [
  "csv",
  "tsv",
  "txt",
  "md",
  "json",
];

/** Liste à jour des formats activement supportés par l'engine. */
export const ACTIVE_FORMATS: ReadonlyArray<FileFormat> = [
  "csv",
  "tsv",
  "txt",
  "md",
  "json",
  "xlsx",
  "xls",
  "pdf",
  "docx",
  "html",
];

/**
 * Formats déclarés mais reportés. **Vide depuis `v0.2.1`** : tous les
 * `FileFormat` sont activement parsés. La constante reste exportée pour
 * rétrocompatibilité — sera retirée en `v1.0`.
 *
 * @deprecated Aucun format n'est différé depuis v0.2.1. Cette liste
 *             reste exportée pour ne pas casser les consommateurs qui
 *             la lisaient. Sera retirée en v1.0.
 */
export const DEFERRED_FORMATS_V0_2_1: ReadonlyArray<FileFormat> = [];

/**
 * Erreur levée quand l'extension n'appartient à aucun format connu.
 *
 * Exemple : `archive.zip`, `photo.jpg`. La couche supérieure (façade
 * `runScan`) la traduit en évènement `file-failed` avec le code
 * `unsupported-format`.
 */
export class UnsupportedFormatError extends Error {
  override readonly name = "UnsupportedFormatError";
  constructor(public readonly fileName: string) {
    super(
      `Format non supporté pour « ${fileName} ». Les extensions reconnues sont : ${Array.from(
        new Set(Object.keys(EXTENSION_MAP)),
      )
        .sort()
        .join(", ")}.`,
    );
  }
}

/**
 * Erreur levée quand l'extension est connue mais que le parseur
 * correspondant arrivera en `v0.2.1` (XLSX, PDF, DOCX, HTML).
 *
 * Volontairement séparée de `UnsupportedFormatError` pour permettre à
 * l'UI d'afficher un message « bientôt disponible » distinct du « format
 * inconnu ».
 */
export class DeferredFormatError extends Error {
  override readonly name = "DeferredFormatError";
  constructor(
    public readonly fileName: string,
    public readonly format: FileFormat,
  ) {
    super(
      `Le format « ${format} » de « ${fileName} » est déclaré mais son parseur arrive en v0.2.1 (cf. CHANGELOG).`,
    );
  }
}

/**
 * Sous-ensemble du contrat `File` du DOM utilisé par la détection.
 * Permet de tester sans créer de vrais `File` (et de réutiliser depuis
 * un futur CLI Node qui synthétisera un objet équivalent).
 */
export interface FileDescriptor {
  readonly name: string;
  readonly type?: string;
}

/**
 * Détecte le format d'un fichier à partir de son nom (extension).
 *
 * @throws `UnsupportedFormatError` si l'extension est inconnue.
 * @throws `DeferredFormatError` réservé pour réintroduction future si un
 *   format devait être réactivé puis désactivé. Inerte depuis `v0.2.1`
 *   (liste différée vide).
 */
export function detectFormat(file: FileDescriptor): FileFormat {
  const dotIndex = file.name.lastIndexOf(".");
  const ext = dotIndex >= 0 ? file.name.slice(dotIndex + 1).toLowerCase() : "";
  const fmt = EXTENSION_MAP[ext];
  if (!fmt) {
    throw new UnsupportedFormatError(file.name);
  }
  // Le check est conservé pour pouvoir « différer » un format à
  // nouveau si une dépendance était retirée en urgence — actuellement
  // la liste est vide, donc inerte.
  if (DEFERRED_FORMATS_V0_2_1.includes(fmt)) {
    throw new DeferredFormatError(file.name, fmt);
  }
  return fmt;
}

/**
 * Variante non-throw : retourne `null` si le format n'est pas exploitable
 * en `v0.2.0`, plutôt que de lever. Pratique pour la couche UI quand on
 * veut classer une liste de fichiers en « scannables » / « pas encore » /
 * « inconnus » sans gérer trois `try/catch`.
 */
export function tryDetectFormat(
  file: FileDescriptor,
):
  | { readonly format: FileFormat }
  | { readonly error: "unsupported" | "deferred" } {
  try {
    return { format: detectFormat(file) };
  } catch (err) {
    if (err instanceof DeferredFormatError) {
      return { error: "deferred" };
    }
    if (err instanceof UnsupportedFormatError) {
      return { error: "unsupported" };
    }
    throw err;
  }
}
