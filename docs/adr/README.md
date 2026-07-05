# Architecture Decision Records

Format MADR léger (Markdown Any Decision Records). Chaque décision est numérotée et porte un statut explicite : _proposed_, _accepted_, _deprecated_, _superseded_.

| #    | Titre                                                                                                 | Statut   | Date       |
| ---- | ----------------------------------------------------------------------------------------------------- | -------- | ---------- |
| 0001 | [Angular Material comme système d'UI](0001-angular-material.md)                                       | accepted | 2026-05-01 |
| 0002 | [Licence AGPL-3.0 pour pii-scanner-web](0002-licence-agpl.md)                                         | accepted | 2026-05-01 |
| 0003 | [Comlink pour la communication avec les Web Workers](0003-comlink-vs-workers-natifs.md)               | accepted | 2026-05-02 |
| 0004 | [mammoth pour l'extraction de texte DOCX](0004-mammoth-pour-docx.md)                                  | accepted | 2026-05-02 |
| 0005 | [SheetJS Community Edition pour XLSX/XLS](0005-sheetjs-pour-xlsx.md)                                  | accepted | 2026-05-02 |
| 0006 | [PDF.js pour l'extraction de texte PDF](0006-pdfjs-pour-pdf.md)                                       | accepted | 2026-05-02 |
| 0007 | [Lazy-loading des parseurs binaires via `import()` dynamique](0007-lazy-loading-parseurs-binaires.md) | accepted | 2026-05-02 |
| 0008 | [Web Worker du scan hébergé côté app, plus côté engine](0008-worker-app-side.md)                      | accepted | 2026-05-08 |
| 0009 | [Bump de la stack front-end : Angular 20 → Angular 21](0009-bump-angular-21.md)                       | accepted | 2026-05-08 |
| 0010 | [Migration CI Node : 20/22 → 22/24 (retrait Node 20 EOL)](0010-bump-node-22-24.md)                    | accepted | 2026-07-05 |

Toute décision structurante (changement de framework, ajout de dépendance significative, modification de la licence, exception à la promesse souveraineté) doit faire l'objet d'une nouvelle ADR ou d'un _superseded_ explicite.
