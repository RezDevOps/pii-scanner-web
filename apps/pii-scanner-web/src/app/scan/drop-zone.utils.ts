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

export type RejectionReason = "extension" | "size-exceeded" | "empty";

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
 * Filtre la liste de fichiers : extensions reconnues, taille non nulle,
 * cumul ≤ `maxTotalBytes`. Retourne les listes acceptés/rejetés en
 * deux temps pour permettre à l'UI de surfaces les rejets (toast).
 */
export function validateFiles(
  files: readonly File[],
  maxTotalBytes: number,
): ValidationResult {
  const accepted: File[] = [];
  const rejected: RejectedFile[] = [];
  let cumulative = 0;

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
    if (cumulative + file.size > maxTotalBytes) {
      rejected.push({
        name: file.name,
        size: file.size,
        reason: "size-exceeded",
      });
      continue;
    }
    cumulative += file.size;
    accepted.push(file);
  }
  return { accepted, rejected };
}

function extractExtension(name: string): string {
  const i = name.lastIndexOf(".");
  if (i < 0) return "";
  return name.slice(i).toLowerCase();
}
