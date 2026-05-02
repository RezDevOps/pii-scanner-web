/**
 * Détecteur de BIC (Business Identifier Code, anciennement « SWIFT code »).
 *
 * Format ISO 9362 :
 *   `BBBB` (4 lettres : code institution) +
 *   `CC`   (2 lettres : code pays ISO 3166-1 alpha-2) +
 *   `LL`   (2 alphanum : code emplacement) +
 *   `BBB`  (3 alphanum : code branche, **optionnel**)
 *
 * Longueur totale : **8 ou 11 caractères**. Pas de checksum mathématique
 * dans ISO 9362 — la validation se fait par cohérence structurelle (les 4
 * premières positions doivent être des lettres, le pays doit exister,
 * positions 7-8 et 9-11 alphanumériques).
 *
 * Convention : un dernier caractère `1` indique un BIC de test (testing),
 * un `0` indique passive participant. On ne filtre pas — on garde la valeur
 * brute, l'éventuel filtrage est une décision de la couche supérieure.
 *
 * Référence :
 *  - ISO 9362:2022 (Banking — Business Identifier Code).
 *  - SWIFT BIC Policy v3.4 (registre opérationnel).
 */

import type { Detector, Finding } from "../types.js";
import { isIso3166Alpha2 } from "../lib/iso-3166.js";

/**
 * BIC sous sa forme canonique (sans espace), 8 ou 11 caractères. Capture
 * `BBBBCCLL` (8) ou `BBBBCCLLBBB` (11).
 *
 * Le lookbehind `(?<![A-Z0-9])` évite de capturer un BIC accolé à un IBAN
 * ou à un identifiant interne plus long (ex. `BNPAFRPPXXXFR76...`).
 */
const BIC_RE =
  /(?<![A-Z0-9])([A-Z]{4}[A-Z]{2}[A-Z0-9]{2}(?:[A-Z0-9]{3})?)(?![A-Z0-9])/gu;

export const bicDetector: Detector = {
  id: "bic",
  label: "BIC (code SWIFT bancaire)",
  source: "ISO 9362 — structure BBBBCCLL[BBB] + code pays ISO 3166-1",
  detect(text: string): readonly Finding[] {
    const out: Finding[] = [];
    BIC_RE.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = BIC_RE.exec(text)) !== null) {
      const value = match[0];
      const institution = value.slice(0, 4);
      const country = value.slice(4, 6);
      const location = value.slice(6, 8);
      const branch = value.length === 11 ? value.slice(8, 11) : undefined;

      if (!isIso3166Alpha2(country)) {
        continue;
      }

      const metadata: Record<string, string | number | boolean> = {
        institution,
        country,
        location,
        length: value.length,
      };
      if (branch !== undefined) {
        metadata.branch = branch;
      }

      out.push({
        detector: "bic",
        value,
        location: { start: match.index, end: match.index + value.length },
        confidence: "high",
        severity: "high",
        metadata,
      });
    }
    return out;
  },
};
