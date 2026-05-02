# ADR 0004 — mammoth pour l'extraction de texte DOCX

- **Statut** : **accepted**
- **Date** : 2026-05-02 (sprint S2.1)
- **Décideurs** : Rudy Rezaire (RezDevOps)
- **Contexte** : sprint S2.1 — activation des parseurs binaires (XLSX/PDF/DOCX/HTML) reportés depuis `v0.2.0`

## Contexte

Le format `.docx` est une archive ZIP de fichiers XML conformes à OOXML (ECMA-376 / ISO/IEC 29500). Le contenu textuel se trouve principalement dans `word/document.xml`. L'engine n'a besoin que du texte brut : pas de mise en forme, pas d'images, pas d'objets embarqués. Trois options ont été regardées :

1. **Parser XML maison** — lire le ZIP, isoler `<w:t>`, concaténer.
2. **mammoth.js** — bibliothèque dédiée à la conversion DOCX → texte (et HTML).
3. **docx-preview** ou **docxtemplater** — orientées rendu fidèle, surdimensionnées pour notre besoin.

## Décision

**mammoth.js** (npm `mammoth`, version `^1.x`).

## Justification

- **API ciblée.** `extractRawText({ arrayBuffer })` retourne directement le texte brut, paragraphes séparés par `\n` — exactement le contrat dont on a besoin pour produire des `TextChunk` ligne-par-ligne.
- **Compatible navigateur ET Node.** Le même appel `{ arrayBuffer }` fonctionne en environnement DOM et dans Node 20+. Pas de bifurcation côté engine.
- **Licence BSD-2-Clause.** Permissive, compatible avec l'AGPL de notre app sans contamination réciproque (mammoth reste sous BSD).
- **Mature et entretenu.** ~3 M téléchargements/semaine npm, repo actif (Mike Williamson), couverture tests interne solide.
- **Poids raisonnable.** Bundle minifié + gzippé ~150 ko (incluant `jszip` transitive). C'est le coût d'entrée pour parser un format ZIP-XML, comparable à toute alternative qui ne réinvente pas le ZIP.

## Conséquences

- Dépendance ajoutée à `@rezdevops/pii-scanner-engine` : `mammoth`. Justifiée par cette ADR.
- mammoth dépend transitivement de `jszip`, `xmldom-sre`, etc. — `pnpm audit` reste sous notre contrôle (CI peut bloquer sur CVE).
- Le parseur ignore volontairement les en-têtes/pieds de page, les commentaires, les pistes de modifications. Réévaluation possible si retours utilisateur le demandent (un mode `extractWithHeaders` est envisageable derrière un flag).
- **Pas d'OCR** : un .docx contenant uniquement des images de scans ne produira aucun texte. Hors-scope (cf. cadrage § 4.6, OCR reporté à v1.1).

## Alternatives considérées

- **Parser XML maison** — viable techniquement (zip via `fflate`, parser XML minimal), mais gain marginal en bundle (peut-être ~50 ko économisés) contre une dette de maintenance significative (gestion des sections, des listes imbriquées, des révisions). Refusée.
- **docx-preview** — orientée rendu fidèle dans le navigateur, dépend de jszip et embarque ~500 ko. Surdimensionnée.
- **Parser via `DOMParser` après dézippage** — possible mais oblige à écrire la logique d'agrégation des `<w:t>` à travers les `<w:r>`, qui est précisément ce que mammoth abstrait.
