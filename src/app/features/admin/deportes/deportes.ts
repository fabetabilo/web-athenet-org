import { Component, OnInit, ViewChild, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import {
  TableComponent,
  TableCellDirective,
  type TableColumn,
} from '../../../shared/components/table/table';
import { ButtonComponent } from '../../../shared/components/button/button';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog';
import { NotificationService } from '../../../shared/services/notification.service';
import { DeporteApiService, type Deporte } from '../services/deporte-api.service';
import {
  DeporteFormDialogComponent,
  type DeporteFormDialogData,
} from './deporte-form-dialog/deporte-form-dialog';
import {
  DeporteDetailDialogComponent,
  type DeporteDetailDialogData,
} from './deporte-detail-dialog/deporte-detail-dialog';

/** Largo máximo de la descripción mostrada en la tabla antes de truncarla. */
const DESCRIPCION_MAX = 60;

@Component({
  selector: 'app-admin-deportes',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    TableComponent,
    TableCellDirective,
    ButtonComponent,
  ],
  templateUrl: './deportes.html',
  styleUrl: './deportes.scss',
})
export class DeportesComponent implements OnInit {
  private readonly deporteApi = inject(DeporteApiService);
  private readonly dialog = inject(MatDialog);
  private readonly notification = inject(NotificationService);

  // Referencia a la tabla para poder aplicarle el filtro de búsqueda
  // directamente desde el input del toolbar (en vez del menú por columna).
  @ViewChild(TableComponent) private readonly tabla?: TableComponent<Deporte>;

  protected readonly searchTerm = signal('');

  protected readonly columns: TableColumn<Deporte>[] = [
    {
      key: 'nombre',
      header: 'Nombre',
      sortable: true,
    },
    {
      key: 'descripcion',
      header: 'Descripción',
      width: '320px',
    },
    {
      key: 'actions',
      header: 'Acciones',
      width: '100px',
      align: 'center',
      stickyEnd: true,
    },
  ];

  protected readonly deportes = signal<Deporte[]>([]);
  protected readonly loading = signal<boolean>(true);
  protected readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.loadDeportes();
  }

  loadDeportes(): void {
    this.loading.set(true);
    this.error.set(null);

    this.deporteApi.getDeportes().subscribe({
      next: (data) => {
        this.deportes.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error al obtener deportes:', err);
        this.error.set(
          this.extraerMensajeError(
            err,
            'No se pudo conectar con el servidor para obtener los deportes. Verifica que el backend esté en ejecución.',
          ),
        );
        this.loading.set(false);
        this.deportes.set([]);
      },
    });
  }

  onSearchChange(value: string): void {
    this.searchTerm.set(value);
    this.tabla?.applyColumnFilter('nombre', value);
  }

  /** Descripción recortada para que no deforme la celda de la tabla. */
  protected truncarDescripcion(descripcion: string | null): string {
    if (!descripcion) return '—';
    if (descripcion.length <= DESCRIPCION_MAX) return descripcion;
    return descripcion.slice(0, DESCRIPCION_MAX).trimEnd() + '…';
  }

  protected esDescripcionLarga(descripcion: string | null): boolean {
    return !!descripcion && descripcion.length > DESCRIPCION_MAX;
  }

  onVerDetalle(deporte: Deporte): void {
    this.dialog.open<DeporteDetailDialogComponent, DeporteDetailDialogData>(
      DeporteDetailDialogComponent,
      {
        data: { deporte },
        width: '480px',
        maxWidth: '92vw',
        panelClass: 'athenet-dialog-panel',
      },
    );
  }

  onCreateDeporte(): void {
    const dialogRef = this.dialog.open<DeporteFormDialogComponent, DeporteFormDialogData, Deporte>(
      DeporteFormDialogComponent,
      {
        data: {},
        width: '480px',
        maxWidth: '92vw',
        panelClass: 'athenet-dialog-panel',
      },
    );

    dialogRef.afterClosed().subscribe((creado) => {
      if (!creado) return;
      this.deportes.update((prev) => [...prev, creado]);
      this.notification.success('Se ha agregado el deporte con éxito.');
    });
  }

  onEdit(deporte: Deporte): void {
    const dialogRef = this.dialog.open<DeporteFormDialogComponent, DeporteFormDialogData, Deporte>(
      DeporteFormDialogComponent,
      {
        data: { deporte },
        width: '480px',
        maxWidth: '92vw',
        panelClass: 'athenet-dialog-panel',
      },
    );

    dialogRef.afterClosed().subscribe((actualizado) => {
      if (!actualizado) return;
      this.deportes.update((prev) => prev.map((d) => (d.id === deporte.id ? actualizado : d)));
      this.notification.success('Se ha actualizado el deporte con éxito.');
    });
  }

  onDelete(deporte: Deporte): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Confirmación de Eliminación',
        message: 'Estás a punto de eliminar el deporte',
        targetName: deporte.nombre,
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
      this.deporteApi.eliminarDeporte(deporte.id).subscribe({
        next: () => {
          this.deportes.update((prev) => prev.filter((d) => d.id !== deporte.id));
          this.loading.set(false);
          this.notification.success('Se ha eliminado el deporte con éxito.');
        },
        error: (err) => {
          console.error('Error al eliminar deporte:', err);
          this.error.set(
            this.extraerMensajeError(
              err,
              `No se pudo eliminar el deporte "${deporte.nombre}". Verifica que tu cuenta tenga el rol admin.`,
            ),
          );
          this.loading.set(false);
        },
      });
    });
  }

  private extraerMensajeError(err: unknown, fallback: string): string {
    if (err instanceof HttpErrorResponse) {
      const body = err.error;
      if (body && typeof body === 'object' && typeof body.message === 'string') {
        return body.message;
      }
    }
    return fallback;
  }
}
