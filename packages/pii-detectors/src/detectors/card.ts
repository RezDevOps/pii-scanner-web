/**
 * Détecteur de numéro de carte bancaire (PAN — Primary Account Number).
 *
 * Stratégie :
 *  1. Capture une séquence de **13 à 19 chiffres**, éventuellement séparés par
 *     des espaces ou des tirets tous les 4 chiffres (forme imprimée).
 *  2. Vérifie l'algorithme de **Luhn** (ISO/IEC 7812-1) sur la version
 *     normalisée.
 *  3. Identifie la **marque** (Visa, Mastercard, Amex, etc.) à partir du
 *     préfixe (premiers chiffres). **Aucun finding émis si la marque ne
 *     matche aucun préfixe connu** — un PAN valide Luhn sans marque
 *     reconnue est presque toujours un faux positif (numéro de série
 *     interne, identifiant produit, etc.).
 *  4. Émet le finding avec la marque dans `metadata.brand`.
 *
 * Sévérité : `critical` — un PAN exposé permet une fraude immédiate (Carders
 * Forum, dump CSV, etc.). C'est la donnée la plus sensible du périmètre PII
 * couvert par ce scanner.
 *
 * Référence :
 *  - ISO/IEC 7812-1:2017 (Identification cards — Identification of issuers).
 *  - Plages d'IIN documentées par les schemes (Visa, Mastercard, Amex, etc.).
 */

import type { Detector, Finding } from "../types.js";
import { isLuhnValid } from "../lib/luhn.js";

/**
 * Capture un PAN imprimé : 13 à 19 chiffres au total, séparés par des espaces
 * ou des tirets tous les 4 chiffres (la forme libre `XXXXXXXXXXXXXXXX` est
 * également capturée).
 *
 * Le lookbehind `(?<![\d])` et le lookahead `(?![\d])` évitent de capturer un
 * PAN dans une chaîne plus longue de chiffres (ex. UUID hex sans lettres).
 */
const PAN_LOOSE_RE = /(?<![\d])(\d(?:[ -]?\d){12,18})(?![\d])/gu;

function normalize(raw: string): string {
  return raw.replace(/[\s-]+/gu, "");
}

/**
 * Marque détectée à partir du préfixe (BIN/IIN). Liste cadrée sur les schemes
 * majeurs ; les schemes nationaux (Cartes Bancaires CB, RuPay, etc.) tombent
 * en `unknown` et sont rejetés.
 */
export type CardBrand =
  | "visa"
  | "mastercard"
  | "amex"
  | "discover"
  | "jcb"
  | "diners"
  | "unionpay";

interface BrandRule {
  readonly brand: CardBrand;
  /** Test du préfixe sur la version normalisée. */
  readonly matches: (digits: string) => boolean;
  /** Longueurs valides pour cette marque. */
  readonly lengths: ReadonlySet<number>;
}

function startsWithRange(
  digits: string,
  prefixLen: number,
  min: number,
  max: number,
): boolean {
  if (digits.length < prefixLen) {
    return false;
  }
  const value = Number(digits.slice(0, prefixLen));
  return Number.isFinite(value) && value >= min && value <= max;
}

const BRAND_RULES: readonly BrandRule[] = [
  {
    brand: "visa",
    matches: (d) => d.startsWith("4"),
    lengths: new Set([13, 16, 19]),
  },
  {
    brand: "mastercard",
    matches: (d) =>
      startsWithRange(d, 2, 51, 55) || startsWithRange(d, 4, 2221, 2720),
    lengths: new Set([16]),
  },
  {
    brand: "amex",
    matches: (d) => d.startsWith("34") || d.startsWith("37"),
    lengths: new Set([15]),
  },
  {
    brand: "discover",
    matches: (d) =>
      d.startsWith("6011") ||
      d.startsWith("65") ||
      startsWithRange(d, 3, 644, 649),
    lengths: new Set([16, 19]),
  },
  {
    brand: "jcb",
    matches: (d) => startsWithRange(d, 4, 3528, 3589),
    lengths: new Set([16, 19]),
  },
  {
    brand: "diners",
    matches: (d) =>
      startsWithRange(d, 3, 300, 305) ||
      d.startsWith("3095") ||
      d.startsWith("36") ||
      d.startsWith("38") ||
      d.startsWith("39"),
    lengths: new Set([14, 16]),
  },
  {
    brand: "unionpay",
    matches: (d) => d.startsWith("62") || d.startsWith("81"),
    lengths: new Set([16, 17, 18, 19]),
  },
];

/**
 * Identifie la marque d'un PAN normalisé à partir de son préfixe et de sa
 * longueur. Renvoie `null` si aucune marque ne matche.
 */
export function detectCardBrand(digits: string): CardBrand | null {
  for (const rule of BRAND_RULES) {
    if (rule.matches(digits) && rule.lengths.has(digits.length)) {
      return rule.brand;
    }
  }
  return null;
}

export const cardDetector: Detector = {
  id: "card",
  label: "Numéro de carte bancaire (PAN)",
  source: "ISO/IEC 7812-1 — Luhn + plages d'IIN par scheme",
  detect(text: string): readonly Finding[] {
    const out: Finding[] = [];
    PAN_LOOSE_RE.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = PAN_LOOSE_RE.exec(text)) !== null) {
      const value = match[0];
      const normalized = normalize(value);
      if (normalized.length < 13 || normalized.length > 19) {
        continue;
      }
      if (!isLuhnValid(normalized)) {
        continue;
      }
      const brand = detectCardBrand(normalized);
      if (brand === null) {
        // Pas de marque connue : on rejette (forte probabilité de faux positif
        // sur un identifiant interne validant accidentellement Luhn).
        continue;
      }
      out.push({
        detector: "card",
        value,
        location: { start: match.index, end: match.index + value.length },
        confidence: "high",
        severity: "critical",
        metadata: {
          brand,
          length: normalized.length,
          last4: normalized.slice(-4),
          bin: normalized.slice(0, 6),
        },
      });
    }
    return out;
  },
};
