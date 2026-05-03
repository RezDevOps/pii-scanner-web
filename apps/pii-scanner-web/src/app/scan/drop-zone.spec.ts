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

  // -----------------------------------------------------------------
  // v1.1 — drop incrémental : `existingFiles` permet de rejeter les
  // doublons (name+size) et d'inclure le déjà-en-file dans le cumul.
  // -----------------------------------------------------------------
  it("rejette les fichiers déjà présents dans la file (doublon name+size)", () => {
    const file = makeFile("clients.csv", 1024);
    const { accepted, rejected } = validateFiles(
      [file],
      DEFAULT_MAX_TOTAL_BYTES,
      [{ name: "clients.csv", size: 1024 }],
    );
    expect(accepted).toHaveLength(0);
    expect(rejected).toHaveLength(1);
    expect(rejected[0]?.reason).toBe("duplicate");
  });

  it("accepte un fichier au même nom mais de taille différente (pas un doublon)", () => {
    const file = makeFile("clients.csv", 2048);
    const { accepted, rejected } = validateFiles(
      [file],
      DEFAULT_MAX_TOTAL_BYTES,
      [{ name: "clients.csv", size: 1024 }],
    );
    expect(accepted).toHaveLength(1);
    expect(rejected).toHaveLength(0);
  });

  it("rejette un doublon présent deux fois dans le même dépôt", () => {
    const a = makeFile("dup.csv", 100);
    const b = makeFile("dup.csv", 100);
    const { accepted, rejected } = validateFiles(
      [a, b],
      DEFAULT_MAX_TOTAL_BYTES,
    );
    expect(accepted).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0]?.reason).toBe("duplicate");
  });

  it("inclut la taille des fichiers déjà en file dans le plafond cumulé", () => {
    const newFile = makeFile("nouveau.csv", 10);
    // Plafond 12, déjà 8 octets en file → on a 4 octets dispo, le
    // nouveau de 10 doit être rejeté en size-exceeded.
    const { accepted, rejected } = validateFiles([newFile], 12, [
      { name: "ancien.csv", size: 8 },
    ]);
    expect(accepted).toHaveLength(0);
    expect(rejected).toHaveLength(1);
    expect(rejected[0]?.reason).toBe("size-exceeded");
  });
});
