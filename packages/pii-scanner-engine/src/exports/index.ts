/**
 * Index public de la couche d'exports.
 *
 * Stable depuis `v0.4.0` :
 *  - `toJsonReport` / `buildJsonReport` : sérialiseur JSON, schéma versionné.
 *  - `toMarkdownReport` : rapport Markdown lisible (DPO/juriste).
 *  - `toHtmlReport` : rapport HTML autonome (CSS inliné, pas de JS).
 *  - `maskValue` + types `MaskLevel` / `ExportOptions` / `HtmlExportOptions`.
 */

export { buildJsonReport, toJsonReport } from "./json-export.js";
export { toMarkdownReport } from "./markdown-export.js";
export { toHtmlReport } from "./html-export.js";
export { maskValue } from "./mask.js";
export type { ExportOptions, HtmlExportOptions, MaskLevel } from "./types.js";
export { REPORT_SCHEMA_VERSION } from "./types.js";
