# ADR 0002 — Licence AGPL-3.0 pour pii-scanner-web

- **Statut** : accepted
- **Date** : 2026-05-01
- **Décideurs** : Rudy Rezaire (RezDevOps)
- **Contexte** : sprint S0 — choix de la licence open-source

## Contexte

Le repo `pii-scanner-web` est public dès le premier commit. La règle générale RezDevOps est _MIT par défaut, AGPL si exposition web significative_ (cf. cadrage `12_PII_SCANNER_WEB_CADRAGE.md` § 8). Le repo précédent `fec-check` est sous MIT — outil CLI, exécution locale, pas d'exposition réseau, donc pas de risque de SaaS-ification. Le présent projet est différent : c'est une SPA hébergeable, donc directement repackageable.

## Décision

**GNU Affero General Public License v3.0** (`AGPL-3.0-only`), pour les trois packages du monorepo (`@rezdevops/pii-detectors`, `@rezdevops/pii-scanner-engine`, `pii-scanner-web`).

## Justification

- **Promesse souveraineté à protéger.** Le différenciant central du produit est _« 100 % navigateur, vérifiable »_. Un acteur tiers peut très facilement forker, ajouter un upload silencieux vers son back-end, et redéployer en SaaS sous une marque concurrente — anéantissant la promesse pour ses utilisateurs. L'AGPL contraint à publier les modifications **même quand le logiciel est exposé en service réseau** (closing the SaaS loophole). MIT ne le fait pas.
- **Compatibilité avec un usage libre légitime.** L'AGPL n'empêche ni l'auto-hébergement par une PME, ni l'usage en interne, ni le fork pour adaptation. Elle exige seulement que les modifications redistribuées (y compris via service réseau) soient publiées sous la même licence.
- **Cohérence avec la cible.** Les utilisateurs visés (DPO, juristes, RSSI) sont sensibles à l'auditabilité du code. AGPL signale fortement « projet open-source intégral, pas de version pro cachée ».
- **Divergence assumée avec `fec-check` (MIT).** Pas un dogme : MIT y est cohérent (CLI local, pas de SaaS-ification possible). La licence suit le risque réel d'exposition. Justification systématique attendue pour toute nouvelle ADR licence sur un futur repo.

## Conséquences

- Tout fork hébergé en service réseau doit publier ses modifications sous AGPL-3.0 ou compatible. Documenté dans `NOTICE` et `LICENSE`.
- Les packages npm `@rezdevops/pii-detectors` et `@rezdevops/pii-scanner-engine` portent la même licence. Un consommateur tiers qui les embarque dans un service réseau hérite de l'obligation AGPL. À documenter dans le README de chaque package.
- Les contributions externes acceptées sont sous AGPL-3.0 alignée. Mention explicite dans `CONTRIBUTING.md` (à créer au premier afflux de PR).
- Compatibilité GPLv3 préservée (AGPL = GPLv3 + clause service réseau). Compatibilité MIT non garantie côté inclusion.

## Alternatives considérées

- **MIT** — cohérent avec la règle par défaut RezDevOps mais ne protège pas contre la SaaS-ification opportuniste, qui est précisément le risque structurant ici.
- **GPL-3.0** — protège la liberté du code redistribué hors-ligne mais laisse passer le cas SaaS (faille connue). Insuffisant.
- **Apache 2.0** — clause brevets utile mais même faille SaaS que MIT. Insuffisant.
- **Source-available (BSL, SSPL, Elastic License)** — non open-source au sens OSI, position contradictoire avec la posture RezDevOps.
