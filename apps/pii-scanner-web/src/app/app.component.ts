/**
 * `psw-root` — coquille de l'application v0.3.0.
 *
 * Orchestre la drop-zone, la file de scan, et le rapport. Toute la
 * logique métier (parseurs, détection, agrégation) reste dans
 * `@rezdevops/pii-scanner-engine` ; ce composant ne fait que **câbler**.
 *
 * Au constructeur, configure le `ScanService` avec la `workerFactory`
 * qui résout l'URL du worker via le sub-export ESM
 * `@rezdevops/pii-scanner-engine/worker`. Si la résolution échoue
 * (test, SSR), le service retombe sur `MainThreadRunner` — l'UI reste
 * fonctionnelle, juste monothread.
 */
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatSnackBar, MatSnackBarModule } from "@angular/material/snack-bar";
import { MatToolbarModule } from "@angular/material/toolbar";

import { VERSION as DETECTORS_VERSION } from "@rezdevops/pii-detectors";
import { VERSION as ENGINE_VERSION } from "@rezdevops/pii-scanner-engine";

import {
  DropZoneComponent,
  type RejectedFile,
} from "./scan/drop-zone.component";
import { FileQueueComponent } from "./scan/file-queue.component";
import { ReportComponent } from "./scan/report.component";
import { ScanService } from "./scan/scan.service";
import { createScanWorker } from "./scan/scan-worker.factory";
import { buildDetectorLabels } from "./scan/detector-labels";

@Component({
  selector: "psw-root",
  standalone: true,
  imports: [
    CommonModule,
    DropZoneComponent,
    FileQueueComponent,
    ReportComponent,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatToolbarModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-toolbar color="primary" class="topbar">
      <span class="brand">pii-scanner-web</span>
      <span class="spacer"></span>
      <span class="versions" aria-label="Versions des composants">
        engine {{ engineVersion }} · détecteurs {{ detectorsVersion }}
      </span>
    </mat-toolbar>

    <main class="shell">
      <header class="hero">
        <h1>Scanner local de données personnelles</h1>
        <p class="lead">
          Détectez emails, IBAN, SIRET, NIR, téléphones et autres PII dans vos
          fichiers bureautiques.
          <strong
            >Aucun fichier n'est envoyé : tout reste dans votre
            navigateur.</strong
          >
        </p>
      </header>

      <psw-drop-zone
        (filesAccepted)="onFilesAccepted($event)"
        (filesRejected)="onFilesRejected($event)"
      ></psw-drop-zone>

      @if (queueSig().length > 0) {
        <div class="actions">
          <button
            mat-stroked-button
            type="button"
            (click)="onReset()"
            [disabled]="isScanningSig()"
            aria-label="Réinitialiser la file et le rapport"
          >
            <mat-icon aria-hidden="true">refresh</mat-icon>
            Réinitialiser
          </button>
        </div>
      }

      <psw-file-queue
        [entries]="queueSig()"
        [globalProgress]="progressSig()"
      ></psw-file-queue>

      <psw-report
        [report]="reportSig()"
        [findings]="findingsSig()"
        [detectorLabels]="detectorLabels"
      ></psw-report>
    </main>

    <footer class="footer" role="contentinfo">
      <p class="muted">
        Code source :
        <a
          href="https://github.com/RezDevOps/pii-scanner-web"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Code source du projet sur GitHub (s'ouvre dans un nouvel onglet)"
        >
          github.com/RezDevOps/pii-scanner-web
        </a>
        · Licence AGPL-3.0 · v{{ engineVersion }}
      </p>
    </footer>
  `,
  styles: [
    `
      :host {
        display: block;
        min-height: 100vh;
        background: var(--psw-bg);
      }
      .topbar {
        position: sticky;
        top: 0;
        z-index: 10;
      }
      .brand {
        font-weight: 600;
      }
      .spacer {
        flex: 1 1 auto;
      }
      .versions {
        font-size: 0.875rem;
        opacity: 0.85;
      }
      .shell {
        max-width: 1080px;
        margin: 0 auto;
        padding: 2rem 1.5rem;
      }
      .hero {
        margin-bottom: 1.5rem;
      }
      h1 {
        margin: 0 0 0.5rem;
        font-size: 1.75rem;
      }
      .lead {
        font-size: 1.05rem;
        color: var(--psw-muted);
        margin: 0;
        max-width: 60ch;
      }
      .actions {
        margin: 1rem 0;
      }
      .footer {
        max-width: 1080px;
        margin: 2rem auto 0;
        padding: 1rem 1.5rem;
        border-top: 1px solid var(--psw-border);
      }
      .muted {
        color: var(--psw-muted);
        font-size: 0.9rem;
      }
    `,
  ],
})
export class AppComponent {
  private readonly scanService = inject(ScanService);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly engineVersion = ENGINE_VERSION;
  protected readonly detectorsVersion = DETECTORS_VERSION;
  protected readonly detectorLabels = buildDetectorLabels();

  protected readonly queueSig = this.scanService.queue;
  protected readonly isScanningSig = this.scanService.isScanning;
  protected readonly progressSig = this.scanService.progress;
  protected readonly reportSig = this.scanService.report;
  protected readonly findingsSig = this.scanService.findings;

  /** État local : a-t-on tenté de configurer le worker pool ? */
  private readonly workerConfigured = signal(false);

  protected readonly canScan = computed(() => !this.isScanningSig());

  constructor() {
    // Configure le worker factory une fois pour toutes au démarrage de l'app.
    // En cas d'échec (env de test sans `Worker`), le service retombe sur
    // `MainThreadRunner` — l'app reste fonctionnelle.
    if (typeof Worker !== "undefined") {
      this.scanService.configureWorkerFactory(() => createScanWorker());
      this.workerConfigured.set(true);
    }
  }

  protected onFilesAccepted(files: readonly File[]): void {
    if (this.isScanningSig()) {
      this.snackBar.open("Un scan est déjà en cours.", "Fermer", {
        duration: 3000,
      });
      return;
    }
    this.scanService.scan(files).catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : "Erreur inconnue";
      this.snackBar.open(`Échec du scan : ${msg}`, "Fermer", {
        duration: 5000,
      });
    });
  }

  protected onFilesRejected(rejected: readonly RejectedFile[]): void {
    const summary = rejected
      .map((r) => `${r.name} (${rejectionLabel(r.reason)})`)
      .join(" · ");
    this.snackBar.open(`Fichiers rejetés : ${summary}`, "Fermer", {
      duration: 5000,
    });
  }

  protected onReset(): void {
    this.scanService.reset();
  }
}

function rejectionLabel(reason: RejectedFile["reason"]): string {
  switch (reason) {
    case "extension":
      return "format non supporté";
    case "size-exceeded":
      return "limite de taille atteinte";
    case "empty":
      return "fichier vide";
  }
}
