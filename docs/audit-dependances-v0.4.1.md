# Audit dépendances — v0.4.1 (S4.1)

> Audit réalisé le **2026-05-02** dans le cadre du sprint S4.1 « durcissement plate-forme ». Cet audit couvre les vulnérabilités CVE connues, l'état d'obsolescence des paquets, et documente les décisions de mise à jour ou de report. Il sera reconduit à chaque sprint impactant les dépendances (cadrage § 12 « Engagements anti-dérive »).

## Méthode

```bash
pnpm install --frozen-lockfile
pnpm audit
pnpm outdated -r
```

L'audit est lancé sur l'arbre complet du monorepo (3 packages workspace + dev-deps racine). Les vulnérabilités sont classées en deux catégories : **runtime** (impacte l'utilisateur final qui ouvre l'app dans son navigateur) et **dev** (impacte uniquement les contributeurs / la chaîne de build).

## Vulnérabilités détectées

8 vulnérabilités au total (1 critical, 4 high, 3 moderate). **Aucune n'expose l'utilisateur final qui scanne ses fichiers** : 6 sont strictement dev-only (Vitest + Vite + esbuild + happy-dom + uuid via webpack-dev-server), 2 sont en runtime via SheetJS Community Edition (cf. plus bas).

### Dev-only — corrigées en v0.4.1

| CVE / GHSA           | Paquet      | Sévérité | Statut v0.4.1                                                                  |
| -------------------- | ----------- | -------- | ------------------------------------------------------------------------------ |
| GHSA-37j7-fg3j-429f  | `happy-dom` | critical | **Corrigée** — bump `^15.11.7` → `^20.0.0`                                     |
| GHSA-w4gp-fjgq-3q4g  | `happy-dom` | high     | **Corrigée** — incluse dans le bump 20                                         |
| GHSA-6q6h-j7hj-3r64  | `happy-dom` | high     | **Corrigée** — incluse dans le bump 20                                         |
| (advisory `>= 20.0`) | `happy-dom` | high     | **Corrigée** — incluse dans le bump 20                                         |
| GHSA-67mh-4wv8-2f99  | `esbuild`   | moderate | **Corrigée** — bump Vitest `^2.1.9` → `^3.1.1` (cascade vite 6 + esbuild 0.25) |
| GHSA-4w7w-66w2-5vf9  | `vite`      | moderate | **Corrigée** — incluse dans le bump Vitest 3                                   |

`happy-dom` est utilisé exclusivement comme environnement Vitest pour les tests qui touchent au DOM (`File`, `Blob`, `crypto.randomUUID`, templates Material). Il n'est jamais exécuté dans le navigateur de l'utilisateur final. Le bump a néanmoins été appliqué pour ne pas exécuter du code de test sur un sandbox vulnérable côté contributeurs / CI.

**Override déclaré** dans `package.json` racine :

```jsonc
"pnpm": {
  "overrides": {
    "happy-dom": "^20.0.0"  // remonte happy-dom à 20.x dans tous les chemins transitifs (vitest, etc.)
  }
}
```

Cet override couvre aussi les chemins transitifs `vitest@2.1.9 → happy-dom@15.x` qui auraient sinon résisté au bump direct.

**Note bump Vitest 3.x (au lieu de 4.x initialement envisagé)** : `@angular/build@20.3.25` (transitive de `@angular-devkit/build-angular`) déclare `vitest@^3.1.1` en peer dep. Rester sur Vitest 2.x produisait un warning `unmet peer`. Bumper à Vitest 3.x corrige le warning **et** ramène vite ≥ 6 + esbuild ≥ 0.25, soit les deux CVE moderate du tableau précédent. Vitest 3 introduit moins de breaking changes que Vitest 4 (la rupture majeure vise principalement l'API de mock que ce projet n'utilise pas — les 175 + 124 + ~31 specs sont à passer en revue mais pas réécrites).

### Dev-only — reportées (deps transitives non patchables)

| CVE / GHSA          | Paquet | Sévérité | Chemin                                                                    | Action                    |
| ------------------- | ------ | -------- | ------------------------------------------------------------------------- | ------------------------- |
| GHSA-w5hq-g745-h8pq | `uuid` | moderate | `@angular-devkit/build-angular → webpack-dev-server → sockjs → uuid@11.x` | Reportée (cf. ci-dessous) |

**Pourquoi reportées :**

- **`uuid`** : la version vulnérable est tirée par `@angular-devkit/build-angular` (`webpack-dev-server → sockjs`). Patcher `uuid` à `^14.0.0` casserait `sockjs` (ESM-only). Le bump propre passe par **Angular 21** (qui upgrade webpack-dev-server à une version qui ne dépend plus de `uuid` vulnérable), planifié en v0.5 ou v1.0. La vulnérabilité concerne un cas très spécifique (fourniture d'un `buffer` à `uuid.v3/v5/v6` sans bornes) que `sockjs` n'utilise pas. Risque effectif **nul**.

### Runtime — risque accepté pour v0.4.1

| CVE / GHSA          | Paquet | Sévérité | Statut                               |
| ------------------- | ------ | -------- | ------------------------------------ |
| GHSA-4r6h-8v6p-xvw6 | `xlsx` | high     | **Accepté pour v0.4.1**, plan v1.0 ↓ |
| GHSA-5pgg-2g8v-p4x9 | `xlsx` | high     | **Accepté pour v0.4.1**, plan v1.0 ↓ |

**SheetJS Community Edition** (le paquet `xlsx@0.18.5` sur npm) n'a **pas reçu de patch** pour ces deux vulnérabilités sur la branche distribuée via le registre npm. Le mainteneur a déplacé la distribution vers son propre CDN (`cdn.sheetjs.com`) pour les versions corrigées (≥ 0.20), tout en laissant la branche npm figée — ce qui est un choix de gouvernance documenté chez SheetJS mais problématique pour les consommateurs npm.

**Évaluation du risque effectif** :

- **Prototype Pollution (GHSA-4r6h-8v6p-xvw6)** : un `.xlsx` malveillant peut polluer `Object.prototype` au runtime. Vecteur d'exploitation : le scanner pourrait être altéré (faux positifs / faux négatifs) ou se comporter de façon imprévisible. Mitigation côté pii-scanner-web : nos détecteurs sont des objets gelés (`Object.freeze` indirect via `as const`), nous ne lisons jamais de propriétés sur des objets dynamiques sans guard `hasOwnProperty`.
- **ReDoS (GHSA-5pgg-2g8v-p4x9)** : un `.xlsx` malveillant avec une chaîne pathologique peut faire boucler une regex de SheetJS. Mitigation côté pii-scanner-web : le scan tourne dans un Web Worker isolé (`WorkerPoolRunner`, ADR 0003), un worker bloqué n'impacte pas l'UI ; l'utilisateur peut fermer l'onglet sans perte de données (zéro persistence).

**Plan v1.0** : migration vers `@e965/xlsx` (fork communautaire patché) ou `read-excel-file` (lib plus légère, parseur AOO XLSX-only sans le surface d'attaque XLS binaire historique). Décision sera tracée dans une nouvelle ADR. La migration est aussi l'occasion de drop le format `.xls` historique (Excel 97-2003) si retours utilisateurs le permettent — surface d'attaque réduite.

**Communication utilisateur** : le risque est documenté dans `docs/comment-verifier-souverainete.md` § « Et les fichiers Excel / PDF / Word — où va leur contenu ? » dès v0.4.1. La promesse souveraineté reste intacte (rien ne sort du navigateur), mais un .xlsx malveillant peut provoquer un comportement aberrant du scanner — un utilisateur prudent évitera de scanner des fichiers reçus de source non vérifiée.

## Paquets obsolètes — décisions

| Paquet                               | Actuel  | Latest  | Décision v0.4.1                                                         | Sprint cible si reporté                 |
| ------------------------------------ | ------- | ------- | ----------------------------------------------------------------------- | --------------------------------------- |
| `happy-dom` (dev)                    | 15.11.7 | 20.9.0  | **Bump → 20.x**                                                         | —                                       |
| `@angular/*` (runtime + dev)         | 20.3.x  | 21.2.x  | Reporté                                                                 | S5 / v0.5                               |
| `@angular-devkit/build-angular`      | 20.3.25 | 21.2.9  | Reporté                                                                 | S5 / v0.5                               |
| `@angular/cdk` + `@angular/material` | 20.2.14 | 21.2.9  | Reporté                                                                 | S5 / v0.5                               |
| `pdfjs-dist`                         | 4.10.38 | 5.7.284 | Reporté                                                                 | v0.5 (test compat sandbox + lazy chunk) |
| `vitest`                             | 2.1.9   | 4.1.5   | **Bump → 3.1.x** (corrige peer dep `@angular/build` + CVE esbuild/vite) | Vitest 4 reporté v1.0                   |
| `typescript`                         | 5.9.3   | 6.0.3   | Reporté                                                                 | v1.0 (TS 6 = breaking, à isoler)        |
| `husky`                              | 8.0.3   | 9.1.7   | Reporté                                                                 | v0.5                                    |
| `zone.js`                            | 0.15.1  | 0.16.1  | Reporté                                                                 | Inclus dans bump Angular 21             |
| `xlsx`                               | 0.18.5  | 0.18.5  | Bloqué npm                                                              | v1.0 → migration `@e965/xlsx` (cf. ↑)   |

**Critères de report** : tous les paquets reportés sont des majors. Aucune CVE active ne nécessite un bump immédiat sur ces paquets en runtime utilisateur. Le sprint S5 (release pipeline + landing) est le bon moment pour passer en revue Angular 21 (qui apporte aussi le `signal-input` stable, intéressant pour la dette technique de l'app).

## Vérifications additionnelles

### Licences

```bash
pnpm licenses list 2>/dev/null | sort -u  # (non-bloquant ici)
```

Les dépendances runtime sont toutes sous licence permissive compatible AGPL-3.0 :

- `papaparse` — MIT
- `mammoth` — BSD-2-Clause (cf. ADR 0004)
- `xlsx` — Apache-2.0 (cf. ADR 0005)
- `pdfjs-dist` — Apache-2.0 (cf. ADR 0006)
- `comlink` — Apache-2.0 (cf. ADR 0003)
- Angular ecosystem — MIT

Aucune dépendance copyleft transitive n'est embarquée. La distribution AGPL du SPA n'est pas contaminée par ses dépendances.

### Provenance npm

Les deux paquets publishables (`@rezdevops/pii-detectors`, `@rezdevops/pii-scanner-engine`) ont déjà `publishConfig.provenance: true` (posé en S0). À la première publication npm publique (planifiée S5 / v1.0), une attestation Sigstore sera attachée à chaque tarball, vérifiable via `npm audit signatures`.

## Réexécution

Cet audit doit être ré-exécuté :

- À chaque ajout / mise à jour de dépendance.
- Au minimum **mensuellement** sur la branche `main` (la CI GitHub Actions a un job `codeql.yml` hebdo, mais le `pnpm audit` n'est pas encore dans le pipeline — à ajouter en S5 dans `ci.yml` avec `pnpm audit --audit-level=high`).
- Avant chaque release tagged.

Les résultats de chaque ré-exécution sont versionnés (un nouveau document `audit-dependances-vX.Y.Z.md` par release majeure ou critique).
