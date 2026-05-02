# pii-scanner-web

> Scanner local de données personnelles. Les fichiers ne quittent jamais votre navigateur.

`pii-scanner-web` est une application web Angular qui détecte les données à caractère personnel (PII) dans des fichiers bureautiques courants — Excel, CSV, PDF, Word, JSON, HTML — et produit un rapport RGPD lisible en quelques secondes. **Le traitement est intégralement local au navigateur** : aucun octet n'est envoyé sur le réseau, et la propriété est vérifiable en direct (Content Security Policy stricte, DevTools = zéro requête sortante).

C'est le second utilitaire vitrine [RezDevOps](https://github.com/RezDevOps), après [`fec-check`](https://github.com/RezDevOps/fec-check).

## Statut

**v0.4.0 — sprint S4 (détecteurs étendus + exports).** Les **12 détecteurs du périmètre v1.0 sont livrés** (5 cœur de S1 + BIC, TVA intracom FR, carte bancaire, code postal FR, plaque FR, date de naissance, adresse postale FR). Le rapport est désormais **téléchargeable en JSON, Markdown ou HTML autonome** (single-file, sans dépendance, CSP stricte, valeurs masquées par défaut). **Rien ne sort du navigateur** — vérifiable en direct via DevTools (`docs/comment-verifier-souverainete.md`).

| Jalon                                                                      | Statut   | Sortie                |
| -------------------------------------------------------------------------- | -------- | --------------------- |
| S0 — Squelette repo, README, LICENSE, ADRs, CI minimale                    | ✅ livré | premier commit public |
| S1 — Couche détecteurs (5 cœur : email, tel FR, NIR, IBAN, SIRET)          | ✅ livré | tag `v0.1.0`          |
| S2 — Engine + parseurs texte (CSV/TSV/TXT/MD/JSON) + pool Workers + façade | ✅ livré | tag `v0.2.0`          |
| S2.1 — Parseurs binaires (XLSX / XLS / PDF / DOCX / HTML)                  | ✅ livré | tag `v0.2.1`          |
| S3 — UI Angular (drop zone, rapport interactif, branchement pool)          | ✅ livré | tag `v0.3.0`          |
| S4 — 7 détecteurs étendus + exports JSON / Markdown / HTML autonome        | ✅ livré | tag `v0.4.0`          |
| S4.1 — CSP stricte + audit deps + WCAG AA + lazy-loading parseurs binaires | à venir  | tag `v0.4.1`          |
| S5 — Pipeline release, démo en ligne, doc finale                           | à venir  | **tag `v1.0.0`**      |

## Promesse

Quand un dirigeant, un DPO ou un RH se demande « est-ce que ce fichier que je m'apprête à envoyer contient des données qui ne devraient pas sortir ? », il a aujourd'hui le choix entre des outils DLP enterprise hors de prix, des SaaS américains qui exigent l'upload du fichier (le paradoxe absolu), ou une inspection manuelle irréaliste sur un fichier de 50 000 lignes.

`pii-scanner-web` cible ce moment. **Vérifier à froid, en cinq secondes, depuis son navigateur, sans rien envoyer nulle part.**

## Périmètre v1.0

**Douze détecteurs**, dont cinq avec validation par clé de contrôle :

- _Identifiants de personne_ — email, téléphone FR, **NIR** (clé MOD 97)
- _Identifiants administratifs_ — **SIRET / SIREN** (Luhn), **TVA intracom FR** (Luhn sur SIREN)
- _Identifiants bancaires_ — **IBAN** (MOD 97), BIC/SWIFT, **carte bancaire** (Luhn)
- _Coordonnées géographiques_ — code postal FR, adresse postale FR (heuristique)
- _Identifiants matériels et temporels_ — plaque d'immatriculation FR, date de naissance contextuelle

**Dix formats de fichier** : `.csv` `.tsv` `.xlsx` `.xls` `.pdf` `.docx` `.txt` `.md` `.json` `.html`.

**Quatre formats de sortie** : rapport interactif dans la SPA, export JSON (schéma versionné), export Markdown (lecture DPO), export HTML autonome (single-file, CSP stricte, sans script).

Pour le détail, voir `docs/detecteurs.md` et `docs/exports.md`.

## Comment vérifier la promesse souveraineté

Le fichier `docs/comment-verifier-souverainete.md` détaille le mode opératoire. En une phrase : ouvrir DevTools (onglet Réseau), déposer un fichier, lancer le scan, constater zéro requête sortante. Tout le code est auditable, la CSP est lisible dans `index.html`, et le résultat est reproductible en moins d'une minute.

## Distribution prévue

- **Démo officielle** : `https://pii-scanner.rezdevops.fr` (GitHub Pages, à venir avec v1.0)
- **Image Docker** : `ghcr.io/rezdevops/pii-scanner-web` (nginx servant les statiques, à venir)
- **Archive ZIP standalone** : ouvrable en double-clic sur `index.html`, mode hors-ligne intégral (à venir)
- **Source** : ce repo, build reproductible en local

## Développement

```bash
# Prérequis : Node 20+ et pnpm 9+
pnpm install --frozen-lockfile
pnpm format:check  # Prettier (CI bloquant)
pnpm build         # build des trois couches (ordre : packages avant app)
pnpm lint          # tsc --noEmit sur les deux tsconfig
pnpm test          # tests Vitest (env. 280 verts au total : ~140 détecteurs + ~115 engine + ~30 app)
pnpm dev           # SPA Angular en watch sur http://localhost:4200
```

L'ordre `format:check → build → lint → test` est volontaire : le `lint` (= `tsc --noEmit`) lit les `dist/*.d.ts` du package frère, donc le build doit passer avant. Voir `.github/workflows/ci.yml`.

L'architecture est en trois couches indépendantes :

- `@rezdevops/pii-detectors` — bibliothèque pure, sans I/O ni DOM. Publiée sur npm public.
- `@rezdevops/pii-scanner-engine` — orchestration des parseurs et du pool de workers.
- `pii-scanner-web` — application Angular, UI uniquement.

Cette séparation prépare une éventuelle déclinaison CLI ou desktop (Tauri) sans refonte. Voir `docs/architecture.md` et `docs/adr/`.

## Licence

[**AGPL-3.0**](LICENSE). Auditable, auto-hébergeable, libre d'usage. Le choix de l'AGPL plutôt que MIT est argumenté dans [`docs/adr/0002-licence-agpl.md`](docs/adr/0002-licence-agpl.md) — il protège la promesse souveraineté contre un repackaging SaaS opportuniste.

## Auteur

[Rudy Rezaire](https://github.com/RezDevOps) — RezDevOps, audit et applications web sur mesure pour TPE/PME.

L'outil signale des présences probables de PII et qualifie leur criticité ; il **n'interprète pas** la conformité RGPD. L'avis d'un avocat ou d'un DPO certifié reste indispensable.
