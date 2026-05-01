# Architecture

> **Statut : esquisse S0.** Étoffé en S2 quand l'engine et le pool de workers seront en place. La forme actuelle décrit le découpage en trois couches et le flux de données cible.

## Découpage en trois couches

```
┌──────────────────────────────────────────────────────────────┐
│  apps/pii-scanner-web                                        │
│  Angular 20 standalone — UI uniquement                       │
│  Drop zone · file de scan · rapport interactif · exports     │
└────────────────────────────┬─────────────────────────────────┘
                             │ façade typée (signals + RxJS)
                             ▼
┌──────────────────────────────────────────────────────────────┐
│  packages/pii-scanner-engine  (@rezdevops/pii-scanner-engine)│
│  Orchestration sans Angular                                  │
│  Parseurs · pool de Web Workers · agrégation · exports       │
└────────────────────────────┬─────────────────────────────────┘
                             │ texte ou flux de texte
                             ▼
┌──────────────────────────────────────────────────────────────┐
│  packages/pii-detectors       (@rezdevops/pii-detectors)     │
│  Bibliothèque pure — sans I/O, sans DOM                      │
│  12 détecteurs · validation par clé pour 5 d'entre eux       │
└──────────────────────────────────────────────────────────────┘
```

Chaque couche est testable indépendamment : la lib pure avec Jest sur des chaînes, l'engine avec Jest sur des fichiers fixtures, l'UI avec Karma + Playwright.

## Flux de données (cible v1.0)

1. L'utilisateur dépose des fichiers dans la drop zone Angular.
2. La couche UI passe les `File` à l'engine via une façade `Observable<ScanReport>`.
3. L'engine sélectionne le parseur selon l'extension et le type MIME, instancie un _job_ par fichier, le confie à un worker libre du pool.
4. Le worker streame le contenu, applique les détecteurs sélectionnés, émet les _findings_ au fil de l'eau.
5. L'engine agrège les findings, calcule la sévérité finale et la confiance par fichier, renvoie le `ScanReport`.
6. La couche UI rend le rapport interactif et propose les trois exports (JSON, Markdown, HTML autonome).

Aucun I/O réseau à aucune étape. Aucun stockage par défaut. La CSP `connect-src 'none'` garantit que toute violation provoquerait un échec immédiat visible dans la console.

## Points à figer en S2

- Format exact des messages entre thread principal et workers (Comlink vs postMessage natif — voir ADR 0003).
- Stratégie de back-pressure quand plusieurs gros fichiers sont déposés simultanément (file FIFO simple ou priorité par taille décroissante).
- Politique d'annulation : un utilisateur qui clique « annuler » doit voir le scan s'arrêter en moins de 500 ms.
- Bornes mémoire : warning utilisateur au-delà de 100 Mo par fichier (cadrage § 6.3).
