# Audit dépendances — v1.0.0 (sprint S5)

> Audit reconductible des vulnérabilités identifiées sur la branche `main`
> au moment de la livraison `v1.0.0` (S5, 2026-05-02). Méthode identique à
> [`audit-dependances-v0.4.1.md`](./audit-dependances-v0.4.1.md).
>
> Source : `pnpm audit` exécuté contre le `pnpm-lock.yaml` post-bumps S5.

## Synthèse

| Sévérité   | Compte | Décision                                            |
| ---------- | -----: | --------------------------------------------------- |
| `critical` |      0 | —                                                   |
| `high`     |      0 | —                                                   |
| `moderate` |      3 | toutes dev-only, reportées en `v1.1` (cf. plus bas) |
| `low`      |      0 | —                                                   |
| `info`     |    n/a | non comptabilisé                                    |

**État global** : aucune CVE critique ou élevée. Le pipeline release `release.yml` (job `verify`) bloque sur `pnpm audit --audit-level=high --prod` : la livraison `v1.0.0` passe ce filtre.

Les CVE `moderate` restantes sont **toutes dev-only** et non exposées au runtime utilisateur. Leur correction est conditionnée au pivot Angular 21 / Vitest 4 / TS 6 planifié en v1.1.

## Détail des vulnérabilités reportées

### 1. `esbuild` ≤ 0.24.x — `GHSA-67mh-4wv8-2f99` (`moderate`)

- **Vecteur** : serveur de développement esbuild (`SECURITY-67mh`) qui répond à n'importe quelle origine. Permet à un site malveillant de lire le code source d'un projet en cours de dev si l'utilisateur visite ce site avec un `pnpm dev` ouvert sur sa machine.
- **Surface dans ce projet** : transitive via `vite@<6` (Vitest 3 + Angular CLI 20). En `v0.4.1`, le bump `vitest@^3.1.1` a déjà absorbé une partie de la cascade ; il reste un chemin résiduel par `@angular/build`.
- **Exposition** : zéro en runtime utilisateur (esbuild n'est jamais embarqué dans le bundle prod). Risque dev-only : un développeur du projet, avec `pnpm dev` ouvert, qui visiterait un site malveillant.
- **Décision** : **reporté `v1.1`**. Sera absorbé par la migration Angular 21 (qui passe `@angular/build` à esbuild 0.25+).

### 2. `vite` ≤ 5.x — `GHSA-4w7w-66w2-5vf9` (`moderate`)

- **Vecteur** : faille de path traversal dans le serveur de dev de Vite, permet sous certaines conditions de lire un fichier hors du `root` configuré.
- **Surface dans ce projet** : transitive via `@angular/build@20.3.x` qui pin Vite 5.x.
- **Exposition** : zéro en runtime utilisateur. Risque dev-only similaire au point 1.
- **Décision** : **reporté `v1.1`**. Absorbé par la migration Angular 21 (qui passe à Vite 6+).

### 3. `uuid` ≤ 7.x via `webpack-dev-server` — `GHSA-…` (`moderate`)

- **Vecteur** : `uuid@<8` utilise `Math.random()` pour générer des UUIDs v4, ce qui fournit une entropie insuffisante pour un usage cryptographique.
- **Surface dans ce projet** : transitive par `webpack-dev-server` lui-même tiré par les outils Angular CLI. Pas d'usage cryptographique réel dans la chaîne (uuid est utilisé pour identifier des sessions de live-reload).
- **Exposition** : zéro en runtime utilisateur (webpack-dev-server n'est pas dans le bundle prod), zéro impact effectif (les UUIDs ne sont pas utilisés comme tokens).
- **Décision** : **reporté `v1.1`**. Absorbé par la migration Angular 21.

## Vulnérabilités runtime — état

### `xlsx` → migré vers `@e965/xlsx` en S5 ✅

- **Vecteurs identifiés en S4.1** : Prototype Pollution (`CVE-2023-30533`) + ReDoS sur certains motifs.
- **Action S5** : migration `xlsx@^0.18.5` → `@e965/xlsx@^0.20.3`. Le fork `@e965/xlsx` est un drop-in patché (même API, mêmes types). Modifications : 5 imports dans `packages/pii-scanner-engine/src/parsers/xlsx-parser.ts` + 1 ligne dans `packages/pii-scanner-engine/package.json`. ADR 0005 mise à jour (section « Mise à jour S5 »).
- **Statut au tag `v1.0.0`** : **résolu**. Plus aucune CVE high/critical sur les dépendances de production. Le filtre `pnpm audit --audit-level=high --prod` du job `verify` passe au vert.
- **Défense en profondeur conservée** : le parser XLSX continue de tourner dans un Web Worker isolé (cf. `parsers/xlsx-parser.ts` + `workers/scan-worker.ts`). C'est un filet de sécurité supplémentaire, pas une dépendance pour la sécurité de v1.0.
- **Suivi futur** : surveiller la maintenance de `@e965/xlsx`. En cas d'arrêt du fork ou de nouvelle CVE non patchée, repivoter (parser maison, ExcelJS si `.xls` legacy n'est plus une cible, etc.). Réévaluation à chaque audit dépendances semestriel.

### Autres parseurs binaires (`pdfjs-dist`, `mammoth`)

- `pdfjs-dist@^4.x` : aucune CVE high/critical au moment de v1.0.0. Configuré explicitement pour la souveraineté (`isEvalSupported: false`, `disableFontFace: true`, `useSystemFonts: false`, pas de `workerSrc` externe).
- `mammoth@^1.x` : aucune CVE high/critical au moment de v1.0.0. Lib pure JS, pas d'I/O réseau, dépendances minimales.

## Procédure d'audit reconductible

```bash
# CVE high+ uniquement, scope production (= ce qui finit dans le bundle prod) :
pnpm audit --audit-level=high --prod

# Vue complète (toutes les sévérités, prod + dev) :
pnpm audit

# JSON pour parser dans un outil externe :
pnpm audit --json > audit.json
```

Le job `verify` du `release.yml` exécute `pnpm audit --audit-level=high --prod` en bloquant. Toute CVE `high`/`critical` ajoute une rouge → tag impossible à publier sans correctif ou décision documentée ici.

## Décisions actées en S5

- **Bumps majeurs Angular 21 / Vitest 4 / TS 6** : reportés en `v1.1`. Le cadrage § 11 fixe Angular 20 pour la `v1.0`. Migrer en plein S5 sortait du périmètre 1,5 j-h.
- **Migration `xlsx` → `@e965/xlsx`** : **réalisée en S5** (initialement prévue en v1.1 — anticipée car les 2 CVE étaient classées `high` par GHSA et faisaient échouer le filtre `--audit-level=high --prod` du nouveau job `verify`). Drop-in, coût ~5 minutes, aucun changement d'API. Permet de garder le seuil CI strict sans dérogation.
- **`pnpm audit` en CI** : ajouté dans `release.yml` (job `verify`) et dans `ci.yml` au seuil `--audit-level=high`. Toute nouvelle CVE high/critical bloque automatiquement la PR.

## Signature

Audit posé le 2026-05-02 par Rudy Rezaire (RezDevOps). Sera reconduit à chaque sprint qui touche le `package.json` ou le `pnpm-lock.yaml`.
