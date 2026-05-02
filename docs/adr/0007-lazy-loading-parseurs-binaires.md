# ADR 0007 — Lazy-loading des parseurs binaires via `import()` dynamique

- **Statut** : **accepted**
- **Date** : 2026-05-02 (sprint S4.1)
- **Décideurs** : Rudy Rezaire (RezDevOps)
- **Contexte** : sprint S4.1 « durcissement plate-forme » — réduction du bundle initial du SPA

## Contexte

La fin du sprint S3 (release `v0.3.0`, 2026-05-02) a livré l'app Angular avec branchement effectif des trois parseurs binaires (`xlsx`, `pdfjs-dist`, `mammoth`). Les budgets Angular avaient été relevés à `2.5 Mo / 3 Mo` (warning / error) pour le bundle initial — mesure réelle ~1.97 Mo.

Cette taille est acceptable mais sous-optimale :

- Un utilisateur qui ne scanne que des `.csv` ou `.txt` paye le coût de chargement de PDF.js (~600 ko gzip) et SheetJS (~250 ko gzip) sans bénéfice.
- La promesse « scanner local » devient moins crédible quand l'app met 4-5 s à se charger sur 4G.
- Le futur OCR Tesseract (v1.1) ajoutera ~3 Mo supplémentaires — la dette de bundle devient critique si on ne lazy-load pas.

Trois approches étudiées :

1. **`import()` dynamique au sein de chaque parseur binaire**, avec cache module-level. La signature publique `FileParser` reste synchrone vis-à-vis du caller (le `await` est interne à `parse()`).
2. **Sub-exports `./parsers/xlsx`, `./parsers/pdf`, `./parsers/docx`** dans `package.json exports`. L'app importe explicitement ce qu'elle utilise — mais casse `runScan()` qui auto-détecte le format.
3. **Lazy uniquement côté Angular** (`loadChildren` sur la route `/scan`). Le module engine reste statique mais le SPA charge la page de scan en lazy. Bénéfice limité : les parseurs sont chargés dès qu'on entre la route, c'est-à-dire dès qu'on charge l'app (qui n'a qu'une route).

## Décision

**Approche 1 retenue** : `import()` dynamique au sein de chaque parseur binaire, cache module-level. Pas de modification de l'API publique de l'engine.

## Justification

- **Aucune rupture d'API.** `xlsxParser`, `pdfParser`, `docxParser` restent des `FileParser` synchrones du point de vue du caller. `getParserForFormat`, `runScan`, `runScanStream`, `parsers/index.ts` — tous inchangés. Les tests existants passent sans modification.
- **Granularité optimale.** Chaque parseur est responsable de charger sa dépendance. Si demain on remplace SheetJS par `@e965/xlsx` (cf. `docs/audit-dependances-v0.4.1.md` plan v1.0), le swap est local au fichier `xlsx-parser.ts`.
- **Cache module-level.** La promesse `loadXlsxModule()` est mise en cache dans une variable du module ; un second appel à `parse()` réutilise la même instance. Pas de re-import inutile.
- **Bundle splitting natif Vite/esbuild.** Le bundler du builder Angular (`@angular-devkit/build-angular` v20+) détecte les `import()` dynamiques et émet automatiquement des chunks séparés. Aucune config supplémentaire requise.
- **Pré-chargement opt-in.** Trois fonctions `preloadXlsxParser()`, `preloadDocxParser()`, `preloadPdfParser()` exportées permettent à l'UI de déclencher un chargement en arrière-plan (au survol d'un bouton, par exemple) — UX plus rapide pour les utilisateurs qui s'apprêtent à scanner un format binaire spécifique.

## Conséquences

- **Bundle initial réduit.** PDF.js (~600 ko gzip), SheetJS (~250 ko gzip) et mammoth (~80 ko gzip) ne pèsent plus dans le bundle initial. Mesure attendue : passage de ~1.97 Mo à **< 1 Mo** (cible cadrage § 6.3).
- **Premier scan d'un format binaire = légère latence supplémentaire** (téléchargement du chunk + parsing du module). Mitigation : `preload*Parser()` au survol d'une icône « importer un PDF » dans une UI v0.5+. Pour v0.4.1, on accepte la latence (mesurée 100-300 ms sur 4G — invisible vs. le scan lui-même).
- **CSP `script-src` doit accepter le chargement de chunks même-origine.** Déjà géré : `script-src 'self' 'wasm-unsafe-eval'` autorise les chunks servis depuis le SPA.
- **Worker `scan-worker.ts` non impacté.** Le worker fait du `scanText` (pas de parsing), il ne charge pas les parseurs binaires. Le pool reste branché en S3.
- **Tests Vitest non impactés.** Les specs `xlsx-parser.spec.ts`, `pdf-parser.spec.ts`, `docx-parser.spec.ts` consomment `xlsxParser.parse()` qui en interne fait l'`import()`. happy-dom + Node fournissent `import()` natif. Confirmé : 124 tests engine verts au premier passage S4.1.

## Alternatives écartées

### 2 — Sub-exports `./parsers/xlsx`, `./parsers/pdf`, `./parsers/docx`

Casserait `runScan()` qui auto-détecte le format et choisit le parseur via `PARSER_BY_FORMAT`. Le caller devrait connaître les formats à l'avance, importer manuellement, et fournir la map au moteur. Trop verbose pour le bénéfice (équivalent à l'approche 1 côté bundle, mais avec rupture d'API).

### 3 — Lazy uniquement côté Angular (`loadChildren`)

Bénéfice nul tant que l'app n'a qu'une route `/scan` (le bundle de la route est chargé immédiatement). Pertinent en v0.5+ si on ajoute des routes `/about`, `/changelog`, `/skills`, etc.

## Liens

- Code : `packages/pii-scanner-engine/src/parsers/{xlsx,pdf,docx}-parser.ts` (commit S4.1).
- Audit dépendances : `docs/audit-dependances-v0.4.1.md`.
- ADRs liées :
  - 0003 (Comlink) — la séparation worker/main thread reste valable, le pool ne charge pas les parseurs binaires.
  - 0004 (mammoth), 0005 (SheetJS), 0006 (PDF.js) — les choix de dépendances sont conservés.
- Issue de référence : (à créer si besoin de tracer le bénéfice mesuré post-release).
