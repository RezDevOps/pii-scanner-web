/**
 * Détecteur de NIR (numéro de Sécurité sociale français).
 *
 * Stratégie :
 *  1. Repérer toute séquence de 15 caractères correspondant à la grammaire
 *     NIR (sexe + 4 chiffres date + département + 6 chiffres + 2 chiffres clé).
 *  2. Valider la clé via la formule officielle 97 − N mod 97 (avec gestion
 *     Corse 2A/2B).
 *  3. **N'émettre un finding que si la clé est valide.** Un format qui
 *     ressemble mais dont la clé ne tombe pas juste est rejeté — c'est le
 *     contrat affiché dans `docs/detecteurs.md` (politique « validation par
 *     clé pour identifiants normés »).
 *
 * Références :
 *  - Code de la Sécurité sociale, art. R115-1 et s.
 *  - INSEE — Codification du NIR (notes méthodologiques).
 */

import type { Detector, Finding } from "../types.js";
import { validateNir } from "../lib/nir-key.js";

/**
 * Forme acceptée. On tolère les espaces internes (forme imprimée
 * `1 99 03 19 234 567 89`) en les normalisant pour la validation.
 *
 * On utilise lookbehind / lookahead `(?<![A-Za-z0-9])` / `(?![A-Za-z0-9])`
 * pour s'assurer que le NIR n'est pas collé à un identifiant plus large.
 */
const NIR_LOOSE_RE =
  /(?<![A-Za-z0-9])([123478][ ]?\d{2}[ ]?\d{2}[ ]?(?:\d{2}|2A|2B)[ ]?\d{3}[ ]?\d{3}[ ]?\d{2})(?![A-Za-z0-9])/gu;

function normalize(raw: string): string {
  return raw.replace(/\s+/gu, "").toUpperCase();
}

export const nirDetector: Detector = {
  id: "nir",
  label: "NIR (numéro de Sécurité sociale)",
  source:
    "Code de la Sécurité sociale art. R115-1 — formule officielle 97 − N mod 97",
  detect(text: string): readonly Finding[] {
    const out: Finding[] = [];
    NIR_LOOSE_RE.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = NIR_LOOSE_RE.exec(text)) !== null) {
      const value = match[0];
      const normalized = normalize(value);
      const result = validateNir(normalized);
      if (!result.keyValid) {
        continue;
      }
      out.push({
        detector: "nir",
        value,
        location: { start: match.index, end: match.index + value.length },
        confidence: "high",
        severity: "critical",
        metadata: { normalized },
      });
    }
    return out;
  },
};
