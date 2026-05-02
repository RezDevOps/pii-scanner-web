# Exports

> **Statut S4 (v0.4.0)** — trois sérialiseurs livrés (JSON, Markdown, HTML autonome). API `@rezdevops/pii-scanner-engine`. UI Angular branchée via les boutons de la barre d'export du composant `psw-report`.

## Vue d'ensemble

| Format            | API                                  | MIME                             | Usage cible                                                              |
| ----------------- | ------------------------------------ | -------------------------------- | ------------------------------------------------------------------------ |
| **JSON**          | `toJsonReport(report, options?)`     | `application/json;charset=utf-8` | Échange machine, intégration outil tiers, futur back-office RezDevOps    |
| **Markdown**      | `toMarkdownReport(report, options?)` | `text/markdown;charset=utf-8`    | Lecture par DPO / juriste / dirigeant, archivage en gestion documentaire |
| **HTML autonome** | `toHtmlReport(report, options?)`     | `text/html;charset=utf-8`        | Archivage / partage du rapport sans dépendance externe, impression       |

Tous les exports prennent une option `mask: 'none' | 'partial' | 'full'` (défaut `partial`) appliquée à la frontière de sortie — l'engine garde la valeur brute en interne, la décision de masquage n'intervient qu'à l'export.

## Modèle commun

Tous les sérialiseurs partent du même `ScanReport` retourné par `runScan()`. La sérialisation est **pure** (sans I/O, sans dépendance navigateur), pour permettre :

- Les tests unitaires (Vitest pur Node).
- L'usage côté CLI ou backend ultérieur (Node, Tauri, Bun).
- La déterminisme : 2 appels successifs sur le même rapport produisent **exactement** la même sortie.

## JSON

Schéma versionné via la constante `REPORT_SCHEMA_VERSION` (actuellement `"1.0"`). Évolution prévue :

- `1.0` (v0.4.0) — structure initiale, synthèse calculée à l'export.
- `1.1` (post-v0.4) — ajoutera `errors[]` quand l'engine exposera les `file-failed` dans le `ScanReport`.

Structure de sortie (extrait) :

```jsonc
{
  "reportSchema": "1.0",
  "reportId": "scan-...",
  "generatedAt": "2026-05-02T10:00:00.000Z",
  "engineVersion": "0.4.0",
  "maskLevel": "partial",
  "summary": {
    "totalFiles": 2,
    "totalFindings": 3,
    "bySeverity": { "critical": 1, "medium": 1, "low": 1 },
    "byDetector": { "card": 1, "email": 1, "postal-code-fr": 1 },
    "byFile": { "clients.csv": 3, "config.json": 0 },
  },
  "files": [
    {
      "fileName": "clients.csv",
      "format": "csv",
      "size": 1024,
      "durationMs": 42,
      "findingCount": 3,
      "findings": [
        {
          "detector": "card",
          "value": "************4242",
          "confidence": "high",
          "severity": "critical",
          "location": { "start": 10, "end": 26, "line": 2 },
          "metadata": {
            "brand": "visa",
            "length": 16,
            "last4": "4242",
            "bin": "424242",
          },
        },
      ],
    },
  ],
}
```

Sortie indentée 2 espaces, terminée par un newline. `JSON.parse(toJsonReport(report))` fonctionne en round-trip avec `buildJsonReport(report)`.

## Markdown

Cible lecteur : DPO, juriste, dirigeant non-tech (cadrage § 10 critère 2). Optimise la lisibilité plutôt que la densité d'information.

Sections produites :

1. **Verdict** — total des données détectées + sévérité maximale, en gras.
2. **Synthèse par fichier** — tableau (Fichier / Format / Taille / Durée / Findings / Sévérité max).
3. **Détail par fichier** — sous-section par fichier avec table des findings (#, Détecteur, Sévérité, Confiance, Position, Valeur).
4. **Footer souveraineté** — rappel que les données sont traitées 100 % en local.

Les valeurs des findings sont entourées de backticks pour rendu monospace dans la plupart des viewers Markdown.

## HTML autonome

Single-file. Ouvre en double-clic. Contraintes assumées :

- **Aucune balise `<script>`** dans le rendu — l'interactivité (révélation des valeurs masquées) est CSS-only via `:hover` et `:focus-within`. Un DPO paranoïaque peut ouvrir le rapport sans craindre une exécution.
- **CSP stricte posée en `<meta>`** : `default-src 'none'; style-src 'unsafe-inline'`. Le CSS inline est explicitement autorisé, tout le reste est bloqué (image, fetch, script, frame, font…).
- **Toute valeur dynamique passée par `escapeHtml`** — pas d'XSS possible même si un nom de fichier ou une valeur de finding contient `<script>` ou `<img onerror=...>`.
- **Mode sombre automatique** via `@media (prefers-color-scheme: dark)`.
- **Style imprimable** via `@media print` — couleurs simplifiées, blur retiré pour permettre l'impression du rapport en clair.
- **Accessibilité** — chaque cellule de valeur masquée porte un `tabindex="0"` et un `aria-label` explicite ; le badge de sévérité a un libellé textuel.

Options spécifiques :

```ts
toHtmlReport(report, {
  mask: "partial", // 'none' | 'partial' | 'full'
  title: "Rapport DPO Q2", // injecté dans <title> et <h1>
  locale: "fr-FR", // réservé pour usage futur
});
```

## Téléchargement (UI Angular)

Le composant `psw-report` expose trois boutons (`JSON`, `Markdown`, `HTML autonome`). Le clic appelle `buildExportPayload(report, { format })` puis `triggerDownload(payload, document)` :

- Construction d'un `Blob` avec le bon MIME type.
- Création d'un `<a download="...">` invisible, click programmatique, retrait immédiat.
- `URL.createObjectURL` + `URL.revokeObjectURL` pour libérer la mémoire.

Le téléchargement reste **100 % local** : aucune requête réseau n'est émise. La promesse souveraineté du cadrage § 1.2 est tenue jusqu'au dernier acte.

Nom de fichier généré : `scan-<reportId>-<YYYYMMDD>-<HHmmss>.<ext>`. Le `reportId` est nettoyé (caractères ASCII alphanumériques + `-` + `_` uniquement) pour éviter tout caractère exotique dans le nom de fichier.
