/**
 * Détecteur de date de naissance (et plus largement, de toute date isolée
 * dans un format calendaire).
 *
 * Quatre formats reconnus :
 *  - `JJ/MM/AAAA` — forme française la plus courante.
 *  - `JJ-MM-AAAA` — variante avec tirets.
 *  - `JJ.MM.AAAA` — variante européenne (Suisse, Allemagne).
 *  - `AAAA-MM-JJ` — ISO 8601 (forme étendue).
 *
 * **Validation calendaire stricte** : on exige une vraie date du calendrier
 * grégorien (gestion des bissextiles, mois à 28/29/30/31 jours) et on borne
 * l'année à la fenêtre `[1900, 2100]`. Cette borne est volontaire : elle
 * couvre toute date de naissance imaginable et reste indépendante de
 * l'horloge — un détecteur pur ne doit pas dépendre de `new Date()`.
 *
 * **Confiance `low`** assumée et documentée : une date isolée est très
 * fréquente dans tout fichier (date de facturation, date de contrat, date
 * d'expiration, date d'événement), et il est impossible de distinguer une
 * date de naissance d'une autre date sans contexte sémantique. La couche
 * supérieure (rapport) doit présenter ces findings comme des « dates »
 * candidates plutôt que comme des dates de naissance certifiées.
 *
 * **Sévérité `medium`** : la date de naissance est une donnée à caractère
 * personnel (RGPD art. 4.1) et un identifiant indirect classique. Si un
 * détecteur composite (post-v1.0) la corrèle à un nom, la sévérité monte à
 * `high`.
 *
 * Référence :
 *  - ISO 8601 (Date and time format).
 *  - RGPD art. 4.1 (« données à caractère personnel »).
 */

import type { Detector, Finding } from "../types.js";

const MIN_YEAR = 1900;
const MAX_YEAR = 2100;

/**
 * Capture les 4 formats reconnus :
 *  1. `JJ[sep]MM[sep]AAAA` avec sep = `/` `-` `.`
 *  2. `AAAA-MM-JJ` (ISO)
 *
 * Le lookaround `(?<![\d/-])` / `(?![\d/-])` empêche les accolements à un
 * chiffre ou un séparateur de date — mais autorise un point final de phrase
 * (« né le 14/07/1989. ») et un deux-points (heure dans le voisinage).
 */
const DATE_RE =
  /(?<![\d/-])(?:(\d{1,2})([./-])(\d{1,2})\2(\d{4})|(\d{4})-(\d{1,2})-(\d{1,2}))(?![\d/-])/gu;

/**
 * Vérifie qu'un triplet (année, mois, jour) représente une vraie date du
 * calendrier grégorien.
 *
 * @returns `true` si la date existe.
 */
export function isCalendarDateValid(
  year: number,
  month: number,
  day: number,
): boolean {
  if (month < 1 || month > 12) {
    return false;
  }
  if (day < 1 || day > 31) {
    return false;
  }
  // `Date.UTC` rollover tester : on construit la date et on vérifie que les
  // composants sortent inchangés.
  const d = new Date(Date.UTC(year, month - 1, day));
  return (
    d.getUTCFullYear() === year &&
    d.getUTCMonth() === month - 1 &&
    d.getUTCDate() === day
  );
}

function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

interface ParsedDate {
  readonly year: number;
  readonly month: number;
  readonly day: number;
  readonly format: "dmy" | "iso";
}

function parseMatch(match: RegExpExecArray): ParsedDate | null {
  // Branche 1 : JJ[sep]MM[sep]AAAA — groupes 1, 2, 3, 4.
  if (match[1] !== undefined) {
    const day = Number(match[1]);
    const month = Number(match[3]);
    const year = Number(match[4]);
    return { year, month, day, format: "dmy" };
  }
  // Branche 2 : AAAA-MM-JJ — groupes 5, 6, 7.
  if (match[5] !== undefined) {
    const year = Number(match[5]);
    const month = Number(match[6]);
    const day = Number(match[7]);
    return { year, month, day, format: "iso" };
  }
  return null;
}

export const dateOfBirthDetector: Detector = {
  id: "date-of-birth",
  label: "Date (potentiellement de naissance)",
  source: "ISO 8601 + variantes nationales — calendrier grégorien strict",
  detect(text: string): readonly Finding[] {
    const out: Finding[] = [];
    DATE_RE.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = DATE_RE.exec(text)) !== null) {
      const value = match[0];
      const parsed = parseMatch(match);
      if (parsed === null) {
        continue;
      }
      const { year, month, day, format } = parsed;
      if (year < MIN_YEAR || year > MAX_YEAR) {
        continue;
      }
      if (!isCalendarDateValid(year, month, day)) {
        continue;
      }
      const iso = `${year.toString().padStart(4, "0")}-${pad2(month)}-${pad2(day)}`;
      out.push({
        detector: "date-of-birth",
        value,
        location: { start: match.index, end: match.index + value.length },
        confidence: "low",
        severity: "medium",
        metadata: { format, iso },
      });
    }
    return out;
  },
};
