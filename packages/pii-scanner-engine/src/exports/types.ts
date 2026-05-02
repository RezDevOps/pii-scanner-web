/**
 * Types publics de la couche d'exports (`@rezdevops/pii-scanner-engine`).
 *
 * Stable depuis `v0.4.0`. Trois formats supportés :
 *  - JSON : schéma versionné, exploitable par un autre outil ou un futur
 *    back-office RezDevOps.
 *  - Markdown : lisible par un dirigeant non-tech, avec verdict global,
 *    synthèse par fichier, tableau récapitulatif (cadrage § 4.3).
 *  - HTML autonome : single-file, CSS inliné, valeurs sensibles masquées
 *    par défaut, imprimable. Destiné à l'archivage du rapport sans
 *    dépendance externe.
 */

/**
 * Schéma JSON courant. Exposé comme constante pour traçabilité.
 *
 * Évolutions à venir :
 *  - 1.0 : structure initiale (v0.4.0).
 *  - 1.1 : ajoutera `errors[]` quand l'engine exposera les `file-failed`
 *    dans le `ScanReport` (post-v0.4).
 */
export const REPORT_SCHEMA_VERSION = "1.0" as const;

/**
 * Niveau de masquage des valeurs sensibles dans les exports.
 *
 * - `none` : valeurs en clair (export pour usage technique interne).
 * - `partial` : seuls les 4 derniers caractères visibles (ex. `**** **** **** 4242`).
 * - `full` : valeurs entièrement masquées par `***` (par défaut, pour
 *   archivage / partage).
 */
export type MaskLevel = "none" | "partial" | "full";

/**
 * Options communes aux trois exports.
 */
export interface ExportOptions {
  /** Niveau de masquage des valeurs. Défaut : `partial`. */
  readonly mask?: MaskLevel;
}

/**
 * Options spécifiques au HTML autonome.
 */
export interface HtmlExportOptions extends ExportOptions {
  /** Titre injecté dans `<title>` et `<h1>`. Défaut : `"Rapport PII"`. */
  readonly title?: string;
  /** Locale d'affichage des dates. Défaut : `"fr-FR"`. */
  readonly locale?: string;
}
