/**
 * Validation MOD 97-10 (ISO 7064) pour IBAN.
 *
 * Procédure normalisée par ISO 13616 :
 *   1. Déplacer les 4 premiers caractères (code pays + clé) à la fin.
 *   2. Convertir chaque lettre en deux chiffres (`A`=10, `B`=11, ..., `Z`=35).
 *   3. Calculer le reste modulo 97 du grand entier obtenu.
 *   4. L'IBAN est valide si et seulement si le reste vaut 1.
 *
 * Le calcul du `mod 97` est fait par segments pour éviter les `BigInt` —
 * suffisant pour les longueurs IBAN (max 34 chars).
 *
 * Référence : ISO 13616-1:2020 §5.
 */

/**
 * Convertit une lettre (`A`-`Z`) en sa représentation IBAN (`10`-`35`).
 *
 * @returns `''` si le caractère n'est ni un chiffre ni une lettre majuscule.
 */
function ibanCharToDigits(ch: string): string {
  const code = ch.charCodeAt(0);
  if (code >= 48 && code <= 57) {
    // '0'-'9'
    return ch;
  }
  if (code >= 65 && code <= 90) {
    // 'A'-'Z'
    return String(code - 55);
  }
  return "";
}

/**
 * Calcule la valeur modulo 97 d'un IBAN normalisé (sans espaces, lettres
 * en majuscule).
 *
 * @returns `null` si l'IBAN contient un caractère non valide, sinon le reste
 *   modulo 97 (un entier dans `[0, 96]`).
 */
function ibanMod97(iban: string): number | null {
  // Déplacer les 4 premiers caractères en fin.
  const rearranged = iban.slice(4) + iban.slice(0, 4);

  let buffer = "";
  let remainder = 0;

  for (let i = 0; i < rearranged.length; i += 1) {
    // `rearranged.length` borne `i` ; le caractère est garanti défini.
    const ch = rearranged.charAt(i);
    const digits = ibanCharToDigits(ch);
    if (digits === "") {
      return null;
    }
    buffer += digits;
    // On consomme par tranches de 9 chiffres pour rester dans `Number.MAX_SAFE_INTEGER`.
    if (buffer.length >= 9) {
      remainder = (remainder * 10 ** buffer.length + Number(buffer)) % 97;
      buffer = "";
    }
  }
  if (buffer.length > 0) {
    remainder = (remainder * 10 ** buffer.length + Number(buffer)) % 97;
  }
  return remainder;
}

/**
 * Vérifie la clé MOD 97 d'un IBAN normalisé.
 *
 * @param iban IBAN sans espace, en majuscules. La validation de longueur
 *   par pays est faite séparément (voir `detectors/iban.ts`).
 * @returns `true` si la clé est valide.
 */
export function isIbanMod97Valid(iban: string): boolean {
  const remainder = ibanMod97(iban);
  return remainder === 1;
}
