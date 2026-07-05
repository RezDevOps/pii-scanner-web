# ADR 0011 — Migration du package manager : pnpm 9 → pnpm 10

- **Statut** : **accepted**
- **Date** : 2026-07-05
- **Décideurs** : Rudy Rezaire (RezDevOps)
- **Contexte** : chantier d'hygiène outillage, à la suite de la migration CI Node 22/24 (ADR 0010). Aligne `pii-scanner-web` sur `rezdevops-site` (déjà en pnpm 10).

## Contexte

Le repo était figé sur `pnpm@9.12.0` (`packageManager` + `engines.pnpm: >=9`). Le repo de référence `rezdevops-site` est passé en pnpm 10 dès le sprint S19 (v1.10.0) et tourne dessus en production. `pii-scanner-web` restait le dernier repo pnpm de RezDevOps sur la ligne 9.x. La migration pnpm 10 était le seul chantier d'infra encore ouvert après la clôture de la vague Node.

pnpm 10 (dernière 10.34.4 au 2026-07-05 ; pnpm 11 existe mais on reste sur le même majeur que `rezdevops-site` pour la cohérence inter-repos) introduit un changement de comportement structurant : **`pnpm install` n'exécute plus les scripts de build (`preinstall`/`install`/`postinstall`) des dépendances par défaut**. C'est un durcissement supply-chain : une dépendance transitive compromise ne peut plus exécuter de code arbitraire à l'installation sans y avoir été explicitement autorisée via `pnpm.onlyBuiltDependencies`.

## Décision

**Bump `packageManager` `pnpm@9.12.0` → `pnpm@10.34.4`** et **`engines.pnpm` `>=9` → `>=10`** dans le `package.json` racine. Rien d'autre au niveau manifeste ou lockfile.

**Lockfile inchangé.** pnpm 9 et pnpm 10 partagent le format `lockfileVersion: '9.0'` et la même stratégie de résolution : régénérer le lockfile avec pnpm 10.34.4 produit un fichier byte-identique. `pnpm install --frozen-lockfile` sous pnpm 10 renvoie « Lockfile is up to date » (exit 0). Rien à committer côté `pnpm-lock.yaml`.

**Pas d'allowlist `onlyBuiltDependencies`.** Sous pnpm 10, l'install signale « Ignored build scripts » pour `esbuild` (0.27.3/0.27.7/0.28.1), `@parcel/watcher@2.5.6`, `lmdb@3.5.1` et `msgpackr-extract@3.0.3`. Aucun n'est requis : ces paquets embarquent des binaires prébuildés (via `optionalDependencies` de plate-forme, ex. `@esbuild/linux-x64`) ou disposent d'un fallback JS (lmdb/msgpackr côté cache de build Angular, `@parcel/watcher` côté `pnpm dev` en watch uniquement). `pnpm build`, `pnpm test` et `pnpm audit --prod` passent sans allowlist. Ce choix reproduit `rezdevops-site` (aucun `onlyBuiltDependencies`) et s'aligne sur la posture souveraine du repo : ne pas exécuter de scripts de build de dépendances est un durcissement, pas une régression.

**Pas de flag `--legacy`.** Le flag `--legacy` de `pnpm deploy` (restituant le comportement pnpm 9) ne concerne pas ce repo : `pii-scanner-web` ne se déploie pas via `pnpm deploy` (distribution par GitHub Pages statique + image Docker nginx qui copie un `dist/` pré-buildé, cf. ADR 0009 / Dockerfile). Aucune commande `pnpm deploy` dans le repo.

**Aucun changement de workflow.** Les trois workflows Node (`ci.yml`, `release.yml`, `deploy-pages.yml`) utilisent déjà `corepack enable`, qui lit le champ `packageManager` et provisionne pnpm 10.34.4 sans version codée en dur. Le `Dockerfile` n'installe ni n'exécute pnpm (copie statique du dist). `codeql.yml` n'installe pas Node.

## Justification

- **Cohérence inter-repos.** `rezdevops-site` est en pnpm 10 en prod depuis S19. Uniformiser `pii-scanner-web` supprime la dernière divergence de package manager entre les repos pnpm RezDevOps.
- **Durcissement supply-chain aligné sur l'ADN du produit.** Le blocage par défaut des scripts de build est exactement le genre de garantie que `pii-scanner-web` met en avant (souveraineté, exécution locale, zéro confiance implicite). L'adopter sans allowlist est cohérent, pas subi.
- **Coût de migration quasi nul.** Lockfile inchangé, workflows inchangés, Dockerfile inchangé : deux lignes de manifeste + doc. Le risque de régression est minimal et entièrement couvert par la CI existante (build/test/lint/audit).

## Conséquences

- **Message « Ignored build scripts » à chaque install.** Attendu et documenté (README + BOOTSTRAP). Non bloquant. Si un jour un de ces paquets perdait son binaire prébuilt ou son fallback, la correction serait d'ajouter `pnpm.onlyBuiltDependencies` ciblé — pas de désactiver le durcissement globalement.
- **Contributeurs sous pnpm 9.** `pnpm install` avertira sur `engines.pnpm >=10` (et plantera avec `engine-strict=true`). Corepack (`corepack enable`) provisionne automatiquement la bonne version depuis `packageManager` : inutile d'installer pnpm globalement.
- **Reste sur le majeur 10.** pnpm 11 est disponible mais non adopté : on ne devance pas `rezdevops-site`. Une éventuelle montée 11 sera un chantier commun ultérieur.

## Alternatives considérées

- **Ajouter `onlyBuiltDependencies` pour esbuild/@parcel/watcher/lmdb/msgpackr-extract** — rejeté : inutile (binaires prébuildés / fallback JS), et exécuter ces scripts irait à l'encontre du durcissement que pnpm 10 apporte. `rezdevops-site` fonctionne sans.
- **Passer directement à pnpm 11** — rejeté pour ne pas diverger du repo de référence ni empiler deux sauts de majeur d'un coup.
- **Poser `inject-workspace-packages=true` + adopter le nouveau `pnpm deploy`** — sans objet : le repo n'utilise pas `pnpm deploy`.

## Validation

Régénération et `--frozen-lockfile` testés hors-mount avec pnpm 10.34.4 : lockfile byte-identique au lockfile committé, `pnpm install --frozen-lockfile` → « Lockfile is up to date » (exit 0). `pnpm audit --audit-level=high --prod` → « No known vulnerabilities found ». Bumps limités à `package.json` (racine) + doc (`README.md`, `BOOTSTRAP.md`, cet ADR, index ADR, CHANGELOG). CI attendue verte (corepack provisionne pnpm 10 sur la matrice `["22", "24"]`).
