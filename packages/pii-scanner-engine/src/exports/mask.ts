/**
 * Helpers de masquage pour les exports.
 *
 * Le masquage est appliqué *à l'export*, pas dans le `ScanReport` lui-même
 * (l'engine garde la valeur brute pour permettre une UI qui révèle au
 * survol). Cela isole la décision « afficher en clair / masquer » à la
 * frontière de sortie du système.
 */

import type { MaskLevel } from "./types.js";

const FULL_MASK = "***";

/**
 * Masque une valeur selon le niveau choisi.
 *
 * @param value chaîne brute (`Finding.value`).
 * @param level niveau de masquage souhaité.
 * @returns chaîne prête à être insérée dans l'export.
 */
export function maskValue(value: string, level: MaskLevel): string {
  if (level === "none") {
    return value;
  }
  if (level === "partial") {
    if (value.length <= 4) {
      return FULL_MASK;
    }
    const lastFour = value.slice(-4);
    return `${"*".repeat(Math.max(3, value.length - 4))}${lastFour}`;
  }
  return FULL_MASK;
}
