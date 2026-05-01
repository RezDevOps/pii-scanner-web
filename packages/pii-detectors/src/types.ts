/**
 * Types publics du package `@rezdevops/pii-detectors`.
 *
 * Stable dès la `v0.1.0`. Toute modification rétro-incompatible passe par un
 * bump majeur et un addendum au cadrage `12_PII_SCANNER_WEB_CADRAGE.md` § 4.
 */

/**
 * Identifiant canonique d'un détecteur. Énuméré ici pour bénéficier de
 * l'autocomplétion et empêcher les fautes de frappe côté appelant.
 */
export type DetectorId =
  | "email"
  | "phone-fr"
  | "nir"
  | "siret"
  | "siren"
  | "tva-intracom-fr"
  | "iban"
  | "bic"
  | "card"
  | "postal-code-fr"
  | "postal-address-fr"
  | "license-plate-fr"
  | "date-of-birth";

/**
 * Sévérité par défaut associée à un *finding*. Indicative — le rapport final
 * peut la moduler en fonction du contexte (par exemple un IBAN dans un fichier
 * RH versus un IBAN dans un export comptable légitime).
 */
export type Severity = "critical" | "high" | "medium" | "low";

/**
 * Confiance attribuée à un *finding*. `high` quand une clé de contrôle valide
 * (Luhn, MOD 97, formule NIR) ; `medium` pour les heuristiques contextuelles
 * (adresse postale, date de naissance) ; `low` quand le format matche seul.
 */
export type Confidence = "high" | "medium" | "low";

/**
 * Localisation textuelle d'un *finding* dans le contenu scanné. Les
 * coordonnées sont exprimées en *code units* JavaScript (UTF-16) — cohérentes
 * avec `String.prototype.length`.
 */
export interface Location {
  /** Index 0-based du premier caractère du *match*. */
  readonly start: number;
  /** Index 0-based du caractère suivant le dernier caractère du *match*. */
  readonly end: number;
  /** Numéro de ligne 1-based, si la source est ligne par ligne (CSV, TXT). */
  readonly line?: number;
  /** Numéro de colonne 1-based, si applicable. */
  readonly column?: number;
}

/**
 * Résultat d'une détection. Volontairement minimal : la couche d'orchestration
 * (`@rezdevops/pii-scanner-engine`) enrichit avec le fichier source, le
 * contexte agrandi et la sévérité finale.
 */
export interface Finding {
  /** Identifiant du détecteur ayant produit le *finding*. */
  readonly detector: DetectorId;
  /** Valeur brute détectée (à masquer côté UI par défaut). */
  readonly value: string;
  /** Position dans la chaîne d'entrée. */
  readonly location: Location;
  /** Confiance de la détection. */
  readonly confidence: Confidence;
  /** Sévérité par défaut (peut être surchargée par la couche supérieure). */
  readonly severity: Severity;
  /** Métadonnées spécifiques au détecteur (ex. `cardBrand: 'visa'`). */
  readonly metadata?: Readonly<Record<string, string | number | boolean>>;
}

/**
 * Contrat d'un détecteur. Implémentation pure : pas d'I/O, pas de DOM, pas
 * d'état partagé entre les appels.
 */
export interface Detector {
  /** Identifiant canonique. */
  readonly id: DetectorId;
  /** Description courte affichée dans les rapports. */
  readonly label: string;
  /** Référence normative ou réglementaire que le détecteur applique. */
  readonly source: string;
  /**
   * Scanne une chaîne et retourne les *findings* trouvés. Doit être pure et
   * idempotente : `detect(s) === detect(s)` (à l'égalité structurelle près)
   * pour toute entrée `s`.
   */
  detect(text: string): readonly Finding[];
}

/**
 * Options de l'API publique `detect()`. La sélection des détecteurs est
 * obligatoire pour éviter les surprises côté appelant : un futur ajout de
 * détecteur ne déclenchera jamais d'effet de bord chez les consommateurs.
 */
export interface DetectOptions {
  /** Liste blanche des détecteurs à exécuter. Aucune valeur par défaut. */
  readonly detectors: readonly DetectorId[];
}
