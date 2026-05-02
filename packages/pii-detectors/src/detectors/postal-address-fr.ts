/**
 * Détecteur d'adresse postale française.
 *
 * Stratégie : reconnaître la **tête + queue** d'une adresse complète :
 *  - **Tête** : un numéro de voie (1 à 4 chiffres, suffixe `bis`/`ter`/
 *    `quater` toléré), suivi du **type de voie** (rue, avenue, boulevard,
 *    place, etc.) puis du nom de voie en texte libre.
 *  - **Queue** : un **code postal français** valide (5 chiffres dans une
 *    plage La Poste/INSEE) suivi d'un nom de ville en majuscules ou en
 *    casse de titre.
 *
 * Tout ce qui ne contient pas à la fois une tête (avec type de voie reconnu)
 * et une queue (CP valide + ville) est ignoré.
 *
 * **Confiance `low`** assumée : les faux positifs sont nombreux (extraits
 * de catalogues, listings d'événements, descriptions narratives qui
 * comportent fortuitement « 12 rue Machin »). Le cadrage § 10 documente
 * explicitement que les faux positifs sur cette catégorie sont acceptables.
 *
 * **Sévérité `high`** : une adresse postale complète est l'un des
 * identifiants directs les plus discriminants (RGPD art. 4.1) — niveau
 * équivalent à un nom + prénom.
 *
 * Référence :
 *  - AFNOR NF Z10-011 (norme adresse postale française).
 *  - Référentiel BAN (Base Adresse Nationale, https://adresse.data.gouv.fr/).
 */

import type { Detector, Finding } from "../types.js";
import { isFrenchPostalCode } from "./postal-code-fr.js";

/**
 * Types de voie reconnus, en français. Liste non exhaustive mais couvre la
 * grande majorité des cas (BAN, La Poste). Les abréviations courantes
 * (`av.`, `bd.`, `rte`) sont incluses.
 */
const STREET_TYPES = [
  "rue",
  "avenue",
  "av\\.?",
  "boulevard",
  "bd\\.?",
  "allée",
  "allee",
  "chemin",
  "impasse",
  "place",
  "cours",
  "quai",
  "route",
  "rte\\.?",
  "villa",
  "cité",
  "cite",
  "sentier",
  "passage",
  "square",
  "esplanade",
  "promenade",
  "voie",
  "rond-point",
  "rond point",
  "faubourg",
  "fbg\\.?",
  "hameau",
  "lieu-dit",
];

const ADDRESS_RE = new RegExp(
  // tête : numéro + suffixe optionnel + type de voie + nom de voie
  String.raw`(?<![\w])(\d{1,4}(?:\s*(?:bis|ter|quater))?[, ]\s*` +
    `(?:${STREET_TYPES.join("|")})\\s+` +
    // nom de voie : 1 à 80 caractères, sans saut de ligne, capture lazy
    `[^\\n,]{1,80}?` +
    // séparateur entre voie et CP : virgule ou espaces
    `[\\s,]+` +
    // queue : CP 5 chiffres + ville (1+ mots commençant par majuscule)
    `\\d{5}\\s+[A-ZÀ-ÖØ-Ý][\\wÀ-ÖØ-öø-ÿ'’\\s-]{1,60})(?![\\w])`,
  "giu",
);

/** Extrait le code postal d'un match (premiers 5 chiffres après le séparateur final). */
function extractPostalCode(rawMatch: string): string | null {
  const m = rawMatch.match(/(\d{5})\s+[A-ZÀ-ÖØ-Ý]/u);
  return m ? (m[1] ?? null) : null;
}

/** Extrait la ville d'un match (mots après le code postal). */
function extractCity(rawMatch: string): string | null {
  const m = rawMatch.match(/\d{5}\s+([A-ZÀ-ÖØ-Ý][\wÀ-ÖØ-öø-ÿ'’\s-]{1,60})/u);
  return m ? ((m[1] ?? null)?.trim() ?? null) : null;
}

export const postalAddressFrDetector: Detector = {
  id: "postal-address-fr",
  label: "Adresse postale (France)",
  source:
    "AFNOR NF Z10-011 — heuristique tête (n° + type voie) + queue (CP + ville)",
  detect(text: string): readonly Finding[] {
    const out: Finding[] = [];
    ADDRESS_RE.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = ADDRESS_RE.exec(text)) !== null) {
      const value = match[0];
      const postalCode = extractPostalCode(value);
      if (postalCode === null || !isFrenchPostalCode(postalCode)) {
        continue;
      }
      const city = extractCity(value);
      const metadata: Record<string, string | number | boolean> = {
        postalCode,
      };
      if (city !== null) {
        metadata.city = city;
      }
      out.push({
        detector: "postal-address-fr",
        value,
        location: { start: match.index, end: match.index + value.length },
        confidence: "low",
        severity: "high",
        metadata,
      });
    }
    return out;
  },
};
