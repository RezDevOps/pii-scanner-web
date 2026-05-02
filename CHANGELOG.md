# Changelog

Format : [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/), versionnement [SemVer](https://semver.org/lang/fr/).

## [0.4.0] — 2026-05-02

Sprint S4 — **détecteurs étendus + couche d'exports**. Les 12 détecteurs du périmètre v1.0 sont livrés. Le rapport est désormais téléchargeable en JSON (schéma versionné), Markdown (lecture DPO/juriste) et HTML autonome (single-file, CSP stricte, sans script). Découpé du sprint cadrage S4 : ce qui touche au durcissement plate-forme (CSP stricte, audit deps, WCAG AA complet, lazy-loading parseurs binaires) bascule sur S4.1 / `v0.4.1` pour préserver la qualité de chaque livraison (cf. apprentissage S2 → S2.1).

### Ajouts

- `@rezdevops/pii-detectors` — **7 nouveaux détecteurs** :
  - `bic` — BIC ISO 9362 (`BBBBCCLL[BBB]`, 8 ou 11 caractères, code pays vérifié contre la table ISO 3166-1 alpha-2 de 250 codes). Confiance `high`, sévérité `high`. `metadata.institution`, `country`, `location`, `branch?`, `length` exposés.
  - `tva-intracom-fr` — TVA intracommunautaire France, validation par clé MOD 97 sur SIREN (formule DGFiP `clé = (12 + 3 × (SIREN mod 97)) mod 97`). Variante alphanumérique de clé non couverte (limite assumée, < 1 % des cas). Primitive `computeTvaIntracomFrKey(siren)` exportée.
  - `card` — numéro de carte bancaire (PAN), 13 à 19 chiffres avec espaces ou tirets tolérés, validation Luhn + identification de marque par préfixe (Visa, Mastercard série 5 et série 2 `2221-2720`, Amex, Discover, JCB, Diners, UnionPay). Un PAN valide Luhn sans marque connue est rejeté (faux positif probable). Sévérité `critical`. Primitive `detectCardBrand` et type `CardBrand` exportés.
  - `postal-code-fr` — code postal France, plages `01000-95999` ∪ `97000-98999`. Confiance et sévérité `low`. Primitive `isFrenchPostalCode` exportée.
  - `license-plate-fr` — plaque immat France, deux passes : SIV (`AA-123-AA`, lettres `I`/`O`/`U` exclues) en confiance `high`, FNI (`1234 AB 56`) en confiance `medium` avec validation du département (01-95 ∪ 971-976). Plaques diplomatiques / militaires / WW / TT hors périmètre.
  - `date-of-birth` — date au calendrier grégorien strict, 4 formats reconnus (`JJ/MM/AAAA`, `JJ-MM-AAAA`, `JJ.MM.AAAA`, `AAAA-MM-JJ`), gestion bissextiles, année bornée à `[1900, 2100]` (indépendant de l'horloge). Confiance `low` assumée (impossible de distinguer une DDN d'une autre date sans contexte). Primitive `isCalendarDateValid` exportée.
  - `postal-address-fr` — adresse FR (heuristique tête + queue) : numéro + suffixe `bis/ter/quater` toléré + type de voie (~25 reconnus, abréviations incluses) + nom de voie + code postal valide + ville. `metadata.postalCode`, `city?` exposés. Confiance `low` assumée (cadrage § 10 critère 1 documente les faux positifs acceptables sur cette catégorie).
- `@rezdevops/pii-detectors` — table `ISO_3166_ALPHA2` (Set figé, 250 codes) + helper `isIso3166Alpha2` exportés.
- `coreDetectors` étendue de 5 → **12 détecteurs**, ordonnée par criticité décroissante (card → iban → bic → nir → siret → tva-intracom-fr → postal-address-fr → phone-fr → email → license-plate-fr → date-of-birth → postal-code-fr).
- `@rezdevops/pii-scanner-engine` — **couche d'exports** : `toJsonReport`, `toMarkdownReport`, `toHtmlReport`. Schéma JSON versionné via `REPORT_SCHEMA_VERSION` (`"1.0"`). Type `MaskLevel` (`'none' | 'partial' | 'full'`, défaut `partial`) — le masquage s'applique à la frontière de sortie, l'engine garde la valeur brute en interne. Helper pur `maskValue` également exporté.
- HTML autonome — **single-file, zéro `<script>`** (interactivité CSS-only via `:hover` et `:focus-within`), CSP stricte posée en `<meta>` (`default-src 'none'; style-src 'unsafe-inline'`), échappement HTML systématique (anti-XSS testé), mode sombre auto, style imprimable, accessibilité (`tabindex` + `aria-label` sur les valeurs masquées).
- `apps/pii-scanner-web` — barre d'exports dans `psw-report` : 3 boutons `mat-stroked-button` (JSON, Markdown, HTML autonome) avec `mat-icon` et `aria-label` explicite. Logique pure extraite dans `export-actions.ts` (`buildExportPayload`, `triggerDownload`) pour rester testable en happy-dom sans charger Angular Material.
- `docs/exports.md` — documentation détaillée des 3 sérialiseurs (schéma JSON, structure Markdown, contraintes du HTML autonome).
- `docs/detecteurs.md` réécrit avec les 7 nouvelles entrées (algorithme, source normative, exemples positifs/négatifs, edge cases, faux positifs connus, limites assumées).

### Modifications

- `@rezdevops/pii-detectors` bumpé `0.1.0` → `0.2.0` (ajout de 7 détecteurs + 5 primitives publiques + table ISO 3166). Aucune rupture d'API : la surface S1 est inchangée, `coreDetectors` est étendue.
- `@rezdevops/pii-scanner-engine` bumpé `0.3.0` → `0.4.0` (ajout de la couche d'exports + 6 entrées dans la surface publique). Aucune rupture.
- App `pii-scanner-web` bumpée `0.3.0` → `0.4.0` (boutons d'exports + dépendance MatButtonModule).
- Constante `VERSION` alignée dans les deux packages, `ENGINE_VERSION` mise à jour.
- README — section « Statut » mise à jour, table roadmap actualisée (S4 ✅, ajout d'une ligne S4.1).

### Notes

- Tag repo `v0.4.0` reflète la livraison principale (engine + détecteurs côté lib, app côté UI).
- Le `DetectorId` `siren` reste déclaré dans `types.ts` mais sans implémentation : un SIREN nu (9 chiffres + Luhn) génère trop de faux positifs sans contexte. Couverture future via détecteur composite SIREN-en-contexte (post-v1).
- L'audit dépendances, la CSP stricte côté SPA, l'audit WCAG AA complet et le lazy-loading des parseurs binaires (`xlsx` ~250 ko, `pdf.js` ~600 ko, `mammoth` ~80 ko) basculent sur S4.1 pour ne pas dégrader la qualité de la livraison v0.4.0. Bundle initial reste à ~1.97 Mo en attendant.

## [0.3.0] — 2026-05-02

Sprint S3 — **interface Angular** branchée sur l'engine. Première version utilisable de bout en bout : on dépose des fichiers, ils sont scannés en arrière-plan dans un pool de Web Workers, le rapport s'affiche en table filtrable. Rien ne sort du navigateur — la promesse souveraineté tient au runtime.

### Ajouts

- `pii-scanner-web` (app Angular 20) — coquille S0 remplacée par une vraie UI. Trois composants standalone : `psw-drop-zone` (drag & drop + bouton + clavier, `mat-card`), `psw-file-queue` (état par fichier + barre de progression globale et par-fichier, `mat-progress-bar`), `psw-report` (récap par catégorie en `mat-chip-set`, filtres par fichier / détecteur / sévérité, table `mat-table` triable). Toolbar `mat-toolbar` + snack-bar pour les rejets.
- `ScanService` (`@Injectable` providedIn root) : signals `queue`, `isScanning`, `progress`, `report`, `findings` (computed). API `scan(files)` / `reset()` / `configureWorkerFactory(factory)`. Dispose le runner sur destroy. Pas de RxJS — on reste cohérent avec le « zero-RxJS » de l'engine (cadrage § 6.2).
- `@rezdevops/pii-scanner-engine` — fonction `createDefaultScanWorker()` exportée depuis `index.ts` : crée un `Worker` via `new URL("./scan-worker.js", import.meta.url)` résolu **dans le contexte de l'engine**. L'app n'a plus à connaître la structure `dist/`. Sub-export `./worker` ajouté pour les bundlers qui préfèrent la résolution explicite.
- Thème Material M3 personnalisé dans `styles.scss` (palette azure/blue, density `-1`). Variables CSS `--psw-sev-*` pour les couleurs de sévérité PII (alignement Brand Bible). Utilitaire `.psw-mask` (blur + reveal hover/focus) pour ne jamais réimprimer une PII en clair par défaut dans la table.
- 18 tests Vitest côté app : `validateFiles` (drop-zone, 6 cases), `applyFilters` (rapport, 5 cases), `ScanService` (orchestration, 7 cases — utilise `MainThreadRunner` en happy-dom). Logique pure extraite dans `drop-zone.utils.ts` / `report.utils.ts` pour pouvoir tester sans charger Angular Material dans Vitest (limite JIT compiler signalée par Angular 20).

### Modifications

- `@rezdevops/pii-scanner-engine` bumpé à `0.3.0` (ajout d'API publique : `createDefaultScanWorker`, sub-export `/worker`). `pii-detectors` reste à `0.1.0` (aucun changement). App `pii-scanner-web` passe de `0.0.0` à `0.3.0`.
- `angular.json` : `allowedCommonJsDependencies` étendu à `mammoth`. Budgets relevés à `2.5mb` warning / `3mb` erreur (la cible bundle de v0.4 sera réduite par tree-shaking + lazy-loading PDF.js, hors-scope S3).
- Pipeline locale étendue à 3 packages : `apps/pii-scanner-web` reçoit `vitest.config.ts` et `tsconfig.test.json` alignés sur ceux de l'engine. Le script `lint` de l'app utilise `tsc --noEmit` (pas d'ESLint, idem packages).

### Notes

- Le `WorkerPoolRunner` est branché par défaut quand `Worker` est disponible. Sinon (Node, certains tests), fallback transparent sur `MainThreadRunner` — l'UI reste fonctionnelle, juste monothread.
- Bundle initial v0.3.0 ≈ 1.97 Mo (468 ko transfert) : Material + PDF.js + mammoth + xlsx. La réduction est planifiée S4 (lazy-loading des parseurs binaires).
- La page « Comment vérifier la souveraineté » et les exports JSON / Markdown / HTML restent prévus pour S4.

## [0.2.1] — 2026-05-02

Sprint S2.1 — activation des **4 parseurs binaires** reportés depuis `v0.2.0` : XLSX/XLS via SheetJS, PDF via PDF.js, DOCX via mammoth, HTML via `DOMParser` natif. Les 10 formats déclarés dans `FileFormat` sont désormais activement parsés. Une ADR par dépendance ajoutée. La surface d'API publique de l'engine n'a pas changé : la façade `runScan(File[])` route automatiquement vers le parseur approprié.

### Ajouts

- `@rezdevops/pii-scanner-engine` — `htmlParser` (zéro dépendance, basé sur `DOMParser`). Parcourt le DOM en pré-ordre, ignore `<script>` / `<style>` / `<noscript>` / `<template>`, filtre les nœuds purement blancs (indentation HTML), produit un path lisible `body > main > p[2]` avec indexation 1-based uniquement quand un tag a plusieurs frères.
- `@rezdevops/pii-scanner-engine` — `docxParser` via **mammoth** (`extractRawText({ arrayBuffer })`). Émet un chunk par paragraphe non-vide, path = `paragraph[N]`, line = N. Pas de styles, pas d'images. Voir [ADR 0004](docs/adr/0004-mammoth-pour-docx.md).
- `@rezdevops/pii-scanner-engine` — `xlsxParser` et `xlsParser` via **SheetJS Community Edition** (`xlsx` sur npm). Itère feuilles → lignes → cellules, path = `Sheet!Address` (notation Excel native), `cellDates: true` pour les dates en `Date` natif. Voir [ADR 0005](docs/adr/0005-sheetjs-pour-xlsx.md).
- `@rezdevops/pii-scanner-engine` — `pdfParser` via **PDF.js** (`pdfjs-dist`, build legacy). Extrait le texte page par page via `getTextContent()`, path = `page[N]`. Configuration sécuritaire : `isEvalSupported: false`, `disableFontFace: true`, `useSystemFonts: false`, `workerSrc = ""` (monothread interne). **Pas d'OCR** (cf. cadrage § 4.6, repoussé en `v1.1`). Voir [ADR 0006](docs/adr/0006-pdfjs-pour-pdf.md).
- Fixtures binaires partagées dans `src/parsers/__fixtures__/binary-fixtures.ts` (.docx, .xlsx, .pdf inlinés en base64, sans fichier binaire dans le repo). Générées une fois via Python (`zipfile` pour DOCX, `openpyxl` pour XLSX, `reportlab` pour PDF).
- Constante `ACTIVE_FORMATS` exportée (10 entrées : 5 texte + 5 binaires).
- Test d'intégration end-to-end de la façade `runScan` sur un .docx réel, validant la pile `detectFormat → docxParser → MainThreadRunner → enrichissement findings`.

### Modifications

- `ParserInput` et `ScanInputFile` étendus avec `arrayBuffer(): Promise<ArrayBuffer>` (compat directe avec `Blob`/`File` du DOM, requis par les parseurs binaires). `text()` reste utilisé par les parseurs texte et HTML.
- `EXTENSION_MAP` de `format.ts` simplifié : tous les formats sont actifs, plus de bifurcation `deferred`. Les classes `DeferredFormatError` et le code d'erreur `deferred-format` restent exportés (rétrocompat) mais ne sont plus émis.
- Dépendances ajoutées à `@rezdevops/pii-scanner-engine` : `mammoth ^1.8.0`, `pdfjs-dist ^4.7.76`, `xlsx ^0.18.5`. Toutes sous licence permissive (BSD-2 ou Apache 2.0), compatibles AGPL.
- `engineVersion` bumpé à `0.2.1`. `pii-detectors` reste à `0.1.0` (aucun code modifié dans la lib pure).
- README + `docs/architecture.md` + `docs/comment-verifier-souverainete.md` mis à jour pour refléter les 10 formats actifs et les configurations sécuritaires PDF.js.
- `.gitignore` enrichi pour ne plus laisser entrer les brouillons `COMMIT_MSG*.txt` et `_tmp_*` (artefacts de tooling local).

### Notes

- Coût bundle navigateur : ~1 Mo gzippé en plus par rapport à v0.2.0 (`mammoth ~150 ko + xlsx ~250 ko + pdfjs-dist ~600 ko`). Acceptable pour la cible (DPO/RSSI scannant des dossiers complets ; le coût est amorti dès le 1ᵉʳ fichier). Trade-off documenté dans `docs/architecture.md`.
- Les ADRs 0004 / 0005 / 0006 documentent les alternatives écartées (parseur XML maison, ExcelJS, pdf-parse) et les justifications retenues.

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
