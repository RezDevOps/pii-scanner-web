/**
 * Tests d'intégration du `ScanService` — sans Worker.
 *
 * On utilise `MainThreadRunner` (par défaut quand `configureWorkerFactory`
 * n'est pas appelé) pour vérifier l'orchestration : signal `queue`,
 * progression, agrégation `report`, gestion d'erreurs.
 *
 * `happy-dom` fournit `File` / `Blob` / `crypto.randomUUID`.
 */
// @vitest-environment happy-dom
import { describe, expect, it, beforeEach } from "vitest";

import { ScanService } from "./scan.service";

function makeFile(name: string, content: string): File {
  return new File([content], name, { type: "text/plain" });
}

describe("ScanService", () => {
  let service: ScanService;

  beforeEach(() => {
    service = new ScanService();
  });

  it("démarre vide", () => {
    expect(service.queue()).toEqual([]);
    expect(service.findings()).toEqual([]);
    expect(service.report()).toBeNull();
    expect(service.isScanning()).toBe(false);
    expect(service.progress()).toBe(0);
  });

  it("scanne un fichier .csv et expose les findings dans le rapport", async () => {
    const file = makeFile(
      "clients.csv",
      "name,email\nAlice,alice@example.com\nBob,bob@example.com\n",
    );
    const report = await service.scan([file]);

    expect(report.files).toHaveLength(1);
    expect(report.files[0]?.findings.length).toBeGreaterThanOrEqual(2);
    expect(report.engineVersion).toMatch(/^\d+\.\d+\.\d+$/);

    expect(service.findings().length).toBeGreaterThanOrEqual(2);
    expect(service.findings()[0]?.fileName).toBe("clients.csv");
    expect(service.queue()[0]?.status).toBe("completed");
    expect(service.progress()).toBe(1);
    expect(service.isScanning()).toBe(false);
  });

  it("met à jour le signal queue au fil du scan", async () => {
    const a = makeFile("a.txt", "alice@example.com\n");
    const b = makeFile("b.txt", "bob@example.com\n");
    await service.scan([a, b]);

    const queue = service.queue();
    expect(queue).toHaveLength(2);
    expect(queue.every((e) => e.status === "completed")).toBe(true);
  });

  it("marque les fichiers en échec quand le format est inconnu", async () => {
    const file = makeFile("malware.exe", "binary");
    await service.scan([file]);

    expect(service.queue()[0]?.status).toBe("failed");
    expect(service.queue()[0]?.errorCode).toBeDefined();
    expect(service.report()?.files).toHaveLength(0);
  });

  it("rejette si un scan est déjà en cours", async () => {
    const file = makeFile("a.txt", "alice@example.com");
    const first = service.scan([file]);
    await expect(service.scan([file])).rejects.toThrow(
      /scan est déjà en cours/i,
    );
    await first;
  });

  it("rejette si la liste de fichiers est vide", async () => {
    await expect(service.scan([])).rejects.toThrow(/au moins un fichier/i);
  });

  it("reset() vide la file et le rapport", async () => {
    const file = makeFile("a.txt", "alice@example.com");
    await service.scan([file]);
    expect(service.queue().length).toBeGreaterThan(0);

    service.reset();
    expect(service.queue()).toEqual([]);
    expect(service.report()).toBeNull();
  });

  // ----------------------------------------------------------------
  // v1.1 — drag & drop incrémental : un 2e appel à scan() ajoute à
  // la file (pas de remplacement) et le rapport agrège l'historique
  // complet. Voir scan.service.ts (offset + completedHistory).
  // ----------------------------------------------------------------
  it("ajoute les fichiers à la file lors d'un 2e scan (incrémental)", async () => {
    const a = makeFile("a.txt", "alice@example.com\n");
    const b = makeFile("b.txt", "bob@example.com\n");
    const c = makeFile("c.txt", "carol@example.com\n");

    await service.scan([a]);
    expect(service.queue()).toHaveLength(1);
    expect(service.queue()[0]?.fileName).toBe("a.txt");

    await service.scan([b, c]);
    const queue = service.queue();
    expect(queue).toHaveLength(3);
    expect(queue.map((e) => e.fileName)).toEqual(["a.txt", "b.txt", "c.txt"]);
    expect(queue.every((e) => e.status === "completed")).toBe(true);
  });

  it("agrège l'historique des findings dans le rapport global", async () => {
    const a = makeFile("a.txt", "alice@example.com\n");
    const b = makeFile("b.txt", "bob@example.com\n");

    await service.scan([a]);
    const report2 = await service.scan([b]);

    expect(report2.files).toHaveLength(2);
    expect(report2.files.map((f) => f.fileName)).toEqual(["a.txt", "b.txt"]);
    // Les findings du rapport global incluent ceux des deux lots.
    const fileNames = service.findings().map((f) => f.fileName);
    expect(fileNames).toContain("a.txt");
    expect(fileNames).toContain("b.txt");
  });

  it("reset() purge aussi l'historique cumulé du mode incrémental", async () => {
    const a = makeFile("a.txt", "alice@example.com\n");
    const b = makeFile("b.txt", "bob@example.com\n");

    await service.scan([a]);
    service.reset();
    const report = await service.scan([b]);

    // Après reset, le rapport ne doit contenir QUE le 2e lot, pas
    // l'historique d'avant le reset.
    expect(report.files).toHaveLength(1);
    expect(report.files[0]?.fileName).toBe("b.txt");
  });
});
