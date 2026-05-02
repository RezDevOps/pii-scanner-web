/**
 * `scanText` — point d'entrée le plus minimal de l'engine.
 *
 * Prend un texte (déjà extrait du fichier par la couche supérieure) et une
 * sélection de détecteurs, applique chaque détecteur, agrège les findings et
 * retourne un mini-rapport (`TextScanReport`) horodaté et chronométré.
 *
 * En S1, c'est le SEUL contrat exposé par l'engine. Les couches `parseFile`
 * et `runWorkers` (S2-S3) viendront s'empiler par-dessus, sans changer la
 * signature de `scanText`.
 */

import type { Detector, Finding } from "@rezdevops/pii-detectors";

/**
 * Rapport de scan d'un texte unique. Volontairement plus léger que
 * `ScanReport` (qui agrège plusieurs fichiers).
 */
export interface TextScanReport {
  /** Version de l'engine ayant produit le rapport (suit `package.json`). */
  readonly engineVersion: string;
  /** Date ISO 8601 de génération. */
  readonly generatedAt: string;
  /** Durée du scan en millisecondes (mesure CPU côté caller). */
  readonly durationMs: number;
  /** Findings agrégés, triés par position croissante puis par identifiant. */
  readonly findings: readonly Finding[];
}

/** Comparateur stable : `(start, detector)`. Pas de tri par valeur (PII). */
function compareFindings(a: Finding, b: Finding): number {
  if (a.location.start !== b.location.start) {
    return a.location.start - b.location.start;
  }
  if (a.detector !== b.detector) {
    return a.detector < b.detector ? -1 : 1;
  }
  return 0;
}

/**
 * Dé-duplique les findings exactement identiques `(detector, start, end)`.
 * Garde le premier rencontré.
 */
function dedupe(findings: readonly Finding[]): Finding[] {
  const seen = new Set<string>();
  const out: Finding[] = [];
  for (const f of findings) {
    const key = `${f.detector}|${f.location.start}|${f.location.end}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(f);
  }
  return out;
}

/**
 * Applique chaque détecteur sur `text`, agrège, dé-duplique et trie les
 * findings.
 *
 * @param text Texte d'entrée. Pas de limite imposée par cette couche : la
 *   stratégie de découpage est à la charge de la couche supérieure
 *   (`parseFile`, `runWorkers`).
 * @param detectors Liste blanche de détecteurs à appliquer. L'ordre dans le
 *   rapport est trié par position, pas par celui de la liste.
 * @param now Fonction injectable pour les tests (Date.now par défaut).
 */
export function scanText(
  text: string,
  detectors: readonly Detector[],
  now: () => number = Date.now,
): TextScanReport {
  const startedAt = now();
  const aggregate: Finding[] = [];
  for (const detector of detectors) {
    for (const finding of detector.detect(text)) {
      aggregate.push(finding);
    }
  }
  const sorted = dedupe(aggregate).sort(compareFindings);
  const generatedAt = new Date(startedAt).toISOString();
  const durationMs = Math.max(0, now() - startedAt);
  return {
    engineVersion: ENGINE_VERSION,
    generatedAt,
    durationMs,
    findings: sorted,
  };
}

/** Constante de version exposée pour les rapports. */
const ENGINE_VERSION = "0.1.0";
