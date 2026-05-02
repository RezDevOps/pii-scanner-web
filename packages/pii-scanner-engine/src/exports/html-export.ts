/**
 * Sérialiseur HTML autonome (single-file) pour `ScanReport`.
 *
 * Cible : archivage / partage du rapport sans dépendance externe. Le
 * fichier produit s'ouvre en double-clic depuis n'importe quel système de
 * fichiers, ne fait **aucune** requête réseau, intègre son CSS en `<style>`
 * dans le `<head>`, et masque les valeurs sensibles par défaut (révélation
 * au survol via une feuille de style imprimable).
 *
 * Garanties sécurité :
 *  - Toute valeur dynamique (nom de fichier, valeurs de findings,
 *    métadonnées) passe par `escapeHtml` — pas d'XSS possible.
 *  - Aucune balise `<script>` dans le rendu (zéro JavaScript). L'inter-
 *    activité (révélation des valeurs) est CSS-only via `:hover` et
 *    `:focus-within`. Cela garantit qu'un consommateur paranoïaque (DPO,
 *    juriste) peut ouvrir le rapport sans craindre une exécution.
 *  - `Content-Security-Policy` posée en `<meta>` :
 *    `default-src 'none'; style-src 'unsafe-inline'`. Le CSS inline est
 *    explicitement autorisé, tout le reste est bloqué.
 */

import type { Finding, Severity } from "@rezdevops/pii-detectors";
import type { FileScanResult, ScanReport } from "../types.js";
import { maskValue } from "./mask.js";
import type { HtmlExportOptions, MaskLevel } from "./types.js";

const SEVERITY_LABEL: Readonly<Record<Severity, string>> = Object.freeze({
  critical: "Critique",
  high: "Élevée",
  medium: "Moyenne",
  low: "Faible",
});

const SEVERITY_ORDER: readonly Severity[] = [
  "critical",
  "high",
  "medium",
  "low",
];

const HTML_ESCAPES: Readonly<Record<string, string>> = Object.freeze({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
});

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/gu, (ch) => HTML_ESCAPES[ch] ?? ch);
}

function highestSeverity(findings: readonly Finding[]): Severity | null {
  for (const sev of SEVERITY_ORDER) {
    if (findings.some((f) => f.severity === sev)) {
      return sev;
    }
  }
  return null;
}

function formatLocation(finding: Finding): string {
  const parts: string[] = [];
  if (finding.location.line !== undefined) {
    parts.push(`L${finding.location.line}`);
  }
  if (finding.location.column !== undefined) {
    parts.push(`C${finding.location.column}`);
  }
  parts.push(`offset ${finding.location.start}`);
  return parts.join(" / ");
}

function buildHeadCss(): string {
  // Palette : neutre + accents par sévérité. Pas de variables CSS pour
  // garantir le rendu identique sur les User Agents anciens.
  return `
:root { color-scheme: light dark; }
* { box-sizing: border-box; }
body {
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  line-height: 1.5;
  margin: 0;
  padding: 2rem;
  background: #f7f7f8;
  color: #1c1c1e;
}
header { margin-bottom: 2rem; }
h1 { font-size: 1.6rem; margin: 0 0 .25rem; }
h2 { font-size: 1.2rem; margin: 1.5rem 0 .75rem; border-bottom: 1px solid #d1d1d6; padding-bottom: .25rem; }
h3 { font-size: 1.05rem; margin: 1rem 0 .5rem; }
.meta { color: #6c6c70; font-size: .9rem; }
.verdict { padding: 1rem 1.25rem; border-radius: 8px; background: #fff; box-shadow: 0 1px 2px rgba(0,0,0,.04); margin-bottom: 1.5rem; }
.verdict strong { font-size: 1.1rem; }
table { width: 100%; border-collapse: collapse; background: #fff; box-shadow: 0 1px 2px rgba(0,0,0,.04); }
th, td { text-align: left; padding: .5rem .75rem; border-bottom: 1px solid #e5e5ea; vertical-align: top; }
th { background: #f2f2f7; font-weight: 600; font-size: .9rem; }
td.value, code { font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace; font-size: .85rem; }
.badge { display: inline-block; padding: .15rem .5rem; border-radius: 4px; font-size: .75rem; font-weight: 600; text-transform: uppercase; letter-spacing: .03em; }
.sev-critical { background: #ffebee; color: #b71c1c; }
.sev-high { background: #fff3e0; color: #e65100; }
.sev-medium { background: #fffde7; color: #f57f17; }
.sev-low { background: #e8f5e9; color: #2e7d32; }
.confidence { color: #6c6c70; font-size: .8rem; }
/* Masquage des valeurs sensibles : on applique un filtre blur, révélé au :hover et :focus-within. */
.masked { display: inline-block; filter: blur(4px); transition: filter .15s ease; cursor: help; }
.masked:hover, td:focus-within .masked { filter: none; }
footer { margin-top: 2rem; font-size: .8rem; color: #6c6c70; text-align: center; }
@media print {
  body { background: #fff; padding: 1cm; }
  .masked { filter: none; }
  table, .verdict { box-shadow: none; }
  h1 { font-size: 14pt; }
  th { background: #f0f0f0; }
}
@media (prefers-color-scheme: dark) {
  body { background: #1c1c1e; color: #f2f2f7; }
  .verdict, table { background: #2c2c2e; box-shadow: none; }
  th { background: #3a3a3c; }
  th, td { border-bottom-color: #3a3a3c; }
  .meta, .confidence, footer { color: #aeaeb2; }
}
`.trim();
}

function buildVerdict(report: ScanReport): string {
  const total = report.files.reduce((acc, f) => acc + f.findings.length, 0);
  if (total === 0) {
    return `<div class="verdict"><strong>Aucune donnée personnelle détectée.</strong></div>`;
  }
  const allFindings = report.files.flatMap((f) => f.findings);
  const top = highestSeverity(allFindings);
  const sevLabel = top ? SEVERITY_LABEL[top] : "Inconnue";
  const fileCount = report.files.filter((f) => f.findings.length > 0).length;
  return `<div class="verdict">
<p><strong>${total} donnée${total > 1 ? "s" : ""} personnelle${total > 1 ? "s" : ""} détectée${total > 1 ? "s" : ""}</strong> dans ${fileCount} fichier${fileCount > 1 ? "s" : ""} sur ${report.files.length}.</p>
<p class="confidence">Sévérité maximale : <span class="badge sev-${top ?? "low"}">${escapeHtml(sevLabel)}</span></p>
</div>`;
}

function buildSummaryTable(report: ScanReport): string {
  if (report.files.length === 0) {
    return `<p>Aucun fichier scanné.</p>`;
  }
  const rows = report.files
    .map((f) => {
      const top = highestSeverity(f.findings);
      const sevHtml = top
        ? `<span class="badge sev-${top}">${escapeHtml(SEVERITY_LABEL[top])}</span>`
        : "—";
      return `<tr><td>${escapeHtml(f.fileName)}</td><td>${f.format}</td><td>${f.size} o</td><td>${f.durationMs} ms</td><td>${f.findings.length}</td><td>${sevHtml}</td></tr>`;
    })
    .join("\n");
  return `<table>
<thead><tr><th>Fichier</th><th>Format</th><th>Taille</th><th>Durée</th><th>Findings</th><th>Sévérité max</th></tr></thead>
<tbody>${rows}</tbody>
</table>`;
}

function buildFileSection(file: FileScanResult, mask: MaskLevel): string {
  const sectionTitle = `<h3>${escapeHtml(file.fileName)}</h3>`;
  if (file.findings.length === 0) {
    return `${sectionTitle}\n<p>Aucun finding.</p>`;
  }
  const rows = file.findings
    .map((finding, idx) => {
      const masked = escapeHtml(maskValue(finding.value, mask));
      const sevHtml = `<span class="badge sev-${finding.severity}">${escapeHtml(SEVERITY_LABEL[finding.severity])}</span>`;
      return `<tr>
<td>${idx + 1}</td>
<td>${escapeHtml(finding.detector)}</td>
<td>${sevHtml}</td>
<td class="confidence">${escapeHtml(finding.confidence)}</td>
<td>${escapeHtml(formatLocation(finding))}</td>
<td class="value" tabindex="0"><span class="masked" aria-label="Valeur masquée — survoler pour révéler">${masked}</span></td>
</tr>`;
    })
    .join("\n");
  return `${sectionTitle}
<table>
<thead><tr><th>#</th><th>Détecteur</th><th>Sévérité</th><th>Confiance</th><th>Position</th><th>Valeur</th></tr></thead>
<tbody>${rows}</tbody>
</table>`;
}

/**
 * Sérialise un `ScanReport` en HTML autonome (single-file).
 */
export function toHtmlReport(
  report: ScanReport,
  options: HtmlExportOptions = {},
): string {
  const mask = options.mask ?? "partial";
  const title = options.title ?? "Rapport PII";

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'">
<title>${escapeHtml(title)}</title>
<style>${buildHeadCss()}</style>
</head>
<body>
<header>
<h1>${escapeHtml(title)}</h1>
<p class="meta">Généré le ${escapeHtml(report.generatedAt)} par l'engine <code>${escapeHtml(report.engineVersion)}</code> · rapport <code>${escapeHtml(report.id)}</code> · masquage : ${escapeHtml(mask)}.</p>
</header>
<main>
<h2>Verdict</h2>
${buildVerdict(report)}
<h2>Synthèse par fichier</h2>
${buildSummaryTable(report)}
${
  report.files.length > 0
    ? `<h2>Détail par fichier</h2>\n${report.files.map((f) => buildFileSection(f, mask)).join("\n")}`
    : ""
}
</main>
<footer>
Rapport produit par <code>pii-scanner-web</code> (RezDevOps) · données traitées 100 % en local · aucune information transmise sur le réseau.
</footer>
</body>
</html>
`;
}
