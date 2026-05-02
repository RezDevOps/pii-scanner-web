/**
 * Contrat des parseurs de fichier — convertissent un `Blob`/`File` en
 * flux de fragments de texte (`TextChunk`) que la couche détecteurs
 * peut scanner.
 *
 * Le contrat est volontairement minimal :
 * - Pas de logique de scan dans le parseur (séparation des responsabilités).
 * - Pas de mutation du contenu (preserve `value` brut tel que lu).
 * - Streaming via `AsyncIterable` : aucune limite de taille imposée par le
 *   contrat (CSV de plusieurs centaines de Mo doivent passer).
 */
import type { FileFormat } from "../types.js";

/**
 * Fragment de texte produit par un parseur. Porte sa coordonnée native
 * (ligne / colonne / chemin) pour que les findings puissent référencer
 * une localisation utile à l'humain (« champ `email`, ligne 42 »).
 */
export interface TextChunk {
  /** Texte du fragment, à passer tel quel à `scanText`. */
  readonly text: string;
  /**
   * Numéro de ligne 1-based dans le fichier source. Utilisé par les
   * parseurs ligne-par-ligne (CSV, TXT). Absent pour les parseurs
   * structurés non-textuels (JSON), où `path` prend le relais.
   */
  readonly line?: number;
  /**
   * Nom de colonne (CSV avec header) ou chemin de propriété (JSON, ex.
   * `users[3].email`). Optionnel : un parseur passthrough (TXT/MD) n'en
   * fournit pas.
   */
  readonly path?: string;
}

/**
 * Source minimale dont a besoin un parseur. Sous-ensemble compatible avec
 * `File` (DOM) et avec un objet synthétique fabriqué côté CLI/test.
 *
 * Volontairement restreint à ce qu'on consomme réellement (`text()`,
 * `name`, `size`) pour ne pas interdire les implémentations alternatives.
 */
export interface ParserInput {
  readonly name: string;
  readonly size: number;
  /** Lit l'intégralité du contenu en chaîne UTF-8. Conforme à `Blob.text()`. */
  text(): Promise<string>;
}

/**
 * Contrat d'un parseur. Une instance par format.
 */
export interface FileParser {
  /** Format géré par ce parseur. */
  readonly format: FileFormat;
  /**
   * Convertit le fichier en flux de `TextChunk`. Le générateur est
   * consommé par la façade `runScan` qui dispatche chaque chunk vers le
   * `Runner` (main-thread ou worker pool).
   */
  parse(input: ParserInput): AsyncIterable<TextChunk>;
}
