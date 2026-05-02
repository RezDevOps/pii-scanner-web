/**
 * Index des détecteurs livrés en S1 (5 détecteurs cœur).
 *
 * Les détecteurs additionnels (BIC, carte bancaire, code postal, adresse,
 * plaque, DDN, SIREN seul, TVA intracom) arrivent en S4 — leur ajout étendra
 * `coreDetectors` ou introduira `extraDetectors` selon le besoin.
 */

import type { Detector } from "../types.js";
import { emailDetector } from "./email.js";
import { phoneFrDetector } from "./phone-fr.js";
import { nirDetector } from "./nir.js";
import { ibanDetector } from "./iban.js";
import { siretDetector } from "./siret.js";

export { emailDetector } from "./email.js";
export { phoneFrDetector } from "./phone-fr.js";
export { nirDetector } from "./nir.js";
export { ibanDetector } from "./iban.js";
export { siretDetector } from "./siret.js";

/**
 * Liste figée des détecteurs cœur, ordonnée par criticité décroissante des
 * findings qu'ils peuvent produire (NIR → IBAN → SIRET → téléphone → email).
 * L'ordre est cosmétique : `Engine.scanText` réordonne par position.
 */
export const coreDetectors: readonly Detector[] = Object.freeze([
  nirDetector,
  ibanDetector,
  siretDetector,
  phoneFrDetector,
  emailDetector,
]);
