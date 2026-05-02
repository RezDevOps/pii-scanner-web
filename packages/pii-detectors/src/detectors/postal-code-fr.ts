/**
 * Détecteur de code postal français (5 chiffres).
 *
 * Stratégie : capture toute séquence de **exactement 5 chiffres**, isolée
 * dans le texte par des frontières non-numériques (lookaround). Vérifie que
 * le code postal tombe dans une plage administrative valide :
 *  - **Métropole** : `01000`-`95999` (les départements 20 → Corse 2A/2B
 *    portent le code numérique `20xxx`).
 *  - **DOM-TOM et collectivités** : `97000`-`98999`.
 *  - **Monaco** : `98000` (couvert par la plage ci-dessus).
 *  - Plages explicitement **invalides** : `00xxx` (jamais attribué), `96xxx`
 *    (réservé non utilisé).
 *
 * **Confiance `low`** assumée : un code postal nu est très peu spécifique,
 * et les faux positifs (codes article, identifiants à 5 chiffres) sont
 * fréquents. La couche supérieure (`postal-address-fr`) consolide la
 * détection en exigeant un code postal accolé à une voie et à une ville.
 *
 * **Sévérité `low`** : un code postal seul n'identifie pas une personne. Sa
 * valeur principale est de servir de signal d'amorce pour des détections
 * composites (adresse complète).
 *
 * Référence :
 *  - La Poste — Référentiel des codes postaux (RIDC, mis à jour mensuellement).
 *  - INSEE — Code officiel géographique (COG).
 */

import type { Detector, Finding } from "../types.js";

/**
 * 5 chiffres consécutifs, encadrés par des bornes non-numériques.
 */
const POSTAL_CODE_RE = /(?<![\d])(\d{5})(?![\d])/gu;

/**
 * Vérifie qu'une chaîne de 5 chiffres représente un code postal français
 * valide d'après les plages La Poste / INSEE.
 *
 * @param code chaîne ASCII de 5 chiffres.
 */
export function isFrenchPostalCode(code: string): boolean {
  if (!/^\d{5}$/u.test(code)) {
    return false;
  }
  const value = Number(code);
  // 00xxx jamais attribué.
  if (value < 1000) {
    return false;
  }
  // Métropole : 01000 - 95999.
  if (value <= 95999) {
    return true;
  }
  // 96xxx réservé non attribué.
  if (value < 97000) {
    return false;
  }
  // DOM-TOM + Monaco : 97000 - 98999.
  if (value <= 98999) {
    return true;
  }
  // 99xxx hors plage.
  return false;
}

export const postalCodeFrDetector: Detector = {
  id: "postal-code-fr",
  label: "Code postal (France)",
  source: "La Poste / INSEE — plages 01000-95999 ∪ 97000-98999",
  detect(text: string): readonly Finding[] {
    const out: Finding[] = [];
    POSTAL_CODE_RE.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = POSTAL_CODE_RE.exec(text)) !== null) {
      const value = match[0];
      if (!isFrenchPostalCode(value)) {
        continue;
      }
      out.push({
        detector: "postal-code-fr",
        value,
        location: { start: match.index, end: match.index + value.length },
        confidence: "low",
        severity: "low",
        metadata: {
          // Les 2 premiers chiffres servent de signal département (avec la
          // limite 2A/2B de la Corse non distinguable en numérique pur).
          department: value.slice(0, 2),
        },
      });
    }
    return out;
  },
};
