# Détecteurs

> **Statut S1 (v0.1.0).** Les 5 détecteurs cœur sont livrés et testés. Les 7 détecteurs restants (`bic`, `card`, `siren`, `tva-intracom-fr`, `postal-code-fr`, `postal-address-fr`, `license-plate-fr`, `date-of-birth`) seront ajoutés en S4. Référence faisant foi : cadrage `12_PII_SCANNER_WEB_CADRAGE.md` § 4.1.

## Politique générale

- **Pas d'heuristique floue non documentée.** Une heuristique contextuelle (adresse, date de naissance — S4) est explicitement étiquetée _confiance moyenne_ dans le rapport.
- **Validation par clé pour les identifiants normés** (NIR, IBAN, SIRET, TVA, carte bancaire). Un format qui matche sans clé valide est rejeté — pas de finding émis.
- **Pas d'I/O, pas de DOM, pas d'état partagé.** Chaque détecteur expose un `detect(text: string): readonly Finding[]` pur et idempotent.
- **Sources citées** dans le code (`Detector.source`) et ici, pour permettre l'audit.

## Tableau récapitulatif (v0.1.0)

| Identifiant | Sévérité par défaut | Confiance | Validation par clé               |
| ----------- | ------------------- | --------- | -------------------------------- |
| `email`     | medium              | high      | non (forme)                      |
| `phone-fr`  | medium              | high      | non (forme + plan ARCEP)         |
| `nir`       | critical            | high      | oui (97 − N mod 97)              |
| `iban`      | critical            | high      | oui (MOD 97 ISO 13616)           |
| `siret`     | high                | high      | oui (Luhn + dérogation La Poste) |

---

## Email

- **Identifiant** : `email`
- **Source normative** : WHATWG HTML Living Standard, [§4.10.5.1.5 — Valid e-mail address](https://html.spec.whatwg.org/multipage/input.html#valid-e-mail-address) (sous-ensemble strictement plus restrictif que la RFC 5322).
- **Sévérité par défaut** : `medium` — un email seul est rarement à lui seul une donnée critique, mais reste une PII au sens du RGPD art. 4(1).
- **Confiance type** : `high` dès que le format matche (pas de clé à vérifier).
- **Algorithme** : expression régulière mono-passe sur le texte. Local-part = `[A-Za-z0-9!#$%&'*+/=?^_\`{|}~-]+` avec points internes autorisés. Domaine = labels DNS conformes RFC 1035 + TLD alphabétique de 2 à 63 caractères.
- **Exemples positifs** : `alice@example.com`, `b.b+filter@sub.example.org`, `r.rezaire@gmail.com`.
- **Exemples négatifs** : `https://example.com/contact` (pas de `@`), `alice@x.f` (TLD < 2 lettres), `@example.com` (local-part vide).
- **Faux positifs connus** : URLs contenant un `@` (rares) — assumé.
- **Edge cases** : pas de support des adresses entre guillemets (`"alice"@example.com`), pas de support des IP littérales (`alice@[192.0.2.1]`). Couvert en S4 si demande terrain.

## Téléphone FR

- **Identifiant** : `phone-fr`
- **Source normative** : ARCEP, [plan national de numérotation téléphonique](https://www.arcep.fr/professionnels/numerotation-telephonique/le-plan-national-de-numerotation.html), arrêté du 16 janvier 2018 et mises à jour ultérieures.
- **Sévérité par défaut** : `medium`.
- **Confiance type** : `high` — la conformité au plan ARCEP est une validation forte (pas de clé numérique disponible).
- **Algorithme** : regex avec lookbehind / lookahead `(?<!\d)` / `(?!\d)` pour éviter les faux positifs au milieu d'une longue suite de chiffres (références internes, identifiants techniques). Reconnaît les formes nationale (`0X XX XX XX XX`), internationale (`+33 X XX XX XX XX`) et préfixe `0033`. Séparateurs autorisés : espace, point, tiret, ou aucun. Le détecteur classe le numéro dans `metadata.kind` selon le préfixe : `mobile` (06/07), `fixe` (01-05), `non-geo` (09), `svp` (08).
- **Exemples positifs** : `06 12 34 56 78`, `06.12.34.56.78`, `+33 6 12 34 56 78`, `0033612345678`, `01 23 45 67 89`.
- **Exemples négatifs** : `06 12 34 56` (incomplet), `0044 612345678` (pas un préfixe FR), `REF06123456789012` (collé à des chiffres).
- **Faux positifs connus** : codes-barres EAN-13 contenant accidentellement un préfixe valide — improbable en pratique grâce à l'anti-glissement.
- **Edge cases** : numéros courts (4 à 6 chiffres) ignorés (hors périmètre).

## NIR (numéro de Sécurité sociale)

- **Identifiant** : `nir`
- **Source normative** : Code de la Sécurité sociale, art. R115-1 et s. ; [INSEE — codification du NIR](https://www.insee.fr/fr/information/2114723).
- **Sévérité par défaut** : `critical` — le NIR appartient aux catégories particulières au sens art. 9 RGPD via inférence sexe / origine. Sa fuite déclenche une obligation de notification CNIL.
- **Confiance type** : `high` — émis uniquement si la clé est valide.
- **Algorithme** : regex tolérante sur 15 caractères (chiffres + département `2A`/`2B`), avec espaces internes autorisés (forme bulletin de salaire `1 99 03 19 234 567 89`). Normalisation puis validation par la formule officielle **clé = 97 − (N mod 97)**, où N est le grand entier formé par les 13 premiers chiffres. Cas Corse géré explicitement : `2A` → `19` avec offset −1 000 000, `2B` → `18` avec offset −2 000 000.
- **Exemples positifs** : tout NIR dont la clé est correcte (les fixtures de tests construisent dynamiquement les NIR via `validateNir().computedKey` pour ne pas exposer de combinaison sexe/année/département choisie au hasard).
- **Exemples négatifs** : `199017512345600` (15 chiffres bien formés mais clé fausse), `599017512345678` (sexe `5` invalide), suite de 15 chiffres collée à un autre identifiant.
- **Faux positifs connus** : aucun documenté grâce à la validation par clé.
- **Edge cases** : le NIR Corse 2A/2B nécessite l'offset spécifique — testé séparément. Les NIR provisoires (sexe 7 ou 8) sont reconnus.

## IBAN

- **Identifiant** : `iban`
- **Source normative** : ISO 13616-1:2020 (calcul de la clé MOD 97-10) ; [IBAN Registry SWIFT](https://www.swift.com/standards/data-standards/iban-international-bank-account-number) pour la longueur par pays (table figée dans `lib/iban-lengths.ts`, ~90 pays).
- **Sévérité par défaut** : `critical` — un IBAN dans un fichier non sécurisé peut alimenter des fraudes au virement (« arnaque au président », usurpation de RIB fournisseur).
- **Confiance type** : `high` — émis uniquement si MOD 97 vaut 1.
- **Algorithme** : regex tolérante au format imprimé par groupes de 4 (`FR14 2004 1010 ...`), normalisation par suppression des espaces, vérification de la longueur attendue pour le code pays, puis validation MOD 97 (déplacement des 4 premiers caractères en fin, conversion lettres → chiffres avec `A`=10 ... `Z`=35, calcul du modulo 97 par tranches de 9 chiffres pour rester sous `Number.MAX_SAFE_INTEGER`). `metadata.country` et `metadata.normalized` sont exposés pour l'export.
- **Exemples positifs** : `FR1420041010050500013M02606` (exemple canonique CFONB), `DE89370400440532013000`, `GB29NWBK60161331926819`, `BE68539007547034`. Tous publiquement documentés comme exemples de tests.
- **Exemples négatifs** : `FR1420041010050500013M02607` (un seul chiffre changé → MOD 97 cassé), `ZZ1420041010050500013M02606` (code pays inconnu), `FR142004101005050001` (longueur incorrecte pour FR).
- **Faux positifs connus** : aucun — la validation MOD 97 est extrêmement sélective.
- **Edge cases** : nouveaux codes pays IBAN ajoutés au registre SWIFT après la version courante de la table → patch mineur prévu.

## SIRET

- **Identifiant** : `siret`
- **Source normative** : [INSEE — méthodologie SIRENE](https://www.insee.fr/fr/information/2406147) ; ISO/IEC 7812-1 pour la définition de Luhn.
- **Sévérité par défaut** : `high` — les SIRET sont publics (consultables sur l'annuaire SIRENE), mais leur présence en masse dans un export RH ou comptable peut révéler indirectement la structure d'une organisation et ses partenaires.
- **Confiance type** : `high`.
- **Algorithme** : regex tolérante au format imprimé par groupes de 3 puis NIC sur 5 chiffres (`732 829 320 00074`), normalisation par suppression des espaces, contrôle de longueur (14 chiffres exactement), puis validation Luhn. **Dérogation La Poste** : pour `SIREN = 356000000`, l'INSEE applique la règle alternative « somme des 14 chiffres divisible par 5 » en lieu et place de Luhn — implémentée explicitement pour ne pas générer de faux négatifs sur les SIRET de La Poste. `metadata.siren` et `metadata.nic` exposés.
- **Exemples positifs** : `73282932000074` (SIRET utilisé par l'INSEE pour expliquer Luhn dans sa notice publique), `732 829 320 00074` (forme imprimée), tout SIRET La Poste dont la somme des 14 chiffres est divisible par 5.
- **Exemples négatifs** : `73282932000075` (Luhn cassé), SIRET La Poste dont la somme n'est pas multiple de 5 (`35600000000048`, somme = 26), suite de 13 ou 15 chiffres (mauvaise longueur).
- **Faux positifs connus** : tout numéro à 14 chiffres respectant Luhn par hasard (très rare). En pratique, la combinaison contexte fichier + SIREN existant filtre suffisamment.
- **Edge cases** : SIREN seul (9 chiffres avec Luhn) sera couvert par le détecteur dédié `siren` en S4 — il déclenche aujourd'hui un faux négatif assumé sur les fichiers ne contenant que des SIREN.
