# Architecture

> **Statut : v0.2.0 (S2).** Engine et pool Worker en place. Façade `runScan` opérationnelle en main-thread ; le pool Comlink est livré et activable depuis l'app Angular en S3. Les parseurs binaires (XLSX/PDF/DOCX/HTML) arrivent en `v0.2.1`.

## Découpage en trois couches

```
┌──────────────────────────────────────────────────────────────┐
│  apps/pii-scanner-web                                        │
│  Angular 20 standalone — UI uniquement                       │
│  Drop zone · file de scan · rapport interactif · exports     │
└────────────────────────────┬─────────────────────────────────┘
                             │ runScanStream() : AsyncIterable<ScanProgress>
                             │ ou runScan() : Promise<ScanReport>
                             ▼
┌──────────────────────────────────────────────────────────────┐
│  packages/pii-scanner-engine  (@rezdevops/pii-scanner-engine)│
│  Orchestration sans Angular                                  │
│                                                              │
│  ┌──────────┐  ┌────────┐  ┌─────────────┐  ┌────────────┐   │
│  │ Format   │→ │Parseurs│→ │   Runner    │→ │ Findings   │   │
│  │ detect   │  │ CSV/TSV│  │ MainThread  │  │ enrichis   │   │
│  │          │  │TXT/MD/ │  │ ou          │  │ (line/path)│   │
│  │          │  │ JSON   │  │ WorkerPool  │  │            │   │
│  └──────────┘  └────────┘  └─────────────┘  └────────────┘   │
└────────────────────────────┬─────────────────────────────────┘
                             │ texte (TextChunk) → findings
                             ▼
┌──────────────────────────────────────────────────────────────┐
│  packages/pii-detectors       (@rezdevops/pii-detectors)     │
│  Bibliothèque pure — sans I/O, sans DOM                      │
│  5 détecteurs livrés (email, phone-fr, nir, iban, siret)     │
│  Validation par clé pour NIR / IBAN / SIRET                  │
└──────────────────────────────────────────────────────────────┘
```

Chaque couche est testable indépendamment : la lib pure avec Vitest en environnement Node sur des chaînes, l'engine avec Vitest (env Node + happy-dom ponctuel pour les tests touchant `File`) sur des fichiers fixtures synthétiques, l'UI avec Vitest/Playwright en S3.

## Flux de données (v0.2.0)

1. L'utilisateur dépose un ou plusieurs `File` (drag-drop ou input ; en S2 c'est l'app Angular S3 qui posera l'UI).
2. La couche UI appelle `runScan(files)` ou `runScanStream(files)` exporté par `@rezdevops/pii-scanner-engine`.
3. Pour chaque fichier, la façade :
   - **détecte** le format via `detectFormat()` (extension → `FileFormat`) ;
   - **sélectionne** le parseur (`csvParser`, `tsvParser`, `txtParser`, `mdParser`, `jsonParser`) ;
   - **streame** les `TextChunk` (texte, `line`, `path`) vers le `Runner` ;
   - **dispatche** chaque chunk sur le `Runner` (par défaut `MainThreadRunner` ; un `WorkerPoolRunner` Comlink est disponible et activable côté app) ;
   - **agrège** les findings en enrichissant chaque finding avec la coordonnée fichier (`line`, `path`) sans écraser ce que le détecteur a déjà produit.
4. La façade émet :
   - en mode `runScan` : un `ScanReport` agrégé en fin de course ;
   - en mode `runScanStream` : une suite d'évènements `ScanProgress` (`file-started`, `file-completed`, `file-failed`) consommables via `for await` (S3 transformera en `signal`/`Observable`).
5. Les fichiers en erreur (`unsupported-format`, `deferred-format`, `parser-error`) ne stoppent pas le scan global : la façade enchaîne sur le fichier suivant.

Aucun appel réseau à aucune étape, dans aucun runner. La CSP `connect-src 'none'` du `index.html` provoquerait un échec immédiat visible en console si un import transitif tentait quelque chose.

## Détail du `Runner`

Le `Runner` est une abstraction stable du moyen d'exécution de `scanText`.

```ts
interface Runner {
  runScanText(job: {
    text: string;
    detectorIds: string[];
  }): Promise<readonly Finding[]>;
  dispose(): Promise<void> | void;
}
```

Deux implémentations livrées en `v0.2.0` :

| Implémentation     | Quand                                                   | Coût                                        |
| ------------------ | ------------------------------------------------------- | ------------------------------------------- |
| `MainThreadRunner` | Toujours dispo. Défaut tant que l'app n'a pas câblé S3. | Aucun. Sérialisation = pointeur en mémoire. |
| `WorkerPoolRunner` | Navigateur, gros fichiers, ne pas bloquer l'UI.         | 1 Worker par cœur (max 8) + sérialisation.  |

L'app Angular (S3) injectera `WorkerPoolRunner` via `runScan(files, { runner })`. Le module `@rezdevops/pii-scanner-engine` ne suppose JAMAIS un `import.meta.url` particulier : c'est le caller qui fournit la `workerFactory` (en S3 : `() => new Worker(new URL("./scan-worker.js", import.meta.url), { type: "module" })`).

## Points figés en S2 (cf. ADR 0003)

- **Comlink** validé pour l'IPC vers les Workers — abstraction `Runner` garantit la réversibilité si le profilage S3 montre un goulot.
- **File FIFO simple** dans le `WorkerPoolRunner` (priorité par taille décroissante reportée tant qu'un cas usage ne le justifie pas).
- **Politique d'annulation** : reportée à S3 (besoin du composant UI pour brancher le `AbortController` proprement).
- **Bornes mémoire** : reportées à S3 — sera traitée côté UI (warning utilisateur > 100 Mo par fichier).
- **Format JSON** : parse complet (pas de streaming) en `v0.2.0`. Streaming NDJSON sera réévalué si profilage le réclame.

## Points figés en S2.1 (parseurs binaires)

- **XLSX** via SheetJS — bundle ~250 ko, ADR à rédiger.
- **PDF** via PDF.js — texte uniquement (OCR repoussé en `v1.1` cf. cadrage § 5).
- **DOCX** via mammoth — extraction texte simple.
- **HTML** via `DOMParser` natif (zéro dep).
