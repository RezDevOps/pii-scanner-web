# Fixtures de test

> **Statut : politique posée S0.** Les fixtures elles-mêmes sont produites en S1 (cas par détecteur cœur) puis complétées en S4 (détecteurs restants + cas combinés multi-PII). Aucune fixture présente en S0.

## Politique non négociable

**Aucune donnée réelle, jamais.** Toutes les fixtures sont synthétiques, construites pour valider des algorithmes de détection — pas pour représenter de vraies personnes.

- Les NIR sont des séquences valides au sens de la clé MOD 97 mais correspondent à des combinaisons sexe/année/département délibérément non attribuées (ex. année `99`).
- Les IBAN respectent MOD 97 mais utilisent des codes banque inexistants ou réservés aux tests (`30001 00000` avec validation calculée).
- Les SIRET respectent Luhn mais sur des SIREN volontairement hors plage attribuée par l'INSEE.
- Les numéros de carte bancaire utilisent les ranges officiels de test des réseaux (Visa `4111 1111 1111 1111`, etc.) — eux-mêmes publics et destinés à ce type d'usage.
- Les adresses sont des plausibles construits (rues fictives, communes existantes mais sans correspondance personnelle).
- Les dates de naissance, plaques, codes postaux et numéros de téléphone sont synthétiques.

## Organisation cible

```
tests/fixtures/
├── README.md                    ← ce fichier
├── csv/
│   ├── propre.csv              ← CSV sans aucune PII (cas négatif global)
│   ├── multi-pii.csv           ← CSV combiné (cas dense)
│   ├── nir-valides.csv
│   ├── nir-invalides.csv       ← formats qui ressemblent mais clé KO
│   ├── iban-valides.csv
│   ├── iban-invalides.csv
│   └── ...
├── xlsx/
│   ├── multi-pii.xlsx
│   └── ...
├── pdf/
│   ├── facture-avec-iban.pdf
│   └── ...
├── docx/
│   └── ...
└── txt/
    ├── emails.txt
    └── ...
```

## Contrats de test (cible v1.0)

Pour chaque détecteur, deux fichiers de fixtures :

- `<detecteur>-valides.<format>` — N exemples qui doivent être détectés avec confiance attendue.
- `<detecteur>-invalides.<format>` — N exemples qui ressemblent au format mais doivent être rejetés (clé MOD 97 invalide, Luhn invalide, plage incorrecte, etc.).

Les tests Jest du package `@rezdevops/pii-detectors` consommeront ces fichiers via une matrice paramétrée.

## Reproductibilité

Toutes les fixtures sont générées par des scripts versionnés (futur dossier `tests/fixtures/scripts/`). Un script de re-génération `pnpm fixtures:rebuild` permet de reconstruire l'ensemble en cas d'évolution du format ou de la convention.
