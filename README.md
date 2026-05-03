# pii-scanner-web

[![CI](https://github.com/RezDevOps/pii-scanner-web/actions/workflows/ci.yml/badge.svg)](https://github.com/RezDevOps/pii-scanner-web/actions/workflows/ci.yml)
[![CodeQL](https://github.com/RezDevOps/pii-scanner-web/actions/workflows/codeql.yml/badge.svg)](https://github.com/RezDevOps/pii-scanner-web/actions/workflows/codeql.yml)
[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-blue.svg)](LICENSE)
[![npm pii-detectors](https://img.shields.io/npm/v/@rezdevops/pii-detectors?label=%40rezdevops%2Fpii-detectors)](https://www.npmjs.com/package/@rezdevops/pii-detectors)
[![npm pii-scanner-engine](https://img.shields.io/npm/v/@rezdevops/pii-scanner-engine?label=%40rezdevops%2Fpii-scanner-engine)](https://www.npmjs.com/package/@rezdevops/pii-scanner-engine)
[![GHCR Image](https://img.shields.io/badge/GHCR-pii--scanner--web-blue?logo=docker)](https://github.com/RezDevOps/pii-scanner-web/pkgs/container/pii-scanner-web)

> Scanner local de données personnelles. Les fichiers ne quittent jamais votre navigateur.

`pii-scanner-web` est une application web Angular qui détecte les données à caractère personnel (PII) dans des fichiers bureautiques courants — Excel, CSV, PDF, Word, JSON, HTML — et produit un rapport RGPD lisible en quelques secondes. **Le traitement est intégralement local au navigateur** : aucun octet n'est envoyé sur le réseau, et la propriété est vérifiable en direct (Content Security Policy stricte, DevTools = zéro requête sortante).

C'est le second utilitaire vitrine [RezDevOps](https://github.com/RezDevOps), après [`fec-check`](https://github.com/RezDevOps/fec-check).

## Démo en ligne

**[rezdevops.github.io/pii-scanner-web](https://rezdevops.github.io/pii-scanner-web/)** — déposez un fichier, ouvrez DevTools (F12) → onglet Réseau, observez : aucune requête sortante.

## Statut

**v1.0.4 — hotfix cosign image name (lowercase OCI).** Le step `Sign image (keyless)` du job `build-docker` plantait après un push GHCR pourtant réussi : `Error: signing [...]: parsing reference: could not parse reference: ghcr.io/RezDevOps/pii-scanner-web@sha256:...`. La spec OCI/Docker impose des noms de repository en minuscules ; `cosign sign` (qui utilise go-containerregistry) refuse les majuscules, là où le client Docker normalisait silencieusement. L'expression `${{ github.repository_owner }}` retournait `RezDevOps` en CamelCase. Hard-codage de `IMAGE_NAME: ghcr.io/rezdevops/pii-scanner-web` en lowercase dans `release.yml`. Corrige aussi les commandes `cosign verify` du body GitHub Release que le user pouvait copier-coller. Aucun changement fonctionnel : 12 détecteurs, 10 formats, 4 exports inchangés depuis `v0.4.1`.

| Jalon                                                                      | Statut   | Sortie                |
| -------------------------------------------------------------------------- | -------- | --------------------- |
| S0 — Squelette repo, README, LICENSE, ADRs, CI minimale                    | ✅ livré | premier commit public |
| S1 — Couche détecteurs (5 cœur : email, tel FR, NIR, IBAN, SIRET)          | ✅ livré | tag `v0.1.0`          |
| S2 — Engine + parseurs texte (CSV/TSV/TXT/MD/JSON) + pool Workers + façade | ✅ livré | tag `v0.2.0`          |
| S2.1 — Parseurs binaires (XLSX / XLS / PDF / DOCX / HTML)                  | ✅ livré | tag `v0.2.1`          |
| S3 — UI Angular (drop zone, rapport interactif, branchement pool)          | ✅ livré | tag `v0.3.0`          |
| S4 — 7 détecteurs étendus + exports JSON / Markdown / HTML autonome        | ✅ livré | tag `v0.4.0`          |
| S4.1 — CSP stricte + audit deps + WCAG AA + lazy-loading parseurs binaires | ✅ livré | tag `v0.4.1`          |
| S5 — Pipeline release multi-cibles + landing + page vérifier publique      | ✅ livré | tag `v1.0.0`          |
| S5.1 — Hotfix CI release (build packages avant bundle Angular)             | ✅ livré | tag `v1.0.1`          |
| S5.2 — Hotfix CI SBOM (cyclonedx-npm → cdxgen, compat pnpm)                | ✅ livré | tag `v1.0.2`          |
| S5.3 — Hotfix Docker multi-arch (Dockerfile mono-stage, plus de QEMU)      | ✅ livré | tag `v1.0.3`          |
| S5.4 — Hotfix cosign image name (lowercase OCI imposé par spec)            | ✅ livré | **tag `v1.0.4`**      |

## Promesse

Quand un dirigeant, un DPO ou un RH se demande « est-ce que ce fichier que je m'apprête à envoyer contient des données qui ne devraient pas sortir ? », il a aujourd'hui le choix entre des outils DLP enterprise hors de prix, des SaaS américains qui exigent l'upload du fichier (le paradoxe absolu), ou une inspection manuelle irréaliste sur un fichier de 50 000 lignes.

`pii-scanner-web` cible ce moment. **Vérifier à froid, en cinq secondes, depuis son navigateur, sans rien envoyer nulle part.**

## Périmètre v1.0

**Douze détecteurs**, dont cinq avec validation par clé de contrôle :

- _Identifiants de personne_ — email, téléphone FR, **NIR** (clé MOD 97)
- _Identifiants administratifs_ — **SIRET / SIREN** (Luhn), **TVA intracom FR** (Luhn sur SIREN)
- _Identifiants bancaires_ — **IBAN** (MOD 97), BIC/SWIFT, **carte bancaire** (Luhn)
- _Coordonnées géographiques_ — code postal FR, adresse postale FR (heuristique)
- _Identifiants matériels et temporels_ — plaque d'immatriculation FR, date de naissance contextuelle

**Dix formats de fichier** : `.csv` `.tsv` `.xlsx` `.xls` `.pdf` `.docx` `.txt` `.md` `.json` `.html`.

**Quatre formats de sortie** : rapport interactif dans la SPA, export JSON (schéma versionné), export Markdown (lecture DPO), export HTML autonome (single-file, CSP stricte, sans script).

Pour le détail, voir `docs/detecteurs.md` et `docs/exports.md`.

## Distribution

Quatre canaux de livraison, tous open-source AGPL-3.0. Chaque release est signée [sigstore](https://docs.sigstore.dev/) (cosign keyless OIDC) et accompagnée d'un SBOM CycloneDX.

### Démo en ligne

```text
https://rezdevops.github.io/pii-scanner-web/
```

Hébergée sur GitHub Pages. Statique, aucun backend.

### Image Docker

Multi-arch (`linux/amd64` + `linux/arm64`), tourne en `nginx-unprivileged` sur le port 8080.

```bash
docker pull ghcr.io/rezdevops/pii-scanner-web:1.0.0   # version épinglée
docker pull ghcr.io/rezdevops/pii-scanner-web:latest  # rolling

docker run --rm -p 8080:8080 ghcr.io/rezdevops/pii-scanner-web:1.0.0
# → http://localhost:8080
```

Vérifier la signature de l'image :

```bash
cosign verify ghcr.io/rezdevops/pii-scanner-web:1.0.0 \
  --certificate-identity-regexp 'https://github.com/RezDevOps/pii-scanner-web/.github/workflows/release.yml@refs/tags/v.+' \
  --certificate-oidc-issuer https://token.actions.githubusercontent.com
```

### Archive ZIP standalone

Téléchargeable depuis la [page Releases GitHub](https://github.com/RezDevOps/pii-scanner-web/releases/latest). Décompressez, double-cliquez sur `index.html`, ça fonctionne hors ligne. Aucune installation requise. La signature `.sig` + le certificat `.pem` accompagnent l'archive.

```bash
cosign verify-blob \
  --certificate pii-scanner-web-v1.0.0-standalone.zip.pem \
  --signature   pii-scanner-web-v1.0.0-standalone.zip.sig \
  --certificate-identity-regexp 'https://github.com/RezDevOps/pii-scanner-web/.github/workflows/release.yml@refs/tags/v.+' \
  --certificate-oidc-issuer https://token.actions.githubusercontent.com \
  pii-scanner-web-v1.0.0-standalone.zip
```

### Packages npm

Pour intégrer les détecteurs ou l'engine dans votre propre outil :

```bash
npm install @rezdevops/pii-detectors @rezdevops/pii-scanner-engine
```

Les deux packages sont publiés avec `provenance: true` (signature OIDC `sigstore`).

## Comment vérifier la promesse souveraineté

Le fichier [`docs/comment-verifier-souverainete.md`](docs/comment-verifier-souverainete.md) détaille le mode opératoire pas à pas. Il est aussi servi en ligne sous [`/verifier/`](https://rezdevops.github.io/pii-scanner-web/verifier/) (page autonome, hors SPA).

En une phrase : ouvrir DevTools (onglet Réseau), déposer un fichier, lancer le scan, constater zéro requête sortante. Tout le code est auditable, la CSP est lisible dans `index.html`, le résultat est reproductible en moins d'une minute.

## Sécurité

Politique de signalement : voir [`SECURITY.md`](SECURITY.md). Les vulnérabilités peuvent être signalées en privé via `GitHub Security Advisories` ou par email à `r.rezaire@gmail.com`.

L'audit des dépendances est documenté à chaque sprint qui touche le `package.json` ou le lockfile (`docs/audit-dependances-v*.md`). La CI bloque sur toute nouvelle vulnérabilité de niveau `high` ou `critical` (`pnpm audit --audit-level=high`).

## Développement

```bash
# Prérequis : Node 20+ et pnpm 9+
pnpm install --frozen-lockfile
pnpm format:check  # Prettier (CI bloquant)
pnpm build         # build des trois couches (ordre : packages avant app)
pnpm lint          # tsc --noEmit sur les deux tsconfig
pnpm test          # tests Vitest (~330 verts : 175 détecteurs + 124 engine + ~31 app dont 4 axe-core a11y)
pnpm dev           # SPA Angular en watch sur http://localhost:4200
```

L'ordre `format:check → build → lint → test` est volontaire : le `lint` (= `tsc --noEmit`) lit les `dist/*.d.ts` du package frère, donc le build doit passer avant. Voir `.github/workflows/ci.yml`.

L'architecture est en trois couches indépendantes :

- `@rezdevops/pii-detectors` — bibliothèque pure, sans I/O ni DOM. Publiée sur npm public.
- `@rezdevops/pii-scanner-engine` — orchestration des parseurs et du pool de workers. Publiée sur npm public.
- `pii-scanner-web` — application Angular, UI uniquement.

Cette séparation prépare une éventuelle déclinaison CLI ou desktop (Tauri) sans refonte. Voir `docs/architecture.md` et `docs/adr/`.

## Build local Docker

```bash
pnpm install --frozen-lockfile
pnpm build              # produit apps/pii-scanner-web/dist/browser/
docker build -t pii-scanner-web:dev .
docker run --rm -p 8080:8080 pii-scanner-web:dev
```

Depuis `v1.0.3`, l'image est mono-stage (`nginx-unprivileged` 1.27 alpine uniquement) et requiert que le dist Angular soit déjà construit côté hôte avant `docker build`. Ce choix élimine le besoin d'émulation QEMU pendant le build multi-arch (cf. release `v1.0.2` où l'ancien builder Node sous QEMU arm64 plantait sur instructions SIMD non émulées). Aucun appel réseau au runtime. Configuration nginx auditable dans [`docker/nginx.conf`](docker/nginx.conf).

## Licence

[**AGPL-3.0**](LICENSE). Auditable, auto-hébergeable, libre d'usage. Le choix de l'AGPL plutôt que MIT est argumenté dans [`docs/adr/0002-licence-agpl.md`](docs/adr/0002-licence-agpl.md) — il protège la promesse souveraineté contre un repackaging SaaS opportuniste.

## Auteur

[Rudy Rezaire](https://github.com/RezDevOps) — RezDevOps, audit et applications web sur mesure pour TPE/PME.

L'outil signale des présences probables de PII et qualifie leur criticité ; il **n'interprète pas** la conformité RGPD. L'avis d'un avocat ou d'un DPO certifié reste indispensable.
