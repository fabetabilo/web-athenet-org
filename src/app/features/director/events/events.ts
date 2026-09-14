import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import {
  TableComponent,
  TableCellDirective,
  type TableColumn,
} from '../../../shared/components/table/table';
import {
  PillComponent,
  type PillVariant,
} from '../../../shared/components/pill/pill';
import { ButtonComponent } from '../../../shared/components/button/button';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog';
import {
  DirectorApiService,
  type AthenetEvent,
} from '../services/director-api.service';

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

  protected readonly columns: TableColumn<AthenetEvent>[] = [
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
      key: 'category',
      header: 'Categoría',
      sortable: true,
      filterable: true,
      filterType: 'select',
      filterOptions: [
        { label: 'Tenis de Mesa', value: 'TENIS_MESA' },
        { label: 'Fútbol', value: 'FUTBOL' },
        { label: 'Vóleibol', value: 'VOLEIBOL' },
        { label: 'Ajedrez', value: 'AJEDREZ' },
        { label: 'Natación', value: 'NATACION' },
        { label: 'Básquetbol', value: 'BASQUETBOL' },
        { label: 'Atletismo', value: 'ATLETISMO' },
        { label: 'Tenis', value: 'TENIS' },
        { label: 'Rugby', value: 'RUGBY' },
        { label: 'Levantamiento de Pesas', value: 'LEVANTAMIENTO_PESAS' },
      ],
      width: '160px',
    },
    {
      key: 'eventDate',
      header: 'Fecha',
      sortable: true,
      width: '130px',
    },
    {
      key: 'status',
      header: 'Estado',
      sortable: true,
      filterable: true,
      filterType: 'select',
      filterOptions: [
        { label: 'Publicado', value: 'PUBLISHED' },
        { label: 'Borrador', value: 'DRAFT' },
        { label: 'Cancelado', value: 'CANCELLED' },
      ],
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
  protected readonly events = signal<AthenetEvent[]>([]);
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
          'No se pudo conectar con el servidor para obtener los eventos. Verifica que el backend esté en ejecución.',
        );
        this.loading.set(false);
        this.events.set([]);
      },
    });
  }

  getCategoryLabel(category: string): string {
    const map: Record<string, string> = {
      TENIS_MESA: 'Tenis de Mesa',
      FUTBOL: 'Fútbol',
      VOLEIBOL: 'Vóleibol',
      AJEDREZ: 'Ajedrez',
      NATACION: 'Natación',
      BASQUETBOL: 'Básquetbol',
      ATLETISMO: 'Atletismo',
      TENIS: 'Tenis',
      RUGBY: 'Rugby',
      LEVANTAMIENTO_PESAS: 'Levantamiento de Pesas',
    };
    return map[category] ?? category;
  }

  getStatusLabel(status: string): string {
    const map: Record<string, string> = {
      PUBLISHED: 'Publicado',
      DRAFT: 'Borrador',
      CANCELLED: 'Cancelado',
    };
    return map[status] ?? status;
  }

  getStatusVariant(status: string): PillVariant {
    switch (status) {
      case 'PUBLISHED':
        return 'success';
      case 'DRAFT':
        return 'warning';
      case 'CANCELLED':
        return 'danger';
      default:
        return 'neutral';
    }
  }

  onRowClick(event: AthenetEvent): void {
    console.log('Ver detalle del evento:', event);
  }

  onEdit(event: AthenetEvent): void {
    console.log('Editar evento:', event);
  }

  onDelete(event: AthenetEvent): void {
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

      const eventId = event.id ?? event.internalId;
      this.loading.set(true);
      this.directorApi.deleteEvent(eventId).subscribe({
        next: () => {
          this.events.update((prev) => prev.filter((e) => (e.id ?? e.internalId) !== eventId));
          this.loading.set(false);
        },
        error: (err) => {
          console.error('Error al eliminar evento:', err);
          this.error.set(
            `No se pudo eliminar el evento "${event.title}". Por favor, intenta nuevamente.`,
          );
          this.loading.set(false);
        },
      });
    });
  }

  onCreateEvent(): void {
    console.log('Crear nuevo evento institucional');
  }
}
