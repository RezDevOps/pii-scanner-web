/**
 * Tests purs de `validateFiles` (utilitaire de la drop-zone).
 *
 * Importe depuis `drop-zone.utils` plutôt que `drop-zone.component` pour
 * ne pas charger Angular Material dans Vitest. Le composant lui-même
 * (template + interaction Material) reste hors-scope test S3 — la
 * couverture sur la fonction pure verrouille déjà l'API publique.
 */
// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";

import {
  ACCEPTED_EXTENSIONS,
  DEFAULT_MAX_TOTAL_BYTES,
  validateFiles,
} from "./drop-zone.utils";

function makeFile(name: string, size: number): File {
  const content = size > 0 ? new Uint8Array(size) : new Uint8Array();
  return new File([content], name, {
    type: "application/octet-stream",
  });
}

describe("validateFiles", () => {
  it("accepte un fichier .csv valide", () => {
    const file = makeFile("clients.csv", 1024);
    const { accepted, rejected } = validateFiles(
      [file],
      DEFAULT_MAX_TOTAL_BYTES,
    );
    expect(accepted).toHaveLength(1);
    expect(accepted[0]).toBe(file);
    expect(rejected).toHaveLength(0);
  });

  it("rejette les extensions inconnues", () => {
    const file = makeFile("malware.exe", 1024);
    const { accepted, rejected } = validateFiles(
      [file],
      DEFAULT_MAX_TOTAL_BYTES,
    );
    expect(accepted).toHaveLength(0);
    expect(rejected).toHaveLength(1);
    expect(rejected[0]?.reason).toBe("extension");
  });

  it("rejette les fichiers vides", () => {
    const file = makeFile("vide.csv", 0);
    const { accepted, rejected } = validateFiles(
      [file],
      DEFAULT_MAX_TOTAL_BYTES,
    );
    expect(accepted).toHaveLength(0);
    expect(rejected[0]?.reason).toBe("empty");
  });

  it("rejette les fichiers qui dépassent le plafond cumulé", () => {
    const big = makeFile("gros.csv", 10);
    const overflow = makeFile("trop.csv", 10);
    const { accepted, rejected } = validateFiles([big, overflow], 12);
    expect(accepted).toHaveLength(1);
    expect(accepted[0]?.name).toBe("gros.csv");
    expect(rejected).toHaveLength(1);
    expect(rejected[0]?.reason).toBe("size-exceeded");
  });

  it("est insensible à la casse de l'extension", () => {
    const file = makeFile("FACTURES.PDF", 1024);
    const { accepted } = validateFiles([file], DEFAULT_MAX_TOTAL_BYTES);
    expect(accepted).toHaveLength(1);
  });

  it("accepte les 11 extensions documentées", () => {
    // 11 = 10 FileFormat + .htm en alias d'.html
    expect(ACCEPTED_EXTENSIONS.length).toBe(11);
    for (const ext of ACCEPTED_EXTENSIONS) {
      const file = makeFile(`echantillon${ext}`, 100);
      const { accepted } = validateFiles([file], DEFAULT_MAX_TOTAL_BYTES);
      expect(accepted, `Extension ${ext} acceptée`).toHaveLength(1);
    }
  });
});
