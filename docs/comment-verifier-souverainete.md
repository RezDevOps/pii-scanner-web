# Comment vérifier que pii-scanner-web ne sort rien de votre navigateur

> Ce document est le cœur de la promesse de l'outil. Il décrit pas à pas comment **vous** vérifiez en direct que rien ne sort de votre navigateur quand vous scannez un fichier. La démonstration prend moins d'une minute.

## Pourquoi ce document existe

La promesse _« 100 % navigateur »_ est facile à écrire, difficile à tenir. Tous les outils SaaS de scan PII vous demandent d'envoyer le fichier dans leur cloud — précisément ce que vous cherchez à éviter quand vous voulez vérifier qu'un fichier n'a pas de fuite. `pii-scanner-web` traite les fichiers localement et **vous donne les moyens de le vérifier vous-même**, sans avoir à nous croire sur parole.

## Mode opératoire

### 1. Ouvrir l'application

Choisissez l'un des trois points d'entrée :

- la démo officielle `https://pii-scanner.rezdevops.fr` (servie statique, sans backend),
- l'image Docker auto-hébergée `ghcr.io/rezdevops/pii-scanner-web` (nginx local),
- l'archive ZIP standalone, dépaquetée puis ouverte en double-clic sur `index.html` (mode hors-ligne complet).

Pour la vérification la plus stricte : utiliser l'archive ZIP, **après avoir débranché le câble réseau ou désactivé le Wi-Fi**. Si l'application fonctionne, c'est une preuve directe qu'elle n'a besoin de personne.

### 2. Ouvrir DevTools — onglet Réseau

| Navigateur    | Raccourci                                     | Onglet à activer   |
| ------------- | --------------------------------------------- | ------------------ |
| Chrome / Edge | `F12` ou `Cmd+Option+I`                       | `Network` (Réseau) |
| Firefox       | `F12` ou `Cmd+Option+E`                       | `Réseau`           |
| Safari        | `Cmd+Option+I` (avec menu Développeur activé) | `Réseau`           |

Dans l'onglet Réseau :

1. Cocher **Disable cache** (ou _Désactiver le cache_).
2. Filtrer sur `Fetch/XHR` (ou _Tout_ si vous voulez voir aussi les requêtes statiques initiales).
3. Cliquer sur l'icône **Vider** (corbeille) pour partir d'un état propre.

### 3. Déposer un fichier de test

Glissez-déposez un fichier dans la drop zone, ou utilisez le bouton de sélection. Vous pouvez utiliser n'importe quel fichier — y compris un fichier réel : il ne quittera pas votre poste.

### 4. Lancer le scan

Cliquer sur _Scanner_. La progression s'affiche en direct, le rapport est rendu en quelques secondes selon la taille du fichier.

### 5. Vérifier l'onglet Réseau

**Aucune requête sortante ne doit apparaître pendant le scan.**

Plus précisément, vous ne devez voir aucune ligne avec :

- une URL pointant vers un domaine externe au vôtre,
- un type `fetch`, `xhr`, `websocket`, `eventsource` ou `beacon`,
- un _initiator_ lié à la SPA pendant la phase de scan.

Les seules requêtes acceptables sont celles du chargement initial de la page (HTML, JS, CSS, polices locales — toutes servies depuis le même domaine que l'application). Aucune ne doit apparaître après le clic _Scanner_.

## Vérification renforcée — bloquer le réseau au niveau navigateur

Pour aller plus loin, Chrome propose dans DevTools un mode _Offline_ (onglet Réseau → menu _Throttling_ → _Offline_). Activez-le **avant** de lancer le scan : si l'application fonctionne quand même, c'est qu'elle n'a besoin d'aucune ressource réseau au runtime.

## Vérification que le calcul tourne en Web Workers (à partir de S3)

À compter de la version `v0.3.0` (S3, branchement de l'app Angular sur le pool Comlink livré en S2), vous pouvez vérifier visuellement que les calculs lourds sont effectivement délégués à des Web Workers.

1. Ouvrez DevTools → onglet **Sources** (Chrome/Edge) ou **Débogueur** (Firefox).
2. Cherchez la section **Threads** ou **Workers** dans la barre latérale.
3. Lancez un scan sur un fichier de plusieurs Mo.
4. Vous devez voir apparaître plusieurs entrées du type `scan-worker.js` (jusqu'à `navigator.hardwareConcurrency`, plafonnées à 8).
5. Pendant le scan, l'UI reste fluide (pas de _jank_ sur les animations) — preuve que le thread principal n'est pas bloqué.

Si vous ne voyez pas de Workers, c'est que vous utilisez l'app Angular sans le pool activé (mode `MainThreadRunner`, fallback). Dans ce cas le calcul tourne sur le thread principal mais reste 100 % local — la promesse souveraineté est intacte, seule la fluidité UI peut être impactée sur très gros fichiers.

## Vérification de la Content Security Policy

La CSP est servie via une balise `<meta http-equiv="Content-Security-Policy">` dans `index.html`. Vous pouvez la lire en clair :

1. Faites un clic-droit sur la page → _Afficher le code source de la page_.
2. Cherchez `Content-Security-Policy`.
3. Vérifiez la présence de `connect-src 'none'`.

Cette directive interdit toute requête `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource` et `navigator.sendBeacon` au runtime. Toute tentative de violation est visible dans la console DevTools (onglet _Console_ → message en rouge commençant par `Refused to connect to ...`).

## Si vous trouvez une fuite

Ouvrez une issue sur [github.com/RezDevOps/pii-scanner-web/issues](https://github.com/RezDevOps/pii-scanner-web/issues) avec :

- la version de l'application (visible en pied de page),
- le navigateur et sa version,
- une capture d'écran de l'onglet Réseau au moment de la fuite,
- les étapes pour reproduire.

Une fuite éventuelle est traitée comme un bug critique. Toute correction sera annoncée publiquement dans le `CHANGELOG.md`.

## Auditabilité du code

Le code source de l'application est intégralement public sous licence AGPL-3.0. Trois portes d'entrée pour audit :

- la **CSP** dans `apps/pii-scanner-web/src/index.html`,
- les **détecteurs** dans `packages/pii-detectors/src/` (lib pure, sans I/O),
- l'**engine** dans `packages/pii-scanner-engine/src/` (orchestration, sans `fetch`).

Aucune télémétrie, aucune analytics, aucun tracking, jamais. Voir le cadrage § 12 _Engagements anti-dérive_.
