/**
 * Détection du format d'un fichier d'après son nom (extension) avec
 * fallback sur le `type` MIME quand l'extension est ambiguë.
 *
 * Aucune lecture du contenu : la détection est syntaxique, rapide, et
 * suffit pour les formats supportés en `v0.2.0` (CSV/TSV/TXT/MD/JSON).
 * Une vérification de signature de fichier (magic bytes) sera ajoutée
 * en `v0.2.1` quand les formats binaires (XLSX, PDF, DOCX) entreront
 * en jeu, où l'extension seule ne suffit plus.
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
  // Formats déclarés mais reportés en v0.2.1 (cf. cadrage § 4.2 +
  // CHANGELOG [0.2.0]) — détectés ici pour produire un message d'erreur
  // explicite, plutôt que de les traiter comme inconnus.
  xlsx: "xlsx",
  xls: "xls",
  pdf: "pdf",
  docx: "docx",
  html: "html",
  htm: "html",
};

/**
 * Formats actifs en `v0.2.0`. L'ordre est documentaire (CSV en tête =
 * cas d'usage le plus fréquent en mission RGPD TPE/PME).
 */
export const ACTIVE_FORMATS_V0_2_0: ReadonlyArray<FileFormat> = [
  "csv",
  "tsv",
  "txt",
  "md",
  "json",
];

/**
 * Formats déclarés mais reportés en `v0.2.1`. Présents dans `FileFormat`
 * pour stabiliser le type public dès `v0.2.0`, mais bloqués à la
 * détection avec une erreur dédiée pour ne pas crasher silencieusement.
 */
export const DEFERRED_FORMATS_V0_2_1: ReadonlyArray<FileFormat> = [
  "xlsx",
  "xls",
  "pdf",
  "docx",
  "html",
];

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
 * @throws `DeferredFormatError` si l'extension correspond à un format
 *   reporté à `v0.2.1`.
 */
export function detectFormat(file: FileDescriptor): FileFormat {
  const dotIndex = file.name.lastIndexOf(".");
  const ext = dotIndex >= 0 ? file.name.slice(dotIndex + 1).toLowerCase() : "";
  const fmt = EXTENSION_MAP[ext];
  if (!fmt) {
    throw new UnsupportedFormatError(file.name);
  }
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
