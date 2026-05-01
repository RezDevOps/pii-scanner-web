# Détecteurs

> **Statut : placeholder S0.** Le détail par détecteur (algorithme, source normative, exemples positifs et négatifs, edge cases) est consolidé en S1 quand les 5 détecteurs cœur sont implémentés, puis complété en S4 pour les 7 restants.

## Liste cible v1.0

Voir le tableau récapitulatif dans le [README de `@rezdevops/pii-detectors`](../packages/pii-detectors/README.md). Référence faisant foi : cadrage `12_PII_SCANNER_WEB_CADRAGE.md` § 4.1.

## Structure attendue par détecteur

Chaque détecteur sera documenté ici selon le canevas suivant :

```markdown
## <Nom du détecteur>

- **Identifiant** : `<detector-id>`
- **Source normative** : <référence + URL>
- **Sévérité par défaut** : critical | high | medium | low
- **Confiance type** : high | medium | low
- **Algorithme** : <description courte de la logique de détection et de la validation par clé>
- **Exemples positifs** : <3 à 5 valeurs qui doivent matcher>
- **Exemples négatifs** : <3 à 5 valeurs qui ne doivent pas matcher>
- **Faux positifs connus** : <cas limites assumés>
- **Edge cases** : <particularités, exceptions documentées>
```

Cette structure permet à un DPO ou un développeur tiers de comprendre exactement ce que fait chaque détecteur sans lire le code.

## Politique générale

- **Pas d'heuristique floue non documentée.** Une heuristique contextuelle (adresse, date de naissance) est explicitement étiquetée _confiance moyenne_ dans le rapport.
- **Validation par clé pour les identifiants normés** (NIR, IBAN, SIRET, TVA, carte bancaire). Un format qui matche sans clé valide est rejeté.
- **Sources citées** dans la documentation et dans le finding, pour permettre l'audit.
