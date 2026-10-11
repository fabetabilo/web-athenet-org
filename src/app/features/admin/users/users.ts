import { Component, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import {
  TableComponent,
  TableCellDirective,
  EMPTY_FILTER_VALUE,
  type TableColumn,
} from '../../../shared/components/table/table';
import { PillComponent } from '../../../shared/components/pill/pill';
import {
  UserApiService,
  esErrorDeConsentimiento,
  roleIcon,
  type AppRole,
  type AppRoleCode,
  type AthenetUser,
} from '../services/user-api.service';
import {
  UserDetailDialogComponent,
  type UserDetailDialogData,
} from './user-detail-dialog/user-detail-dialog';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, MatIconModule, TableComponent, TableCellDirective, PillComponent],
  templateUrl: './users.html',
  styleUrl: './users.scss',
})
export class UsersComponent implements OnInit {
  private readonly userApi = inject(UserApiService);
  private readonly dialog = inject(MatDialog);

  // Referencia a la tabla para poder aplicarle el filtro de búsqueda
  // directamente desde el input del toolbar (en vez del menú por columna).
  @ViewChild(TableComponent) private readonly tabla?: TableComponent<AthenetUser>;

  protected readonly users = signal<AthenetUser[]>([]);
  protected readonly roles = signal<AppRole[]>([]);
  protected readonly loading = signal<boolean>(true);
  protected readonly error = signal<string | null>(null);
  protected readonly searchTerm = signal('');

  /** Índice del catálogo para resolver etiquetas sin recorrer el array por celda. */
  private readonly rolesPorCodigo = computed(
    () => new Map(this.roles().map((rol) => [rol.code, rol])),
  );

  /**
   * Las opciones del filtro de roles se derivan del catálogo, no de constantes
   * locales: si mañana se agrega un rol al manifest, aparece solo. Se suma la
   * opción "sin rol asignado", que son los usuarios accionables.
   */
  protected readonly columns = computed<TableColumn<AthenetUser>[]>(() => [
    {
      key: 'displayName',
      header: 'Nombre',
      sortable: true,
      filterable: true,
      filterType: 'text',
    },
    {
      key: 'userPrincipalName',
      header: 'Cuenta',
      sortable: true,
      filterable: true,
      filterType: 'text',
    },
    {
      key: 'roles',
      header: 'Roles en Athenet',
      filterable: true,
      filterType: 'select',
      filterOptions: [
        ...this.roles().map((rol) => ({ label: rol.displayName, value: rol.code })),
        { label: 'Sin rol asignado', value: EMPTY_FILTER_VALUE },
      ],
      width: '240px',
    },
    {
      key: 'accountEnabled',
      header: 'Estado',
      sortable: true,
      filterable: true,
      filterType: 'select',
      filterOptions: [
        { label: 'Habilitada', value: true },
        { label: 'Deshabilitada', value: false },
      ],
      width: '140px',
    },
  ]);

  ngOnInit(): void {
    this.loadDirectory();
  }

  /**
   * Una sola suscripción: el servicio resuelve en paralelo las tres lecturas
   * de Graph y entrega los usuarios con sus roles ya traducidos.
   */
  loadDirectory(): void {
    this.loading.set(true);
    this.error.set(null);

    this.userApi.getDirectory().subscribe({
      next: ({ users, roles }) => {
        this.users.set(users);
        this.roles.set(roles);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error al obtener el directorio de usuarios:', err);
        this.error.set(this.extraerMensajeError(err));
        this.loading.set(false);
        this.users.set([]);
      },
    });
  }

  onSearchChange(value: string): void {
    this.searchTerm.set(value);
    this.tabla?.applyColumnFilter('displayName', value);
  }

  /** Roles del usuario tolerando respuestas sin el campo. */
  protected rolesDe(user: AthenetUser): AppRoleCode[] {
    return Array.isArray(user?.roles) ? user.roles : [];
  }

  /** Etiqueta del catálogo, con el código como fallback si no está declarado. */
  protected getRoleLabel(code: AppRoleCode): string {
    return this.rolesPorCodigo().get(code)?.displayName ?? code;
  }

  protected getRoleIcon(code: AppRoleCode): string {
    return roleIcon(code);
  }

  onVerDetalle(user: AthenetUser): void {
    this.dialog.open<UserDetailDialogComponent, UserDetailDialogData>(UserDetailDialogComponent, {
      data: { user, roles: this.roles() },
      width: '520px',
      maxWidth: '92vw',
      panelClass: 'athenet-dialog-panel',
    });
  }

  /**
   * Cada causa tiene su mensaje, porque la acción que resuelve cada una es
   * distinta: el consentimiento se otorga en el portal (reintentar no sirve),
   * el 401 se resuelve volviendo a iniciar sesión y el 403 es un problema de
   * los permisos de la cuenta.
   */
  private extraerMensajeError(err: unknown): string {
    if (esErrorDeConsentimiento(err)) {
      return (
        'Falta el consentimiento del administrador en Microsoft Entra ID. ' +
        'Un administrador global debe otorgar a esta aplicación los permisos ' +
        'User.Read.All y Application.Read.All desde el portal de Azure.'
      );
    }

    if (err instanceof HttpErrorResponse) {
      if (err.status === 401) {
        return 'Tu sesión no es válida para consultar Microsoft Graph. Vuelve a iniciar sesión.';
      }
      if (err.status === 403) {
        return 'Tu cuenta no tiene permisos para consultar el directorio de Microsoft Entra ID.';
      }
    }

    return 'No se pudo consultar Microsoft Graph para obtener el directorio de usuarios. Revisa tu conexión e inténtalo de nuevo.';
  }
}
