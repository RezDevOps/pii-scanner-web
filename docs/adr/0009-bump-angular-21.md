# ADR 0009 — Bump de la stack front-end : Angular 20 → Angular 21

- **Statut** : **accepted**
- **Date** : 2026-05-08 (sprint S7, v1.2.0)
- **Décideurs** : Rudy Rezaire (RezDevOps)
- **Contexte** : sprint S7 — alignement stack avec `10_DATA_CONTEXT.md` v0.6 (RezDevOps)

## Contexte

Le `Data Context RezDevOps` v0.6 (2026-05-08) a propagé un bump de la stack front-end de référence : **Angular 20 → Angular 21**. Driver : Angular 20, publié mai 2025, est entré en phase LTS-only au 6ᵉ mois (fin de support actif novembre 2025) ; Angular 21, publié novembre 2025, reste en support actif jusqu'à mai 2026 puis LTS jusqu'à novembre 2026. Première application de la règle « fenêtre de migration tous les 12 mois » formalisée dans le cadrage `pii-scanner-web` § 12.

Le repo `pii-scanner-web` était figé en Angular 20.x depuis v0.3.0. Le sprint v1.2 (S7) est dédié à cette montée de version, conjointement avec l'activation du worker app-side (ADR-008) et le nettoyage de dette CI résiduelle.

## Décision

**Bump complet de l'écosystème Angular vers la mineure 21.2.x** :

- `@angular/core` (et tous les packages partageant la même cadence : animations, common, compiler, forms, platform-browser, platform-browser-dynamic, router) → `^21.2.12`
- `@angular/cli`, `@angular/material`, `@angular/cdk`, `@angular-devkit/build-angular`, `@angular/build` → `^21.2.10`
- `@angular/compiler-cli` → `^21.2.12` (suit la cadence de core)

Le désalignement de patch (core 21.2.12 vs cli 21.2.10 au 2026-05-08) est normal : Angular core et CLI ont des cadences indépendantes. La matrice de compatibilité Angular 21.x autorise ces écarts.

**Engine Node bumpé** : `>=20.10` → `>=20.19` dans le `package.json` racine. Imposé par `@angular-devkit/build-angular@21` (`engines.node = ^20.19.0 || ^22.12.0 || >=24.0.0`).

**Vitest bumpé en parallèle** : `^3.1.1` → `^4.1.5` (saut majeur). Justifié dans la même release pour absorber les évolutions de la matrice de compatibilité Angular CLI et garder le triplet Angular-Node-Vitest cohérent.

**TypeScript reste sur `~5.9.x`**. Angular 21.2 accepte `>=5.9 <6.1` (dont TS 6.0), mais empiler TS 5→6 dans le même sprint que Angular 20→21 + Vitest 3→4 ferait trois bumps majeurs simultanés. TS 6 sera traité dans un sprint dédié post-v1.2 si nécessaire — la fenêtre est ouverte tant qu'Angular ne déplace pas la borne basse.

## Justification

- **Alignement Data Context.** Le DC v0.6 est la source de vérité de la stack RezDevOps. Tout repo public RezDevOps doit converger vers cette stack — pas optionnel.
- **Trajectoire support actif.** Angular 20 est en LTS-only depuis novembre 2025 ; rester en LTS-only revient à accumuler une dette de migration qui se paye double à la majeure suivante. La règle « 12 mois » du cadrage limite la fenêtre.
- **Absorption indirecte de CVE supply-chain.** Les CVE actives au moment du bump (1 high `fast-uri` path traversal + 1 high `fast-uri` host confusion + 1 moderate `ip-address` XSS) ne sont pas patchées par Angular 21 directement (elles vivent dans des transitives `ajv` et `@modelcontextprotocol/sdk` qu'Angular n'a pas bumpées dans la 21.2.x). Patchées via un bloc `pnpm.overrides` ajouté dans le `package.json` racine en v1.2 (cf. CHANGELOG). Le bump Angular est néanmoins un préalable, parce que les overrides sur des transitives plus profondes sont plus simples à maintenir une fois la couche Angular à jour.
- **Cohérence avec le repo `fec-check`.** Le repo .NET de référence (`fec-check`) a bumpé .NET 8 → 10 LTS le 2026-05-08 dans la même session que ce sprint front-end (Data Context v0.5 + v0.6). Les deux repos publics RezDevOps livrent leurs migrations LTS la même semaine, posture lisible côté audit prospect.

## Conséquences

- **`ng update` plante dans les monorepos pnpm avec `tsconfig.base.json` externalisé.** Le schematic CDK 21 résout l'`extends: "../../tsconfig.base.json"` depuis son workspace temporaire (`/private/var/.../ng-XXXX/`), ce qui retombe sur `/tsconfig.base.json` (chemin absolu inexistant). Stratégie de contournement : **bump manuel via `pnpm add @21.2`** sur l'ensemble des packages Angular. À documenter pour le 3ᵉ utilitaire vitrine.
- **Pin par mineure (`@21.2`) plutôt que par patch (`@21.2.10`)** dans les commandes `pnpm add`. Le désalignement de patch Angular core / cli (12 vs 10 au 2026-05-08) plante un `pnpm add @21.2.12` parce que cli@21.2.12 n'existe pas. Le pin mineure laisse pnpm résoudre le dernier patch disponible package par package, ce qui converge naturellement.
- **Migrations auto sautées.** `ng update` aurait potentiellement appliqué des migrations de templates Material M3 ou de schematics core. En bump manuel, ces migrations sont reportées au build/test/lint qui révèle ce qui doit être ajusté à la main. Sur ce repo, aucune migration manuelle n'a été nécessaire après le bump (templates simples, pas d'API deprecated utilisée).
- **Vitest 4 breaking changes** : la migration s'est faite sans ajustement de config dans ce repo (les tests utilisaient déjà des imports explicites depuis `"vitest"` pour `describe`/`it`/`expect`, et `vitest.config.ts` ne touchait pas aux clés renommées).
- **Le `pnpm-lock.yaml` est régénéré** avec environ 200 lignes de diff (nouvelles transitives + bump des Angular packages). Pas de saut de schema lockfile.

## Alternatives considérées

- **Rester en Angular 20 LTS-only** — rejeté par le Data Context v0.6 et par la règle « fenêtre 12 mois ». Reporter ne diminue pas la charge de migration, l'augmente.
- **Bumper directement en Angular 22 dès qu'elle sortira (fin 2026)** — pas une alternative au sprint courant. Sera traité dans un futur sprint S-N+1, post-prochaine majeure Angular.
- **Bumper TS 6 dans le même sprint** — rejeté pour limiter à 2 bumps majeurs simultanés (Angular + Vitest). Empiler 3 bumps majeurs complique le diagnostic en cas de régression et augmente la surface de breaking changes à corréler.
- **Différer Vitest 4 à un sprint séparé** — possible techniquement, mais Angular 21 + Vitest 3 est une combinaison déjà testée moins durablement que Angular 21 + Vitest 4 (la matrice de compatibilité officielle Angular CLI converge sur Vitest 4). Faire les deux en même temps stabilise la baseline pour tout le reste du cycle 21.x.

## Validation

CI verte sur la branche `chore/v1.2-bumps-and-worker-app-side` : `pnpm build && pnpm test && pnpm lint && pnpm audit` tous verts post-bump et post-overrides (`pnpm audit` à 0 high / 0 moderate / 0 critical). Worker pool app-side activé en parallèle (cf. ADR-008) — le sprint v1.2 livre les deux ensemble parce qu'ils sont co-dépendants côté validation utilisateur.
