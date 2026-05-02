import { describe, expect, it } from "vitest";
import { toHtmlReport } from "./html-export.js";
import { EMPTY_REPORT, SAMPLE_REPORT } from "./__fixtures__/sample-report.js";

describe("toHtmlReport", () => {
  it("commence par <!doctype html> et déclare lang=fr", () => {
    const html = toHtmlReport(SAMPLE_REPORT);
    expect(html).toMatch(/^<!doctype html>/u);
    expect(html).toContain('<html lang="fr">');
  });

  it("pose une CSP stricte par <meta>", () => {
    const html = toHtmlReport(SAMPLE_REPORT);
    expect(html).toContain(
      `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'">`,
    );
  });

  it("inline le CSS en <style> et n'inclut AUCUNE balise <script>", () => {
    const html = toHtmlReport(SAMPLE_REPORT);
    expect(html).toContain("<style>");
    expect(html).not.toContain("<script");
  });

  it("masque les valeurs en `partial` par défaut", () => {
    const html = toHtmlReport(SAMPLE_REPORT);
    expect(html).toContain("************4242");
    // La valeur masquée est entourée d'une span .masked accessible.
    expect(html).toContain(
      `<span class="masked" aria-label="Valeur masquée — survoler pour révéler">`,
    );
  });

  it("respecte le titre personnalisé passé en option", () => {
    const html = toHtmlReport(SAMPLE_REPORT, { title: "Mon rapport DPO" });
    expect(html).toContain("<title>Mon rapport DPO</title>");
    expect(html).toContain("<h1>Mon rapport DPO</h1>");
  });

  it("rend la verdict avec le badge de sévérité maximale", () => {
    const html = toHtmlReport(SAMPLE_REPORT);
    expect(html).toContain('class="badge sev-critical"');
    expect(html).toContain("Critique");
  });

  it("rend une section par fichier avec table des findings", () => {
    const html = toHtmlReport(SAMPLE_REPORT);
    expect(html).toContain("<h3>clients.csv</h3>");
    expect(html).toContain("<h3>config.json</h3>");
    expect(html).toContain("<p>Aucun finding.</p>");
  });

  it("échappe le HTML dans les noms de fichier (pas d'XSS)", () => {
    const xssReport = {
      ...SAMPLE_REPORT,
      files: [
        {
          ...SAMPLE_REPORT.files[0]!,
          fileName: '<script>alert("xss")</script>',
        },
      ],
    };
    const html = toHtmlReport(xssReport);
    expect(html).not.toContain('<script>alert("xss")</script>');
    expect(html).toContain("&lt;script&gt;alert(&quot;xss&quot;)");
  });

  it("échappe le HTML dans les valeurs de findings (pas d'XSS)", () => {
    const xssReport = {
      ...SAMPLE_REPORT,
      files: [
        {
          ...SAMPLE_REPORT.files[0]!,
          findings: [
            {
              ...SAMPLE_REPORT.files[0]!.findings[0]!,
              value: '<img src=x onerror="alert(1)">',
            },
          ],
        },
        SAMPLE_REPORT.files[1]!,
      ],
    };
    const html = toHtmlReport(xssReport, { mask: "none" });
    expect(html).not.toContain('<img src=x onerror="alert(1)">');
    expect(html).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
  });

  it("rend un message clair pour un rapport vide", () => {
    const html = toHtmlReport(EMPTY_REPORT);
    expect(html).toContain("Aucune donnée personnelle détectée.");
    expect(html).toContain("Aucun fichier scanné");
  });

  it("est déterministe : 2 appels produisent la même sortie", () => {
    expect(toHtmlReport(SAMPLE_REPORT)).toBe(toHtmlReport(SAMPLE_REPORT));
  });

  it("inclut la mention souveraineté en footer", () => {
    const html = toHtmlReport(SAMPLE_REPORT);
    expect(html).toMatch(/100 % en local.*aucune information transmise/su);
  });
});
