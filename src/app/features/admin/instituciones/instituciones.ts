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
import { PillComponent } from '../../../shared/components/pill/pill';
import { ButtonComponent } from '../../../shared/components/button/button';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog';
import {
  InstitucionApiService,
  type Institucion,
} from '../services/institucion-api.service';
import {
  InstitucionFormDialogComponent,
  type InstitucionFormDialogData,
} from './institucion-form-dialog/institucion-form-dialog';
import { NotificationService } from '../../../shared/services/notification.service';

@Component({
  selector: 'app-admin-instituciones',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    TableComponent,
    TableCellDirective,
    PillComponent,
    ButtonComponent,
  ],
  templateUrl: './instituciones.html',
  styleUrl: './instituciones.scss',
})
export class InstitucionesComponent implements OnInit {
  private readonly institucionApi = inject(InstitucionApiService);
  private readonly dialog = inject(MatDialog);
  private readonly notification = inject(NotificationService);

  // Referencia a la tabla para poder aplicarle el filtro de búsqueda
  // directamente desde el input del toolbar (en vez del menú por columna).
  @ViewChild(TableComponent) private readonly tabla?: TableComponent<Institucion>;

  protected readonly searchTerm = signal('');

  protected readonly columns: TableColumn<Institucion>[] = [
    {
      key: 'nombre',
      header: 'Nombre',
      sortable: true,
    },
    {
      key: 'sigla',
      header: 'Sigla',
      sortable: true,
      width: '120px',
    },
    {
      key: 'activo',
      header: 'Estado',
      sortable: true,
      filterable: true,
      filterType: 'select',
      filterOptions: [
        { label: 'Activa', value: true },
        { label: 'Inactiva', value: false },
      ],
      width: '140px',
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
  protected readonly instituciones = signal<Institucion[]>([]);
  protected readonly loading = signal<boolean>(true);
  protected readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.loadInstituciones();
  }

  loadInstituciones(): void {
    this.loading.set(true);
    this.error.set(null);

    this.institucionApi.getInstituciones().subscribe({
      next: (data) => {
        this.instituciones.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error al obtener instituciones:', err);
        this.error.set(
          this.extraerMensajeError(
            err,
            'No se pudo conectar con el servidor para obtener las instituciones. Verifica que el backend esté en ejecución.',
          ),
        );
        this.loading.set(false);
        this.instituciones.set([]);
      },
    });
  }

  /**
   * Filtra la tabla por nombre a medida que se escribe en el buscador del
   * toolbar, reutilizando el mismo mecanismo de filtrado de app-table
   * (sin abrir el menú por columna).
   */
  onSearchChange(value: string): void {
    this.searchTerm.set(value);
    this.tabla?.applyColumnFilter('nombre', value);
  }

  onCreateInstitucion(): void {
    const dialogRef = this.dialog.open<
      InstitucionFormDialogComponent,
      InstitucionFormDialogData,
      Institucion
    >(InstitucionFormDialogComponent, {
      data: {},
      width: '480px',
      maxWidth: '92vw',
      panelClass: 'athenet-dialog-panel',
    });

    // El diálogo ya hizo la petición a la API (con su propio loading/error
    // internos); si llega aquí con datos es porque la creación fue exitosa.
    dialogRef.afterClosed().subscribe((creada) => {
      if (!creada) return;
      this.instituciones.update((prev) => [...prev, creada]);
      this.notification.success('Se ha agregado la institución con éxito.');
    });
  }

  onEdit(institucion: Institucion): void {
    const dialogRef = this.dialog.open<
      InstitucionFormDialogComponent,
      InstitucionFormDialogData,
      Institucion
    >(InstitucionFormDialogComponent, {
      data: { institucion },
      width: '480px',
      maxWidth: '92vw',
      panelClass: 'athenet-dialog-panel',
    });

    dialogRef.afterClosed().subscribe((actualizada) => {
      if (!actualizada) return;
      this.instituciones.update((prev) =>
        prev.map((i) => (i.id === institucion.id ? actualizada : i)),
      );
      this.notification.success('Se ha actualizado la institución con éxito.');
    });
  }

  onDelete(institucion: Institucion): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Confirmación de Eliminación',
        message: 'Estás a punto de eliminar la institución',
        targetName: institucion.nombre,
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
      this.institucionApi.eliminarInstitucion(institucion.id).subscribe({
        next: () => {
          this.instituciones.update((prev) => prev.filter((i) => i.id !== institucion.id));
          this.loading.set(false);
          this.notification.success('Se ha eliminado la institución con éxito.');
        },
        error: (err) => {
          console.error('Error al eliminar institución:', err);
          this.error.set(
            this.extraerMensajeError(
              err,
              `No se pudo eliminar la institución "${institucion.nombre}". Verifica que tu cuenta tenga el rol admin.`,
            ),
          );
          this.loading.set(false);
        },
      });
    });
  }

  /**
   * Intenta extraer el mensaje que arma el backend (ApiError.message) para
   * mostrar errores concretos (p.ej. nombre duplicado) en vez de un texto
   * genérico. Si la respuesta no trae ese formato, usa el mensaje de fallback.
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
