import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import {
  TableComponent,
  TableCellDirective,
  type TableColumn,
} from '../../../shared/components/table/table';
import { PillComponent } from '../../../shared/components/pill/pill';
import { ButtonComponent } from '../../../shared/components/button/button';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog';
import { NotificationService } from '../../../shared/services/notification.service';
import { DirectorCompetitionApiService } from '../services/director-competition-api.service';
import { competitionErrorMessage, isRetryableBffError, type DirectorCompetition } from '../services/bff';
import { COMPETITION_STATUS, COMPETITION_STATUS_OPTIONS } from './competition-status';
import {
  CompetitionFormDialogComponent,
  type CompetitionFormDialogData,
} from './competition-form-dialog/competition-form-dialog';

@Component({
  selector: 'app-director-competitions',
  standalone: true,
  imports: [MatIconModule, MatButtonModule, TableComponent, TableCellDirective, PillComponent, ButtonComponent],
  templateUrl: './competitions.html',
  styleUrl: './competitions.scss',
})
export class DirectorCompetitionsComponent implements OnInit {
  private readonly competitionApi = inject(DirectorCompetitionApiService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  private readonly notification = inject(NotificationService);

  protected readonly columns: TableColumn<DirectorCompetition>[] = [
    { key: 'competitionImg', header: 'Imagen', width: '90px' },
    { key: 'name', header: 'Nombre', sortable: true, filterable: true, filterType: 'text' },
    { key: 'sport.name', header: 'Deporte', sortable: true, filterable: true, filterType: 'select', width: '160px' },
    { key: 'season', header: 'Temporada', sortable: true, filterable: true, filterType: 'select', width: '140px' },
    {
      key: 'status',
      header: 'Estado',
      sortable: true,
      filterable: true,
      filterType: 'select',
      filterOptions: COMPETITION_STATUS_OPTIONS,
      width: '140px',
    },
    { key: 'actions', header: 'Acciones', width: '100px', align: 'center', stickyEnd: true },
  ];

  protected readonly status = COMPETITION_STATUS;
  protected readonly competitions = signal<DirectorCompetition[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly canRetry = signal(false);

  ngOnInit(): void {
    this.loadCompetitions();
  }

  loadCompetitions(): void {
    this.loading.set(true);
    this.error.set(null);

    this.competitionApi.getCompetitions().subscribe({
      next: (data) => {
        this.competitions.set(data);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        console.error('Error al obtener competencias:', err);
        this.error.set(competitionErrorMessage(err, 'No se pudieron obtener las competencias.'));
        this.canRetry.set(isRetryableBffError(err));
        this.competitions.set([]);
        this.loading.set(false);
      },
    });
  }

  onRowClick(competition: DirectorCompetition): void {
    this.router.navigate(['/director/competitions', competition.id]);
  }

  onCreate(): void {
    const ref = this.dialog.open<CompetitionFormDialogComponent, CompetitionFormDialogData, DirectorCompetition>(
      CompetitionFormDialogComponent,
      { data: {}, width: '600px', maxWidth: '92vw', panelClass: 'athenet-dialog-panel' },
    );

    ref.afterClosed().subscribe((created) => {
      if (!created) return;
      this.notification.success('Copa creada. Inscribe los 16 equipos para sortear los octavos.');
      this.router.navigate(['/director/competitions', created.id]);
    });
  }

  onDelete(competition: DirectorCompetition): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Confirmación de Eliminación',
        message: 'Estás a punto de eliminar la copa',
        targetName: competition.name,
        description: 'Se eliminarán su nómina y su llave de partidos. Esta acción no se puede deshacer.',
        confirmText: 'Eliminar',
        confirmVariant: 'danger',
        confirmIcon: 'delete',
        cancelText: 'Cancelar',
        variant: 'danger',
        icon: 'delete_outline',
      },
      width: '460px',
      maxWidth: '92vw',
      panelClass: 'athenet-dialog-panel',
    });

    ref.afterClosed().subscribe((confirmed: boolean) => {
      if (!confirmed) return;

      this.loading.set(true);
      this.competitionApi.deleteCompetition(competition.id).subscribe({
        next: () => {
          this.competitions.update((prev) => prev.filter((c) => c.id !== competition.id));
          this.loading.set(false);
          this.notification.success('Copa eliminada.');
        },
        error: (err: unknown) => {
          console.error('Error al eliminar competencia:', err);
          this.loading.set(false);
          this.notification.error(competitionErrorMessage(err, `No se pudo eliminar la copa "${competition.name}".`));
        },
      });
    });
  }
}
