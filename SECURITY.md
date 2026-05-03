# Politique de sécurité

## Périmètre couvert

Cette politique couvre l'ensemble du monorepo `pii-scanner-web`, c'est-à-dire :

- l'application web Angular (`apps/pii-scanner-web/`),
- les deux packages npm publiés (`@rezdevops/pii-detectors`, `@rezdevops/pii-scanner-engine`),
- l'image Docker `ghcr.io/rezdevops/pii-scanner-web` produite par le pipeline de release,
- l'archive ZIP standalone distribuée avec chaque GitHub Release,
- la documentation `docs/` qui décrit les promesses du produit (CSP, souveraineté, accessibilité).

## Versions supportées

Seule la dernière version `vX.Y.Z` publiée fait l'objet d'un suivi sécurité actif. Les versions antérieures peuvent être migrées vers la dernière `minor` ou `patch` selon la nature de la vulnérabilité (`high`/`critical` → backport ; `moderate` → mise à niveau standard recommandée).

| Version | Supportée                              |
| ------- | -------------------------------------- |
| `1.x`   | ✅ active                              |
| `0.x`   | ❌ obsolète (préprod, pas de backport) |

## Comment signaler une vulnérabilité

**Ne pas ouvrir d'issue publique** pour signaler une vulnérabilité non encore corrigée.

Deux canaux acceptés :

1. **GitHub Security Advisory** (préféré) — dans l'onglet
   [Security du repo](https://github.com/RezDevOps/pii-scanner-web/security/advisories/new),
   « Report a vulnerability ». Ce canal permet une discussion privée avec le mainteneur, avec proposition de patch et coordination de la divulgation.
2. **Email** — [`contact@rezdevops.com`](mailto:contact@rezdevops.com), avec objet préfixé `[security pii-scanner-web]`. Privilégier ce canal si vous n'avez pas de compte GitHub. PGP non requis ; si vous voulez chiffrer, demandez la clé en clair par retour de mail.

Mentionner si possible :

- la version concernée (visible en pied de page de l'app, ou dans le `package.json`),
- le navigateur (et version) ou l'environnement Docker/Node,
- les étapes pour reproduire,
- l'impact estimé (exfiltration de données, escalade de privilèges, dénis de service, contournement de la CSP, etc.),
- des suggestions de correctif si vous en avez.

## Engagements de délai

| Phase                                 | Délai cible                 |
| ------------------------------------- | --------------------------- |
| Accusé de réception                   | 72 h ouvrées                |
| Premier triage (impact + gravité)     | 7 jours                     |
| Patch publié pour `critical`          | 14 jours                    |
| Patch publié pour `high`              | 30 jours                    |
| Patch publié pour `moderate` ou `low` | au prochain sprint planifié |
| Divulgation publique (advisory + CVE) | post-patch + ≥ 7 jours      |

## Vulnérabilités hors périmètre

Les éléments suivants ne sont **pas** considérés comme des vulnérabilités du projet :

- bugs purement fonctionnels (faux positifs/négatifs de détection, mauvais parsing d'un fichier exotique),
- limitations de performance (le scan d'un fichier de 500 Mo n'est pas une cible),
- comportements de tiers (un site qui iframe `pii-scanner-web` est bloqué par `frame-ancestors 'none'`, c'est intentionnel),
- vulnérabilités de dépendances **dev-only** non exploitables en runtime utilisateur (ex. CVE moderate sur `webpack-dev-server` qui n'est jamais embarqué dans le bundle prod). Ces points sont tracés dans `docs/audit-dependances-v*.md` mais ne déclenchent pas d'advisory — leur correction suit les majors Angular/Vitest planifiées.

## Vérifier l'authenticité d'une release

Toutes les artefacts produits par le workflow `release.yml` sont signées via [sigstore](https://docs.sigstore.dev/) cosign keyless OIDC. La vérification ne nécessite aucun secret partagé : seul l'identifiant du workflow (`https://github.com/RezDevOps/pii-scanner-web/.github/workflows/release.yml@refs/tags/vX.Y.Z`) est utilisé comme identité signataire.

Image Docker :

```bash
cosign verify ghcr.io/rezdevops/pii-scanner-web:1.0.0 \
  --certificate-identity-regexp 'https://github.com/RezDevOps/pii-scanner-web/.github/workflows/release.yml@refs/tags/v.+' \
  --certificate-oidc-issuer https://token.actions.githubusercontent.com
```

ZIP standalone :

```bash
cosign verify-blob \
  --certificate pii-scanner-web-v1.0.0-standalone.zip.pem \
  --signature   pii-scanner-web-v1.0.0-standalone.zip.sig \
  --certificate-identity-regexp 'https://github.com/RezDevOps/pii-scanner-web/.github/workflows/release.yml@refs/tags/v.+' \
  --certificate-oidc-issuer https://token.actions.githubusercontent.com \
  pii-scanner-web-v1.0.0-standalone.zip
```

SBOM CycloneDX :

```bash
cosign verify-blob \
  --certificate bom.json.pem \
  --signature   bom.json.sig \
  --certificate-identity-regexp 'https://github.com/RezDevOps/pii-scanner-web/.github/workflows/release.yml@refs/tags/v.+' \
  --certificate-oidc-issuer https://token.actions.githubusercontent.com \
  bom.json
```

Packages npm — la provenance est visible directement sur la page du package (`@rezdevops/pii-detectors` et `@rezdevops/pii-scanner-engine`) avec un badge sigstore. Vérifiable en CLI avec `npm audit signatures` ou `npx @sigstore/verify-bundle`.

## Posture défensive du produit

- Aucune requête réseau au runtime (`connect-src 'none'`), CSP stricte verrouillée par `default-src 'none'`.
- Aucune télémétrie, aucune analytics, aucun cookie, aucun `localStorage` par défaut.
- Aucune dépendance externe au runtime de l'app (toutes les ressources sont servies par l'origine du SPA).
- Aucun script inline (`script-src 'self' 'wasm-unsafe-eval'`).
- Aucun fichier utilisateur ne quitte le navigateur ; le code est auditable et la promesse vérifiable en moins d'une minute (cf. `docs/comment-verifier-souverainete.md`).

Toute déviation de ces engagements est à signaler par les canaux ci-dessus, et serait traitée comme un bug critique (`critical`) avec correctif sous 14 jours.

## Signaler un faux positif d'audit

Si `pnpm audit` ou un autre scanner remonte une vulnérabilité que vous pensez fausse positive ou non exploitable dans le contexte du produit, ouvrez une issue publique : ce n'est pas une vulnérabilité au sens de cette politique, mais une discussion d'analyse de risque utile à publier.
