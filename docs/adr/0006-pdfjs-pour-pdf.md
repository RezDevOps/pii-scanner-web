# ADR 0006 — PDF.js pour l'extraction de texte PDF

- **Statut** : **accepted**
- **Date** : 2026-05-02 (sprint S2.1)
- **Décideurs** : Rudy Rezaire (RezDevOps)
- **Contexte** : sprint S2.1 — activation des parseurs binaires reportés depuis `v0.2.0`

## Contexte

Le format PDF est massivement présent dans la cible DPO/RSSI : devis, factures, contrats, rapports clients. Trois options regardées :

1. **PDF.js** (`pdfjs-dist` sur npm) — moteur PDF de Mozilla, écrit en JS.
2. **pdf-parse** — wrapper minimaliste autour de PDF.js + heuristiques.
3. **pdf2json**, **pdf-text-extract** — abandons ou wrappers de binaires natifs (Poppler, Ghostscript) — incompatibles avec une distribution navigateur pure.

## Décision

**PDF.js** (`pdfjs-dist`, build `legacy/build/pdf.mjs` pour la portabilité Node + navigateur).

## Justification

- **Solution navigateur de référence.** PDF.js est le moteur que Firefox utilise pour rendre les PDF — éprouvé en production sur des milliards de documents.
- **API d'extraction texte stable.** `getDocument({ data })` + `page.getTextContent()` est documenté, typé, et n'a pas changé d'interface depuis la v2.
- **Zéro dépendance native.** Pas de binding `canvas`, pas de Poppler, pas de Ghostscript. Tourne en navigateur, en Node, et dans un Web Worker.
- **Licence Apache 2.0.** Permissive, compatible avec l'AGPL de l'app sans contamination réciproque.
- **Mature et entretenu.** Mozilla, ~600k téléchargements/jour, releases régulières.

## Conséquences

- Dépendance ajoutée à `@rezdevops/pii-scanner-engine` : `pdfjs-dist`. Justifiée par cette ADR.
- **Coût bundle ~600 ko gzip** sur l'app navigateur — c'est le plus gros poste de l'engine. Pas de tree-shaking efficace possible (PDF.js est monolithique). Reste acceptable pour notre cible : un DPO qui scanne 50 PDF accepte un bundle de 600 ko ; ce n'est pas une SPA grand public.
- **Pas d'OCR.** Si un PDF contient uniquement des images de scans (cas fréquent pour les contrats numérisés), `getTextContent` ne renvoie rien — donc zéro finding, sans erreur. Cette limitation est documentée dans le README et dans `docs/architecture.md`. OCR via Tesseract.js reporté à v1.1 (cf. cadrage § 4.6).
- **`isEvalSupported: false` + `disableFontFace: true` + `useSystemFonts: false`.** Posture sécuritaire conforme à la promesse souveraineté : pas d'évaluation JS embarquée, pas de chargement de polices externes, pas d'accès au filesystem fonts.
- **Worker non instancié par défaut.** On désactive `GlobalWorkerOptions.workerSrc` à la chaîne vide pour rester monothread dans la lib. L'app Angular pourra activer un worker dédié en S3 si profilage motive l'investissement.
- **Build legacy obligatoire** pour la compatibilité Node 20 (le build moderne suppose des features ESM avancées que Node 20 ne couvre pas tout à fait).

## Alternatives considérées

- **pdf-parse** — wrapper PDF.js en `require()` qui ne se prête pas à un consommateur ESM strict. Refusé.
- **pdf2json / pdf-text-extract** — dépendances natives Poppler/Ghostscript : incompatibles avec un déploiement 100 % navigateur.
- **Parser PDF maison** — irresponsable. Le format PDF est l'un des plus complexes du monde bureautique.

## Suite naturelle

Si l'OCR devient prioritaire (retours utilisateur), Tesseract.js peut être ajouté **en complément** de PDF.js (tester d'abord PDF.js, fallback OCR si zéro texte extrait). Le contrat `FileParser` ne change pas.
