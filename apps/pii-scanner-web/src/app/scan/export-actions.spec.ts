// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";
import {
  buildExportPayload,
  triggerDownload,
  type ExportPayload,
} from "./export-actions";
import type { ScanReport } from "@rezdevops/pii-scanner-engine";

const REPORT: ScanReport = {
  id: "scan-test",
  generatedAt: "2026-05-02T10:00:00.000Z",
  engineVersion: "0.4.0",
  files: [
    {
      fileName: "demo.csv",
      format: "csv",
      size: 100,
      durationMs: 5,
      findings: [
        {
          detector: "email",
          value: "alice@example.com",
          location: { start: 10, end: 27, line: 1 },
          confidence: "high",
          severity: "medium",
        },
      ],
    },
  ],
};

const FIXED_DATE = new Date("2026-05-02T14:30:45");

describe("buildExportPayload", () => {
  it("produit un nom de fichier horodaté pour JSON", () => {
    const payload = buildExportPayload(REPORT, {
      format: "json",
      now: () => FIXED_DATE,
    });
    expect(payload.fileName).toBe("scan-scan-test-20260502-143045.json");
    expect(payload.mimeType).toBe("application/json;charset=utf-8");
  });

  it("produit un nom de fichier horodaté pour MD", () => {
    const payload = buildExportPayload(REPORT, {
      format: "md",
      now: () => FIXED_DATE,
    });
    expect(payload.fileName).toBe("scan-scan-test-20260502-143045.md");
    expect(payload.mimeType).toBe("text/markdown;charset=utf-8");
  });

  it("produit un nom de fichier horodaté pour HTML", () => {
    const payload = buildExportPayload(REPORT, {
      format: "html",
      now: () => FIXED_DATE,
    });
    expect(payload.fileName).toBe("scan-scan-test-20260502-143045.html");
    expect(payload.mimeType).toBe("text/html;charset=utf-8");
  });

  it("le contenu JSON est valide et passe par toJsonReport", () => {
    const payload = buildExportPayload(REPORT, {
      format: "json",
      mask: "none",
    });
    const parsed: { reportId: string; files: { findings: unknown[] }[] } =
      JSON.parse(payload.content);
    expect(parsed.reportId).toBe("scan-test");
    expect(parsed.files[0]!.findings).toHaveLength(1);
  });

  it("le contenu HTML déclare la CSP stricte et expose un titre dérivé du report id", () => {
    const payload = buildExportPayload(REPORT, { format: "html" });
    expect(payload.content).toContain("default-src 'none'");
    expect(payload.content).toContain("Rapport scan-test");
  });

  it("le contenu Markdown commence par le H1", () => {
    const payload = buildExportPayload(REPORT, { format: "md" });
    expect(payload.content).toMatch(/^# Rapport de scan PII/u);
  });

  it("respecte mask='full' (valeur entièrement masquée)", () => {
    const payload = buildExportPayload(REPORT, {
      format: "json",
      mask: "full",
    });
    expect(payload.content).toContain('"value": "***"');
  });

  it("nettoie un report.id exotique pour le nom de fichier", () => {
    const exoticReport: ScanReport = { ...REPORT, id: "../../etc/passwd" };
    const payload = buildExportPayload(exoticReport, {
      format: "json",
      now: () => FIXED_DATE,
    });
    expect(payload.fileName).not.toContain("/");
    expect(payload.fileName).not.toContain("..");
  });
});

describe("triggerDownload", () => {
  it("crée un anchor, le clique, le retire et libère l'URL", () => {
    const payload: ExportPayload = {
      content: "hello",
      mimeType: "text/plain",
      fileName: "test.txt",
    };
    const createObjectURL = vi.fn(() => "blob:fake-url");
    const revokeObjectURL = vi.fn();
    const originalCreate = URL.createObjectURL;
    const originalRevoke = URL.revokeObjectURL;
    URL.createObjectURL =
      createObjectURL as unknown as typeof URL.createObjectURL;
    URL.revokeObjectURL =
      revokeObjectURL as unknown as typeof URL.revokeObjectURL;

    try {
      const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click");
      const before = document.body.children.length;
      triggerDownload(payload, document);
      const after = document.body.children.length;

      expect(createObjectURL).toHaveBeenCalledOnce();
      expect(clickSpy).toHaveBeenCalledOnce();
      // Le test reflète que l'anchor a été retiré du DOM (avant === après).
      expect(after).toBe(before);
    } finally {
      URL.createObjectURL = originalCreate;
      URL.revokeObjectURL = originalRevoke;
    }
  });
});
