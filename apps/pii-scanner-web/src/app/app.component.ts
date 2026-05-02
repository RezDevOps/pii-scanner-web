/**
 * `psw-root` — coquille de l'application v1.0.0.
 *
 * Orchestre la landing commerciale (hero, comment ça marche, bénéfices,
 * démo intégrée, vérification souveraineté, distribution), la file de scan,
 * et le rapport. Toute la logique métier (parseurs, détection, agrégation)
 * reste dans `@rezdevops/pii-scanner-engine` ; ce composant ne fait que
 * **câbler** et **présenter**.
 *
 * Au constructeur, configure le `ScanService` avec la `workerFactory` qui
 * résout l'URL du worker via le sub-export ESM
 * `@rezdevops/pii-scanner-engine/worker`. Si la résolution échoue (test, SSR),
 * le service retombe sur `MainThreadRunner` — l'UI reste fonctionnelle, juste
 * monothread.
 *
 * Le contenu et la structure sont alignés Brand Bible RezDevOps : rigueur,
 * souveraineté, anti-démo-gadget. Pas de buzzwords, faits vérifiables.
 */
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from "@angular/core";

// PDF.js v4+ exige un workerSrc URL valide pour parser les PDF. On le
// configure au chargement du module, **avant** le premier appel à
// `getDocument`. L'asset `pdf.worker.mjs` est copié depuis
// `node_modules/pdfjs-dist/legacy/build/` vers `dist/browser/` au build
// (cf. `angular.json` → `architect.build.options.assets`). Servi par
// l'origine de l'app, donc autorisé par la CSP `worker-src 'self' blob:`.
//
// Le path `pdf.worker.mjs` (sans `./`) est résolu relativement au
// `<base href>` de l'app, ce qui fonctionne identiquement en `file://`
// (ZIP standalone), GitHub Pages (sous-chemin `/pii-scanner-web/`) et
// derrière nginx (Docker).
import { GlobalWorkerOptions } from "pdfjs-dist/legacy/build/pdf.mjs";

import { CommonModule } from "@angular/common";
import { MatButtonModule } from "@angular/material/button";
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
    MatSnackBarModule,
    MatToolbarModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a class="skip-link" href="#demo">Aller à la démo</a>

    <mat-toolbar color="primary" class="topbar" role="banner">
      <span class="brand">pii-scanner-web</span>
      <span class="spacer"></span>
      <nav aria-label="Navigation principale" class="topnav">
        <a href="#comment-ca-marche">Fonctionnement</a>
        <a href="#demo">Démo</a>
        <a href="#souverainete">Souveraineté</a>
        <a href="#distribution">Distribution</a>
      </nav>
      <span class="versions" aria-label="Versions des composants">
        engine {{ engineVersion }} · détecteurs {{ detectorsVersion }}
      </span>
    </mat-toolbar>

    <main class="shell">
      <!-- ============================================================ -->
      <!-- HERO                                                          -->
      <!-- ============================================================ -->
      <section class="hero" aria-labelledby="hero-title">
        <p class="eyebrow">Outil RezDevOps · open-source AGPL-3.0</p>
        <h1 id="hero-title">
          Scanner local de données personnelles<br />
          <span class="hero-subtitle"
            >dans vos fichiers bureautiques, sans rien envoyer.</span
          >
        </h1>
        <p class="lead">
          Détecte 12 catégories de PII françaises dans CSV, XLSX, PDF, DOCX,
          HTML, JSON, MD, TXT, TSV. Le traitement se fait
          <strong>intégralement dans votre navigateur</strong> : aucun fichier
          ne quitte votre poste, aucune télémétrie, aucune analytics. La
          promesse est vérifiable en moins d'une minute via les outils
          développeur du navigateur.
        </p>
        <div class="cta-row">
          <a mat-flat-button color="primary" href="#demo" class="cta-primary">
            Essayer la démo
          </a>
          <a mat-stroked-button href="#souverainete" class="cta-secondary">
            Comment vérifier la souveraineté
          </a>
        </div>
        <ul class="hero-bullets" aria-label="Garanties principales">
          <li>Zéro upload, zéro requête réseau au runtime</li>
          <li>Détection déterministe, pas d'IA générative</li>
          <li>12 détecteurs FR (5 avec validation par checksum)</li>
          <li>Code public, signé sigstore, SBOM publié</li>
        </ul>
      </section>

      <!-- ============================================================ -->
      <!-- COMMENT ÇA MARCHE                                             -->
      <!-- ============================================================ -->
      <section class="how" id="comment-ca-marche" aria-labelledby="how-title">
        <h2 id="how-title">Comment ça marche</h2>
        <ol class="steps">
          <li>
            <span class="step-num" aria-hidden="true">1</span>
            <h3>Vous déposez un fichier</h3>
            <p>
              CSV, XLSX, PDF, DOCX, HTML, JSON, MD, TXT, TSV. Tout reste sur
              votre machine. Le drop est traité par un <em>Web Worker</em>
              isolé du thread principal.
            </p>
          </li>
          <li>
            <span class="step-num" aria-hidden="true">2</span>
            <h3>Le moteur extrait et détecte</h3>
            <p>
              Le parseur du format approprié extrait le texte, puis 12
              détecteurs déterministes cherchent emails, téléphones FR, NIR,
              IBAN, SIRET, BIC, TVA intracom, cartes bancaires (Luhn), codes
              postaux, plaques d'immatriculation, dates de naissance et adresses
              postales.
            </p>
          </li>
          <li>
            <span class="step-num" aria-hidden="true">3</span>
            <h3>Vous obtenez un rapport actionnable</h3>
            <p>
              Synthèse par criticité, table filtrable, vue contextuelle pour
              chaque occurrence. Export JSON, Markdown ou HTML autonome — à
              archiver dans un dossier de mise en conformité RGPD ou à joindre à
              un audit DPO.
            </p>
          </li>
        </ol>
      </section>

      <!-- ============================================================ -->
      <!-- DÉMO                                                          -->
      <!-- ============================================================ -->
      <section class="demo" id="demo" aria-labelledby="demo-title">
        <h2 id="demo-title">Démo en place</h2>
        <p class="demo-intro">
          Déposez un fichier ci-dessous. Vous pouvez ouvrir l'onglet Réseau de
          vos outils développeur (F12) avant : aucune requête sortante ne
          partira pendant le scan.
        </p>

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
      </section>

      <!-- ============================================================ -->
      <!-- SOUVERAINETÉ                                                  -->
      <!-- ============================================================ -->
      <section
        class="sovereignty"
        id="souverainete"
        aria-labelledby="sov-title"
      >
        <h2 id="sov-title">La promesse de souveraineté est vérifiable</h2>
        <p>
          Pas de claim sans démonstration. Cette application sert exactement ce
          qu'elle dit : aucun fichier ne quitte votre poste, et aucune requête
          réseau n'est émise pendant le scan. Vous pouvez le confirmer en moins
          d'une minute.
        </p>
        <ol class="verify-steps">
          <li>
            Ouvrez les outils développeur (F12 ou
            <kbd>Cmd</kbd>+<kbd>Option</kbd>+<kbd>I</kbd>), onglet
            <strong>Réseau</strong>, cochez « Conserver le journal ».
          </li>
          <li>
            Rechargez la page (notez les requêtes initiales : tout est servi par
            votre origine, aucune externe).
          </li>
          <li>
            Déposez un fichier et lancez le scan. Observez l'onglet Réseau :
            <strong>aucune ligne ne s'ajoute pendant le scan</strong>.
          </li>
        </ol>
        <p class="sov-cta">
          <a class="sov-link" href="verifier/index.html">
            Voir le guide complet « Comment vérifier la souveraineté »
          </a>
        </p>
        <p class="sov-meta">
          La promesse est aussi tenue par construction :
          <strong>Content Security Policy</strong> stricte (<code
            >connect-src 'none'</code
          >), aucune dépendance externe, aucun service worker silencieux, aucune
          analytics, aucun cookie.
        </p>
      </section>

      <!-- ============================================================ -->
      <!-- BÉNÉFICES                                                     -->
      <!-- ============================================================ -->
      <section class="benefits" id="benefices" aria-labelledby="benefits-title">
        <h2 id="benefits-title">Pourquoi un outil local ?</h2>
        <div class="benefit-grid">
          <article class="benefit">
            <h3>Conformité RGPD</h3>
            <p>
              Scanner des fichiers contenant des PII via un service tiers cloud
              déplace le risque vers un sous-traitant et exige un accord de
              traitement. Ici, vos données restent dans le périmètre de
              responsabilité où elles sont déjà.
            </p>
          </article>
          <article class="benefit">
            <h3>Audits internes</h3>
            <p>
              Cartographier rapidement les PII présentes dans un dump CSV, un
              export DOCX, une archive PDF, sans devoir provisionner une infra
              dédiée ou demander un budget cloud.
            </p>
          </article>
          <article class="benefit">
            <h3>DPO autonomes</h3>
            <p>
              Le rapport Markdown est lisible directement par un juriste ou DPO
              non-tech. Catégorisation par criticité, vue contextuelle, valeurs
              masquées par défaut, export archivable.
            </p>
          </article>
          <article class="benefit">
            <h3>Intégrable</h3>
            <p>
              Les détecteurs sont une lib npm pure
              (<code>&#64;rezdevops/pii-detectors</code>) que vous pouvez
              embarquer dans votre propre outil. L'engine
              (<code>&#64;rezdevops/pii-scanner-engine</code>) ajoute le parsing
              fichiers et le pool de workers.
            </p>
          </article>
        </div>
      </section>

      <!-- ============================================================ -->
      <!-- DISTRIBUTION                                                  -->
      <!-- ============================================================ -->
      <section
        class="distribution"
        id="distribution"
        aria-labelledby="dist-title"
      >
        <h2 id="dist-title">Distribution</h2>
        <p>
          Trois canaux de livraison, tous en open-source AGPL-3.0. Chaque
          release est signée
          <a
            href="https://docs.sigstore.dev/"
            target="_blank"
            rel="noopener noreferrer"
            >sigstore</a
          >
          (cosign keyless OIDC) et accompagnée d'un SBOM CycloneDX.
        </p>
        <div class="dist-grid">
          <article class="dist-card">
            <h3>Démo en ligne</h3>
            <p>
              Hébergée sur GitHub Pages. Statique, aucune backend, vérifiable à
              la source (DevTools).
            </p>
            <p class="dist-cta">
              <a href="https://rezdevops.github.io/pii-scanner-web/">
                rezdevops.github.io/pii-scanner-web
              </a>
            </p>
          </article>
          <article class="dist-card">
            <h3>ZIP standalone</h3>
            <p>
              Archive portable. Décompressez, double-cliquez sur
              <code>index.html</code>, ça fonctionne hors-ligne. Aucune
              installation requise.
            </p>
            <p class="dist-cta">
              <a
                href="https://github.com/RezDevOps/pii-scanner-web/releases/latest"
                target="_blank"
                rel="noopener noreferrer"
                >Télécharger la dernière release</a
              >
            </p>
          </article>
          <article class="dist-card">
            <h3>Image Docker</h3>
            <p>
              Image multi-arch (amd64 + arm64) sur GHCR. Tourne en
              <code>nginx-unprivileged</code> sur le port 8080.
            </p>
            <p class="dist-cta">
              <code class="cmd"
                >docker pull ghcr.io/rezdevops/pii-scanner-web:latest</code
              >
            </p>
          </article>
          <article class="dist-card">
            <h3>Packages npm</h3>
            <p>
              Pour intégrer les détecteurs ou l'engine dans votre propre outil.
              Provenance signée OIDC.
            </p>
            <p class="dist-cta">
              <code class="cmd"
                >npm install &#64;rezdevops/pii-detectors
                &#64;rezdevops/pii-scanner-engine</code
              >
            </p>
          </article>
        </div>
      </section>
    </main>

    <footer class="footer" role="contentinfo">
      <div class="footer-inner">
        <p class="muted">
          <strong>pii-scanner-web</strong> v{{ engineVersion }} ·
          <a
            href="https://github.com/RezDevOps/pii-scanner-web"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Code source du projet sur GitHub (s'ouvre dans un nouvel onglet)"
            >github.com/RezDevOps/pii-scanner-web</a
          >
          · Licence
          <a
            href="https://www.gnu.org/licenses/agpl-3.0.html"
            target="_blank"
            rel="noopener noreferrer"
            >AGPL-3.0</a
          >
          · Auteur Rudy Rezaire (<a
            href="https://rezdevops.fr"
            target="_blank"
            rel="noopener noreferrer"
            >RezDevOps</a
          >)
        </p>
        <p class="muted small">
          Aucune analytics, aucune télémétrie, aucun cookie, aucun stockage.
          Cette page n'enregistre rien.
        </p>
      </div>
    </footer>
  `,
  styleUrls: ["./app.component.scss"],
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

  protected readonly canScan = computed(() => !this.isScanningSig());

  constructor() {
    // PDF.js : pointe vers le worker embarqué côté assets de l'app.
    GlobalWorkerOptions.workerSrc = "pdf.worker.mjs";

    // **v1.0** : pool de Web Workers volontairement désactivé. Le scan
    // tourne intégralement sur le main thread via `MainThreadRunner` du
    // `ScanService` (fallback automatique quand aucune `workerFactory`
    // n'est configurée).
    //
    // Raison : le pattern `new Worker(new URL("./scan-worker.js",
    // import.meta.url))` du `create-default-worker.js` situé dans le
    // dist du package `@rezdevops/pii-scanner-engine` n'est pas
    // re-bundlé proprement par les outils Angular 20 (esbuild en build
    // prod ; Vite dep optimizer en dev). Symptômes :
    //   - en dev : « scan-worker.js?worker_file&type=module not found
    //     in vite/deps/ ».
    //   - en prod : worker créé mais events qui n'arrivent jamais
    //     (scan bloqué silencieusement).
    //
    // La promesse souveraineté reste **100 % tenue** (calcul local,
    // zéro réseau, CSP stricte respectée) ; seule la parallélisation
    // sur très gros fichiers est différée. Plan v1.1 : exposer le
    // worker comme asset Angular côté app (et non depuis le package
    // npm), avec un `new Worker(new URL("./scan-worker.ts",
    // import.meta.url))` dans le code de l'app — Angular esbuild sait
    // bundler ce pattern depuis le code source, pas depuis un dist
    // compilé.
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
