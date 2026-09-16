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
import { SedeApiService, type Sede } from '../services/sede-api.service';
import {
  SedeFormDialogComponent,
  type SedeFormDialogData,
} from './sede-form-dialog/sede-form-dialog';

@Component({
  selector: 'app-admin-sedes',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    TableComponent,
    TableCellDirective,
    ButtonComponent,
  ],
  templateUrl: './sedes.html',
  styleUrl: './sedes.scss',
})
export class SedesComponent implements OnInit {
  private readonly sedeApi = inject(SedeApiService);
  private readonly dialog = inject(MatDialog);
  private readonly notification = inject(NotificationService);

  // Referencia a la tabla para poder aplicarle el filtro de búsqueda
  // directamente desde el input del toolbar (en vez del menú por columna).
  @ViewChild(TableComponent) private readonly tabla?: TableComponent<Sede>;

  protected readonly searchTerm = signal('');

  protected readonly columns: TableColumn<Sede>[] = [
    {
      key: 'nombre',
      header: 'Nombre',
      sortable: true,
    },
    {
      key: 'institucionNombre',
      header: 'Institución',
      sortable: true,
      filterable: true,
      filterType: 'select',
    },
    {
      key: 'ciudad',
      header: 'Ciudad',
      sortable: true,
      filterable: true,
      filterType: 'select',
      width: '160px',
    },
    {
      key: 'direccion',
      header: 'Dirección',
      width: '220px',
    },
    {
      key: 'actions',
      header: 'Acciones',
      width: '100px',
      align: 'center',
      stickyEnd: true,
    },
  ];

  protected readonly sedes = signal<Sede[]>([]);
  protected readonly loading = signal<boolean>(true);
  protected readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.loadSedes();
  }

  loadSedes(): void {
    this.loading.set(true);
    this.error.set(null);

    this.sedeApi.getSedes().subscribe({
      next: (data) => {
        this.sedes.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error al obtener sedes:', err);
        this.error.set(
          this.extraerMensajeError(
            err,
            'No se pudo conectar con el servidor para obtener las sedes. Verifica que el backend esté en ejecución.',
          ),
        );
        this.loading.set(false);
        this.sedes.set([]);
      },
    });
  }

  /**
   * Filtra la tabla por nombre a medida que se escribe en el buscador del
   * toolbar, reutilizando el mismo mecanismo de filtrado de app-table.
   */
  onSearchChange(value: string): void {
    this.searchTerm.set(value);
    this.tabla?.applyColumnFilter('nombre', value);
  }

  onCreateSede(): void {
    const dialogRef = this.dialog.open<SedeFormDialogComponent, SedeFormDialogData, Sede>(
      SedeFormDialogComponent,
      {
        data: {},
        width: '480px',
        maxWidth: '92vw',
        panelClass: 'athenet-dialog-panel',
      },
    );

    // El diálogo ya hizo la petición a la API; si cierra con datos es
    // porque la creación fue exitosa.
    dialogRef.afterClosed().subscribe((creada) => {
      if (!creada) return;
      this.sedes.update((prev) => [...prev, creada]);
      this.notification.success('Se ha agregado la sede con éxito.');
    });
  }

  onEdit(sede: Sede): void {
    const dialogRef = this.dialog.open<SedeFormDialogComponent, SedeFormDialogData, Sede>(
      SedeFormDialogComponent,
      {
        data: { sede },
        width: '480px',
        maxWidth: '92vw',
        panelClass: 'athenet-dialog-panel',
      },
    );

    dialogRef.afterClosed().subscribe((actualizada) => {
      if (!actualizada) return;
      this.sedes.update((prev) => prev.map((s) => (s.id === sede.id ? actualizada : s)));
      this.notification.success('Se ha actualizado la sede con éxito.');
    });
  }

  onDelete(sede: Sede): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Confirmación de Eliminación',
        message: 'Estás a punto de eliminar la sede',
        targetName: sede.nombre,
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
      this.sedeApi.eliminarSede(sede.id).subscribe({
        next: () => {
          this.sedes.update((prev) => prev.filter((s) => s.id !== sede.id));
          this.loading.set(false);
          this.notification.success('Se ha eliminado la sede con éxito.');
        },
        error: (err) => {
          console.error('Error al eliminar sede:', err);
          this.error.set(
            this.extraerMensajeError(
              err,
              `No se pudo eliminar la sede "${sede.nombre}". Verifica que tu cuenta tenga el rol admin.`,
            ),
          );
          this.loading.set(false);
        },
      });
    });
  }

  /**
   * Intenta extraer el mensaje que arma el backend (ApiError.message) para
   * mostrar errores concretos en vez de un texto genérico.
   */
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
