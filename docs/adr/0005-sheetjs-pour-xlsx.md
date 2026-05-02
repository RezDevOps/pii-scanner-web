# ADR 0005 — SheetJS Community Edition pour XLSX/XLS

- **Statut** : **accepted**
- **Date** : 2026-05-02 (sprint S2.1)
- **Décideurs** : Rudy Rezaire (RezDevOps)
- **Contexte** : sprint S2.1 — activation des parseurs binaires reportés depuis `v0.2.0`

## Contexte

`.xlsx` (Office Open XML, ECMA-376) et `.xls` (BIFF, format binaire Excel 97-2003) sont les deux formats Excel grand public. La cible DPO/RSSI/auditeurs reçoit massivement des exports CRM ou des listings RH dans ces formats. Trois options regardées :

1. **SheetJS Community Edition** (`xlsx` sur npm) — bibliothèque historique du parsing Excel en JS.
2. **ExcelJS** — alternative moderne, lecture/écriture, focus xlsx.
3. **Parser maison** (zip + XML pour xlsx, OLE2 pour xls) — réinvente plus que ce que ça simplifie.

## Décision

**SheetJS Community Edition** (`xlsx` sur npm).

## Justification

- **Couverture des deux formats.** SheetJS lit indistinctement `.xlsx` et `.xls` (et même `.xlsm`, `.xlsb`, `.ods`, `.csv`, etc.) avec la même API. ExcelJS ne couvre pas `.xls` legacy, ce qui exclut une partie significative des fichiers reçus en TPE/PME.
- **API mature et documentée.** `XLSX.read(arrayBuffer, { type: "array", cellDates: true })` + itération via `XLSX.utils.decode_range` couvre 100% de notre besoin. Le contrat `cell.t` / `cell.v` / `cell.w` est stable depuis des années.
- **Licence Apache 2.0.** Permissive, compatible avec l'AGPL de l'app sans contamination réciproque.
- **Pas de dépendance native ni de Worker imposé.** Tourne en environnement Node, navigateur, et workers (ce qui sera utile si on déplace le parsing dans un Web Worker en S3+).
- **Mature et largement éprouvée.** ~5 M téléchargements/semaine, audit de sécurité régulier, base de tests fournie.

## Conséquences

- Dépendance ajoutée à `@rezdevops/pii-scanner-engine` : `xlsx`. Justifiée par cette ADR.
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
