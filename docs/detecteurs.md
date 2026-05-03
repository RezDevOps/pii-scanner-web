# Détecteurs

> **Statut S4 (v0.4.0)** — 12 détecteurs livrés. Les 5 cœur de S1 (`email`, `phone-fr`, `nir`, `iban`, `siret`) sont rejoints par 7 détecteurs étendus : `bic`, `tva-intracom-fr`, `card`, `postal-code-fr`, `license-plate-fr`, `date-of-birth`, `postal-address-fr`. Le `DetectorId` `siren` reste déclaré mais sans implémentation (couvert plus tard via détecteur composite SIREN-en-contexte). Référence faisant foi : cadrage `12_PII_SCANNER_WEB_CADRAGE.md` § 4.1.

## Politique générale

- **Validation par clé pour les identifiants normés** (NIR, IBAN, SIRET, TVA, carte bancaire, BIC). Un format qui matche sans clé valide est rejeté — pas de finding émis.
- **Confiance graduée** : `high` quand une clé arithmétique valide ; `medium` quand le format est strict mais sans clé (FNI plaque, par exemple) ; `low` pour les heuristiques (date isolée, code postal nu, adresse complète).
- **Pas d'I/O, pas de DOM, pas d'état partagé.** Chaque détecteur expose un `detect(text: string): readonly Finding[]` pur et idempotent.
- **Sources citées** dans le code (`Detector.source`) et ici, pour permettre l'audit.

## Tableau récapitulatif (v0.4.0)

| Identifiant         | Sévérité par défaut | Confiance                 | Validation par clé                |
| ------------------- | ------------------- | ------------------------- | --------------------------------- |
| `email`             | medium              | high                      | non (forme WHATWG)                |
| `phone-fr`          | medium              | high                      | non (forme + plan ARCEP)          |
| `nir`               | critical            | high                      | oui (97 − N mod 97)               |
| `iban`              | critical            | high                      | oui (MOD 97 ISO 13616)            |
| `bic`               | high                | high                      | non (structure ISO 9362 + pays)   |
| `siret`             | high                | high                      | oui (Luhn + dérogation La Poste)  |
| `tva-intracom-fr`   | medium              | high                      | oui (MOD 97 sur SIREN)            |
| `card`              | critical            | high                      | oui (Luhn + IIN par scheme)       |
| `postal-code-fr`    | low                 | low                       | non (plages La Poste/INSEE)       |
| `license-plate-fr`  | medium              | high (SIV) / medium (FNI) | non (structure)                   |
| `date-of-birth`     | medium              | low                       | non (calendrier strict 1900-2100) |
| `postal-address-fr` | high                | low                       | non (heuristique tête + queue)    |

---

## Email

- **Identifiant** : `email`
- **Source normative** : WHATWG HTML Living Standard, [§4.10.5.1.5 — Valid e-mail address](https://html.spec.whatwg.org/multipage/input.html#valid-e-mail-address) (sous-ensemble strictement plus restrictif que la RFC 5322).
- **Sévérité par défaut** : `medium` — un email seul est rarement à lui seul une donnée critique, mais reste une PII au sens du RGPD art. 4(1).
- **Confiance type** : `high` dès que le format matche (pas de clé à vérifier).
- **Algorithme** : expression régulière mono-passe sur le texte. Local-part = `[A-Za-z0-9!#$%&'*+/=?^_\`{|}~-]+` avec points internes autorisés. Domaine = labels DNS conformes RFC 1035 + TLD alphabétique de 2 à 63 caractères.
- **Exemples positifs** : `alice@example.com`, `b.b+filter@sub.example.org`, `contact@rezdevops.com`.
- **Exemples négatifs** : `https://example.com/contact` (pas de `@`), `alice@x.f` (TLD < 2 lettres), `@example.com` (local-part vide).
- **Faux positifs connus** : URLs contenant un `@` (rares) — assumé.
- **Edge cases** : pas de support des adresses entre guillemets (`"alice"@example.com`), pas de support des IP littérales (`alice@[192.0.2.1]`).

## Téléphone FR

- **Identifiant** : `phone-fr`
- **Source normative** : ARCEP, [plan national de numérotation téléphonique](https://www.arcep.fr/professionnels/numerotation-telephonique/le-plan-national-de-numerotation.html), arrêté du 16 janvier 2018 et mises à jour ultérieures.
- **Sévérité par défaut** : `medium`.
- **Confiance type** : `high` — la conformité au plan ARCEP est une validation forte (pas de clé numérique disponible).
- **Algorithme** : regex avec lookbehind / lookahead `(?<!\d)` / `(?!\d)` pour éviter les faux positifs au milieu d'une longue suite de chiffres. Reconnaît les formes nationale (`0X XX XX XX XX`), internationale (`+33 X XX XX XX XX`) et préfixe `0033`. `metadata.kind` : `mobile` (06/07), `fixe` (01-05), `non-geo` (09), `svp` (08).
- **Exemples positifs** : `06 12 34 56 78`, `06.12.34.56.78`, `+33 6 12 34 56 78`, `0033612345678`, `01 23 45 67 89`.
- **Exemples négatifs** : `06 12 34 56` (incomplet), `0044 612345678` (pas un préfixe FR), `REF06123456789012` (collé à des chiffres).

## NIR (numéro de Sécurité sociale)

- **Identifiant** : `nir`
- **Source normative** : Code de la Sécurité sociale, art. R115-1 et s. ; [INSEE — codification du NIR](https://www.insee.fr/fr/information/2114723).
- **Sévérité par défaut** : `critical` — le NIR appartient aux catégories particulières au sens art. 9 RGPD via inférence sexe / origine. Sa fuite déclenche une obligation de notification CNIL.
- **Confiance type** : `high` — émis uniquement si la clé est valide.
- **Algorithme** : regex tolérante sur 15 caractères (chiffres + département `2A`/`2B`), avec espaces internes autorisés. Validation par la formule officielle **clé = 97 − (N mod 97)**, où N est le grand entier formé par les 13 premiers chiffres. Cas Corse géré explicitement : `2A` → `19` avec offset −1 000 000, `2B` → `18` avec offset −2 000 000.

## IBAN

- **Identifiant** : `iban`
- **Source normative** : ISO 13616-1:2020 (calcul de la clé MOD 97-10) ; [IBAN Registry SWIFT](https://www.swift.com/standards/data-standards/iban-international-bank-account-number) pour la longueur par pays (~90 pays).
- **Sévérité par défaut** : `critical` — un IBAN dans un fichier non sécurisé peut alimenter des fraudes au virement.
- **Confiance type** : `high` — émis uniquement si MOD 97 vaut 1.
- **Algorithme** : regex tolérante au format imprimé par groupes de 4, normalisation par suppression des espaces, vérification de la longueur attendue pour le code pays, puis validation MOD 97 par tranches de 9 chiffres.

## BIC (code SWIFT)

- **Identifiant** : `bic`
- **Source normative** : ISO 9362:2022 (Banking — Business Identifier Code) ; SWIFT BIC Policy v3.4.
- **Sévérité par défaut** : `high` — un BIC seul n'est pas critique (donnée publique), mais la combinaison BIC + IBAN finalise l'identification d'un compte bancaire.
- **Confiance type** : `high` — la structure est très contrainte (lettres uniquement sur 6 positions, pays ISO 3166-1 vérifié).
- **Algorithme** : regex `[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?`, exige 8 ou 11 caractères. Le code pays (positions 5-6) est vérifié contre la table ISO 3166-1 alpha-2 (250 codes officiels + Kosovo `XK`). `metadata.institution` / `metadata.country` / `metadata.location` / `metadata.branch?` exposés.
- **Exemples positifs** : `BNPAFRPP` (BNP Paribas Paris, 8 chars), `SOGEFRPPXXX` (Société Générale Paris, 11 chars avec branche), `DEUTDEFF500` (Deutsche Bank Frankfurt branche 500).
- **Exemples négatifs** : `BNP1FRPP` (chiffre dans le code institution), `ABCDZZPP` (code pays inexistant), `BNPAFRPPX` (longueur 9 — invalide).
- **Faux positifs connus** : aucun documenté, le contrôle pays + structure est très sélectif.

## SIRET

- **Identifiant** : `siret`
- **Source normative** : [INSEE — méthodologie SIRENE](https://www.insee.fr/fr/information/2406147) ; ISO/IEC 7812-1 pour Luhn.
- **Sévérité par défaut** : `high`.
- **Confiance type** : `high`.
- **Algorithme** : regex tolérante au format imprimé, normalisation, contrôle de longueur (14 chiffres), validation Luhn. **Dérogation La Poste** : pour `SIREN = 356000000`, règle alternative « somme des 14 chiffres divisible par 5 ». `metadata.siren` / `metadata.nic` exposés.

## TVA intracommunautaire (France)

- **Identifiant** : `tva-intracom-fr`
- **Source normative** : [DGFiP — numéro de TVA intracommunautaire](https://www.impots.gouv.fr/professionnel/tva-intracommunautaire) ; Commission européenne — VIES.
- **Sévérité par défaut** : `medium` — le numéro de TVA intracom est public pour les entreprises, mais sa présence dans un fichier RH ou client peut révéler une activité de micro-entrepreneur (donnée individuelle).
- **Confiance type** : `high` — émis uniquement si la clé MOD 97 est cohérente avec le SIREN.
- **Algorithme** : capture `FR\s?\d{2}\s?\d{9}`, normalisation, validation **clé = (12 + 3 × (SIREN mod 97)) mod 97**. Le SIREN n'est pas re-vérifié par Luhn (la clé MOD 97 assure déjà la cohérence intrinsèque). `metadata.country` / `metadata.key` / `metadata.siren` / `metadata.normalized` exposés.
- **Exemples positifs** : `FR44732829320` (exemple INSEE), forme imprimée `FR 44 732 829 320`. La primitive `computeTvaIntracomFrKey(siren)` permet de reconstruire dynamiquement la clé pour les fixtures.
- **Exemples négatifs** : `FR99732829320` (clé incohérente), `FR4473282932` (longueur incorrecte), `FRK7732829320` (variante alphanumérique non couverte — limite documentée).
- **Limites assumées** : les variantes de clé alphanumériques (lettres en première et/ou seconde position de la clé) ne sont **pas couvertes** en v0.4.0. Elles représentent < 1 % des TVA FR émis ; couverture en backlog v1.x si demande terrain.

## Carte bancaire (PAN)

- **Identifiant** : `card`
- **Source normative** : ISO/IEC 7812-1:2017 (Identification of issuers — Luhn) ; plages d'IIN documentées par les schemes (Visa, Mastercard, Amex, etc.).
- **Sévérité par défaut** : `critical` — un PAN exposé permet une fraude immédiate. Donnée la plus sensible du périmètre PII couvert.
- **Confiance type** : `high` — émis uniquement si Luhn valide ET marque connue.
- **Algorithme** : capture 13 à 19 chiffres avec espaces ou tirets tolérés (forme imprimée `XXXX XXXX XXXX XXXX`), validation Luhn, identification de la marque par préfixe (Visa `4xx`, Mastercard `51-55` ou `2221-2720`, Amex `34/37`, Discover `6011/65/644-649`, JCB `3528-3589`, Diners `300-305/3095/36/38/39`, UnionPay `62/81`). Un PAN qui valide Luhn mais ne matche aucune marque connue est rejeté (très probable faux positif sur un identifiant interne). `metadata.brand` / `metadata.length` / `metadata.last4` / `metadata.bin` exposés.
- **Exemples positifs** (PAN de TEST publics, jamais associés à un titulaire réel) : `4242424242424242` (Visa Stripe), `5555555555554444` (Mastercard Stripe), `378282246310005` (Amex Stripe, 15 chiffres), `30569309025904` (Diners 14 chiffres).
- **Exemples négatifs** : `4242424242424241` (Luhn cassé), `1234567890123452` (Luhn OK mais préfixe `1` non couvert), suite de 16 chiffres dans une longue séquence numérique (lookaround filtre).
- **Faux positifs connus** : très rares grâce à la combinaison Luhn + marque. Cartes nationales (Cartes Bancaires CB, RuPay) tombent en `unknown` et sont rejetées — couverture future si demande terrain.

## Code postal (France)

- **Identifiant** : `postal-code-fr`
- **Source normative** : La Poste — [Référentiel des codes postaux](https://www.laposte.fr/) ; INSEE — Code officiel géographique (COG).
- **Sévérité par défaut** : `low` — un code postal seul n'identifie pas une personne. Sa valeur principale est de servir de signal d'amorce pour des détections composites (voir `postal-address-fr`).
- **Confiance type** : `low` — un code postal nu produit beaucoup de faux positifs (codes article, références à 5 chiffres).
- **Algorithme** : capture exactement 5 chiffres encadrés par des bornes non-numériques. Validation par plage : Métropole `01000-95999` ∪ DOM-TOM/Monaco `97000-98999`. Plages exclues : `00xxx` (jamais attribué), `96xxx` (réservé non utilisé), `99xxx`. `metadata.department` exposé (2 premiers chiffres).
- **Exemples positifs** : `75001` (Paris), `13001` (Marseille), `97300` (Cayenne), `98000` (Monaco).
- **Exemples négatifs** : `00500`, `96000`, `99000`, `7500` (4 chiffres), `750010` (6 chiffres).

## Plaque d'immatriculation (France)

- **Identifiant** : `license-plate-fr`
- **Source normative** : Arrêté du 9 février 2009 (SIV) ; Code de la route, art. R317-8 ; documentation Sécurité routière.
- **Sévérité par défaut** : `medium` — une plaque identifie un véhicule, indirectement un titulaire (via SIV-FNV).
- **Confiance type** : `high` pour le format SIV (lettres exclues `I`, `O`, `U`), `medium` pour le format FNI historique (collisions plus fréquentes avec des références produit ou des codes postaux).
- **Algorithme** : deux passes regex.
  - **SIV** (depuis 2009) : `[A-HJ-NP-TV-Z]{2}[\s-]\d{3}[\s-][A-HJ-NP-TV-Z]{2}` (8 caractères normalisés).
  - **FNI** (avant 2009) : `\d{1,4}[\s-][A-Z]{1,3}[\s-]\d{1,3}` avec validation du département (01-95 ∪ 971-976).
- **Exemples positifs** : `AB-123-CD`, `AB 123 CD` (SIV), `1234 AB 56`, `1234 AB 974` (FNI DOM-TOM).
- **Exemples négatifs** : `AI-123-CD` (lettre `I` exclue en SIV), `1234 AB 99` (département inexistant), `XAB-123-CD` (chaîne adjacente).
- **Formats non couverts** : plaques diplomatiques (`CD`, `CMD`), militaires, temporaires `WW`, agricoles `TT`. Hors périmètre v1.

## Date de naissance

- **Identifiant** : `date-of-birth`
- **Source normative** : ISO 8601 (Date and time format) ; calendrier grégorien strict.
- **Sévérité par défaut** : `medium` — donnée à caractère personnel (RGPD art. 4.1) et identifiant indirect classique.
- **Confiance type** : `low` — assumée et documentée. Une date isolée est extrêmement courante dans tout fichier (date de facturation, contrat, expiration), impossible de distinguer une date de naissance d'une autre date sans contexte sémantique. Le rapport doit présenter ces findings comme « dates candidates » plutôt que comme des dates de naissance certifiées.
- **Algorithme** : 4 formats reconnus : `JJ/MM/AAAA`, `JJ-MM-AAAA`, `JJ.MM.AAAA`, `AAAA-MM-JJ`. Le séparateur est cohérent au sein d'une même date (back-reference). Validation calendaire stricte (gestion bissextiles, jours valides par mois). Année bornée à `[1900, 2100]` — borne volontaire, indépendante de l'horloge. `metadata.format` (`dmy` ou `iso`) et `metadata.iso` (forme normalisée AAAA-MM-JJ) exposés.
- **Exemples positifs** : `14/07/1989`, `01-01-2000`, `31.12.1999`, `1989-07-14`, `29/02/2024` (bissextile).
- **Exemples négatifs** : `31/02/2000` (jour impossible), `29/02/2023` (non bissextile), `01/01/1899` (avant 1900), `14/07-1989` (séparateurs mixtes).

## Adresse postale (France)

- **Identifiant** : `postal-address-fr`
- **Source normative** : AFNOR NF Z10-011 (norme adresse postale française) ; [Base Adresse Nationale](https://adresse.data.gouv.fr/).
- **Sévérité par défaut** : `high` — une adresse postale complète est l'un des identifiants directs les plus discriminants (RGPD art. 4.1) — niveau équivalent à un nom + prénom.
- **Confiance type** : `low` — assumée et documentée. Le cadrage § 10 critère 1 documente explicitement que des faux positifs sur cette catégorie sont acceptables (extraits de catalogues, descriptions narratives qui comportent fortuitement « 12 rue Machin »).
- **Algorithme** : reconnaît une **tête** (numéro 1-4 chiffres + suffixe `bis`/`ter`/`quater` toléré + type de voie + nom de voie en texte libre) suivie d'une **queue** (code postal valide via `isFrenchPostalCode` + nom de ville en casse de titre ou majuscules). Tout match dont le code postal n'est pas dans une plage La Poste/INSEE est rejeté. Types de voie reconnus (~20) : rue, avenue, av., boulevard, bd., allée, chemin, impasse, place, cours, quai, route, rte, villa, cité, sentier, passage, square, esplanade, promenade, voie, rond-point, faubourg, fbg, hameau, lieu-dit. `metadata.postalCode` / `metadata.city?` exposés.
- **Exemples positifs** : `12 rue de la Paix 75002 Paris`, `5 avenue des Champs-Élysées, 75008 Paris`, `12 bis rue Voltaire 69003 Lyon`, `3 av. Foch 75116 Paris`, `1 place Bellecour 69002 Lyon`.
- **Exemples négatifs** : `12 machin de la Paix 75002 Paris` (type de voie inconnu), `rue de la Paix 75002 Paris` (pas de numéro), `12 rue de la Paix Paris` (pas de CP), `12 rue de la Paix 96000 Paris` (CP invalide).
