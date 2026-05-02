/**
 * `psw-drop-zone` — zone d'accueil des fichiers à scanner.
 *
 * Triple entrée :
 * - **Drag & drop** sur la zone (visuel mat-card).
 * - **Bouton bouton fichier** (Material `mat-button`) qui déclenche un
 *   `<input type="file" multiple hidden>`.
 * - **Clavier** : Enter / Espace sur la zone focus pour ouvrir le picker.
 *
 * Validation côté client :
 * - Filtre par extension reconnue (`ACCEPTED_EXTENSIONS`).
 * - Plafond global cumulatif paramétrable (`maxTotalBytes`, défaut 100 Mo
 *   conformément à la cible perf cadrage § 6.3).
 *
 * Le composant n'effectue **aucun appel réseau** (cohérent CSP
 * `connect-src 'none'`). Il émet la liste des fichiers acceptés via
 * `(filesAccepted)`. Les fichiers rejetés sont remontés via
 * `(filesRejected)` pour permettre à l'app d'afficher un toast / banner.
 */
import { CommonModule } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  signal,
} from "@angular/core";
import { MatButtonModule } from "@angular/material/button";
import { MatCardModule } from "@angular/material/card";
import { MatIconModule } from "@angular/material/icon";

// La logique pure (validation, extensions, plafond) vit dans
// `drop-zone.utils.ts` — testable sans charger Angular Material.
import {
  ACCEPTED_EXTENSIONS,
  DEFAULT_MAX_TOTAL_BYTES,
  validateFiles,
  type RejectedFile,
} from "./drop-zone.utils";

export type { RejectedFile, RejectionReason } from "./drop-zone.utils";
export { ACCEPTED_EXTENSIONS, DEFAULT_MAX_TOTAL_BYTES, validateFiles };

@Component({
  selector: "psw-drop-zone",
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatCardModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-card
      appearance="outlined"
      class="drop"
      [class.is-hover]="isHover()"
      role="button"
      tabindex="0"
      [attr.aria-label]="
        'Déposer des fichiers à scanner. Formats acceptés : ' + acceptedLabel
      "
      (dragover)="onDragOver($event)"
      (dragleave)="onDragLeave($event)"
      (drop)="onDrop($event)"
      (click)="openPicker()"
      (keydown.enter)="openPicker()"
      (keydown.space)="onSpace()"
    >
      <mat-card-content class="content">
        <mat-icon aria-hidden="true" class="icon">cloud_upload</mat-icon>
        <h2 class="title">Glissez vos fichiers ici</h2>
        <p class="muted">
          ou
          <button
            mat-stroked-button
            color="primary"
            type="button"
            (click)="openPicker(); $event.stopPropagation()"
          >
            choisissez un fichier
          </button>
        </p>
        <p class="hint muted">
          Formats : {{ acceptedLabel }}. Limite : {{ maxLabel }}.
        </p>
        <p class="hint muted">
          Aucun fichier n'est envoyé. Tout est traité dans votre navigateur.
        </p>
      </mat-card-content>
    </mat-card>

    <!-- Input fichier caché : déclenché par la zone ou le bouton. -->
    <input
      #fileInput
      type="file"
      multiple
      hidden
      [attr.accept]="acceptAttribute"
      (change)="onPickerChange($event)"
    />
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .drop {
        cursor: pointer;
        border: 2px dashed var(--mat-sys-outline, #999);
        border-radius: 12px;
        background: var(--psw-surface);
        padding: 1.5rem;
        transition:
          background 120ms ease,
          border-color 120ms ease;
      }
      .drop.is-hover {
        background: color-mix(
          in srgb,
          var(--psw-accent) 8%,
          var(--psw-surface)
        );
        border-color: var(--psw-accent);
      }
      .drop:focus-visible {
        outline: 3px solid var(--psw-accent);
        outline-offset: 2px;
      }
      .content {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.5rem;
        padding: 1rem;
      }
      .icon {
        font-size: 3rem;
        height: 3rem;
        width: 3rem;
        color: var(--psw-accent);
      }
      .title {
        margin: 0;
        font-size: 1.25rem;
      }
      .muted {
        color: var(--psw-muted);
        margin: 0;
      }
      .hint {
        font-size: 0.875rem;
      }
    `,
  ],
})
export class DropZoneComponent {
  /** Plafond cumulé en octets. Défaut 100 Mo. */
  @Input() maxTotalBytes: number = DEFAULT_MAX_TOTAL_BYTES;

  /** Émis quand au moins un fichier valide est déposé. */
  @Output() readonly filesAccepted = new EventEmitter<readonly File[]>();

  /** Émis quand au moins un fichier est rejeté (avec la raison). */
  @Output() readonly filesRejected = new EventEmitter<
    readonly RejectedFile[]
  >();

  @ViewChild("fileInput", { static: true })
  private readonly fileInputRef!: ElementRef<HTMLInputElement>;

  protected readonly isHover = signal(false);

  protected readonly acceptedLabel: string = ACCEPTED_EXTENSIONS.join(", ");
  protected readonly acceptAttribute: string = ACCEPTED_EXTENSIONS.join(",");

  protected get maxLabel(): string {
    return `${Math.round(this.maxTotalBytes / 1024 / 1024)} Mo cumulés`;
  }

  protected onDragOver(ev: DragEvent): void {
    ev.preventDefault();
    if (ev.dataTransfer) {
      ev.dataTransfer.dropEffect = "copy";
    }
    if (!this.isHover()) {
      this.isHover.set(true);
    }
  }

  protected onDragLeave(ev: DragEvent): void {
    ev.preventDefault();
    this.isHover.set(false);
  }

  protected onDrop(ev: DragEvent): void {
    ev.preventDefault();
    this.isHover.set(false);
    const files = Array.from(ev.dataTransfer?.files ?? []);
    if (files.length > 0) {
      this.handleFiles(files);
    }
  }

  protected onPickerChange(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    if (files.length > 0) {
      this.handleFiles(files);
    }
    // Reset pour permettre le re-pick du même fichier
    input.value = "";
  }

  /**
   * `(keydown.space)` retire l'évènement par défaut (scroll de la page) et
   * délègue l'ouverture du picker. Pas de paramètre car Angular passe un
   * `Event` quand le binding ne demande pas explicitement le typed event.
   */
  protected onSpace(): void {
    this.openPicker();
  }

  protected openPicker(): void {
    this.fileInputRef.nativeElement.click();
  }

  private handleFiles(files: readonly File[]): void {
    const { accepted, rejected } = validateFiles(files, this.maxTotalBytes);
    if (rejected.length > 0) {
      this.filesRejected.emit(rejected);
    }
    if (accepted.length > 0) {
      this.filesAccepted.emit(accepted);
    }
  }
}
