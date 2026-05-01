import { ChangeDetectionStrategy, Component } from "@angular/core";
import { VERSION as DETECTORS_VERSION } from "@rezdevops/pii-detectors";
import { VERSION as ENGINE_VERSION } from "@rezdevops/pii-scanner-engine";

/**
 * Coquille d'application — sprint S0. Contenu minimal : titre, promesse,
 * statut. La drop zone, la file de scan et le rapport sont posés en S3.
 */
@Component({
  selector: "psw-root",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="shell">
      <header>
        <h1>pii-scanner-web</h1>
        <p class="lead">
          Scanner local de données personnelles. Les fichiers ne quittent jamais
          votre navigateur.
        </p>
      </header>

      <section class="status" aria-label="Statut du projet">
        <p>
          <strong>Pré-v0.1.0</strong> — squelette du projet en cours
          d'initialisation (sprint S0).
        </p>
        <p class="muted">
          Détecteurs : <code>{{ detectorsVersion }}</code> · Engine :
          <code>{{ engineVersion }}</code>
        </p>
      </section>

      <footer>
        <p class="muted">
          Code source :
          <a href="https://github.com/RezDevOps/pii-scanner-web" rel="noopener">
            github.com/RezDevOps/pii-scanner-web
          </a>
          · Licence AGPL-3.0
        </p>
      </footer>
    </main>
  `,
  styles: [
    `
      :host {
        display: block;
        min-height: 100vh;
      }
      .shell {
        max-width: 720px;
        margin: 0 auto;
        padding: 3rem 1.5rem;
      }
      h1 {
        margin: 0 0 0.5rem;
        font-size: 2rem;
      }
      .lead {
        font-size: 1.125rem;
        color: var(--psw-muted);
        margin: 0;
      }
      .status {
        margin-top: 2rem;
        padding: 1rem 1.25rem;
        border: 1px solid var(--psw-border);
        border-radius: 6px;
      }
      .muted {
        color: var(--psw-muted);
        font-size: 0.9rem;
      }
      footer {
        margin-top: 2rem;
        padding-top: 1rem;
        border-top: 1px solid var(--psw-border);
      }
    `,
  ],
})
export class AppComponent {
  protected readonly detectorsVersion = DETECTORS_VERSION;
  protected readonly engineVersion = ENGINE_VERSION;
}
