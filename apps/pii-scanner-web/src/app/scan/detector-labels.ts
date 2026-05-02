/**
 * Map détecteur → label affichable dans la table du rapport.
 *
 * Construit à partir des `coreDetectors` de `@rezdevops/pii-detectors`.
 * Centralisé ici pour permettre à l'app de surcharger un label
 * sans toucher à la lib (ex. localiser, raccourcir).
 */
import { coreDetectors } from "@rezdevops/pii-detectors";

export function buildDetectorLabels(): Readonly<Record<string, string>> {
  const map: Record<string, string> = {};
  for (const d of coreDetectors) {
    map[d.id] = d.label;
  }
  return Object.freeze(map);
}
