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
});
