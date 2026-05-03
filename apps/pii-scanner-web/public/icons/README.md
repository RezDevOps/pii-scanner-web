# Icônes — Material Symbols Outlined (auto-hébergées)

Les SVG de ce dossier sont des icônes **Material Symbols Outlined** copiées
depuis [google/material-design-icons](https://github.com/google/material-design-icons),
distribuées sous licence **Apache 2.0** (cf. `NOTICE` à la racine du repo).

## Pourquoi ces fichiers sont versionnés

La promesse de souveraineté du projet (cf. `docs/comment-verifier-souverainete.md`)
interdit toute requête réseau au runtime — y compris celles vers la même
origine, puisque la CSP `connect-src 'none'` bloque tout XHR/fetch (c'est le
comportement vérifiable en DevTools : aucune ligne ne s'ajoute pendant un scan).

Conséquence : on ne peut pas charger ces SVG via `MatIconRegistry.addSvgIcon(url)`
qui passe par `HttpClient`. Les icônes sont donc embarquées via
`MatIconRegistry.addSvgIconLiteral()` avec les SVG **inline en TypeScript**
dans `src/app/icons/icon-registry.ts`.

Les fichiers `.svg` de ce dossier ont alors un double rôle :

1. **Source de vérité humainement lisible** — copies originales de
   `@material-symbols/svg-400/outlined/` (variante `wght 400`, taille graphique
   `48dp`, viewBox `0 -960 960 960`) avec `fill="currentColor"` injecté sur
   chaque `<path>` (sans ce patch, le glyphe resterait noir au lieu d'hériter
   de la couleur du texte parent).
2. **Référence d'audit** — toute personne souhaitant vérifier que les
   strings inline du `icon-registry.ts` sont bien des Material Symbols non
   modifiés peut comparer ces fichiers (octet pour octet, hors `fill`) avec
   le package npm officiel.

Les fichiers `.svg` ne sont **pas** chargés au runtime par l'app, mais sont
servis comme assets statiques par Angular CLI (cf. `angular.json`
→ `architect.build.options.assets`), donc également accessibles à
`/icons/<nom>.svg` pour qui voudrait les consulter via le navigateur.

## Liste des icônes embarquées

| Fichier            | Usage                                      |
| ------------------ | ------------------------------------------ |
| `cloud_upload.svg` | Drop-zone — invitation au dépôt de fichier |
| `schedule.svg`     | File-queue — statut « en attente »         |
| `autorenew.svg`    | File-queue — statut « analyse en cours »   |
| `check_circle.svg` | File-queue — statut « terminé »            |
| `error.svg`        | File-queue — statut « échec »              |
| `code.svg`         | Report — bouton export JSON                |
| `article.svg`      | Report — bouton export Markdown            |
| `html.svg`         | Report — bouton export HTML autonome       |

## Procédure de mise à jour

```bash
# Récupérer la dernière version Material Symbols
npm install @material-symbols/svg-400 --no-save

# Pour chaque icône à rafraîchir, copier en injectant fill="currentColor"
sed 's|<path |<path fill="currentColor" |' \
  node_modules/@material-symbols/svg-400/outlined/<nom>.svg \
  > apps/pii-scanner-web/public/icons/<nom>.svg
```

Puis **également** mettre à jour la string inline correspondante dans
`apps/pii-scanner-web/src/app/icons/icon-registry.ts` (c'est elle qui est
réellement utilisée au runtime — voir explication ci-dessus).

**Ne pas** tirer les SVG depuis un CDN : la CSP bloque toute origine externe
au runtime, et les builds reproductibles imposent une trace versionnée.
