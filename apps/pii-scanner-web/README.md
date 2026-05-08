# pii-scanner-web (application Angular)

Application Angular 21 standalone qui consomme `@rezdevops/pii-scanner-engine`. Aucune logique métier dans les composants — la couche UI orchestre exclusivement les interactions utilisateur (dépôt de fichiers, affichage de la progression, rendu du rapport).

## Démarrage local

```bash
# Depuis la racine du monorepo
pnpm install
pnpm dev
# → http://localhost:4200
```

## Vérifier la promesse souveraineté en local

1. Lancer `pnpm dev`.
2. Ouvrir `http://localhost:4200` dans Chrome ou Firefox.
3. Ouvrir DevTools → onglet **Réseau** → cocher _Disable cache_.
4. Déposer un fichier de test.
5. Lancer le scan.
6. Constater dans l'onglet Réseau que toutes les requêtes pointent vers `http://localhost:4200` (chunks JS du worker et des parseurs binaires lazy-loadés) et qu'**aucune ne va vers un domaine externe**. La CSP `connect-src 'none'` interdit techniquement tout `fetch`/`XHR`/`WebSocket` au runtime ; les seules requêtes Network sont des chargements de chunks régis par `script-src 'self'` / `worker-src 'self' blob:`, qui n'autorisent que l'origine de l'app.

La CSP est appliquée dès le développement local via la balise `<meta http-equiv="Content-Security-Policy">` dans `src/index.html`. Toute violation de CSP apparaît dans la console DevTools.

## Préfixe de sélecteur

`psw-` (pour _pii-scanner-web_). Tous les composants Angular doivent utiliser ce préfixe — vérifié par lint en S3.

## Licence

[AGPL-3.0-only](../../LICENSE).
