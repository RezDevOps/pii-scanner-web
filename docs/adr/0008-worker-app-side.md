# ADR 0008 — Web Worker du scan : hébergé côté app, plus côté engine

- **Statut** : **accepted**
- **Date** : 2026-05-08 (sprint S7, v1.2.0)
- **Décideurs** : Rudy Rezaire (RezDevOps)
- **Contexte** : sprint S7 — réactivation du pool de Web Workers désactivé en v1.0

## Contexte

L'engine `@rezdevops/pii-scanner-engine` exposait depuis v0.3.0 une fabrique `createDefaultScanWorker()` qui instanciait un `new Worker(new URL("./scan-worker.js", import.meta.url), { type: "module" })`. L'`import.meta.url` était résolu **dans le contexte du package npm** (donc dans `node_modules/@rezdevops/pii-scanner-engine/dist/worker/`), et l'app n'avait qu'à brancher la fabrique sur le `WorkerPoolRunner`.

En sprint S5 (v1.0.0), l'app Angular a tenté d'activer cette fabrique. Le pattern n'a pas été re-bundlé proprement par esbuild Angular :

- en dev, Vite dep optimizer ne résolvait pas le sub-chemin worker du package npm (« `scan-worker.js?worker_file&type=module not found in vite/deps/` ») ;
- en build prod, le worker était matérialisé mais les events Comlink ne traversaient jamais — scan bloqué silencieusement.

Symptôme transverse : esbuild Angular reconnaît bien le pattern `new Worker(new URL("./...", import.meta.url))` quand l'URL est résolue depuis un fichier source TS de l'app, mais pas quand elle est résolue depuis un fichier déjà compilé situé dans `node_modules/`. Le code-splitting et la résolution d'asset Worker semblent dépendre du fait que le fichier soit visible au scan source, pas via une dépendance npm.

Conséquence v1.0 : le pool Worker a été **volontairement désactivé** dans `app.component.ts`. Le scan tournait main-thread via `MainThreadRunner` du `ScanService`. La promesse souveraineté restait tenue (calcul local, CSP intacte), seule la parallélisation sur très gros fichiers était différée. Plan v1.2 explicitement noté en commentaire de code et dans le CHANGELOG.

## Décision

**Le script worker vit côté app**, dans `apps/pii-scanner-web/src/app/scan/worker/scan-worker.ts`. Le `new Worker(new URL("./worker/scan-worker.ts", import.meta.url))` est instancié depuis `apps/pii-scanner-web/src/app/scan/scan-worker.factory.ts`, qui est un fichier source TS de l'app. Esbuild Angular sait bundler ce pattern depuis un source local.

La logique de scan (`resolveDetectors`, `scanText`, type `ScanWorkerApi`) reste 100 % dans l'engine et est consommée par le worker app-side via la **surface publique** du package `@rezdevops/pii-scanner-engine`. Le worker app-side n'est qu'une enveloppe Comlink autour de la logique engine.

`createDefaultScanWorker` (engine) est **`@deprecated`** depuis v1.2.0. Conservé pour rétrocompatibilité avec les consommateurs npm v0.3.0 → v1.1.x. À supprimer à la prochaine majeure (v2.0).

## Justification

- **Pattern bundler-friendly.** `new Worker(new URL("./relatif.ts", import.meta.url))` depuis un source TS de l'app est le pattern documenté par Angular et par esbuild. Le bundler le détecte au scan d'AST et matérialise le worker comme un asset séparé du chunk principal.
- **Logique inchangée.** Le worker app-side fait strictement le même travail que l'ancien worker engine : `resolveDetectors` + `scanText` + `expose` Comlink. Aucune duplication de logique métier — seulement de l'enveloppe d'exposition.
- **Surface publique de l'engine non affectée.** `ScanWorkerApi`, `resolveDetectors`, `scanText` étaient déjà exportés par la surface stable depuis v0.2.0 / v0.3.0. Aucun ajout d'API publique nécessaire pour rendre cette migration possible.
- **Réversibilité.** Si un futur bundler corrige la résolution worker depuis dist npm, on pourra ré-activer `createDefaultScanWorker` côté app sans rupture (le commit serait : un `import` à changer dans `scan-worker.factory.ts`).

## Conséquences

- Le sub-export `@rezdevops/pii-scanner-engine/worker` n'est plus le chemin recommandé. La doc d'usage (JSDoc de `createDefaultScanWorker`) pointe explicitement vers le pattern app-side.
- Aucun changement de dépendance pour l'app : `comlink` était déjà dans les `dependencies` de `apps/pii-scanner-web/package.json` depuis v0.3.0 (transitivement ; ré-importé directement maintenant pour le worker app-side).
- Les futurs utilitaires vitrines RezDevOps qui réutilisent cette stack (3ᵉ outil après `fec-check` et `pii-scanner-web`) doivent prévoir le worker app-side d'emblée — éviter de re-créer le sub-export engine qu'on déprécie ici.
- Validation manuelle ajoutée au critère de succès release : ouvrir Pages avec DevTools, lancer un scan ≥ 50 Mo, vérifier dans l'onglet Network qu'un `scan-worker.<hash>.js` est chargé et que la console ne tombe **pas** dans le `console.warn("[pii-scanner-web] WorkerPoolRunner indisponible")`.

## Alternatives considérées

- **Sub-export ESM avec `exports.worker` côté engine** — théoriquement possible mais le bundler doit toujours résoudre l'URL au build, ce qui ramène le problème de fond (pas le chemin).
- **Plugin Vite / esbuild custom** pour ré-écrire les patterns worker depuis dist npm — lourd, fragile, couplant le repo à un patch bundler-spécifique.
- **Asset Worker copié au build** depuis `node_modules` vers `dist/` de l'app — fragile (couplé à `angular.json` + chemins versionnés), oblige à changer la fabrique en `new Worker("scan-worker.js")` avec base-href, perd le typing.
- **Rester main-thread** — tenable fonctionnellement (la promesse souveraineté ne dépend pas du pool), mais perd la parallélisation sur très gros fichiers que le pool fournit. Rejeté parce qu'on ferme une dette explicitement notée v1.0.

## Validation

Le critère de validation est dans le CHANGELOG v1.2.0 : ouvrir l'app sur GitHub Pages déployée, charger un fichier ≥ 50 Mo, vérifier en DevTools Network que `scan-worker.<hash>.js` est bien matérialisé comme asset séparé, et confirmer dans la console qu'aucun fallback main-thread n'est déclenché.
