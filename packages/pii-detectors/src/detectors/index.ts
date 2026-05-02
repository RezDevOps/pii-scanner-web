/**
 * Index des détecteurs livrés.
 *
 * v0.1.0 (S1) : 5 détecteurs cœur (email, phone-fr, nir, iban, siret).
 * v0.2.0 (S4) : +7 détecteurs étendus (bic, tva-intracom-fr, card,
 *               postal-code-fr, license-plate-fr, date-of-birth,
 *               postal-address-fr).
 *
 * Le `DetectorId` `siren` reste déclaré dans `types.ts` mais n'a pas
 * d'implémentation : un SIREN nu (9 chiffres + Luhn) génère trop de faux
 * positifs sans contexte ; on le réintroduira en v0.5+ avec un détecteur
 * composite SIREN-en-contexte (« SIREN : <9 chiffres> », etc.).
 */

import type { Detector } from "../types.js";
import { emailDetector } from "./email.js";
import { phoneFrDetector } from "./phone-fr.js";
import { nirDetector } from "./nir.js";
import { ibanDetector } from "./iban.js";
import { siretDetector } from "./siret.js";
import { bicDetector } from "./bic.js";
import { tvaIntracomFrDetector } from "./tva-intracom-fr.js";
import { cardDetector } from "./card.js";
import { postalCodeFrDetector } from "./postal-code-fr.js";
import { licensePlateFrDetector } from "./license-plate-fr.js";
import { dateOfBirthDetector } from "./date-of-birth.js";
import { postalAddressFrDetector } from "./postal-address-fr.js";

export { emailDetector } from "./email.js";
export { phoneFrDetector } from "./phone-fr.js";
export { nirDetector } from "./nir.js";
export { ibanDetector } from "./iban.js";
export { siretDetector } from "./siret.js";
export { bicDetector } from "./bic.js";
export {
  tvaIntracomFrDetector,
  computeTvaIntracomFrKey,
} from "./tva-intracom-fr.js";
export { cardDetector, detectCardBrand } from "./card.js";
export type { CardBrand } from "./card.js";
export { postalCodeFrDetector, isFrenchPostalCode } from "./postal-code-fr.js";
export { licensePlateFrDetector } from "./license-plate-fr.js";
export { dateOfBirthDetector, isCalendarDateValid } from "./date-of-birth.js";
export { postalAddressFrDetector } from "./postal-address-fr.js";

/**
 * Liste figée des détecteurs cœur, ordonnée par criticité décroissante des
 * findings qu'ils peuvent produire (data financière → identifiant régalien
 * → coordonnées → contexte). L'ordre est cosmétique : `Engine.scanText`
 * réordonne par position.
 */
export const coreDetectors: readonly Detector[] = Object.freeze([
  cardDetector,
  ibanDetector,
  bicDetector,
  nirDetector,
  siretDetector,
  tvaIntracomFrDetector,
  postalAddressFrDetector,
  phoneFrDetector,
  emailDetector,
  licensePlateFrDetector,
  dateOfBirthDetector,
  postalCodeFrDetector,
]);
