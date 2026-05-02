/**
 * `psw-report` — rapport interactif d'un scan PII.
 *
 * Trois sections :
 * 1. **Récapitulatif** : compteurs par catégorie de PII (mat-chip-set),
 *    plus le total général et le temps de scan agrégé.
 * 2. **Filtres** : par fichier, par détecteur, par sévérité (mat-form-field
 *    + mat-select). Les filtres se composent (et se reflètent dans la
 *    table).
 * 3. **Table** : mat-table avec tri sur les colonnes principales et la
 *    valeur masquée par défaut (`.psw-mask`, hover/focus pour révéler).
 *
 * Le composant n'effectue **aucun export** ni copie de PII en clair :
 * les exports JSON / Markdown / HTML sont planifiés pour S4.
 */
import { CommonModule } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  Input,
  ViewChild,
  signal,
  computed,
  effect,
} from "@angular/core";
import { FormsModule } from "@angular/forms";
import { MatCardModule } from "@angular/material/card";
import { MatChipsModule } from "@angular/material/chips";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatIconModule } from "@angular/material/icon";
import { MatSelectModule } from "@angular/material/select";
import { MatSort, MatSortModule } from "@angular/material/sort";
import { MatTableDataSource, MatTableModule } from "@angular/material/table";

import type { Severity } from "@rezdevops/pii-detectors";
import type { ScanReport } from "@rezdevops/pii-scanner-engine";

import type { EnrichedFinding } from "./scan.service";

// Logique pure du rapport (filtres, tri, labels) — extraite dans
// `report.utils.ts` pour pouvoir la tester sans charger Angular
// Material dans Vitest.
import {
  applyFilters,
  SEVERITY_LABEL,
  SEVERITY_ORDER,
  sortingDataAccessor,
} from "./report.utils";

export { applyFilters } from "./report.utils";

interface SummaryEntry {
  readonly detector: string;
  readonly label: string;
  readonly count: number;
}

@Component({
  selector: "psw-report",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatChipsModule,
    MatFormFieldModule,
    MatIconModule,
    MatSelectModule,
    MatSortModule,
    MatTableModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (report && findings.length > 0) {
      <mat-card appearance="outlined" class="card">
        <mat-card-content>
          <header class="head">
            <h2 class="h2">Rapport</h2>
            <p class="muted small">
              {{ report.files.length }} fichier(s) scanné(s) ·
              {{ findings.length }} finding(s) · généré le
              {{ formatDate(report.generatedAt) }} · engine
              {{ report.engineVersion }}
            </p>
          </header>

          <!-- Récap par catégorie -->
          <section class="summary" aria-label="Récapitulatif par catégorie">
            <h3 class="h3">Par catégorie</h3>
            <mat-chip-set>
              @for (entry of summary(); track entry.detector) {
                <mat-chip
                  [attr.data-detector]="entry.detector"
                  [highlighted]="entry.count > 0"
                >
                  {{ entry.label }} : {{ entry.count }}
                </mat-chip>
              }
            </mat-chip-set>
          </section>

          <!-- Filtres -->
          <section class="filters" aria-label="Filtres du rapport">
            <mat-form-field appearance="outline" class="filter">
              <mat-label>Fichier</mat-label>
              <mat-select
                [(value)]="fileFilter"
                (valueChange)="onFilterChange()"
              >
                <mat-option [value]="''">Tous les fichiers</mat-option>
                @for (name of fileNames(); track name) {
                  <mat-option [value]="name">{{ name }}</mat-option>
                }
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline" class="filter">
              <mat-label>Détecteur</mat-label>
              <mat-select
                [(value)]="detectorFilter"
                (valueChange)="onFilterChange()"
              >
                <mat-option [value]="''">Tous les détecteurs</mat-option>
                @for (entry of summary(); track entry.detector) {
                  <mat-option [value]="entry.detector">{{
                    entry.label
                  }}</mat-option>
                }
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline" class="filter">
              <mat-label>Sévérité</mat-label>
              <mat-select
                [(value)]="severityFilter"
                (valueChange)="onFilterChange()"
              >
                <mat-option [value]="''">Toutes les sévérités</mat-option>
                @for (sev of severityOrder; track sev) {
                  <mat-option [value]="sev">{{
                    severityLabelOf(sev)
                  }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
          </section>

          <!-- Table -->
          <section class="table-wrap" aria-label="Liste des findings">
            <table
              mat-table
              [dataSource]="dataSource"
              matSort
              class="findings-table"
            >
              <ng-container matColumnDef="severity">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>
                  Sévérité
                </th>
                <td mat-cell *matCellDef="let row">
                  <span class="sev" [attr.data-sev]="row.finding.severity">{{
                    severityLabelOf(row.finding.severity)
                  }}</span>
                </td>
              </ng-container>

              <ng-container matColumnDef="detector">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>
                  Catégorie
                </th>
                <td mat-cell *matCellDef="let row">
                  {{ detectorLabel(row.finding.detector) }}
                </td>
              </ng-container>

              <ng-container matColumnDef="value">
                <th mat-header-cell *matHeaderCellDef>Valeur</th>
                <td mat-cell *matCellDef="let row">
                  <span
                    class="psw-mask"
                    tabindex="0"
                    [attr.aria-label]="'Valeur masquée. Survoler ou focus pour révéler.'"
                    >{{ row.finding.value }}</span
                  >
                </td>
              </ng-container>

              <ng-container matColumnDef="confidence">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>
                  Confiance
                </th>
                <td mat-cell *matCellDef="let row">
                  {{ row.finding.confidence }}
                </td>
              </ng-container>

              <ng-container matColumnDef="file">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>
                  Fichier
                </th>
                <td mat-cell *matCellDef="let row">
                  {{ row.fileName }}
                  <span class="muted small">({{ row.fileFormat }})</span>
                </td>
              </ng-container>

              <ng-container matColumnDef="location">
                <th mat-header-cell *matHeaderCellDef>Localisation</th>
                <td mat-cell *matCellDef="let row">
                  <span class="muted small">
                    @if (row.finding.metadata?.path) {
                      {{ row.finding.metadata.path }}
                    } @else if (row.finding.location.line !== undefined) {
                      ligne {{ row.finding.location.line }}
                    } @else {
                      offset {{ row.finding.location.start }}
                    }
                  </span>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>

              <tr *matNoDataRow class="no-data">
                <td [attr.colspan]="displayedColumns.length">
                  Aucun finding pour les filtres actuels.
                </td>
              </tr>
            </table>
          </section>
        </mat-card-content>
      </mat-card>
    }
  `,
  styles: [
    `
      :host {
        display: block;
        margin-top: 2rem;
      }
      .card {
        padding: 0.5rem;
      }
      .head {
        margin-bottom: 1rem;
      }
      .h2 {
        margin: 0;
      }
      .h3 {
        margin: 0 0 0.5rem;
        font-size: 0.95rem;
        color: var(--psw-muted);
      }
      .small {
        font-size: 0.875rem;
      }
      .muted {
        color: var(--psw-muted);
      }
      .summary {
        margin-bottom: 1.5rem;
      }
      .filters {
        display: flex;
        flex-wrap: wrap;
        gap: 1rem;
        margin-bottom: 1rem;
      }
      .filter {
        min-width: 200px;
      }
      .table-wrap {
        overflow-x: auto;
      }
      .findings-table {
        width: 100%;
      }
      .sev {
        font-weight: 500;
        padding: 0.125rem 0.5rem;
        border-radius: 999px;
        font-size: 0.85rem;
      }
      .sev[data-sev="critical"] {
        background: color-mix(
          in srgb,
          var(--psw-sev-critical) 18%,
          transparent
        );
        color: var(--psw-sev-critical);
      }
      .sev[data-sev="high"] {
        background: color-mix(in srgb, var(--psw-sev-high) 18%, transparent);
        color: var(--psw-sev-high);
      }
      .sev[data-sev="medium"] {
        background: color-mix(in srgb, var(--psw-sev-medium) 18%, transparent);
        color: var(--psw-sev-medium);
      }
      .sev[data-sev="low"] {
        background: color-mix(in srgb, var(--psw-sev-low) 18%, transparent);
        color: var(--psw-sev-low);
      }
      .no-data td {
        padding: 1rem;
        text-align: center;
        color: var(--psw-muted);
      }
    `,
  ],
})
export class ReportComponent {
  @Input() report: ScanReport | null = null;
  @Input() set findings(value: readonly EnrichedFinding[] | null) {
    this._findings.set(value ?? []);
  }
  get findings(): readonly EnrichedFinding[] {
    return this._findings();
  }

  @Input() detectorLabels: Readonly<Record<string, string>> = {};

  @ViewChild(MatSort) set sortRef(sort: MatSort | undefined) {
    if (sort) {
      this.dataSource.sort = sort;
    }
  }

  protected readonly displayedColumns = [
    "severity",
    "detector",
    "value",
    "confidence",
    "file",
    "location",
  ];
  protected readonly severityOrder = SEVERITY_ORDER;

  protected severityLabelOf(severity: Severity): string {
    return SEVERITY_LABEL[severity];
  }

  protected fileFilter = "";
  protected detectorFilter = "";
  protected severityFilter: Severity | "" = "";

  private readonly _findings = signal<readonly EnrichedFinding[]>([]);

  protected readonly dataSource: MatTableDataSource<EnrichedFinding> =
    new MatTableDataSource<EnrichedFinding>([]);

  protected readonly fileNames = computed(() => {
    const set = new Set<string>();
    for (const f of this._findings()) set.add(f.fileName);
    return Array.from(set).sort();
  });

  protected readonly summary = computed<readonly SummaryEntry[]>(() => {
    const counts = new Map<string, number>();
    for (const f of this._findings()) {
      counts.set(f.finding.detector, (counts.get(f.finding.detector) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([detector, count]) => ({
        detector,
        label: this.detectorLabel(detector),
        count,
      }))
      .sort((a, b) => b.count - a.count);
  });

  constructor() {
    effect(() => {
      const all = this._findings();
      this.dataSource.data = applyFilters(all, {
        fileName: this.fileFilter,
        detectorId: this.detectorFilter,
        severity: this.severityFilter || undefined,
      });
      // Réglage du sortingDataAccessor pour permettre le tri sur les
      // sous-champs (severity → ordre canonique, file → fileName, etc.).
      this.dataSource.sortingDataAccessor = sortingDataAccessor;
    });
  }

  protected detectorLabel(id: string): string {
    return this.detectorLabels[id] ?? id;
  }

  protected formatDate(iso: string): string {
    try {
      return new Date(iso).toLocaleString("fr-FR");
    } catch {
      return iso;
    }
  }

  protected onFilterChange(): void {
    this.dataSource.data = applyFilters(this._findings(), {
      fileName: this.fileFilter,
      detectorId: this.detectorFilter,
      severity: this.severityFilter || undefined,
    });
  }
}
