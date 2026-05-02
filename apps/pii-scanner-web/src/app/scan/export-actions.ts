/**
 * Logique pure de la barre d'exports — extraite du composant pour rester
 * testable sans charger Angular Material dans Vitest.
 *
 * Trois rôles :
 *  - Construire le contenu (string) via les sérialiseurs de l'engine.
 *  - Calculer le nom de fichier (`scan-<id>-YYYYMMDD-HHmmss.<ext>`).
 *  - Déclencher le téléchargement via un anchor temporaire (zéro dep, zéro
 *    requête réseau — `URL.createObjectURL` reste local).
 */

import {
  toHtmlReport,
  toJsonReport,
  toMarkdownReport,
  type MaskLevel,
  type ScanReport,
} from "@rezdevops/pii-scanner-engine";

export type ExportFormat = "json" | "md" | "html";

export interface BuildExportOptions {
  /** Format souhaité. */
  readonly format: ExportFormat;
  /** Niveau de masquage. Défaut : `partial`. */
  readonly mask?: MaskLevel;
  /**
   * Date de génération injectable (tests). Défaut : `new Date()`. Sert à
   * dériver le nom de fichier (`scan-<id>-<YYYYMMDD>-<HHmmss>.<ext>`).
   */
  readonly now?: () => Date;
}

export interface ExportPayload {
  readonly content: string;
  readonly mimeType: string;
  readonly fileName: string;
}

const MIME_BY_FORMAT: Readonly<Record<ExportFormat, string>> = {
  json: "application/json;charset=utf-8",
  md: "text/markdown;charset=utf-8",
  html: "text/html;charset=utf-8",
};

const EXT_BY_FORMAT: Readonly<Record<ExportFormat, string>> = {
  json: "json",
  md: "md",
  html: "html",
};

function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

function timestampSlug(date: Date): string {
  const year = date.getFullYear().toString().padStart(4, "0");
  const month = pad2(date.getMonth() + 1);
  const day = pad2(date.getDate());
  const hours = pad2(date.getHours());
  const minutes = pad2(date.getMinutes());
  const seconds = pad2(date.getSeconds());
  return `${year}${month}${day}-${hours}${minutes}${seconds}`;
}

function safeReportSlug(report: ScanReport): string {
  // Garde uniquement les caractères ASCII inoffensifs pour un nom de fichier
  // (lettres, chiffres, tiret, soulignement). Évite que `report.id` exotique
  // (UUID v4 = OK ; mais un `idFactory` perso pourrait injecter autre chose)
  // ne casse les conventions.
  return report.id.replace(/[^A-Za-z0-9_-]/gu, "_").slice(0, 40);
}

/**
 * Construit le payload d'export (contenu, MIME, nom de fichier) sans toucher
 * au DOM. Pure : 100 % testable en Vitest pur Node.
 */
export function buildExportPayload(
  report: ScanReport,
  options: BuildExportOptions,
): ExportPayload {
  const mask = options.mask ?? "partial";
  const now = (options.now ?? (() => new Date()))();
  const slug = safeReportSlug(report);
  const stamp = timestampSlug(now);
  const fileName = `scan-${slug}-${stamp}.${EXT_BY_FORMAT[options.format]}`;
  const mimeType = MIME_BY_FORMAT[options.format];

  let content: string;
  switch (options.format) {
    case "json":
      content = toJsonReport(report, { mask });
      break;
    case "md":
      content = toMarkdownReport(report, { mask });
      break;
    case "html":
      content = toHtmlReport(report, { mask, title: `Rapport ${slug}` });
      break;
  }

  return { content, mimeType, fileName };
}

/**
 * Déclenche un téléchargement navigateur d'un payload. Crée un anchor
 * temporaire, le clique, le retire. Utilise `URL.createObjectURL` (local,
 * pas de réseau).
 *
 * Contraintes navigateur : doit être appelé dans un gestionnaire d'évènement
 * (clic utilisateur) pour ne pas être bloqué par le mécanisme anti-popup.
 */
export function triggerDownload(payload: ExportPayload, doc: Document): void {
  const blob = new Blob([payload.content], { type: payload.mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = doc.createElement("a");
  anchor.href = url;
  anchor.download = payload.fileName;
  anchor.style.display = "none";
  doc.body.appendChild(anchor);
  anchor.click();
  doc.body.removeChild(anchor);
  // Libération du blob : on attend le tick suivant pour laisser le navigateur
  // initier le téléchargement avant de libérer l'URL.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
