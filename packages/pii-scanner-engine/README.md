# @rezdevops/pii-scanner-engine

Orchestration du scan PII : sélection du parseur selon le format, lecture en streaming quand c'est possible, exécution dans un pool de Web Workers, agrégation des _findings_, génération des exports.

> **Statut : pré-v0.1.0.** Squelette posé en sprint S0. Implémentation en S2 (parseurs CSV / XLSX / PDF / TXT / JSON, pool de workers via Comlink) — tag `v0.2.0` du monorepo.

## Architecture

L'engine est l'étage intermédiaire de la pile :

```
Application Angular (UI)
        │
        ▼
@rezdevops/pii-scanner-engine   ← ici
        │
        ▼
@rezdevops/pii-detectors        (lib pure)
```

L'engine ne contient pas de composant Angular ; il s'exécute en parallèle sur le thread principal (orchestration) et dans des Web Workers (parsing + détection). Tout I/O fichier passe par les API web standard (`File`, `Blob`, `ReadableStream`).

## Responsabilités

- **Sélection du parseur** selon l'extension et le type MIME : CSV/TSV (PapaParse), XLSX/XLS (SheetJS), PDF (PDF.js), DOCX (mammoth), TXT/MD (natif), JSON (natif, support NDJSON streaming), HTML (DOMParser).
- **Pool de Web Workers** dimensionné sur `navigator.hardwareConcurrency` avec un plafond raisonnable, communication typée via Comlink (à confirmer en S2 — voir ADR 0003).
- **Agrégation des findings** par fichier et par catégorie, calcul des métriques de criticité.
- **Génération des exports** : JSON (schéma versionné), Markdown lisible, HTML autonome (CSS/JS inlinés).

## Hors scope

- Pas de logique de détection (déléguée à `@rezdevops/pii-detectors`).
- Pas de rendu UI (délégué à l'application Angular).
- Pas d'I/O réseau, jamais. La CSP du host garantit l'absence de fuite ; l'engine n'invoque jamais `fetch`.

## Licence

[AGPL-3.0-only](../../LICENSE).
