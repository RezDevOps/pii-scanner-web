/**
 * Détecteur de plaque d'immatriculation française.
 *
 * Deux formats actifs sur le territoire :
 *
 *  1. **SIV (Système d'Immatriculation des Véhicules)**, en vigueur depuis le
 *     15 avril 2009 pour toute nouvelle immatriculation. Format à séparateurs
 *     fixes :
 *       `AA-123-AA`
 *     Soit deux lettres, un tiret, trois chiffres, un tiret, deux lettres.
 *     **Lettres exclues** : `I`, `O`, `U` (confusion graphique avec `1`,
 *     `0`, `V`). Le séparateur peut être un espace dans la pratique
 *     imprimée.
 *
 *  2. **FNI (Fichier National des Immatriculations)**, format historique
 *     avant 2009, encore porté par les véhicules d'avant cette date :
 *       `1234 AB 56`
 *     Soit 1 à 4 chiffres, 1 à 3 lettres, 1 à 3 chiffres pour le département.
 *     Lettres I, O, U non exclues. Département valide : 01-95, 971-976,
 *     plus 2A/2B en pratique (mais le FNI numérique pur ne distingue pas
 *     2A/2B et utilisait `20`).
 *
 * **Formats explicitement non couverts** :
 *  - Plaques diplomatiques / corps consulaire (préfixe `CD`, `CMD`).
 *  - Plaques militaires (préfixe `1` puis lettres).
 *  - Plaques temporaires WW (XX-WWW-XX).
 *  - Plaques d'engin agricole / TT.
 *
 * **Confiance** : `high` pour SIV (format strict + lettres exclues), `medium`
 * pour FNI (format plus laxe et collisions plus probables avec des
 * références produit ou des codes postaux).
 *
 * **Sévérité** `medium` : une plaque identifie un véhicule, indirectement
 * un titulaire (rapprochement SIV / SIV-FNV).
 *
 * Référence :
 *  - Code de la route, art. R317-8 et arrêté du 9 février 2009.
 *  - service-public.fr / sécurité routière, fiche immatriculation SIV.
 */

import type { Detector, Finding } from "../types.js";

const SIV_LETTERS = "[A-HJ-NP-TV-Z]"; // exclut I, O, U
const SIV_RE = new RegExp(
  `(?<![A-Z0-9])(${SIV_LETTERS}{2}[\\s-]\\d{3}[\\s-]${SIV_LETTERS}{2})(?![A-Z0-9])`,
  "gu",
);

/**
 * Plaque FNI : 1-4 chiffres, 1 séparateur (espace ou tiret), 1-3 lettres,
 * 1 séparateur, 1-3 chiffres pour le département.
 *
 * Le département est validé après match (01-95, 971-976) pour réduire les
 * faux positifs.
 */
const FNI_RE =
  /(?<![A-Z0-9])(\d{1,4}[\s-][A-Z]{1,3}[\s-]\d{1,3})(?![A-Z0-9])/gu;

const FNI_DEPARTMENTS_OK = /^(?:0?[1-9]|[1-8]\d|9[0-5]|97[1-6])$/u;

function isFniDepartmentValid(deptStr: string): boolean {
  return FNI_DEPARTMENTS_OK.test(deptStr);
}

interface PlateMatch {
  readonly value: string;
  readonly start: number;
  readonly end: number;
  readonly format: "siv" | "fni";
  readonly normalized: string;
  readonly department?: string;
}

function* iterSivMatches(text: string): Generator<PlateMatch> {
  SIV_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = SIV_RE.exec(text)) !== null) {
    const value = match[0];
    const normalized = value.replace(/[\s-]/gu, "").toUpperCase();
    yield {
      value,
      start: match.index,
      end: match.index + value.length,
      format: "siv",
      normalized,
    };
  }
}

function* iterFniMatches(text: string): Generator<PlateMatch> {
  FNI_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = FNI_RE.exec(text)) !== null) {
    const value = match[0];
    const upper = value.toUpperCase();
    // Extraction des 3 segments via re-split pour gérer espaces ET tirets.
    const segments = upper.split(/[\s-]+/u);
    if (segments.length !== 3) {
      continue;
    }
    const [, , deptStr] = segments;
    if (!deptStr || !isFniDepartmentValid(deptStr)) {
      continue;
    }
    const normalized = upper.replace(/[\s-]+/gu, "");
    yield {
      value,
      start: match.index,
      end: match.index + value.length,
      format: "fni",
      normalized,
      department: deptStr,
    };
  }
}

export const licensePlateFrDetector: Detector = {
  id: "license-plate-fr",
  label: "Plaque d'immatriculation (France)",
  source: "Arrêté du 9 février 2009 (SIV) + format FNI historique",
  detect(text: string): readonly Finding[] {
    const out: Finding[] = [];
    const seen = new Set<string>();

    for (const match of iterSivMatches(text)) {
      const key = `${match.start}|${match.end}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      out.push({
        detector: "license-plate-fr",
        value: match.value,
        location: { start: match.start, end: match.end },
        confidence: "high",
        severity: "medium",
        metadata: {
          format: match.format,
          normalized: match.normalized,
        },
      });
    }

    for (const match of iterFniMatches(text)) {
      const key = `${match.start}|${match.end}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      const metadata: Record<string, string | number | boolean> = {
        format: match.format,
        normalized: match.normalized,
      };
      if (match.department !== undefined) {
        metadata.department = match.department;
      }
      out.push({
        detector: "license-plate-fr",
        value: match.value,
        location: { start: match.start, end: match.end },
        confidence: "medium",
        severity: "medium",
        metadata,
      });
    }

    out.sort((a, b) => a.location.start - b.location.start);
    return out;
  },
};
