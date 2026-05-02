/**
 * Point d'entrée public de `@rezdevops/pii-detectors`.
 *
 * Stable depuis la `v0.1.0` (5 détecteurs cœur : email, phone-fr, nir, iban,
 * siret). Les 7 détecteurs restants du périmètre v1.0 sont ajoutés en S4 et
 * étendront `coreDetectors` sans rétro-incompatibilité.
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
} from "./detectors/index.js";

// Primitives de validation par clé, exposées pour les consommateurs avancés
// (tests intégrateurs, scripts de génération de fixtures).
export { isLuhnValid } from "./lib/luhn.js";
export { isIbanMod97Valid } from "./lib/mod97.js";
export { validateNir, isNirKeyValid } from "./lib/nir-key.js";
export type { NirValidationResult } from "./lib/nir-key.js";

/**
 * Version courante du package, alignée sur `package.json`. Exposée pour
 * permettre aux consommateurs (engine, UI, rapports) de tracer la version
 * effectivement embarquée à un moment donné.
 */
export const VERSION = "0.1.0";
