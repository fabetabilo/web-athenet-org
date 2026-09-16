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
import { NotificationService } from '../../../shared/services/notification.service';
import { EquipoApiService, type Equipo, type Categoria } from '../services/equipo-api.service';
import {
  EquipoFormDialogComponent,
  type EquipoFormDialogData,
} from './equipo-form-dialog/equipo-form-dialog';

const CATEGORIA_LABELS: Record<Categoria, string> = {
  MASCULINO: 'Masculino',
  FEMENINO: 'Femenino',
  MIXTO: 'Mixto',
};

@Component({
  selector: 'app-admin-equipos',
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
  templateUrl: './equipos.html',
  styleUrl: './equipos.scss',
})
export class EquiposComponent implements OnInit {
  private readonly equipoApi = inject(EquipoApiService);
  private readonly dialog = inject(MatDialog);
  private readonly notification = inject(NotificationService);

  // Referencia a la tabla para poder aplicarle el filtro de búsqueda
  // directamente desde el input del toolbar (en vez del menú por columna).
  @ViewChild(TableComponent) private readonly tabla?: TableComponent<Equipo>;

  protected readonly searchTerm = signal('');

  protected readonly columns: TableColumn<Equipo>[] = [
    {
      key: 'nombre',
      header: 'Nombre',
      sortable: true,
    },
    {
      key: 'categoria',
      header: 'Categoría',
      sortable: true,
      filterable: true,
      filterType: 'select',
      filterOptions: [
        { label: 'Masculino', value: 'MASCULINO' },
        { label: 'Femenino', value: 'FEMENINO' },
        { label: 'Mixto', value: 'MIXTO' },
      ],
      width: '130px',
    },
    {
      key: 'deporteNombre',
      header: 'Deporte',
      sortable: true,
      filterable: true,
      filterType: 'select',
    },
    {
      key: 'sedeNombre',
      header: 'Sede',
      sortable: true,
      filterable: true,
      filterType: 'select',
    },
    {
      key: 'entrenador',
      header: 'Entrenador',
      width: '160px',
    },
    {
      key: 'actions',
      header: 'Acciones',
      width: '100px',
      align: 'center',
      stickyEnd: true,
    },
  ];

  protected readonly equipos = signal<Equipo[]>([]);
  protected readonly loading = signal<boolean>(true);
  protected readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.loadEquipos();
  }

  loadEquipos(): void {
    this.loading.set(true);
    this.error.set(null);

    this.equipoApi.getEquipos().subscribe({
      next: (data) => {
        this.equipos.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error al obtener equipos:', err);
        this.error.set(
          this.extraerMensajeError(
            err,
            'No se pudo conectar con el servidor para obtener los equipos. Verifica que el backend esté en ejecución.',
          ),
        );
        this.loading.set(false);
        this.equipos.set([]);
      },
    });
  }

  onSearchChange(value: string): void {
    this.searchTerm.set(value);
    this.tabla?.applyColumnFilter('nombre', value);
  }

  getCategoriaLabel(categoria: Categoria): string {
    return CATEGORIA_LABELS[categoria] ?? categoria;
  }

  onCreateEquipo(): void {
    const dialogRef = this.dialog.open<EquipoFormDialogComponent, EquipoFormDialogData, Equipo>(
      EquipoFormDialogComponent,
      {
        data: {},
        width: '480px',
        maxWidth: '92vw',
        panelClass: 'athenet-dialog-panel',
      },
    );

    dialogRef.afterClosed().subscribe((creado) => {
      if (!creado) return;
      this.equipos.update((prev) => [...prev, creado]);
      this.notification.success('Se ha agregado el equipo con éxito.');
    });
  }

  onEdit(equipo: Equipo): void {
    const dialogRef = this.dialog.open<EquipoFormDialogComponent, EquipoFormDialogData, Equipo>(
      EquipoFormDialogComponent,
      {
        data: { equipo },
        width: '480px',
        maxWidth: '92vw',
        panelClass: 'athenet-dialog-panel',
      },
    );

    dialogRef.afterClosed().subscribe((actualizado) => {
      if (!actualizado) return;
      this.equipos.update((prev) => prev.map((e) => (e.id === equipo.id ? actualizado : e)));
      this.notification.success('Se ha actualizado el equipo con éxito.');
    });
  }

  onDelete(equipo: Equipo): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Confirmación de Eliminación',
        message: 'Estás a punto de eliminar el equipo',
        targetName: equipo.nombre,
        description: 'Esta acción no se puede deshacer y removerá permanentemente el registro (incluyendo sus jugadores).',
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
      this.equipoApi.eliminarEquipo(equipo.id).subscribe({
        next: () => {
          this.equipos.update((prev) => prev.filter((e) => e.id !== equipo.id));
          this.loading.set(false);
          this.notification.success('Se ha eliminado el equipo con éxito.');
        },
        error: (err) => {
          console.error('Error al eliminar equipo:', err);
          this.error.set(
            this.extraerMensajeError(
              err,
              `No se pudo eliminar el equipo "${equipo.nombre}". Verifica que tu cuenta tenga el rol admin.`,
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
