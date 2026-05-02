/**
 * Détecteur de SIRET (Système d'Identification du Répertoire des
 * Établissements).
 *
 * Format : 14 chiffres = SIREN (9) + NIC (5).
 *
 * Validation par défaut : algorithme de Luhn sur les 14 chiffres.
 *
 * **Exception La Poste documentée**. Le SIREN `356 000 000` (La Poste SA) est
 * historiquement exempt de la règle Luhn classique. Pour ses SIRET, l'INSEE
 * applique la règle alternative : la **somme des 14 chiffres** doit être
 * divisible par 5. C'est documenté noir sur blanc dans la notice INSEE
 * (« Règle de calcul de la clé du SIRET »). On l'implémente explicitement
 * pour ne pas générer de faux négatifs sur des fichiers comptables qui
 * référencent La Poste.
 *
 * Référence : INSEE — Méthodologie SIRENE,
 *   https://www.insee.fr/fr/information/2406147
 */

import type { Detector, Finding } from "../types.js";
import { isLuhnValid } from "../lib/luhn.js";

/**
 * Capture 14 chiffres, éventuellement séparés par des espaces tous les
 * 3 chiffres (forme imprimée `356 000 000 00048`).
 */
const SIRET_LOOSE_RE = /(?<!\d)(\d[\d ]{12,16}\d)(?!\d)/gu;

const LA_POSTE_SIREN = "356000000";

function normalize(raw: string): string {
  return raw.replace(/\s+/gu, "");
}

function digitSum(digits: string): number {
  let sum = 0;
  for (let i = 0; i < digits.length; i += 1) {
    sum += digits.charCodeAt(i) - 48;
  }
  return sum;
}

export const siretDetector: Detector = {
  id: "siret",
  label: "SIRET (établissement)",
  source: "INSEE — méthodologie SIRENE (Luhn + dérogation La Poste)",
  detect(text: string): readonly Finding[] {
    const out: Finding[] = [];
    SIRET_LOOSE_RE.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = SIRET_LOOSE_RE.exec(text)) !== null) {
      const value = match[0];
      const normalized = normalize(value);
      if (normalized.length !== 14) {
        continue;
      }
      const isLaPoste = normalized.startsWith(LA_POSTE_SIREN);
      const valid = isLaPoste
        ? digitSum(normalized) % 5 === 0
        : isLuhnValid(normalized);
      if (!valid) {
        continue;
      }
      out.push({
        detector: "siret",
        value,
        location: { start: match.index, end: match.index + value.length },
        confidence: "high",
        severity: "high",
        metadata: {
          siren: normalized.slice(0, 9),
          nic: normalized.slice(9, 14),
        },
      });
    }
    return out;
  },
};
