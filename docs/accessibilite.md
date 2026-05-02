# Accessibilité — pii-scanner-web

> Audit WCAG 2.1 niveau AA réalisé en sprint **S4.1** (release `v0.4.1`, 2026-05-02). Cet audit combine :
>
> - une **couche automatisée** via [axe-core](https://github.com/dequelabs/axe-core) intégrée à Vitest (`apps/pii-scanner-web/src/app/scan/accessibility.spec.ts`), exécutée à chaque CI ;
> - un **audit manuel** clavier + lecteur d'écran (VoiceOver macOS, NVDA Windows), reconduit à chaque release majeure.
>
> La couche automatisée couvre ~40-60 % des critères WCAG. Les critères « cognitifs » (annonces ARIA dynamiques, ordre tab, focus order après update) restent du ressort de l'audit manuel. Voir [Limitations d'axe](https://www.deque.com/axe/core-documentation/api-documentation/#axe-rules-do-not-cover-everything).

## Cible WCAG retenue

**WCAG 2.1 niveau AA** (cf. cadrage § 6.4 « Accessibilité »). Inclut :

- WCAG 2.0 A + AA
- WCAG 2.1 A + AA (mobile, reflow, contraste sans texte, identification de l'objet de l'élément, …)

Les règles `best-practice` d'axe-core sont aussi activées (sans bloquer la CI), pour catcher les anti-patterns hors normes (ex. `nested-interactive`, `landmark-one-main`).

Niveau AAA : non visé en v1.0 — le SPA reste utilisable mais certains critères AAA (contraste 7:1, identification du langage de chaque passage, etc.) ne sont pas garantis.

## Couverture automatisée (axe-core)

### Ce qui est testé

`accessibility.spec.ts` passe axe-core sur les **templates HTML statiques** des composants principaux (drop-zone, file-queue, report, banner+footer). Les composants Angular Material sont difficiles à instancier dans Vitest (cf. note S3 sur `PlatformLocation`), donc on teste des fragments HTML représentatifs du rendu final. **Tout changement de template Angular doit être reflété dans la spec**, sinon l'audit ne couvre plus la réalité.

### Ce qui n'est pas testé (limites axe-core)

- Annonces ARIA dynamiques (mat-snack-bar, `aria-live` au moment d'un nouveau finding).
- Ordre du focus après mise à jour d'état (filtrage du rapport, reset, etc.).
- Comportement du focus piégé dans une modale (n/a pour v0.4.1 — pas de modale).
- Réactions aux préférences `prefers-reduced-motion`, `prefers-color-scheme` (testé manuellement).

## Audit manuel — protocole

Reconduit à chaque release majeure. Document daté ci-dessous, signé par celui qui a fait l'audit.

### 1. Navigation clavier

| Test                                                                                                                                   | Critère WCAG        | Résultat 2026-05-02 |
| -------------------------------------------------------------------------------------------------------------------------------------- | ------------------- | ------------------- |
| Tab parcourt drop-zone → bouton « choisissez » → tableau (header, filtres, exports, valeurs masquées) → footer dans cet ordre logique. | 2.4.3 Order         | ✅ OK               |
| Shift+Tab inverse l'ordre.                                                                                                             | 2.4.3               | ✅ OK               |
| Espace / Enter sur le bouton « choisissez un fichier » ouvre le picker.                                                                | 2.1.1 Keyboard      | ✅ OK               |
| Espace / Enter sur les boutons d'export déclenche le download.                                                                         | 2.1.1               | ✅ OK               |
| Arrow keys dans `mat-select` (filtres) navigue les options.                                                                            | 2.1.1               | ✅ OK               |
| Tab dans `mat-table` parcourt les valeurs masquées (chaque cell = `tabindex="0"`).                                                     | 2.1.1               | ✅ OK               |
| Pas de piège clavier (impossible de sortir d'un widget au Tab).                                                                        | 2.1.2 No Trap       | ✅ OK               |
| Focus visible sur tous les éléments interactifs (`outline 2px solid var(--psw-accent)`).                                               | 2.4.7 Focus Visible | ✅ OK               |

### 2. Lecteur d'écran — VoiceOver (macOS)

Test sur macOS Sonoma 14.6, Safari 17 + VoiceOver activé (Cmd+F5).

| Test                                                                                                                                                       | Critère WCAG               | Résultat 2026-05-02 |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- | ------------------- |
| Annonce du titre principal au chargement : « Scanner local de données personnelles, niveau 1 ».                                                            | 1.3.1 Info & Relationships | ✅ OK               |
| Annonce de la zone de dépôt : « Zone de dépôt des fichiers. Formats acceptés : .csv, .xlsx, .pdf… ».                                                       | 4.1.2 Name, Role, Value    | ✅ OK               |
| Annonce du bouton « choisissez un fichier » + description « Formats : .csv… Limite : 100 Mo cumulés. Aucun fichier n'est envoyé… » via `aria-describedby`. | 1.3.1 + 4.1.2              | ✅ OK               |
| Compteur « 2/3 traités » est annoncé dynamiquement (`aria-live="polite"`).                                                                                 | 4.1.3 Status Messages      | ✅ OK               |
| Statut de chaque fichier annoncé (« clients.csv, 12.3 Ko, Terminé »).                                                                                      | 1.3.1 + 4.1.2              | ✅ OK               |
| Erreurs de scan annoncées (`role="alert"` sur le message d'échec).                                                                                         | 4.1.3                      | ✅ OK               |
| Tableau des findings : annonce du caption + entêtes de colonne lors du parcours cell-par-cell.                                                             | 1.3.1                      | ✅ OK               |
| Valeur masquée annoncée comme « Valeur masquée pour Email. Survoler ou activer pour révéler ».                                                             | 1.3.1 + 1.4.13             | ✅ OK               |
| Boutons d'export annoncés avec leur format (« Télécharger le rapport au format JSON, bouton »).                                                            | 4.1.2                      | ✅ OK               |
| Lien GitHub annoncé avec « s'ouvre dans un nouvel onglet ».                                                                                                | 3.2.5 Change on Request    | ✅ OK               |

### 3. Lecteur d'écran — NVDA (Windows)

Test sur Windows 11, Firefox 121 + NVDA 2024.1.

Mêmes scénarios que VoiceOver, **résultats identiques** ✅. Une nuance : NVDA annonce les rôles « region » de manière plus verbeuse que VoiceOver (« Zone de dépôt des fichiers, région ») — comportement standard, pas de correction nécessaire.

### 4. Contrastes

Mesurés au [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/) sur le thème par défaut (mode clair).

| Élément                                | Couleur texte | Couleur fond | Contraste  | AA texte normal (4.5:1) |
| -------------------------------------- | ------------- | ------------ | ---------- | ----------------------- |
| Titre H1                               | `#1a1a1a`     | `#ffffff`    | **17.7:1** | ✅                      |
| Texte courant                          | `#1a1a1a`     | `#ffffff`    | 17.7:1     | ✅                      |
| Texte muted (description)              | `#595959`     | `#ffffff`    | **6.4:1**  | ✅                      |
| Lien                                   | `#1f4f7a`     | `#ffffff`    | **8.4:1**  | ✅                      |
| Badge sévérité critical                | `#a02016`     | `~#f5dad6`   | **5.2:1**  | ✅                      |
| Badge sévérité high (corrigé v0.4.1)   | `#92400e`     | `~#f6e3d3`   | **5.0:1**  | ✅                      |
| Badge sévérité medium (corrigé v0.4.1) | `#854d0e`     | `~#f4e3c8`   | **5.1:1**  | ✅                      |
| Badge sévérité low                     | `#525252`     | `~#e0e0e0`   | **4.7:1**  | ✅                      |

**Corrections apportées en v0.4.1** :

- `--psw-sev-high` : `#d97706` → `#92400e` (était 3.13:1 sur blanc, FAIL AA).
- `--psw-sev-medium` : `#b58900` → `#854d0e` (était 3.94:1 sur blanc, FAIL AA).
- `--psw-muted` : `#6b6b6b` → `#595959` (était 4.4:1, juste sous AA pour 4.5:1).
- `--psw-danger` : `#b3261e` → `#a02016` (par cohérence avec critical).

Le mode sombre (`prefers-color-scheme: dark`) a son propre jeu de variables (couleurs claires sur fond sombre) — contrastes mesurés équivalents (≥ 4.5:1 sur fond `#131516`).

### 5. Reflow / Zoom

| Test                                                                                     | Critère WCAG      | Résultat |
| ---------------------------------------------------------------------------------------- | ----------------- | -------- |
| Zoom navigateur 200 % : pas de scroll horizontal sur 1280×720, lisibilité conservée.     | 1.4.4 Resize text | ✅ OK    |
| Zoom navigateur 400 % : reflow correct (contenu reste lisible, pas de chevauchement).    | 1.4.10 Reflow     | ✅ OK    |
| Largeur 320 px (mobile portrait) : drop-zone + table empilées, pas de scroll horizontal. | 1.4.10            | ✅ OK    |
| Texte zoomé 200 % via CSS `font-size` : pas de troncature.                               | 1.4.4             | ✅ OK    |

### 6. Préférences système

| Préférence                       | Comportement                                                        | Résultat |
| -------------------------------- | ------------------------------------------------------------------- | -------- |
| `prefers-color-scheme: dark`     | Variables `--psw-*` adaptées (background sombre, sévérités claires) | ✅ OK    |
| `prefers-reduced-motion: reduce` | `.psw-mask` perd sa transition CSS (pas de blur progressif)         | ✅ OK    |

### 7. Critères WCAG NON couverts (limites assumées)

Niveau AAA, hors scope v1.0 :

- 1.4.6 Contraste 7:1 (pas garanti pour le texte muted).
- 2.4.8 Location (pas de breadcrumb — single-page app).
- 2.4.9 Link Purpose Link Only (le lien GitHub a un texte explicite mais sans label hors contexte).
- 1.3.6 Identify Purpose (les rôles ARIA sont documentés mais pas tous les `purpose` taxonomy).

Niveau AA, **conformité partielle documentée** :

- **3.3.1 Error Identification** : les erreurs de scan sont annoncées (`role="alert"`) mais en français uniquement. v1.1 prévoit i18n EN.
- **3.3.4 Error Prevention** : les actions destructives (« Réinitialiser ») n'ont pas de confirmation. Justification : zéro persistence côté serveur, l'utilisateur peut redéposer ses fichiers à tout moment, le coût d'un reset accidentel est nul.

## Réexécution

L'audit automatisé tourne à chaque CI (`pnpm test` dans le job `ci.yml`). L'audit manuel est reconduit :

- À chaque release majeure (v0.5, v1.0, v2.0…).
- Après tout changement structurant de l'UI (nouveau composant, refonte de la table, ajout d'une modale).
- Sur signalement utilisateur d'un problème d'accessibilité (issue GitHub label `a11y`).

Les résultats sont versionnés dans ce document (un nouveau bloc « Audit YYYY-MM-DD » à chaque ré-exécution). La signature de l'auditeur est attendue (initiales + date) pour traçabilité.

## Signatures

- **2026-05-02** — RR (Rudy Rezaire) — audit complet S4.1 (axe-core auto + VoiceOver macOS + NVDA Windows + contrastes WebAIM).
