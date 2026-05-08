# Bootstrap repo `pii-scanner-web`

Configurations GitHub UI et outils locaux requis pour qu'un fork (ou un nouveau repo qui réutilise ce template) puisse exécuter le pipeline `release.yml` de bout en bout sans casse.

Document à jour au 2026-05-08 (sprint S7, v1.2.0).

## Outils locaux

| Outil  | Version requise                                              | Vérification     |
| ------ | ------------------------------------------------------------ | ---------------- |
| Node   | `>=20.19` (ou 22.12+, 24+)                                   | `node --version` |
| pnpm   | `>=9` (testé sur 9.12.0)                                     | `pnpm --version` |
| Git    | `>=2.40`                                                     | `git --version`  |
| gh CLI | `>=2.40` (optionnel mais recommandé pour PR + monitoring CI) | `gh --version`   |
| cosign | optionnel, pour vérifier signatures localement               | `cosign version` |

Le bump Node `>=20.19` (depuis v1.2.0) est imposé par `@angular-devkit/build-angular@21` (`engines.node = ^20.19.0 || ^22.12.0 || >=24.0.0`). Si vous êtes en Node 20.18 ou inférieur, `pnpm install` warn (et plante avec `engine-strict=true` dans votre `.npmrc`).

## Secrets GitHub à configurer (`Settings → Secrets and variables → Actions → Secrets`)

| Nom du secret | Rôle                                                                                                                                                  | Source                                                  |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| `NPM_TOKEN`   | Token de publication npm pour `@rezdevops/pii-detectors` et `@rezdevops/pii-scanner-engine`. Type **Automation** (lecture+écriture, sans 2FA prompt). | `npmjs.com → User → Access Tokens → Generate New Token` |

Aucun autre secret repo n'est requis. `GITHUB_TOKEN` est fourni automatiquement par GitHub Actions et utilisé pour push GHCR.

À terme : basculer la publication npm en **Trusted Publisher OIDC** (`npmjs.com → package settings → Publishing access → Add Trusted Publisher`) pour supprimer `NPM_TOKEN`. Le pipeline `release.yml` utilise déjà `id-token: write` côté job, donc la bascule sera transparente côté CI.

## Environnement protégé `github-pages`

Le job `deploy-pages` du `release.yml` cible l'environnement `github-pages`. Configuration requise (`Settings → Environments → github-pages`) :

- **Deployment branches and tags** : ajouter une règle `Selected tags` autorisant le pattern `v*`. Sans cette règle, le job tag-triggered échouera avec « Branch protection rule violations ».
- Aucun reviewer requis (le déploiement est automatique sur tag `v*`).
- Aucun secret d'environnement nécessaire (les permissions `pages: write` + `id-token: write` du workflow suffisent).

## Permissions workflow

Le `release.yml` déclare des permissions par job (granulaires). Pré-conditions GitHub (`Settings → Actions → General → Workflow permissions`) :

- **Workflow permissions** : laissé sur « Read repository contents and packages permissions » (par défaut). Les jobs élèvent leurs propres permissions selon besoin.
- **Allow GitHub Actions to create and approve pull requests** : non requis pour ce workflow.

Permissions élevées par job (déjà déclarées dans le YAML, à titre de référence) :

| Job               | Permissions élevées                   | Rôle                                      |
| ----------------- | ------------------------------------- | ----------------------------------------- |
| `publish-npm`     | `id-token: write`                     | npm provenance OIDC                       |
| `build-docker`    | `packages: write` + `id-token: write` | push GHCR + cosign keyless                |
| `deploy-pages`    | `pages: write` + `id-token: write`    | déploiement Pages OIDC                    |
| `release` (final) | `contents: write` + `id-token: write` | création GH Release + signatures sigstore |

## GitHub Pages

`Settings → Pages` :

- **Source** : `GitHub Actions` (pas `Deploy from a branch`). Le déploiement est piloté par le job `deploy-pages` du `release.yml`, plus le workflow `deploy-pages.yml` en filet de secours `workflow_dispatch`.
- **Custom domain** : laissé vide en v1.2.0. Le sous-domaine `pii-scanner.rezdevops.com` est reporté à un sprint futur, l'URL officielle reste `https://rezdevops.github.io/pii-scanner-web/`.

## GitHub Container Registry (GHCR)

Aucune configuration spéciale requise au niveau repo. Le job `build-docker` utilise `secrets.GITHUB_TOKEN` (fourni automatiquement) avec `permissions.packages: write` pour pousser sur `ghcr.io/<owner>/<repo>`.

Au niveau **Organisation** (si fork dans une org), vérifier `Settings → Packages → Package creation` autorise les packages publics.

## Visibilité des packages publiés

À la première publication (v1.0.0), les packages sont créés en privé par défaut sur GHCR. À basculer manuellement en public **une fois** :

`https://github.com/<owner>?tab=packages → pii-scanner-web → Package settings → Change visibility → Public`

Idem côté npm si la première publication a été faite avec `--access=restricted` par défaut. Le `package.json` des deux packages déclare `"publishConfig": { "access": "public" }` donc cette manip n'est en principe pas nécessaire — vérifier sur npmjs.com.

## Cosign keyless (sigstore)

Aucune configuration requise. Le job `build-docker` utilise `cosign-installer@v3` puis `cosign sign --yes ...` en mode keyless OIDC, qui s'authentifie automatiquement auprès de Fulcio via le token OIDC du runner GitHub. Les signatures sont publiées sur le transparency log `rekor.sigstore.dev`.

Pour vérifier une image signée localement :

```bash
cosign verify ghcr.io/rezdevops/pii-scanner-web:1.2.0 \
  --certificate-identity-regexp 'https://github.com/RezDevOps/pii-scanner-web/.*' \
  --certificate-oidc-issuer 'https://token.actions.githubusercontent.com'
```

## Première release sur un fork

Checklist minimale pour qu'un fork puisse tagger sa propre release :

1. Cloner le fork, vérifier `node --version` >= 20.19, `pnpm --version` >= 9.
2. Créer le secret `NPM_TOKEN` (cf. supra), même si la première release ne publie pas (le workflow ne plantera pas en absence de token, mais le job `publish-npm` sera skip).
3. Configurer l'environnement `github-pages` avec règle Tag `v*`.
4. Activer Pages en mode `GitHub Actions`.
5. Vérifier `Settings → Actions → General → Workflow permissions`.
6. `git tag -a v0.0.1 -m "first release"` puis `git push origin v0.0.1`.
7. Surveiller le run `release.yml` dans l'onglet Actions. Le premier run peut échouer sur les permissions GHCR si l'org n'autorise pas les packages — cf. supra.

## Notes pour les futurs utilitaires vitrines RezDevOps

Ce repo sert de référence pour les prochains utilitaires vitrines. Points d'attention transposables :

- **Worker app-side** (cf. ADR-008) : ne jamais livrer un script worker dans le `dist/` d'un package npm. Le caller doit héberger son propre worker côté app, qui consomme la logique via la surface publique du package.
- **`pnpm.overrides`** dans le `package.json` racine pour patcher les CVE de transitives (Angular 21 ne propage pas les patchs de sa chaîne `ajv > fast-uri` ni `@modelcontextprotocol/sdk > express-rate-limit > ip-address` dans la mineure 21.2 au 2026-05-08).
- **Pin par mineure** dans `pnpm add @21.2`, jamais par patch (`@21.2.10` casse parce que `@angular/cli@21.2.10` peut ne pas exister quand `@angular/core@21.2.12` existe).
- **`ng update` plante** dans les monorepos pnpm avec `tsconfig.base.json` externalisé. Stratégie : bump manuel via `pnpm add @21.2`.
