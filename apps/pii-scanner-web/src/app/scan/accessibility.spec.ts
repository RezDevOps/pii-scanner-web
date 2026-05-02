// @vitest-environment happy-dom
//
// Audit accessibilité automatisé via axe-core (WCAG 2.1 niveau AA + best
// practices). Les composants Angular Material étant difficiles à
// instancier via TestBed sous Vitest (cf. note S3 sur PlatformLocation),
// on audite des **templates HTML statiques** représentatifs du rendu
// final des composants. Tout changement de template Angular doit être
// reflété ici, sinon l'audit ne couvre plus la réalité.
//
// Cet audit complète l'audit manuel décrit dans `docs/accessibilite.md`
// (clavier, VoiceOver, ordre tab, focus visible). axe-core couvre
// environ 40-60 % des critères WCAG ; les critères « cognitifs »
// (annonces ARIA dynamiques, focus order après update) restent du
// ressort de l'audit manuel.
import axe from "axe-core";
import { describe, expect, it, beforeEach } from "vitest";

const AXE_OPTIONS: axe.RunOptions = {
  runOnly: {
    type: "tag",
    // WCAG 2.0 AA + WCAG 2.1 AA = niveau visé par v1.0
    // (cadrage § 6.4 « Accessibilité »).
    values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"],
  },
  resultTypes: ["violations"],
};

/**
 * Lance axe-core sur un fragment HTML rendu dans le `document` happy-dom.
 * Renvoie la liste des violations (vide si tout est OK).
 */
async function auditHtml(html: string): Promise<axe.Result[]> {
  document.body.innerHTML = `<div id="test-root">${html}</div>`;
  const target = document.getElementById("test-root");
  if (!target) {
    throw new Error("Conteneur de test introuvable.");
  }
  const results = await axe.run(target, AXE_OPTIONS);
  return results.violations;
}

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("Drop-zone — accessibilité", () => {
  it("zone régionale avec bouton interactif enfant accessible", async () => {
    // Template réel `psw-drop-zone` v0.4.1 : la zone est sémantiquement
    // une `region` (pas un button) pour éviter `nested-interactive` ;
    // l'interaction clavier passe par le bouton enfant.
    const html = `
      <div
        class="drop"
        role="region"
        aria-label="Zone de dépôt des fichiers. Formats acceptés : .csv, .xlsx, .pdf"
      >
        <span aria-hidden="true">📁</span>
        <h2>Glissez vos fichiers ici</h2>
        <p>
          ou
          <button
            type="button"
            aria-describedby="psw-drop-hint psw-drop-promise"
          >choisissez un fichier</button>
        </p>
        <p id="psw-drop-hint">Formats : .csv, .xlsx, .pdf. Limite : 100 Mo cumulés.</p>
        <p id="psw-drop-promise">
          Aucun fichier n'est envoyé. Tout est traité dans votre navigateur.
        </p>
        <input type="file" multiple hidden aria-label="Sélectionner des fichiers" />
      </div>
    `;
    const violations = await auditHtml(html);
    expectNoViolations(violations);
  });
});

describe("File-queue — accessibilité", () => {
  it("annonce la file et son état via aria-live + labels", async () => {
    const html = `
      <section aria-label="Fichiers en cours de scan" aria-live="polite">
        <header>
          <h3 id="psw-queue-title">Fichiers</h3>
          <div role="status" aria-label="Compteur de fichiers traités">
            <span aria-live="polite">2/3 traités</span>
          </div>
        </header>
        <progress
          value="66"
          max="100"
          aria-label="Progression globale 66%"
        ></progress>
        <ul aria-labelledby="psw-queue-title">
          <li>
            <span aria-hidden="true" title="Terminé">✔</span>
            <span>clients.csv</span>
            <span>12.3 Ko</span>
            <span aria-label="Terminé">Terminé</span>
          </li>
          <li>
            <span aria-hidden="true" title="Analyse en cours">🔄</span>
            <span>rh.xlsx</span>
            <span>456 Ko</span>
            <span aria-label="Analyse en cours">Analyse en cours</span>
            <progress aria-label="Analyse de rh.xlsx en cours"></progress>
          </li>
          <li>
            <span aria-hidden="true" title="Échec">⚠</span>
            <span>archive.zip</span>
            <span>800 Ko</span>
            <span aria-label="Échec">Échec</span>
            <p role="alert">Format non supporté pour « archive.zip ».</p>
          </li>
        </ul>
      </section>
    `;
    const violations = await auditHtml(html);
    expectNoViolations(violations);
  });
});

describe("Report — accessibilité", () => {
  it("table de findings : entêtes, sort, valeurs masquées sont accessibles", async () => {
    const html = `
      <main>
        <header>
          <h2>Rapport</h2>
          <p>1 fichier(s) scanné(s) · 2 finding(s)</p>
          <div role="group" aria-label="Exports du rapport">
            <button type="button" aria-label="Télécharger le rapport au format JSON">
              <span aria-hidden="true">{}</span>JSON
            </button>
            <button type="button" aria-label="Télécharger le rapport au format Markdown">
              <span aria-hidden="true">📄</span>Markdown
            </button>
            <button type="button" aria-label="Télécharger le rapport HTML autonome">
              <span aria-hidden="true">🌐</span>HTML autonome
            </button>
          </div>
        </header>
        <section aria-labelledby="psw-summary-title">
          <h3 id="psw-summary-title">Par catégorie</h3>
          <div role="list" aria-label="Compteurs de findings par catégorie">
            <span role="listitem" aria-label="Email : 1 finding(s)">Email : 1</span>
            <span role="listitem" aria-label="IBAN : 1 finding(s)">IBAN : 1</span>
          </div>
        </section>
        <section aria-label="Liste des findings">
          <table>
            <caption class="psw-sr-only">Findings détectés dans les fichiers scannés</caption>
            <thead>
              <tr>
                <th scope="col">Sévérité</th>
                <th scope="col">Catégorie</th>
                <th scope="col">Valeur</th>
                <th scope="col">Confiance</th>
                <th scope="col">Fichier</th>
                <th scope="col">Localisation</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><span>Élevée</span></td>
                <td>Email</td>
                <td>
                  <span
                    tabindex="0"
                    role="button"
                    aria-label="Valeur masquée pour Email. Survoler ou activer pour révéler."
                  >alice@example.com</span>
                </td>
                <td>high</td>
                <td>clients.csv</td>
                <td>ligne 2</td>
              </tr>
              <tr>
                <td><span>Critique</span></td>
                <td>IBAN</td>
                <td>
                  <span
                    tabindex="0"
                    role="button"
                    aria-label="Valeur masquée pour IBAN. Survoler ou activer pour révéler."
                  >FR1420041010050500013M02606</span>
                </td>
                <td>high</td>
                <td>clients.csv</td>
                <td>ligne 3</td>
              </tr>
            </tbody>
          </table>
        </section>
      </main>
    `;
    const violations = await auditHtml(html);
    expectNoViolations(violations);
  });
});

describe("Toolbar + footer — accessibilité", () => {
  it("structure landmark complète (banner + main + contentinfo)", async () => {
    const html = `
      <header role="banner">
        <span>pii-scanner-web</span>
        <span aria-label="Versions des composants">engine 0.4.1 · détecteurs 0.2.0</span>
      </header>
      <main>
        <h1>Scanner local de données personnelles</h1>
        <p>Détectez emails, IBAN, SIRET, NIR.</p>
      </main>
      <footer role="contentinfo">
        <p>
          Code source :
          <a
            href="https://github.com/RezDevOps/pii-scanner-web"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Code source du projet sur GitHub (s'ouvre dans un nouvel onglet)"
          >github.com/RezDevOps/pii-scanner-web</a>
          · Licence AGPL-3.0 · v0.4.1
        </p>
      </footer>
    `;
    const violations = await auditHtml(html);
    expectNoViolations(violations);
  });
});

/**
 * Échec lisible : si axe-core trouve une violation, on print les
 * détails (id, impact, description, premier sélecteur impacté) avant
 * de fail. Plus utile qu'un diff brut sur l'objet `violations`.
 */
function expectNoViolations(violations: axe.Result[]): void {
  if (violations.length === 0) {
    expect(violations).toEqual([]);
    return;
  }
  const lines = violations.map(
    (v) =>
      `[${v.impact ?? "?"}] ${v.id} — ${v.help}\n  → ${v.nodes
        .map((n) => n.target.join(" "))
        .join(", ")}\n  Fix: ${v.helpUrl}`,
  );
  throw new Error(
    `Violations axe-core détectées :\n${lines.join("\n\n")}\n\n` +
      `Si la violation est jugée acceptable, documenter dans docs/accessibilite.md ` +
      `puis l'ignorer explicitement via AXE_OPTIONS.rules.`,
  );
}
