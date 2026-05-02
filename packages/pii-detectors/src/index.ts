/**
 * Point d'entrée public de `@rezdevops/pii-detectors`.
 *
 * - `v0.1.0` (S1) : 5 détecteurs cœur (email, phone-fr, nir, iban, siret).
 * - `v0.2.0` (S4) : +7 détecteurs étendus (bic, tva-intracom-fr, card,
 *   postal-code-fr, license-plate-fr, date-of-birth, postal-address-fr) +
 *   primitives `computeTvaIntracomFrKey`, `detectCardBrand`,
 *   `isFrenchPostalCode`, `isCalendarDateValid`, `isIso3166Alpha2`.
 *   Aucune rupture d'API : `coreDetectors` est étendue, le contrat
 *   `Detector` est inchangé.
 */

export type {
  Confidence,
  Detector,
  DetectorId,
  DetectOptions,
  Finding,
  Location,
  Severity,
} from "./types.js";

export {
  coreDetectors,
  emailDetector,
  phoneFrDetector,
  nirDetector,
  ibanDetector,
  siretDetector,
  bicDetector,
  tvaIntracomFrDetector,
  computeTvaIntracomFrKey,
  cardDetector,
  detectCardBrand,
  postalCodeFrDetector,
  isFrenchPostalCode,
  licensePlateFrDetector,
  dateOfBirthDetector,
  isCalendarDateValid,
  postalAddressFrDetector,
} from "./detectors/index.js";
export type { CardBrand } from "./detectors/index.js";

// Primitives de validation par clé, exposées pour les consommateurs avancés
// (tests intégrateurs, scripts de génération de fixtures).
export { isLuhnValid } from "./lib/luhn.js";
export { isIbanMod97Valid } from "./lib/mod97.js";
export { validateNir, isNirKeyValid } from "./lib/nir-key.js";
export type { NirValidationResult } from "./lib/nir-key.js";
export { isIso3166Alpha2, ISO_3166_ALPHA2 } from "./lib/iso-3166.js";

/**
 * Version courante du package, alignée sur `package.json`. Exposée pour
 * permettre aux consommateurs (engine, UI, rapports) de tracer la version
 * effectivement embarquée à un moment donné.
 */
export const VERSION = "1.0.1";
