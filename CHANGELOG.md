# Changelog

Format : [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/), versionnement [SemVer](https://semver.org/lang/fr/).

## [1.0.4] — 2026-05-02

Sprint S5.4 — **hotfix cosign image name**. Aucun changement fonctionnel : 12 détecteurs, 10 formats et 4 exports strictement identiques à `v1.0.3`. Cette release rejoue le pipeline de distribution `v1.0` pour produire enfin l'image Docker GHCR signée cosign keyless et la GitHub Release agrégée, qui restaient absentes en `v1.0.3` à cause d'un mismatch de casse dans le nom de l'image.

### Corrections

- **`.github/workflows/release.yml` — variable `env.IMAGE_NAME`** : remplacement de `ghcr.io/${{ github.repository_owner }}/pii-scanner-web` (qui retournait `ghcr.io/RezDevOps/pii-scanner-web` en CamelCase) par `ghcr.io/rezdevops/pii-scanner-web` hard-codé en lowercase. Bug corrigé : la spec OCI/Docker (distribution-spec § grammar) impose des noms de repository en minuscules. Le client Docker classique normalise silencieusement les majuscules, et GHCR accepte le push avec n'importe quelle casse côté input. En revanche, `cosign sign` et `cosign verify` utilisent `go-containerregistry` (lib Go officielle de Google) qui est strict et refuse toute majuscule avec « parsing reference: could not parse reference ». En `v1.0.3`, le step `Build & push image` réussissait mais le step `Sign image (keyless)` qui suivait plantait sur `Error: signing [...]: parsing reference: could not parse reference: ghcr.io/RezDevOps/pii-scanner-web@sha256:c6dfe48...`. Conséquence : image multi-arch publiée sur GHCR mais non signée, job `build-docker` rouge, et le job `release` final qui dépendait de `build-docker` ne s'exécutait pas. Le fix corrige aussi les commandes `cosign verify` documentées dans le body de chaque GitHub Release (que le user pouvait jusqu'ici copier-coller à perte). Hard-codage retenu plutôt qu'un step de lowercase dynamique parce que (a) l'organisation GitHub `RezDevOps` est stable, (b) c'est une seule ligne contre 4-5 lignes de calcul, (c) un commentaire bloc rappelle l'invariant et la procédure si l'org change un jour.

### Modifications

- **`packages/pii-detectors/package.json`** — bumpé `1.0.3` → `1.0.4`.
- **`packages/pii-scanner-engine/package.json`** — bumpé `1.0.3` → `1.0.4`.
- **`apps/pii-scanner-web/package.json`** — bumpé `1.0.3` → `1.0.4`.
- **Constantes `DETECTORS_VERSION` et `ENGINE_VERSION`** alignées à `1.0.4`.
- **`README.md` — table roadmap** : ligne « S5.4 — Hotfix cosign image name » ajoutée.

### Notes

- **Pas de re-tag de `v1.0.3`.** L'immutabilité du tag est préservée. Les autres jobs de la release `v1.0.3` (publish-npm, build-zip, build-sbom, deploy-pages) ayant tous réussi, les artefacts `1.0.3` restent disponibles côté npm / GitHub Pages / SBOM. Seuls l'image Docker signée et la GH Release agrégée manquent en `1.0.3` ; `v1.0.4` les fournit. L'image Docker `1.0.3` non-signée présente sur GHCR n'est pas retirée (immutabilité aussi côté GHCR), elle reste accessible mais sans la chaîne de signature sigstore — préférer `1.0.4` ou ultérieur en production.
- **Audit du pipeline post-fix.** Recensé en parallèle de ce hotfix : aucun autre piège bloquant détecté dans `release.yml`. Risques mineurs identifiés (deprecations futures `docker/metadata-action@v5`, `softprops/action-gh-release@v2`, `sigstore/cosign-installer@v3` ; race condition théorique sur retention artifacts à 7 jours en cas de pipeline > 7 j ; absence de `if-no-files-found: error` sur le download SBOM dans le job `release` final) — à reprendre dans une passe d'amélioration séparée, hors scope hotfix.
- **Lockfile pnpm régénéré** dans le même commit que les bumps de manifests.

## [1.0.3] — 2026-05-02

Sprint S5.3 — **hotfix Dockerfile multi-arch**. Aucun changement fonctionnel : 12 détecteurs, 10 formats et 4 exports strictement identiques à `v1.0.2`. Cette release refactore l'image Docker pour rétablir la production des deux variantes d'architecture (amd64 + arm64) sur GHCR, qui n'avaient pas pu être publiées en `v1.0.2` à cause d'un crash QEMU pendant le build arm64.

### Corrections

- **`Dockerfile`** : refactor en **mono-stage** (`nginx-unprivileged:1.27-alpine` uniquement). Suppression complète de l'étape builder `node:20-alpine` qui faisait `pnpm install --frozen-lockfile` puis `ng build` à l'intérieur du container. Bug corrigé : sur runner GitHub Actions amd64, le build de la variante arm64 passait par l'émulation QEMU, et l'exécution d'esbuild (utilisé par Angular CLI 20 pour le bundle production) déclenche des instructions SIMD modernes (NEON/SVE) que la version QEMU embarquée dans `tonistiigi/binfmt` ne sait pas émuler correctement. Résultat : `qemu: uncaught target signal 4 (Illegal instruction) - core dumped` après ~38 secondes de build, exit code non-zero, image arm64 jamais produite, tout le push GHCR annulé. Le refactor mono-stage transfère la responsabilité du build Angular à l'amont (`pnpm build` côté hôte ou step CI `build-app` qui upload le dist en artifact). Le Dockerfile ne fait plus que `COPY apps/pii-scanner-web/dist/browser /usr/share/nginx/html` + `COPY docker/nginx.conf` : aucun binaire à exécuter pendant le build, donc aucun besoin d'émulation QEMU. Bonus : image runtime ~6× plus légère (suppression de la couche node intermédiaire), build Docker beaucoup plus rapide (le dist est déjà calculé). Approche standard de la communauté Docker pour les images statiques multi-arch.
- **`.dockerignore`** : suppression du pattern global `**/dist` qui excluait le dist Angular du contexte Docker (ce qui avait obligé l'ancien Dockerfile à rebuilder par lui-même). Remplacement par des exclusions ciblées : `packages/*/dist` (build TypeScript des deux packages workspace, inutile au runtime nginx), `apps/pii-scanner-web/dist/server` (SSR non utilisé). Le dist Angular client (`apps/pii-scanner-web/dist/browser/`) est désormais inclus dans le contexte. Commentaire explicite ajouté pour interdire de remettre le pattern `**/dist` global.
- **`README.md` — section `## Build local Docker`** : mise à jour pour refléter la nouvelle pré-condition (`pnpm install` + `pnpm build` AVANT `docker build`). Note historique sur le crash QEMU `v1.0.2` ajoutée.

### Modifications

- **`packages/pii-detectors/package.json`** — bumpé `1.0.2` → `1.0.3`.
- **`packages/pii-scanner-engine/package.json`** — bumpé `1.0.2` → `1.0.3`.
- **`apps/pii-scanner-web/package.json`** — bumpé `1.0.2` → `1.0.3`.
- **Constantes `DETECTORS_VERSION` et `ENGINE_VERSION`** alignées à `1.0.3`.
- **`README.md` — table roadmap** : ligne « S5.3 — Hotfix Docker multi-arch » ajoutée.

### Notes

- **Pas de runners arm64 natifs pour l'instant.** GitHub Actions propose des runners `ubuntu-24.04-arm` gratuits pour repos publics depuis 2025 ; cette piste éliminerait le besoin de QEMU même si on rebuilait dans le Dockerfile. Approche écartée pour `v1.0.3` parce que (a) la cause racine (build inutile dans le Dockerfile) restait à corriger de toute façon, (b) le refactor mono-stage règle le problème sans changer la stratégie de runners, (c) ça aurait demandé un refactor lourd du `release.yml` (matrix runners + `docker manifest create` pour fusionner les digests).
- **Pas de re-tag de `v1.0.2`.** L'immutabilité du tag est préservée. Les autres jobs de la release `v1.0.2` (publish-npm, build-zip, build-sbom, deploy-pages) ayant pu réussir une fois la protection de l'environnement `github-pages` ajustée côté UI, les artefacts `1.0.2` restent disponibles côté npm / GitHub Pages / SBOM. Seuls l'image Docker et la GitHub Release agrégée (qui dépend de `build-docker`) restent absentes pour `1.0.2` ; `v1.0.3` les fournit.
- **Pré-condition GitHub UI déjà résolue.** La règle « Tag `v*` autorisé pour `github-pages` » ajoutée pour débloquer `v1.0.2` reste en place pour `v1.0.3`. Documentation à long terme : à intégrer dans un futur `BOOTSTRAP.md` qui listera toutes les configs GitHub UI nécessaires au pipeline release.
- **Lockfile pnpm régénéré** dans le même commit que les bumps de manifests.

## [1.0.2] — 2026-05-02

Sprint S5.2 — **hotfix CI SBOM**. Aucun changement fonctionnel : 12 détecteurs, 10 formats et 4 exports strictement identiques à `v1.0.1`. Cette release migre l'outil de génération SBOM (`@cyclonedx/cyclonedx-npm` → `@cyclonedx/cdxgen`) pour rétablir la production de `bom.json` dans le pipeline release, ce qui débloque la création de la GitHub Release agrégée (ZIP + SBOM + signatures cosign).

### Corrections

- **`.github/workflows/release.yml` — job `build-sbom`** : remplacement de `pnpm dlx @cyclonedx/cyclonedx-npm@^1.20.0` par `npx --yes @cyclonedx/cdxgen@^11 -t pnpm --spec-version 1.5 -o bom.json .`. Bug corrigé : `@cyclonedx/cyclonedx-npm` invoque `npm ls --all --json` sous le capot pour énumérer le graphe de dépendances. La structure non standard de `node_modules/.pnpm/` (symlinks vers les packages physiques) fait sortir `npm ls` en `code ELSPROBLEMS` avec une cascade de `extraneous` (paquets vus par npm mais absents du graphe), `invalid` (peer deps résolues différemment par pnpm) et `missing` (peer deps qui ne sont pas hoist au top-level comme npm s'y attend). Conséquence en `v1.0.1` : tout le pipeline release devenait rouge à cause du SBOM, et la GitHub Release finale ne s'agrégeait pas (jobs `release`, `build-zip`, `build-sbom` interdépendants côté assets). Le passage à `cdxgen` règle le problème en parsant `pnpm-lock.yaml` directement, sans passer par `npm ls`. `cdxgen` est l'outil officiel CycloneDX pour les monorepos non-npm (pnpm, yarn berry, bun). **Second piège évité au passage** : on appelle `cdxgen` via `npx --yes` plutôt que `pnpm dlx`. Depuis pnpm 9, les build scripts des dépendances sont bloqués par défaut (sécurité supply-chain) ; or `cdxgen` embarque `@appthreat/sqlite3` (base de vulns OSV/CVE) avec un build natif node-gyp que pnpm refuse d'exécuter sans approbation explicite, ce qui aurait fait sortir le step en `ERR_PNPM_IGNORED_BUILDS`. `npx --yes` ne souffre pas de cette restriction. Alternative écartée : ajouter `onlyBuiltDependencies` dans la config pnpm racine (impacte le projet entier pour une dépendance one-shot CI).

### Modifications

- **`packages/pii-detectors/package.json`** — bumpé `1.0.1` → `1.0.2`.
- **`packages/pii-scanner-engine/package.json`** — bumpé `1.0.1` → `1.0.2`.
- **`apps/pii-scanner-web/package.json`** — bumpé `1.0.1` → `1.0.2`.
- **Constantes `DETECTORS_VERSION` et `ENGINE_VERSION`** alignées à `1.0.2`.
- **`README.md` — section `## Statut`** mise à jour, ligne « S5.2 — Hotfix CI SBOM » ajoutée à la table roadmap.

### Notes

- **Posture souveraineté préservée.** La variable d'environnement `FETCH_LICENSE: "false"` est positionnée sur le step `cdxgen` pour empêcher les requêtes au registry npm visant à enrichir les métadonnées de licence. Le SBOM est généré uniquement à partir du `pnpm-lock.yaml` et des `package.json` locaux téléchargés par `pnpm install --frozen-lockfile`. Cohérent avec la promesse « zéro fetch externe non nécessaire au build ».
- **Format SBOM identique.** `cdxgen` produit la même spec CycloneDX 1.5 JSON que `cyclonedx-npm`, signée à l'identique par cosign keyless. Les commandes de vérification documentées dans le README et le corps des GitHub Releases restent valides sans changement.
- **Pas de bump de la spec CycloneDX (reste 1.5).** Bump à 1.6 envisageable quand cosign et les outils downstream auront stabilisé. Décision documentée dans le commentaire bloc du job `build-sbom`.
- **Pas de re-tag de `v1.0.1`.** L'immutabilité du tag est préservée. Les autres jobs de la release `v1.0.1` (publish-npm, build-docker, deploy-pages) ayant pu réussir indépendamment de `build-sbom`, les artefacts `1.0.1` restent disponibles côté npm / GHCR / GitHub Pages. La GitHub Release `v1.0.1` reste sans `bom.json` ni ZIP attaché ; `v1.0.2` fournit la version complète.
- **Lockfile pnpm régénéré** dans le même commit que les bumps de manifests.

## [1.0.1] — 2026-05-02

Sprint S5.1 — **hotfix CI release**. Aucun changement fonctionnel : 12 détecteurs, 10 formats et 4 exports strictement identiques à `v1.0.0` (et inchangés depuis `v0.4.1`). Cette release rejoue le pipeline de distribution `v1.0` qui n'avait pas pu produire l'image Docker, le ZIP standalone, le SBOM CycloneDX ni le déploiement GitHub Pages, faute d'un bug d'orchestration dans `.github/workflows/release.yml`. Les packages npm (`@rezdevops/pii-detectors`, `@rezdevops/pii-scanner-engine`) avaient été publiés manuellement en `1.0.0` sans provenance OIDC ; ils sont republiés ici en `1.0.1` avec la signature sigstore keyless attendue.

### Corrections

- **`.github/workflows/release.yml` — job `build-app`** : ajout d'un step `Build packages (lib + engine)` (`pnpm -r --filter='./packages/*' build`) **avant** `Build production (base href ./)`. Bug corrigé : le job appelait directement `pnpm --filter pii-scanner-web build:rel` (qui se réduit à `ng build --base-href ./`), sans passer par le script root `pnpm build` qui orchestre packages → app dans le bon ordre. esbuild résolvait alors `@rezdevops/pii-detectors` et `@rezdevops/pii-scanner-engine` via le symlink workspace, lisait leur champ `exports` qui pointe sur `./dist/index.js`, et plantait avec « Could not resolve » + « The module "./dist/index.js" was not found on the file system » car les packages frères n'avaient pas été buildés. Le step ajouté est strictement le même que celui déjà présent dans le job `publish-npm` (parité d'orchestration). Alternative écartée pour rester surgical : créer un script root `build:rel` symétrique à `build` (à reconsidérer si une troisième variante de build apparaît). Ne pas supprimer ce step sans introduire l'orchestration équivalente.

### Modifications

- **`packages/pii-detectors/package.json`** — bumpé `1.0.0` → `1.0.1`. Aucun autre changement.
- **`packages/pii-scanner-engine/package.json`** — bumpé `1.0.0` → `1.0.1`. Aucun autre changement.
- **`apps/pii-scanner-web/package.json`** — bumpé `1.0.0` → `1.0.1`.
- **Constantes `DETECTORS_VERSION` (`packages/pii-detectors/src/index.ts`) et `ENGINE_VERSION` (`packages/pii-scanner-engine/src/version.ts`)** alignées à `1.0.1` — la badge de version affichée dans le footer de la SPA et l'`engineVersion` embarqué dans tous les exports JSON / Markdown / HTML reflètent désormais `1.0.1`.
- **`README.md` — section `## Statut`** mise à jour, ligne « S5.1 — Hotfix CI release » ajoutée à la table roadmap.

### Sécurité

- **Provenance OIDC enfin appliquée aux deux packages npm.** En `v1.0.0`, le job `publish-npm` n'avait pas pu s'exécuter (dépendance sur `build-app` qui plantait) ; les packages avaient donc été publiés manuellement depuis le poste de Rudy, sans la signature sigstore keyless `--provenance`. Le hotfix `v1.0.1` rejoue le pipeline complet, ce qui aligne enfin les artefacts npm sur la posture souveraineté annoncée (chaîne de signature reproductible, lien vers le commit GitHub via OIDC). `publishConfig: { access: "public", provenance: true }` reste en place dans les deux `package.json`.

### Notes

- **Pas de re-tag de `v1.0.0`.** L'immutabilité du tag est préservée. La GitHub Release `v1.0.0` reste vide d'artefacts (pas de ZIP / SBOM / Docker attachés), c'est documenté dans la GH Release `v1.0.1` qui les fournit. Les packages npm `1.0.0` restent publiés (sans provenance) pour ne pas casser les installations en cours, mais l'usage recommandé devient immédiatement `1.0.1`.
- **Aucune migration utilisateur.** API publique des deux packages strictement identique. Format des exports JSON / Markdown / HTML inchangé (`REPORT_SCHEMA_VERSION = "1.0"` reste en place). L'image Docker `ghcr.io/rezdevops/pii-scanner-web:1.0.0` n'ayant jamais été publiée, le tag `1.0.1` est de facto la première version Docker disponible.
- **Lockfile pnpm régénéré** dans le même commit que les bumps de manifests, sinon `pnpm install --frozen-lockfile` casse en CI (cf. règle d'équipe).

## [1.0.0] — 2026-05-02

Sprint S5 — **release pipeline + landing + page vérifier publique**. Premier tag stable du périmètre v1.0 cadrage. Aucune nouvelle feature fonctionnelle (les 12 détecteurs, 10 formats et 4 exports sont déjà en place depuis `v0.4.0`/`v0.4.1`) : cette version livre la chaîne de distribution et la couche éditoriale qui rendent le projet utilisable en clientèle.

### Ajouts

- **Workflow `release.yml`** — pipeline déclenché sur tag `v*`, 8 jobs en cascade : `verify` (sanity full re-run), `build-app` (artifact dist partagé), `build-zip`, `build-sbom` (CycloneDX via `@cyclonedx/cyclonedx-npm`), `build-docker` (multi-arch amd64+arm64, push GHCR, signature `cosign` keyless), `publish-npm` (`@rezdevops/pii-detectors` puis `@rezdevops/pii-scanner-engine`, `--access public --provenance`), `deploy-pages` (déploiement automatique sur GitHub Pages), `release` (création de la GitHub Release avec ZIP + SBOM + signatures + `SHA256SUMS.txt` + notes auto-générées).
- **`Dockerfile`** — image multi-stage Node 20 alpine → `nginxinc/nginx-unprivileged:1.27-alpine` (UID 101, port 8080). Multi-arch.
- **`docker/nginx.conf`** — configuration nginx alignée sur la posture souveraineté : CSP stricte en header HTTP (en plus du `<meta>`), HSTS, `Cross-Origin-*-Policy`, `Permissions-Policy`, cache `immutable` sur les assets hashés et `no-cache` sur `index.html`, `access_log off` (privacy par défaut), méthodes restreintes à `GET/HEAD`.
- **`apps/pii-scanner-web/public/verifier/index.html`** — page « Comment vérifier la souveraineté » en HTML statique standalone (CSS inline, `default-src 'none'` sur sa propre meta CSP). Servie sous `/verifier/` côté GH Pages, Docker et ZIP. Synchronisée avec `docs/comment-verifier-souverainete.md`.
- **`apps/pii-scanner-web/src/app/app.component.scss`** — styles externalisés depuis le template inline (la landing étoffée fait sortir les styles du seuil `anyComponentStyle`). Hiérarchie sémantique par section (hero/how/demo/sovereignty/benefits/distribution/footer).
- **`SECURITY.md`** — politique de signalement de vulnérabilités. Canaux (GitHub Security Advisories + email), engagements de délai, périmètre couvert/non couvert.
- **`docs/audit-dependances-v1.0.0.md`** — audit reconductible : état post-S5 du lockfile, toutes les CVE high/critical à 0, position sur les CVE moderate dev-only restantes (esbuild, vite, webpack-dev-server) en attente du pivot Angular 21 / Vitest 4 / TS 6 prévu en v1.1.
- **Step `pnpm audit --audit-level=high --prod`** ajouté dans `release.yml` (job `verify`). Le `ci.yml` reçoit le même step pour casser le merge sur toute nouvelle CVE high/critical en code marchand (cf. note S4.1).

### Modifications

- **CSP dev/prod séparées** — création de `apps/pii-scanner-web/src/index.dev.html` avec une CSP qui autorise les WebSocket vers `localhost`/`127.0.0.1` (HMR du dev server Angular). `angular.json` configure `architect.build.configurations.development.index = "src/index.dev.html"` pour swap automatique en `pnpm dev` / `ng serve`. Le `src/index.html` de prod (avec `connect-src 'none'`) reste la base de toutes les distributions publiques (GH Pages, Docker, ZIP). Bug corrigé : le `connect-src 'none'` bloquait `ws://127.0.0.1:4200/` en dev, faisait planter le client HMR Angular et cassait l'init de l'app (drop de fichier ne déclenchait plus le scan).
- **Pool de Web Workers désactivé partout en v1.0** — l'`AppComponent` n'enregistre **plus** de `workerFactory` ; le `ScanService` tombe automatiquement sur `MainThreadRunner` (le fallback existant). Raison : le pattern `new Worker(new URL("./scan-worker.js", import.meta.url))` du `create-default-worker.js` situé dans le dist du package `@rezdevops/pii-scanner-engine` n'est pas re-bundlé proprement par les outils Angular 20 — ni Vite (en dev, dep optimizer rate le sub-export workspace), ni esbuild (en prod, le worker est créé mais les events n'arrivent jamais → scan bloqué silencieusement). La promesse souveraineté reste **100 % tenue** : calcul local, zéro réseau, CSP stricte respectée ; seule la parallélisation sur très gros fichiers est différée. Plan v1.1 : exposer le worker comme asset Angular **côté app** (et non depuis le package npm), avec `new Worker(new URL("./scan-worker.ts", import.meta.url))` dans le code source de l'app — Angular esbuild sait bundler ce pattern depuis le source, pas depuis un dist déjà compilé d'un package monorepo.
- **Déclaration explicite des dépendances transitives de l'engine dans `apps/pii-scanner-web/package.json`** — `@e965/xlsx`, `comlink`, `mammoth`, `papaparse`, `pdfjs-dist` ajoutées en `dependencies` directes de l'app. Bug corrigé : Vite 7 (Angular 20 dev-server) ne sait pas remonter la chaîne pnpm depuis un fichier compilé du workspace (`packages/pii-scanner-engine/dist/parsers/csv-parser.js`) pour résoudre ses imports transitifs (`import Papa from "papaparse"`). Tentative préalable via `pnpm.publicHoistPattern` n'a pas suffi à exposer les packages au top-level. La duplication des dépendances dans le manifest de l'app est assumée : c'est l'approche standard pour les workspaces pnpm + Vite, le contrat des packages npm publiés (`@rezdevops/pii-detectors`, `@rezdevops/pii-scanner-engine`) reste intact.
- **PDF.js : configuration du `workerSrc` au démarrage de l'app** — `pdfjs-dist@^4.10.x` (consommé via le package engine) exige une URL de worker valide ; le `workerSrc = ""` qui fonctionnait en `pdfjs-dist@^3.x` ne marche plus et lève « No GlobalWorkerOptions.workerSrc specified » au premier scan PDF. Le fichier `pdf.worker.mjs` est maintenant copié comme asset statique au build (cf. `apps/pii-scanner-web/angular.json` → `architect.build.options.assets`, second item) depuis `node_modules/pdfjs-dist/legacy/build/` vers la racine du dist. Au démarrage de l'`AppComponent`, `GlobalWorkerOptions.workerSrc = "pdf.worker.mjs"` est posé (chemin relatif au `<base href>`, fonctionne identiquement en `file://`, GH Pages, Docker). Le worker est servi depuis l'origine de l'app, conforme à la CSP `worker-src 'self' blob:`. Le `pdf-parser.ts` ne touche plus au `workerSrc` (responsabilité déléguée au caller, contrat propre du package npm).
- **Script alias `build:rel` pour le build prod avec base href relative** — `apps/pii-scanner-web/package.json` ajoute un script `"build:rel": "ng build --base-href ./"`. Bug corrigé : `pnpm --filter pii-scanner-web build -- --base-href ./` (utilisé en local + workflows + Dockerfile) faisait échouer le validateur de schéma Angular CLI 20 avec « Schema validation failed... must NOT have additional properties » à cause de la double propagation d'args via `--`. L'alias contourne le souci en posant les flags directement dans le script. Tous les call sites mis à jour : `release.yml` (job `build-app`), `deploy-pages.yml`, `Dockerfile`.
- **`optimization.styles.inlineCritical: false`** dans `angular.json` configuration `production`. Bug corrigé : par défaut Angular CLI 17+ injecte des `<link rel="preload" onload="this.rel='stylesheet'">` pour le critical CSS, créant un inline event handler `onload=` qui viole la CSP `script-src 'self' 'wasm-unsafe-eval'` (sans `'unsafe-inline'` ni `'unsafe-hashes'`). Le gain perf du critical CSS est marginal pour une SPA monolithique avec un seul fichier CSS principal — la CSP stricte est prioritaire sur cette micro-optimisation.
- **Retrait des `<mat-icon>` du template** — la font Material Icons est servie par défaut par Google Fonts (`fonts.googleapis.com`), ce qui viole la promesse souveraineté « aucune dépendance externe au runtime ». Les ~15 occurrences dans `app.component.ts` (CTA, hero bullets, étapes, bénéfices, distribution) sont retirées ; le `MatIconModule` ne fait plus partie des `imports[]` du composant. La landing reste lisible et alignée Brand Bible (anti-démo-gadget). Sélecteurs SCSS `mat-icon` orphelins nettoyés. Pour ré-introduire des icônes en v1.1, deux options : embarquer une font locale (via le package `material-symbols`), ou utiliser `MatIconRegistry.addSvgIconLiteral` avec des SVG inline.
- **Retrait de `frame-ancestors 'none'`** des balises `<meta>` (`apps/pii-scanner-web/src/index.html` + `apps/pii-scanner-web/public/verifier/index.html`). Par spec WHATWG, cette directive n'est honorée que servie via header HTTP — sa présence en meta génère un warning console sans aucune protection effective. La directive est posée en header HTTP côté `docker/nginx.conf` (image GHCR) + `X-Frame-Options: DENY` en doublon. Compromis documenté dans `docs/comment-verifier-souverainete.md` (tableau de protection par canal de distribution) : la démo GH Pages n'a pas la protection anti-clickjacking, c'est assumé pour v1.0.
- **`apps/pii-scanner-web/src/app/app.component.ts`** — landing commerciale alignée Brand Bible (rigueur, souveraineté, anti-démo-gadget). 6 sections : hero, comment ça marche, démo intégrée, vérification souveraineté, bénéfices DPO/RGPD, distribution. Topbar enrichie avec navigation par ancres. Footer enrichi (lien GitHub, npm, AGPL, auteur). Lien interne vers la page `verifier/index.html` standalone.
- **`apps/pii-scanner-web/src/index.html`** — `<base href="/">` → `<base href="./">`. Chemins relatifs : l'app fonctionne identiquement en `file://` (ZIP standalone), GitHub Pages (sous-chemin `/pii-scanner-web/`), et derrière un reverse-proxy Docker.
- **`.github/workflows/deploy-pages.yml`** — désactivé/déprécié au profit du job `deploy-pages` du `release.yml`. Conservé en `workflow_dispatch` pour les rebuilds manuels d'urgence.
- **`packages/pii-detectors/package.json`** — bumpé `0.2.0` → `1.0.0`. `publishConfig: { access: "public", provenance: true }` confirmé.
- **`packages/pii-scanner-engine/package.json`** — bumpé `0.4.1` → `1.0.0`. `publishConfig: { access: "public", provenance: true }` confirmé. Version `peerDependencies['@rezdevops/pii-detectors']` alignée à `^1.0.0`.
- **`apps/pii-scanner-web/package.json`** — bumpé `0.4.1` → `1.0.0`.
- **Constantes `DETECTORS_VERSION` / `ENGINE_VERSION`** alignées à `1.0.0`.
- **README** — section `## Statut` mise à jour, badges `npm` / `GHCR` / `CodeQL` ajoutés, sections `Démo en ligne` et `Distribution` étoffées (Docker + ZIP + npm + commandes `cosign verify`).

### Sécurité

- **Migration `xlsx@^0.18.5` → `@e965/xlsx@^0.20.3`** dans `@rezdevops/pii-scanner-engine` — corrige `CVE-2023-30533` (Prototype Pollution) et la ReDoS de SheetJS Community Edition, restées non patchées sur la branche officielle npm. `@e965/xlsx` est un fork drop-in à API identique. Initialement reportée en v1.1, l'opération a été anticipée en S5 pour permettre le seuil strict `pnpm audit --audit-level=high --prod` dans la CI sans dérogation. ADR 0005 mise à jour, section « Mise à jour S5 ».
- **Toutes les CVE `high`/`critical` à 0** sur la branche `main` du lockfile post-S5. Cf. `docs/audit-dependances-v1.0.0.md`. Les CVE `moderate` dev-only restantes (esbuild, vite via webpack-dev-server, uuid via Angular CLI) sont reportées en `v1.1` au moment de la migration Angular 21 / Vitest 4 / TS 6.
- **Toutes les artefacts de release signées** via `sigstore/cosign` keyless OIDC : image Docker (signature attachée au registry), ZIP standalone (`.sig` + `.pem`), SBOM (`.sig` + `.pem`). Vérification reproductible documentée dans le README et dans le corps de chaque GitHub Release.
- **`SECURITY.md`** — politique de divulgation responsable.

### Notes

- **Le sous-domaine `pii-scanner.rezdevops.fr` est reporté en `v1.1`.** La démo officielle `v1.0` reste sur l'URL GitHub Pages par défaut `rezdevops.github.io/pii-scanner-web` (zéro DNS, zéro charge ops). La bascule sera transparente côté SEO grâce au champ `homepage` du `package.json` qui restera la source de vérité.
- **Bumps majeurs Angular 21 / Vitest 4 / TS 6** : volontairement reportés en `v1.1`. Le cadrage § 11 fixe Angular 20 pour la v1.0 ; basculer en plein S5 aurait exigé une réécriture potentielle des templates Material M3 et étendu la charge S5 hors du cadrage 1,5 j-h.
- **Première publication npm** : si la délégation `Trusted Publisher` côté `npm.com` n'est pas encore configurée pour les deux packages au moment du tag `v1.0.0`, le job `publish-npm` utilise un `NPM_TOKEN` classique (secret repo). À basculer en publisher OIDC dès que possible (zéro secret côté CI).
- **Pages stable URL** : `https://rezdevops.github.io/pii-scanner-web/` ; page « vérifier » : `https://rezdevops.github.io/pii-scanner-web/verifier/`.
- Tag repo `v1.0.0` reflète la livraison principale (release pipeline + landing + page vérifier).

## [0.4.1] — 2026-05-02

Sprint S4.1 — **durcissement plate-forme**. Quatre chantiers livrés ensemble : CSP stricte côté SPA, audit de toutes les dépendances avec correctifs prioritaires, audit accessibilité WCAG 2.1 niveau AA (axe-core automatisé + manuel VoiceOver/NVDA), et lazy-loading des trois parseurs binaires lourds (`xlsx`, `pdfjs-dist`, `mammoth`) pour réduire le bundle initial sous la barre du Mo. Aucune nouvelle feature fonctionnelle — c'est une release de qualité.

### Ajouts

- `@rezdevops/pii-scanner-engine` — **lazy-loading des parseurs binaires** : `xlsxParser`, `xlsParser`, `pdfParser`, `docxParser` chargent désormais leur module npm respectif via `import()` dynamique au premier appel à `parse()`, avec cache module-level. Aucune rupture d'API : la signature `FileParser` reste synchrone vis-à-vis du caller. Trois nouvelles fonctions exportées `preloadXlsxParser()`, `preloadDocxParser()`, `preloadPdfParser()` permettent à l'UI de pré-chauffer un chunk en arrière-plan (au survol d'un bouton). Voir [ADR 0007](docs/adr/0007-lazy-loading-parseurs-binaires.md).
- `apps/pii-scanner-web` — **audit accessibilité automatisé** : nouvelle spec `accessibility.spec.ts` qui exécute axe-core (WCAG 2.0 AA + 2.1 AA + best-practice) sur les templates HTML représentatifs des 4 zones principales (drop-zone, file-queue, report, banner+footer). 0 violations à la livraison v0.4.1. Doc complète dans `docs/accessibilite.md` (méthode + audit manuel VoiceOver + NVDA + grille de contrastes + signature).
- `docs/audit-dependances-v0.4.1.md` — audit complet : 8 vulnérabilités identifiées (1 critical + 4 high + 3 moderate), classées runtime vs dev, avec décisions de correction immédiate, report planifié, ou risque accepté documenté. Premier de la série — sera reconduit à chaque sprint impactant les deps.
- `docs/accessibilite.md` — protocole d'audit WCAG AA reconductible, grille de contrastes WebAIM, scénarios clavier et lecteur d'écran, signature.
- `docs/adr/0007-lazy-loading-parseurs-binaires.md` — décision et alternatives écartées (sub-exports, lazy Angular).

### Modifications

- `apps/pii-scanner-web/src/index.html` — **CSP stricte resserrée** : `default-src 'none'` (verrou principal au lieu de `'self'`), ajout explicite de `object-src 'none'`, `media-src 'none'`, `manifest-src 'none'`, `frame-src 'none'`, `base-uri 'none'`, `form-action 'none'`. `connect-src 'none'` conservé (zéro réseau au runtime). Documentation détaillée dans la balise meta + dans `docs/comment-verifier-souverainete.md` § « Vérification de la Content Security Policy » réécrit.
- `apps/pii-scanner-web/src/styles.scss` — **contrastes WCAG AA corrigés** :
  - `--psw-sev-high` : `#d97706` → `#92400e` (était 3.13:1 sur blanc, FAIL AA → 5.0:1, ✅ AA).
  - `--psw-sev-medium` : `#b58900` → `#854d0e` (était 3.94:1 → 5.1:1, ✅ AA).
  - `--psw-muted` : `#6b6b6b` → `#595959` (4.4:1 → 6.4:1).
  - `--psw-danger` : `#b3261e` → `#a02016` (cohérence avec critical).
- `apps/pii-scanner-web/src/styles.scss` — **mode sombre** ajouté via `@media (prefers-color-scheme: dark)` : palette `--psw-*` adaptée, sévérités passent à des teintes claires, contrastes ≥ 4.5:1 maintenus.
- `apps/pii-scanner-web/src/styles.scss` — `prefers-reduced-motion: reduce` neutralise la transition CSS de `.psw-mask`.
- `apps/pii-scanner-web/src/app/scan/drop-zone.component.ts` — **anti-pattern `nested-interactive` corrigé** : la zone passe de `role="button" tabindex="0"` à `role="region"` (pour éviter le conflit avec le bouton enfant « choisissez un fichier »). L'interaction clavier est concentrée sur le bouton ; le clic souris hors-bouton ouvre le picker via `onZoneClick`. UX inchangée, sémantique propre. `aria-describedby` renvoie sur les hints (formats acceptés + promesse de souveraineté).
- `apps/pii-scanner-web/src/app/scan/file-queue.component.ts` — `aria-live="polite"` sur la section, `aria-labelledby` sur la liste, `aria-hidden="true"` sur les icônes (déjà accompagnées d'un texte), `aria-label` explicite sur la `mat-progress-bar` indéterminée par-fichier.
- `apps/pii-scanner-web/src/app/scan/report.component.ts` — `aria-labelledby` sur la section récap, `aria-label` enrichi sur les `mat-chip` (« Email : 1 finding(s) »), valeurs masquées passent en `role="button"` avec `aria-label` qui inclut le nom du détecteur.
- `apps/pii-scanner-web/src/app/app.component.ts` — `role="contentinfo"` sur le footer, `aria-label` explicite sur le bouton « Réinitialiser » et sur le lien GitHub (« s'ouvre dans un nouvel onglet »), `target="_blank" rel="noopener noreferrer"` sur le lien externe.
- `happy-dom` bumpé `^15.11.7` → `^20.0.0` dans tout le monorepo (engine devDep + app devDep + override pnpm). **Corrige 4 vulnérabilités** dont 1 critical (VM Context Escape, GHSA-37j7-fg3j-429f). DevDep uniquement, pas exposé en runtime utilisateur.
- `vitest` bumpé `^2.1.9` → `^3.1.1` côté monorepo. **Corrige 2 vulnérabilités moderate** (esbuild GHSA-67mh-4wv8-2f99 + vite GHSA-4w7w-66w2-5vf9 — cascade vite 6 + esbuild 0.25 incluse dans Vitest 3). Et **corrige le warning `unmet peer vitest@^3.1.1`** émis par `@angular/build@20.3.25`. Vitest 3 introduit moins de breaking changes que Vitest 4 (l'API de mock cassée n'est pas utilisée dans ce projet).
- `axe-core ^4.10.0` ajouté en devDep de l'app pour la spec d'accessibilité.
- `package.json` racine — `pnpm.overrides.happy-dom: ^20.0.0` ajouté pour couvrir les chemins transitifs (vitest → happy-dom 15.x).
- `@rezdevops/pii-scanner-engine` bumpé `0.4.0` → `0.4.1` (lazy-loading + 3 helpers `preload*Parser` exportés). Aucune rupture.
- App `pii-scanner-web` bumpée `0.4.0` → `0.4.1` (CSP + WCAG + axe-core).
- `pii-detectors` reste à `0.2.0` (aucun changement code).
- Constante `ENGINE_VERSION` alignée à `0.4.1`.

### Sécurité

- **6 vulnérabilités corrigées** : 4 happy-dom (1 critical + 3 high) + 2 moderate (esbuild + vite via cascade Vitest 3). DevDep, mais bonne hygiène pour les contributeurs.
- **2 vulnérabilités reportées en v1.0**, justifiées :
  - `xlsx ~SheetJS CE` (2 high : Prototype Pollution + ReDoS) — pas de patch sur la branche npm. Plan v1.0 : migration vers `@e965/xlsx` (fork patché). Risque effectif mitigé par l'isolation Web Worker.
- **1 vulnérabilité reportée en v0.5/v1.0** : `uuid` via webpack-dev-server (moderate, dev-only, patch nécessite Angular 21). Risque effectif nul (sockjs n'utilise pas l'API vulnérable). Documentée dans `docs/audit-dependances-v0.4.1.md`.

### Notes

- **Lockfile à régénérer** : le bump happy-dom + ajout axe-core + override pnpm requièrent `pnpm install` (pas `--frozen-lockfile`) avant le commit. La CI passera ensuite en `--frozen-lockfile`. Apprentissage S1 (`feedback_lockfile_after_manifest_change`) appliqué.
- **Bundle initial cible** : ~1.97 Mo → < 1 Mo grâce au lazy-loading. Mesure de validation post-build attendue (à reporter dans le commit message si remarquable).
- **Audit dépendances reconductible** : ajout planifié S5 d'un job `pnpm audit --audit-level=high` dans `ci.yml` pour casser la build sur nouvelle CVE high+.
- **Audit WCAG reconductible** : axe-core tourne à chaque CI ; audit manuel reconduit à chaque release majeure (signature attendue dans `docs/accessibilite.md`).
- Tag repo `v0.4.1` reflète la livraison principale (engine + app, perfs + sécurité + a11y).

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
