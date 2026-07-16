# Changelog

Format : [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/), versionnement [SemVer](https://semver.org/lang/fr/).

## [1.3.0] — 2026-07-16

Refonte visuelle complète de l'interface aux couleurs RezDevOps (thème sombre « Tech futuriste » repris du site), deux améliorations UX (boutons « Copier », footer restructuré) et un correctif CI. **Aucun changement côté détecteurs, parseurs, exports ni API publique** — 12 détecteurs, 10 formats, 4 exports strictement identiques à `v1.2.x`. CSP intacte, promesse souveraineté renforcée (polices désormais auto-hébergées, aucun CDN). Les packages npm sont republiés en `1.3.0` par alignement monorepo (code inchangé depuis `1.2.0`).

### UI

- **Refonte de la coquille** (`app.component`, `styles.scss`) au thème dark navy « Tech futuriste » : fond navy + halos bleus + grille technique, surfaces « glass », en-tête et cartes redessinés. Les tokens `--psw-*` sont redéfinis en sombre par défaut (les composants drop-zone / rapport / file-queue héritent sans modification) ; thème Material M3 `theme-type: dark`, primary bleu de marque.
- **Polices de marque auto-hébergées** (Space Grotesk, Barlow, Inter, JetBrains Mono) dans `apps/pii-scanner-web/src/fonts/*.woff2`, référencées en ressources fingerprintées par esbuild — URLs valides sous le sous-chemin GitHub Pages, en ZIP `file://` et en Docker. Aucun CDN ; CSP `font-src 'self'` inchangée.
- **Logo RezDevOps** (en-tête + footer) et tagline « Votre numérique, enfin à vous. ».
- **Boutons « Copier »** sur les cartes Distribution (Docker, npm) : `navigator.clipboard` + retour visuel « Copié », repli accessible si le presse-papiers est indisponible.
- **Footer restructuré en 3 colonnes** (produit, navigation, ressources) + barre basse (crédit, année dynamique, pastilles de garanties « Zéro upload / analytics / cookie », « Code signé sigstore »).
- Contraste WCAG AA vérifié sur fond navy (minimum 5,58:1). Budget `anyComponentStyle` relevé `8 → 12 ko` (warning) / `12 → 16 ko` (error) pour la coquille étoffée.

### CI

- **`scripts/audit-deps.mjs`** remplace `pnpm audit --audit-level=high --prod` dans `ci.yml` et `release.yml`. npm a retiré l'ancien endpoint « quick » (HTTP 410) que toutes les versions de pnpm interrogent encore, ce qui cassait l'étape d'audit indépendamment de toute vulnérabilité. Le script conserve exactement la même politique — dépendances de production, seuil `high`+, base d'advisories npm — via le nouvel endpoint « bulk » officiel. Aucune dépendance ajoutée. Audit post-bascule : 0 advisory `high`+.

## [1.2.2] — 2026-07-05

Migration du package manager **pnpm 9 → pnpm 10**, alignant `pii-scanner-web` sur `rezdevops-site` (déjà en pnpm 10). Dernier chantier d'infra ouvert après la vague Node. Chantier manifeste + doc uniquement : **aucun changement fonctionnel** — détecteurs, formats, exports et API publique strictement identiques à `v1.2.1`. CSP intacte, promesse souveraineté inchangée.

### Modifications

- **`package.json` racine** — `packageManager` `pnpm@9.12.0` → `pnpm@10.34.4` ; `engines.pnpm` `>=9` → `>=10`. Dernier patch du majeur 10 (on ne devance pas `rezdevops-site`, pnpm 11 non adopté).
- **`docs/adr/0011-bump-pnpm-10.md`** — décision : bump pnpm 10, pas d'`onlyBuiltDependencies`, pas de `--legacy` (repo sans `pnpm deploy`), lockfile inchangé.
- **`docs/adr/README.md`** — index étendu avec l'entrée 0011.
- **`README.md` + `BOOTSTRAP.md`** — pré-requis pnpm mis à jour (`>=10` via Corepack) + note sur le blocage des scripts de build en pnpm 10.

### Notes

- **`pnpm-lock.yaml` inchangé.** pnpm 9 et 10 partagent le format `lockfileVersion: '9.0'` : la régénération avec pnpm 10.34.4 produit un fichier byte-identique. `pnpm install --frozen-lockfile` sous pnpm 10 → « Lockfile is up to date » (exit 0).
- **Scripts de build bloqués par défaut (durcissement pnpm 10).** L'install signale « Ignored build scripts » pour `esbuild` (0.27.3/0.27.7/0.28.1), `@parcel/watcher@2.5.6`, `lmdb@3.5.1`, `msgpackr-extract@3.0.3`. Aucun requis (binaires prébuildés ou fallback JS) : `build`/`test`/`audit` passent sans allowlist. Message attendu, non bloquant.
- **Aucun changement de workflow ni de Dockerfile.** Les workflows utilisent `corepack enable` (provisionne pnpm 10 via `packageManager`) ; le Dockerfile copie un `dist/` pré-buildé sans toucher à pnpm.
- `pnpm audit --audit-level=high --prod` post-migration : 0 high / 0 critical.

## [1.2.1] — 2026-07-05

Migration CI Node : retrait de Node 20 (EOL avril 2026 ; runtime `setup-node` retiré des runners GitHub le 2026-06-02) au profit de la matrice `["22", "24"]`. Dernier repo de la vague de migration Node RezDevOps (après `rezdevops-site` et `fec-check`). Livré conjointement avec un **patch de sécurité Angular 21.2.12 → 21.2.17** qui corrige 5 CVE `high` publiées sur `@angular/core` et `@angular/common` (le step CI `pnpm audit --audit-level=high --prod` bloquait dessus, indépendamment du bump Node). **Aucun changement côté détecteurs, parseurs, exports ni API publique** — 12 détecteurs, 10 formats, 4 exports strictement identiques à `v1.2.0`. CSP intacte, promesse souveraineté inchangée. Corepack et pnpm 9 conservés (montée pnpm 10 = chantier distinct).

### Sécurité

- **Stack Angular bumpée `21.2.12` → `21.2.17`** (runtime : core, common, animations, compiler, forms, platform-browser, platform-browser-dynamic, router, compiler-cli) ; **`@angular/cdk` + `@angular/material` `21.2.10` → `21.2.14`** ; **`@angular/cli` + `@angular/build` → `21.2.18`**. Corrige 5 CVE `high` du 2026 :
  - `@angular/core` < 21.2.17 — Client Hydration DOM Clobbering & Response-Cache Poisoning ([GHSA-rgjc-h3x7-9mwg](https://github.com/advisories/GHSA-rgjc-h3x7-9mwg)).
  - `@angular/common` < 21.2.15 — DoS via OOM dans le formatage de nombres `digitsInfo` ([GHSA-p3vc-36g9-x9gr](https://github.com/advisories/GHSA-p3vc-36g9-x9gr)).
  - `@angular/common` < 21.2.15 — fuite d'information via cache par défaut des requêtes authentifiées dans `HttpTransferCache` ([GHSA-q6f4-qqrg-jv6x](https://github.com/advisories/GHSA-q6f4-qqrg-jv6x)).
  - `@angular/common` < 21.2.17 — DoS via OOM dans `formatDate` ([GHSA-48r7-hpm6-gfxm](https://github.com/advisories/GHSA-48r7-hpm6-gfxm)).
  - `@angular/common` < 21.2.17 — hachage de clé de cache 32 bits faible dans `HttpTransferCache` (fuite inter-requêtes) ([GHSA-39pv-4j6c-2g6v](https://github.com/advisories/GHSA-39pv-4j6c-2g6v)).
- `pnpm audit --audit-level=high --prod` post-bump : **0 high / 0 critical**. NB : la SPA calcule en local sans SSR ni `HttpTransferCache` en production, donc l'exposition réelle à ces CVE était nulle ; le bump reste appliqué pour rester dans la fenêtre supportée et débloquer la CI.

### Modifications

- **`.github/workflows/ci.yml`** — matrice `node: ["20", "22"]` → `["22", "24"]`. Node 20 retiré (EOL, plus de couverture amont ni de runtime sur les runners) ; Node 22 = LTS active (cible build/deploy), Node 24 valide la prochaine LTS. Aligné sur `rezdevops-site`.
- **`.github/workflows/release.yml`** — `env.NODE_VERSION: "20"` → `"22"` (LTS active pour build + publication).
- **`.github/workflows/deploy-pages.yml`** — `node-version: "20"` → `"22"` (+ nom de step).
- **`package.json` racine** — `engines.node` `>=20.19` → `>=22.12`. Borne alignée sur la matrice Angular 21 (`^20.19.0 || ^22.12.0 || >=24.0.0`, borne basse relevée à 22.12).
- **`packages/pii-detectors/package.json` + `packages/pii-scanner-engine/package.json`** — `engines.node` `>=20.10` → `>=22.12` pour une borne unique et cohérente dans le monorepo.
- **`.nvmrc`** — `20` → `22`.
- **`docs/adr/0010-bump-node-22-24.md`** — décision architecturale : matrice `["22", "24"]`, build/deploy sur 22, borne engine `>=22.12`, pnpm 9 conservé.
- **`docs/adr/README.md`** — index étendu avec l'entrée 0010.
- **`README.md` + `BOOTSTRAP.md`** — pré-requis Node mis à jour (`>=22.12`).
- **`apps/pii-scanner-web/package.json`** — bumps Angular ci-dessus (section Sécurité).
- **`pnpm-lock.yaml`** — régénéré (pnpm 9.12.0, `--lockfile-only`) pour absorber le patch Angular 21.2.17 + le flottement du devkit `@angular-devkit/build-angular@21.2` vers 21.2.18 (churn transitif babel/esbuild associé). Pas de saut de schema lockfile.

### Notes

- `codeql.yml` non concerné (n'installe pas Node).
- Corepack (`corepack enable`) déjà en place dans les trois workflows Node : aucune modification.
- Détecteurs, parseurs et surface publique des packages npm inchangés : le bump Angular est un patch de sécurité runtime sans impact API.

## [1.2.0] — 2026-05-08

Sprint S7 — **alignement stack Angular 21 (Data Context v0.6) + worker pool app-side réactivé + nettoyage dette CI résiduelle**. Trois chantiers livrés ensemble parce qu'ils sont co-dépendants côté validation utilisateur. Aucun changement côté détecteurs ni parseurs : 12 détecteurs, 10 formats, 4 exports strictement identiques à `v1.1.0`. La promesse souveraineté reste tenue à l'identique : calcul local, zéro réseau, CSP `connect-src 'none'` intacte.

### Ajouts

- **`apps/pii-scanner-web/src/app/scan/worker/scan-worker.ts`** — nouveau script Web Worker app-side. Importe `resolveDetectors`, `scanText` et le type `ScanWorkerApi` depuis la surface publique de `@rezdevops/pii-scanner-engine` ; expose l'API via Comlink. Logique de scan strictement identique au worker engine v1.1, seule l'enveloppe d'exposition vit côté app.
- **`docs/adr/0008-worker-app-side.md`** — décision architecturale : le script worker vit côté app (et plus côté engine). Esbuild Angular sait bundler `new Worker(new URL("./worker/scan-worker.ts", import.meta.url))` depuis un source TS de l'app, ce qu'il ne savait pas faire depuis un dist npm pré-compilé. Résout le bug v1.0 où le pool était désactivé silencieusement.
- **`docs/adr/0009-bump-angular-21.md`** — décision architecturale : bump de la stack front-end Angular 20 → 21.2.x, conjointement Vitest 3 → 4.1.5 et engine Node 20.10 → 20.19. Driver : Data Context v0.6 (alignement stack RezDevOps), trajectoire support actif vs LTS-only Angular, première application de la règle « fenêtre de migration tous les 12 mois ».
- **`BOOTSTRAP.md`** à la racine — guide de configuration GitHub UI + outils locaux pour qu'un fork puisse exécuter le pipeline `release.yml` de bout en bout. Documente : pré-requis Node ≥ 20.19, secret `NPM_TOKEN`, environnement protégé `github-pages` avec règle Tag `v*`, permissions workflow par job, première release sur fork.
- **Bloc `pnpm.overrides`** dans le `package.json` racine — nouvelles entrées `fast-uri: ">=3.1.2"` et `ip-address: ">=10.1.1"` pour patcher 3 CVE actives dans la toolchain Angular 21.2 (cf. ci-dessous).

### Modifications

- **`apps/pii-scanner-web/src/app/scan/scan-worker.factory.ts`** — la fabrique instancie désormais `new Worker(new URL("./worker/scan-worker.ts", import.meta.url), { type: "module" })` côté app au lieu de déléguer à `createDefaultScanWorker` de l'engine. Aucune régression côté contrat (le runner consomme toujours un `Worker` standard via Comlink).
- **`apps/pii-scanner-web/src/app/app.component.ts`** — le constructeur appelle désormais `this.scanService.configureWorkerFactory(createScanWorker)`. Le commentaire « pool désactivé v1.0 » est remplacé par un commentaire qui pointe vers ADR-008. Le pool est actif par défaut sur tout scan ; fallback `MainThreadRunner` automatique si `Worker` n'est pas dispo (SSR, certains tests).
- **`packages/pii-scanner-engine/src/worker/create-default-worker.ts`** — la fabrique est marquée **`@deprecated`** depuis v1.2.0. Conservée pour rétrocompatibilité avec les consommateurs npm v0.3.0 → v1.1.x ; à supprimer à la prochaine majeure (v2.0). La JSDoc documente le pattern recommandé (worker app-side) avec exemple complet.
- **Stack Angular** : `@angular/core`, `@angular/animations`, `@angular/common`, `@angular/compiler`, `@angular/forms`, `@angular/platform-browser`, `@angular/platform-browser-dynamic`, `@angular/router` bumpés `^20.0.0` → `^21.2.12`. `@angular/cli`, `@angular/material`, `@angular/cdk`, `@angular-devkit/build-angular` bumpés `^20.0.0` → `^21.2.10`. `@angular/compiler-cli` bumpé `^20.0.0` → `^21.2.12`. Désalignement de patch (12 vs 10) normal — Angular core et CLI ont des cadences indépendantes.
- **`vitest`** bumpé `^3.1.1` → `^4.1.5` (saut majeur). Migration sans ajustement de config (les tests utilisaient déjà des imports explicites depuis `"vitest"`).
- **`happy-dom`** bumpé `^20.0.0` → `^20.9.0` dans l'app et l'engine (cohérence Vitest 4).
- **`engines.node`** dans le `package.json` racine bumpé `>=20.10` → `>=20.19`. Imposé par `@angular-devkit/build-angular@21` (`^20.19.0 || ^22.12.0 || >=24.0.0`).
- **`pnpm-lock.yaml`** régénéré (~200 lignes de diff, transitives Angular 21 + ajout overrides fast-uri / ip-address). Pas de saut de schema lockfile.
- **`.github/workflows/release.yml`** ligne 173 : `if-no-files-found: warn` → `error` sur l'upload des artifacts npm. Audit S5 signalait ce `warn` comme dette résiduelle. Si l'un des chemins est vide ou inexistant, le job échoue tôt plutôt que de laisser passer une release amputée d'un package.
- **`docs/adr/README.md`** — index étendu avec les entrées 0008 et 0009.

### Sécurité

Trois CVE supply-chain actives au 2026-05-08 dans la toolchain Angular 21.2.x — **toutes patchées** via le bloc `pnpm.overrides` :

- **`fast-uri` (high, GHSA-q3j6-qgpj-74h6)** — path traversal via percent-encoded dot segments. Vulnérabilité dans `<=3.1.0`. Path : `@angular-devkit/build-angular@21.2.10 > @angular-devkit/architect > @angular-devkit/core > ajv@8.18.0 > fast-uri@3.1.0`. Override `fast-uri: ">=3.1.2"` force la chaîne à résoudre la version patchée.
- **`fast-uri` (high, GHSA-?-host-confusion)** — host confusion via percent-encoded authority delimiters. Vulnérabilité dans `<=3.1.1`. Même chaîne d'install. Le même override `>=3.1.2` la couvre.
- **`ip-address` (moderate, GHSA-v2v4-37r5-5v8g)** — XSS dans les méthodes Address6 HTML-emitting. Vulnérabilité dans `<=10.1.0`. Path : `@angular/cli@21.2.10 > @modelcontextprotocol/sdk@1.26.0 > express-rate-limit@8.4.1 > ip-address@10.1.0`. Override `ip-address: ">=10.1.1"`.

Les trois CVE vivent dans la **toolchain de build** (Angular dev-server, CLI, build-angular) — pas dans le bundle servi aux utilisateurs finaux. Aucune n'a jamais touché un déploiement Pages, une image Docker ou un ZIP standalone v1.0/v1.1. L'override est une mesure d'hygiène supply-chain pour avoir un audit propre dans la GH Release v1.2.0.

`pnpm audit --json` post-bump et post-overrides : `{ info: 0, low: 0, moderate: 0, high: 0, critical: 0 }`.

### Notes

- **Apprentissage `ng update` dans monorepo pnpm avec tsconfig externalisé.** Le schematic CDK 21 résout `extends: "../../tsconfig.base.json"` depuis son workspace temp (`/private/var/.../ng-XXXX/`), ce qui retombe sur `/tsconfig.base.json` (chemin absolu inexistant) et plante. Stratégie de contournement : bump manuel via `pnpm add @21.2` sur l'ensemble des packages Angular. Cf. ADR-009 § Conséquences.
- **Pin par mineure (`@21.2`), jamais par patch (`@21.2.10`)** dans les `pnpm add` Angular. Le désalignement de patch core / cli (12 vs 10 au 2026-05-08) plante un pin par patch parce que `@angular/cli@21.2.12` n'existe pas.
- **TypeScript reste sur `~5.9.x`**. Angular 21.2 accepte `>=5.9 <6.1` (TS 6.0 inclus), mais empiler TS 5→6 dans le même sprint que Angular 20→21 + Vitest 3→4 ferait trois bumps majeurs simultanés. TS 6 sera traité dans un sprint dédié post-v1.2 si nécessaire.
- **Worker pool actif par défaut.** Validation manuelle : ouvrir l'app sur Pages déployée, charger un fichier ≥ 50 Mo, vérifier en DevTools Network que `scan-worker.<hash>.js` est matérialisé comme asset séparé, et confirmer dans la console qu'aucun `console.warn("[pii-scanner-web] WorkerPoolRunner indisponible")` n'est émis.
- **API publique des packages npm inchangée.** `@rezdevops/pii-detectors` et `@rezdevops/pii-scanner-engine` ne reçoivent aucune modification d'API ni de comportement (`createDefaultScanWorker` reste exporté, juste `@deprecated`). Le bump à `1.2.0` est un alignement monorepo. Les consommateurs externes peuvent migrer sans aucune adaptation.
- **Sous-domaine `pii-scanner.rezdevops.com`** reporté à un sprint futur (DNS pas encore configuré côté registrar). L'URL officielle de la démo reste `https://rezdevops.github.io/pii-scanner-web/` en v1.2.0.
- **Bumps des 3 actions GitHub à surveiller** (`docker/metadata-action@v5`, `softprops/action-gh-release@v2`, `sigstore/cosign-installer@v3`) reportés à un sprint chore séparé pour ne pas surcharger v1.2.

## [1.1.0] — 2026-05-03

Sprint S6.1 — **drag & drop incrémental + détection des doublons**. Première feature UX depuis `v1.0.0`. Avant ce sprint, chaque dépôt de fichier(s) **remplaçait** la file de scan : impossible d'ajouter un second lot sans perdre les findings du premier. Désormais, un nouveau drop (drag&drop ou picker) **ajoute** ses fichiers à la suite, le rapport global agrège l'historique, et les doublons (`name` + `size` identiques) sont rejetés avec un libellé explicite. Le bouton « Réinitialiser » reste le seul moyen de repartir d'une file vide. Aucun changement côté détecteurs ni parseurs : 12 détecteurs, 10 formats, 4 exports strictement identiques à `v1.0.5`.

### Ajouts

- **`apps/pii-scanner-web/src/app/scan/drop-zone.utils.ts`** — nouveau type `RejectionReason` `"duplicate"`, nouvelle interface `ExistingFileRef` (`name` + `size`), signature de `validateFiles` enrichie d'un 3ᵉ paramètre `existingFiles?: readonly ExistingFileRef[] = []`. La fonction reste pure : la dédup est faite via un `Set<string>` de clés `name|size`, et le plafond cumulé global inclut désormais la taille des fichiers déjà en file (un 2ᵉ dépôt ne peut plus contourner la limite par accumulation). Choix `name+size` plutôt que `lastModified` parce que ce dernier n'est pas toujours fiable sur les fichiers issus d'un drag&drop.
- **`apps/pii-scanner-web/src/app/scan/drop-zone.component.ts`** — nouveau `@Input() existingFiles: readonly ExistingFileRef[] = []`, transmis tel quel à `validateFiles`. Le composant ne connaît rien du `ScanService` (toujours pur sur ses entrées/sorties) : c'est l'app qui projette `queueSig()` vers `existingFilesSig` et le bind sur l'input.
- **`apps/pii-scanner-web/src/app/app.component.ts`** — nouveau `computed()` `existingFilesSig` qui projette la file (`queueSig()`) vers la forme `{name, size}[]` attendue par la drop-zone. Référence stable tant que la file ne change pas (compatible `OnPush`). Nouveau cas `"duplicate"` dans `rejectionLabel()` → libellé snackbar « déjà dans la file ».
- **Tests `drop-zone.spec.ts`** — 4 nouveaux tests : doublon `name+size` rejeté, même nom mais taille différente accepté (pas un doublon), doublon présent deux fois dans le même dépôt rejeté, plafond cumulé global respecté quand des fichiers sont déjà en file.
- **Tests `scan.service.spec.ts`** — 3 nouveaux tests : 2ᵉ appel à `scan()` ajoute à la file (pas de remplacement), rapport global agrège l'historique des deux lots, `reset()` purge bien l'historique cumulé.

### Modifications

- **`apps/pii-scanner-web/src/app/scan/scan.service.ts`** — `scan(files)` calcule un `offset = _queue().length` au démarrage, ajoute les nouvelles entrées via `_queue.update(prev => [...prev, ...additions])` au lieu de `_queue.set(initial)`. Les évènements `runScanStream` arrivent avec un `fileIndex` relatif au lot courant ; `applyEvent` reçoit l'`offset` pour cibler la bonne entrée dans la file globale. Nouveau champ privé `completedHistory: FileScanResult[]` qui accumule les résultats de tous les lots depuis le dernier `reset()` ; le `ScanReport` final est reconstruit à partir de `completedHistory.slice()`. `reset()` vide aussi `completedHistory`.
- **`packages/pii-detectors/package.json`** — bumpé `1.0.5` → `1.1.0`.
- **`packages/pii-scanner-engine/package.json`** — bumpé `1.0.5` → `1.1.0`.
- **`apps/pii-scanner-web/package.json`** — bumpé `1.0.5` → `1.1.0`.
- **Constantes `DETECTORS_VERSION` (`pii-detectors/src/index.ts`) et `ENGINE_VERSION` (`pii-scanner-engine/src/version.ts`)** alignées à `1.1.0`.
- **`README.md` — bloc « Statut »** : nouvelle puce « v1.1.0 » expliquant le sprint, ligne « S6.1 » ajoutée à la table roadmap, exemples de commandes (`docker pull`, `docker run`, `cosign verify`, `cosign verify-blob`) bumpés à `1.1.0`.

### Notes

- **Lockfile non régénéré.** Aucune dépendance externe modifiée. Les workspaces internes sont référencés en `link:` dans `pnpm-lock.yaml` (pas d'entrée versionnée), donc le bump des manifests n'a aucun impact sur le lockfile. Différent du sprint `v1.0.4` où une dépendance interne avait nécessité une régénération.
- **CSP intacte.** Cette feature est purement côté state Angular ; aucune nouvelle dépendance, aucun appel réseau, aucun changement de `Content-Security-Policy`. La promesse souveraineté reste tenue à l'identique.
- **API publique inchangée pour les packages npm.** `@rezdevops/pii-detectors` et `@rezdevops/pii-scanner-engine` ne reçoivent aucune modification d'API ni de comportement. Le bump à `1.1.0` est uniquement un alignement monorepo (cohérent avec les sprints précédents). Les consommateurs externes peuvent migrer sans aucune adaptation.

## [1.0.5] — 2026-05-03

Sprint S5.5 — **restitution des icônes Material en SVG inline souverains**. Aucun changement fonctionnel : 12 détecteurs, 10 formats et 4 exports strictement identiques à `v1.0.4`. Cette release répare un défaut visuel introduit pendant le durcissement souveraineté : les `<mat-icon>` rendaient leur nom textuel à la place du glyphe parce que la police « Material Icons » n'était pas chargée et que la CSP `connect-src 'none'` interdit par construction le fallback Google Fonts. Les 8 icônes utilisées sont désormais embarquées en SVG inline dans le code source de l'app, enregistrées au bootstrap via `MatIconRegistry.addSvgIconLiteral()`, sans aucune requête réseau ni concession sur la CSP.

### Corrections

- **`apps/pii-scanner-web/src/app/icons/icon-registry.ts` (nouveau)** — provider `provideMaterialIcons()` câblé dans `app.config.ts` qui enregistre 8 SVG Material Symbols Outlined (variante `wght 400`, viewBox `0 -960 960 960`, copies de `@material-symbols/svg-400/outlined/`, Apache 2.0) via `MatIconRegistry.addSvgIconLiteral()`. Choix de `addSvgIconLiteral` plutôt que `addSvgIcon(url)` parce que ce dernier passe par `HttpClient` — même vers la même origine, l'XHR est bloquée par `connect-src 'none'`. Les SVG sont patchés pour porter `fill="currentColor"` sur leur `<path>`, sans quoi `<mat-icon svgIcon="…">` ne pourrait pas hériter de la couleur du texte parent (les SVG bruts conservent leur fill noir par défaut). Inventaire embarqué : `cloud_upload` (drop-zone), `schedule` / `autorenew` / `check_circle` / `error` (statuts file de scan), `code` / `article` / `html` (boutons d'export). Coût bundle : ≈ 4 Ko de SVG inline, fondu dans le chunk principal.
- **`apps/pii-scanner-web/src/app/scan/drop-zone.component.ts`, `file-queue.component.ts`, `report.component.ts`** — bascule des 7 usages de `<mat-icon>nom</mat-icon>` vers `<mat-icon svgIcon="nom">` (ou `[svgIcon]="iconName(...)"` pour le cas dynamique de la file). Aucun changement de logique, juste de mécanisme de rendu.
- **`apps/pii-scanner-web/src/index.html` — commentaire CSP** : la section `img-src` / `font-src` mentionnait encore « icônes Material en data: SVG inline » et « police Roboto packagée », vestige du sprint S5 qui s'appuyait sur Google Fonts. Réécrit pour refléter la réalité : les SVG sont inlinés en TypeScript, aucune police n'est packagée (la stack système couvre tout le texte), `font-src 'self' data:` est conservée par anticipation. `connect-src 'none'` reste intact — la promesse souveraineté n'est en rien diluée par ce sprint.

### Modifications

- **`apps/pii-scanner-web/public/icons/*.svg` (8 nouveaux fichiers)** — copies versionnées des 8 SVG Material Symbols Outlined utilisés. Ces fichiers ne sont pas chargés au runtime (la CSP les bloquerait), mais conservés à des fins d'**audit humain** : toute personne souhaitant vérifier que les strings inline du `icon-registry.ts` sont bien des Material Symbols non altérés peut comparer ces fichiers avec le package `@material-symbols/svg-400/outlined/`. Servis statiquement par Angular CLI, donc également accessibles via `/icons/<nom>.svg` au cas où on voudrait les consulter dans le navigateur.
- **`apps/pii-scanner-web/public/icons/README.md` (nouveau)** — explique le double-emploi (référence d'audit + non-chargés au runtime) et la procédure de mise à jour (`npm install @material-symbols/svg-400 --no-save` + `sed` qui injecte `fill="currentColor"`, à reporter aussi dans `icon-registry.ts`).
- **`NOTICE`** — ajout du bloc « Composants tiers embarqués dans la SPA » avec attribution Material Symbols (Apache 2.0, Copyright 2024 Google LLC, modification mentionnée : `fill="currentColor"` injecté). Conformité licence Apache 2.0.
- **`packages/pii-detectors/package.json`** — bumpé `1.0.4` → `1.0.5`.
- **`packages/pii-scanner-engine/package.json`** — bumpé `1.0.4` → `1.0.5`.
- **`apps/pii-scanner-web/package.json`** — bumpé `1.0.4` → `1.0.5`.
- **Constantes `DETECTORS_VERSION` (`pii-detectors/src/index.ts`) et `ENGINE_VERSION` (`pii-scanner-engine/src/version.ts`)** alignées à `1.0.5`.
- **`README.md` — bloc « Statut »** : nouvelle puce « v1.0.5 » expliquant le sprint, ligne « S5.5 » ajoutée à la table roadmap, exemples de commandes (`docker pull`, `docker run`, `cosign verify`, `cosign verify-blob`) bumpés à `1.0.5`.

### Notes

- **Vérification visuelle après déploiement.** Cette release ne change rien à la logique métier, mais le seul moyen de constater le fix est d'ouvrir l'app et de regarder la dropzone, la file de scan et les boutons d'export. Sur la démo GitHub Pages, attendre que le job `deploy-pages` du workflow `release.yml` termine et vider le cache navigateur (`Ctrl+Shift+R`).
- **CSP intacte.** Aucune directive CSP n'a été assouplie. La promesse « zéro requête sortante observable en DevTools » reste tenue à l'identique. Le `MatIconRegistry.addSvgIconLiteral()` injecte du SVG dans le DOM via `innerHTML` — c'est du contenu déjà en mémoire JS, pas une requête réseau ; rien n'apparaît dans l'onglet Réseau.
- **Pas d'impact tests / lint / format.** Suite de tests inchangée (175 + 124 + 31 = 330 tests verts), `pnpm lint` et `pnpm format:check` verts, `pnpm build` produit `dist/browser` sans warning supplémentaire.

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

- **Le sous-domaine `pii-scanner.rezdevops.com` est reporté en `v1.1`.** La démo officielle `v1.0` reste sur l'URL GitHub Pages par défaut `rezdevops.github.io/pii-scanner-web` (zéro DNS, zéro charge ops). La bascule sera transparente côté SEO grâce au champ `homepage` du `package.json` qui restera la source de vérité.
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
