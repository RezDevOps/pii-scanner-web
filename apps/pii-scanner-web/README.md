# pii-scanner-web (application Angular)

Application Angular 20 standalone qui consomme `@rezdevops/pii-scanner-engine`. Aucune logique métier dans les composants — la couche UI orchestre exclusivement les interactions utilisateur (dépôt de fichiers, affichage de la progression, rendu du rapport).

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
3. Ouvrir DevTools → onglet **Réseau** → cocher _Disable cache_ et filtrer sur _Fetch/XHR_.
4. Déposer un fichier de test (à venir en S3 — drop zone).
5. Lancer le scan.
6. Constater dans l'onglet Réseau qu'**aucune requête sortante** n'a été émise pendant le scan.

La CSP est appliquée dès le développement local via la balise `<meta http-equiv="Content-Security-Policy">` dans `src/index.html`. Toute violation de CSP apparaît dans la console DevTools.

## Préfixe de sélecteur

`psw-` (pour _pii-scanner-web_). Tous les composants Angular doivent utiliser ce préfixe — vérifié par lint en S3.

## Licence

[AGPL-3.0-only](../../LICENSE).
