/**
 * Détecteur de numéros de téléphone français.
 *
 * Reconnaît les deux formes en circulation :
 *  - **National** : `0X XX XX XX XX` (X = chiffre), avec séparateurs autorisés
 *    `espace`, `.`, `-` ou aucun. Le premier chiffre après le `0` indique
 *    la nature du numéro (1-5 fixe, 6-7 mobile, 8 services, 9 fixe non
 *    géographique).
 *  - **International** : `+33 X XX XX XX XX` ou `+33XXXXXXXXX` (le `0` initial
 *    est supprimé après l'indicatif `+33`). On accepte aussi `0033`.
 *
 * On exige un anti-glissement : le motif ne doit pas être collé à un autre
 * chiffre (sinon on capturerait `60601020304` au milieu d'une longue suite
 * de chiffres). Implémenté via lookbehind / lookahead négatifs sur `\d`.
 *
 * Référence : ARCEP, plan national de numérotation téléphonique
 * (arrêté du 16 janvier 2018 et mises à jour ultérieures).
 */

import type { Detector, Finding } from "../types.js";

/**
 * Sépare les chiffres du numéro pour exposer la nature dans `metadata.kind`.
 * Mobile : préfixe national `06` ou `07` (donc `+33 6` / `+33 7`).
 * Fixe géographique : `01`-`05`.
 * Fixe non géographique : `09`.
 * Services à valeur ajoutée : `08`.
 */
function classify(
  nationalPrefix: string,
): "mobile" | "fixe" | "non-geo" | "svp" | "inconnu" {
  switch (nationalPrefix) {
    case "6":
    case "7":
      return "mobile";
    case "1":
    case "2":
    case "3":
    case "4":
    case "5":
      return "fixe";
    case "8":
      return "svp";
    case "9":
      return "non-geo";
    default:
      return "inconnu";
  }
}

const PHONE_RE =
  /(?<!\d)(?:(?:\+33|0033)[ .\-]?(?<intl>[1-9])(?:[ .\-]?\d{2}){4}|0(?<nat>[1-9])(?:[ .\-]?\d{2}){4})(?!\d)/gu;

export const phoneFrDetector: Detector = {
  id: "phone-fr",
  label: "Numéro de téléphone français",
  source: "ARCEP — plan national de numérotation téléphonique",
  detect(text: string): readonly Finding[] {
    const out: Finding[] = [];
    PHONE_RE.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = PHONE_RE.exec(text)) !== null) {
      const value = match[0];
      const groups = match.groups ?? {};
      const prefix = groups["intl"] ?? groups["nat"] ?? "";
      out.push({
        detector: "phone-fr",
        value,
        location: { start: match.index, end: match.index + value.length },
        confidence: "high",
        severity: "medium",
        metadata: { kind: classify(prefix) },
      });
    }
    return out;
  },
};
