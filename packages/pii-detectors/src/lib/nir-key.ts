/**
 * Validation de la clé du NIR (numéro de Sécurité sociale français,
 * « numéro d'inscription au répertoire »).
 *
 * Forme du NIR : 13 chiffres + 2 chiffres de clé.
 *
 *   S YY MM DD CCC OOO  KK
 *   │  │  │  │   │   │   └─ clé (2 chiffres)
 *   │  │  │  │   │   └───── ordre de naissance dans le mois (3 chiffres)
 *   │  │  │  │   └───────── code commune INSEE (3 chiffres)
 *   │  │  │  └───────────── code département (2 chars : 01-95, 2A, 2B, 96-99)
 *   │  │  └──────────────── mois de naissance (01-12, 20+ pour cas spéciaux)
 *   │  └─────────────────── année de naissance (2 chiffres)
 *   └────────────────────── sexe (1, 2, 3, 4, 7, 8 selon les cas)
 *
 * Algorithme officiel : la clé vaut `97 - (N mod 97)` où `N` est le nombre
 * formé par les 13 premiers chiffres.
 *
 * Cas Corse — le code département `2A` ou `2B` n'est pas numérique. La règle
 * INSEE est de remplacer la lettre par un chiffre et de soustraire un offset
 * AVANT le calcul du modulo 97 :
 *
 *   - département `2A` → on substitue `19` dans la chaîne ET on soustrait
 *     1 000 000 du grand entier `N`.
 *   - département `2B` → on substitue `18` ET on soustrait 2 000 000.
 *
 * Référence : circulaire SS-DRH 2007 / INSEE, codification NIR.
 */

/**
 * Représentation d'un NIR validé : la composition normalisée (sans espaces)
 * sur 15 caractères et le statut de la clé.
 */
export interface NirValidationResult {
  /** Vrai si la clé fournie correspond bien à celle calculée. */
  readonly keyValid: boolean;
  /** Vrai si la chaîne respecte la forme attendue (longueur, alphabet, dpt). */
  readonly wellFormed: boolean;
  /** Clé calculée (toujours sur 2 chiffres avec leading zero), si bien formée. */
  readonly computedKey?: string;
}

/**
 * Forme acceptée : `<sexe><année><mois><département><commune><ordre><clé>`.
 *  - sexe ∈ {1,2,3,4,7,8}
 *  - année / mois : 2 chiffres chacun (les valeurs aberrantes sont
 *    capturées par la validation de clé).
 *  - département : 2 chiffres OU `2A` / `2B` pour la Corse.
 *  - commune + ordre : 6 chiffres.
 *  - clé : 2 chiffres.
 */
const NIR_FORMAT_RE = /^[123478]\d{4}(?:\d{2}|2A|2B)\d{6}\d{2}$/u;

/**
 * Calcule l'entier modulo 97 d'une chaîne purement numérique, sans BigInt.
 * Découpé en tranches de 9 chiffres pour rester dans `Number.MAX_SAFE_INTEGER`.
 */
function decimalMod97(digits: string): number {
  let remainder = 0;
  let i = 0;
  while (i < digits.length) {
    const slice = digits.slice(i, i + 9);
    remainder = (remainder * 10 ** slice.length + Number(slice)) % 97;
    i += slice.length;
  }
  return remainder;
}

/**
 * Valide un NIR sur 15 caractères (sans espace).
 *
 * @param nir chaîne de 15 caractères, déjà normalisée (sans espace, en
 *   majuscules).
 */
export function validateNir(nir: string): NirValidationResult {
  if (!NIR_FORMAT_RE.test(nir)) {
    return { keyValid: false, wellFormed: false };
  }

  const body = nir.slice(0, 13);
  const providedKey = nir.slice(13, 15);

  // Substitution Corse + offset.
  let numericBody: string;
  let corsicaOffset = 0;
  if (body.includes("2A")) {
    numericBody = body.replace("2A", "19");
    corsicaOffset = 1_000_000;
  } else if (body.includes("2B")) {
    numericBody = body.replace("2B", "18");
    corsicaOffset = 2_000_000;
  } else {
    numericBody = body;
  }

  // 13 chiffres ⇒ entier ≤ 9 999 999 999 999, soit ~10^13. C'est au-dessus de
  // `Number.MAX_SAFE_INTEGER` (~9.0e15) ? Non, on est en-dessous. Mais avec
  // l'offset on reste sûr en-dessous. On peut donc soustraire avant modulo.
  const n = Number(numericBody) - corsicaOffset;
  const computedNumber = 97 - (n % 97);
  const computedKey = String(computedNumber).padStart(2, "0");

  return {
    keyValid: computedKey === providedKey,
    wellFormed: true,
    computedKey,
  };
}

/**
 * Variante simple booléenne. Utile pour les détecteurs.
 */
export function isNirKeyValid(nir: string): boolean {
  return validateNir(nir).keyValid;
}

// Tranche `decimalMod97` exposée pour les tests internes.
export const __internal = { decimalMod97 };
