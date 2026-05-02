/**
 * Détecteur d'IBAN.
 *
 * Stratégie :
 *  1. Repérer toute séquence `<2 lettres><2 chiffres><14 à 30 alphanum>` qui
 *     pourrait être un IBAN, en tolérant des espaces tous les 4 caractères
 *     (forme imprimée).
 *  2. Vérifier que le code pays est connu et que la longueur normalisée
 *     (sans espaces) correspond à celle attendue.
 *  3. Vérifier la clé MOD 97 (ISO 13616).
 *
 * **N'émettre qu'en cas de validation MOD 97.** Une chaîne qui matche le
 * format mais dont la clé est invalide est rejetée (contrat
 * `docs/detecteurs.md`).
 *
 * Références :
 *  - ISO 13616-1:2020 (structure et calcul de la clé).
 *  - IBAN Registry SWIFT (longueur par pays — voir `lib/iban-lengths.ts`).
 */

import type { Detector, Finding } from "../types.js";
import { isIbanMod97Valid } from "../lib/mod97.js";
import { IBAN_LENGTH_BY_COUNTRY } from "../lib/iban-lengths.js";

/**
 * IBAN imprimé : 4 caractères, espace, 4 caractères, espace, etc., longueur
 * totale jusqu'à 34 caractères significatifs (LC = 32, MT = 31).
 *
 * On capture en se laissant la liberté de normaliser ensuite. Le format
 * minimal est de 15 caractères significatifs (NO).
 */
const IBAN_LOOSE_RE =
  /(?<![A-Z0-9])([A-Z]{2}[0-9]{2}(?:[ ]?[A-Z0-9]){11,30})(?![A-Z0-9])/gu;

function normalize(raw: string): string {
  return raw.replace(/\s+/gu, "").toUpperCase();
}

export const ibanDetector: Detector = {
  id: "iban",
  label: "IBAN (numéro de compte international)",
  source: "ISO 13616-1 — clé MOD 97 + IBAN Registry SWIFT pour la longueur",
  detect(text: string): readonly Finding[] {
    const out: Finding[] = [];
    IBAN_LOOSE_RE.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = IBAN_LOOSE_RE.exec(text)) !== null) {
      const value = match[0];
      const normalized = normalize(value);
      const country = normalized.slice(0, 2);
      const expectedLength = IBAN_LENGTH_BY_COUNTRY[country];
      if (expectedLength === undefined) {
        continue;
      }
      if (normalized.length !== expectedLength) {
        continue;
      }
      if (!isIbanMod97Valid(normalized)) {
        continue;
      }
      out.push({
        detector: "iban",
        value,
        location: { start: match.index, end: match.index + value.length },
        confidence: "high",
        severity: "critical",
        metadata: { country, normalized },
      });
    }
    return out;
  },
};
