/**
 * `psw-file-queue` — affichage de la file de fichiers en cours de scan.
 *
 * Reçoit la liste des `FileQueueEntry` du `ScanService` (signal) et la
 * progression globale. Affiche chaque entrée avec son statut, sa taille
 * humanisée, et une barre de progression indéterminée tant que le scan
 * du fichier n'est pas terminé.
 *
 * Composant pur (présentation) : pas d'état, pas d'interaction métier
 * (le bouton « réinitialiser » est délégué à l'app).
 */
import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, Input } from "@angular/core";
import { MatIconModule } from "@angular/material/icon";
import { MatProgressBarModule } from "@angular/material/progress-bar";
import { MatChipsModule } from "@angular/material/chips";

import type { FileQueueEntry } from "./scan.service";

@Component({
  selector: "psw-file-queue",
  standalone: true,
  imports: [CommonModule, MatIconModule, MatProgressBarModule, MatChipsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (entries.length > 0) {
      <section class="queue" aria-label="Fichiers en cours de scan">
        <header class="header">
          <h3 class="title">Fichiers</h3>
          <mat-chip-set aria-label="Compteur de fichiers">
            <mat-chip>{{ doneCount() }}/{{ entries.length }} traités</mat-chip>
          </mat-chip-set>
        </header>

        <mat-progress-bar
          class="global"
          mode="determinate"
          [value]="globalProgress * 100"
          [attr.aria-label]="
            'Progression globale ' + Math.round(globalProgress * 100) + '%'
          "
        ></mat-progress-bar>

        <ul class="list">
          @for (entry of entries; track entry.id) {
            <li class="entry" [attr.data-status]="entry.status">
              <div class="row">
                <mat-icon
                  class="status-icon"
                  [attr.aria-label]="iconLabel(entry.status)"
                  >{{ iconName(entry.status) }}</mat-icon
                >
                <span class="name" [title]="entry.fileName">{{
                  entry.fileName
                }}</span>
                <span class="size muted">{{ humanSize(entry.size) }}</span>
                <span class="status muted">{{
                  statusLabel(entry.status)
                }}</span>
              </div>
              @if (entry.status === "scanning") {
                <mat-progress-bar mode="indeterminate"></mat-progress-bar>
              }
              @if (entry.status === "failed" && entry.errorMessage) {
                <p class="error" role="alert">{{ entry.errorMessage }}</p>
              }
              @if (entry.status === "completed" && entry.result) {
                <p class="muted small">
                  {{ entry.result.findings.length }} finding(s) ·
                  {{ entry.result.durationMs }} ms
                </p>
              }
            </li>
          }
        </ul>
      </section>
    }
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .queue {
        margin-top: 1rem;
      }
      .header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 0.5rem;
      }
      .title {
        margin: 0;
        font-size: 1rem;
      }
      .global {
        margin-bottom: 1rem;
      }
      .list {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }
      .entry {
        padding: 0.5rem 0.75rem;
        border: 1px solid var(--psw-border);
        border-radius: 6px;
        background: var(--psw-bg);
      }
      .entry[data-status="failed"] {
        border-color: var(--psw-danger);
      }
      .entry[data-status="completed"] {
        border-color: var(--psw-success);
      }
      .row {
        display: grid;
        grid-template-columns: auto 1fr auto auto;
        align-items: center;
        gap: 0.75rem;
      }
      .status-icon {
        font-size: 1.25rem;
        height: 1.25rem;
        width: 1.25rem;
      }
      .name {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .muted {
        color: var(--psw-muted);
      }
      .small {
        font-size: 0.875rem;
        margin: 0.25rem 0 0;
      }
      .error {
        color: var(--psw-danger);
        margin: 0.25rem 0 0;
        font-size: 0.875rem;
      }
    `,
  ],
})
export class FileQueueComponent {
  @Input() entries: readonly FileQueueEntry[] = [];
  @Input() globalProgress = 0;

  protected readonly Math = Math;

  protected doneCount(): number {
    return this.entries.filter(
      (e) => e.status === "completed" || e.status === "failed",
    ).length;
  }

  protected iconName(status: FileQueueEntry["status"]): string {
    switch (status) {
      case "pending":
        return "schedule";
      case "scanning":
        return "autorenew";
      case "completed":
        return "check_circle";
      case "failed":
        return "error";
    }
  }

  protected iconLabel(status: FileQueueEntry["status"]): string {
    return this.statusLabel(status);
  }

  protected statusLabel(status: FileQueueEntry["status"]): string {
    switch (status) {
      case "pending":
        return "En attente";
      case "scanning":
        return "Analyse en cours";
      case "completed":
        return "Terminé";
      case "failed":
        return "Échec";
    }
  }

  protected humanSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
    return `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
  }
}
