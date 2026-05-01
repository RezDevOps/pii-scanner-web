/**
 * Point d'entrée public de `@rezdevops/pii-detectors`.
 *
 * En sprint S0, ce module n'expose que les types publics. Les détecteurs et la
 * fonction `detect()` arrivent en S1 (tag `v0.1.0`).
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

/**
 * Version courante du package, alignée sur `package.json`. Exposée pour
 * permettre aux consommateurs (engine, UI, rapports) de tracer la version
 * effectivement embarquée à un moment donné.
 */
export const VERSION = "0.0.0";
