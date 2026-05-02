/**
 * Tests unitaires du `WorkerPoolRunner`.
 *
 * Stratégie : on stub `comlink.wrap` pour qu'il retourne directement
 * l'API exposée par notre `FakeWorker`. Ça permet de tester la logique
 * propre du pool (file d'attente, drain, dispose) **sans** instancier
 * un vrai `Worker` ni dépendre de la machinerie postMessage de Comlink
 * — qui sera de toute façon couverte par les tests d'intégration S3
 * dans l'app Angular.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Finding } from "@rezdevops/pii-detectors";

import type { ScanWorkerApi } from "../worker/scan-worker-api.js";
import type { WorkerLike } from "./worker-pool-runner.js";

vi.mock("comlink", () => ({
  // wrap() retourne l'`api` posée sur notre faux Worker plutôt que
  // d'instaurer le protocole Comlink réel.
  wrap: <T>(worker: unknown): T => {
    return (worker as { __api: T }).__api;
  },
}));

// L'import doit venir APRÈS `vi.mock` pour que le mock s'applique.
const { WorkerPoolRunner, createWorkerPoolRunner } =
  await import("./worker-pool-runner.js");

interface FakeWorker extends WorkerLike {
  __api: ScanWorkerApi;
  terminated: boolean;
}

function createFakeWorker(handler: ScanWorkerApi["runScanText"]): FakeWorker {
  const fake: FakeWorker = {
    __api: { runScanText: handler },
    terminated: false,
    terminate() {
      this.terminated = true;
    },
  };
  return fake;
}

beforeEach(() => {
  vi.useRealTimers();
});

describe("WorkerPoolRunner.size", () => {
  it("respecte `desiredSize` quand fourni", () => {
    const runner = new WorkerPoolRunner({
      workerFactory: () => createFakeWorker(async () => []),
      desiredSize: 4,
    });
    expect(runner.size).toBe(4);
  });

  it("ne dépasse jamais `maxWorkers`", () => {
    const runner = new WorkerPoolRunner({
      workerFactory: () => createFakeWorker(async () => []),
      desiredSize: 16,
      maxWorkers: 3,
    });
    expect(runner.size).toBe(3);
  });

  it("plafonne par défaut à 8 si l'environnement a beaucoup de cores", () => {
    const runner = new WorkerPoolRunner({
      workerFactory: () => createFakeWorker(async () => []),
      desiredSize: 32, // simule navigator.hardwareConcurrency = 32
    });
    expect(runner.size).toBe(8);
  });
});

describe("WorkerPoolRunner.runScanText", () => {
  it("dispatche immédiatement quand un worker est libre", async () => {
    const expected: Finding[] = [];
    const runner = new WorkerPoolRunner({
      workerFactory: () => createFakeWorker(async () => expected),
      desiredSize: 2,
    });
    const findings = await runner.runScanText({
      text: "alice@example.com",
      detectorIds: ["email"],
    });
    expect(findings).toBe(expected);
  });

  it("met en file d'attente quand tous les workers sont occupés", async () => {
    let resolveSecond: ((findings: readonly Finding[]) => void) | null = null;
    let callCount = 0;

    const handler: ScanWorkerApi["runScanText"] = async () => {
      callCount += 1;
      if (callCount === 1) {
        return new Promise<readonly Finding[]>((resolve) => {
          resolveSecond = resolve;
        });
      }
      return [];
    };

    const runner = new WorkerPoolRunner({
      workerFactory: () => createFakeWorker(handler),
      desiredSize: 1,
    });

    const first = runner.runScanText({ text: "a", detectorIds: ["email"] });
    const second = runner.runScanText({ text: "b", detectorIds: ["email"] });

    // À ce stade : 1 job est en cours (callCount=1), 1 job est en file.
    // Le second ne peut pas être lancé tant que le premier ne se termine pas.
    expect(callCount).toBe(1);

    // Termine le premier ; ça doit déclencher le drain et lancer le second.
    resolveSecond!([]);
    await first;
    await second;

    expect(callCount).toBe(2);
  });

  it("dispose() termine tous les workers et rejette la file", async () => {
    const fakes: FakeWorker[] = [];
    const handler: ScanWorkerApi["runScanText"] = () => {
      // Ne résout jamais → simule un job qui dure
      return new Promise<readonly Finding[]>(() => undefined);
    };
    const runner = new WorkerPoolRunner({
      workerFactory: () => {
        const fake = createFakeWorker(handler);
        fakes.push(fake);
        return fake;
      },
      desiredSize: 2,
    });

    // Sature les 2 workers
    void runner.runScanText({ text: "a", detectorIds: ["email"] });
    void runner.runScanText({ text: "b", detectorIds: ["email"] });
    // Met le 3ᵉ en file
    const third = runner.runScanText({ text: "c", detectorIds: ["email"] });

    await runner.dispose();

    // Les 2 workers sont terminés
    expect(fakes.every((f) => f.terminated)).toBe(true);
    // Le 3ᵉ job (en file) est rejeté
    await expect(third).rejects.toThrow(/disposé/);
  });

  it("rejette runScanText après dispose", async () => {
    const runner = new WorkerPoolRunner({
      workerFactory: () => createFakeWorker(async () => []),
      desiredSize: 1,
    });
    await runner.dispose();
    await expect(
      runner.runScanText({ text: "a", detectorIds: ["email"] }),
    ).rejects.toThrow(/disposé/);
  });

  it("dispose() est idempotent", async () => {
    const runner = new WorkerPoolRunner({
      workerFactory: () => createFakeWorker(async () => []),
      desiredSize: 1,
    });
    await runner.dispose();
    await expect(runner.dispose()).resolves.toBeUndefined();
  });
});

describe("createWorkerPoolRunner", () => {
  it("retourne une instance utilisable", () => {
    const runner = createWorkerPoolRunner({
      workerFactory: () => createFakeWorker(async () => []),
      desiredSize: 1,
    });
    expect(runner.size).toBe(1);
  });
});
