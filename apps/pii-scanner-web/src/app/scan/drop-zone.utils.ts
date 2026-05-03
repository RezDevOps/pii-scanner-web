/**
 * Logique pure de validation des fichiers déposés.
 *
 * Ce module est extrait du composant `DropZoneComponent` pour deux
 * raisons :
 *
 * 1. **Testabilité** — les tests Vitest n'ont pas besoin d'instancier
 *    Angular Material (qui charge `@angular/common`, `@angular/cdk`,
 *    etc., et nécessite le compilateur JIT pour les classes
 *    partiellement compilées). En séparant la logique pure du composant
 *    Material, on peut tester `validateFiles` en happy-dom sans le
 *    moindre setup Angular.
 * 2. **Réutilisabilité** — un futur CLI ou Tauri Variant pourra réutiliser
 *    ces validations sans tirer Angular.
 */

/**
 * Extensions acceptées par défaut. Aligné sur les `FileFormat`
 * activement supportés en v0.2.1+.
 */
export const ACCEPTED_EXTENSIONS = Object.freeze([
  ".csv",
  ".tsv",
  ".txt",
  ".md",
  ".json",
  ".xlsx",
  ".xls",
  ".pdf",
  ".docx",
  ".html",
  ".htm",
] as const);

/**
 * Plafond global par défaut sur la somme des tailles de fichier. 100 Mo
 * cumulés correspond à la cible perf cadrage § 6.3.
 */
export const DEFAULT_MAX_TOTAL_BYTES = 100 * 1024 * 1024;

export type RejectionReason =
  | "extension"
  | "size-exceeded"
  | "empty"
  | "duplicate";

export interface RejectedFile {
  readonly name: string;
  readonly size: number;
  readonly reason: RejectionReason;
}

export interface ValidationResult {
  readonly accepted: readonly File[];
  readonly rejected: readonly RejectedFile[];
}

/**
 * Identité minimale d'un fichier déjà présent dans la file. On compare
 * sur `name` + `size` car v1.1 conserve la sémantique « déposer le même
 * fichier deux fois = doublon » (le drag&drop incrémental cumule la
 * file ; sans dédup on ré-injecterait le fichier en doublon dans le
 * rapport). On n'utilise pas `lastModified` parce que le `File` issu
 * d'un drop ne le porte pas toujours de manière fiable.
 */
export interface ExistingFileRef {
  readonly name: string;
  readonly size: number;
}

/**
 * Filtre la liste de fichiers : extensions reconnues, taille non nulle,
 * cumul ≤ `maxTotalBytes`, pas déjà présent dans `existingFiles`.
 * Retourne les listes acceptés/rejetés en deux temps pour permettre à
 * l'UI de surfacer les rejets (toast).
 *
 * Le plafond cumulé inclut la taille des fichiers déjà en file : un 2e
 * dépôt ne pourra pas faire dépasser la limite globale. Sans cela, on
 * pourrait contourner la limite par dépôts successifs.
 */
export function validateFiles(
  files: readonly File[],
  maxTotalBytes: number,
  existingFiles: readonly ExistingFileRef[] = [],
): ValidationResult {
  const accepted: File[] = [];
  const rejected: RejectedFile[] = [];

  // Set des doublons : clé `name|size` (ASCII safe, pas de collision
  // probable sur des noms réels).
  const existingKeys = new Set<string>(
    existingFiles.map((e) => `${e.name}|${e.size}`),
  );

  // Cumul initialisé sur la taille des fichiers déjà acceptés en file —
  // garantit que le plafond global tient sur l'ensemble cumulatif.
  let cumulative = existingFiles.reduce((acc, e) => acc + e.size, 0);

  for (const file of files) {
    if (file.size === 0) {
      rejected.push({ name: file.name, size: 0, reason: "empty" });
      continue;
    }
    const ext = extractExtension(file.name);
    if (
      !ACCEPTED_EXTENSIONS.includes(ext as (typeof ACCEPTED_EXTENSIONS)[number])
    ) {
      rejected.push({ name: file.name, size: file.size, reason: "extension" });
      continue;
    }
    const key = `${file.name}|${file.size}`;
    if (existingKeys.has(key)) {
      rejected.push({
        name: file.name,
        size: file.size,
        reason: "duplicate",
      });
      continue;
    }
    if (cumulative + file.size > maxTotalBytes) {
      rejected.push({
        name: file.name,
        size: file.size,
        reason: "size-exceeded",
      });
      continue;
    }
    cumulative += file.size;
    existingKeys.add(key); // évite qu'un même drop contienne deux fois le même fichier
    accepted.push(file);
  }
  return { accepted, rejected };
}

function extractExtension(name: string): string {
  const i = name.lastIndexOf(".");
  if (i < 0) return "";
  return name.slice(i).toLowerCase();
}
