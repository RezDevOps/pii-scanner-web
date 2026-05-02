// @vitest-environment happy-dom
//
// happy-dom fournit `File` / `Blob` / `crypto.randomUUID`. Les tests de
// la façade `runScan` traversent la pile entière : detectFormat →
// parser → runner main-thread → enrichissement findings.
import { describe, expect, it } from "vitest";

import { coreDetectors } from "@rezdevops/pii-detectors";

import {
  MINIMAL_DOCX_BASE64,
  base64ToArrayBuffer,
} from "./parsers/__fixtures__/binary-fixtures.js";
import { createMainThreadRunner } from "./runner/index.js";
import { runScan, runScanStream } from "./run-scan.js";
import type { ScanProgress } from "./types.js";
import { ENGINE_VERSION } from "./version.js";

const FIXED_ID = () => "scan-test-id";
const FIXED_NOW = () => 1735689600000; // 2025-01-01T00:00:00.000Z

function csvFile(name: string, body: string): File {
  return new File([body], name, { type: "text/csv" });
}
function txtFile(name: string, body: string): File {
  return new File([body], name, { type: "text/plain" });
}
function jsonFile(name: string, body: unknown): File {
  return new File([JSON.stringify(body)], name, { type: "application/json" });
}

describe("runScan (one-shot)", () => {
  it("retourne un ScanReport déterministe avec id et timestamp injectés", async () => {
    const file = csvFile("clients.csv", "nom,email\nAlice,alice@example.com\n");
    const report = await runScan([file], {
      now: FIXED_NOW,
      idFactory: FIXED_ID,
    });
    expect(report.id).toBe("scan-test-id");
    expect(report.generatedAt).toBe("2025-01-01T00:00:00.000Z");
    expect(report.engineVersion).toBe(ENGINE_VERSION);
    expect(report.files).toHaveLength(1);
    const fileResult = report.files[0]!;
    expect(fileResult.format).toBe("csv");
    expect(fileResult.fileName).toBe("clients.csv");
    expect(fileResult.findings).toHaveLength(1);
    expect(fileResult.findings[0]).toMatchObject({
      detector: "email",
      value: "alice@example.com",
    });
  });

  it("scanne plusieurs fichiers et agrège les résultats", async () => {
    const files = [
      csvFile("a.csv", "email\nalice@example.com\n"),
      txtFile("b.txt", "Contact bob@example.org\n"),
      jsonFile("c.json", { user: { email: "carol@example.net" } }),
    ];
    const report = await runScan(files, { idFactory: FIXED_ID });
    expect(report.files.map((f) => f.format)).toEqual(["csv", "txt", "json"]);
    const allEmails = report.files.flatMap((f) =>
      f.findings.filter((x) => x.detector === "email").map((x) => x.value),
    );
    expect(allEmails.sort()).toEqual([
      "alice@example.com",
      "bob@example.org",
      "carol@example.net",
    ]);
  });

  it("enrichit les findings avec line + path issus du parseur CSV", async () => {
    const file = csvFile(
      "rh.csv",
      "nom,email\nAlice,alice@example.com\nBob,bob@example.org\n",
    );
    const report = await runScan([file], { idFactory: FIXED_ID });
    const findings = report.files[0]!.findings;
    const emails = findings.filter((f) => f.detector === "email");
    expect(emails).toHaveLength(2);
    expect(emails[0]?.location.line).toBe(2);
    expect(emails[0]?.metadata?.path).toBe("email");
    expect(emails[1]?.location.line).toBe(3);
  });

  it("respecte la sélection de détecteurs custom", async () => {
    const file = txtFile("mix.txt", "alice@example.com 0612345678");
    // Seulement `phone-fr`, on ne veut PAS l'email.
    const phoneOnly = coreDetectors.filter((d) => d.id === "phone-fr");
    const report = await runScan([file], {
      detectors: phoneOnly,
      idFactory: FIXED_ID,
    });
    const ids = report.files[0]!.findings.map((f) => f.detector);
    expect(ids).toEqual(["phone-fr"]);
  });
});

describe("runScanStream (progression)", () => {
  it("émet file-started puis file-completed pour chaque fichier", async () => {
    const files = [
      txtFile("a.txt", "alice@example.com"),
      txtFile("b.txt", "bob@example.org"),
    ];
    const events: ScanProgress[] = [];
    for await (const ev of runScanStream(files)) {
      events.push(ev);
    }
    expect(events.map((e) => e.type)).toEqual([
      "file-started",
      "file-completed",
      "file-started",
      "file-completed",
    ]);
    expect(events[0]).toMatchObject({
      fileIndex: 0,
      totalFiles: 2,
      fileName: "a.txt",
    });
  });

  it("émet file-failed avec code unsupported-format pour les extensions inconnues", async () => {
    const file = new File(["..."], "archive.zip", { type: "application/zip" });
    const events: ScanProgress[] = [];
    for await (const ev of runScanStream([file])) {
      events.push(ev);
    }
    expect(events).toHaveLength(2);
    const fail = events[1];
    expect(fail).toMatchObject({
      type: "file-failed",
      errorCode: "unsupported-format",
      fileName: "archive.zip",
    });
  });

  it("scanne un .docx réel de bout en bout (parseur + runner + enrichissement)", async () => {
    // Fixture .docx contenant `marie.dupont@example.fr` au paragraphe 3.
    const buffer = base64ToArrayBuffer(MINIMAL_DOCX_BASE64);
    const file = new File([buffer], "rh.docx", {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    const report = await runScan([file], { idFactory: () => "scan-test-id" });
    expect(report.files).toHaveLength(1);
    const result = report.files[0]!;
    expect(result.format).toBe("docx");
    const emails = result.findings.filter((f) => f.detector === "email");
    expect(emails.map((f) => f.value)).toContain("marie.dupont@example.fr");
    // L'email est dans le 3ᵉ paragraphe non-vide → metadata.path doit
    // refléter cette localisation.
    const emailFinding = emails.find(
      (f) => f.value === "marie.dupont@example.fr",
    );
    expect(emailFinding?.metadata?.path).toBe("paragraph[2]");
  });

  it("continue à scanner les fichiers suivants après un échec", async () => {
    const files = [
      txtFile("a.txt", "alice@example.com"),
      new File(["..."], "broken.zip"),
      txtFile("c.txt", "bob@example.org"),
    ];
    const events: ScanProgress[] = [];
    for await (const ev of runScanStream(files)) {
      events.push(ev);
    }
    const types = events.map((e) => e.type);
    // start-a, complete-a, start-b, fail-b, start-c, complete-c
    expect(types).toEqual([
      "file-started",
      "file-completed",
      "file-started",
      "file-failed",
      "file-started",
      "file-completed",
    ]);
  });

  it("respecte le runner injecté et ne le dispose pas", async () => {
    const runner = createMainThreadRunner();
    const disposed = { called: false };
    const wrapped = {
      runScanText: runner.runScanText.bind(runner),
      dispose() {
        disposed.called = true;
      },
    };
    await runScan([txtFile("a.txt", "alice@example.com")], { runner: wrapped });
    expect(disposed.called).toBe(false);
  });
});
