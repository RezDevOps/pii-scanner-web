# ADR 0005 — SheetJS Community Edition (`@e965/xlsx`) pour XLSX/XLS

- **Statut** : **accepted** (mis à jour S5 / `v1.0.0` — bascule de `xlsx` vers `@e965/xlsx`)
- **Date** : 2026-05-02 (sprint S2.1, mise à jour 2026-05-02 sprint S5)
- **Décideurs** : Rudy Rezaire (RezDevOps)
- **Contexte** : sprint S2.1 — activation des parseurs binaires reportés depuis `v0.2.0`. Mise à jour S5 — migration de la dépendance vers le fork patché.

## Contexte

`.xlsx` (Office Open XML, ECMA-376) et `.xls` (BIFF, format binaire Excel 97-2003) sont les deux formats Excel grand public. La cible DPO/RSSI/auditeurs reçoit massivement des exports CRM ou des listings RH dans ces formats. Trois options regardées :

1. **SheetJS Community Edition** (`xlsx` sur npm) — bibliothèque historique du parsing Excel en JS.
2. **ExcelJS** — alternative moderne, lecture/écriture, focus xlsx.
3. **Parser maison** (zip + XML pour xlsx, OLE2 pour xls) — réinvente plus que ce que ça simplifie.

## Décision

**SheetJS Community Edition via le fork `@e965/xlsx` sur npm.**

Au sprint S2.1, la décision initiale ciblait le package officiel `xlsx@^0.18.5` distribué historiquement sur npm. Au sprint S5, la dépendance a été migrée vers le fork drop-in `@e965/xlsx@^0.20.x` qui patche les CVE connues de la branche officielle. L'API publique, les types et la signature des fonctions consommées (`read`, `utils.decode_range`, `utils.encode_cell`, `WorkSheet`, `CellObject`) sont strictement identiques — la migration consiste à modifier 5 imports et 1 ligne du `package.json` de l'engine.

## Justification

- **Couverture des deux formats.** SheetJS lit indistinctement `.xlsx` et `.xls` (et même `.xlsm`, `.xlsb`, `.ods`, `.csv`, etc.) avec la même API. ExcelJS ne couvre pas `.xls` legacy, ce qui exclut une partie significative des fichiers reçus en TPE/PME.
- **API mature et documentée.** `XLSX.read(arrayBuffer, { type: "array", cellDates: true })` + itération via `XLSX.utils.decode_range` couvre 100% de notre besoin. Le contrat `cell.t` / `cell.v` / `cell.w` est stable depuis des années.
- **Licence Apache 2.0.** Permissive, compatible avec l'AGPL de l'app sans contamination réciproque.
- **Pas de dépendance native ni de Worker imposé.** Tourne en environnement Node, navigateur, et workers (ce qui sera utile si on déplace le parsing dans un Web Worker en S3+).
- **Mature et largement éprouvée.** ~5 M téléchargements/semaine, audit de sécurité régulier, base de tests fournie.

## Conséquences

- Dépendance de `@rezdevops/pii-scanner-engine` : `@e965/xlsx@^0.20.x` (fork patché de SheetJS CE). Justifiée par cette ADR.
- **Coût bundle ~250 ko gzip** sur l'app navigateur. C'est le coût d'entrée pour ces formats — toute alternative qui ne réinvente pas le ZIP+XML+OLE2 sera dans la même fourchette. Tree-shaking partiel possible (on n'importe que `read` et `utils`).
- L'API expose des objets `WorkBook` / `WorkSheet` / `CellObject` — on les abstrait derrière notre `FileParser` pour garder le contrat interne propre, et on ne les leak pas dans la surface publique de l'engine.
- **Formules non évaluées** : si une cellule contient `=A1+B1` sans valeur cachée, on ignore. SheetJS peut évaluer (`cell.f` + utils dédiés) mais c'est hors scope (PII ne sont quasi jamais dans les formules).
- **xlsm / xlsb / ods** ne sont **pas** routés dans `format.ts` en v0.2.1 — on garde un périmètre net (xlsx + xls). Activable plus tard sans changement de parseur si besoin.

## Alternatives considérées

- **ExcelJS** — plus moderne mais ne lit pas `.xls`. Bloquant pour notre cible.
- **node-xlsx** — wrapper simpliste autour de SheetJS, pas d'avantage.
- **Parser maison via `fflate` + `DOMParser`** — possible pour xlsx (zip + XML) mais pas pour xls (OLE2 binaire), et la valeur ajoutée par rapport à SheetJS est marginale.

## Note sur SheetJS Pro

SheetJS Pro (commercial) ajoute des features (export styles avancés, macros, etc.) hors scope ici. La Community Edition Apache 2.0 couvre tous nos besoins.

## Mise à jour S5 — migration `xlsx` → `@e965/xlsx`

### Problème

Le package historique `xlsx` sur npm (`xlsx@^0.18.5`) reste vulnérable à deux CVE non corrigées sur la branche libre :

- **`CVE-2023-30533`** — Prototype Pollution. Permet à un fichier `.xlsx` malicieux d'altérer `Object.prototype` pendant le parsing, créant un risque de tampering ou d'injection sur le contexte JS qui consomme ensuite le résultat.
- **ReDoS (Regular Expression Denial of Service)** — un motif particulier dans une feuille peut faire entrer une regex interne en backtracking exponentiel, bloquant le thread où tourne le parseur.

L'éditeur SheetJS a basculé sa distribution officielle hors npm (sur `cdn.sheetjs.com`) et ne pousse plus de patches sur le tag npm `xlsx`. Les CVE sont corrigées dans la version commerciale et dans le tag `@e965/xlsx` distribué publiquement par un mainteneur de la communauté qui synchronise les patches.

### Mitigation déjà en place avant migration

Dans `pii-scanner-web` jusqu'à `v0.4.1`, le parseur XLSX tournait dans un Web Worker isolé du thread principal. Une attaque réussie aurait donc pollué le `Object.prototype` du Worker, pas du thread principal — l'impact était contenu. La ReDoS, elle, ne peut être déclenchée que par un fichier que l'utilisateur charge lui-même : ce n'est pas un vecteur d'attaque externe mais un risque de DoS auto-infligé.

Cette mitigation reste en place après migration et constitue une défense en profondeur.

### Décision S5

Migration vers **`@e965/xlsx@^0.20.x`**, fork drop-in patché. Ratio coût/bénéfice :

- Coût : ~5 minutes de modification (5 imports + 1 ligne `package.json`), aucun changement d'API.
- Bénéfice : `pnpm audit --audit-level=high --prod` passe à zéro CVE high/critical, conformément à la promesse v1.0.0. Le filtre de la CI peut rester strict, ce qui détectera automatiquement toute future régression.

### Alternative écartée

`pnpm.auditConfig.ignoreCves: ["GHSA-...", "GHSA-..."]` aurait masqué les CVE sans les corriger. C'est un signal qualité dégradé qui contredit la posture RezDevOps. Écartée.

### Surveillance future

Tracking continu de `@e965/xlsx` : si le mainteneur du fork s'arrête ou que les CVE migrent vers d'autres surfaces, repivoter vers une autre option (parser maison, ExcelJS si `.xls` legacy n'est plus une cible, etc.). Réévaluation à chaque audit dépendances semestriel.
