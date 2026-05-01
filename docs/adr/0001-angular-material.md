# ADR 0001 — Angular Material comme système d'UI

- **Statut** : accepted
- **Date** : 2026-05-01
- **Décideurs** : Rudy Rezaire (RezDevOps)
- **Contexte** : sprint S0 — choix du système d'UI pour la SPA `pii-scanner-web`

## Contexte

Le projet est une SPA Angular 20 standalone, ciblant des utilisateurs non-tech (DPO, juristes, RH, dirigeants TPE/PME). L'UI doit être sobre, accessible (WCAG 2.1 AA), cohérente, et démontrer une qualité d'exécution Angular représentative d'une mission RezDevOps. Le choix porte sur le système de composants : Angular Material (officiel, par l'équipe Angular), PrimeNG (large catalogue, plus marketé), Tailwind nu (composants à construire), Spartan/ng-zorro/autres (alternatives communautaires).

## Décision

Utiliser **Angular Material**, en thème custom sobre, avec `@angular/cdk` pour les primitives (dialog, overlay, drag-drop). Pas de Tailwind. Pas de framework CSS tiers. Le charting utilise **ngx-charts** en complément (compatible Angular Material).

## Justification

- **Maturité et alignement Angular.** Angular Material est maintenu par la même équipe que le framework, le support des nouveautés (signals, standalone, control flow) est immédiat et garanti dans le temps. Aucune charge ponctuelle de mise à jour à anticiper en plus de la migration Angular elle-même.
- **Accessibilité par défaut.** Les composants Material respectent les ARIA patterns, navigation clavier, focus management — conformes WCAG 2.1 AA out-of-the-box. Charge accessibilité incrémentale : presque nulle.
- **Cohérence avec le positionnement.** Material est sobre par construction. Pas d'effet « kit graphique tape-à-l'œil » qui contredirait la posture Brand Bible (rigueur, anti-démo-gadget).
- **Surface de dépendances maîtrisée.** Une seule famille de packages `@angular/material` + `@angular/cdk`, audit dépendances simplifié. PrimeNG embarque son propre écosystème, nettement plus large.
- **Compatibilité CSP stricte.** Angular Material fonctionne sans `eval` ni `new Function`, compatible avec `script-src 'self'` sans dérogation.

## Conséquences

- Le thème Material est figé en sprint S3 dans `apps/pii-scanner-web/src/styles.scss` (charte Brand Bible : palette sobre, contraste AA, typographie système).
- Tous les composants doivent passer par les primitives Material avant d'envisager une implémentation custom. Toute exception passe par une nouvelle ADR.
- Les charts utilisent **ngx-charts** ; alternative envisagée et écartée : Chart.js (impératif, moins idiomatique Angular).

## Alternatives considérées

- **PrimeNG** — catalogue plus large mais culture marketing plus présente, audit licence plus chargé, dépendances tierces (PrimeIcons, PrimeFlex).
- **Tailwind CSS + composants headless** — flexibilité maximale mais charge de construction des composants accessibles non amortie sur un MVP de 10,5 j-h.
- **Spartan / ng-zorro** — communautaires, pas le rythme de mise à jour d'Angular Material.
