/**
 * Détecteur de numéro de TVA intracommunautaire — pays France.
 *
 * Format DGFiP :
 *   `FR` + clé (2 chiffres) + SIREN (9 chiffres) = 13 caractères.
 *
 * Validation par clé numérique :
 *   `clé = (12 + 3 × (SIREN mod 97)) mod 97`
 *
 * **Limites assumées** :
 *  - On ne couvre que le format **clé numérique** (2 chiffres). Le format
 *    DGFiP autorise depuis les années 2000 des clés alphanumériques (lettres
 *    en première et/ou seconde position) suivant une grille distincte. Cette
 *    variante est marginale (< 1 % des TVA FR émis) et non implémentée en
 *    v0.4.0 — un faux négatif sur ces numéros est documenté ici. Couverture
 *    en backlog v1.x si demande terrain.
 *  - On ne valide pas le SIREN par Luhn en plus de la clé MOD 97. La clé
 *    MOD 97 assure la cohérence intrinsèque du numéro de TVA ; ajouter Luhn
 *    rejetterait des cas légitimes attribués par la DGFiP sans gain de
 *    précision (cf. note INSEE sur SIREN exceptionnels).
 *
 * Référence :
 *  - DGFiP — « Le numéro de TVA intracommunautaire »,
 *    https://www.impots.gouv.fr/professionnel/tva-intracommunautaire
 *  - Commission européenne — VIES (Validation of VAT numbers in EU).
 */

import type { Detector, Finding } from "../types.js";

/**
 * Capture `FR` (insensible à la casse), espace optionnel, 2 chiffres,
 * espace optionnel, 9 chiffres (eux-mêmes éventuellement séparés par des
 * espaces tous les 3 chiffres comme `FR 32 123 456 782`).
 */
const TVA_FR_LOOSE_RE =
  /(?<![A-Z0-9])(FR\s?\d{2}\s?\d[\d\s]{7,11}\d)(?![\d])/giu;

function normalize(raw: string): string {
  return raw.replace(/\s+/gu, "").toUpperCase();
}

/**
 * Calcule la clé MOD 97 attendue pour un SIREN donné.
 *
 * @param siren9 chaîne de 9 chiffres ASCII.
 */
function expectedTvaKey(siren9: string): number {
  // SIREN ≤ 9 chiffres → tient dans Number.MAX_SAFE_INTEGER (2^53 ≈ 9 × 10^15).
  const sirenN = Number(siren9);
  return (12 + 3 * (sirenN % 97)) % 97;
}

export const tvaIntracomFrDetector: Detector = {
  id: "tva-intracom-fr",
  label: "TVA intracommunautaire (France)",
  source: "DGFiP — clé MOD 97 sur SIREN",
  detect(text: string): readonly Finding[] {
    const out: Finding[] = [];
    TVA_FR_LOOSE_RE.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = TVA_FR_LOOSE_RE.exec(text)) !== null) {
      const value = match[0];
      const normalized = normalize(value);
      // FR + 2 chiffres clé + 9 chiffres SIREN = 13 caractères.
      if (normalized.length !== 13) {
        continue;
      }
      if (!normalized.startsWith("FR")) {
        continue;
      }
      const keyStr = normalized.slice(2, 4);
      const sirenStr = normalized.slice(4, 13);
      // Format clé numérique uniquement (cf. limites assumées dans l'en-tête).
      if (!/^\d{2}$/u.test(keyStr) || !/^\d{9}$/u.test(sirenStr)) {
        continue;
      }
      const expected = expectedTvaKey(sirenStr);
      if (expected !== Number(keyStr)) {
        continue;
      }
      out.push({
        detector: "tva-intracom-fr",
        value,
        location: { start: match.index, end: match.index + value.length },
        confidence: "high",
        severity: "medium",
        metadata: {
          country: "FR",
          key: keyStr,
          siren: sirenStr,
          normalized,
        },
      });
    }
    return out;
  },
};

/**
 * Calcule la clé TVA intracom FR pour un SIREN donné. Exposée pour les
 * fixtures de test et les éventuels consommateurs avancés.
 *
 * @param siren9 SIREN sous forme de 9 chiffres ASCII (sans espaces).
 * @returns Clé sur 2 chiffres (zéro-paddée).
 */
export function computeTvaIntracomFrKey(siren9: string): string {
  if (!/^\d{9}$/u.test(siren9)) {
    throw new Error(
      `SIREN attendu : 9 chiffres ASCII. Reçu : ${JSON.stringify(siren9)}.`,
    );
  }
  return expectedTvaKey(siren9).toString().padStart(2, "0");
}
