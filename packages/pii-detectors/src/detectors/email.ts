/**
 * Détecteur d'adresses e-mail.
 *
 * Stratégie : forme HTML5 simplifiée de la RFC 5322. On évite la grammaire
 * complète (qui autorise des séquences exotiques jamais rencontrées en
 * pratique) au profit du sous-ensemble universellement implémenté par les
 * navigateurs et les MTA modernes.
 *
 * Référence : WHATWG HTML Living Standard,
 *   https://html.spec.whatwg.org/multipage/input.html#valid-e-mail-address
 *   (lui-même un sous-ensemble strictement plus restrictif que la RFC 5322).
 */

import type { Detector, Finding } from "../types.js";

/**
 * Local-part : `[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+`. On exclut les guillemets
 * ouvrants RFC (`"local"@example.com`) et les adresses IP littérales
 * (`local@[192.0.2.1]`) — couverts en S4 si demande terrain.
 */
const EMAIL_RE =
  /[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,63}/gu;

export const emailDetector: Detector = {
  id: "email",
  label: "Adresse e-mail",
  source: "WHATWG HTML — sous-ensemble RFC 5322",
  detect(text: string): readonly Finding[] {
    const out: Finding[] = [];
    // RegExp avec flag `g` : on remet `lastIndex` à zéro pour rester pure.
    EMAIL_RE.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = EMAIL_RE.exec(text)) !== null) {
      const value = match[0];
      out.push({
        detector: "email",
        value,
        location: { start: match.index, end: match.index + value.length },
        confidence: "high",
        severity: "medium",
      });
    }
    return out;
  },
};
