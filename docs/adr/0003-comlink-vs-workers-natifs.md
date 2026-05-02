# ADR 0003 — Communication avec les Web Workers : Comlink ou postMessage natif

- **Statut** : **accepted** (confirmé en sprint S2)
- **Date** : 2026-05-01 (création), confirmé 2026-05-02 (S2)
- **Décideurs** : Rudy Rezaire (RezDevOps)
- **Contexte** : sprint S0 — pose initiale ; sprint S2 — confirmation après implémentation du `Runner` et du pool

## Contexte

`@rezdevops/pii-scanner-engine` exécute le parsing et la détection dans un pool de Web Workers, dimensionné sur `navigator.hardwareConcurrency`. Le thread principal communique avec ces workers pour distribuer les fichiers à scanner et collecter les _findings_. Deux approches sont sur la table : `postMessage` natif (sérialisation manuelle des messages, dispatch côté worker via `switch`) ou **Comlink** (proxy RPC typé, masque la sérialisation).

## Décision (provisoire)

**Comlink**, sous réserve de validation en S2 sur un prototype représentatif (pool de 4 workers, parsing CSV streaming).

## Justification

- **Typage transparent.** Comlink expose les APIs des workers comme des objets `Promise`-ifiés côté thread principal, avec types TS préservés. Évite la duplication des contrats de message et le risque de divergence entre `Message<'parse'>` et son handler.
- **Gain DX concret.** Sur un engine qui orchestre 7+ formats de fichier × N workers, le code natif `postMessage` devient verbeux (dispatch par `type`, gestion du `requestId`, callbacks via `Promise` manuels). Comlink fait ça nativement et de manière éprouvée.
- **Coût d'adoption faible.** Bibliothèque ~5 ko gzippée, sans dépendance transitive, MIT, mature (Google, utilisée par Squoosh entre autres). Audit licence et taille négligeables.
- **Réversible.** Si le prototype S2 montre un surcoût mémoire ou une instabilité (transferable objects, structured clone limites), retour à `postMessage` natif sans rupture d'interface publique de l'engine — la fonction `scan(file)` ne change pas.

## Conséquences

- Dépendance ajoutée à `@rezdevops/pii-scanner-engine` : `comlink`. Justifiée par l'ADR.
- L'interface des workers est définie en TypeScript pur, exposée via `Comlink.expose(api)`. Tests unitaires de l'API directement, sans simuler `MessageEvent`.
- Si un fork tiers veut retirer Comlink (souveraineté maximale, zéro dépendance), la couche d'abstraction reste fine — chemin de réécriture documenté en S2.

## Alternatives considérées

- **`postMessage` natif** — zéro dépendance, contrôle total, mais charge de plomberie significative (dispatch, corrélation requête/réponse, gestion d'erreur). Choix légitime si une politique « zéro dépendance runtime » devient prioritaire.
- **`workerpool`** — pool managé clé-en-main mais surface API plus large que nécessaire et licence Apache 2.0 (compatible mais sans avantage net sur Comlink + pool maison).

## Décision confirmée en S2 (2026-05-02)

L'engine S2 introduit une abstraction `Runner` (`src/runner/`) qui découple
l'API publique (`runScan`) du moyen d'exécution. Deux implémentations livrées :

- `MainThreadRunner` — exécute `scanText` sur le thread courant. Toujours
  disponible. Sert de fallback en environnement dépourvu de `Worker`
  (Node, contextes restreints) **et** d'implémentation par défaut en S2 où
  l'instanciation des Workers Comlink est posée mais pas encore active dans
  l'app Angular (S3 branche le pool).
- `WorkerPoolRunner` — utilise Comlink pour exposer `scanText` côté worker
  et un mini-pool dimensionné sur `navigator.hardwareConcurrency`
  (fallback : 2). Comlink est ajouté en dépendance de
  `@rezdevops/pii-scanner-engine`.

Les vérifications restantes (charge CSV 100 Mo, transfert d'`ArrayBuffer`)
se font naturellement en S3 quand l'app Angular sollicitera le pool sur
des fichiers réels. La surface d'API publique de l'engine ne change pas
si on bascule plus tard sur `postMessage` natif — l'abstraction `Runner`
garantit la réversibilité documentée plus haut.
