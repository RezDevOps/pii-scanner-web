/**
 * Algorithme de Luhn (ISO/IEC 7812-1).
 *
 * Utilisé pour la validation par clé de :
 *  - SIREN / SIRET (INSEE) — voir `detectors/siret.ts`.
 *  - Cartes bancaires (PAN, ISO/IEC 7812-1) — viendra en S4.
 *
 * Référence : ISO/IEC 7812-1:2017, annexe B.
 *
 * Implémentation pure : entrée = chaîne de chiffres décimaux uniquement (déjà
 * normalisée par l'appelant). Toute autre entrée renvoie `false`.
 */

/** Vérifie qu'une chaîne ne contient QUE des chiffres ASCII `0-9`. */
function isAllDigits(value: string): boolean {
  if (value.length === 0) {
    return false;
  }
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    if (code < 48 || code > 57) {
      return false;
    }
  }
  return true;
}

/**
 * Vérifie la clé de Luhn d'une chaîne purement numérique.
 *
 * @param digits chaîne de chiffres décimaux, sans séparateur.
 * @returns `true` si la somme pondérée est divisible par 10, `false` sinon
 *   (ou si l'entrée n'est pas numérique).
 */
export function isLuhnValid(digits: string): boolean {
  if (!isAllDigits(digits)) {
    return false;
  }

  let sum = 0;
  // On parcourt de droite à gauche : la position 0 (depuis la droite) est la
  // clé, on double une position sur deux à partir de la position 1.
  for (let i = digits.length - 1, position = 0; i >= 0; i -= 1, position += 1) {
    // `digits` est intégralement numérique (vérifié ci-dessus), donc
    // `digits[i]` est défini et représente un chiffre `0`-`9`.
    const digit = digits.charCodeAt(i) - 48;
    if (position % 2 === 1) {
      const doubled = digit * 2;
      sum += doubled > 9 ? doubled - 9 : doubled;
    } else {
      sum += digit;
    }
  }

  return sum % 10 === 0;
}
