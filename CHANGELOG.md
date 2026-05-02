# Changelog

Format : [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/), versionnement [SemVer](https://semver.org/lang/fr/).

## [0.1.0] — 2026-05-02

Premier tag publiable. Couche détecteurs cœur opérationnelle, engine minimal câblé, batterie de tests verte sur Node 20 et Node 22.

### Ajouts

- `@rezdevops/pii-detectors` — 5 détecteurs cœur : `email`, `phone-fr`, `nir`, `iban`, `siret`. Trois validés par clé de contrôle (NIR via formule officielle 97 − N mod 97 avec gestion Corse 2A/2B, IBAN via MOD 97 ISO 13616 sur ~90 pays, SIRET via Luhn avec dérogation La Poste documentée).
- `@rezdevops/pii-detectors` — primitives de validation par clé exposées : `isLuhnValid`, `isIbanMod97Valid`, `validateNir`, `isNirKeyValid`. Constante `coreDetectors` figée listant les 5 détecteurs.
- `@rezdevops/pii-scanner-engine` — `scanText(text, detectors[]): TextScanReport` qui agrège, dé-duplique et trie les findings par position. Chronométrage et horloge injectable pour les tests.
- Vitest 2.x configuré dans les deux packages publishables, scripts `test` / `test:watch`, `tsconfig.test.json` pour la vérification stricte des `.spec.ts`. Alias `@rezdevops/pii-detectors` → source TS dans la config Vitest de l'engine (pas besoin de build entre packages pour les tests).
- `docs/detecteurs.md` étoffé : une entrée détaillée par détecteur (algorithme, source normative, exemples positifs et négatifs, edge cases) + tableau récapitulatif.
- 65 tests unitaires (60 pour pii-detectors, 5 pour pii-scanner-engine), tous verts en local et sur CI Node 20 / 22.

### Corrections

- Aucune régression S0 → S1.

## [Non publié]

À venir en S2 (parsage CSV + premier rendu UI).

---

## [0.0.0] — 2026-05-01 (S0)

Initialisation du monorepo, non publiée sur npm.

### Ajouts

- Squelette du monorepo : packages `@rezdevops/pii-detectors` et `@rezdevops/pii-scanner-engine`, application Angular `pii-scanner-web`.
- Configuration TypeScript stricte (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`).
- ADRs initiales : 0001 Angular Material, 0002 Licence AGPL-3.0, 0003 Comlink (provisoire, à confirmer S2).
- CSP stricte dans `index.html` (`default-src 'self'; connect-src 'none'; ...`).
- Workflow GitHub Actions : lint, tests, build sur push et PR.
- Workflow GitHub Pages en stub (déclenchement manuel uniquement tant que la SPA n'a pas de contenu).
- Politique fixtures de test (synthétiques, déterministes, jamais de données réelles).

### Corrections

- TypeScript devDependency : `~5.6.0` → `~5.9.0` pour satisfaire la contrainte du compilateur Angular 20.3 (`>=5.8.0 <6.0.0`).
- Ajout d'une `pnpm.overrides` forçant `uuid: ^11.0.0` partout dans l'arbre, pour neutraliser un `uuid@8.3.2` deprecated remonté en transitive.
