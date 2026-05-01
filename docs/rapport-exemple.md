# Rapport — exemple

> **Statut : placeholder S0.** Un exemple complet de sortie Markdown est généré en S4 à partir de la fixture multi-PII fournie dans `tests/fixtures/`. L'objectif est qu'un prospect qui ouvre le repo voie immédiatement à quoi ressemble le livrable, sans installer ni déposer de fichier.

## Forme attendue (ébauche)

Le rapport Markdown final aura la structure suivante :

```
# Rapport pii-scanner-web — <date ISO>

## Synthèse
- N fichiers scannés, M findings agrégés
- Verdict global : <vert | orange | rouge> selon la criticité maximale
- Durée totale du scan

## Par fichier
### <fichier-1>
- Format détecté, taille, durée
- Tableau récapitulatif par catégorie de PII (count + confiance moyenne)
- Findings critiques listés (avec contexte masqué par défaut, révélable)

### <fichier-2>
...

## Par catégorie de PII
- Email : N occurrences, X fichiers concernés
- IBAN : N occurrences (validés MOD 97)
- ...

## Méthodologie
- Détecteurs activés
- Version de l'engine et de la lib de détecteurs
- Lien vers la documentation de chaque détecteur
- Mention explicite : « Cet outil signale, n'interprète pas la conformité RGPD ».
```

## Verdict global

Le calcul du verdict est figé en S4. Règle préliminaire :

- **Rouge** si au moins un finding `critical` avec confiance `high` ou plus.
- **Orange** si findings `critical` à confiance `medium` ou findings `high` à confiance `high`.
- **Vert** sinon (l'absence de findings critiques ou l'unique présence de findings basse confiance).

À valider auprès d'un DPO partenaire avant verrouillage.
