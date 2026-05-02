# Changelog

Format : [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/), versionnement [SemVer](https://semver.org/lang/fr/).

## [0.2.0] — 2026-05-02

Couche engine effective : façade multi-fichiers, parseurs texte, pool de Web Workers Comlink. Décision de scope : seuls les **5 parseurs texte** (CSV, TSV, TXT, MD, JSON) sont actifs dans cette version ; les **4 parseurs binaires** (XLSX, PDF, DOCX, HTML) — déjà déclarés dans l'API publique `FileFormat` — arrivent en `v0.2.1`. Justification dans le cadrage § 9 (changelog v0.2) : tenir le garde-fou anti-dérive plutôt qu'embarquer SheetJS + PDF.js + mammoth dans une livraison bâclée.

### Ajouts

- `@rezdevops/pii-scanner-engine` — façade `runScan(File[]): Promise<ScanReport>` et `runScanStream(): AsyncIterable<ScanProgress>`. Pas de RxJS dans l'engine (préservation du « sans Angular » du cadrage § 6.2) ; l'app Angular wrappera en S3.
- Détection de format : `detectFormat()` (throw) et `tryDetectFormat()` (résultat structuré). Distingue `unsupported-format` (extension inconnue) et `deferred-format` (XLSX/PDF/DOCX/HTML, message « v0.2.1 »).
- 5 parseurs texte sous contrat unifié `FileParser` produisant `AsyncIterable<TextChunk>` :
  - `csvParser` / `tsvParser` (PapaParse, `header: true`, message d'erreur localisé sur les CSV mal formés).
  - `txtParser` / `mdParser` (passthrough ligne-par-ligne, normalisation CRLF).
  - `jsonParser` (parcours récursif itératif, supporte 200+ niveaux d'imbrication, notation `$.user.email` et `$["user-id"]` pour les chemins).
- Abstraction `Runner` (`runScanText` + `dispose`) avec deux implémentations :
  - `MainThreadRunner` — défaut. Aucune sérialisation, toujours dispo (Node, navigateur, CLI).
  - `WorkerPoolRunner` — pool Comlink dimensionné sur `navigator.hardwareConcurrency` (capé à 8), file FIFO, `dispose()` idempotent rejetant la file en cours. Le caller fournit la `workerFactory` (pas d'`import.meta.url` codé en dur).
- Worker dédié `dist/worker/scan-worker.js` exposant `ScanWorkerApi` via `Comlink.expose`. À utiliser depuis l'app S3 avec `new Worker(new URL(..., import.meta.url), { type: "module" })`.
- ADR 0003 (Comlink) confirmée _accepted_ — l'abstraction `Runner` garantit la réversibilité documentée si un profilage S3 motivait un retour à `postMessage` natif.
- happy-dom 15.x ajouté en devDep, activé ponctuellement par fichier de test (`// @vitest-environment happy-dom`) pour les specs touchant `File` / `Blob` / `crypto.randomUUID`. Les tests purs restent en env Node (~3× plus rapides).
- Code d'erreur normalisé `ScanErrorCode` (`unsupported-format`, `deferred-format`, `parser-error`, `runner-error`) émis dans les évènements `file-failed` du stream, pour permettre à l'UI S3 de router les messages.
- 60 tests dans `pii-scanner-engine` (vs 5 en S1 : +55) — couverture format / parseurs / runners / façade y compris cas d'échec en cours de scan.
- Configuration Angular : `allowedCommonJsDependencies: ["papaparse"]` dans `angular.json` pour silencer le warning CJS-bailout sans masquer les futurs.

### Modifications

- `engineVersion` est désormais centralisé dans `src/version.ts` (source unique). `scanText` et `runScan` lisent la même constante. Les deux packages publishables passent à `0.2.0`.
- `src/index.ts` repensé : `FileFormat` / `FileScanResult` / `ScanReport` migrés depuis `index.ts` vers `src/types.ts` + un nouveau `ScanProgress`. Re-export complet préservé pour les consommateurs.
- `docs/architecture.md` réécrit pour refléter la couche `Runner` et le flux v0.2.0 (était au statut « esquisse S0 »).
- `docs/comment-verifier-souverainete.md` enrichi d'une étape « onglet Sources / Workers DevTools », activable dès S3.

### Reportés (v0.2.1)

- Parseurs binaires : XLSX (SheetJS), PDF (PDF.js, texte uniquement), DOCX (mammoth), HTML (DOMParser natif). Chacun fera l'objet d'une ADR dédiée (taille bundle, dep transitives, licence).
- Streaming `File.stream()` pour PapaParse (true streaming sur fichiers 100 Mo+) — à réévaluer après profilage S3.

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
