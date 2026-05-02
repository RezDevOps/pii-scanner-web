/**
 * Point d'entrée public de `@rezdevops/pii-scanner-engine`.
 *
 * Surface stable :
 * - `v0.1.0` : `scanText`, `TextScanReport`, types `FileFormat` /
 *   `FileScanResult` / `ScanReport`, constante `VERSION`.
 * - `v0.2.0` : façade `runScan` / `runScanStream`, abstraction
 *   `Runner` (`MainThreadRunner`, `WorkerPoolRunner`), parseurs CSV /
 *   TSV / TXT / MD / JSON, helpers `detectFormat` / `tryDetectFormat`.
 *
 * Les parseurs binaires (XLSX, PDF, DOCX, HTML) sont reportés à `v0.2.1`
 * (cf. CHANGELOG et addendum cadrage). Leurs `FileFormat` restent
 * déclarés ici dès `v0.2.0` pour que l'API publique ne casse pas
 * lorsqu'on les activera.
 */

// --- Surface S1 (héritée v0.1.0) ---
export { scanText } from "./scan-text.js";
export type { TextScanReport } from "./scan-text.js";

// --- Types publics centralisés (v0.1.0 + v0.2.0) ---
export type {
  FileFormat,
  FileScanResult,
  ScanErrorCode,
  ScanProgress,
  ScanReport,
} from "./types.js";

// --- Détection de format (v0.2.0) ---
export {
  ACTIVE_FORMATS_V0_2_0,
  DEFERRED_FORMATS_V0_2_1,
  DeferredFormatError,
  UnsupportedFormatError,
  detectFormat,
  tryDetectFormat,
} from "./format.js";
export type { FileDescriptor } from "./format.js";

// --- Façade scan multi-fichiers (v0.2.0) ---
export { runScan, runScanStream } from "./run-scan.js";
export type { RunScanOptions, ScanInputFile } from "./run-scan.js";

// --- Runners (v0.2.0) ---
export {
  MainThreadRunner,
  WorkerPoolRunner,
  createMainThreadRunner,
  createWorkerPoolRunner,
  resolveDetectors,
} from "./runner/index.js";
export type {
  Runner,
  ScanJob,
  WorkerFactory,
  WorkerLike,
  WorkerPoolRunnerOptions,
} from "./runner/index.js";

// --- Parseurs (v0.2.0) ---
// Exposés individuellement pour tests + variantes (CLI). Une UI
// applicative ne devrait normalement consommer que `runScan`.
export {
  csvParser,
  jsonParser,
  mdParser,
  tsvParser,
  txtParser,
  getParserForFormat,
} from "./parsers/index.js";
export type { FileParser, ParserInput, TextChunk } from "./parsers/index.js";

// --- Worker API (v0.2.0) ---
export type { ScanWorkerApi } from "./worker/scan-worker-api.js";

// --- Version ---
export { ENGINE_VERSION as VERSION } from "./version.js";
