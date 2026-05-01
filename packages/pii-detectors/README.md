# @rezdevops/pii-detectors

Détecteurs déterministes de données à caractère personnel (PII) pour le contexte français. Bibliothèque pure : aucune I/O, aucun DOM, aucune dépendance Angular ou Node. Tout détecteur prend une chaîne (ou un flux de chaînes) et émet un flux de _findings_ typés.

> **Statut : pré-v0.1.0.** Le squelette est posé en sprint S0 du projet [`pii-scanner-web`](https://github.com/RezDevOps/pii-scanner-web). Les 5 détecteurs cœur (email, téléphone FR, NIR, IBAN, SIRET) arrivent en S1 — tag `v0.1.0` du monorepo.

## Pourquoi une lib séparée

Trois raisons :

1. **Réutilisabilité hors web.** Un futur CLI Node, un binaire Tauri ou un script de pré-commit pourra l'embarquer sans tirer Angular. La logique de détection est indépendante de la couche d'orchestration et de l'UI.
2. **Surface de tests claire.** Chaque détecteur est unitairement testable avec des fixtures positives et négatives. Pas de mock DOM, pas de polyfill, pas d'environnement Angular.
3. **Auditabilité.** Un DPO ou un développeur tiers peut lire le code des détecteurs sans naviguer dans une SPA.

## Détecteurs prévus en v1.0

| Détecteur          | Validation                             | Confiance type              | Sévérité par défaut |
| ------------------ | -------------------------------------- | --------------------------- | ------------------- |
| Email              | RFC 5322 simplifiée                    | haute                       | moyenne             |
| Téléphone FR       | Format `0X XX XX XX XX` / `+33 X...`   | haute                       | moyenne             |
| NIR                | Clé MOD 97 (formule officielle INSEE)  | très haute si clé valide    | **critique**        |
| SIRET / SIREN      | Luhn (sauf cas La Poste)               | haute                       | moyenne             |
| TVA intracom FR    | Luhn sur SIREN                         | haute                       | moyenne             |
| IBAN               | MOD 97, longueur par pays              | très haute si MOD 97 valide | **critique**        |
| BIC / SWIFT        | ISO 9362                               | moyenne                     | moyenne             |
| Carte bancaire     | Luhn, identification émetteur          | haute                       | **critique**        |
| Code postal FR     | Plage 01000-98890                      | haute                       | basse               |
| Adresse postale FR | Heuristique contextuelle               | moyenne                     | moyenne             |
| Plaque immat. FR   | SIV depuis 2009 + ancien format        | haute                       | moyenne             |
| Date de naissance  | Date + en-tête de colonne contextuelle | moyenne                     | moyenne             |

Le détail des algorithmes, des sources normatives et des exemples positifs/négatifs est consolidé dans [`docs/detecteurs.md`](../../docs/detecteurs.md) du monorepo.

## API publique (cible)

```ts
import {
  detect,
  type Finding,
  type Detector,
  Severity,
} from "@rezdevops/pii-detectors";

const findings: Finding[] = detect(text, {
  detectors: ["email", "iban", "nir"],
});
```

Les types `Finding`, `Detector`, `Severity` et `Confidence` sont stables dès `v0.1.0` (semver).

## Licence

[AGPL-3.0-only](../../LICENSE). Si vous embarquez cette lib dans un service réseau, l'AGPL impose la publication du code modifié auprès de vos utilisateurs. C'est volontaire — voir [`docs/adr/0002-licence-agpl.md`](../../docs/adr/0002-licence-agpl.md) du monorepo.

## Auteur

Rudy Rezaire — RezDevOps.
