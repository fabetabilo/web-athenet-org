import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
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
import { DirectorApiService } from '../services/director-api.service';
import { bffErrorMessage, type DirectorEvent } from '../services/bff';
import { EVENT_STATUS, STATUS_OPTIONS } from './event-status';

@Component({
  selector: 'app-director-events',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    MatIconModule,
    MatButtonModule,
    TableComponent,
    TableCellDirective,
    PillComponent,
    ButtonComponent,
  ],
  templateUrl: './events.html',
  styleUrl: './events.scss',
})
export class DirectorEventsComponent implements OnInit {
  private readonly directorApi = inject(DirectorApiService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);

  protected readonly columns: TableColumn<DirectorEvent>[] = [
    {
      key: 'internalId',
      header: 'ID',
      sortable: true,
      width: '90px',
    },
    {
      key: 'title',
      header: 'Título',
      sortable: true,
      filterable: true,
      filterType: 'text',
    },
    {
      // Deportes del catálogo del admin: las opciones del filtro las deduce la tabla.
      key: 'sport.name',
      header: 'Deporte',
      sortable: true,
      filterable: true,
      filterType: 'select',
      width: '160px',
    },
    {
      key: 'eventDate',
      header: 'Fecha',
      sortable: true,
      width: '170px',
    },
    {
      key: 'status',
      header: 'Estado',
      sortable: true,
      filterable: true,
      filterType: 'select',
      filterOptions: STATUS_OPTIONS,
      width: '140px',
    },
    {
      key: 'isOfficial',
      header: 'Oficial',
      sortable: true,
      filterable: true,
      filterType: 'select',
      filterOptions: [
        { label: 'Oficial', value: true },
        { label: 'Comunitario', value: false },
      ],
      width: '130px',
    },
    {
      key: 'location',
      header: 'Ubicación',
      sortable: true,
      filterable: true,
      filterType: 'text',
      width: '180px',
    },
    {
      key: 'actions',
      header: 'Acciones',
      width: '100px',
      align: 'center',
      stickyEnd: true,
    },
  ];

  // Estado reactivo para la tabla alimentada desde la API
  protected readonly events = signal<DirectorEvent[]>([]);
  protected readonly loading = signal<boolean>(true);
  protected readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.loadEvents();
  }

  loadEvents(): void {
    this.loading.set(true);
    this.error.set(null);

    this.directorApi.getEvents().subscribe({
      next: (data) => {
        this.events.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error al obtener eventos desde DirectorApiService:', err);
        this.error.set(
          bffErrorMessage(
            err,
            'No se pudo conectar con el servidor para obtener los eventos. Verifica que el backend esté en ejecución.',
          ),
        );
        this.loading.set(false);
        this.events.set([]);
      },
    });
  }

  protected readonly status = EVENT_STATUS;

  onRowClick(event: DirectorEvent): void {
    this.router.navigate(['/director/events', event.internalId]);
  }

  onEdit(event: DirectorEvent): void {
    this.router.navigate(['/director/events', event.internalId], {
      queryParams: { mode: 'edit' },
    });
  }

  onDelete(event: DirectorEvent): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Confirmación de Eliminación',
        message: 'Estás a punto de eliminar el evento',
        targetName: event.title,
        description: 'Esta acción no se puede deshacer y removerá permanentemente el registro.',
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

    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (!confirmed) return;

      this.loading.set(true);
      this.directorApi.deleteEvent(event.internalId).subscribe({
        next: () => {
          this.events.update((prev) => prev.filter((e) => e.internalId !== event.internalId));
          this.loading.set(false);
        },
        error: (err) => {
          console.error('Error al eliminar evento:', err);
          this.error.set(
            bffErrorMessage(err, `No se pudo eliminar el evento "${event.title}". Por favor, intenta nuevamente.`),
          );
          this.loading.set(false);
        },
      });
    });
  }

  onOpenCompetition(event: DirectorEvent): void {
    this.router.navigate(['/director/competitions', event.competitionId]);
  }

  onCreateEvent(): void {
    this.router.navigate(['/director/events', 'new']);
  }
}
