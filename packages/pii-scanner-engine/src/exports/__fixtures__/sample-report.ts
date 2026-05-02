/**
 * Rapport de scan synthétique partagé par les tests d'export.
 *
 * Couvre :
 *  - 2 fichiers (CSV avec findings, JSON sans findings)
 *  - 4 sévérités (critical/high/medium/low)
 *  - 4 détecteurs distincts (card, iban, email, postal-code-fr)
 *  - métadonnées (brand, country)
 */

import type { ScanReport } from "../../types.js";

export const SAMPLE_REPORT: ScanReport = Object.freeze({
  id: "scan-test-1",
  generatedAt: "2026-05-02T10:00:00.000Z",
  engineVersion: "0.4.0",
  files: [
    Object.freeze({
      fileName: "clients.csv",
      format: "csv" as const,
      size: 1024,
      durationMs: 42,
      findings: Object.freeze([
        Object.freeze({
          detector: "card" as const,
          value: "4242424242424242",
          location: { start: 10, end: 26, line: 2 },
          confidence: "high" as const,
          severity: "critical" as const,
          metadata: Object.freeze({
            brand: "visa",
            length: 16,
            last4: "4242",
            bin: "424242",
          }),
        }),
        Object.freeze({
          detector: "email" as const,
          value: "alice@example.com",
          location: { start: 50, end: 67, line: 3 },
          confidence: "high" as const,
          severity: "medium" as const,
        }),
        Object.freeze({
          detector: "postal-code-fr" as const,
          value: "75001",
          location: { start: 80, end: 85, line: 4 },
          confidence: "low" as const,
          severity: "low" as const,
          metadata: Object.freeze({ department: "75" }),
        }),
      ]),
    }),
    Object.freeze({
      fileName: "config.json",
      format: "json" as const,
      size: 256,
      durationMs: 5,
      findings: [],
    }),
  ],
});

export const EMPTY_REPORT: ScanReport = Object.freeze({
  id: "scan-empty",
  generatedAt: "2026-05-02T10:00:00.000Z",
  engineVersion: "0.4.0",
  files: [],
});
